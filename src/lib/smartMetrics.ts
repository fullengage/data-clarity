import { DashboardMetric } from '@/types/dashboard';

export type DatasetType = 'vendas' | 'estoque' | 'horas_extras' | 'unknown';

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'date' | 'text';
  hasNullValues: boolean;
  distinctCount: number;
  sampleValues: unknown[];
}

interface DatasetAnalysis {
  type: DatasetType;
  columns: ColumnAnalysis[];
  rowCount: number;
  dateColumn?: string;
  valueColumn?: string;
  categoryColumn?: string;
  quantityColumn?: string;
}

interface MetricComparison {
  value: number;
  label: string;
  trend: 'up' | 'down' | 'neutral';
}

interface SmartMetric {
  id: string;
  title: string;
  value: string | number;
  format: 'currency' | 'number' | 'percentage' | 'text';
  comparison?: MetricComparison;
  insight: string;
  icon: string;
  color: string;
  prefix?: string;
  suffix?: string;
}

const isProbablyNumber = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num);
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const clean = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
};

const isProbablyDate = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (value instanceof Date) return true;
  if (typeof value === 'string') {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // ISO
      /^\d{2}\/\d{2}\/\d{4}/, // BR
      /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // Flexible
    ];
    return datePatterns.some(p => p.test(value));
  }
  return false;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;

    const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const d = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

export function analyzeDataset(
  rows: Record<string, unknown>[],
  columns: string[]
): DatasetAnalysis {
  if (rows.length === 0 || columns.length === 0) {
    return {
      type: 'unknown',
      columns: [],
      rowCount: 0,
    };
  }

  const columnAnalysis: ColumnAnalysis[] = columns.map(col => {
    const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
    const distinctValues = new Set(values.map(v => String(v)));

    const numericCount = values.filter(isProbablyNumber).length;
    const dateCount = values.filter(isProbablyDate).length;

    let type: 'numeric' | 'date' | 'text' = 'text';
    if (numericCount >= values.length * 0.6) type = 'numeric';
    else if (dateCount >= values.length * 0.6) type = 'date';

    return {
      name: col,
      type,
      hasNullValues: values.length < rows.length,
      distinctCount: distinctValues.size,
      sampleValues: values.slice(0, 5),
    };
  });

  const dateColumn = columnAnalysis.find(c => c.type === 'date')?.name;
  const numericColumns = columnAnalysis.filter(c => c.type === 'numeric');
  const textColumns = columnAnalysis.filter(c => c.type === 'text');

  const keywords = {
    vendas: ['venda', 'receita', 'faturamento', 'valor', 'cliente', 'pedido', 'produto', 'preco', 'total'],
    estoque: ['estoque', 'quantidade', 'saldo', 'entrada', 'saida', 'produto', 'item', 'unidade'],
    horas_extras: ['hora', 'extra', 'colaborador', 'funcionario', 'turno', 'operacional', 'trabalhado'],
  };

  const allText = [...columns, ...rows.slice(0, 10).flatMap(r => Object.values(r))].join(' ').toLowerCase();

  const scores = {
    vendas: keywords.vendas.filter(k => allText.includes(k)).length,
    estoque: keywords.estoque.filter(k => allText.includes(k)).length,
    horas_extras: keywords.horas_extras.filter(k => allText.includes(k)).length,
  };

  let type: DatasetType = 'unknown';
  const maxScore = Math.max(scores.vendas, scores.estoque, scores.horas_extras);
  if (maxScore > 0) {
    if (scores.vendas === maxScore) type = 'vendas';
    else if (scores.estoque === maxScore) type = 'estoque';
    else if (scores.horas_extras === maxScore) type = 'horas_extras';
  }

  const valueColumn = numericColumns.find(c =>
    c.name.toLowerCase().includes('valor') ||
    c.name.toLowerCase().includes('preco') ||
    c.name.toLowerCase().includes('total')
  )?.name || numericColumns[0]?.name;

  const quantityColumn = numericColumns.find(c =>
    c.name.toLowerCase().includes('quantidade') ||
    c.name.toLowerCase().includes('qtd') ||
    c.name.toLowerCase().includes('unidade')
  )?.name;

  const categoryColumn = textColumns.find(c =>
    c.distinctCount > 1 && c.distinctCount < rows.length * 0.8
  )?.name;

  return {
    type,
    columns: columnAnalysis,
    rowCount: rows.length,
    dateColumn,
    valueColumn,
    categoryColumn,
    quantityColumn,
  };
}

function calculateComparison(
  currentValue: number,
  previousValue: number,
  label: string
): MetricComparison | undefined {
  if (previousValue === 0) return undefined;

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;

  return {
    value: Math.abs(percentChange),
    label,
    trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral',
  };
}

