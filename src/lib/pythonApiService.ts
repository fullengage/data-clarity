import { ParsedFileData } from './fileParser';
import { ProcessingResponse, DashboardMetric, ChartConfig } from '@/types/dashboard';

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL;

if (!PYTHON_API_URL) {
  throw new Error(
    "ERRO CRÍTICO: A variável de ambiente VITE_PYTHON_API_URL não está definida. " +
    "Verifique o arquivo .env e faça rebuild do frontend."
  );
}

/**
 * Python Engine Service - Substituição do N8N
 * 
 * Arquitetura: A IA interpreta, o pandas CALCULA.
 * 
 * Responsabilidades:
 * - Comunicação com API Python para cálculos
 * - Fallback para processamento local
 * - Cache de resultados
 * - Retry com exponential backoff
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
    apiUrl: PYTHON_API_URL,
    timeouts: {
        health: 5_000,
        metrics: 30_000,
        chart: 15_000,
        dashboard: 60_000,
    },
    retry: {
        maxAttempts: 3,
        baseDelay: 1_000,
        maxDelay: 10_000,
    },
    cache: {
        ttl: 5 * 60 * 1000, // 5 minutos
    },
    limits: {
        maxMetrics: 8,
        maxCharts: 6,
        maxChartItems: 10,
        sampleSize: 20,
    },
} as const;

// ============================================================================
// TIPOS
// ============================================================================

type ColumnType = 'currency' | 'number' | 'date' | 'category' | 'text';
type ChartType = 'bar' | 'line' | 'pie' | 'area';
type MetricFormat = 'currency' | 'percentage' | 'number';
type ApiStatus = 'success' | 'error';

interface ApiResponse<T> {
    status: ApiStatus;
    data?: T;
    error?: string;
}

interface MetricsPayload {
    metrics: Record<string, number | string>;
    column_types: Record<string, string>;
    row_count: number;
    _meta?: Record<string, unknown>;
}

interface ChartDataPayload {
    data: Array<{ name: string; value: number }>;
    config: { x: string; y: string; agg: string };
}

interface ChartSuggestion {
    type: ChartType;
    title: string;
    x: string;
    y: string;
    agg: string;
}

interface DashboardPayload {
    metrics: Record<string, number | string>;
    charts: Record<string, Array<{ name: string; value: number }>>;
    preview: Record<string, unknown>[];
    suggestions: ChartSuggestion[];
    column_types: Record<string, string>;
    timestamp: string;
    _meta?: Record<string, unknown>;
}

interface ChartSuggestionsPayload {
    suggestions: ChartSuggestion[];
    columns: string[];
    column_types: Record<string, string>;
}

interface CalculateMetricsOptions {
    sheet?: string;
    blockIndex?: number;
    financial?: boolean;
}

interface ChartDataOptions {
    x: string;
    y: string;
    agg?: string;
    sheet?: string;
    blockIndex?: number;
}

interface BuildDashboardOptions {
    sheet?: string;
    blockIndex?: number;
}

// Erros customizados
class PythonApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly endpoint?: string,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'PythonApiError';
    }
}

class ValidationError extends Error {
    constructor(message: string, public readonly field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ============================================================================
// CACHE SIMPLES
// ============================================================================

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CONFIG.cache.ttl) {
        cache.delete(key);
        return null;
    }
    
    return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

function generateCacheKey(prefix: string, file: File, options?: object): string {
    const optStr = options ? JSON.stringify(options) : '';
    return `${prefix}:${file.name}:${file.size}:${file.lastModified}:${optStr}`;
}

// ============================================================================
// UTILITÁRIOS HTTP
// ============================================================================

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    endpoint: string
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= CONFIG.retry.maxAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // Tentar ler corpo da resposta para mais detalhes
                let errorDetail = '';
                try {
                    const text = await response.text();
                    errorDetail = text.substring(0, 200);
                } catch {
                    // Ignorar se não conseguir ler
                }
                
                throw new PythonApiError(
                    `API retornou status ${response.status}${errorDetail ? ': ' + errorDetail : ''}`,
                    response.status,
                    endpoint
                );
            }
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new PythonApiError(
                    data.error || 'Erro desconhecido da API',
                    undefined,
                    endpoint
                );
            }
            
            return data as T;
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // Detectar erro de CORS/Network (TypeError: Failed to fetch)
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error(`🚫 [${endpoint}] Erro de CORS ou servidor inacessível`);
                console.error('   Causa provável: Erro 500 no servidor impedindo headers CORS');
                console.error('   Solução: Verificar logs do servidor Python');
                
                // NÃO fazer retry em erro de CORS - vai falhar igual
                throw new PythonApiError(
                    'Erro de CORS ou servidor com erro 500 (verifique logs do backend)',
                    undefined,
                    endpoint,
                    lastError
                );
            }
            
            // Não retry em erros de validação ou 4xx
            if (error instanceof PythonApiError && error.statusCode && error.statusCode < 500) {
                throw error;
            }
            
            // Erro 500: tentar apenas 1 vez (provavelmente erro de código, não transitório)
            if (error instanceof PythonApiError && error.statusCode === 500) {
                console.error(`❌ [${endpoint}] Erro 500 no servidor - não fará retry`);
                throw error;
            }
            
            // Não retry no último attempt
            if (attempt === CONFIG.retry.maxAttempts) break;
            
            // Exponential backoff
            const delay = Math.min(
                CONFIG.retry.baseDelay * Math.pow(2, attempt - 1),
                CONFIG.retry.maxDelay
            );
            
            console.warn(`⚠️ [Python API] Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    
    throw new PythonApiError(
        `Falha após ${CONFIG.retry.maxAttempts} tentativas`,
        undefined,
        endpoint,
        lastError ?? undefined
    );
}

function buildFormData(file: File, options?: Record<string, string | number | boolean>): FormData {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options) {
        for (const [key, value] of Object.entries(options)) {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        }
    }
    
    return formData;
}

// ============================================================================
// API PÚBLICA
// ============================================================================

/**
 * Obtém URL base da API Python
 */
