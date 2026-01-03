# 🔧 Guia de Implementação Backend - Nova Arquitetura Dashboard

## 📋 Visão Geral

Este guia detalha como implementar os endpoints backend necessários para a nova arquitetura de dashboard do Data Clarity.

**Princípio fundamental**: O backend faz TODOS os cálculos. O frontend apenas renderiza.

## 🎯 Endpoints Necessários

### 1. GET /dashboard/:id

**Responsabilidade**: Retornar dashboard completo com todos os cards calculados.

**Fluxo**:
1. Buscar dados do dashboard no banco
2. Buscar dados brutos (tabela)
3. Calcular todos os cards
4. Calcular todos os gráficos
5. Detectar pontos de atenção
6. Retornar tudo estruturado

**Response**:
```python
{
    "success": True,
    "data": {
        "id": "dash-123",
        "title": "Dashboard de Vendas",
        "description": "Análise completa de vendas 2024",
        "status": {
            "status": "updated",  # updated | attention | partial | loading
            "lastUpdate": "2024-01-03T10:30:00Z",
            "message": "Dados atualizados com sucesso",
            "warnings": []
        },
        "cards": [
            # Lista de cards calculados
        ],
        "charts": [
            # Lista de gráficos calculados
        ],
        "alerts": [
            # Lista de alertas calculados
        ],
        "tableData": {
            "columns": ["Cliente", "Produto", "Valor"],
            "rows": [...],
            "totalRows": 1234
        },
        "metadata": {
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-03T10:30:00Z",
            "dataSource": "vendas_2024.xlsx",
            "rowCount": 1234,
            "columnCount": 15
        }
    }
}
```

### 2. POST /dashboard/:id/refresh

**Responsabilidade**: Recalcular todos os cards e métricas.

**Fluxo**:
1. Buscar dados mais recentes
2. Recalcular tudo
3. Atualizar cache
4. Retornar dashboard atualizado

**Response**: Mesmo formato do GET /dashboard/:id

### 3. POST /dashboard/chat

**Responsabilidade**: Processar mensagem do chat conversacional.

**IMPORTANTE**: A IA NÃO calcula nada. Apenas explica e orienta.

**Request**:
```python
{
    "dashboardId": "dash-123",
    "message": "Isso é bom ou ruim?",
    "context": {
        "dashboardId": "dash-123",
        "availableCards": [
            {"id": "metric-1", "type": "metric", "title": "Faturamento Total"}
        ],
        "currentMetrics": {
            "faturamento_total": 1245678.90,
            "variacao_mensal": 12.5
        },
        "recentAlerts": [
            "3 clientes com queda de 20% nas compras"
        ]
    },
    "conversationHistory": [
        {"role": "user", "content": "Olá", "timestamp": "..."},
        {"role": "assistant", "content": "Olá! Como posso ajudar?", "timestamp": "..."}
    ]
}
```

**Response**:
```python
{
    "success": True,
    "data": {
        "message": "Seu faturamento de R$ 1.245.678,90 está excelente! Você teve um crescimento de 12,5% em relação ao mês anterior, o que indica uma tendência positiva. No entanto, vale prestar atenção aos 3 clientes que tiveram queda de 20% nas compras - pode ser interessante entrar em contato com eles.",
        "suggestedQuestions": [
            "Quais clientes tiveram queda?",
            "Como está a tendência dos últimos meses?",
            "Qual produto mais vendeu?"
        ],
        "relatedCards": ["metric-1", "alert-1"]
    }
}
```

## 🧮 Funções de Cálculo de Cards

### Curva ABC

