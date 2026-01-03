"""
Motor de Métricas - Camada de Verdade Matemática
================================================
A IA interpreta, o pandas CALCULA.

Esta é a camada responsável por:
- Calcular métricas reais (sem inventar números)
- Gerar dados para gráficos
- Normalizar valores brasileiros (1.234,56)
- Tratar acentos e caracteres especiais
- Retornar JSON pronto para dashboard/n8n/IA
"""

import pandas as pd
import numpy as np
import re
import unicodedata
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


# ============================================================
# 🔧 HELPER FUNCTIONS
# ============================================================

def safe_id(value: str) -> str:
    """
    Normaliza strings para IDs seguros (compatível com Python 3.11+).
    Remove caracteres especiais e converte para lowercase.
    
    Args:
        value: String para normalizar
        
    Returns:
        String segura para usar como ID
    """
    return re.sub(r"[^\w]", "_", value.lower())


# ============================================================
# 0️⃣ TRATAMENTO DE ACENTOS E ENCODING
# ============================================================

def _build_encoding_fixes():
    """Constrói o mapeamento de correções de encoding de forma segura."""
    fixes = {}
    
    # UTF-8 mal interpretado como Latin-1 - pares comuns
    utf8_latin1_pairs = [
        ('Ã¡', 'á'), ('Ã ', 'à'), ('Ã¢', 'â'), ('Ã£', 'ã'),
        ('Ã©', 'é'), ('Ã¨', 'è'), ('Ãª', 'ê'),
        ('Ã­', 'í'), ('Ã¬', 'ì'), ('Ã®', 'î'),
        ('Ã³', 'ó'), ('Ã²', 'ò'), ('Ã´', 'ô'), ('Ãµ', 'õ'),
        ('Ãº', 'ú'), ('Ã¹', 'ù'), ('Ã»', 'û'),
        ('Ã§', 'ç'),
    ]
    
    for wrong, correct in utf8_latin1_pairs:
        fixes[wrong] = correct
    
    return fixes

ENCODING_FIXES = _build_encoding_fixes()

# Mapeamento para remover acentos (quando necessário para busca)
ACCENT_MAP = {
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N',
}


def fix_encoding(text: str) -> str:
    """
    Corrige problemas de encoding em texto.
    
    Trata:
    - UTF-8 mal interpretado como Latin-1
    - Caracteres Windows-1252 corrompidos
    - Sequências de escape HTML
    """
    if not isinstance(text, str):
        return text
    
    result = text
    
    # Tenta corrigir UTF-8 mal interpretado
    try:
        # Se parece corrompido, tenta re-decodificar
        if any(char in result for char in ['Ã', 'â€', 'Â']):
            result = result.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        pass
    
    # Aplica mapeamento de correções conhecidas
    for wrong, correct in ENCODING_FIXES.items():
        result = result.replace(wrong, correct)
    
    # Remove caracteres de controle (exceto newline e tab)
    result = ''.join(char for char in result if char >= ' ' or char in '\n\t')
    
    return result


def remove_accents(text: str) -> str:
    """
    Remove acentos de texto (útil para comparações e buscas).
    Mantém o texto legível, apenas normaliza.
    """
    if not isinstance(text, str):
        return text
    
    # Método 1: Usando unicodedata (mais confiável)
    try:
        nfkd = unicodedata.normalize('NFKD', text)
        return ''.join(c for c in nfkd if not unicodedata.combining(c))
    except:
        pass
    
    # Método 2: Fallback com mapeamento manual
    result = text
    for accented, plain in ACCENT_MAP.items():
        result = result.replace(accented, plain)
    
    return result


def normalize_text(text: str, remove_accents_flag: bool = False) -> str:
    """
    Normaliza texto: corrige encoding e opcionalmente remove acentos.
    """
    if not isinstance(text, str):
        return str(text) if text is not None else ''
    
    # Primeiro corrige encoding
    result = fix_encoding(text)
    
    # Remove espaços extras
    result = ' '.join(result.split())
    
    # Opcionalmente remove acentos
    if remove_accents_flag:
        result = remove_accents(result)
    
    return result