export function getPythonApiUrl(): string {
    return CONFIG.apiUrl;
}

/**
 * Verifica se a API Python está disponível
 */
export async function checkPythonApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(CONFIG.timeouts.health),
        });

        if (!response.ok) return false;
        
        const data = await response.json();
        console.log('✅ [Python API] Health check:', data);
        return data.status === 'ok';
        
    } catch (error) {
        console.warn('⚠️ [Python API] Health check failed:', error);
        return false;
    }
}

/**
 * Envia arquivo para a API Python e recebe métricas calculadas
 */
export async function calculateMetrics(
    file: File,
    options: CalculateMetricsOptions = {}
): Promise<ApiResponse<MetricsPayload>> {
    const cacheKey = generateCacheKey('metrics', file, options);
    const cached = getCached<ApiResponse<MetricsPayload>>(cacheKey);
    if (cached) {
        console.log('📊 [Python API] Metrics from cache');
        return cached;
    }

    console.log('📊 [Python API] Calculating metrics...', { fileName: file.name, ...options });

    const formData = buildFormData(file, {
        ...(options.sheet && { sheet: options.sheet }),
        ...(options.blockIndex !== undefined && { block_index: options.blockIndex }),
        ...(options.financial && { financial: true }),
    });

    const result = await fetchWithRetry<ApiResponse<MetricsPayload>>(
        `${CONFIG.apiUrl}/calculate-metrics`,
        { method: 'POST', body: formData },
        CONFIG.timeouts.metrics,
        'calculate-metrics'
    );

    setCache(cacheKey, result);
    return result;
}

/**
 * Obtém dados agregados para um gráfico específico
 */
export async function getChartData(
    file: File,
    config: ChartDataOptions
): Promise<ApiResponse<ChartDataPayload>> {
    if (!config.x || !config.y) {
        throw new ValidationError('Colunas x e y são obrigatórias', 'config');
    }

    const cacheKey = generateCacheKey('chart', file, config);
    const cached = getCached<ApiResponse<ChartDataPayload>>(cacheKey);
    if (cached) {
        console.log('📈 [Python API] Chart data from cache');
        return cached;
    }

    console.log('📈 [Python API] Getting chart data...', config);

    const formData = buildFormData(file, {
        x: config.x,
        y: config.y,
        agg: config.agg || 'sum',
        ...(config.sheet && { sheet: config.sheet }),
        ...(config.blockIndex !== undefined && { block_index: config.blockIndex }),
    });

    const result = await fetchWithRetry<ApiResponse<ChartDataPayload>>(
        `${CONFIG.apiUrl}/chart-data`,
        { method: 'POST', body: formData },
        CONFIG.timeouts.chart,
        'chart-data'
    );

    setCache(cacheKey, result);
    return result;
}