```python
def calculate_abc_curve(df, value_column, item_column):
    """
    Calcula a Curva ABC
    
    Regra:
    - Classe A: 80% do valor (top itens)
    - Classe B: 15% do valor (médios)
    - Classe C: 5% do valor (restantes)
    """
    # Agregar por item
    grouped = df.groupby(item_column)[value_column].sum().sort_values(ascending=False)
    total = grouped.sum()
    
    # Calcular percentual acumulado
    cumsum = grouped.cumsum()
    cumsum_pct = (cumsum / total) * 100
    
    # Classificar
    class_a = grouped[cumsum_pct <= 80]
    class_b = grouped[(cumsum_pct > 80) & (cumsum_pct <= 95)]
    class_c = grouped[cumsum_pct > 95]
    
    return {
        "type": "abc_curve",
        "id": f"abc_{item_column}",
        "title": f"Curva ABC - {item_column}",
        "data": {
            "classA": {
                "count": len(class_a),
                "percentage": (class_a.sum() / total) * 100,
                "value": float(class_a.sum())
            },
            "classB": {
                "count": len(class_b),
                "percentage": (class_b.sum() / total) * 100,
                "value": float(class_b.sum())
            },
            "classC": {
                "count": len(class_c),
                "percentage": (class_c.sum() / total) * 100,
                "value": float(class_c.sum())
            }
        },
        "insight": f"Apenas {len(class_a)} itens representam 80% do valor total."
    }
```

### Pareto

```python
def calculate_pareto(df, value_column, item_column):
    """
    Calcula análise de Pareto (80/20)
    """
    grouped = df.groupby(item_column)[value_column].sum().sort_values(ascending=False)
    total = grouped.sum()
    
    # Calcular acumulado
    cumsum = grouped.cumsum()
    cumsum_pct = (cumsum / total) * 100
    
    # Top 20%
    top_20_count = int(len(grouped) * 0.2)
    top_20 = grouped.head(top_20_count)
    top_20_percentage = (top_20.sum() / total) * 100
    
    # Preparar itens
    items = []
    for idx, (name, value) in enumerate(grouped.head(10).items()):
        items.append({
            "name": str(name),
            "value": float(value),
            "accumulated": float(cumsum_pct.iloc[idx])
        })
    
    return {
        "type": "pareto",
        "id": f"pareto_{item_column}",
        "title": f"Análise de Pareto - {item_column}",
        "data": {
            "top20Percentage": float(top_20_percentage),
            "items": items
        },
        "insight": f"20% dos itens geram {top_20_percentage:.1f}% do valor total."
    }
```

### Tendência Mensal

```python
def calculate_trend(df, value_column, date_column):
    """
    Calcula tendência mensal
    """
    df[date_column] = pd.to_datetime(df[date_column])
    df['month'] = df[date_column].dt.to_period('M')
    
    monthly = df.groupby('month')[value_column].sum().sort_index()
    
    if len(monthly) < 2:
        return None
    
    current = float(monthly.iloc[-1])
    previous = float(monthly.iloc[-2])
    change = current - previous
    change_percentage = (change / previous) * 100 if previous != 0 else 0
    
    # Série temporal
    series = []
    for period, value in monthly.tail(12).items():
        series.append({
            "period": str(period),
            "value": float(value)
        })
    
    return {
        "type": "trend",
        "id": f"trend_{value_column}",
        "title": f"Tendência - {value_column}",
        "data": {
            "current": current,
            "previous": previous,
            "change": change,
            "changePercentage": change_percentage,
            "series": series
        },
        "insight": generate_trend_insight(change_percentage)
    }

def generate_trend_insight(change_pct):
    if change_pct > 20:
        return "Crescimento excelente! Mantenha o ritmo."
    elif change_pct > 10:
        return "Crescimento saudável e consistente."
    elif change_pct > 0:
        return "Crescimento positivo, mas moderado."
    elif change_pct > -10:
        return "Leve queda. Monitore a evolução."
    else:
        return "Queda acentuada. Atenção necessária."
```

### Top Ranking

```python
def calculate_top_ranking(df, value_column, item_column, top_n=10):
    """
    Calcula top N itens
    """
    grouped = df.groupby(item_column)[value_column].sum().sort_values(ascending=False)
    total = grouped.sum()
    
    items = []
    for rank, (name, value) in enumerate(grouped.head(top_n).items(), 1):
        percentage = (value / total) * 100
        items.append({
            "rank": rank,
            "name": str(name),
            "value": float(value),
            "percentage": float(percentage)
        })
    
    return {
        "type": "top_ranking",
        "id": f"top_{item_column}",
        "title": f"Top {top_n} - {item_column}",
        "data": {
            "items": items,
            "total": float(total)
        },
        "insight": f"Top {min(5, len(items))} representam {sum(i['percentage'] for i in items[:5]):.1f}% do total."
    }
```