def fix_dataframe_encoding(df: pd.DataFrame) -> pd.DataFrame:
    """
    Corrige problemas de encoding em todo o DataFrame.
    
    ✔️ Corrige nomes de colunas
    ✔️ Corrige valores de texto
    ✔️ Preserva números e datas
    """
    if df.empty:
        return df
    
    df = df.copy()
    
    # Corrige nomes das colunas
    new_columns = []
    for col in df.columns:
        if isinstance(col, str):
            fixed_col = fix_encoding(col.strip())
            new_columns.append(fixed_col)
        else:
            new_columns.append(col)
    df.columns = new_columns
    
    # Corrige valores de texto em cada coluna
    for col in df.columns:
        if df[col].dtype == object:
            # Aplica correção de encoding e strip
            df[col] = df[col].apply(lambda x: fix_encoding(str(x).strip()) if isinstance(x, str) and pd.notna(x) else x)
    
    return df


def detect_and_fix_encoding(content: bytes) -> tuple:
    """
    Detecta o encoding de conteúdo binário e retorna texto decodificado.
    
    Returns:
        tuple: (texto_decodificado, encoding_detectado)
    """
    # Lista de encodings para tentar (ordem de prioridade)
    encodings = [
        'utf-8',
        'utf-8-sig',  # UTF-8 com BOM
        'latin-1',
        'iso-8859-1',
        'cp1252',     # Windows Latin-1
        'cp850',      # DOS Latin-1
    ]
    
    for encoding in encodings:
        try:
            text = content.decode(encoding)
            # Verifica se o texto faz sentido (não tem muitos caracteres estranhos)
            weird_chars = sum(1 for c in text[:1000] if ord(c) > 127 and c not in 'áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ°ªº§')
            if weird_chars < len(text[:1000]) * 0.1:  # Menos de 10% de caracteres estranhos
                return text, encoding
        except (UnicodeDecodeError, UnicodeEncodeError):
            continue
    
    # Fallback: UTF-8 ignorando erros
    return content.decode('utf-8', errors='ignore'), 'utf-8-fallback'


# ============================================================
# 1️⃣ LEITURA UNIVERSAL DE ARQUIVOS
# ============================================================

def load_file(path: str) -> pd.DataFrame:
    """
    Carrega CSV ou Excel automaticamente.
    Funciona com planilhas bagunçadas.
    """
    if path.endswith(".csv"):
        # Tenta diferentes encodings comuns no Brasil
        for encoding in ["utf-8", "latin-1", "iso-8859-1", "cp1252"]:
            try:
                return pd.read_csv(path, encoding=encoding, low_memory=False)
            except UnicodeDecodeError:
                continue
        # Fallback final
        return pd.read_csv(path, encoding="utf-8", errors="ignore", low_memory=False)
    
    elif path.endswith((".xls", ".xlsx")):
        return pd.read_excel(path)
    
    else:
        raise ValueError(f"Formato não suportado: {path}")


