# 🎯 Nova Arquitetura de Dashboard - Data Clarity

## 📋 Visão Geral

Esta é a **nova arquitetura de dashboard** que separa completamente:
- **Backend**: Faz todos os cálculos (Python/SQL)
- **IA**: Apenas explica e orienta (conversacional)
- **Frontend**: Renderiza os resultados

## 🏗️ Princípios Fundamentais

### ✅ O que MUDOU

1. **Cards vêm prontos do backend**
   - Não são criados pela IA
   - Já chegam calculados
   - Frontend apenas renderiza

2. **IA é conversacional**
   - NÃO calcula métricas
   - NÃO cria cards
   - NÃO soma colunas
   - APENAS explica, orienta e tira dúvidas

3. **Interface independente da IA**
   - Dashboard funciona perfeitamente sem chat
   - Chat é apoio, não motor

## 📁 Estrutura de Arquivos

```
src/
├── types/
│   └── newDashboard.types.ts          # Tipos da nova arquitetura
├── components/
│   └── dashboard/
│       ├── DashboardCard.tsx          # Componente de card universal
│       └── DashboardChat.tsx          # Chat conversacional
├── pages/
│   └── NewViewDashboard.tsx           # Página principal do dashboard
└── lib/
    └── dashboardBackendService.ts     # Serviço de comunicação com backend
```

## 🎴 Tipos de Cards Suportados

### 1. 📊 Curva ABC
```typescript
{
  type: 'abc_curve',
  data: {
    classA: { count, percentage, value },
    classB: { count, percentage, value },
    classC: { count, percentage, value }
  }
}
```

### 2. 🎯 Pareto
```typescript
{
  type: 'pareto',
  data: {
    top20Percentage: number,
    items: [{ name, value, accumulated }]
  }
}
```

### 3. 📈 Tendência
```typescript
{
  type: 'trend',
  data: {
    current: number,
    previous: number,
    change: number,
    changePercentage: number,
    series: [{ period, value }]
  }
}
```

### 4. 🏆 Top Ranking
```typescript
{
  type: 'top_ranking',
  data: {
    items: [{ rank, name, value, percentage }],
    total: number
  }
}
```

### 5. ➕ Coluna Calculada
```typescript
{
  type: 'calculated_column',
  data: {
    columnName: string,
    formula: string,
    sampleValues: [],
    stats: { min, max, avg, sum }
  }
}
```

### 6. ⚠️ Pontos de Atenção
```typescript
{
  type: 'attention_points',
  data: {
    points: [{
      severity: 'low' | 'medium' | 'high',
      message: string,
      affectedItems?: string[]
    }]
  }
}
```

### 7. 📊 Métrica
```typescript
{
  type: 'metric',
  data: {
    value: string | number,
    prefix?: string,
    suffix?: string,
    change?: number,
    changeLabel?: string,
    secondaryInfo?: string
  }
}
```

### 8. 📉 Gráfico
```typescript
{
  type: 'chart',
  data: {
    chartType: 'line' | 'bar' | 'pie' | 'area',
    series: [{ name, value }],
    format?: 'currency' | 'percentage' | 'number'
  }
}
```

## 🎨 Estrutura da Tela

### 1️⃣ Header (Fixo)
- Título do dashboard
- Descrição curta
- Status dos dados (Atualizado / Atenção / Parcial)
- Botões de ação (Atualizar, Exportar, Compartilhar)

### 2️⃣ Área de Alertas
- Cards de pontos de atenção
- Severidade visual (low/medium/high)
- Itens afetados

### 3️⃣ Grid de Cards (Principal)
- Layout responsivo (1-4 colunas)
- Cards com status visual (normal/warning/critical)
- Ícones e badges
- Insights opcionais

### 4️⃣ Seção de Gráficos
- Grid 2 colunas
- Gráficos prontos do backend
- Títulos e legendas

### 5️⃣ Tabela (Opcional)
- Mostra/oculta com botão
- Scroll horizontal e vertical
- Limitada a 50 linhas visíveis
- Contador de registros

### 6️⃣ Chat (Lateral Direita)
- Botão flutuante quando fechado
- Painel lateral quando aberto
- Histórico de conversas
- Sugestões de perguntas

## 💬 Chat Conversacional

### O que o Chat FAZ ✅
- Explica resultados
- Tira dúvidas sobre números
- Dá dicas de análise
- Aponta riscos
- Traduz dados em linguagem humana

### O que o Chat NÃO FAZ ❌
- Calcular métricas
- Criar cards
- Somar colunas
- Ler linhas da tabela
- Processar dados