### Pontos de Atenção

```python
def detect_attention_points(df, config):
    """
    Detecta anomalias e pontos de atenção
    """
    points = []
    
    # Exemplo: Clientes com queda
    if 'cliente' in df.columns and 'valor' in df.columns:
        # Comparar últimos 2 períodos
        current_period = df[df['periodo'] == df['periodo'].max()]
        previous_period = df[df['periodo'] == df['periodo'].unique()[-2]]
        
        current_by_client = current_period.groupby('cliente')['valor'].sum()
        previous_by_client = previous_period.groupby('cliente')['valor'].sum()
        
        # Detectar quedas > 20%
        for client in current_by_client.index:
            if client in previous_by_client.index:
                current = current_by_client[client]
                previous = previous_by_client[client]
                change = ((current - previous) / previous) * 100
                
                if change < -20:
                    points.append({
                        "severity": "high",
                        "message": f"Cliente {client} com queda de {abs(change):.1f}%",
                        "affectedItems": [client]
                    })
    
    # Exemplo: Estoque baixo
    if 'estoque' in df.columns and 'produto' in df.columns:
        low_stock = df[df['estoque'] < df['estoque_minimo']]
        if len(low_stock) > 0:
            points.append({
                "severity": "medium",
                "message": f"{len(low_stock)} produtos com estoque baixo",
                "affectedItems": low_stock['produto'].tolist()[:5]
            })
    
    return {
        "type": "attention_points",
        "id": "alerts",
        "title": "Pontos de Atenção",
        "status": "warning" if any(p['severity'] == 'high' for p in points) else "normal",
        "data": {
            "points": points
        }
    }
```

## 🤖 Implementação do Chat IA

### Prompt System

```python
SYSTEM_PROMPT = """
Você é um assistente de análise de dados do Data Clarity.

REGRAS IMPORTANTES:
1. Você NÃO calcula nada. Os cálculos já foram feitos pelo backend.
2. Você APENAS explica, orienta e tira dúvidas sobre os resultados.
3. Use linguagem simples e humana, sem termos técnicos.
4. Seja direto e objetivo.
5. Sempre contextualize com os dados fornecidos.

VOCÊ PODE:
- Explicar o que os números significam
- Dizer se um resultado é bom ou ruim
- Apontar riscos e oportunidades
- Dar dicas de análise
- Traduzir dados em linguagem humana

VOCÊ NÃO PODE:
- Calcular métricas
- Criar cards
- Somar colunas
- Processar dados brutos
- Fazer análises que exigem cálculo

Contexto do dashboard:
{context}

Responda de forma conversacional e útil.
"""

def process_chat_message(request):
    """
    Processa mensagem do chat
    """
    context = request['context']
    message = request['message']
    history = request['conversationHistory']
    
    # Montar contexto para a IA
    context_str = f"""
Dashboard: {context['dashboardId']}

Métricas atuais:
{json.dumps(context['currentMetrics'], indent=2)}

Alertas recentes:
{chr(10).join(f"- {alert}" for alert in context['recentAlerts'])}

Cards disponíveis:
{chr(10).join(f"- {card['title']} ({card['type']})" for card in context['availableCards'])}
"""
    
    # Chamar OpenAI/Anthropic
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context_str)},
            *[{"role": msg['role'], "content": msg['content']} for msg in history[-5:]],
            {"role": "user", "content": message}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    assistant_message = response.choices[0].message.content
    
    # Gerar sugestões de perguntas
    suggested_questions = generate_suggested_questions(context, message)
    
    return {
        "success": True,
        "data": {
            "message": assistant_message,
            "suggestedQuestions": suggested_questions,
            "relatedCards": []
        }
    }

def generate_suggested_questions(context, last_message):
    """
    Gera sugestões de perguntas baseadas no contexto
    """
    suggestions = [
        "Isso é bom ou ruim?",
        "Tem algo fora do padrão?",
        "Onde devo prestar atenção?"
    ]
    
    # Adicionar sugestões contextuais
    if context['recentAlerts']:
        suggestions.append("O que causou esses alertas?")
    
    if 'faturamento' in str(context['currentMetrics']):
        suggestions.append("Como melhorar o faturamento?")
    
    return suggestions[:4]
```