def load_from_data(data: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Carrega dados já parseados (lista de dicts) em DataFrame.
    Útil quando os dados já vêm da API.
    """
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


# ============================================================
# 2️⃣ NORMALIZAÇÃO AUTOMÁTICA (SEM QUEBRAR DADOS)
# ============================================================

def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza DataFrame para cálculos seguindo o padrão 'Supremo'.
    
    ✔️ Corrige problemas de encoding/acentos
    ✔️ Corrige números brasileiros (1.234,56)
    ✔️ Padroniza textos (Title Case para categorias, Strip)
    ✔️ Remove duplicatas por ID (se detectado)
    ✔️ Auto-calcula Faturamento (se existirem colunas base)
    """
    if df.empty:
        return df
    
    df = df.copy()
    
    # 1. Primeiro corrige encoding (acentos corrompidos)
    df = fix_dataframe_encoding(df)
    
    # 2. Detecta tipos iniciais para saber o que tratar
    col_types = detect_column_types(df)
    
    # 3. Processa cada coluna
    for col in df.columns:
        # Trata Números Brasileiros
        if df[col].dtype == object:
            converted = convert_brazilian_numbers(df[col])
            if converted is not None:
                df[col] = converted
                # Atualiza tipo detectado
                if re.search(r"(valor|preco|preço|custo|receita|total|lucro|faturamento|r\$)", col.lower()):
                    col_types[col] = "currency"
                else:
                    col_types[col] = "number"
        
        # Trata Texto/Categorias (Padronização Supremo)
        if col_types.get(col) == "category":
            if df[col].dtype == object:
                # Remove espaços e coloca em Title Case (Ex: "são paulo" -> "São Paulo")
                df[col] = df[col].apply(lambda x: str(x).strip().title() if isinstance(x, str) and pd.notna(x) else x)
        
        # Trata Datas
        if col_types.get(col) == "date" and df[col].dtype == object:
            try:
                # Tenta vários formatos brasileiros comuns
                df[col] = pd.to_datetime(df[col], errors='coerce', dayfirst=True)
            except:
                pass

    # 4. Remove duplicatas
    # Sempre remove duplicatas exatas de linha (proteção básica)
    df = df.drop_duplicates()
    
    # Busca por IDs únicos que possam estar duplicados por erro de join/exportação
    id_patterns = r"(^id$|^codigo$|^cod_|^identificador|^pk_|^key$|^cpf$|^cnpj$)"
    id_cols = [c for c in df.columns if re.search(id_patterns, c.lower())]
    
    if id_cols:
        # Pega a coluna que mais se parece com um ID primário
        main_id = id_cols[0]
        # Se a coluna é quase única (poucas duplicatas), pode ser erro de exportação
        # Se tem muitas duplicatas (>10%), provavelmente é um OrderID com múltiplos itens, não remove.
        if len(df) > 0:
            unique_ratio = df[main_id].nunique() / len(df)
            if 0.90 < unique_ratio < 1.0:
                df = df.drop_duplicates(subset=[main_id])

    # 5. Lógica de Negócio: Auto-cálculo de Faturamento
    # Se temos Qtd e Preço mas não temos Faturamento, calculamos
    if "Faturamento" not in df.columns and "Receita" not in df.columns:
        qty_cols = [c for c in df.columns if re.search(r"(qtd|quantidade|vol|venda_item)", c.lower())]
        price_cols = [c for c in df.columns if re.search(r"(preco|preço|valor_unit|unitario)", c.lower())]
        
        if qty_cols and price_cols:
            df["Faturamento"] = df[qty_cols[0]] * df[price_cols[0]]
            col_types["Faturamento"] = "currency"

    return df


def convert_brazilian_numbers(series: pd.Series) -> Optional[pd.Series]:
    """
    Converte coluna com números no formato brasileiro (1.234,56) para float.
    Retorna None se a coluna não parecer numérica.
    """
    # Conta quantos valores parecem numéricos
    numeric_count = 0
    total = 0
    
    for val in series.dropna().head(20):
        total += 1
        s = str(val).strip()
        
        # Remove R$, espaços e símbolos
        s = re.sub(r"[R$\s]", "", s)
        
        # Padrões de números brasileiros: 1.234,56 ou 1234,56 ou 1234.56
        if re.match(r"^-?[\d.]+,\d{1,2}$", s):  # 1.234,56
            numeric_count += 1
        elif re.match(r"^-?[\d,]+\.\d{1,2}$", s):  # 1,234.56
            numeric_count += 1
        elif re.match(r"^-?\d+([.,]\d+)?$", s):  # 1234 ou 1234.56
            numeric_count += 1
    
    # Se menos de 50% são numéricos, não converte
    if total == 0 or numeric_count / total < 0.5:
        return None
    
    # Converte a série
    def convert_value(val):
        if pd.isna(val):
            return np.nan
        s = str(val).strip()
        
        # Remove R$, espaços
        s = re.sub(r"[R$\s]", "", s)
        
        # Detecta formato e converte
        if "," in s and "." in s:
            # Formato brasileiro: 1.234,56
            if s.rindex(",") > s.rindex("."):
                s = s.replace(".", "").replace(",", ".")
            # Formato americano: 1,234.56
            else:
                s = s.replace(",", "")
        elif "," in s:
            # Só vírgula: assume brasileiro
            s = s.replace(",", ".")
        
        try:
            return float(s)
        except:
            return np.nan
    
    return series.apply(convert_value)


# ============================================================
# 3️⃣ DETECÇÃO DE COLUNAS POR TIPO
# ============================================================

def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    """
    Detecta o tipo semântico de cada coluna:
    - currency: valores monetários
    - number: quantidades/números
    - date: datas
    - category: categorias/texto discreto
    - text: texto livre
    """
    types = {}
    
    for col in df.columns:
        col_lower = col.lower()
        values = df[col].dropna().head(20).tolist()
        
        # Detecta por nome
        if re.search(r"(valor|preco|preço|custo|receita|total|lucro|despesa|faturamento|r\$)", col_lower):
            types[col] = "currency"
        elif re.search(r"(data|date|dt|periodo|mes|mês|ano|dia)", col_lower):
            types[col] = "date"
        elif re.search(r"(quantidade|qtd|qty|volume|unidades|pecas|peças|estoque)", col_lower):
            types[col] = "number"
        elif re.search(r"(cliente|produto|projeto|vendedor|categoria|status|tipo|grupo)", col_lower):
            types[col] = "category"
        # Detecta por tipo de dados
        elif pd.api.types.is_numeric_dtype(df[col]):
            types[col] = "number"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            types[col] = "date"
        else:
            # Detecta categoria vs texto
            unique_ratio = len(df[col].dropna().unique()) / max(1, len(df[col].dropna()))
            if unique_ratio < 0.3 and len(df[col].dropna()) >= 5:
                types[col] = "category"
            else:
                types[col] = "text"
    
    return types


def find_columns_by_type(df: pd.DataFrame, col_types: Dict[str, str], target_type: str) -> List[str]:
    """Retorna lista de colunas de um tipo específico."""
    return [col for col, t in col_types.items() if t == target_type]


# ============================================================
# 4️⃣ MOTOR DE MÉTRICAS (CÁLCULOS REAIS)
# ============================================================

def calculate_metrics(df: pd.DataFrame, column_types: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Calcula métricas reais a partir do DataFrame.
    
    👉 Só calcula o que existe
    👉 Se a coluna não existe → não cria métrica falsa
    """
    if df.empty:
        return {"linhas": 0, "colunas": 0}
    
    if column_types is None:
        column_types = detect_column_types(df)
    
    metrics = {
        "linhas": int(len(df)),
        "colunas": int(len(df.columns))
    }
    
    # Métricas para colunas numéricas
    currency_cols = find_columns_by_type(df, column_types, "currency")
    number_cols = find_columns_by_type(df, column_types, "number")
    
    # Faturamento/Receita
    for col in currency_cols:
        if df[col].dtype in [np.float64, np.int64, float, int]:
            col_clean = re.sub(r"[^\w]", "_", col.lower())
            total = float(df[col].sum())
            mean = float(df[col].mean())
            
            metrics[f"{col_clean}_total"] = round(total, 2)
            metrics[f"{col_clean}_media"] = round(mean, 2)
            metrics[f"{col_clean}_max"] = round(float(df[col].max()), 2)
            metrics[f"{col_clean}_min"] = round(float(df[col].min()), 2)
    
    # Quantidades
    for col in number_cols:
        if df[col].dtype in [np.float64, np.int64, float, int]:
            col_clean = re.sub(r"[^\w]", "_", col.lower())
            metrics[f"{col_clean}_total"] = int(df[col].sum())
            metrics[f"{col_clean}_media"] = round(float(df[col].mean()), 2)
    
    # Métricas de categorias
    category_cols = find_columns_by_type(df, column_types, "category")
    for col in category_cols[:3]:  # Limita a 3 categorias
        col_clean = re.sub(r"[^\w]", "_", col.lower())
        unique = df[col].nunique()
        top = df[col].value_counts().head(1)
        
        metrics[f"{col_clean}_unicos"] = int(unique)
        if not top.empty:
            metrics[f"{col_clean}_principal"] = str(top.index[0])
            metrics[f"{col_clean}_principal_count"] = int(top.values[0])
    
    return metrics


def calculate_financial_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Métricas específicas para dados financeiros.
    Procura por colunas de Receita, Custo, Lucro automaticamente.
    """
    df_norm = normalize_dataframe(df)
    col_types = detect_column_types(df_norm)
    
    metrics = calculate_metrics(df_norm, col_types)
    
    # Procura colunas específicas
    revenue_cols = [c for c in df_norm.columns if re.search(r"(receita|faturamento|vendas|revenue)", c.lower())]
    cost_cols = [c for c in df_norm.columns if re.search(r"(custo|despesa|cost|expense)", c.lower())]
    
    if revenue_cols and pd.api.types.is_numeric_dtype(df_norm[revenue_cols[0]]):
        metrics["faturamento_total"] = round(float(df_norm[revenue_cols[0]].sum()), 2)
        metrics["ticket_medio"] = round(float(df_norm[revenue_cols[0]].mean()), 2)
    
    if cost_cols and pd.api.types.is_numeric_dtype(df_norm[cost_cols[0]]):
        metrics["custo_total"] = round(float(df_norm[cost_cols[0]].sum()), 2)
    
    if "faturamento_total" in metrics and "custo_total" in metrics:
        metrics["lucro_bruto"] = round(metrics["faturamento_total"] - metrics["custo_total"], 2)
        if metrics["faturamento_total"] > 0:
            metrics["margem_bruta"] = round(
                (metrics["lucro_bruto"] / metrics["faturamento_total"]) * 100, 2
            )
    
    return metrics


# ============================================================
# 5️⃣ AGREGAÇÕES PARA GRÁFICOS
# ============================================================

def group_for_chart(
    df: pd.DataFrame, 
    x: str, 
    y: str, 
    agg: str = "sum"
) -> List[Dict[str, Any]]:
    """
    Agrupa dados para gráficos.
    
    Args:
        df: DataFrame com dados
        x: Coluna para eixo X (categorias/datas)
        y: Coluna para eixo Y (valores)
        agg: Tipo de agregação (sum, avg, count, min, max)
    
    Returns:
        Lista de {name, value} pronta para o frontend
    """
    if x not in df.columns or y not in df.columns:
        return []
    
    # Normaliza se necessário
    df_work = df.copy()
    if df_work[y].dtype == object:
        converted = convert_brazilian_numbers(df_work[y])
        if converted is not None:
            df_work[y] = converted
    
    if not pd.api.types.is_numeric_dtype(df_work[y]):
        return []
    
    # Aplica agregação
    agg_map = {
        "sum": "sum",
        "avg": "mean",
        "mean": "mean",
        "count": "count",
        "min": "min",
        "max": "max"
    }
    
    agg_func = agg_map.get(agg.lower(), "sum")
    
    try:
        grouped = df_work.groupby(x, dropna=True)[y].agg(agg_func)
        
        return [
            {"name": str(k), "value": round(float(v), 2) if pd.notna(v) else 0}
            for k, v in grouped.items()
        ]
    except Exception:
        return []


def generate_chart_suggestions(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Sugere gráficos baseados nas colunas disponíveis.
    """
    col_types = detect_column_types(df)
    suggestions = []
    
    currency_cols = find_columns_by_type(df, col_types, "currency")
    number_cols = find_columns_by_type(df, col_types, "number")
    category_cols = find_columns_by_type(df, col_types, "category")
    date_cols = find_columns_by_type(df, col_types, "date")
    
    numeric_cols = currency_cols + number_cols
    
    # Sugestões de gráfico de barras (categoria x valor)
    for cat_col in category_cols[:2]:
        for num_col in numeric_cols[:2]:
            suggestions.append({
                "type": "bar",
                "title": f"{num_col} por {cat_col}",
                "x": cat_col,
                "y": num_col,
                "agg": "sum"
            })
    
    # Sugestões de gráfico de linha (data x valor)
    for date_col in date_cols[:1]:
        for num_col in numeric_cols[:2]:
            suggestions.append({
                "type": "line",
                "title": f"{num_col} ao longo do tempo",
                "x": date_col,
                "y": num_col,
                "agg": "sum"
            })
    
    # Sugestão de pizza para categorias
    for cat_col in category_cols[:1]:
        if df[cat_col].nunique() <= 10:
            for num_col in numeric_cols[:1]:
                suggestions.append({
                    "type": "pie",
                    "title": f"Distribuição de {num_col} por {cat_col}",
                    "x": cat_col,
                    "y": num_col,
                    "agg": "sum"
                })
    
    return suggestions


# ============================================================
# 6️⃣ RESPOSTA FINAL (JSON PADRÃO DO SISTEMA)
# ============================================================

def build_response(
    df: pd.DataFrame, 
    chart_configs: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Monta resposta JSON completa para dashboard.
    
    Esta é a função principal que:
    1. Normaliza os dados
    2. Calcula métricas
    3. Gera dados para gráficos
    4. Retorna tudo em JSON estruturado
    """
    if df.empty:
        return {
            "status": "success",
            "metrics": {"linhas": 0},
            "charts": {},
            "preview": [],
            "suggestions": []
        }
    
    # Normaliza DataFrame
    df_norm = normalize_dataframe(df)
    
    # Calcula métricas
    col_types = detect_column_types(df_norm)
    metrics = calculate_metrics(df_norm, col_types)
    
    # Gera dados para gráficos
    charts = {}
    
    if chart_configs:
        for config in chart_configs:
            chart_id = config.get("id", config.get("title", "chart"))
            chart_id = re.sub(r"[^\w]", "_", chart_id.lower())
            
            data = group_for_chart(
                df_norm,
                x=config.get("x", ""),
                y=config.get("y", ""),
                agg=config.get("agg", "sum")
            )
            
            if data:
                charts[chart_id] = data
    else:
        # Gera gráficos automaticamente baseado nas colunas
        suggestions = generate_chart_suggestions(df_norm)
        for i, sug in enumerate(suggestions[:4]):  # Limita a 4 gráficos
            chart_id = re.sub(r"[^\w]", "_", sug.get("title", f"chart_{i}").lower())
            data = group_for_chart(df_norm, sug["x"], sug["y"], sug["agg"])
            if data:
                charts[chart_id] = data
    
    return {
        "status": "success",
        "metrics": metrics,
        "charts": charts,
        "preview": df_norm.head(10).to_dict(orient="records"),
        "suggestions": generate_chart_suggestions(df_norm),
        "column_types": col_types,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ============================================================
# 7️⃣ ANALYSIS SNAPSHOT (CONTRATO PYTHON → IA)
# ============================================================

def build_analysis_snapshot(
    df: pd.DataFrame,
    template: str = "auto",
    dataset_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Gera o analysis_snapshot: contrato cognitivo entre Python e IA.
    
    O Python CALCULA e entrega fatos.
    A IA ESCOLHE e entrega clareza.
    
    A IA NUNCA recebe:
    - Planilha crua
    - Milhares de linhas
    - Dados ambíguos
    
    A IA SEMPRE recebe:
    - Métricas já calculadas
    - Views pré-computadas
    - Tipos de dados explícitos
    """
    if df.empty:
        return {
            "dataset": {"id": dataset_id or "empty", "template": "empty", "rows": 0, "confidence_level": "low"},
            "profile": {},
            "safe_metrics": [],
            "precomputed_views": {},
            "grouping_capabilities": {"allowed_dimensions": [], "time_granularity": []},
            "system_hints": {"recommended_charts": [], "avoid_charts": ["pie"], "observations": ["Dataset vazio"]}
        }
    
    # Normaliza e detecta tipos
    df_norm = normalize_dataframe(df)
    col_types = detect_column_types(df_norm)
    
    # ========== 1. DATASET IDENTITY ==========
    detected_template = _detect_template(df_norm, col_types) if template == "auto" else template
    confidence = _calculate_confidence(df_norm, col_types)
    
    dataset = {
        "id": dataset_id or f"dataset_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "template": detected_template,
        "rows": int(len(df_norm)),
        "columns": int(len(df_norm.columns)),
        "confidence_level": confidence
    }
    
    # ========== 2. PROFILE (o que existe) ==========
    profile = {
        "date_columns": find_columns_by_type(df_norm, col_types, "date"),
        "numeric_columns": find_columns_by_type(df_norm, col_types, "number"),
        "currency_columns": find_columns_by_type(df_norm, col_types, "currency"),
        "categorical_columns": find_columns_by_type(df_norm, col_types, "category"),
        "text_columns": find_columns_by_type(df_norm, col_types, "text"),
        "percentage_columns": []  # Detectar se houver colunas com %
    }
    
    # Detecta colunas de percentual
    for col in df_norm.columns:
        if re.search(r"(percent|pct|%|margem|taxa|rate)", col.lower()):
            profile["percentage_columns"].append(col)
    
    # ========== 3. SAFE METRICS (fatos calculados) ==========
    safe_metrics = []
    
    # Métricas de linhas
    safe_metrics.append({
        "id": "total_registros",
        "label": "Total de Registros",
        "field": None,
        "operation": "count",
        "value": int(len(df_norm)),
        "format": "number"
    })
    
    # Métricas por coluna numérica/monetária
    for col in profile["currency_columns"] + profile["numeric_columns"]:
        if not pd.api.types.is_numeric_dtype(df_norm[col]):
            continue
            
        col_id = re.sub(r"[^\w]", "_", col.lower())
        is_currency = col in profile["currency_columns"]
        fmt = "currency" if is_currency else "number"
        
        # Total
        total_val = float(df_norm[col].sum())
        safe_metrics.append({
            "id": f"{col_id}_total",
            "label": f"Total de {col}",
            "field": col,
            "operation": "sum",
            "value": round(total_val, 2),
            "format": fmt
        })
        
        # Média
        mean_val = float(df_norm[col].mean())
        safe_metrics.append({
            "id": f"{col_id}_media",
            "label": f"Média de {col}",
            "field": col,
            "operation": "avg",
            "value": round(mean_val, 2),
            "format": fmt
        })
    
    # Métricas derivadas (financeiras)
    if detected_template == "financeiro":
        safe_metrics.extend(_calculate_financial_derived_metrics(df_norm, profile))
    
    # Métricas de categorias (únicos)
    for col in profile["categorical_columns"][:3]:
        col_id = re.sub(r"[^\w]", "_", col.lower())
        unique_count = int(df_norm[col].nunique())
        safe_metrics.append({
            "id": f"{col_id}_unicos",
            "label": f"Total de {col} Únicos",
            "field": col,
            "operation": "distinct",
            "value": unique_count,
            "format": "number"
        })
    
    # ========== 4. PRECOMPUTED VIEWS (dados prontos para gráficos) ==========
    precomputed_views = {}
    
    # Rankings por categoria (top 10)
    for cat_col in profile["categorical_columns"][:2]:
        for num_col in (profile["currency_columns"] + profile["numeric_columns"])[:2]:
            if not pd.api.types.is_numeric_dtype(df_norm[num_col]):
                continue
            view_id = f"ranking_{safe_id(cat_col)}_by_{safe_id(num_col)}"
            grouped = df_norm.groupby(cat_col, dropna=True)[num_col].sum().sort_values(ascending=False).head(10)
            precomputed_views[view_id] = [
                {cat_col: str(k), num_col: round(float(v), 2)}
                for k, v in grouped.items()
            ]
    
    # Série temporal (se houver datas)
    for date_col in profile["date_columns"][:1]:
        for num_col in (profile["currency_columns"] + profile["numeric_columns"])[:2]:
            if not pd.api.types.is_numeric_dtype(df_norm[num_col]):
                continue
            if not pd.api.types.is_datetime64_any_dtype(df_norm[date_col]):
                continue
            view_id = f"time_series_{safe_id(num_col)}"
            # Agrupa por mês
            df_temp = df_norm.copy()
            df_temp["_month"] = df_temp[date_col].dt.to_period("M").astype(str)
            grouped = df_temp.groupby("_month", dropna=True)[num_col].sum()
            precomputed_views[view_id] = [
                {"month": str(k), num_col: round(float(v), 2)}
                for k, v in grouped.items()
            ]
    
    # ========== 5. GROUPING CAPABILITIES (onde faz sentido agrupar) ==========
    grouping_capabilities = {
        "allowed_dimensions": profile["categorical_columns"],
        "allowed_metrics": profile["currency_columns"] + profile["numeric_columns"],
        "time_granularity": ["day", "month", "year"] if profile["date_columns"] else []
    }
    
    # ========== 6. SYSTEM HINTS (recomendações do Python para a IA) ==========
    observations = []
    recommended_charts = []
    avoid_charts = []
    
    # Recomendações baseadas nos dados
    if profile["date_columns"] and (profile["currency_columns"] or profile["numeric_columns"]):
        recommended_charts.append("line")
        observations.append("Dados temporais detectados - gráfico de linha recomendado")
    
    if profile["categorical_columns"] and (profile["currency_columns"] or profile["numeric_columns"]):
        recommended_charts.append("bar")
        observations.append("Categorias com valores numéricos - gráfico de barras recomendado")
    
    # Evitar pizza se muitas categorias
    for cat_col in profile["categorical_columns"]:
        if df_norm[cat_col].nunique() > 8:
            avoid_charts.append("pie")
            observations.append(f"Muitas categorias em '{cat_col}' - evitar gráfico de pizza")
            break
    
    # Concentração de valores
    for num_col in profile["currency_columns"][:1]:
        if pd.api.types.is_numeric_dtype(df_norm[num_col]):
            top3_share = df_norm[num_col].nlargest(3).sum() / df_norm[num_col].sum() if df_norm[num_col].sum() > 0 else 0
            if top3_share > 0.5:
                observations.append(f"Alta concentração em '{num_col}': top 3 representam {top3_share*100:.0f}% do total")
    
    system_hints = {
        "recommended_charts": list(set(recommended_charts)),
        "avoid_charts": list(set(avoid_charts)),
        "observations": observations
    }
    
    # ========== SNAPSHOT FINAL ==========
    return {
        "dataset": dataset,
        "profile": profile,
        "safe_metrics": safe_metrics,
        "precomputed_views": precomputed_views,
        "grouping_capabilities": grouping_capabilities,
        "system_hints": system_hints,
        "generated_at": datetime.utcnow().isoformat() + "Z"
    }


def _detect_template(df: pd.DataFrame, col_types: Dict[str, str]) -> str:
    """Detecta automaticamente o template baseado nas colunas."""
    cols_lower = [c.lower() for c in df.columns]
    
    # Financeiro: receita, custo, lucro, margem
    financial_keywords = ["receita", "custo", "lucro", "margem", "despesa", "faturamento", "revenue", "cost", "profit"]
    if any(any(kw in col for kw in financial_keywords) for col in cols_lower):
        return "financeiro"
    
    # Vendas: cliente, produto, venda, pedido
    sales_keywords = ["cliente", "produto", "venda", "pedido", "order", "customer", "product", "sales"]
    if any(any(kw in col for kw in sales_keywords) for col in cols_lower):
        return "vendas"
    
    # Estoque: estoque, quantidade, sku, inventário
    stock_keywords = ["estoque", "inventario", "sku", "stock", "inventory", "armazem"]
    if any(any(kw in col for kw in stock_keywords) for col in cols_lower):
        return "estoque"
    
    # Operacional: status, tarefa, projeto, prazo
    ops_keywords = ["status", "tarefa", "projeto", "prazo", "task", "project", "deadline"]
    if any(any(kw in col for kw in ops_keywords) for col in cols_lower):
        return "operacional"
    
    return "custom"


def _calculate_confidence(df: pd.DataFrame, col_types: Dict[str, str]) -> str:
    """Calcula nível de confiança do dataset."""
    score = 0
    
    # Tem colunas numéricas? +1
    if any(t in ["currency", "number"] for t in col_types.values()):
        score += 1
    
    # Tem mais de 10 linhas? +1
    if len(df) >= 10:
        score += 1
    
    # Tem categorias bem definidas? +1
    if any(t == "category" for t in col_types.values()):
        score += 1
    
    # Poucos valores nulos? +1
    null_ratio = df.isnull().sum().sum() / (len(df) * len(df.columns)) if len(df) > 0 else 1
    if null_ratio < 0.1:
        score += 1
    
    if score >= 3:
        return "high"
    elif score >= 2:
        return "medium"
    else:
        return "low"


def _calculate_financial_derived_metrics(df: pd.DataFrame, profile: Dict) -> List[Dict[str, Any]]:
    """Calcula métricas derivadas para template financeiro."""
    derived = []
    
    revenue_cols = [c for c in profile["currency_columns"] if re.search(r"(receita|faturamento|revenue|vendas)", c.lower())]
    cost_cols = [c for c in profile["currency_columns"] if re.search(r"(custo|despesa|cost|expense)", c.lower())]
    
    if revenue_cols and cost_cols:
        rev_col = revenue_cols[0]
        cost_col = cost_cols[0]
        
        if pd.api.types.is_numeric_dtype(df[rev_col]) and pd.api.types.is_numeric_dtype(df[cost_col]):
            total_revenue = float(df[rev_col].sum())
            total_cost = float(df[cost_col].sum())
            gross_profit = total_revenue - total_cost
            margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
            
            derived.append({
                "id": "lucro_bruto",
                "label": "Lucro Bruto",
                "operation": "derived",
                "formula": f"{rev_col} - {cost_col}",
                "value": round(gross_profit, 2),
                "format": "currency"
            })
            
            derived.append({
                "id": "margem_bruta",
                "label": "Margem Bruta",
                "operation": "derived",
                "formula": f"({rev_col} - {cost_col}) / {rev_col}",
                "value": round(margin, 2),
                "format": "percentage"
            })
    
    return derived


# ============================================================
# 8️⃣ FUNÇÕES AUXILIARES
# ============================================================

def format_currency_br(value: float) -> str:
    """Formata número como moeda brasileira."""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_number_br(value: float) -> str:
    """Formata número no padrão brasileiro."""
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


if __name__ == "__main__":
    # Exemplo de uso
    print("=" * 50)
    print("Motor de Métricas - Data Clarity")
    print("=" * 50)
    
    # Cria dados de exemplo
    sample_data = [
        {"Produto": "A", "Receita": "1.234,56", "Quantidade": 10, "Status": "Vendido"},
        {"Produto": "B", "Receita": "2.345,67", "Quantidade": 20, "Status": "Vendido"},
        {"Produto": "C", "Receita": "3.456,78", "Quantidade": 15, "Status": "Pendente"},
        {"Produto": "A", "Receita": "1.111,11", "Quantidade": 5, "Status": "Vendido"},
    ]
    
    df = load_from_data(sample_data)
    print("\n📊 DataFrame Original:")
    print(df)
    
    response = build_response(df)
    
    print("\n📈 Resposta JSON:")
    import json
    print(json.dumps(response, indent=2, ensure_ascii=False, default=str))
