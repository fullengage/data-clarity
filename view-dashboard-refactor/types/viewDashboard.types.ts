import { DashboardIntent, DashboardProject, DashboardMetric, ChartConfig } from '@/types/dashboard';

// ============================================================================
// Estado do Dashboard
// ============================================================================

export interface DashboardState {
  dashboard: DashboardProject | null;
  isRefreshing: boolean;
  isLoadingData: boolean;
  tableData: Record<string, unknown>[];
  tableColumns: string[];
  structuredDatasetId: string | null;
  semanticDatasetId: string | null;
  intent: DashboardIntent;
}

// ============================================================================
// Estado dos Editores
// ============================================================================

export interface ChartBuilderState {
  isOpen: boolean;
  isSaving: boolean;
  editingChartId: string | null;
  title: string;
  type: ChartConfig['type'];
  xKey: string;
  yKey: string;
  agg: AggregationType;
}

export interface MetricEditorState {
  isOpen: boolean;
  isSaving: boolean;
  editingMetric: DashboardMetric | null;
  label: string;
  value: string;
  icon: string;
  color: string;
  prefix: string;
  suffix: string;
}

export interface RowEditorState {
  isOpen: boolean;
  isSaving: boolean;
  editingRowIndex: number | null;
  editingRowData: Record<string, unknown> | null;
}

export interface FormulaEditorState {
  isOpen: boolean;
  formulaToEdit: { name: string; formula: string } | null;
}

export interface VisibilityDialogState {
  isOpen: boolean;
  isUpdating: boolean;
}

// ============================================================================
// Tipos de Agregação e Formato
// ============================================================================

export type AggregationType = 'count' | 'sum' | 'avg';

export type ChartFormatType = 'number' | 'currency' | 'percentage';

// ============================================================================
// Parâmetros de Construção de Gráfico
// ============================================================================

export interface ChartBuildParams {
  xKey: string;
  yKey?: string;
  agg: AggregationType;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

// ============================================================================
// Ações de Atalho Financeiro
// ============================================================================

export interface FinanceShortcut {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}

// ============================================================================
// Sugestões de AI
// ============================================================================

export interface AiSuggestion {
  label: string;
  prompt: string;
}

// ============================================================================
// Estrutura de Coluna
// ============================================================================

export interface ColumnStructure {
  name: string;
  type: string;
  formula?: string;
}

// ============================================================================
// Props de Componentes Internos
// ============================================================================

export interface DashboardHeaderProps {
  dashboard: DashboardProject;
  intent: DashboardIntent;
  selectedPeriod: string;
  isRefreshing: boolean;
  onPeriodChange: (period: string) => void;
  onIntentChange: (intent: DashboardIntent) => void;
  onRefresh: () => void;
  onShare: () => void;
  onExport: () => void;
}

export interface AiPromptSectionProps {
  prompt: string;
  isProcessing: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerateCard: () => void;
  onCalculateColumn: () => void;
}

export interface InsightsBannerProps {
  insights: string[];
}