## 🗄️ Estrutura de Banco de Dados

### Tabela: dashboards
```sql
CREATE TABLE dashboards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_id UUID NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: dashboard_cache
```sql
CREATE TABLE dashboard_cache (
    dashboard_id UUID PRIMARY KEY,
    calculated_data JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
);
```

## 🚀 Exemplo de Implementação FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

@app.get("/dashboard/{dashboard_id}")
async def get_dashboard(dashboard_id: str, user_id: str):
    """
    Retorna dashboard completo com todos os cards calculados
    """
    try:
        # 1. Buscar configuração do dashboard
        dashboard = await db.get_dashboard(dashboard_id, user_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # 2. Buscar dados brutos
        df = await db.get_dataset(dashboard['dataset_id'])
        
        # 3. Calcular todos os cards
        cards = []
        
        # Métricas básicas
        cards.append(calculate_metric_card(df, 'faturamento_total', 'Faturamento Total'))
        
        # Curva ABC
        cards.append(calculate_abc_curve(df, 'valor', 'produto'))
        
        # Pareto
        cards.append(calculate_pareto(df, 'valor', 'cliente'))
        
        # Tendência
        cards.append(calculate_trend(df, 'valor', 'data'))
        
        # Top Ranking
        cards.append(calculate_top_ranking(df, 'valor', 'cliente', 10))
        
        # 4. Detectar alertas
        alerts = [detect_attention_points(df, dashboard['config'])]
        
        # 5. Preparar gráficos
        charts = [
            calculate_chart(df, 'bar', 'produto', 'valor'),
            calculate_chart(df, 'line', 'data', 'valor')
        ]
        
        # 6. Montar resposta
        return {
            "success": True,
            "data": {
                "id": dashboard_id,
                "title": dashboard['title'],
                "description": dashboard.get('description'),
                "status": {
                    "status": "updated",
                    "lastUpdate": datetime.now().isoformat(),
                    "message": "Dados atualizados com sucesso"
                },
                "cards": [c for c in cards if c],
                "charts": charts,
                "alerts": alerts,
                "tableData": {
                    "columns": df.columns.tolist(),
                    "rows": df.head(50).to_dict('records'),
                    "totalRows": len(df)
                },
                "metadata": {
                    "createdAt": dashboard['created_at'].isoformat(),
                    "updatedAt": datetime.now().isoformat(),
                    "dataSource": dashboard['dataset_name'],
                    "rowCount": len(df),
                    "columnCount": len(df.columns)
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dashboard/{dashboard_id}/refresh")
async def refresh_dashboard(dashboard_id: str, user_id: str):
    """
    Recalcula dashboard
    """
    # Limpar cache
    await db.clear_cache(dashboard_id)
    
    # Recalcular
    return await get_dashboard(dashboard_id, user_id)

@app.post("/dashboard/chat")
async def chat(request: ChatRequest):
    """
    Processa mensagem do chat
    """
    return process_chat_message(request.dict())
```

## ✅ Checklist de Implementação

- [ ] Endpoint GET /dashboard/:id
- [ ] Endpoint POST /dashboard/:id/refresh
- [ ] Endpoint POST /dashboard/chat
- [ ] Função calculate_abc_curve
- [ ] Função calculate_pareto
- [ ] Função calculate_trend
- [ ] Função calculate_top_ranking
- [ ] Função detect_attention_points
- [ ] Integração com OpenAI/Anthropic
- [ ] Sistema de cache
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação da API

---

**Importante**: Todos os cálculos devem ser feitos no backend. O frontend apenas renderiza os resultados.
