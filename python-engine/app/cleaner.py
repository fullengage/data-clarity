"""
Cleaner - Módulo cirúrgico para limpeza de planilhas
Funções:
1. Remove linhas nulas do topo
2. Remove imagens/logos
3. Remove anotações de rodapé
"""
import pandas as pd
from openpyxl import load_workbook
from openpyxl.drawing.image import Image
from io import BytesIO
from typing import Dict


def remove_top_empty_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove linhas vazias do topo da planilha.
    Mantém apenas as linhas a partir da primeira linha com dados.
    """
    if df.empty:
        return df
    
    # Encontra a primeira linha não vazia
    for idx in range(len(df)):
        row = df.iloc[idx]
        # Verifica se a linha tem pelo menos um valor não nulo
        if row.notna().any():
            # Retorna o DataFrame a partir desta linha
            return df.iloc[idx:].reset_index(drop=True)
    
    # Se todas as linhas estão vazias, retorna DataFrame vazio
    return pd.DataFrame()


def remove_footer_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove anotações de rodapé (últimas linhas esparsas ou com padrões de observação).
    
    Critérios de rodapé:
    - Linhas que começam com "Obs:", "Nota:", "Observação:", etc.
    - Linhas no final que correspondem a padrões de observação/rodapé
    """
    if df.empty or len(df) < 3:
        return df
    
    # Procura de baixo para cima por linhas de rodapé
    cutoff_idx = len(df)
    
    # Verifica as últimas 15 linhas
    check_range = min(15, len(df))
    
    for i in range(len(df) - 1, max(0, len(df) - check_range - 1), -1):
        row = df.iloc[i]
        
        # Verifica se começa com padrão de observação
        first_value = None
        for val in row:
            if pd.notna(val) and str(val).strip():
                first_value = str(val).strip().lower()
                break
        
        if first_value:
            footer_patterns = [
                'obs:', 'obs.', 'observação:', 'observacao:',
                'nota:', 'notas:', 'atenção:', 'atencao:',
                'importante:', 'legenda:', '*', 'fonte:',
                'elaborado', 'gerado', 'atualizado'
            ]
            
            if any(first_value.startswith(pattern) for pattern in footer_patterns):
                cutoff_idx = i
                continue
        
        # Não corta apenas por baixa taxa de preenchimento, pois datasets esparsos
        # (ex: poucas colunas preenchidas por linha) são válidos.
        # Se chegou aqui e a linha não parece rodapé, para de cortar.
        break
    
    return df.iloc[:cutoff_idx].reset_index(drop=True)


def remove_empty_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove colunas completamente vazias ou com mais de 98% de valores nulos.
    """
    if df.empty:
        return df
    
    # Calcula porcentagem de valores não nulos por coluna
    cols_to_keep = []
    for col in df.columns:
        non_null_pct = df[col].notna().sum() / len(df)
        # Mantém coluna se tiver pelo menos 2% de dados
        if non_null_pct > 0.02:
            cols_to_keep.append(col)
    
    # Se nenhuma coluna passou no teste, mantém todas
    if not cols_to_keep:
        return df
    
    return df[cols_to_keep].reset_index(drop=True)


def remove_title_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove linhas de título/seção que aparecem antes dos dados reais.
    
    LÓGICA CONSERVADORA:
    - Remove apenas se CLARAMENTE é um título (contém palavras-chave E baixo preenchimento)
    - NÃO remove cabeçalhos normais de tabela
    
    Características de linhas de título (todas devem ser verdadeiras):
    1. Apenas 1 célula preenchida (título centralizado)
    2. Contém palavras como "QUADRO", "RESUMO", "RELATÓRIO", etc.
    """
    if df.empty or len(df) < 2:
        return df
    
    rows_to_skip = []
    
    # Analisa as primeiras 10 linhas para identificar títulos óbvios
    for idx in range(min(10, len(df))):
        row = df.iloc[idx]
        
        # Conta células preenchidas
        filled_count = row.notna().sum()
        
        # Só considera como título se tiver EXATAMENTE 1 ou 2 células preenchidas
        # (títulos geralmente são centralizados ou têm poucas células)
        if filled_count <= 2 and filled_count > 0:
            # Pega o texto
            text_content = ' '.join([str(v).upper() for v in row if pd.notna(v)]).strip()
            
            # Palavras-chave de título MUITO específicas
            title_keywords = [
                'QUADRO RESUMO', 'RELATÓRIO', 'RELATORIO',
                'TABELA DE', 'PLANILHA DE', 'LISTAGEM DE',
                'LEVANTAMENTO DE'
            ]
            
            # Se contém palavra-chave de título, marca para remover
            if any(keyword in text_content for keyword in title_keywords):
                rows_to_skip.append(idx)
                continue
        
        # Se a linha tem boa taxa de preenchimento (>= 3 células),
        # assume que chegou no cabeçalho real ou dados - para de procurar
        if filled_count >= 3:
            break
    
    # Remove apenas as linhas marcadas como título
    if rows_to_skip:
        # Pega apenas as linhas que NÃO são títulos
        mask = ~df.index.isin(rows_to_skip)
        return df[mask].reset_index(drop=True)
    
    return df


