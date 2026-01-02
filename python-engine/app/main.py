"""
Main API v2 - CORRIGIDO
Melhorias:
- Novo endpoint /process-for-n8n que retorna formato compatível
- Mantém endpoints antigos para compatibilidade
- Retorna sample_data junto com metadados
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import math
import pandas as pd
import re
from typing import Any, Optional
from datetime import datetime

from .reader import read_excel
from .block_detector import detect_blocks
from .normalizer import normalize_blocks
from .metrics_engine import (
    load_from_data,
    normalize_dataframe,
    calculate_metrics,
    calculate_financial_metrics,
    group_for_chart,
    build_response,
    detect_column_types,
    generate_chart_suggestions,
    build_analysis_snapshot
)

app = FastAPI(title="Python Data Engine v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sanitize(value) -> Any:
    """Sanitiza um valor para JSON."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, str):
        s = value.strip()
        if s.lower() == "nan":
            return None
        if s == "#DIV/0!":
            return 0
        if s == "-":
            return None
        return s
    return value


def _unique_columns(cols: list) -> list[str]:
    """Garante nomes de colunas únicos."""
    seen = {}
    out = []
    for idx, c in enumerate(cols):
        base = str(c).strip() if str(c).strip() else f"col_{idx + 1}"
        # Limpa caracteres especiais
        base = re.sub(r'[\n\r\t]+', ' ', base)
        base = re.sub(r'\s+', ' ', base).strip()
        
        key = base.lower()
        seen[key] = seen.get(key, 0) + 1
        out.append(base if seen[key] == 1 else f"{base}_{seen[key]}")
    return out


def _detect_column_type(col_name: str, values: list[Any]) -> str:
    """Detecta o tipo semântico de uma coluna."""
    col_lower = col_name.lower()
    
    # Por nome
    if re.search(r"(data|date|dt|periodo|mes|ano|dia)", col_lower):
        return "date"
    if re.search(r"(valor|preco|preço|custo|receita|total|mensal|anual|r\$|lucro|despesa|faturamento)", col_lower):
        return "currency"
    if re.search(r"(quantidade|qtd|qty|volume|unidades|pecas|peças|estoque)", col_lower):
        return "number"
    if re.search(r"(cliente|produto|projeto|operador|vendedor|categoria|status|tipo|grupo|departamento)", col_lower):
        return "category"
    
    # Por valores
    non_null = [v for v in values[:20] if v is not None]
    if not non_null:
        return "text"
    
    # Detecta números
    numeric_count = 0
    currency_count = 0
    for v in non_null:
        s = str(v).strip()
        if re.match(r"^R?\$?\s?[\d.,]+$", s):
            currency_count += 1
        try:
            s2 = s.replace("R$", "").replace("$", "").replace(" ", "").replace(".", "").replace(",", ".")
            float(s2)
            numeric_count += 1
        except:
            pass
    
    if currency_count > len(non_null) * 0.5:
        return "currency"
    if numeric_count > len(non_null) * 0.7:
        return "number"
    
    # Detecta categorias (valores repetidos)
    unique_ratio = len(set(str(v) for v in non_null)) / len(non_null)
    if unique_ratio < 0.5 and len(non_null) >= 3:
        return "category"
    
    return "text"


def _rows_to_objects(columns: list[str], rows: list[list]) -> list[dict]:
    """Converte linhas em objetos com chaves de colunas."""
    result = []
    for row in rows:
        obj = {}
        for i, col in enumerate(columns):
            obj[col] = _sanitize(row[i] if i < len(row) else None)
        result.append(obj)
    return result


def _normalize_for_signature(value: Any) -> Optional[str]:
    """Normaliza valor para assinatura de coluna."""
    v = _sanitize(value)
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        if not s or s == "-":
            return None
        return s
    return v


def _should_drop_sparse_column(col_name: str, values: list[Any]) -> bool:
    """Verifica se uma coluna muito esparsa deve ser removida."""
    if not values:
        return True
    non_empty = sum(1 for v in values if _normalize_for_signature(v) is not None)
    empty_ratio = 1 - (non_empty / max(1, len(values)))

    # Remove colunas placeholder muito vazias (col_12, col_13...)
    if empty_ratio >= 0.98 and re.match(r"^col_\d+$", (col_name or "").strip(), re.I):
        return True
    return False


