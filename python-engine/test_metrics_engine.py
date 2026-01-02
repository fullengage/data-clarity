"""
Teste do Motor de Métricas
==========================
Demonstra o funcionamento do metrics_engine.py
"""

import sys
import json
sys.path.insert(0, '.')

from app.metrics_engine import (
    load_from_data,
    normalize_dataframe,
    calculate_metrics,
    calculate_financial_metrics,
    group_for_chart,
    build_response,
    detect_column_types,
    format_currency_br
)


def test_basic_metrics():
    """Teste básico de métricas."""
    print("\n" + "="*60)
    print("🧪 TESTE 1: Métricas Básicas")
    print("="*60)
    
    # Dados de vendas simples
    data = [
        {"Produto": "Notebook", "Quantidade": 10, "Valor": "15.000,00", "Status": "Vendido"},
        {"Produto": "Mouse", "Quantidade": 50, "Valor": "2.500,00", "Status": "Vendido"},
        {"Produto": "Teclado", "Quantidade": 30, "Valor": "3.000,00", "Status": "Pendente"},
        {"Produto": "Monitor", "Quantidade": 15, "Valor": "9.000,00", "Status": "Vendido"},
        {"Produto": "Notebook", "Quantidade": 5, "Valor": "7.500,00", "Status": "Pendente"},
    ]
    
    df = load_from_data(data)
    print("\n📊 Dados originais:")
    print(df)
    
    df_norm = normalize_dataframe(df)
    print("\n📊 Dados normalizados:")
    print(df_norm)
    print("\nTipos de dados após normalização:")
    print(df_norm.dtypes)
    
    metrics = calculate_metrics(df_norm)
    print("\n📈 Métricas calculadas:")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    
    return True


def test_financial_metrics():
    """Teste de métricas financeiras."""
    print("\n" + "="*60)
    print("🧪 TESTE 2: Métricas Financeiras")
    print("="*60)
    
    data = [
        {"Mês": "Janeiro", "Receita": "50.000,00", "Custo": "30.000,00"},
        {"Mês": "Fevereiro", "Receita": "65.000,00", "Custo": "35.000,00"},
        {"Mês": "Março", "Receita": "80.000,00", "Custo": "45.000,00"},
        {"Mês": "Abril", "Receita": "72.000,00", "Custo": "40.000,00"},
    ]
    
    df = load_from_data(data)
    metrics = calculate_financial_metrics(df)
    
    print("\n💰 Métricas financeiras:")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    
    if "faturamento_total" in metrics:
        print(f"\n✅ Faturamento Total: {format_currency_br(metrics['faturamento_total'])}")
    if "lucro_bruto" in metrics:
        print(f"✅ Lucro Bruto: {format_currency_br(metrics['lucro_bruto'])}")
    if "margem_bruta" in metrics:
        print(f"✅ Margem Bruta: {metrics['margem_bruta']}%")
    
    return True


def test_chart_aggregation():
    """Teste de agregação para gráficos."""
    print("\n" + "="*60)
    print("🧪 TESTE 3: Agregação para Gráficos")
    print("="*60)
    
    data = [
        {"Categoria": "Eletrônicos", "Valor": "1.000,00"},
        {"Categoria": "Eletrônicos", "Valor": "2.000,00"},
        {"Categoria": "Móveis", "Valor": "5.000,00"},
        {"Categoria": "Móveis", "Valor": "3.000,00"},
        {"Categoria": "Roupas", "Valor": "800,00"},
        {"Categoria": "Roupas", "Valor": "1.200,00"},
    ]
    
    df = load_from_data(data)
    df_norm = normalize_dataframe(df)
    
    # Soma por categoria
    chart_sum = group_for_chart(df_norm, "Categoria", "Valor", "sum")
    print("\n📊 Soma por Categoria:")
    print(json.dumps(chart_sum, indent=2, ensure_ascii=False))
    
    # Média por categoria
    chart_avg = group_for_chart(df_norm, "Categoria", "Valor", "avg")
    print("\n📊 Média por Categoria:")
    print(json.dumps(chart_avg, indent=2, ensure_ascii=False))
    
    # Contagem por categoria
    chart_count = group_for_chart(df_norm, "Categoria", "Valor", "count")
    print("\n📊 Contagem por Categoria:")
    print(json.dumps(chart_count, indent=2, ensure_ascii=False))
    
    return True


def test_build_response():
    """Teste da resposta completa JSON."""
    print("\n" + "="*60)
    print("🧪 TESTE 4: Resposta Completa para Dashboard")
    print("="*60)
    
    data = [
        {"Cliente": "Empresa A", "Produto": "Software", "Receita": "10.000,00", "Qtd": 1},
        {"Cliente": "Empresa B", "Produto": "Consultoria", "Receita": "25.000,00", "Qtd": 3},
        {"Cliente": "Empresa A", "Produto": "Suporte", "Receita": "5.000,00", "Qtd": 12},
        {"Cliente": "Empresa C", "Produto": "Software", "Receita": "15.000,00", "Qtd": 2},
        {"Cliente": "Empresa B", "Produto": "Treinamento", "Receita": "8.000,00", "Qtd": 5},
    ]
    
    df = load_from_data(data)
    response = build_response(df)
    
    print("\n🎯 Resposta JSON completa:")
    # Limita preview para exibição
    response_display = response.copy()
    if "preview" in response_display and len(response_display["preview"]) > 3:
        response_display["preview"] = response_display["preview"][:3]
    
    print(json.dumps(response_display, indent=2, ensure_ascii=False, default=str))
    
    print("\n✅ Status:", response["status"])
    print("✅ Métricas geradas:", len(response.get("metrics", {})))
    print("✅ Gráficos gerados:", len(response.get("charts", {})))
    print("✅ Sugestões:", len(response.get("suggestions", [])))
    
    return True


def test_column_detection():
    """Teste de detecção de tipos de colunas."""
    print("\n" + "="*60)
    print("🧪 TESTE 5: Detecção de Tipos de Colunas")
    print("="*60)
    
    data = [
        {
            "Data": "2024-01-15",
            "Cliente": "João Silva",
            "Valor": "R$ 1.234,56",
            "Quantidade": 10,
            "Status": "Aprovado",
            "Descrição": "Compra de equipamentos para escritório"
        }
    ]
    
    df = load_from_data(data)
    types = detect_column_types(df)
    
    print("\n🔍 Tipos detectados:")
    for col, tipo in types.items():
        print(f"  • {col}: {tipo}")
    
    return True


def run_all_tests():
    """Executa todos os testes."""
    print("\n" + "#"*60)
    print("#  MOTOR DE MÉTRICAS - SUITE DE TESTES")
    print("#"*60)
    
    tests = [
        ("Métricas Básicas", test_basic_metrics),
        ("Métricas Financeiras", test_financial_metrics),
        ("Agregação para Gráficos", test_chart_aggregation),
        ("Resposta Completa", test_build_response),
        ("Detecção de Colunas", test_column_detection),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, "✅ PASSOU" if result else "❌ FALHOU"))
        except Exception as e:
            results.append((name, f"❌ ERRO: {e}"))
    
    print("\n" + "="*60)
    print("📋 RESUMO DOS TESTES")
    print("="*60)
    
    for name, result in results:
        print(f"  {result} - {name}")
    
    passed = sum(1 for _, r in results if "PASSOU" in r)
    total = len(results)
    print(f"\n🏆 Resultado: {passed}/{total} testes passaram")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
