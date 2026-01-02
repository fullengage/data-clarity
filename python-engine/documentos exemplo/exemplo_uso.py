"""
Exemplo de uso do cleaner com arquivo Excel real
"""
import pandas as pd
from app.cleaner import clean_spreadsheet
import json
from io import BytesIO


class FakeFile:
    """Simula um arquivo de upload para testar"""
    def __init__(self, content):
        self.file = BytesIO(content)
        self.filename = "exemplo.xlsx"


def criar_planilha_exemplo():
    """Cria uma planilha Excel de exemplo com problemas comuns"""
    
    # Cria uma planilha com:
    # - Linhas vazias no topo
    # - Dados reais
    # - Rodapés com observações
    
    data = {
        'Sheet1': pd.DataFrame([
            [None, None, None, None],
            [None, None, None, None],
            ['LOGO EMPRESA', None, None, None],
            [None, None, None, None],
            ['Relatório de Vendas - 2024', None, None, None],
            [None, None, None, None],
            ['Cliente', 'Valor', 'Data', 'Status'],
            ['Cliente A', 1000.50, '2024-01-01', 'Pago'],
            ['Cliente B', 2000.00, '2024-01-02', 'Pendente'],
            ['Cliente C', 1500.75, '2024-01-03', 'Pago'],
            ['Cliente D', 3000.00, '2024-01-04', 'Pago'],
            [None, None, None, None],
            ['Total', 7501.25, None, None],
            [None, None, None, None],
            ['Obs: Valores em R$', None, None, None],
            ['Nota: Atualizado em 30/12/2024', None, None, None],
            ['Fonte: Sistema de Vendas', None, None, None],
        ])
    }
    
    # Salva em BytesIO
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        for sheet_name, df in data.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False, header=False)
    
    output.seek(0)
    return output.read()


def main():
    print("\n" + "="*70)
    print("🧹 DEMONSTRAÇÃO DE LIMPEZA DE PLANILHA")
    print("="*70 + "\n")
    
    # Cria planilha de exemplo
    print("📝 Criando planilha de exemplo com problemas comuns...")
    content = criar_planilha_exemplo()
    
    # Cria fake file
    fake_file = FakeFile(content)
    
    print("✅ Planilha criada!\n")
    print("📋 Problemas na planilha original:")
    print("   - Linhas vazias no topo")
    print("   - Logo da empresa")
    print("   - Título do relatório")
    print("   - Linha de total (rodapé)")
    print("   - Observações no final")
    print("   - Fonte e notas\n")
    
    # Aplica limpeza
    print("🧹 Aplicando limpeza automática...")
    cleaned_sheets = clean_spreadsheet(fake_file, "exemplo.xlsx")
    
    # Mostra resultados
    for sheet_name, df in cleaned_sheets.items():
        print(f"\n✨ Resultado para '{sheet_name}':")
        print("="*70)
        print(df)
        print(f"\n📊 Estatísticas:")
        print(f"   - Total de linhas: {len(df)}")
        print(f"   - Total de colunas: {len(df.columns)}")
        print(f"   - Primeira linha: {list(df.iloc[0]) if len(df) > 0 else 'N/A'}")
        
        # Converte para JSON (simulando o que vai para o N8N)
        print(f"\n🔗 Dados prontos para JSON (primeiras 3 linhas):")
        records = df.head(3).to_dict('records')
        print(json.dumps(records, indent=2, ensure_ascii=False, default=str))
    
    print("\n" + "="*70)
    print("✅ LIMPEZA CONCLUÍDA COM SUCESSO!")
    print("="*70)
    print("\n💡 Os dados agora estão limpos e prontos para:")
    print("   - Conversão em JSON")
    print("   - Envio para webhook do N8N")
    print("   - Processamento de BI/Analytics")
    print()


if __name__ == "__main__":
    main()
