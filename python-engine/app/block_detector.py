"""
Block Detector v2 - CORRIGIDO
Melhorias:
- Detecção mais flexível de cabeçalhos
- Melhor tratamento de células mescladas horizontalmente
- Detecção expandida de linhas de total
- Suporte a cabeçalhos em múltiplas linhas
"""
import re
from typing import Any, Optional

def _is_nan(value: Any) -> bool:
    try:
        return value != value
    except Exception:
        return False

def normalize_cell(value: Any) -> Optional[str]:
    """Normaliza uma célula para comparação."""
    if value is None:
        return None
    if _is_nan(value):
        return None
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        if s.lower() == "nan":
            return None
        if s == "#DIV/0!":
            return "0"
        if s == "-":
            return None
        return s
    if isinstance(value, (int, float)):
        return value
    return str(value).strip() or None

def is_numeric_like(value: Any) -> bool:
    """Verifica se o valor parece ser numérico."""
    v = normalize_cell(value)
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return True
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return False
        # Remove formatação monetária brasileira
        s2 = s.replace("R$", "").replace("$", "").strip()
        s2 = s2.replace(" ", "").replace(".", "").replace(",", ".")
        # Remove % no final
        s2 = s2.rstrip("%")
        try:
            float(s2)
            return True
        except Exception:
            return False
    return False

def _numeric_has_decimal(value: Any) -> bool:
    """Verifica se o número tem casas decimais."""
    v = normalize_cell(value)
    if v is None:
        return False
    if isinstance(v, float):
        return abs(v - int(v)) > 1e-9
    if isinstance(v, int):
        return False
    if isinstance(v, str) and is_numeric_like(v):
        return "." in v or "," in v
    return False

def is_text_like(value: Any) -> bool:
    """Verifica se o valor contém texto significativo."""
    v = normalize_cell(value)
    if v is None:
        return False
    if isinstance(v, str):
        # Texto de verdade (contém letras), não só número
        return bool(re.search(r"[A-Za-zÀ-ÿ]", v))
    return False

def is_date_like(value: Any) -> bool:
    """Verifica se parece uma data."""
    v = normalize_cell(value)
    if v is None:
        return False
    if isinstance(v, str):
        # Padrões comuns de data
        patterns = [
            r"^\d{2}/\d{2}/\d{2,4}$",  # DD/MM/YYYY
            r"^\d{4}-\d{2}-\d{2}",      # YYYY-MM-DD
            r"^\d{2}-\d{2}-\d{2,4}$",   # DD-MM-YYYY
            r"^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)",  # Mês por extenso
        ]
        for p in patterns:
            if re.search(p, v.lower()):
                return True
    return False

def non_empty_count(row: list[Any]) -> int:
    """Conta células não vazias na linha."""
    return sum(1 for v in row if normalize_cell(v) is not None)

def is_row_empty(row: list[Any]) -> bool:
    """Verifica se a linha está vazia."""
    return non_empty_count(row) == 0

def looks_like_total_row(row: list[Any]) -> bool:
    """
    Detecta linhas de total/subtotal.
    MELHORADO: mais padrões de detecção.
    """
    parts = []
    for v in row:
        n = normalize_cell(v)
        if n is None:
            continue
        parts.append(str(n))
    
    if not parts:
        return False

    # Concatena para buscar palavras-chave
    head = " ".join(parts).lower()
    
    # Padrões de total expandidos (português e inglês)
    total_patterns = [
        r"\btotal\b",
        r"\bsubtotal\b", 
        r"\btotais\b",
        r"\btotal\s+geral\b",
        r"\bgeral\b",
        r"\bsoma\b",
        r"\bsum\b",
        r"\bgrand\s+total\b",
        r"\b(total|soma)\s*(:|=)",
        r"^total[:\s]",
        r"\bmédia\b",
        r"\baverage\b",
    ]
    
    for pattern in total_patterns:
        if re.search(pattern, head, re.I):
            return True

    # Heurística: muitos números e pouco texto = provável total
    non_empty = len(parts)
    if non_empty < 2:
        return False
        
    numeric = sum(1 for p in parts if is_numeric_like(p))
    text = non_empty - numeric
    
    # Se tem >= 70% números e no máximo 1 texto, parece total
    return non_empty >= 3 and numeric / non_empty >= 0.7 and text <= 1

