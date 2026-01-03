/**
 * New Dashboard Architecture Types
 * Backend-driven, card-first, AI as conversational assistant only
 */

// ============================================================================
// CARD TYPES (Backend-calculated)
// ============================================================================

export type CardType = 
  | 'abc_curve'
  | 'pareto'
  | 'trend'
  | 'top_ranking'
  | 'calculated_column'
  | 'attention_points'
  | 'metric'
  | 'chart';

export type CardStatus = 'normal' | 'warning' | 'critical';

export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  icon?: string;
  status?: CardStatus;
  order?: number;
}

export interface ABCCurveCard extends BaseCard {
  type: 'abc_curve';
  data: {
    classA: { count: number; percentage: number; value: number };
    classB: { count: number; percentage: number; value: number };
    classC: { count: number; percentage: number; value: number };
  };
  insight?: string;
}

export interface ParetoCard extends BaseCard {
  type: 'pareto';
  data: {
    top20Percentage: number;
    items: Array<{ name: string; value: number; accumulated: number }>;
  };
  insight?: string;
}

export interface TrendCard extends BaseCard {
  type: 'trend';
  data: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
    series: Array<{ period: string; value: number }>;
  };
  insight?: string;
}

export interface TopRankingCard extends BaseCard {
  type: 'top_ranking';
  data: {
    items: Array<{ 
      rank: number; 
      name: string; 
      value: number; 
      percentage?: number;
    }>;
    total: number;
  };
  insight?: string;
}

export interface CalculatedColumnCard extends BaseCard {
  type: 'calculated_column';
  data: {
    columnName: string;
    formula: string;
    sampleValues: Array<{ original: Record<string, any>; calculated: number }>;
    stats: {
      min: number;
      max: number;
      avg: number;
      sum: number;
    };
  };
  insight?: string;
}

export interface AttentionPointsCard extends BaseCard {
  type: 'attention_points';
  data: {
    points: Array<{
      severity: 'low' | 'medium' | 'high';
      message: string;
      affectedItems?: string[];
    }>;
  };
}

export interface MetricCard extends BaseCard {
  type: 'metric';
  data: {
    value: string | number;
    prefix?: string;
    suffix?: string;
    change?: number;
    changeLabel?: string;
    secondaryInfo?: string;
  };
  insight?: string;
}

export interface ChartCard extends BaseCard {
  type: 'chart';
  data: {
    chartType: 'line' | 'bar' | 'pie' | 'area';
    series: Array<{ name: string; value: number }>;
    xAxisLabel?: string;
    yAxisLabel?: string;
    format?: 'currency' | 'percentage' | 'number';
  };
  insight?: string;
}

export type DashboardCard = 
  | ABCCurveCard
  | ParetoCard
  | TrendCard
  | TopRankingCard
  | CalculatedColumnCard
  | AttentionPointsCard
  | MetricCard
  | ChartCard;

// ============================================================================
// DASHBOARD DATA STATUS
// ============================================================================

export type DashboardDataStatus = 'updated' | 'attention' | 'partial' | 'loading';

export interface DashboardStatus {
  status: DashboardDataStatus;
  lastUpdate?: Date;
  message?: string;
  warnings?: string[];
}

// ============================================================================
// MAIN DASHBOARD STRUCTURE
// ============================================================================

export interface DashboardData {
  id: string;
  title: string;
  description?: string;
  status: DashboardStatus;
  cards: DashboardCard[];
  charts: ChartCard[];
  alerts: AttentionPointsCard[];
  tableData?: {
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
  };
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    dataSource: string;
    rowCount: number;
    columnCount: number;
  };
}

// ============================================================================
// CHAT TYPES (Conversational only - NO calculations)
// ============================================================================

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  relatedCardId?: string;
}

export interface ChatContext {
  dashboardId: string;
  aiDecisionId?: string; // ID da decisão de IA (fonte da verdade para métricas/charts)
  availableCards: Array<{ id: string; type: CardType; title: string }>;
  currentMetrics: Record<string, number | string>;
  recentAlerts: string[];
}

export interface ChatResponse {
  message: string;
  suggestedQuestions?: string[];
  relatedCards?: string[];
}

// ============================================================================
// BACKEND API CONTRACTS
// ============================================================================

export interface DashboardApiResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
}

export interface ChatApiRequest {
  dashboardId: string;
  message: string;
  context: ChatContext;
  conversationHistory: ChatMessage[];
}

export interface ChatApiResponse {
  success: boolean;
  data?: ChatResponse;
  error?: string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface DashboardHeaderProps {
  title: string;
  description?: string;
  status: DashboardStatus;
  onRefresh?: () => void;
  onExport?: () => void;
  onShare?: () => void;
}

export interface CardGridProps {
  cards: DashboardCard[];
  onCardClick?: (card: DashboardCard) => void;
}

export interface ChartSectionProps {
  charts: ChartCard[];
  onChartClick?: (chart: ChartCard) => void;
}

export interface TableSectionProps {
  data: DashboardData['tableData'];
  maxRows?: number;
}

export interface DashboardChatProps {
  dashboardId: string;
  context: ChatContext;
  position?: 'right' | 'bottom';
  isOpen?: boolean;
  onToggle?: () => void;
}
