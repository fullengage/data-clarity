/**
 * Utilitários de Construção de Gráficos para o ViewDashboard
 *
 * Este módulo fornece funções para:
 * - Detectar formatos de exibição (moeda, percentual, número)
 * - Construir e agregar dados para gráficos
 * - Validar parâmetros de configuração
 * - Gerar previews de gráficos
 */

import { ChartConfig } from '@/types/dashboard';
import {
  ChartBuildParams,
  ChartDataPoint,
  AggregationType,
  ChartFormatType,
} from '../types/viewDashboard.types';
import { isProbablyDate, toDate, toNumber, formatDateBR } from './dataUtils';

// ============================================================================
// Types
// ============================================================================

interface GroupData {
  sum: number;
  count: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ChartPreviewParams {
  xKey: string;
  yKey: string;
  agg: AggregationType;
  type: ChartConfig['type'];
  title: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Palavras-chave que indicam valores monetários */
const CURRENCY_KEYWORDS = [
  'receita',
  'valor',
  'faturamento',
  'custo',
  'preço',
  'preco',
  'total',
  'subtotal',
  'desconto',
  'lucro',
  'venda',
  'compra',
  'pagamento',
  'saldo',
] as const;

/** Palavras-chave que indicam valores percentuais */
const PERCENTAGE_KEYWORDS = [
  'percentual',
  'porcentagem',
  'taxa',
  'percent',
  '%',
  'margem',
  'crescimento',
  'variacao',
  'variação',
] as const;

/** Limite de itens para gráficos de data (séries temporais) */
const DATE_CHART_LIMIT = 50;

/** Limite de itens para gráficos categóricos */
const CATEGORY_CHART_LIMIT = 10;

/** Texto padrão para valores vazios */
const EMPTY_VALUE_LABEL = '(vazio)';

/** Ordem padrão para itens não encontrados no mapa de ordem */
const DEFAULT_SORT_ORDER = 999999;

// ============================================================================
// Detecção de Formato
// ============================================================================

/**
 * Verifica se uma string contém alguma das palavras-chave fornecidas
 */
const containsKeyword = (text: string, keywords: readonly string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

/**
 * Detecta o formato apropriado para um gráfico baseado na agregação e coluna Y
 *
 * @param agg - Tipo de agregação (sum, count, avg)
 * @param yKey - Nome da coluna Y (opcional)
 * @returns Formato detectado: 'currency', 'percentage' ou 'number'
 *
 * @example
 * detectChartFormat('sum', 'valor_total') // 'currency'
 * detectChartFormat('count') // 'number'
 * detectChartFormat('avg', 'taxa_conversao') // 'percentage'
 */
export const detectChartFormat = (
  agg: AggregationType,
  yKey?: string
): ChartFormatType => {
  // Contagem sempre retorna número
  if (agg === 'count') {
    return 'number';
  }

  const normalizedKey = yKey?.toLowerCase() ?? '';

  if (containsKeyword(normalizedKey, CURRENCY_KEYWORDS)) {
    return 'currency';
  }

  if (containsKeyword(normalizedKey, PERCENTAGE_KEYWORDS)) {
    return 'percentage';
  }

  return 'number';
};

// ============================================================================
// Normalização e Transformação
// ============================================================================

/**
 * Normaliza o nome do grupo, tratando valores nulos, undefined ou vazios
 *
 * @param rawValue - Valor bruto a ser normalizado
 * @returns String normalizada ou label de vazio
 */
const normalizeGroupName = (rawValue: unknown): string => {
  if (rawValue == null) {
    return EMPTY_VALUE_LABEL;
  }

  const strValue = String(rawValue).trim();
  return strValue || EMPTY_VALUE_LABEL;
};

/**
 * Formata um valor para exibição, convertendo datas se necessário
 *
 * @param rawValue - Valor bruto
 * @returns String formatada para exibição
 */
const formatDisplayName = (rawValue: unknown): string => {
  const baseName = normalizeGroupName(rawValue);

  if (isProbablyDate(rawValue)) {
    const date = toDate(rawValue);
    if (date) {
      return formatDateBR(date);
    }
  }

  return baseName;
};

// ============================================================================
// Cálculos de Agregação
// ============================================================================

/**
 * Calcula o valor agregado baseado no tipo de agregação
 *
 * @param agg - Tipo de agregação
 * @param groupData - Dados do grupo (soma e contagem)
 * @returns Valor calculado
 */
const calculateAggregatedValue = (
  agg: AggregationType,
  groupData: GroupData
): number => {
  const { sum, count } = groupData;

  switch (agg) {
    case 'count':
      return count;

    case 'avg':
      return count > 0 ? sum / count : 0;

    case 'sum':
    default:
      return sum;
  }
};

/**
 * Agrupa os dados por uma chave e acumula valores
 *
 * @param rows - Array de registros
 * @param xKey - Chave para agrupamento
 * @param yKey - Chave para valores (opcional)
 * @param agg - Tipo de agregação
 * @returns Map com grupos e seus dados acumulados
 */
const groupDataByKey = (
  rows: Record<string, unknown>[],
  xKey: string,
  yKey: string | undefined,
  agg: AggregationType
): Map<string, GroupData> => {
  const groups = new Map<string, GroupData>();

  for (const row of rows) {
    const rawValue = row?.[xKey];
    const name = formatDisplayName(rawValue);

    const current = groups.get(name) ?? { sum: 0, count: 0 };
    current.count += 1;

    if (agg !== 'count' && yKey) {
      current.sum += toNumber(row?.[yKey]);
    }

    groups.set(name, current);
  }

  return groups;
};

/**
 * Converte o Map de grupos para array de pontos de dados
 *
 * @param groups - Map de grupos
 * @param agg - Tipo de agregação
 * @returns Array de pontos de dados
 */
const convertGroupsToDataPoints = (
  groups: Map<string, GroupData>,
  agg: AggregationType
): ChartDataPoint[] =>
  Array.from(groups.entries()).map(([name, groupData]) => ({
    name,
    value: calculateAggregatedValue(agg, groupData),
  }));

// ============================================================================
// Ordenação
// ============================================================================

/**
 * Ordena dados cronologicamente (para séries temporais)
 */
const sortChronologically = (data: ChartDataPoint[]): ChartDataPoint[] =>
  [...data].sort((a, b) => {
    const dateA = toDate(a.name);
    const dateB = toDate(b.name);
    return (dateA?.getTime() ?? 0) - (dateB?.getTime() ?? 0);
  });

/**
 * Ordena por valor decrescente (maior para menor)
 */
const sortByValueDescending = (data: ChartDataPoint[]): ChartDataPoint[] =>
  [...data].sort((a, b) => b.value - a.value);

/**
 * Ordena pela ordem de aparição original nos dados
 */
const sortByAppearanceOrder = (
  data: ChartDataPoint[],
  rows: Record<string, unknown>[],
  xKey: string
): ChartDataPoint[] => {
  // Cria mapa de ordem baseado na primeira aparição
  const orderMap = new Map<string, number>();

  rows.forEach((row, index) => {
    const name = normalizeGroupName(row?.[xKey]);
    if (!orderMap.has(name)) {
      orderMap.set(name, index);
    }
  });

  return [...data].sort((a, b) => {
    const orderA = orderMap.get(a.name) ?? DEFAULT_SORT_ORDER;
    const orderB = orderMap.get(b.name) ?? DEFAULT_SORT_ORDER;
    return orderA - orderB;
  });
};

/**
 * Determina se os dados são baseados em datas
 */
const isDateBasedData = (rows: Record<string, unknown>[], xKey: string): boolean => {
  const firstValue = rows[0]?.[xKey];
  return isProbablyDate(firstValue);
};

/**
 * Aplica ordenação inteligente aos dados do gráfico
 *
 * Estratégias de ordenação:
 * - Datas: ordenação cronológica
 * - Muitos itens (>10): ordenação por valor, top 10
 * - Poucos itens: mantém ordem de aparição original
 */
const applySorting = (
  data: ChartDataPoint[],
  rows: Record<string, unknown>[],
  xKey: string
): ChartDataPoint[] => {
  // Séries temporais: ordenar cronologicamente
  if (isDateBasedData(rows, xKey)) {
    return sortChronologically(data);
  }

  // Muitos itens: ordenar por valor e limitar
  if (data.length > CATEGORY_CHART_LIMIT) {
    return sortByValueDescending(data).slice(0, CATEGORY_CHART_LIMIT);
  }

  // Poucos itens: manter ordem original
  return sortByAppearanceOrder(data, rows, xKey);
};

/**
 * Determina o limite de itens baseado no tipo de dados
 */
const getDataLimit = (rows: Record<string, unknown>[], xKey: string): number =>
  isDateBasedData(rows, xKey) ? DATE_CHART_LIMIT : CATEGORY_CHART_LIMIT;

// ============================================================================
// Construção de Dados do Gráfico
// ============================================================================

/**
 * Agrupa e processa os dados para construção de um gráfico
 *
 * @param rows - Array de registros da tabela
 * @param params - Parâmetros de construção do gráfico
 * @returns Array de pontos de dados processados e ordenados
 *
 * @example
 * const data = buildChartData(tableRows, {
 *   xKey: 'categoria',
 *   yKey: 'valor',
 *   agg: 'sum'
 * });
 */
export const buildChartData = (
  rows: Record<string, unknown>[],
  params: ChartBuildParams
): ChartDataPoint[] => {
  const { xKey, yKey, agg } = params;

  // Early return para dados vazios
  if (rows.length === 0) {
    return [];
  }

  // 1. Agrupar dados
  const groups = groupDataByKey(rows, xKey, yKey, agg);

  // 2. Converter para array de pontos
  let data = convertGroupsToDataPoints(groups, agg);

  // 3. Aplicar ordenação inteligente
  data = applySorting(data, rows, xKey);

  // 4. Aplicar limite baseado no tipo de dados
  const limit = getDataLimit(rows, xKey);
  return data.slice(0, limit);
};

// ============================================================================
// Validação
// ============================================================================

/**
 * Cria um resultado de validação com erro
 */
const invalidResult = (error: string): ValidationResult => ({
  valid: false,
  error,
});

/**
 * Resultado de validação bem-sucedida
 */
const validResult: ValidationResult = { valid: true };

/**
 * Valida se os parâmetros do gráfico são válidos para construção
 *
 * @param params - Parâmetros parciais do gráfico
 * @param hasData - Se existem dados disponíveis
 * @returns Objeto com status de validação e mensagem de erro (se houver)
 *
 * @example
 * const result = validateChartParams({ xKey: 'categoria' }, true);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export const validateChartParams = (
  params: Partial<ChartBuildParams>,
  hasData: boolean
): ValidationResult => {
  if (!hasData) {
    return invalidResult('Sem dados para gerar gráficos');
  }

  if (!params.xKey) {
    return invalidResult('Selecione a coluna X');
  }

  if (params.agg !== 'count' && !params.yKey) {
    return invalidResult('Selecione a coluna Y');
  }

  return validResult;
};

// ============================================================================
// Construção de Preview
// ============================================================================

/**
 * Verifica se os parâmetros são válidos para gerar preview
 */
const canBuildPreview = (
  params: ChartPreviewParams,
  dataLength: number
): boolean => {
  if (!params.xKey) return false;
  if (params.agg !== 'count' && !params.yKey) return false;
  if (dataLength === 0) return false;
  return true;
};

/**
 * Constrói uma configuração de preview para o Chart Builder
 *
 * @param params - Parâmetros de configuração do gráfico
 * @param tableData - Dados da tabela
 * @returns Configuração do gráfico ou null se inválido
 *
 * @example
 * const preview = buildChartPreview({
 *   xKey: 'mes',
 *   yKey: 'vendas',
 *   agg: 'sum',
 *   type: 'bar',
 *   title: 'Vendas por Mês'
 * }, tableData);
 */
export const buildChartPreview = (
  params: ChartPreviewParams,
  tableData: Record<string, unknown>[]
): ChartConfig | null => {
  if (!canBuildPreview(params, tableData.length)) {
    return null;
  }

  const { xKey, yKey, agg, type, title } = params;
  const effectiveYKey = agg === 'count' ? undefined : yKey;

  const data = buildChartData(tableData, {
    xKey,
    yKey: effectiveYKey,
    agg,
  });

  return {
    id: 'preview',
    type,
    title: title || 'Pré-visualização',
    data,
    xKey,
    yKey: effectiveYKey,
    format: detectChartFormat(agg, yKey),
  };
};

// ============================================================================
// Exports adicionais para testes
// ============================================================================

export const __testing__ = {
  normalizeGroupName,
  formatDisplayName,
  calculateAggregatedValue,
  sortChronologically,
  sortByValueDescending,
  sortByAppearanceOrder,
  containsKeyword,
  CURRENCY_KEYWORDS,
  PERCENTAGE_KEYWORDS,
};