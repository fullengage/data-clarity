/**
 * Utilitários de Construção de Gráficos para o ViewDashboard
 */

import { ChartConfig } from '@/types/dashboard';
import { 
  ChartBuildParams, 
  ChartDataPoint, 
  AggregationType,
  ChartFormatType 
} from '../types/viewDashboard.types';
import { 
  isProbablyDate, 
  toDate, 
  toNumber, 
  formatDateBR 
} from './dataUtils';

// ============================================================================
// Detecção de Formato
// ============================================================================

/**
 * Detecta o formato apropriado para um gráfico baseado na agregação e coluna Y
 */
export const detectChartFormat = (
  agg: AggregationType,
  yKey?: string
): ChartFormatType => {
  if (agg === 'count') return 'number';
  
  const key = yKey?.toLowerCase() || '';
  
  const currencyKeywords = [
    'receita', 'valor', 'faturamento', 'custo', 'preço', 
    'preco', 'total', 'subtotal', 'desconto', 'lucro'
  ];
  
  const percentageKeywords = [
    'percentual', 'porcentagem', 'taxa', 'percent', '%'
  ];
  
  if (currencyKeywords.some(kw => key.includes(kw))) {
    return 'currency';
  }
  
  if (percentageKeywords.some(kw => key.includes(kw))) {
    return 'percentage';
  }
  
  return 'number';
};

// ============================================================================
// Construção de Dados do Gráfico
// ============================================================================

interface GroupData {
  sum: number;
  count: number;
}

/**
 * Agrupa e processa os dados para construção de um gráfico
 */
export const buildChartData = (
  rows: Record<string, unknown>[],
  params: ChartBuildParams
): ChartDataPoint[] => {
  const { xKey, yKey, agg } = params;
  const groups = new Map<string, GroupData>();

  // Agrupar dados
  rows.forEach((row) => {
    const rawName = row?.[xKey];
    let name = normalizeGroupName(rawName);

    // Formatar datas para exibição
    if (isProbablyDate(rawName)) {
      const d = toDate(rawName);
      if (d) {
        name = formatDateBR(d);
      }
    }

    const current = groups.get(name) || { sum: 0, count: 0 };
    current.count += 1;

    if (agg !== 'count' && yKey) {
      current.sum += toNumber(row?.[yKey]);
    }

    groups.set(name, current);
  });

  // Calcular valores finais
  let data = Array.from(groups.entries()).map(([name, v]) => {
    const value = calculateAggregatedValue(agg, v);
    return { name, value };
  });

  // Aplicar ordenação inteligente
  data = applySorting(data, rows, xKey);

  return data.slice(0, 50);
};

/**
 * Normaliza o nome do grupo (trata valores vazios)
 */
const normalizeGroupName = (rawValue: unknown): string => {
  if (rawValue === null || rawValue === undefined) {
    return '(vazio)';
  }
  
  const strValue = String(rawValue).trim();
  return strValue === '' ? '(vazio)' : strValue;
};

/**
 * Calcula o valor agregado baseado no tipo de agregação
 */
const calculateAggregatedValue = (
  agg: AggregationType,
  groupData: GroupData
): number => {
  switch (agg) {
    case 'count':
      return groupData.count;
    case 'avg':
      return groupData.count > 0 ? groupData.sum / groupData.count : 0;
    case 'sum':
    default:
      return groupData.sum;
  }
};

/**
 * Aplica ordenação inteligente aos dados do gráfico
 */
const applySorting = (
  data: ChartDataPoint[],
  rows: Record<string, unknown>[],
  xKey: string
): ChartDataPoint[] => {
  const firstVal = rows[0]?.[xKey];

  // Se é uma coluna de data, ordenar cronologicamente
  if (isProbablyDate(firstVal)) {
    return sortChronologically(data);
  }

  // Para muitos itens, ordenar por valor e agrupar "Outros"
  if (data.length > 10) {
    return sortByValueWithOthers(data);
  }

  // Para poucos itens, manter ordem de aparição
  return sortByAppearanceOrder(data, rows, xKey);
};

/**
 * Ordena dados cronologicamente
 */
const sortChronologically = (data: ChartDataPoint[]): ChartDataPoint[] => {
  return [...data].sort((a, b) => {
    const da = toDate(a.name);
    const db = toDate(b.name);
    return (da?.getTime() || 0) - (db?.getTime() || 0);
  });
};

/**
 * Ordena por valor e agrupa itens menores em "Outros"
 */
const sortByValueWithOthers = (data: ChartDataPoint[]): ChartDataPoint[] => {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top9 = sorted.slice(0, 9);
  const others = sorted.slice(9);
  const othersSum = others.reduce((acc, d) => acc + d.value, 0);

  if (othersSum > 0) {
    return [...top9, { name: 'Outros', value: othersSum }];
  }
  
  return top9;
};

/**
 * Ordena pela ordem de aparição original nos dados
 */
const sortByAppearanceOrder = (
  data: ChartDataPoint[],
  rows: Record<string, unknown>[],
  xKey: string
): ChartDataPoint[] => {
  const orderMap = new Map<string, number>();
  
  rows.forEach((row, idx) => {
    const name = normalizeGroupName(row?.[xKey]);
    if (!orderMap.has(name)) {
      orderMap.set(name, idx);
    }
  });

  return [...data].sort((a, b) => {
    const orderA = orderMap.get(a.name) ?? 999999;
    const orderB = orderMap.get(b.name) ?? 999999;
    return orderA - orderB;
  });
};

// ============================================================================
// Validação de Gráfico
// ============================================================================

/**
 * Valida se os parâmetros do gráfico são válidos para construção
 */
export const validateChartParams = (
  params: Partial<ChartBuildParams>,
  hasData: boolean
): { valid: boolean; error?: string } => {
  if (!params.xKey) {
    return { valid: false, error: 'Selecione a coluna X' };
  }

  if (params.agg !== 'count' && !params.yKey) {
    return { valid: false, error: 'Selecione a coluna Y' };
  }

  if (!hasData) {
    return { valid: false, error: 'Sem dados para gerar gráficos' };
  }

  return { valid: true };
};

// ============================================================================
// Construção de Preview
// ============================================================================

/**
 * Constrói uma configuração de preview para o Chart Builder
 */
export const buildChartPreview = (
  params: {
    xKey: string;
    yKey: string;
    agg: AggregationType;
    type: ChartConfig['type'];
    title: string;
  },
  tableData: Record<string, unknown>[]
): ChartConfig | null => {
  if (!params.xKey) return null;
  if (params.agg !== 'count' && !params.yKey) return null;
  if (tableData.length === 0) return null;

  const data = buildChartData(tableData, {
    xKey: params.xKey,
    yKey: params.agg === 'count' ? undefined : params.yKey,
    agg: params.agg,
  });

  return {
    id: 'preview',
    type: params.type,
    title: params.title || 'Pré-visualização',
    data,
    xKey: params.xKey,
    yKey: params.agg === 'count' ? undefined : params.yKey,
    format: detectChartFormat(params.agg, params.yKey),
  };
};
