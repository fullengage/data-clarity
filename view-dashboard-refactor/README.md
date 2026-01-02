# ViewDashboard - Refatoração Completa

## 📋 Resumo das Melhorias

Este refatoramento transforma o arquivo original de ~1400 linhas em uma estrutura modular e manutenível.

### Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Linhas de código | ~1400 em 1 arquivo | ~1200 distribuídas em 8 arquivos |
| Hooks customizados | 0 | 2 (useDashboardData, useTableOperations) |
| Funções utilitárias | Inline | 15+ funções puras reutilizáveis |
| Constantes | Inline/duplicadas | Centralizadas em 1 arquivo |
| Tipos TypeScript | Parciais/any | Completos e específicos |
| Testabilidade | Difícil | Facilitada pela separação |

---

## 📁 Estrutura de Arquivos

```
view-dashboard-refactor/
├── index.ts                    # Exportações centralizadas
├── ViewDashboard.tsx           # Componente principal (reduzido)
│
├── types/
│   └── viewDashboard.types.ts  # Tipos específicos do módulo
│
├── hooks/
│   ├── useDashboardData.ts     # Gerenciamento de estado e fetch
│   └── useTableOperations.ts   # Operações CRUD na tabela
│
├── utils/
│   ├── dataUtils.ts            # Parsing, conversão, formatação
│   ├── chartUtils.ts           # Construção de gráficos
│   └── insightGenerator.ts     # Geração automática de insights
│
└── constants/
    └── dashboardConfig.ts      # Configurações, opções, labels
```

---

## 🔧 Melhorias Detalhadas

### 1. Hooks Customizados

#### `useDashboardData`
Centraliza toda a lógica de:
- Fetch de dados do dashboard
- Transformação de dados brutos
- Atualização de intent
- Gerenciamento de IDs de datasets

```typescript
const {
  dashboard,
  tableData,
  tableColumns,
  intent,
  fetchDashboardData,
  updateIntent,
} = useDashboardData({ dashboardId: id, userId: user?.id });
```

#### `useTableOperations`
Gerencia todas as operações CRUD:
- Edição de células/linhas
- Adição/remoção de linhas
- Renomeação/exclusão de colunas
- Estado do editor de linhas

```typescript
const tableOps = useTableOperations({
  structuredDatasetId,
  dashboard,
  tableData,
  tableColumns,
  setTableData,
  setTableColumns,
  onRefresh: fetchDashboardData,
});
```

### 2. Utilitários Puros

#### `dataUtils.ts`
- `isProbablyNumber()` - Detecção de valores numéricos
- `isProbablyDate()` - Detecção de datas
- `toNumber()` - Conversão para número (formato BR)
- `toDate()` - Conversão para Date
- `formatDateBR()` - Formatação de data brasileira
- `formatCurrencyBR()` - Formatação de moeda
- `findNumericColumns()` - Identificação de colunas numéricas
- `calculateFilledRate()` - Taxa de preenchimento

#### `chartUtils.ts`
- `detectChartFormat()` - Detecção automática de formato
- `buildChartData()` - Construção de dados agregados
- `validateChartParams()` - Validação de parâmetros
- `buildChartPreview()` - Preview para Chart Builder

#### `insightGenerator.ts`
- `generateInsights()` - Geração automática de insights
- Análise de concentração em gráficos
- Detecção de performance em métricas

### 3. Constantes Centralizadas

```typescript
// Fácil manutenção e tradução
export const INTENT_LABELS = {
  financial: '💰 Dashboard Financeiro',
  sales: '📈 Vendas / Faturamento',
  // ...
};

// Configurações de UI
export const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Barras' },
  // ...
];
```

### 4. Tipagem Robusta

```typescript
// Tipos específicos para cada domínio
export interface ChartBuildParams {
  xKey: string;
  yKey?: string;
  agg: AggregationType;
}

export type AggregationType = 'count' | 'sum' | 'avg';
export type ChartFormatType = 'number' | 'currency' | 'percentage';
```

---

## 🚀 Guia de Migração

### Passo 1: Copiar arquivos
Copie a pasta `view-dashboard-refactor` para seu projeto.

### Passo 2: Ajustar imports
Atualize os imports no seu roteador:

```typescript
// Antes
import ViewDashboard from '@/pages/ViewDashboard';

// Depois
import { ViewDashboard } from '@/pages/view-dashboard-refactor';
```

### Passo 3: Verificar dependências
Os seguintes imports precisam existir no seu projeto:
- `@/lib/supabase`
- `@/hooks/useAuth`
- `@/hooks/useDashboards`
- `@/hooks/use-toast`
- `@/lib/webhookService`
- `@/lib/formulaEngine`
- `@/lib/smartMetrics`
- Componentes de UI (Button, Dialog, etc.)

### Passo 4: Testar funcionalidades
- ✅ Carregamento de dashboard
- ✅ Edição de métricas
- ✅ Criação de gráficos
- ✅ Operações de tabela (CRUD)
- ✅ AI para widgets e fórmulas
- ✅ Geração de métricas inteligentes
- ✅ Compartilhamento/visibilidade

---

## ⚡ Benefícios de Performance

1. **useMemo para valores pesados**
   - `availableNumericColumns`
   - `insights`
   - `enrichedMetrics`
   - `chartBuilderPreview`

2. **useCallback para handlers**
   - Todos os handlers são estáveis
   - Evita re-renders desnecessários

3. **Componentes memoizados**
   - `InsightsBanner`
   - `FinanceShortcutsSection`
   - `AiPromptSection`

---

## 🧪 Testabilidade

### Testando utilitários (unitário)
```typescript
import { isProbablyNumber, toNumber, buildChartData } from './utils';

describe('dataUtils', () => {
  test('isProbablyNumber detecta moeda BR', () => {
    expect(isProbablyNumber('R$ 1.234,56')).toBe(true);
  });
  
  test('toNumber converte moeda BR', () => {
    expect(toNumber('R$ 1.234,56')).toBe(1234.56);
  });
});
```

### Testando hooks (integração)
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './hooks/useDashboardData';

describe('useDashboardData', () => {
  test('carrega dashboard corretamente', async () => {
    const { result } = renderHook(() => 
      useDashboardData({ dashboardId: '123', userId: 'abc' })
    );
    
    await waitFor(() => {
      expect(result.current.dashboard).not.toBeNull();
    });
  });
});
```

---

## 📝 Notas Importantes

1. **Compatibilidade total**: Todas as funcionalidades do código original foram mantidas.

2. **Sem breaking changes**: A interface pública (props, eventos) permanece igual.

3. **Código original preservado**: O arquivo original não foi modificado.

4. **Fácil rollback**: Se necessário, basta reverter o import.

---

## 🔮 Próximos Passos Sugeridos

1. **Adicionar testes unitários** para utilitários
2. **Implementar React.memo** em componentes de lista (métricas, gráficos)
3. **Considerar React Query** para caching de dados
4. **Extrair mais sub-componentes** (Header, ChartSection, etc.)
5. **Adicionar Storybook** para documentação visual