/**
 * Gera dashboard completo com métricas e gráficos automáticos
 */
export async function buildDashboard(
    file: File,
    options: BuildDashboardOptions = {}
): Promise<ApiResponse<DashboardPayload>> {
    const cacheKey = generateCacheKey('dashboard', file, options);
    const cached = getCached<ApiResponse<DashboardPayload>>(cacheKey);
    if (cached) {
        console.log('🎨 [Python API] Dashboard from cache');
        return cached;
    }

    console.log('🎨 [Python API] Building dashboard...', { fileName: file.name, ...options });

    const formData = buildFormData(file, {
        ...(options.sheet && { sheet: options.sheet }),
        ...(options.blockIndex !== undefined && { block_index: options.blockIndex }),
    });

    const result = await fetchWithRetry<ApiResponse<DashboardPayload>>(
        `${CONFIG.apiUrl}/build-dashboard`,
        { method: 'POST', body: formData },
        CONFIG.timeouts.dashboard,
        'build-dashboard'
    );

    setCache(cacheKey, result);
    return result;
}

/**
 * Obtém sugestões de gráficos baseadas nas colunas
 */
export async function getChartSuggestions(
    file: File,
    options: BuildDashboardOptions = {}
): Promise<ApiResponse<ChartSuggestionsPayload>> {
    const cacheKey = generateCacheKey('suggestions', file, options);
    const cached = getCached<ApiResponse<ChartSuggestionsPayload>>(cacheKey);
    if (cached) {
        console.log('💡 [Python API] Suggestions from cache');
        return cached;
    }

    console.log('💡 [Python API] Getting chart suggestions...', { fileName: file.name });

    const formData = buildFormData(file, {
        ...(options.sheet && { sheet: options.sheet }),
        ...(options.blockIndex !== undefined && { block_index: options.blockIndex }),
    });

    const result = await fetchWithRetry<ApiResponse<ChartSuggestionsPayload>>(
        `${CONFIG.apiUrl}/chart-suggestions`,
        { method: 'POST', body: formData },
        CONFIG.timeouts.chart,
        'chart-suggestions'
    );

    setCache(cacheKey, result);
    return result;
}

// ============================================================================
// PROCESSAMENTO LOCAL (FALLBACK)
// ============================================================================

// Padrões para detecção de tipos de coluna
const COLUMN_TYPE_PATTERNS: Record<ColumnType, RegExp> = {
    currency: /valor|preco|preço|custo|receita|total|faturamento|r\$|revenue|cost|price/i,
    date: /data|date|periodo|período|mes|mês|ano|year|month/i,
    number: /quantidade|qtd|qty|volume|unidades|count|amount/i,
    category: /cliente|produto|vendedor|categoria|status|tipo|type|category|name|nome/i,
    text: /./,
};

// Labels amigáveis para métricas
const METRIC_LABELS: Record<string, string> = {
    linhas: 'Total de Registros',
    colunas: 'Total de Colunas',
    faturamento_total: 'Faturamento Total',
    receita_total: 'Receita Total',
    custo_total: 'Custo Total',
    lucro_bruto: 'Lucro Bruto',
    margem_bruta: 'Margem Bruta',
    ticket_medio: 'Ticket Médio',
    quantidade_total: 'Quantidade Total',
    valor_total: 'Valor Total',
    valor_media: 'Valor Médio',
};

// Identificadores de formato
const FORMAT_IDENTIFIERS = {
    currency: ['faturamento', 'receita', 'custo', 'lucro', 'valor', 'ticket', 'price', 'revenue'],
    percentage: ['margem', 'percent', 'taxa', 'rate'],
} as const;

/**
 * Converte valor para número, tratando formatos brasileiros
 */
function parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value == null) return NaN;
    if (typeof value !== 'string') return NaN;

    const cleaned = value
        .replace(/R\$|\s|%/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Detecta tipo de coluna baseado em nome e valores
 */
function detectColumnType(columnName: string, sampleValues: unknown[]): ColumnType {
    // Primeiro tenta por nome
    for (const [type, pattern] of Object.entries(COLUMN_TYPE_PATTERNS)) {
        if (type !== 'text' && pattern.test(columnName)) {
            return type as ColumnType;
        }
    }

    // Depois por valores
    const nonNull = sampleValues.filter(v => v != null).slice(0, 10);
    if (nonNull.length === 0) return 'text';

    const numericCount = nonNull.filter(v => !isNaN(parseNumber(v))).length;
    const numericRatio = numericCount / nonNull.length;

    if (numericRatio >= 0.7) return 'number';

    const uniqueCount = new Set(nonNull.map(String)).size;
    const uniqueRatio = uniqueCount / nonNull.length;

    if (uniqueRatio < 0.5) return 'category';

    return 'text';
}

/**
 * Analisa colunas e retorna classificação
 */
function analyzeColumns(
    data: Record<string, unknown>[],
    columnNames: string[]
): { types: Record<string, ColumnType>; numeric: string[]; category: string[] } {
    const types: Record<string, ColumnType> = {};
    const numeric: string[] = [];
    const category: string[] = [];

    for (const col of columnNames) {
        const sample = data.slice(0, CONFIG.limits.sampleSize).map(row => row[col]);
        const type = detectColumnType(col, sample);
        types[col] = type;

        if (type === 'currency' || type === 'number') {
            numeric.push(col);
        } else if (type === 'category') {
            category.push(col);
        }
    }

    return { types, numeric, category };
}

/**
 * Calcula estatísticas para coluna numérica
 */
function calculateColumnStats(
    data: Record<string, unknown>[],
    column: string
): { sum: number; avg: number; min: number; max: number; count: number } | null {
    const values = data
        .map(row => parseNumber(row[column]))
        .filter(v => !isNaN(v));

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Arredondar para 2 casas decimais
    const round = (n: number) => Math.round(n * 100) / 100;

    return {
        sum: round(sum),
        avg: round(avg),
        min: round(min),
        max: round(max),
        count: values.length,
    };
}

/**
 * Agrega dados por categoria
 */
function aggregateByCategory(
    data: Record<string, unknown>[],
    categoryColumn: string,
    valueColumn: string,
    aggregation: 'sum' | 'avg' | 'count' = 'sum'
): Array<{ name: string; value: number }> {
    const groups = new Map<string, number[]>();

    for (const row of data) {
        const category = String(row[categoryColumn] ?? 'Outros').trim();
        const value = parseNumber(row[valueColumn]);

        if (!isNaN(value)) {
            if (!groups.has(category)) {
                groups.set(category, []);
            }
            groups.get(category)!.push(value);
        }
    }

    const results: Array<{ name: string; value: number }> = [];

    for (const [name, values] of groups) {
        let aggregatedValue: number;

        switch (aggregation) {
            case 'sum':
                aggregatedValue = values.reduce((a, b) => a + b, 0);
                break;
            case 'avg':
                aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'count':
                aggregatedValue = values.length;
                break;
        }

        // Arredondar para 2 casas decimais
        results.push({
            name,
            value: Math.round(aggregatedValue * 100) / 100,
        });
    }

    return results
        .sort((a, b) => b.value - a.value)
        .slice(0, CONFIG.limits.maxChartItems);
}

/**
 * Determina formato de exibição para métrica
 */
function getMetricFormat(key: string): MetricFormat {
    const keyLower = key.toLowerCase();

    if (FORMAT_IDENTIFIERS.currency.some(id => keyLower.includes(id))) {
        return 'currency';
    }
    if (FORMAT_IDENTIFIERS.percentage.some(id => keyLower.includes(id))) {
        return 'percentage';
    }
    return 'number';
}

/**
 * Formata valor para exibição
 */
function formatValue(value: number, format: MetricFormat): string {
    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(value);
        case 'percentage':
            return `${value.toFixed(1)}%`;
        case 'number':
        default:
            return new Intl.NumberFormat('pt-BR').format(value);
    }
}

