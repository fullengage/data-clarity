"""
Normalizer - Normaliza blocos detectados para resposta da API.
"""


def normalize_blocks(detected_blocks: dict) -> list:
    """
    Normaliza blocos detectados para formato de resposta.
    
    Retorna lista de sheets com seus datasets (metadados apenas).
    """
    normalized = []

    for sheet, blocks in detected_blocks.items():
        sheet_entry = {
            "name": sheet,
            "datasets": [],
        }

        for i, block in enumerate(blocks):
            rows = block.get("rows", [])
            if not rows:
                continue

            columns = [str(c) for c in block.get("columns", [])]

            dataset = {
                "id": f"{sheet}_block_{i+1}",
                "block_index": i,
                "rows": len(rows),
                "columns": columns,
                "header_span": block.get("header_span", 1),
                "removed_totals": block.get("removed_totals", 0),
            }

            sheet_entry["datasets"].append(dataset)

        if sheet_entry["datasets"]:
            normalized.append(sheet_entry)

    return normalized