function splitByPeriod(
  rows: Record<string, unknown>[],
  dateColumn: string
): { current: Record<string, unknown>[]; previous: Record<string, unknown>[] } {
  const sortedRows = [...rows].sort((a, b) => {
    const dateA = toDate(a[dateColumn]);
    const dateB = toDate(b[dateColumn]);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  const midPoint = Math.floor(sortedRows.length / 2);

  return {
    previous: sortedRows.slice(0, midPoint),
    current: sortedRows.slice(midPoint),
  };
}

function generateVendasMetrics(
  rows: Record<string, unknown>[],
  analysis: DatasetAnalysis
): SmartMetric[] {
  const metrics: SmartMetric[] = [];
  const { valueColumn, dateColumn, categoryColumn } = analysis;

  if (!valueColumn) return metrics;

  const totalRevenue = rows.reduce((sum, row) => sum + toNumber(row[valueColumn]), 0);
  const salesCount = rows.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  let revenueComparison: MetricComparison | undefined;
  let salesComparison: MetricComparison | undefined;

  if (dateColumn) {
    const { current, previous } = splitByPeriod(rows, dateColumn);

    const currentRevenue = current.reduce((sum, row) => sum + toNumber(row[valueColumn]), 0);
    const previousRevenue = previous.reduce((sum, row) => sum + toNumber(row[valueColumn]), 0);

    revenueComparison = calculateComparison(currentRevenue, previousRevenue, 'vs. período anterior');
    salesComparison = calculateComparison(current.length, previous.length, 'vs. período anterior');
  }

  metrics.push({
    id: 'faturamento_total',
    title: 'Faturamento Total',
    value: totalRevenue.toFixed(2),
    format: 'currency',
    prefix: 'R$',
    comparison: revenueComparison,
    insight: revenueComparison
      ? revenueComparison.trend === 'up'
        ? 'Crescimento positivo no período'
        : 'Redução no faturamento'
      : 'Faturamento acumulado no período',
    icon: 'dollar',
    color: 'green',
  });

  metrics.push({
    id: 'quantidade_vendas',
    title: 'Quantidade de Vendas',
    value: salesCount,
    format: 'number',
    suffix: salesCount === 1 ? ' venda' : ' vendas',
    comparison: salesComparison,
    insight: salesComparison
      ? salesComparison.trend === 'up'
        ? 'Aumento no volume de vendas'
        : 'Redução no volume de vendas'
      : 'Total de transações registradas',
    icon: 'cart',
    color: 'blue',
  });

  metrics.push({
    id: 'ticket_medio',
    title: 'Ticket Médio',
    value: avgTicket.toFixed(2),
    format: 'currency',
    prefix: 'R$',
    insight: avgTicket > 100 ? 'Ticket médio saudável' : 'Ticket médio baixo',
    icon: 'credit-card',
    color: 'purple',
  });

  metrics.push({
    id: 'maior_venda',
    title: 'Maior Venda Individual',
    value: Math.max(...rows.map((r) => toNumber(r[valueColumn]))).toFixed(2),
    format: 'currency',
    prefix: 'R$',
    insight: 'Valor do maior pedido isolado registrado',
    icon: 'trending-up',
    color: 'teal',
  });

  if (dateColumn) {
    const dates = new Set(
      rows
        .map((r) => {
          const d = toDate(r[dateColumn]);
          return d ? d.toDateString() : null;
        })
        .filter(Boolean)
    );
    const dailyAvg = dates.size > 0 ? totalRevenue / dates.size : totalRevenue;
    metrics.push({
      id: 'media_diaria',
      title: 'Faturamento Médio Diário',
      value: dailyAvg.toFixed(2),
      format: 'currency',
      prefix: 'R$',
      insight: `Média baseada em ${dates.size} dias de operação`,
      icon: 'activity',
      color: 'blue',
    });
  }

  if (categoryColumn) {
    const categories = Array.from(new Set(rows.map((r) => r[categoryColumn]).filter(Boolean)));
    metrics.push({
      id: 'categorias_ativas',
      title: 'Mix de Produtos',
      value: categories.length,
      format: 'number',
      suffix: categories.length === 1 ? ' item' : ' itens',
      insight: 'Diversidade de produtos no portfólio',
      icon: 'box',
      color: 'orange',
    });

    // Top Categoria por volume
    const catCounts = new Map<string, number>();
    rows.forEach(r => {
      const cat = String(r[categoryColumn]);
      catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
    });
    const topCat = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      metrics.push({
        id: 'top_categoria',
        title: 'Categoria Líder',
        value: topCat[0],
        format: 'text',
        insight: `Categoria com maior número de pedidos (${topCat[1]})`,
        icon: 'briefcase',
        color: 'indigo',
      });
    }
  }

  // Ticket Médio Superior a R$ 500?
  if (avgTicket > 500) {
    metrics.push({
      id: 'perfil_ticket',
      title: 'Perfil de Venda',
      value: 'Ticket Alto',
      format: 'text',
      insight: 'Sua operação foca em vendas de alto valor unitário',
      icon: 'star',
      color: 'pink',
    });
  }

  return metrics;
}

function generateEstoqueMetrics(
  rows: Record<string, unknown>[],
  analysis: DatasetAnalysis
): SmartMetric[] {
  const metrics: SmartMetric[] = [];
  const { quantityColumn, dateColumn, categoryColumn } = analysis;

  if (!quantityColumn) return metrics;

  const totalQuantity = rows.reduce((sum, row) => sum + toNumber(row[quantityColumn]), 0);
  const avgQuantity = rows.length > 0 ? totalQuantity / rows.length : 0;

  const lowStockItems = rows.filter(row => {
    const qty = toNumber(row[quantityColumn]);
    return qty < avgQuantity * 0.5;
  }).length;

  let quantityComparison: MetricComparison | undefined;

  if (dateColumn) {
    const { current, previous } = splitByPeriod(rows, dateColumn);

    const currentQty = current.reduce((sum, row) => sum + toNumber(row[quantityColumn]), 0);
    const previousQty = previous.reduce((sum, row) => sum + toNumber(row[quantityColumn]), 0);

    quantityComparison = calculateComparison(currentQty, previousQty, 'vs. período anterior');
  }

  metrics.push({
    id: 'total_estoque',
    title: 'Itens em Estoque',
    value: Math.round(totalQuantity),
    format: 'number',
    suffix: ' unidades',
    comparison: quantityComparison,
    insight: quantityComparison
      ? quantityComparison.trend === 'down'
        ? 'Redução de estoque no período'
        : 'Aumento de estoque no período'
      : 'Total de unidades em estoque',
    icon: 'box',
    color: 'blue',
  });

  metrics.push({
    id: 'estoque_baixo',
    title: 'Produtos com Estoque Baixo',
    value: lowStockItems,
    format: 'number',
    suffix: lowStockItems === 1 ? ' item' : ' itens',
    insight: lowStockItems > 0 ? 'Atenção necessária' : 'Estoque controlado',
    icon: 'activity',
    color: lowStockItems > 0 ? 'red' : 'green',
  });

  if (categoryColumn) {
    const categories = Array.from(new Set(rows.map(r => r[categoryColumn]).filter(Boolean)));
    metrics.push({
      id: 'produtos_cadastrados',
      title: 'Produtos Cadastrados',
      value: categories.length,
      format: 'number',
      suffix: categories.length === 1 ? ' produto' : ' produtos',
      insight: 'Variedade de produtos no estoque',
      icon: 'briefcase',
      color: 'purple',
    });

    // Top Categoria por Qtd
    const catQty = new Map<string, number>();
    rows.forEach(r => {
      const cat = String(r[categoryColumn]);
      catQty.set(cat, (catQty.get(cat) || 0) + toNumber(r[quantityColumn]));
    });
    const topCat = Array.from(catQty.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      metrics.push({
        id: 'concentracao_estoque',
        title: 'Principal Categoria',
        value: topCat[0],
        format: 'text',
        insight: `Concentra ${Math.round((topCat[1] / (totalQuantity || 1)) * 100)}% do volume`,
        icon: 'target',
        color: 'orange',
      });
    }
  }

  const turnoverRate = avgQuantity > 0 ? (totalQuantity / avgQuantity) : 0;
  let turnoverLabel = 'Médio';
  let turnoverColor: any = 'yellow';
  let turnoverInsight = 'Giro de estoque moderado';

  if (turnoverRate > 5) {
    turnoverLabel = 'Alto';
    turnoverColor = 'green';
    turnoverInsight = 'Giro de estoque saudável';
  } else if (turnoverRate < 2) {
    turnoverLabel = 'Baixo';
    turnoverColor = 'orange';
    turnoverInsight = 'Produtos parados';
  }

  metrics.push({
    id: 'giro_estoque',
    title: 'Giro de Estoque',
    value: turnoverLabel,
    format: 'text',
    insight: turnoverInsight,
    icon: 'activity',
    color: turnoverColor,
  });

  return metrics;
}

function generateHorasExtrasMetrics(
  rows: Record<string, unknown>[],
  analysis: DatasetAnalysis
): SmartMetric[] {
  const metrics: SmartMetric[] = [];
  const { valueColumn, dateColumn, categoryColumn } = analysis;

  const hoursColumn = analysis.columns.find(c =>
    c.name.toLowerCase().includes('hora') && c.type === 'numeric'
  )?.name || valueColumn;

  if (!hoursColumn) return metrics;

  const totalHours = rows.reduce((sum, row) => sum + toNumber(row[hoursColumn]), 0);
  const collaborators = categoryColumn
    ? new Set(rows.map(r => r[categoryColumn]).filter(Boolean)).size
    : rows.length;
  const avgHoursPerPerson = collaborators > 0 ? totalHours / collaborators : 0;

  let hoursComparison: MetricComparison | undefined;

  if (dateColumn) {
    const { current, previous } = splitByPeriod(rows, dateColumn);

    const currentHours = current.reduce((sum, row) => sum + toNumber(row[hoursColumn]), 0);
    const previousHours = previous.reduce((sum, row) => sum + toNumber(row[hoursColumn]), 0);

    hoursComparison = calculateComparison(currentHours, previousHours, 'vs. período anterior');
  }

  metrics.push({
    id: 'horas_extras_total',
    title: 'Horas Extras Totais',
    value: Math.round(totalHours),
    format: 'number',
    suffix: ' horas',
    comparison: hoursComparison,
    insight: hoursComparison
      ? hoursComparison.trend === 'up'
        ? 'Aumento nas horas extras'
        : 'Redução nas horas extras'
      : 'Total de horas extras no período',
    icon: 'activity',
    color: 'orange',
  });

  metrics.push({
    id: 'media_por_colaborador',
    title: 'Média por Colaborador',
    value: avgHoursPerPerson.toFixed(1),
    format: 'number',
    suffix: ' horas',
    insight: avgHoursPerPerson > 10
      ? 'Tendência de aumento'
      : 'Dentro do esperado',
    icon: 'user',
    color: 'blue',
  });

  if (collaborators > 0) {
    metrics.push({
      id: 'colaboradores_ativos',
      title: 'Colaboradores',
      value: collaborators,
      format: 'number',
      suffix: collaborators === 1 ? ' pessoa' : ' pessoas',
      insight: 'Equipe registrada no período',
      icon: 'users',
      color: 'purple',
    });
  }

  let impactLabel = 'Controlado';
  let impactColor = 'green';
  let impactInsight = 'Horas extras sob controle';

  if (hoursComparison && hoursComparison.value > 20) {
    impactLabel = 'Atenção';
    impactColor = 'red';
    impactInsight = 'Crescimento acima do esperado';
  } else if (hoursComparison && hoursComparison.trend === 'down') {
    impactLabel = 'Redução Positiva';
    impactColor = 'green';
    impactInsight = 'Redução nas horas extras';
  }

  metrics.push({
    id: 'impacto_operacional',
    title: 'Impacto Operacional',
    value: impactLabel,
    format: 'text',
    insight: impactInsight,
    icon: 'briefcase',
    color: impactColor,
  });

  return metrics;
}

export function generateSmartMetrics(
  rows: Record<string, unknown>[],
  columns: string[]
): { type: DatasetType; metrics: SmartMetric[] } {
  const analysis = analyzeDataset(rows, columns);

  let metrics: SmartMetric[] = [];

  switch (analysis.type) {
    case 'vendas':
      metrics = generateVendasMetrics(rows, analysis);
      break;
    case 'estoque':
      metrics = generateEstoqueMetrics(rows, analysis);
      break;
    case 'horas_extras':
      metrics = generateHorasExtrasMetrics(rows, analysis);
      break;
    default:
      if (analysis.valueColumn) {
        const total = rows.reduce((sum, row) => sum + toNumber(row[analysis.valueColumn!]), 0);
        metrics.push({
          id: 'total_geral',
          title: 'Total Geral',
          value: total.toFixed(2),
          format: 'number',
          insight: 'Soma total dos valores',
          icon: 'chart',
          color: 'blue',
        });
      }

      metrics.push({
        id: 'total_registros',
        title: 'Total de Registros',
        value: rows.length,
        format: 'number',
        suffix: rows.length === 1 ? ' registro' : ' registros',
        insight: 'Quantidade de linhas no dataset',
        icon: 'activity',
        color: 'purple',
      });
  }

  return {
    type: analysis.type,
    metrics,
  };
}

export function convertToDashboardMetrics(smartMetrics: SmartMetric[]): Partial<DashboardMetric>[] {
  return smartMetrics.map(metric => ({
    label: metric.title,
    value: String(metric.value),
    icon: metric.icon as any,
    color: metric.color as any,
    prefix: metric.prefix,
    suffix: metric.suffix,
    change: metric.comparison?.value,
    changeType: metric.comparison?.trend === 'up' ? 'positive' : metric.comparison?.trend === 'down' ? 'negative' : 'neutral',
  }));
}
