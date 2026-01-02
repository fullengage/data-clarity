export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    category: 'vendas' | 'financeiro' | 'producao' | 'clientes' | 'estoque' | 'marketing';
    tags: string[];
    icon: string;
    gradient: string;

    // Estrutura esperada
    expectedColumns: TemplateColumn[];

    // Configurações de visualização
    defaultMetrics: MetricTemplate[];
    defaultCharts: ChartTemplate[];

    // Mensagens contextualizadas
    uploadPrompt: string;
    uploadHint: string;
    errorMessages: Record<string, string>;
}

export interface TemplateColumn {
    semanticName: string;
    displayName: string;
    type: 'text' | 'number' | 'date' | 'currency' | 'percentage';
    category?: 'tempo' | 'valores' | 'quantidade' | 'organizacao' | 'descritivo';
    required: boolean;
    aliases: string[];
    description?: string;
}

export interface MetricTemplate {
    id: string;
    label: string;
    icon:
    | 'dollar'
    | 'users'
    | 'cart'
    | 'chart'
    | 'box'
    | 'percent'
    | 'trending-up'
    | 'trending-down'
    | 'package'
    | 'target'
    | 'activity'
    | 'briefcase'
    | 'user'
    | 'credit-card'
    | 'calendar';
    color: 'blue' | 'orange' | 'green' | 'purple' | 'yellow' | 'red' | 'teal' | 'pink';
    aggregation: 'sum' | 'count' | 'avg' | 'max' | 'min' | 'count-distinct';
    sourceColumn: string; // Nome semântico
    fallbackColumn?: string; // Coluna de escape caso a principal não exista
    description?: string;
    prefix?: string;
    suffix?: string;
    format?: 'currency' | 'number' | 'percentage';
}

export interface ChartTemplate {
    id: string;
    type: 'bar' | 'pie' | 'line' | 'area' | 'horizontal_bar';
    title: string;
    xColumn: string; // Nome semântico
    yColumn: string; // Nome semântico
    aggregation: 'count' | 'sum' | 'avg' | 'count-distinct';
    limit?: number;
    sortBy?: 'value' | 'label';
    sortOrder?: 'asc' | 'desc';
}