### Exemplos de Perguntas
```
✅ "Isso é bom ou ruim?"
✅ "Tem algo fora do padrão?"
✅ "Onde devo prestar atenção?"
✅ "Por que esse mês caiu?"
✅ "O que significa esse número?"

❌ "Calcule a média de vendas"
❌ "Some a coluna de valores"
❌ "Crie um gráfico de produtos"
```

## 🔌 Integração com Backend

### Endpoint: GET /dashboard/:id
```typescript
Response: {
  success: boolean,
  data: {
    id: string,
    title: string,
    description?: string,
    status: {
      status: 'updated' | 'attention' | 'partial',
      lastUpdate: Date,
      message?: string,
      warnings?: string[]
    },
    cards: DashboardCard[],
    charts: ChartCard[],
    alerts: AttentionPointsCard[],
    tableData?: {
      columns: string[],
      rows: Record<string, any>[],
      totalRows: number
    },
    metadata?: {
      createdAt: Date,
      updatedAt: Date,
      dataSource: string,
      rowCount: number,
      columnCount: number
    }
  }
}
```

### Endpoint: POST /dashboard/:id/refresh
```typescript
Response: DashboardApiResponse (mesmo formato acima)
```

### Endpoint: POST /dashboard/chat
```typescript
Request: {
  dashboardId: string,
  message: string,
  context: {
    dashboardId: string,
    availableCards: Array<{ id, type, title }>,
    currentMetrics: Record<string, number | string>,
    recentAlerts: string[]
  },
  conversationHistory: ChatMessage[]
}

Response: {
  success: boolean,
  data: {
    message: string,
    suggestedQuestions?: string[],
    relatedCards?: string[]
  }
}
```

## 🚀 Como Usar

### 1. Importar o componente
```typescript
import NewViewDashboard from '@/pages/NewViewDashboard';
```

### 2. Adicionar rota
```typescript
<Route path="/dashboard/:id/new" element={<NewViewDashboard />} />
```

### 3. Backend deve retornar dados no formato especificado
```typescript
// Exemplo de resposta do backend
{
  success: true,
  data: {
    id: "dash-123",
    title: "Vendas 2024",
    status: { status: "updated", lastUpdate: new Date() },
    cards: [
      {
        id: "metric-1",
        type: "metric",
        title: "Faturamento Total",
        data: {
          value: "R$ 1.245.678,90",
          change: 12.5,
          changeLabel: "vs mês anterior"
        },
        insight: "Excelente! Você superou a meta."
      }
    ],
    charts: [...],
    alerts: [...]
  }
}
```

## 🎯 Benefícios da Nova Arquitetura

1. **Separação de Responsabilidades**
   - Backend: Cálculos pesados
   - IA: Conversação e explicação
   - Frontend: Renderização

2. **Performance**
   - Cálculos feitos uma vez no backend
   - Frontend leve e rápido
   - Cache eficiente

3. **Escalabilidade**
   - Adicionar novos tipos de cards é simples
   - Backend pode otimizar cálculos
   - IA focada em linguagem natural

4. **Manutenibilidade**
   - Código organizado e tipado
   - Componentes reutilizáveis
   - Fácil testar cada parte

5. **UX Superior**
   - Dashboard funciona sem IA
   - Chat é opcional e útil
   - Linguagem humana e clara

## 📝 Próximos Passos

1. **Backend Python**
   - Implementar endpoints de dashboard
   - Calcular todos os tipos de cards
   - Integrar com banco de dados

2. **Chat IA**
   - Configurar OpenAI/Anthropic
   - Criar prompts conversacionais
   - Implementar contexto de dashboard

3. **Gráficos**
   - Integrar Recharts/Chart.js
   - Renderizar dados do backend
   - Adicionar interatividade

4. **Testes**
   - Testes unitários dos componentes
   - Testes de integração com backend
   - Testes de UX

## 🔄 Migração do Dashboard Antigo

Para migrar do dashboard antigo para o novo:

1. Manter ambos funcionando em paralelo
2. Criar adaptador de dados (antigo → novo formato)
3. Testar com usuários beta
4. Migrar gradualmente
5. Deprecar versão antiga

## 📚 Referências

- `src/types/newDashboard.types.ts` - Tipos completos
- `src/components/dashboard/DashboardCard.tsx` - Componente de card
- `src/components/dashboard/DashboardChat.tsx` - Chat conversacional
- `src/pages/NewViewDashboard.tsx` - Página principal
- `src/lib/dashboardBackendService.ts` - Serviço de backend

---

**Criado em**: Janeiro 2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para implementação
