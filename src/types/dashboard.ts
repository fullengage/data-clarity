export interface DashboardProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  fileName: string;
  fileType: 'excel' | 'csv' | 'google_sheets';
  status: 'processing' | 'ready' | 'error' | 'incomplete';
  createdAt: Date;
  updatedAt: Date;
  columns: ColumnInfo[];
  rowCount: number;
  metrics?: DashboardMetric[];
  charts?: ChartConfig[];
  insights?: string[];
  accessLevel?: 'private' | 'team';
}

export type DashboardIntent = 'sales' | 'customers' | 'products' | 'time' | 'operations' | 'production' | 'inventory' | 'growth' | 'financial' | 'unknown';

export interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'unknown';
  sampleValues?: string[];
  sample?: (string | number)[];
  nullCount?: number;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'orange' | 'green' | 'purple' | 'yellow' | 'red' | 'teal' | 'indigo' | 'pink';
  icon?: string;
  prefix?: string;
  suffix?: string;
  status?: 'good' | 'warning' | 'critical';
  insight?: string;
  format?: 'currency' | 'percentage' | 'number';
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'horizontal_bar';
  title: string;
  data: ChartDataPoint[];
  xKey?: string;
  yKey?: string;
  colors?: string[];
  // Builder config (usado para reconstruir dados)
  builder?: {
    xKey: string;
    yKey?: string;
    agg: 'count' | 'sum' | 'avg';
  };
  aggregation?: 'count' | 'sum' | 'avg';
  format?: 'currency' | 'number' | 'percentage';
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ProcessingResponse {
  status: 'success' | 'incomplete';
  projectId?: string;
  dashboard_id?: string;
  reason?: 'webhook_unavailable' | 'server_error' | 'insufficient_data' | 'parsing_error' | 'invalid_response' | 'invalid_schema';
  nextAction?: 'retry' | 'review' | 'upload';
  message?: string;
  metrics?: DashboardMetric[];
  charts?: ChartConfig[];
  insights?: string[];
  organizedData?: Record<string, unknown>[];
  error?: string;
}

// ========================================
// Interpretation Types (IA Response)
// ========================================

export interface SuggestedField {
  originalName: string;
  reference?: string;
  suggestedName: string;
  suggested?: string;
  suggestedType: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'email' | 'phone' | 'category' | 'unknown';
  confidence: number; // 0-1
  sampleValues?: string[];
  description?: string;
}

export interface DetectedPattern {
  type: 'date_format' | 'currency' | 'category' | 'sequence' | 'duplicate' | 'relationship';
  description: string;
  affectedColumns: string[];
  confidence: number;
}

export interface DetectedProblem {
  severity: 'info' | 'warning' | 'error';
  type: 'missing_values' | 'inconsistent_format' | 'duplicate_rows' | 'mixed_types' | 'encoding' | 'empty_column';
  description: string;
  affectedColumns: string[];
  suggestedFix?: string;
  rowCount?: number;
}

export interface InterpretationResult {
  id: string;
  sourceId: string;
  suggestedFields: SuggestedField[];
  detectedPatterns: DetectedPattern[];
  detectedProblems: DetectedProblem[];
  overallConfidence: number;
  datasetType?: 'vendas' | 'estoque' | 'contatos' | 'financeiro' | 'generico';
  summary?: string;
  createdAt: Date;
}

// Column mapping state for the canvas
export interface ColumnMapping {
  originalName: string;
  mappedName: string;
  mappedType: SuggestedField['suggestedType'];
  status: 'pending' | 'confirmed' | 'edited' | 'ignored';
  confidence: number;
}

// ========================================
// Semantic Map Types
// ========================================

export interface SemanticMapEntry {
  field: string;
  entity: 'cliente' | 'produto' | 'pedido' | 'valor' | 'data' | 'quantidade' | 'status' | 'outro';
}

export interface SemanticDataset {
  id: string;
  structuredDatasetId: string;
  datasetType: 'vendas' | 'financeiro' | 'estoque' | 'producao' | 'clientes' | 'generico';
  entities: Record<string, string[]>;
  semanticMap: SemanticMapEntry[];
  confidence: number;
  createdAt: Date;
}

// ========================================
// Dashboard Widget Types
// ========================================

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  type: 'metric' | 'chart';
  config: DashboardMetric | ChartConfig;
  position: WidgetPosition;
  createdAt: Date;
}

// ========================================
// API Response Types
// ========================================

export interface WebhookPayload {
  user_id: string;
  intent: DashboardIntent;
  file: {
    name: string;
    type: string;
    columns: string[];
    row_count: number;
  };
  sample_data: Record<string, unknown>[];
  timestamp: string;
}

export interface WebhookSuccessResponse {
  status: 'success';
  projectId: string;
  dashboard_id: string;
  metrics: DashboardMetric[];
  charts: ChartConfig[];
  insights: string[];
  organizedData?: Record<string, unknown>[];
}

export interface WebhookErrorResponse {
  status: 'error' | 'incomplete';
  reason: string;
  message: string;
  nextAction?: 'retry' | 'review' | 'upload';
}

export type WebhookResponse = WebhookSuccessResponse | WebhookErrorResponse;

// ========================================
// AI Card Assistant Types
// ========================================

export interface AIWidgetRequest {
  userId: string;
  dashboardId: string;
  prompt: string;
  context: {
    columns: ColumnInfo[];
    semanticMap: SemanticMapEntry[];
    intent: DashboardIntent;
    rowCount: number;
    fileName: string;
  };
}

export interface AIWidgetResponse {
  status: 'success' | 'error';
  widgetConfig: DashboardMetric | ChartConfig;
  type: 'metric' | 'chart';
  message?: string;
}

// ========================================
// AI Decision Types (New structure)
// ========================================

export interface AiMetricDecision {
  name: string;
  description: string;
  calculation: string;
}

export interface AiChartDecision {
  type: 'bar' | 'line' | 'pie' | 'area' | 'horizontal_bar';
  title: string;
  x_field: string;
  y_field: string;
  description: string;
}

export interface AiDecision {
  dataset_type: string;
  field_map: Record<string, string>;
  metrics: AiMetricDecision[];
  charts: AiChartDecision[];
  confidence: number;
}

