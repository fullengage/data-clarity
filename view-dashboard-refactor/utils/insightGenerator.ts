/**
 * Gerador de Insights Automático para ViewDashboard
 */

import { DashboardProject, ChartConfig, DashboardMetric } from '@/types/dashboard';
import { 
  isProbablyNumber, 
  isProbablyDate, 
  toDate, 
  formatDateBR,
  calculateFilledRate 
} from './dataUtils';

// ============================================================================
// Tipos
// ============================================================================

interface InsightGeneratorContext {
  tableData: Record<string, unknown>[];
  tableColumns: string[];
  dashboard?: DashboardProject | null;
}

// ============================================================================
// Geração Principal
// ============================================================================

/**
 * Gera insights automáticos baseados nos dados do dashboard
 */
export const generateInsights = (context: InsightGeneratorContext): string[] => {
  const { tableData, tableColumns, dashboard } = context;
  const insights: string[] = [];

  // Insights básicos de estrutura
  insights.push(...generateStructureInsights(tableData, tableColumns));

  // Insights de qualidade dos dados
  insights.push(...generateQualityInsights(tableData, tableColumns));

  // Insights de colunas
  insights.push(...generateColumnInsights(tableData, tableColumns));

  // Insights de período temporal
  insights.push(...generateTemporalInsights(tableData, tableColumns));

  // Insights de negócio (se houver dashboard)
  if (dashboard) {
    insights.push(...generateBusinessInsights(dashboard));
  }

  // Limitar a 8 insights mais relevantes
  return insights.slice(0, 8);
};

// ============================================================================
// Insights de Estrutura
// ============================================================================

const generateStructureInsights = (
  rows: Record<string, unknown>[],
  columns: string[]
): string[] => {
  const insights: string[] = [];
  const rowCount = rows.length;
  const colCount = columns.length;

  insights.push(
    `Dataset com ${rowCount.toLocaleString('pt-BR')} linha(s) e ${colCount} coluna(s).`
  );

  if (rowCount === 0 || colCount === 0) {
    insights.push(
      'Não há dados suficientes para gerar insights. Verifique se a tabela foi importada corretamente.'
    );
  }

  return insights;
};

// ============================================================================
// Insights de Qualidade
// ============================================================================

const generateQualityInsights = (
  rows: Record<string, unknown>[],
  columns: string[]
): string[] => {
  const insights: string[] = [];
  
  if (rows.length === 0) return insights;

  const filledRate = calculateFilledRate(rows, columns);
  insights.push(
    `Completude aproximada: ${Math.round(filledRate * 100)}% das células preenchidas.`
  );

  return insights;
};

// ============================================================================
// Insights de Colunas
// ============================================================================

const generateColumnInsights = (
  rows: Record<string, unknown>[],
  columns: string[]
): string[] => {
  const insights: string[] = [];
  
  if (rows.length === 0) return insights;

  const numericCols = findColumnsOfType(rows, columns, 'numeric');
  
  if (numericCols.length > 0) {
    const displayCols = numericCols.slice(0, 4).join(', ');
    const suffix = numericCols.length > 4 ? '…' : '';
    insights.push(`Colunas numéricas detectadas: ${displayCols}${suffix}.`);
  }

  return insights;
};

// ============================================================================
// Insights Temporais
// ============================================================================

const generateTemporalInsights = (
  rows: Record<string, unknown>[],
  columns: string[]
): string[] => {
  const insights: string[] = [];
  
  if (rows.length === 0) return insights;

  const dateCols = findColumnsOfType(rows, columns, 'date');
  
  if (dateCols.length > 0) {
    const col = dateCols[0];
    const dates = rows
      .map((r) => toDate(r?.[col]))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length >= 2) {
      const firstDate = formatDateBR(dates[0]);
      const lastDate = formatDateBR(dates[dates.length - 1]);
      insights.push(`Período detectado (${col}): de ${firstDate} até ${lastDate}.`);
    }
  }

  return insights;
};

// ============================================================================
// Insights de Negócio
// ============================================================================

const generateBusinessInsights = (dashboard: DashboardProject): string[] => {
  const insights: string[] = [];
  const charts = dashboard.charts || [];
  const metrics = dashboard.metrics || [];

  // Análise de concentração em gráficos
  insights.push(...analyzeChartConcentration(charts));

  // Análise de performance em métricas
  insights.push(...analyzeMetricPerformance(metrics));

  return insights;
};

/**
 * Analisa concentração excessiva em categorias dos gráficos
 */
const analyzeChartConcentration = (charts: ChartConfig[]): string[] => {
  const insights: string[] = [];

  charts.forEach((chart) => {
    if (!chart.data || chart.data.length === 0) return;

    const total = chart.data.reduce((acc, d) => acc + (d.value || 0), 0);
    if (total === 0) return;

    const sortedData = [...chart.data].sort((a, b) => (b.value || 0) - (a.value || 0));
    const topItem = sortedData[0];
    
    if (topItem) {
      const share = topItem.value / total;
      if (share > 0.4) {
        insights.push(
          `⚠️ ALERTA DE CONCENTRAÇÃO: O item "${topItem.name}" representa ${Math.round(share * 100)}% de "${chart.title}".`
        );
      }
    }
  });

  return insights;
};

/**
 * Analisa performance das métricas com base em variação
 */
const analyzeMetricPerformance = (metrics: DashboardMetric[]): string[] => {
  const insights: string[] = [];

  metrics.forEach((m) => {
    if (m.change === undefined) return;

    if (m.change < -10) {
      insights.push(
        `🚨 QUEDA CRÍTICA: "${m.label}" caiu ${Math.abs(m.change)}% em relação ao período anterior.`
      );
    } else if (m.change > 15) {
      insights.push(
        `🚀 EXCELENTE DESEMPENHO: "${m.label}" cresceu ${m.change}%!`
      );
    }
  });

  return insights;
};

// ============================================================================
// Helpers
// ============================================================================

type ColumnType = 'numeric' | 'date';

/**
 * Encontra colunas de um tipo específico
 */
const findColumnsOfType = (
  rows: Record<string, unknown>[],
  columns: string[],
  type: ColumnType,
  sampleSize = 50,
  threshold = 0.6
): string[] => {
  const checkFn = type === 'numeric' ? isProbablyNumber : isProbablyDate;
  
  return columns.filter((col) => {
    const sample = rows.slice(0, sampleSize).map((r) => r?.[col]);
    const hits = sample.filter((v) => checkFn(v)).length;
    const minHits = Math.max(3, Math.ceil(sample.length * threshold));
    return hits >= minHits;
  });
};