def _prune_duplicate_and_sparse_columns(columns: list[str], raw_rows: list[list[Any]]):
    """Remove colunas duplicadas e muito esparsas."""
    sample = raw_rows[:300]
    if not columns:
        return columns, raw_rows

    by_sig: dict[tuple, int] = {}
    keep_indices: list[int] = []
 
    for i, name in enumerate(columns):
        col_values = [(row[i] if i < len(row) else None) for row in sample]

        if _should_drop_sparse_column(name, col_values):
            continue

        sig = tuple(_normalize_for_signature(v) for v in col_values)
        if sig in by_sig and any(x is not None for x in sig):
            continue
        by_sig[sig] = i
        keep_indices.append(i)

    if not keep_indices:
        keep_indices = list(range(len(columns)))

    pruned_columns = [columns[i] for i in keep_indices]
    pruned_rows = []
    for row in raw_rows:
        pruned_rows.append([row[i] if i < len(row) else None for i in keep_indices])
 
    return pruned_columns, pruned_rows


# ============================================================
# ENDPOINT PRINCIPAL: /process-for-n8n
# Retorna dados no formato que o N8N DC Pipeline espera
# ============================================================

@app.post("/process-for-n8n")
async def process_for_n8n(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    intent: str = Form("gerar dashboard"),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
):
    """
    Processa arquivo Excel/CSV e retorna no formato esperado pelo N8N.
    
    Se sheet e block_index forem fornecidos, extrai aquele bloco específico.
    Caso contrário, usa o primeiro bloco do primeiro sheet.
    """
    try:
        filename = (file.filename or "").lower()

        if filename.endswith(".csv"):
            file.file.seek(0)
            df = pd.read_csv(file.file, low_memory=False)
            df = df.where(pd.notna(df), None)

            columns = _unique_columns(list(df.columns))
            if list(df.columns) != columns:
                df.columns = columns

            sample_data = [
                {col: _sanitize(row.get(col)) for col in columns}
                for row in df.to_dict(orient="records")
            ]

            column_types = []
            for col in columns:
                values = [row.get(col) for row in sample_data]
                col_type = _detect_column_type(col, values)
                column_types.append({
                    "name": col,
                    "type": col_type,
                    "sample": values[:3]
                })

            return {
                "user_id": user_id,
                "intent": intent,
                "file": {
                    "name": file.filename or "arquivo",
                    "type": "csv",
                    "columns": columns
                },
                "columns": column_types,
                "sample_data": sample_data,
                "row_count": len(sample_data),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "_meta": {
                    "sheet": "CSV",
                    "block_index": 0,
                    "total_blocks": 1,
                    "removed_totals": 0,
                    "header_span": 1
                }
            }

        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio ou não suportado")
        
        # Detecta blocos
        detected = detect_blocks(sheets)
        
        # Seleciona sheet
        target_sheet = sheet
        if not target_sheet:
            # Usa primeiro sheet com blocos
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail=f"Sheet não encontrada: {target_sheet}")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail=f"Nenhum bloco de dados encontrado em '{target_sheet}'")
        
        # Seleciona bloco
        target_block_index = block_index if block_index is not None else 0
        if target_block_index < 0 or target_block_index >= len(blocks):
            raise HTTPException(status_code=400, detail=f"block_index inválido: {target_block_index}")
        
        block = blocks[target_block_index]
        
        # Processa colunas e linhas
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        max_len = max([len(raw_columns)] + [len(r) for r in raw_rows] + [0])
        columns = raw_columns + [f"col_{i + 1}" for i in range(len(raw_columns), max_len)]
        columns = _unique_columns(columns)
        
        # Remove duplicatas e colunas esparsas
        columns, raw_rows = _prune_duplicate_and_sparse_columns(columns, raw_rows)
        
        # Converte para objetos
        sample_data = _rows_to_objects(columns, raw_rows)
        
        # Detecta tipos de colunas
        column_types = []
        for col in columns:
            values = [row.get(col) for row in sample_data]
            col_type = _detect_column_type(col, values)
            column_types.append({
                "name": col,
                "type": col_type,
                "sample": values[:3]
            })
        
        # Monta resposta no formato do N8N
        return {
            "user_id": user_id,
            "intent": intent,
            "file": {
                "name": file.filename or "arquivo",
                "type": "xlsx" if file.filename and file.filename.endswith(".xlsx") else "csv",
                "columns": columns
            },
            "columns": column_types,
            "sample_data": sample_data,
            "row_count": len(sample_data),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            
            # Metadados extras
            "_meta": {
                "sheet": target_sheet,
                "block_index": target_block_index,
                "total_blocks": len(blocks),
                "removed_totals": block.get("removed_totals", 0),
                "header_span": block.get("header_span", 1)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")


# ============================================================
# ENDPOINT: /list-blocks
# Lista todos os blocos disponíveis em um arquivo
# ============================================================

@app.post("/list-blocks")
async def list_blocks(file: UploadFile = File(...)):
    """Lista todos os blocos de dados encontrados no arquivo."""
    try:
        sheets = read_excel(file)
        detected = detect_blocks(sheets)
        
        result = []
        for sheet_name, blocks in detected.items():
            sheet_info = {
                "name": sheet_name,
                "blocks": []
            }
            
            for i, block in enumerate(blocks):
                columns = block.get("columns", [])
                rows = block.get("rows", [])
                
                block_info = {
                    "index": i,
                    "id": f"{sheet_name}_block_{i + 1}",
                    "columns": columns,
                    "row_count": len(rows),
                    "header_span": block.get("header_span", 1),
                    "removed_totals": block.get("removed_totals", 0),
                    "preview": rows[:3] if rows else []
                }
                sheet_info["blocks"].append(block_info)
            
            if sheet_info["blocks"]:
                result.append(sheet_info)
        
        return {"status": "ok", "sheets": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ============================================================
# ENDPOINTS LEGADOS (mantidos para compatibilidade)
# ============================================================

@app.post("/parse-sheet")
async def parse_sheet(file: UploadFile = File(...)):
    """Endpoint legado - use /list-blocks ou /process-for-n8n."""
    filename = (file.filename or "").lower()
    if filename.endswith(".csv"):
        file.file.seek(0)
        df = pd.read_csv(file.file, low_memory=False)
        df = df.where(pd.notna(df), None)

        columns = _unique_columns(list(df.columns))
        if list(df.columns) != columns:
            df.columns = columns

        return {
            "status": "ok",
            "sheets": [
                {
                    "name": "CSV",
                    "datasets": [
                        {
                            "id": "CSV_block_1",
                            "block_index": 0,
                            "rows": int(len(df)),
                            "columns": columns,
                            "header_span": 1,
                            "removed_totals": 0,
                        }
                    ],
                }
            ],
        }
    sheets = read_excel(file)
    detected = detect_blocks(sheets)
    result = normalize_blocks(detected)
    return {"status": "ok", "sheets": result}


@app.post("/extract-block")
async def extract_block(
    file: UploadFile = File(...),
    sheet: str = Form(...),
    block_index: int = Form(...),
):
    """Endpoint legado - use /process-for-n8n."""
    filename = (file.filename or "").lower()
    if filename.endswith(".csv"):
        if sheet != "CSV":
            raise HTTPException(status_code=400, detail=f"Sheet '{sheet}' não encontrada")
        if block_index != 0:
            raise HTTPException(status_code=400, detail=f"block_index inválido: {block_index}")

        file.file.seek(0)
        df = pd.read_csv(file.file, low_memory=False)
        df = df.where(pd.notna(df), None)

        columns = _unique_columns(list(df.columns))
        if list(df.columns) != columns:
            df.columns = columns

        rows = [
            {col: _sanitize(row.get(col)) for col in columns}
            for row in df.to_dict(orient="records")
        ]

        return {
            "status": "ok",
            "sheet": "CSV",
            "dataset": {
                "id": "CSV_block_1",
                "columns": columns,
                "rows": rows,
                "rowCount": len(rows),
            },
        }
    sheets = read_excel(file)
    if sheet not in sheets:
        raise HTTPException(status_code=400, detail=f"Sheet '{sheet}' não encontrada")

    detected = detect_blocks({sheet: sheets[sheet]})
    blocks = detected.get(sheet) or []
    if block_index < 0 or block_index >= len(blocks):
        raise HTTPException(status_code=400, detail=f"block_index inválido: {block_index}")

    block = blocks[block_index]
    raw_columns = list(block.get("columns") or [])
    raw_rows = list(block.get("rows") or [])

    max_len = max([len(raw_columns)] + [len(r) for r in raw_rows] + [0])
    columns = raw_columns + [f"col_{i + 1}" for i in range(len(raw_columns), max_len)]
    columns = _unique_columns(columns)

    columns, raw_rows = _prune_duplicate_and_sparse_columns(columns, raw_rows)

    rows = _rows_to_objects(columns, raw_rows)

    return {
        "status": "ok",
        "sheet": sheet,
        "dataset": {
            "id": f"{sheet}_block_{block_index + 1}",
            "columns": columns,
            "rows": rows,
            "rowCount": len(rows),
        },
    }


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok", "version": "2.1", "features": ["metrics_engine"]}


# ============================================================
# NOVOS ENDPOINTS: MOTOR DE MÉTRICAS
# ============================================================

@app.post("/calculate-metrics")
async def api_calculate_metrics(
    file: UploadFile = File(...),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
    financial: bool = Form(False),
):
    """
    Calcula métricas matemáticas REAIS a partir do arquivo.
    
    A IA interpreta, o pandas CALCULA.
    
    Parâmetros:
        file: Arquivo Excel/CSV
        sheet: Nome da sheet (opcional)
        block_index: Índice do bloco (opcional)
        financial: Se True, calcula métricas financeiras específicas
    
    Retorna:
        JSON com métricas calculadas (não inventadas)
    """
    try:
        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio")
        
        # Detecta blocos e seleciona dados
        detected = detect_blocks(sheets)
        
        target_sheet = sheet
        if not target_sheet:
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail="Sheet não encontrada")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail="Nenhum dado encontrado")
        
        target_idx = block_index if block_index is not None else 0
        if target_idx < 0 or target_idx >= len(blocks):
            target_idx = 0
        
        block = blocks[target_idx]
        
        # Converte para DataFrame
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        columns = _unique_columns(raw_columns)
        data = _rows_to_objects(columns, raw_rows)
        
        df = load_from_data(data)
        df = normalize_dataframe(df)
        
        # Calcula métricas
        if financial:
            metrics = calculate_financial_metrics(df)
        else:
            metrics = calculate_metrics(df)
        
        return {
            "status": "success",
            "metrics": metrics,
            "column_types": detect_column_types(df),
            "row_count": len(df),
            "_meta": {
                "sheet": target_sheet,
                "block_index": target_idx,
                "mode": "financial" if financial else "general"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.post("/chart-data")
async def api_chart_data(
    file: UploadFile = File(...),
    x: str = Form(...),
    y: str = Form(...),
    agg: str = Form("sum"),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
):
    """
    Gera dados agregados para gráficos.
    
    Parâmetros:
        file: Arquivo Excel/CSV
        x: Coluna para eixo X (categorias/datas)
        y: Coluna para eixo Y (valores)
        agg: Tipo de agregação (sum, avg, count, min, max)
    
    Retorna:
        Lista de {name, value} pronta para frontend
    """
    try:
        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio")
        
        detected = detect_blocks(sheets)
        
        target_sheet = sheet
        if not target_sheet:
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail="Sheet não encontrada")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail="Nenhum dado encontrado")
        
        target_idx = block_index if block_index is not None else 0
        block = blocks[max(0, min(target_idx, len(blocks) - 1))]
        
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        columns = _unique_columns(raw_columns)
        data = _rows_to_objects(columns, raw_rows)
        
        df = load_from_data(data)
        df = normalize_dataframe(df)
        
        chart_data = group_for_chart(df, x, y, agg)
        
        return {
            "status": "success",
            "data": chart_data,
            "config": {
                "x": x,
                "y": y,
                "agg": agg
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.post("/build-dashboard")
async def api_build_dashboard(
    file: UploadFile = File(...),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
):
    """
    Gera resposta completa para dashboard.
    
    Retorna:
        - metrics: Métricas calculadas
        - charts: Dados de gráficos gerados automaticamente
        - preview: Primeiras 10 linhas dos dados
        - suggestions: Sugestões de gráficos adicionais
    """
    try:
        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio")
        
        detected = detect_blocks(sheets)
        
        target_sheet = sheet
        if not target_sheet:
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail="Sheet não encontrada")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail="Nenhum dado encontrado")
        
        target_idx = block_index if block_index is not None else 0
        block = blocks[max(0, min(target_idx, len(blocks) - 1))]
        
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        columns = _unique_columns(raw_columns)
        data = _rows_to_objects(columns, raw_rows)
        
        df = load_from_data(data)
        
        # Usa o build_response do metrics_engine
        response = build_response(df)
        
        # Adiciona metadados
        response["_meta"] = {
            "sheet": target_sheet,
            "block_index": target_idx,
            "file": file.filename
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.post("/chart-suggestions")
async def api_chart_suggestions(
    file: UploadFile = File(...),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
):
    """
    Sugere gráficos baseados nas colunas disponíveis.
    """
    try:
        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio")
        
        detected = detect_blocks(sheets)
        
        target_sheet = sheet
        if not target_sheet:
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail="Sheet não encontrada")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail="Nenhum dado encontrado")
        
        target_idx = block_index if block_index is not None else 0
        block = blocks[max(0, min(target_idx, len(blocks) - 1))]
        
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        columns = _unique_columns(raw_columns)
        data = _rows_to_objects(columns, raw_rows)
        
        df = load_from_data(data)
        df = normalize_dataframe(df)
        
        suggestions = generate_chart_suggestions(df)
        
        return {
            "status": "success",
            "suggestions": suggestions,
            "columns": list(df.columns),
            "column_types": detect_column_types(df)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ============================================================
# ENDPOINT IA: /ai/analysis
# Contrato cognitivo Python → IA
# ============================================================

@app.post("/ai/analysis")
async def api_ai_analysis(
    file: UploadFile = File(...),
    template: str = Form("auto"),
    dataset_id: Optional[str] = Form(None),
    sheet: Optional[str] = Form(None),
    block_index: Optional[int] = Form(None),
):
    """
    Gera o analysis_snapshot: contrato cognitivo entre Python e IA.
    
    O Python CALCULA e entrega fatos.
    A IA ESCOLHE e entrega clareza.
    
    Este endpoint retorna um JSON estruturado que a IA pode consumir
    sem precisar calcular, adivinhar ou pedir esclarecimentos.
    
    Returns:
        analysis_snapshot com:
        - dataset: identidade do dataset
        - profile: tipos de colunas disponíveis
        - safe_metrics: métricas já calculadas
        - precomputed_views: dados prontos para gráficos
        - grouping_capabilities: onde faz sentido agrupar
        - system_hints: recomendações do Python para a IA
    """
    try:
        filename = (file.filename or "").lower()
        
        # Processa CSV
        if filename.endswith(".csv"):
            file.file.seek(0)
            df = pd.read_csv(file.file, low_memory=False)
            df = df.where(pd.notna(df), None)
            
            snapshot = build_analysis_snapshot(
                df, 
                template=template,
                dataset_id=dataset_id
            )
            
            return {
                "status": "success",
                "analysis_snapshot": snapshot
            }
        
        # Processa Excel
        sheets = read_excel(file)
        
        if not sheets:
            raise HTTPException(status_code=400, detail="Arquivo vazio ou não suportado")
        
        # Detecta blocos
        detected = detect_blocks(sheets)
        
        # Seleciona sheet
        target_sheet = sheet
        if not target_sheet:
            for s_name, blocks in detected.items():
                if blocks:
                    target_sheet = s_name
                    break
        
        if not target_sheet or target_sheet not in detected:
            raise HTTPException(status_code=400, detail=f"Sheet não encontrada: {target_sheet}")
        
        blocks = detected[target_sheet]
        if not blocks:
            raise HTTPException(status_code=400, detail=f"Nenhum bloco de dados encontrado em '{target_sheet}'")
        
        # Seleciona bloco
        target_block_index = block_index if block_index is not None else 0
        if target_block_index < 0 or target_block_index >= len(blocks):
            raise HTTPException(status_code=400, detail=f"block_index inválido: {target_block_index}")
        
        block = blocks[target_block_index]
        
        # Processa colunas e linhas
        raw_columns = list(block.get("columns") or [])
        raw_rows = list(block.get("rows") or [])
        
        columns = _unique_columns(raw_columns)
        data = _rows_to_objects(columns, raw_rows)
        
        df = load_from_data(data)
        
        # Gera o snapshot
        snapshot = build_analysis_snapshot(
            df,
            template=template,
            dataset_id=dataset_id or f"{target_sheet}_block_{target_block_index}"
        )
        
        return {
            "status": "success",
            "analysis_snapshot": snapshot,
            "_meta": {
                "sheet": target_sheet,
                "block_index": target_block_index,
                "file": file.filename
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar analysis_snapshot: {str(e)}")

