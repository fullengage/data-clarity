# 🧠 Motor de Métricas - Data Clarity

## Conceito Principal

> **pandas = camada de verdade matemática**
>
> A IA **interpreta** → O pandas **CALCULA**
>
> A IA **nunca** soma, média ou compara valores diretamente.
> Quem faz isso é o **pandas**.

---

## 📦 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `app/metrics_engine.py` | Motor principal de cálculos |
| `test_metrics_engine.py` | Suite de testes |

---

## 🚀 Endpoints da API

### 1. `/calculate-metrics` (POST)
Calcula métricas matemáticas **reais** a partir do arquivo.

```bash
curl -X POST http://localhost:8000/calculate-metrics \
  -F "file=@planilha.xlsx" \
  -F "financial=true"
```

**Resposta:**
```json
{
  "status": "success",
  "metrics": {
    "linhas": 100,
    "receita_total": 150000.00,
    "receita_media": 1500.00,
    "ticket_medio": 1500.00,
    "faturamento_total": 150000.00
  },
  "column_types": {
    "Produto": "category",
    "Receita": "currency",
    "Quantidade": "number"
  }
}
```

### 2. `/chart-data` (POST)
Gera dados agregados para gráficos.

```bash
curl -X POST http://localhost:8000/chart-data \
  -F "file=@planilha.xlsx" \
  -F "x=Produto" \
  -F "y=Receita" \
  -F "agg=sum"
```

**Resposta:**
```json
{
  "status": "success",
  "data": [
    {"name": "Notebook", "value": 22500.00},
    {"name": "Mouse", "value": 2500.00},
    {"name": "Teclado", "value": 3000.00}
  ]
}
```

### 3. `/build-dashboard` (POST)
Gera resposta completa para dashboard.

```bash
curl -X POST http://localhost:8000/build-dashboard \
  -F "file=@planilha.xlsx"
```

**Resposta:**
```json
{
  "status": "success",
  "metrics": { ... },
  "charts": {
    "receita_por_produto": [...],
    "quantidade_por_status": [...]
  },
  "preview": [...],
  "suggestions": [...]
}
```

### 4. `/chart-suggestions` (POST)
Sugere gráficos baseados nas colunas disponíveis.

---

## 🧩 Arquitetura Correta

```
Upload do arquivo
       ↓
pandas (leitura + limpeza + cálculos)
       ↓
JSON estruturado e confiável
       ↓
IA (explicação, insights, títulos)
       ↓
Dashboard (React)
```

---

## 🔧 Uso Programático

```python
from app.metrics_engine import (
    load_from_data,
    normalize_dataframe,
    calculate_metrics,
    group_for_chart,
    build_response
)

# 1. Carrega dados
data = [
    {"Produto": "A", "Receita": "1.234,56", "Quantidade": 10},
    {"Produto": "B", "Receita": "2.345,67", "Quantidade": 20},
]

df = load_from_data(data)

# 2. Normaliza (converte números brasileiros)
df = normalize_dataframe(df)

# 3. Calcula métricas
metrics = calculate_metrics(df)
print(metrics)
# {"linhas": 2, "receita_total": 3580.23, "receita_media": 1790.11, ...}

# 4. Gera dados para gráfico
chart = group_for_chart(df, "Produto", "Receita", "sum")
print(chart)
# [{"name": "A", "value": 1234.56}, {"name": "B", "value": 2345.67}]

# 5. Resposta completa
response = build_response(df)
# Pronto para o frontend!
```

---

## ✅ Funcionalidades do Motor

### Normalização Automática
- ✔️ Converte números brasileiros (`1.234,56` → `1234.56`)
- ✔️ Remove símbolos (`R$`, `$`, etc.)
- ✔️ Não destrói texto
- ✔️ Não inventa valores

### Detecção de Tipos
- 📆 `date` - Datas e períodos
- 💰 `currency` - Valores monetários
- 🔢 `number` - Quantidades e números
- 📂 `category` - Categorias e status
- 📝 `text` - Texto livre

### Métricas Calculadas
- ✅ `{coluna}_total` - Soma
- ✅ `{coluna}_media` - Média
- ✅ `{coluna}_max` - Máximo
- ✅ `{coluna}_min` - Mínimo
- ✅ `{coluna}_unicos` - Valores únicos
- ✅ `faturamento_total` - Para colunas de receita
- ✅ `ticket_medio` - Média de receita
- ✅ `lucro_bruto` - Receita - Custo
- ✅ `margem_bruta` - (Lucro / Receita) × 100

### Agregações para Gráficos
- `sum` - Soma
- `avg` / `mean` - Média
- `count` - Contagem
- `min` - Mínimo
- `max` - Máximo

---

## 🎯 Impacto no Produto

### Antes
❌ IA confusa
❌ Números inventados
❌ Dashboards frágeis

### Depois
✅ Números matematicamente corretos
✅ IA só explica e interpreta
✅ Dashboards confiáveis
✅ Usuário confia no sistema

---

## 📋 Próximos Passos

1. ✅ Motor implementado e testado
2. ✅ API rodando com novos endpoints
3. 🔄 Integrar com frontend React
4. 🔄 Conectar com webhook N8N
5. 🔄 Templates prontos: vendas, estoque, financeiro

---

## 🧪 Executar Testes

```bash
cd python-engine
python test_metrics_engine.py
```

**Resultado esperado:**
```
🏆 Resultado: 5/5 testes passaram
```

---

*Versão: 2.1 | Última atualização: 2026-01-01*
