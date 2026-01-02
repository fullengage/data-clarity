"""
Teste específico para o problema do QUADRO RESUMO
"""
import pandas as pd
from app.cleaner import clean_spreadsheet
from io import BytesIO


class FakeFile:
    """Simula um arquivo de upload"""
    def __init__(self, content):
        self.file = BytesIO(content)
        self.filename = "teste_quadro_resumo.xlsx"


def criar_planilha_problema():
    """
    Cria uma planilha simulando o problema mostrado na imagem:
    - Colunas vazias no início
    - Título "QUADRO RESUMO - UTENSÍLIOS E MATERIAIS..."
    - Dados tabulares
    """
    
    data = pd.DataFrame([
        [None, None, 'QUADRO RESUMO - UTENSÍLIOS E MATERIAIS DE CONSUMO', None, None],
        [None, None, None, None, None],
        [None, None, None, None, None],
        ['UTENSÍLIOS', None, None, None, None],
        [None, None, None, None, None],
        ['ITEM', 'DESCRIÇÃO DETALHADA', None, None, None],
        ['1', 'COPOS DE ÁGUA DE VIDRO TRANSPARENTE - 300ML', None, None, None],
        ['2', 'GARRAFA TÉRMICA DE AÇO INOXIDÁVEL, COM SISTEMA DE PRESSÃO - 1,8/1,9 LITRO', None, None, None],
        ['3', 'PORTA COPO OU DESCANSO DE COPOS DE AÇO INOXIDÁVEL (BASE PARA COPOS) - CONJUNTO C/ 6', None, None, None],
        ['4', 'CAFETEIRA ELÉTRICA INDUSTRIAL - 6 LITROS', None, None, None],
        [None, None, None, None, None],
        ['Obs: Lista de utensílios para escritório', None, None, None, None],
    ])
    
    # Salva em BytesIO
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        data.to_excel(writer, sheet_name='Sheet1', index=False, header=False)
    
    output.seek(0)
    return output.read()


def main():
    print("\n" + "="*80)
    print("🔍 TESTE: Limpeza de planilha com QUADRO RESUMO")
    print("="*80 + "\n")
    
    # Cria planilha problemática
    content = criar_planilha_problema()
    fake_file = FakeFile(content)
    
    print("📋 PLANILHA ORIGINAL (com problemas):")
    print("-" * 80)
    print("   ❌ Colunas vazias no início")
    print("   ❌ Título: 'QUADRO RESUMO - UTENSÍLIOS E MATERIAIS...'")
    print("   ❌ Linha 'UTENSÍLIOS' (subtítulo)")
    print("   ❌ Rodapé: 'Obs: Lista de utensílios...'")
    print()
    
    # Aplica limpeza
    print("🧹 APLICANDO LIMPEZA AUTOMÁTICA...")
    print("="*80)
    
    cleaned_sheets = clean_spreadsheet(fake_file, "teste_quadro_resumo.xlsx")
    
    print("="*80)
    
    # Mostra resultado
    for sheet_name, df in cleaned_sheets.items():
        print(f"\n✨ RESULTADO FINAL para '{sheet_name}':")
        print("="*80)
        
        if df.empty:
            print("   ⚠️ DataFrame vazio após limpeza")
        else:
            print(df.to_string(index=False))
            
            print(f"\n📊 ESTATÍSTICAS:")
            print(f"   ✅ Total de linhas: {len(df)}")
            print(f"   ✅ Total de colunas: {len(df.columns)}")
            
            # Verifica se limpou corretamente
            print(f"\n🔍 VERIFICAÇÃO:")
            
            # Verifica se removeu o título "QUADRO RESUMO"
            has_quadro = any('QUADRO' in str(val).upper() for row in df.values for val in row if pd.notna(val))
            if has_quadro:
                print("   ❌ ERRO: Ainda contém 'QUADRO RESUMO'")
            else:
                print("   ✅ Título 'QUADRO RESUMO' removido")
            
            # Verifica se removeu o rodapé
            has_obs = any('OBS:' in str(val).upper() for row in df.values for val in row if pd.notna(val))
            if has_obs:
                print("   ❌ ERRO: Ainda contém rodapé 'Obs:'")
            else:
                print("   ✅ Rodapé 'Obs:' removido")
            
            # Verifica primeira linha (deve ser o cabeçalho)
            first_row = [str(v) for v in df.iloc[0] if pd.notna(v)]
            print(f"   📌 Primeira linha: {first_row}")
            
            if 'ITEM' in str(df.iloc[0, 0]).upper():
                print("   ✅ Cabeçalho correto detectado (ITEM, DESCRIÇÃO)")
            else:
                print(f"   ⚠️ Primeira célula: '{df.iloc[0, 0]}'")
    
    print("\n" + "="*80)
    print("✅ TESTE CONCLUÍDO!")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
