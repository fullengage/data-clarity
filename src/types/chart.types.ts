/**
 * Tipos para sistema de geração de gráficos com Python/Pandas
 */

export interface ChartType {
  id: string;
  name: string;
  description: string;
}

export interface ChartCategory {
  category: string;
  types: ChartType[];
}

export interface ChartConfig {
  type: string;
  x_column?: string;
  y_column?: string;
  title: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  color?: string;
  color_column?: string;
  size_column?: string;
  orientation?: 'v' | 'h';
  show_values?: boolean;
  // Campos específicos para candlestick
  date_column?: string;
  open_column?: string;
  high_column?: string;
  low_column?: string;
  close_column?: string;
}

export interface ChartGenerationRequest {
  dataset_id: string;
  chart_config: ChartConfig;
  data?: Array<Record<string, any>>;
}

export interface ChartGenerationResponse {
  success: boolean;
  chart_json?: string;
  chart_data?: {
    rows: Array<Record<string, any>>;
    columns: string[];
    row_count: number;
  };
  type?: string;
  error?: string;
}

export interface ChartTypesResponse {
  success: boolean;
  chart_types: ChartCategory[];
}