/**
 * Normaliza nome de coluna para uso como ID
 */
function normalizeColumnName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Converte métricas brutas para formato do dashboard
 */
function convertMetricsToArray(
    metrics: Record<string, number | string>,
    _templateId: string
): DashboardMetric[] {
    const result: DashboardMetric[] = [];

    for (const [key, value] of Object.entries(metrics)) {
        if (typeof value !== 'number' && typeof value !== 'string') continue;

        const label = METRIC_LABELS[key] ?? 
            key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const format = getMetricFormat(key);
        const displayValue = typeof value === 'number' 
            ? formatValue(value, format) 
            : String(value);

        result.push({
            id: key,
            label,
            value: displayValue,
            format,
        });
    }

    return result.slice(0, CONFIG.limits.maxMetrics);
}

/**
 * Converte gráficos brutos para formato do dashboard
 */
function convertChartsToArray(
    charts: Record<string, Array<{ name: string; value: number }>>,
    suggestions: ChartSuggestion[]
): ChartConfig[] {
    const result: ChartConfig[] = [];
    const entries = Object.entries(charts);

    for (let i = 0; i < entries.length && i < CONFIG.limits.maxCharts; i++) {
        const [id, data] = entries[i];
        const suggestion = suggestions[i];

        result.push({
            id,
            title: suggestion?.title ?? 
                id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: suggestion?.type ?? 'bar',
            xKey: suggestion?.x ?? 'name',
            yKey: suggestion?.y ?? 'value',
            data,
        });
    }

    return result;
}

/**
 * Processa dados localmente quando API não está disponível
 */
function processDataLocally(
    parsedData: ParsedFileData,
    templateId: string,
    _columnMapping?: Record<string, string>
): ProcessingResponse {
    console.log('🔧 [Local] Processing data locally...');

    const data = parsedData.data;
    const columnNames = parsedData.columns.map(c => 
        typeof c === 'string' ? c : c.name
    );

    // Analisar colunas
    const { types, numeric, category } = analyzeColumns(data, columnNames);

    // Calcular métricas básicas
    const metrics: Record<string, number | string> = {
        linhas: data.length,
        colunas: columnNames.length,
    };

    // Adicionar métricas para colunas numéricas
    for (const col of numeric.slice(0, 5)) {
        const stats = calculateColumnStats(data, col);
        if (stats) {
            const colKey = normalizeColumnName(col);
            metrics[`${colKey}_total`] = stats.sum;
            metrics[`${colKey}_media`] = stats.avg;
        }
    }

    // Gerar gráficos
    const charts: Record<string, Array<{ name: string; value: number }>> = {};
    const suggestions: ChartSuggestion[] = [];

    for (const catCol of category.slice(0, 2)) {
        for (const numCol of numeric.slice(0, 2)) {
            const chartId = `${normalizeColumnName(catCol)}_${normalizeColumnName(numCol)}`;
            const aggregated = aggregateByCategory(data, catCol, numCol);

            if (aggregated.length > 0) {
                charts[chartId] = aggregated;
                suggestions.push({
                    type: 'bar',
                    title: `${numCol} por ${catCol}`,
                    x: catCol,
                    y: numCol,
                    agg: 'sum',
                });
            }
        }
    }

    return {
        status: 'success',
        projectId: '',
        metrics: convertMetricsToArray(metrics, templateId),
        charts: convertChartsToArray(charts, suggestions),
        insights: [],
        organizedData: data,
    };
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * FUNÇÃO PRINCIPAL: Processa arquivo e gera dashboard completo
 * 
 * Esta função substitui completamente o sendToWebhook do N8N.
 * Agora utiliza o endpoint dedicado no backend Python.
 */
export async function processToPythonApi(formData: FormData) {
  const endpoint = `${PYTHON_API_URL}/process-for-n8n`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Python API Error (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

// ============================================================================
// EXPORTS ADICIONAIS
// ============================================================================

export {
    PythonApiError,
    ValidationError,
    processDataLocally,
    parseNumber,
    detectColumnType,
    formatValue,
};

export type {
    ApiResponse,
    MetricsPayload,
    ChartDataPayload,
    DashboardPayload,
    ChartSuggestion,
    ColumnType,
    ChartType,
    MetricFormat,
};