def header_score(row: list[Any]) -> float:
    """
    Calcula score de probabilidade de ser um cabeçalho.
    MELHORADO: mais tolerante com cabeçalhos mistos.
    """
    non_empty = non_empty_count(row)
    if non_empty < 2:
        return 0.0

    text = 0
    numeric = 0
    decimal = 0
    date = 0
    uniq = set()

    for v in row:
        n = normalize_cell(v)
        if n is None:
            continue
        s = str(n).strip().lower()
        uniq.add(s)
        
        if is_date_like(n):
            date += 1
        elif is_text_like(n):
            text += 1
        if is_numeric_like(n):
            numeric += 1
        if _numeric_has_decimal(n):
            decimal += 1

    unique_rate = len(uniq) / non_empty
    text_rate = text / non_empty
    numeric_rate = numeric / non_empty
    decimal_rate = decimal / non_empty
    date_rate = date / non_empty

    # Score base: texto é bom, números decimais são ruins para cabeçalho
    # Aumentamos o peso do texto e a penalidade de números
    score = text_rate * 1.8 + unique_rate * 0.7 - numeric_rate * 0.8 - decimal_rate * 2.5
    
    # Datas como cabeçalho (ex: meses) são ok, mas datas completas (DD/MM/YYYY) 
    # geralmente são dados. O is_date_like detecta ambos.
    if date_rate > 0.3:
        score += 0.2
    
    # Penaliza se parecer linha de dados (muitos decimais ou muitos números)
    if decimal_rate > 0.2:
        score -= 0.5
    if numeric_rate > 0.7:
        score -= 0.5
        
    return max(0.0, min(2.0, score))

def _propagate_merged_header(row: list[Any]) -> list[Any]:
    """
    Propaga valores de células mescladas horizontalmente no cabeçalho.
    Ex: ["Vendas", None, None, "Custos", None] -> ["Vendas", "Vendas", "Vendas", "Custos", "Custos"]
    """
    result = list(row)
    last_value = None
    
    for i, v in enumerate(result):
        n = normalize_cell(v)
        if n is not None:
            last_value = v
        elif last_value is not None:
            result[i] = last_value
    
    return result

def build_header(grid: list[list[Any]], header_row_index: int, span: int) -> list[str]:
    """
    Constrói o cabeçalho a partir de uma ou mais linhas.
    MELHORADO: propaga células mescladas horizontalmente.
    """
    row0 = _propagate_merged_header(grid[header_row_index] if header_row_index < len(grid) else [])
    row1 = _propagate_merged_header(grid[header_row_index + 1] if span >= 2 and header_row_index + 1 < len(grid) else [])
    row2 = _propagate_merged_header(grid[header_row_index + 2] if span >= 3 and header_row_index + 2 < len(grid) else [])
 
    max_cols = max(len(row0), len(row1), len(row2))
    headers: list[str] = []
 
    for c in range(max_cols):
        a = normalize_cell(row0[c] if c < len(row0) else None)
        b = normalize_cell(row1[c] if c < len(row1) else None)
        d = normalize_cell(row2[c] if c < len(row2) else None)
 
        parts = [a, b, d]
        parts = [str(x).strip() for x in parts if x is not None and str(x).strip()]
        
        # Remove duplicatas mantendo ordem
        name = " ".join(dict.fromkeys(parts))
        headers.append(name)

    # Garante nomes únicos
    seen: dict[str, int] = {}
    out: list[str] = []
    for idx, h in enumerate(headers):
        base = h.strip() if h and h.strip() else f"col_{idx + 1}"
        
        # Limpa caracteres problemáticos
        base = re.sub(r'[\n\r\t]+', ' ', base)
        base = re.sub(r'\s+', ' ', base).strip()
        
        key = base.lower()
        seen[key] = seen.get(key, 0) + 1
        out.append(base if seen[key] == 1 else f"{base}_{seen[key]}")
    
    return out

def find_next_header(grid: list[list[Any]], start_row: int) -> Optional[dict]:
    """
    Encontra o próximo cabeçalho a partir de uma linha.
    MELHORADO: threshold mais baixo (0.40) para detecção inicial.
    """
    scan_limit = min(len(grid), start_row + 300)
    best = None

    for r in range(start_row, scan_limit):
        row = grid[r] if r < len(grid) else []
        if is_row_empty(row):
            continue

        s0 = header_score(row)
        if s0 <= 0.40:
            continue

        span = 1
        s1 = header_score(grid[r + 1] if r + 1 < len(grid) else [])
        if s1 > 0.45:
            span = 2
 
        s2 = header_score(grid[r + 2] if r + 2 < len(grid) else [])
        if span == 2 and s2 > 0.45:
            span = 3
 
        score = s0 + (s1 * 0.3 if span >= 2 else 0) + (s2 * 0.15 if span == 3 else 0)
        if best is None or score > best["score"]:
            best = {"rowIndex": r, "span": span, "score": score}

    if best is None:
        return None
    return {"rowIndex": best["rowIndex"], "span": best["span"]}

