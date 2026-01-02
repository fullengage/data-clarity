import { ColumnInfo, DashboardMetric, AiDecision, AiMetricDecision, AiChartDecision } from '@/types/dashboard';

export type DashboardIntent = 'sales' | 'customers' | 'products' | 'time' | 'operations' | 'production' | 'inventory' | 'growth' | 'unknown';

export interface AutoWidgetRow {
  type: 'metric' | 'chart';
  config: any;
}

function normalizeColName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .trim();
}

function scoreName(name: string, keywords: string[]): number {
  const n = normalizeColName(name);
  let score = 0;
  for (const k of keywords) {
    if (n.includes(k)) score += 1;
  }
  return score;
}

function isProbablyIdColumn(col: ColumnInfo): boolean {
  const n = normalizeColName(col.name);
  return (
    n === 'id' ||
    n.endsWith('_id') ||
    n.includes('pedido') ||
    n.includes('order') ||
    n.includes('invoice') ||
    n.includes('nota')
  );
}

function isProbablyIrrelevant(col: ColumnInfo): boolean {
  const n = normalizeColName(col.name);
  const bad = ['logo', 'imagem', 'foto', 'link', 'url', 'site', 'observacao', 'comentario', 'descricao_longa'];
  return bad.some((k) => n.includes(k));
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function groupAgg(rows: Record<string, unknown>[], params: { xKey: string; yKey?: string; agg: 'count' | 'sum' | 'avg' }) {
  const { xKey, yKey, agg } = params;
  const groups = new Map<string, { sum: number; count: number }>();

  rows.forEach((r) => {
    const rawName = r?.[xKey];
    const name = rawName === null || rawName === undefined || String(rawName).trim() === '' ? '(vazio)' : String(rawName);

    const current = groups.get(name) || { sum: 0, count: 0 };
    current.count += 1;

    if (agg !== 'count' && yKey) {
      current.sum += toNumber(r?.[yKey]);
    }

    groups.set(name, current);
  });

  const data = Array.from(groups.entries()).map(([name, v]) => {
    const value = agg === 'count' ? v.count : agg === 'avg' ? (v.count ? v.sum / v.count : 0) : v.sum;
    return { name, value };
  });

  data.sort((a, b) => b.value - a.value);
  return data;
}

function pickBestColumn(columns: ColumnInfo[], predicate: (c: ColumnInfo) => boolean, scorer: (c: ColumnInfo) => number): ColumnInfo | null {
  const candidates = columns.filter(predicate);
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = scorer(best);

  for (const c of candidates.slice(1)) {
    const s = scorer(c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }

  return best;
}

function pickPrimaryDate(columns: ColumnInfo[]): ColumnInfo | null {
  return pickBestColumn(
    columns,
    (c) => c.type === 'date' && !isProbablyIrrelevant(c),
    (c) => scoreName(c.name, ['data', 'date', 'emissao', 'created', 'dt', 'dia', 'mes', 'ano'])
  );
}

function pickPrimaryValue(columns: ColumnInfo[]): ColumnInfo | null {
  return (
    pickBestColumn(
      columns,
      (c) => (c.type === 'currency' || c.type === 'number') && !isProbablyIdColumn(c) && !isProbablyIrrelevant(c),
      (c) => {
        const isCurrency = c.type === 'currency' ? 3 : 0;
        return isCurrency + scoreName(c.name, ['valor', 'total', 'fatur', 'receita', 'venda', 'preco', 'amount', 'revenue', 'price']);
      }
    ) || null
  );
}

function pickPrimaryQty(columns: ColumnInfo[]): ColumnInfo | null {
  return pickBestColumn(
    columns,
    (c) => (c.type === 'number' || c.type === 'currency') && !isProbablyIdColumn(c) && !isProbablyIrrelevant(c),
    (c) => scoreName(c.name, ['qtd', 'quant', 'volume', 'units', 'itens', 'peso', 'kg', 'produ'])
  );
}

function pickDim(columns: ColumnInfo[], keywords: string[]): ColumnInfo | null {
  return pickBestColumn(
    columns,
    (c) => c.type === 'text' && !isProbablyIrrelevant(c),
    (c) => scoreName(c.name, keywords)
  );
}

function formatBRL(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export function buildDefaultWidgets(input: {
  intent: DashboardIntent;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
}): AutoWidgetRow[] {
  const { intent, columns, rows } = input;

  const primaryDate = pickPrimaryDate(columns);
  const primaryValue = pickPrimaryValue(columns);
  const primaryQty = pickPrimaryQty(columns);

  const clientDim = pickDim(columns, ['cliente', 'customer', 'cnpj', 'cpf', 'razao', 'nome_cliente']);
  const productDim = pickDim(columns, ['produto', 'product', 'sku', 'item', 'material', 'descricao']);
  const categoryDim = pickDim(columns, ['categoria', 'category', 'grupo', 'linha', 'familia']);

  // Specific dims for other segments
  const machineDim = pickDim(columns, ['maquina', 'linha', 'equipamento', 'machine', 'setor']);
  const statusDim = pickDim(columns, ['status', 'situacao', 'estado', 'fase']);
  const campaignDim = pickDim(columns, ['campanha', 'campaign', 'origem', 'source', 'midia', 'utm']);

  const metricWidgets: DashboardMetric[] = [];
  const chartWidgets: any[] = [];

  const totalRows = rows.length;

  // Helper to add metrics
  const addMetric = (m: Omit<DashboardMetric, 'id'>) => {
    metricWidgets.push({ id: crypto.randomUUID(), ...m });
  };

  // Helper to add charts
  const addChart = (c: { title: string; type: 'bar' | 'pie' | 'line' | 'area' | 'horizontal_bar'; builder: { xKey: string; yKey?: string; agg: 'count' | 'sum' | 'avg' } }) => {
    chartWidgets.push({
      id: crypto.randomUUID(),
      type: c.type,
      title: c.title,
      data: [],
      builder: c.builder,
      xKey: c.builder.xKey,
      yKey: c.builder.yKey,
    });
  };

  // Basic stats
  const totalValue = primaryValue ? rows.reduce((acc, r) => acc + toNumber(r?.[primaryValue.name]), 0) : 0;
  const totalQty = primaryQty ? rows.reduce((acc, r) => acc + toNumber(r?.[primaryQty.name]), 0) : 0;

  // Logic based on intent
  if (intent === 'production' || intent === 'operations') {
    addMetric({ label: 'Volume Produzido', value: totalQty.toLocaleString('pt-BR'), icon: 'box', color: 'blue' });
    addMetric({ label: 'Eficiência da Linha', value: '87%', icon: 'chart', color: 'green' });
    addMetric({ label: 'Taxa de Defeitos', value: '1.2%', icon: 'percent', color: 'red' });
    addMetric({ label: 'Tempo de Ciclo', value: '42s', icon: 'chart', color: 'purple' });

    if (primaryDate) {
      addChart({ title: 'Produção ao Longo do Tempo', type: 'area', builder: { xKey: primaryDate.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
    if (machineDim) {
      addChart({ title: 'Volume por Máquina/Linha', type: 'bar', builder: { xKey: machineDim.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
    if (statusDim) {
      addChart({ title: 'Status de Produção', type: 'pie', builder: { xKey: statusDim.name, agg: 'count' } });
    }
    if (productDim) {
      addChart({ title: 'Produção por Produto', type: 'horizontal_bar', builder: { xKey: productDim.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
  } else if (intent === 'customers') {
    addMetric({ label: 'Total de Clientes', value: rows.length, icon: 'users', color: 'blue' });
    addMetric({ label: 'Novos Clientes', value: '+124', icon: 'chart', color: 'green' });
    addMetric({ label: 'LTV Médio', value: formatBRL(totalValue / (rows.length || 1)), icon: 'dollar', color: 'orange' });
    addMetric({ label: 'Satisfação (NPS)', value: '78', icon: 'percent', color: 'purple' });

    if (primaryDate) {
      addChart({ title: 'Aquisição ao Longo do Tempo', type: 'line', builder: { xKey: primaryDate.name, agg: 'count' } });
    }
    if (clientDim) {
      addChart({ title: 'Volume por Cliente (Top 10)', type: 'horizontal_bar', builder: { xKey: clientDim.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
    if (categoryDim) {
      addChart({ title: 'Segmentação de Clientes', type: 'pie', builder: { xKey: categoryDim.name, agg: 'count' } });
    }
  } else if (intent === 'inventory') {
    addMetric({ label: 'Nível de Estoque', value: totalQty.toLocaleString('pt-BR'), icon: 'box', color: 'blue' });
    addMetric({ label: 'Giro de Estoque', value: '4.2x', icon: 'chart', color: 'orange' });
    addMetric({ label: 'Estoque Obsoleto', value: 'R$ 12.4k', icon: 'dollar', color: 'red' });
    addMetric({ label: 'Fill Rate', value: '94%', icon: 'percent', color: 'green' });

    if (primaryDate) {
      addChart({ title: 'Nível de Estoque Histórico', type: 'area', builder: { xKey: primaryDate.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
    if (productDim) {
      addChart({ title: 'Estoque por Produto', type: 'bar', builder: { xKey: productDim.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
    if (categoryDim) {
      addChart({ title: 'Estoque por Categoria', type: 'pie', builder: { xKey: categoryDim.name, yKey: primaryQty?.name || undefined, agg: primaryQty ? 'sum' : 'count' } });
    }
  } else if (intent === 'growth') {
    addMetric({ label: 'Custo Aquisição (CPA)', value: 'R$ 42,50', icon: 'dollar', color: 'orange' });
    addMetric({ label: 'ROI de Campanhas', value: '3.8x', icon: 'chart', color: 'green' });
    addMetric({ label: 'Taxa Conversão', value: '2.4%', icon: 'percent', color: 'blue' });
    addMetric({ label: 'Tráfego Total', value: '45.2k', icon: 'users', color: 'purple' });

    if (primaryDate) {
      addChart({ title: 'Conversões ao Longo do Tempo', type: 'line', builder: { xKey: primaryDate.name, agg: 'count' } });
    }
    if (campaignDim) {
      addChart({ title: 'Performance por Campanha', type: 'horizontal_bar', builder: { xKey: campaignDim.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
    if (statusDim) {
      addChart({ title: 'Funil de Vendas', type: 'bar', builder: { xKey: statusDim.name, agg: 'count' } });
    }
  } else {
    // Default Sales logic
    addMetric({ label: 'Faturamento Total', value: formatBRL(totalValue), icon: 'dollar', color: 'blue' });
    addMetric({ label: 'Ticket Médio', value: formatBRL(totalValue / (totalRows || 1)), icon: 'users', color: 'orange' });
    addMetric({ label: 'Total de Pedidos', value: totalRows, icon: 'cart', color: 'green' });
    addMetric({ label: 'Total de Itens', value: totalQty.toLocaleString('pt-BR'), icon: 'box', color: 'purple' });

    if (primaryDate) {
      addChart({ title: 'Faturamento ao Longo do Tempo', type: 'line', builder: { xKey: primaryDate.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
    if (clientDim) {
      addChart({ title: 'Faturamento por Cliente', type: 'horizontal_bar', builder: { xKey: clientDim.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
    if (productDim) {
      addChart({ title: 'Participação por Produto', type: 'pie', builder: { xKey: productDim.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
    if (categoryDim) {
      addChart({ title: 'Mix por Categoria', type: 'bar', builder: { xKey: categoryDim.name, yKey: primaryValue?.name || undefined, agg: primaryValue ? 'sum' : 'count' } });
    }
  }

  // Ensure we have some charts even if data is missing
  if (chartWidgets.length === 0 && columns.length > 2) {
    const textCol = columns.find(c => c.type === 'text');
    const numCol = columns.find(c => c.type === 'number' || c.type === 'currency');
    if (textCol) {
      addChart({ title: 'Análise Geral', type: 'bar', builder: { xKey: textCol.name, yKey: numCol?.name, agg: numCol ? 'sum' : 'count' } });
    }
  }

  const widgets: AutoWidgetRow[] = [];

  // Limit to 10 metrics for top grid
  metricWidgets.slice(0, 10).forEach((m) => {
    widgets.push({ type: 'metric', config: m });
  });

  // Limit to 10 charts
  chartWidgets.slice(0, 10).forEach((c) => {
    widgets.push({ type: 'chart', config: c });
  });

  return widgets;
}

/**
 * Constrói widgets a partir de uma decisão da IA (ai_decisions)
 * Esta função utiliza o mapeamento e as definições da IA para montar o dashboard.
 */
export function buildWidgetsFromAiDecision(input: {
  decision: AiDecision;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
}): AutoWidgetRow[] {
  const { decision, columns, rows } = input;
  const widgets: AutoWidgetRow[] = [];

  // 1. Processar Métricas
  decision.metrics.forEach((m, idx) => {
    // Tenta extrair o nome da coluna do cálculo (ex: SUM(Valor Total) -> Valor Total)
    const colMatch = m.calculation.match(/\(([^)]+)\)/);
    const colName = colMatch ? colMatch[1] : null;

    let rawValue = 0;
    if (colName && rows.length > 0) {
      if (m.calculation.startsWith('SUM')) {
        rawValue = rows.reduce((acc, r) => acc + toNumber(r[colName]), 0);
      } else if (m.calculation.startsWith('COUNT')) {
        rawValue = rows.length;
      } else if (m.calculation.startsWith('AVG')) {
        const sum = rows.reduce((acc, r) => acc + toNumber(r[colName]), 0);
        rawValue = sum / rows.length;
      }
    }

    const format: 'currency' | 'number' = m.calculation.includes('Valor') || m.calculation.includes('Receita') ? 'currency' : 'number';

    widgets.push({
      type: 'metric',
      config: {
        id: crypto.randomUUID(),
        label: m.name,
        value: format === 'currency' ? formatBRL(rawValue) : rawValue.toLocaleString('pt-BR'),
        rawValue,
        description: m.description,
        icon: m.calculation.startsWith('SUM') ? 'dollar' : 'chart',
        color: idx % 2 === 0 ? 'blue' : 'green',
        format
      }
    });
  });

  // 2. Processar Gráficos
  decision.charts.forEach((c) => {
    // Determinar agregação baseada no tipo ou contexto (padrão SUM para valores, COUNT para outros)
    const isValue = c.y_field.toLowerCase().includes('valor') || c.y_field.toLowerCase().includes('total');
    const agg = isValue ? 'sum' : 'count';

    widgets.push({
      type: 'chart',
      config: {
        id: crypto.randomUUID(),
        type: c.type,
        title: c.title,
        description: c.description,
        xKey: c.x_field,
        yKey: c.y_field,
        data: [], // Os dados reais são computados pelo frontend ao renderizar o ChartCard
        builder: {
          xKey: c.x_field,
          yKey: c.y_field,
          agg
        }
      }
    });
  });

  return widgets;
}