def remove_images_from_excel(file_content: bytes) -> bytes:
    """
    Remove todas as imagens/logos de um arquivo Excel.
    Retorna o arquivo Excel modificado como bytes.
    """
    try:
        # Carrega o workbook
        wb = load_workbook(BytesIO(file_content))
        
        # Para cada worksheet
        for ws in wb.worksheets:
            # Remove todas as imagens
            # _images é uma lista interna do openpyxl que guarda as imagens
            if hasattr(ws, '_images'):
                ws._images = []
            
            # Remove desenhos (drawings)
            if hasattr(ws, '_drawings'):
                ws._drawings = []
            
            # Remove charts se houver
            if hasattr(ws, '_charts'):
                ws._charts = []
        
        # Salva o workbook modificado em memória
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output.read()
    
    except Exception as e:
        # Se der erro, retorna o conteúdo original
        print(f"Aviso: Não foi possível remover imagens: {e}")
        return file_content


def clean_spreadsheet(file, filename: str = "") -> Dict[str, pd.DataFrame]:
    """
    Função principal: limpa a planilha completamente.
    
    Passos (em ordem otimizada):
    1. Remove imagens/logos (apenas para Excel)
    2. Lê a planilha
    3. Remove linhas vazias do topo
    4. Remove linhas de título/seção (ex: "QUADRO RESUMO")
    5. Remove colunas completamente vazias
    6. Remove rodapés
    
    Retorna: Dicionário com DataFrames limpos por sheet.
    """
    # Lê o conteúdo do arquivo
    content = file.file.read()
    
    # Se for Excel, remove imagens primeiro
    is_excel = filename.lower().endswith(('.xlsx', '.xls'))
    if is_excel:
        content = remove_images_from_excel(content)
    
    # Agora lê a planilha limpa
    if filename.lower().endswith('.csv'):
        df = pd.read_csv(BytesIO(content), header=None, low_memory=False)
        sheets = {"CSV": df}
    else:
        sheets = pd.read_excel(BytesIO(content), sheet_name=None, header=None, engine='openpyxl')
    
    # Limpa cada sheet
    cleaned_sheets = {}
    for sheet_name, df in sheets.items():
        print(f"\n🧹 Limpando sheet '{sheet_name}'...")
        print(f"   Linhas originais: {len(df)}")
        print(f"   Colunas originais: {len(df.columns)}")
        
        # 1. Remove linhas vazias do topo
        df = remove_top_empty_rows(df)
        print(f"   Após remover linhas vazias do topo: {len(df)} linhas")
        
        # 2. Remove linhas de título (QUADRO RESUMO, etc.)
        df = remove_title_rows(df)
        print(f"   Após remover títulos: {len(df)} linhas")
        
        # 3. Remove colunas vazias
        df = remove_empty_columns(df)
        print(f"   Após remover colunas vazias: {len(df.columns)} colunas")
        
        # 4. Remove rodapés
        df = remove_footer_rows(df)
        print(f"   Após remover rodapés: {len(df)} linhas")
        
        print(f"   ✅ Resultado final: {len(df)} linhas x {len(df.columns)} colunas\n")
        
        cleaned_sheets[sheet_name] = df
    
    return cleaned_sheets