def looks_like_section_title_row(row: list[Any]) -> bool:
    """Detecta linhas de título de seção (ex: 'MÓDULO 6 - ...')."""
    non_empty = [normalize_cell(v) for v in row if normalize_cell(v) is not None]
    if len(non_empty) == 0:
        return False
    if len(non_empty) > 2:
        return False
    first = normalize_cell(row[0] if len(row) > 0 else None)
    if not is_text_like(first):
        return False
    
    # Padrões de título de seção
    title_patterns = [
        r"^(módulo|modulo|seção|secao|parte|bloco)\s*\d",
        r"^[A-Z]{2,}\s*[-–]\s*",  # "VENDAS - ..."
    ]
    
    first_str = str(first).lower()
    for p in title_patterns:
        if re.search(p, first_str, re.I):
            return True
    
    # Se o restante estiver vazio ou quase vazio, é título
    rest = row[1:] if len(row) > 1 else []
    rest_non_empty = sum(1 for v in rest if normalize_cell(v) is not None)
    return rest_non_empty == 0

def detect_blocks(sheets: dict) -> dict:
    """
    Detecta blocos de dados em cada sheet.
    Retorna estrutura com columns e rows para cada bloco.
    """
    result = {}

    for sheet_name, df in sheets.items():
        grid = [list(r) for r in df.itertuples(index=False, name=None)]
        blocks = []

        cursor = 0
        while cursor < len(grid):
            # Pula linhas vazias
            while cursor < len(grid) and is_row_empty(grid[cursor]):
                cursor += 1
            if cursor >= len(grid):
                break

            header = find_next_header(grid, cursor)
            if not header:
                cursor += 1
                continue

            header_row_index = header["rowIndex"]
            header_span = header["span"]
            columns = build_header(grid, header_row_index, header_span)

            data_start = header_row_index + header_span
            while data_start < len(grid) and is_row_empty(grid[data_start]):
                data_start += 1

            data_end = data_start - 1
            r = data_start
            blank_skips = 0

            while r < len(grid):
                row = grid[r]

                # Linha de título/seção normalmente separa tabelas
                if looks_like_section_title_row(row) and r > data_start + 1:
                    data_end = r - 1
                    break

                if is_row_empty(row):
                    k = r
                    while k < len(grid) and is_row_empty(grid[k]):
                        k += 1
                    next_row = grid[k] if k < len(grid) else None
                    next_looks_header = header_score(next_row) > 0.65 if next_row is not None else False
                    blank_span = k - r

                    if (not next_looks_header) and blank_span <= 3 and blank_skips < 3:
                        blank_skips += 1
                        r = k
                        continue

                    data_end = r - 1
                    r = k
                    break

                potential_header = header_score(row)
                # Se apareceu algo que parece um novo cabeçalho MUITO FORTE, encerra o bloco atual
                # Aumentamos de 0.65 para 1.0 para evitar falsos positivos com dados
                if potential_header > 1.0 and r > data_start + 2:
                    data_end = r - 1
                    break

                data_end = r
                r += 1

            rows = []
            removed_totals = 0
            if data_end >= data_start:
                for rr in range(data_start, data_end + 1):
                    row = grid[rr]
                    if is_row_empty(row):
                        continue
                    if looks_like_total_row(row):
                        removed_totals += 1
                        continue

                    # Normaliza e corta no tamanho das colunas
                    cleaned = [normalize_cell(row[c] if c < len(row) else None) for c in range(len(columns))]
                    if non_empty_count(cleaned) > 0:
                        rows.append(cleaned)

            # Só adiciona bloco se tiver dados
            if rows:
                blocks.append({
                    "header_row": header_row_index,
                    "header_span": header_span,
                    "data_start": data_start,
                    "data_end": data_end,
                    "columns": columns,
                    "rows": rows,
                    "removed_totals": removed_totals,
                })

            cursor = max(r, data_end + 1)

        result[sheet_name] = blocks

    return result
