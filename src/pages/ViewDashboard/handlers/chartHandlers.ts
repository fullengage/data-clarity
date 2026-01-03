/**
 * Handlers para criação de gráficos com Python/Plotly
 */
import { generateChart } from '@/lib/chartService';
import { supabase } from '@/lib/supabase';
import type { ChartConfig as PythonChartConfig } from '@/types/chart.types';

interface CreateChartParams {
  dashboardId: string;
  chartConfig: PythonChartConfig;
  tableData: Array<Record<string, any>>;
  onSuccess: () => void;
  onError: (error: string) => void;
}

/**
 * Handler para criar gráfico usando Python/Pandas/Plotly
 */
export async function handleCreatePythonChart({
  dashboardId,
  chartConfig,
  tableData,
  onSuccess,
  onError,
}: CreateChartParams): Promise<void> {
  try {
    console.log('📊 [Chart Handler] Creating chart:', chartConfig.type);

    // Gerar gráfico via Python
    const result = await generateChart({
      dataset_id: dashboardId,
      chart_config: chartConfig,
      data: tableData,
    });

    if (!result.success) {
      throw new Error(result.error || 'Erro ao gerar gráfico');
    }

    // Salvar no Supabase
    const { error: saveError } = await supabase
      .from('dashboard_blocks')
      .insert({
        dashboard_id: dashboardId,
        type: 'chart',
        title: chartConfig.title,
        config: {
          ...chartConfig,
          chart_json: result.chart_json,
          chart_data: result.chart_data,
          generated_by: 'python_plotly',
        },
        position: { x: 0, y: 0, w: 6, h: 4 },
      });

    if (saveError) {
      throw saveError;
    }

    console.log('✅ [Chart Handler] Chart created successfully');
    onSuccess();
  } catch (error) {
    console.error('🔥 [Chart Handler] Error:', error);
    onError(error instanceof Error ? error.message : 'Erro ao criar gráfico');
  }
}
