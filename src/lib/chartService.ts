/**
 * Serviço para geração de gráficos via API Python
 */
import { ChartGenerationRequest, ChartGenerationResponse, ChartTypesResponse } from '@/types/chart.types';

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL;

if (!PYTHON_API_URL) {
  throw new Error(
    "ERRO CRÍTICO: A variável de ambiente VITE_PYTHON_API_URL não está definida. " +
    "Verifique o arquivo .env e faça rebuild do frontend."
  );
}

/**
 * Busca todos os tipos de gráficos disponíveis
 */
export async function getAvailableChartTypes(): Promise<ChartTypesResponse> {
  try {
    console.log('📊 [Chart Service] Fetching chart types from:', `${PYTHON_API_URL}/charts/types`);
    
    const response = await fetch(`${PYTHON_API_URL}/charts/types`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('📊 [Chart Service] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('🔥 [Chart Service] Error response:', errorText);
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [Chart Service] Chart types loaded:', data);
    return data;

  } catch (error) {
    console.error('🔥 [Chart Service] Error fetching chart types:', error);
    console.warn('⚠️ [Chart Service] Using fallback chart types');
    
    // Fallback: tipos hardcoded até o backend ser atualizado
    return {
      success: true,
      chart_types: [
        {
          category: 'Colunas e Barras',
          types: [
            { id: 'bar', name: 'Colunas', description: 'Ideais para comparar categorias' },
            { id: 'horizontal_bar', name: 'Barras Horizontais', description: 'Recomendado para etiquetas longas' },
          ]
        },
        {
          category: 'Linhas e Áreas',
          types: [
            { id: 'line', name: 'Linhas', description: 'Excelente para tendências ao longo do tempo' },
            { id: 'area', name: 'Área', description: 'Enfatiza magnitude da mudança' },
          ]
        },
        {
          category: 'Pizza e Rosca',
          types: [
            { id: 'pie', name: 'Pizza', description: 'Mostra proporção em relação ao total' },
            { id: 'donut', name: 'Rosca', description: 'Permite visualizar múltiplas séries' },
          ]
        },
        {
          category: 'Dispersão e Bolhas',
          types: [
            { id: 'scatter', name: 'Dispersão', description: 'Relação entre duas variáveis' },
            { id: 'bubble', name: 'Bolhas', description: 'Adiciona terceira dimensão (tamanho)' },
          ]
        },
        {
          category: 'Especializados',
          types: [
            { id: 'waterfall', name: 'Cascata', description: 'Fluxos de caixa e variações' },
            { id: 'funnel', name: 'Funil', description: 'Estágios de processo (vendas/marketing)' },
            { id: 'treemap', name: 'Treemap', description: 'Hierarquias e proporções' },
            { id: 'sunburst', name: 'Sunburst', description: 'Dados hierárquicos circulares' },
            { id: 'radar', name: 'Radar', description: 'Compara valores agregados' },
          ]
        },
        {
          category: 'Estatísticos e Financeiros',
          types: [
            { id: 'histogram', name: 'Histograma', description: 'Frequência de dados' },
            { id: 'box', name: 'Box Plot', description: 'Distribuição estatística' },
            { id: 'candlestick', name: 'Candlestick', description: 'Variações de preço (mercado financeiro)' },
          ]
        }
      ]
    };
  }
}

/**
 * Gera um gráfico usando Python/Pandas/Plotly
 */
export async function generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResponse> {
  try {
    console.log('📊 [Chart Service] Generating chart:', request.chart_config.type);

    const response = await fetch(`${PYTHON_API_URL}/charts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [Chart Service] Chart generated successfully');
    return data;

  } catch (error) {
    console.error('🔥 [Chart Service] Error generating chart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar gráfico.',
    };
  }
}

/**
 * Preview dos dados do gráfico antes de criar
 */
export async function previewChartData(request: ChartGenerationRequest): Promise<any> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/charts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('🔥 [Chart Service] Error previewing chart data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao visualizar dados.',
    };
  }
}
