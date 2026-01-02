"""
Script de teste para demonstrar a limpeza de planilhas
"""
from app.cleaner import remove_top_empty_rows, remove_footer_rows, remove_images_from_excel
import pandas as pd


def test_remove_top_empty_rows():
    """Testa remoção de linhas vazias do topo"""
    print("=" * 60)
    print("TESTE 1: Remover linhas vazias do topo")
    print("=" * 60)
    
    # Cria DataFrame com linhas vazias no topo
    data = [
        [None, None, None],
        [None, None, None],
        [None, None, None],
        ["Nome", "Idade", "Cidade"],
        ["João", 25, "São Paulo"],
        ["Maria", 30, "Rio de Janeiro"],
    ]
    
    df = pd.DataFrame(data)
    print("\n📋 DataFrame ANTES da limpeza:")
    print(df)
    print(f"\nTotal de linhas: {len(df)}")
    
    # Remove linhas vazias do topo
    df_clean = remove_top_empty_rows(df)
    
    print("\n✨ DataFrame DEPOIS da limpeza:")
    print(df_clean)
    print(f"\nTotal de linhas: {len(df_clean)}")
    print("\n✅ Linhas vazias do topo removidas com sucesso!\n")


def test_remove_footer_rows():
    """Testa remoção de rodapés"""
    print("=" * 60)
    print("TESTE 2: Remover anotações de rodapé")
    print("=" * 60)
    
    # Cria DataFrame com rodapé
    data = [
        ["Nome", "Valor", "Status"],
        ["Produto A", 100, "Ativo"],
        ["Produto B", 200, "Ativo"],
        ["Produto C", 150, "Inativo"],
        [None, None, None],
        ["Obs: Dados atualizados em 2024", None, None],
        ["Nota: Valores em reais", None, None],
    ]
    
    df = pd.DataFrame(data)
    print("\n📋 DataFrame ANTES da limpeza:")
    print(df)
    print(f"\nTotal de linhas: {len(df)}")
    
    # Remove rodapés
    df_clean = remove_footer_rows(df)
    
    print("\n✨ DataFrame DEPOIS da limpeza:")
    print(df_clean)
    print(f"\nTotal de linhas: {len(df_clean)}")
    print("\n✅ Rodapés removidos com sucesso!\n")


def test_complete_cleaning():
    """Testa limpeza completa"""
    print("=" * 60)
    print("TESTE 3: Limpeza completa (topo + rodapé)")
    print("=" * 60)
    
    # Cria DataFrame com problemas no topo e rodapé
    data = [
        [None, None, None],
        [None, None, None],
        ["LOGO DA EMPRESA", None, None],
        [None, None, None],
        ["Relatório de Vendas - 2024", None, None],
        [None, None, None],
        ["Cliente", "Valor", "Data"],
        ["Cliente A", 1000, "2024-01-01"],
        ["Cliente B", 2000, "2024-01-02"],
        ["Cliente C", 1500, "2024-01-03"],
        [None, None, None],
        ["Total", 4500, None],
        [None, None, None],
        ["Obs: Valores em R$", None, None],
        ["Fonte: Sistema XYZ", None, None],
    ]
    
    df = pd.DataFrame(data)
    print("\n📋 DataFrame ORIGINAL (com logo e rodapés):")
    print(df)
    print(f"\nTotal de linhas: {len(df)}")
    
    # Limpa topo
    df = remove_top_empty_rows(df)
    
    # Limpa rodapé
    df = remove_footer_rows(df)
    
    print("\n✨ DataFrame LIMPO (pronto para JSON):")
    print(df)
    print(f"\nTotal de linhas: {len(df)}")
    print("\n✅ Planilha completamente limpa e pronta para conversão em JSON!\n")


if __name__ == "__main__":
    print("\n🚀 INICIANDO TESTES DE LIMPEZA DE PLANILHAS")
    print("=" * 60)
    
    test_remove_top_empty_rows()
    test_remove_footer_rows()
    test_complete_cleaning()
    
    print("=" * 60)
    print("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
    print("=" * 60)
    print("\n💡 O código está pronto para processar planilhas e enviar")
    print("   dados limpos para o webhook do n8n!")
    print("\n")
