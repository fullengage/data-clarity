import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  chartJson: string;
  className?: string;
}

/**
 * Componente para renderizar gráficos Plotly a partir de JSON
 */
export function PlotlyChart({ chartJson, className = '' }: PlotlyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !chartJson) return;

    try {
      const chartData = JSON.parse(chartJson);
      
      // Plotly espera { data, layout, config }
      const data = chartData.data || [];
      const layout = chartData.layout || {};
      const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
      };

      // Renderizar gráfico
      Plotly.newPlot(chartRef.current, data, layout, config);

      // Cleanup
      return () => {
        if (chartRef.current) {
          Plotly.purge(chartRef.current);
        }
      };
    } catch (error) {
      console.error('Erro ao renderizar gráfico Plotly:', error);
    }
  }, [chartJson]);

  return (
    <div ref={chartRef} className={className} style={{ width: '100%', height: '100%' }} />
  );
}
