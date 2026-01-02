/**
 * ViewDashboard - Componente Principal Refatorado
 * 
 * Melhorias aplicadas:
 * - Extração de hooks customizados (useDashboardData, useTableOperations)
 * - Separação de utilitários (dataUtils, chartUtils, insightGenerator)
 * - Constantes e configurações centralizadas
 * - Tipagem robusta
 * - Memoização otimizada
 * - Código mais legível e manutenível
 */

import { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboards } from '@/hooks/useDashboards';
import AppLayout from '@/components/layout/AppLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import ChartCard from '@/components/dashboard/ChartCard';
import DataTable from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import OnboardingTour from '@/components/dashboard/OnboardingTour';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  Lightbulb,
  TableIcon,
  BarChart3,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  LayoutDashboard,
  Lock,
  Globe,
  ChevronDown,
  TrendingUp,
  PieChart,
  Database,
  Zap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DashboardIntent, DashboardMetric, ChartConfig } from '@/types/dashboard';
import { askAiForWidget, askAiForFormula } from '@/lib/webhookService';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { evaluateFormula } from '@/lib/formulaEngine';
import { FormulaDialog } from '@/components/dashboard/FormulaDialog';
import { generateSmartMetrics, convertToDashboardMetrics } from '@/lib/smartMetrics';

// Hooks customizados
import { useDashboardData } from './hooks/useDashboardData';
import { useTableOperations } from './hooks/useTableOperations';

// Utilitários
import { findNumericColumns } from './utils/dataUtils';
import { buildChartData, detectChartFormat, buildChartPreview, validateChartParams } from './utils/chartUtils';
import { generateInsights } from './utils/insightGenerator';

// Constantes
import {
  FINANCE_SHORTCUTS,
  AI_SUGGESTIONS,
  PERIOD_OPTIONS,
  METRIC_ICON_OPTIONS,
  METRIC_COLOR_OPTIONS,
  CHART_TYPE_OPTIONS,
  AGGREGATION_OPTIONS,
  INTENT_LABELS,
  INTENT_BORDER_COLORS,
  DEFAULT_WIDGET_POSITION,
} from './constants/dashboardConfig';

// Tipos
import { AggregationType, ColumnStructure } from './types/viewDashboard.types';

// ============================================================================
// Sub-componentes Memoizados
// ============================================================================

/**
 * Banner de Insights
 */
const InsightsBanner = ({ insights }: { insights: string[] }) => {
  if (insights.length === 0) return null;

  return (
    <div className="bg-dataviz-blue-light border border-dataviz-blue/20 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0066cc]/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-[#0066cc]" />
        </div>
        <div>
          <h3 className="font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
            📌 Pontos de Atenção
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {insights.map((insight, index) => (
              <li key={index}>• {insight}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Seção de Atalhos Financeiros
 */
const FinanceShortcutsSection = ({
  onShortcutClick,
}: {
  onShortcutClick: (prompt: string) => void;
}) => (
  <div className="mt-8 pt-6 border-t border-white/10">
    <div className="flex items-center gap-3 mb-4">
      <LayoutDashboard className="w-4 h-4 text-emerald-200" />
      <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">
        Atalhos de Análise Financeira
      </span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {FINANCE_SHORTCUTS.map((item) => (
        <button
          key={item.label}
          onClick={() => onShortcutClick(item.prompt)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <item.icon className="w-4 h-4 text-emerald-200" />
          </div>
          <span className="text-[10px] font-medium text-emerald-50 text-center">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  </div>
);

/**
 * Seção de Input de AI
 */
const AiPromptSection = ({
  prompt,
  isProcessing,
  onPromptChange,
  onGenerateCard,
  onCalculateColumn,
}: {
  prompt: string;
  isProcessing: boolean;
  onPromptChange: (value: string) => void;
  onGenerateCard: () => void;
  onCalculateColumn: () => void;
}) => (
  <div className="mb-8 group no-print">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-dataviz-blue/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 AI-Input-Container">
        <div className="flex items-center gap-4 w-full">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dataviz-blue to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Input
              className="border-none bg-transparent focus-visible:ring-0 text-lg placeholder:text-slate-400 p-0"
              placeholder="Peça um novo card... Ex: 'Quero um gráfico de produtos mais vendidos'"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onGenerateCard()}
            />
          </div>
          <Button
            onClick={onGenerateCard}
            disabled={isProcessing || !prompt.trim()}
            className="bg-dataviz-blue hover:bg-dataviz-blue/90 text-white rounded-lg px-6"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Card'}
          </Button>
        </div>

        {/* Sugestões */}
        <div className="flex flex-wrap items-center gap-2 pl-14">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Sugestões:
          </span>
          {AI_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPromptChange(s.prompt)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pl-14 pt-2 border-t border-slate-50 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCalculateColumn}
            disabled={isProcessing || !prompt.trim()}
            className="text-xs h-8 border-dashed border-dataviz-blue text-dataviz-blue hover:bg-dataviz-blue/5"
          >
            <TableIcon className="w-3 h-3 mr-2" />
            Calcular Nova Coluna
          </Button>
          <p className="text-[10px] text-slate-400">
            Experimente: "Calcular margem (Receita - Custo)" ou "Quantidade vezes Preço"
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// Componente Principal
// ============================================================================

export default function ViewDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getDashboard, dashboards } = useDashboards(user?.id);
  const { toast } = useToast();

  // ============================================================================
  // Hooks Customizados
  // ============================================================================

  const {
    dashboard,
    isLoadingData,
    isRefreshing: isDataRefreshing,
    tableData,
    tableColumns,
    structuredDatasetId,
    semanticDatasetId,
    intent,
    fetchDashboardData,
    refreshDashboard,
    updateIntent,
  } = useDashboardData({ dashboardId: id, userId: user?.id });

  // Estado local para mutações de tabela (para passar aos hooks)
  const [localTableData, setLocalTableData] = useState<Record<string, unknown>[]>([]);
  const [localTableColumns, setLocalTableColumns] = useState<string[]>([]);

  // Sincronizar estado local com dados do hook
  useMemo(() => {
    setLocalTableData(tableData);
    setLocalTableColumns(tableColumns);
  }, [tableData, tableColumns]);

  const tableOps = useTableOperations({
    structuredDatasetId,
    dashboard,
    tableData: localTableData,
    tableColumns: localTableColumns,
    setTableData: setLocalTableData,
    setTableColumns: setLocalTableColumns,
    onRefresh: fetchDashboardData,
  });

  // ============================================================================
  // Estado de UI
  // ============================================================================

  const [selectedPeriod, setSelectedPeriod] = useState('Dezembro 2024');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Chart Builder
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [newChartTitle, setNewChartTitle] = useState('');
  const [newChartType, setNewChartType] = useState<ChartConfig['type']>('bar');
  const [newChartXKey, setNewChartXKey] = useState('');
  const [newChartYKey, setNewChartYKey] = useState('');
  const [newChartAgg, setNewChartAgg] = useState<AggregationType>('sum');

  // Metric Editor
  const [isMetricEditorOpen, setIsMetricEditorOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DashboardMetric | null>(null);
  const [metricLabel, setMetricLabel] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricIcon, setMetricIcon] = useState('chart');
  const [metricColor, setMetricColor] = useState('blue');
  const [metricPrefix, setMetricPrefix] = useState('');
  const [metricSuffix, setMetricSuffix] = useState('');
  const [isSavingMetric, setIsSavingMetric] = useState(false);

  // Formula Dialog
  const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
  const [formulaToEdit, setFormulaToEdit] = useState<{ name: string; formula: string } | null>(null);

  // Visibility Dialog
  const [isVisibilityDialogOpen, setIsVisibilityDialogOpen] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // ============================================================================
  // Valores Computados
  // ============================================================================

  const availableNumericColumns = useMemo(() => {
    return findNumericColumns(localTableColumns, localTableData);
  }, [localTableColumns, localTableData]);

  const insights = useMemo(() => {
    if (dashboard?.insights?.length) return dashboard.insights;
    return generateInsights({
      tableData: localTableData,
      tableColumns: localTableColumns,
      dashboard,
    });
  }, [dashboard, localTableData, localTableColumns]);

  const enrichedMetrics = useMemo(() => {
    const metrics = dashboard?.metrics || [];
    return metrics.map((m) => {
      const enriched = { ...m };

      if (!enriched.status && enriched.change !== undefined) {
        if (enriched.change <= -10) enriched.status = 'critical';
        else if (enriched.change < 0) enriched.status = 'warning';
        else if (enriched.change > 0) enriched.status = 'good';
      }

      if (!enriched.insight && enriched.change !== undefined) {
        if (enriched.change < -15) {
          enriched.insight = 'Queda acentuada detectada. Recomenda-se revisão imediata.';
        } else if (enriched.change > 20) {
          enriched.insight = 'Crescimento excelente! Otimize para manter o ritmo.';
        } else if (enriched.change > 0) {
          enriched.insight = 'Desempenho positivo e tendência de alta.';
        } else if (enriched.change < 0) {
          enriched.insight = 'Leve queda. Monitore a evolução na próxima semana.';
        }
      }

      return enriched;
    });
  }, [dashboard?.metrics]);

  const chartBuilderPreview = useMemo(() => {
    return buildChartPreview(
      {
        xKey: newChartXKey,
        yKey: newChartYKey,
        agg: newChartAgg,
        type: newChartType,
        title: newChartTitle,
      },
      localTableData
    );
  }, [newChartXKey, newChartYKey, newChartAgg, newChartType, newChartTitle, localTableData]);

  const isRefreshing = isDataRefreshing || tableOps.isRefreshing;

  // ============================================================================
  // Handlers de AI
  // ============================================================================

  const handleAiRequest = useCallback(async () => {
    if (!dashboard || !id) return;

    setIsAiProcessing(true);
    try {
      const { data: semData } = await supabase
        .from('ai_decisions')
        .select('field_map, id')
        .eq('id', semanticDatasetId)
        .single();

      // Preparar métricas para o contexto
      const metricsContext = enrichedMetrics.map(m => ({
        label: m.label,
        value: m.value
      }));

      // Preparar gráficos para o contexto
      const chartsContext = (dashboard.charts || []).map((chart: any) => ({
        title: chart.title || 'Gráfico',
        type: chart.type || 'bar',
        data: (chart.data || []).slice(0, 10)
      }));

      const result = await askAiForWidget(user?.id || '', id, aiPrompt || 'Analise os dados', {
        columns: dashboard.columns,
        semanticMap: (semData as any)?.field_map || [],
        intent,
        rowCount: dashboard.rowCount,
        fileName: dashboard.name || dashboard.fileName,
        sourceId: structuredDatasetId || undefined,
        semanticDatasetId: semanticDatasetId || undefined,
        aiDecisionId: (semData as any)?.id || semanticDatasetId || undefined,
        metrics: metricsContext,
        charts: chartsContext,
        tableSample: localTableData.slice(0, 10),
      });

      if (result.status === 'success') {
        // Se for uma resposta de chat (answer/insights), mostrar como toast
        if (result.answer) {
          toast({
            title: '💡 Resposta da IA',
            description: result.answer,
          });
          if (result.insights && result.insights.length > 0) {
            console.log('📊 Insights:', result.insights);
          }
        } else if (result.widgetConfig) {
          // Se for um widget, salvar no banco
          const { error: saveErr } = await supabase
            .from('dashboard_blocks')
            .insert({
              dashboard_id: id,
              type: result.type,
              title: result.widgetConfig?.label || result.widgetConfig?.title || 'Widget',
              config: result.widgetConfig,
              position: DEFAULT_WIDGET_POSITION,
            });

          if (saveErr) throw saveErr;
          await fetchDashboardData();
          toast({
            title: 'Card criado!',
            description: result.message || 'O novo card foi adicionado ao seu dashboard.',
          });
        }

        setAiPrompt('');
      } else {
        toast({
          title: 'Não foi possível gerar o card',
          description: result.message || 'Tente reformular seu pedido de forma mais simples.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error('Error in handleAiRequest:', e);
      toast({
        title: 'Erro no assistente',
        description: 'Não foi possível processar seu pedido agora.',
        variant: 'destructive',
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiPrompt, dashboard, id, semanticDatasetId, structuredDatasetId, intent, user?.id, fetchDashboardData, toast, enrichedMetrics, localTableData]);

  const handleAiFormula = useCallback(async () => {
    if (!aiPrompt.trim() || !dashboard || !id || !structuredDatasetId) return;

    setIsAiProcessing(true);
    try {
      const result = await askAiForFormula(user?.id || '', aiPrompt, {
        columns: localTableColumns,
        fileName: dashboard.fileName || 'unknown',
        dashboardId: id,
      });

      if (result.status === 'success' && result.formula) {
        const nextRows = localTableData.map((row) => {
          const val = evaluateFormula(result.formula!, row);
          return { ...row, [result.columnName!]: val };
        });

        const nextStructure = [
          ...((dashboard.columns as ColumnStructure[]) || []),
          { name: result.columnName!, type: 'number' },
        ];

        const { error: updErr } = await supabase
          .from('datasets')
          .update({
            original_columns: nextStructure,
            sample_data: nextRows,
          })
          .eq('id', structuredDatasetId);

        if (updErr) throw updErr;

        setLocalTableData(nextRows);
        setLocalTableColumns([...localTableColumns, result.columnName!]);

        setAiPrompt('');
        await fetchDashboardData();
        toast({
          title: 'Coluna calculada!',
          description: `Coluna "${result.columnName}" criada usando a fórmula: ${result.formula}`,
        });
      } else {
        toast({
          title: 'Não foi possível calcular',
          description: result.message || 'A IA não conseguiu gerar uma fórmula para este pedido.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error('Error in handleAiFormula:', e);
      const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro ao processar a fórmula.';
      const isWorkflowError = errorMessage.includes('Workflow execution failed');

      toast({
        title: isWorkflowError ? 'Serviço de IA temporariamente indisponível' : 'Erro no cálculo',
        description: isWorkflowError
          ? 'O servidor de IA está com problemas. Tente novamente em alguns instantes ou contate o suporte.'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiPrompt, dashboard, id, structuredDatasetId, localTableColumns, localTableData, user?.id, fetchDashboardData, toast]);

  // ============================================================================
  // Handlers de Chart
  // ============================================================================

  const handleOpenChartBuilder = useCallback((chart?: ChartConfig) => {
    if (chart) {
      const anyChart = chart as any;
      const builder = anyChart?.builder;
      setEditingChartId(chart.id);
      setNewChartTitle(chart.title || '');
      setNewChartType(chart.type || 'bar');
      setNewChartXKey(builder?.xKey || chart.xKey || localTableColumns[0] || '');
      setNewChartAgg(builder?.agg || (builder?.yKey ? 'sum' : 'count'));
      setNewChartYKey(builder?.yKey || chart.yKey || availableNumericColumns[0] || '');
    } else {
      setEditingChartId(null);
      setNewChartTitle('');
      setNewChartType('bar');
      setNewChartXKey(localTableColumns[0] || '');
      setNewChartYKey(availableNumericColumns[0] || '');
      setNewChartAgg(availableNumericColumns.length > 0 ? 'sum' : 'count');
    }
    setIsChartBuilderOpen(true);
  }, [localTableColumns, availableNumericColumns]);

  const handleCreateChartWidget = useCallback(async () => {
    if (!id) return;

    const validation = validateChartParams(
      { xKey: newChartXKey, yKey: newChartYKey, agg: newChartAgg },
      localTableData.length > 0
    );

    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsSavingChart(true);
    try {
      const data = buildChartData(localTableData, {
        xKey: newChartXKey,
        yKey: newChartAgg === 'count' ? undefined : newChartYKey,
        agg: newChartAgg,
      });

      const widgetConfig = {
        type: newChartType,
        title: newChartTitle || (editingChartId ? 'Gráfico' : 'Novo gráfico'),
        data,
        xKey: newChartXKey,
        yKey: newChartAgg === 'count' ? undefined : newChartYKey,
        format: detectChartFormat(newChartAgg, newChartYKey),
        builder: {
          xKey: newChartXKey,
          yKey: newChartAgg === 'count' ? undefined : newChartYKey,
          agg: newChartAgg,
        },
      };

      const { error } = editingChartId
        ? await supabase
          .from('dashboard_blocks')
          .update({ config: widgetConfig, title: widgetConfig.title })
          .eq('id', editingChartId)
          .eq('dashboard_id', id)
        : await supabase.from('dashboard_blocks').insert({
          dashboard_id: id,
          type: 'chart',
          title: widgetConfig.title || 'Gráfico',
          config: widgetConfig,
          position: DEFAULT_WIDGET_POSITION,
        });

      if (error) throw error;

      setIsChartBuilderOpen(false);
      setEditingChartId(null);
      await fetchDashboardData();
      toast({
        title: editingChartId ? 'Gráfico atualizado!' : 'Gráfico criado!',
        description: editingChartId ? 'As alterações foram salvas.' : 'O gráfico foi salvo no seu dashboard.',
      });
    } catch (e) {
      console.error('Error creating chart widget:', e);
      toast({ title: 'Erro ao criar gráfico', description: 'Não foi possível salvar o gráfico.', variant: 'destructive' });
    } finally {
      setIsSavingChart(false);
    }
  }, [id, newChartXKey, newChartYKey, newChartAgg, newChartType, newChartTitle, editingChartId, localTableData, fetchDashboardData, toast]);

  const handleDeleteChart = useCallback(async (chartId: string) => {
    if (!id) return;

    const ok = window.confirm('Excluir este gráfico?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('dashboard_blocks').delete().eq('id', chartId).eq('dashboard_id', id);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Gráfico excluído', description: 'O gráfico foi removido do dashboard.' });
    } catch (e) {
      console.error('Error deleting chart widget:', e);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o gráfico.', variant: 'destructive' });
    }
  }, [id, fetchDashboardData, toast]);

  // ============================================================================
  // Handlers de Métricas
  // ============================================================================

  const handleOpenMetricEditor = useCallback((metric: DashboardMetric) => {
    setEditingMetric(metric);
    setMetricLabel(metric.label || '');
    setMetricValue(String(metric.value || ''));
    setMetricIcon(metric.icon || 'chart');
    setMetricColor(metric.color || 'blue');
    setMetricPrefix(metric.prefix || '');
    setMetricSuffix(metric.suffix || '');
    setIsMetricEditorOpen(true);
  }, []);

  const handleSaveMetric = useCallback(async () => {
    if (!editingMetric || !id) return;

    setIsSavingMetric(true);
    try {
      const updatedConfig = {
        label: metricLabel,
        value: metricValue,
        icon: metricIcon,
        color: metricColor,
        prefix: metricPrefix,
        suffix: metricSuffix,
      };

      const { error } = await supabase.from('dashboard_blocks').update({ config: updatedConfig, title: updatedConfig.label }).eq('id', editingMetric.id);

      if (error) throw error;

      setIsMetricEditorOpen(false);
      setEditingMetric(null);
      await fetchDashboardData();
      toast({ title: 'Métrica atualizada', description: 'As alterações foram salvas com sucesso.' });
    } catch (e) {
      console.error('Error saving metric:', e);
      toast({
        title: 'Erro ao salvar métrica',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingMetric(false);
    }
  }, [editingMetric, id, metricLabel, metricValue, metricIcon, metricColor, metricPrefix, metricSuffix, fetchDashboardData, toast]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    const ok = window.confirm('Tem certeza que deseja excluir esta métrica?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('dashboard_blocks').delete().eq('id', metricId);

      if (error) throw error;

      await fetchDashboardData();
      toast({ title: 'Métrica excluída', description: 'A métrica foi removida do dashboard.' });
    } catch (e) {
      console.error('Error deleting metric:', e);
      toast({
        title: 'Erro ao excluir métrica',
        description: 'Não foi possível excluir a métrica.',
        variant: 'destructive',
      });
    }
  }, [fetchDashboardData, toast]);

  const handleGenerateSmartMetrics = useCallback(async () => {
    if (!id || !dashboard) return;

    try {
      const { type, metrics } = generateSmartMetrics(localTableData, localTableColumns);

      if (metrics.length === 0) {
        toast({
          title: 'Nenhuma métrica gerada',
          description: 'Não foi possível gerar métricas com os dados disponíveis.',
          variant: 'destructive',
        });
        return;
      }

      const dashboardMetrics = convertToDashboardMetrics(metrics);

      for (const metric of dashboardMetrics) {
        const { error } = await supabase.from('dashboard_blocks').insert({
          dashboard_id: id,
          type: 'metric',
          title: metric.label || 'Métrica',
          config: metric,
          position: DEFAULT_WIDGET_POSITION,
        });

        if (error) throw error;
      }

      await fetchDashboardData();

      const typeLabels = {
        vendas: 'Vendas/Financeiro',
        estoque: 'Estoque',
        horas_extras: 'Horas Extras/Operacional',
        unknown: 'Geral',
      };

      toast({
        title: 'Métricas geradas!',
        description: `${metrics.length} métricas inteligentes criadas para ${typeLabels[type as keyof typeof typeLabels] || 'Geral'}.`,
      });
    } catch (e) {
      console.error('Error generating smart metrics:', e);
      toast({
        title: 'Erro ao gerar métricas',
        description: 'Não foi possível gerar as métricas automaticamente.',
        variant: 'destructive',
      });
    }
  }, [id, dashboard, localTableData, localTableColumns, fetchDashboardData, toast]);

  // ============================================================================
  // Handlers de Fórmula
  // ============================================================================

  const handleManualFormula = useCallback(async (colName: string, formulaStr: string) => {
    if (!structuredDatasetId || !dashboard) return;

    try {
      const nextRows = localTableData.map((row) => {
        const val = evaluateFormula(formulaStr, row);
        return { ...row, [colName]: val };
      });

      const currentStructure = ((dashboard.columns as ColumnStructure[]) || []);
      const colExists = currentStructure.findIndex((c) => c.name === colName);

      let nextStructure: ColumnStructure[];
      if (colExists >= 0) {
        nextStructure = [...currentStructure];
        nextStructure[colExists] = { ...nextStructure[colExists], formula: formulaStr };
      } else {
        nextStructure = [...currentStructure, { name: colName, type: 'number', formula: formulaStr }];
      }

      const { error: updErr } = await supabase
        .from('datasets')
        .update({
          original_columns: nextStructure,
          sample_data: nextRows,
        })
        .eq('id', structuredDatasetId);

      if (updErr) throw updErr;

      setLocalTableData(nextRows);
      if (colExists < 0) {
        setLocalTableColumns([...localTableColumns, colName]);
      }

      await fetchDashboardData();
      toast({
        title: colExists >= 0 ? 'Coluna recalculada!' : 'Coluna criada!',
        description: `Coluna "${colName}" processada com sucesso.`,
      });
    } catch (e) {
      console.error('Error in handleManualFormula:', e);
      toast({
        title: 'Erro no cálculo',
        description: 'Verifique se a fórmula está correta.',
        variant: 'destructive',
      });
    } finally {
      setFormulaToEdit(null);
    }
  }, [structuredDatasetId, dashboard, localTableData, localTableColumns, fetchDashboardData, toast]);

  const handleRequestEditFormula = useCallback((colName: string) => {
    const structure = ((dashboard?.columns as ColumnStructure[]) || []);
    const colMetadata = structure.find((c) => c.name === colName);

    setFormulaToEdit({
      name: colName,
      formula: colMetadata?.formula || '',
    });
    setIsFormulaDialogOpen(true);
  }, [dashboard?.columns]);

  // ============================================================================
  // Handlers de Visibilidade
  // ============================================================================

  const handleUpdateVisibility = useCallback(async (level: 'private' | 'team') => {
    if (!id || !dashboard) return;

    setIsUpdatingVisibility(true);
    try {
      const { error } = await supabase.from('dashboards').update({ access_level: level }).eq('id', id);

      if (error) throw error;

      toast({
        title: level === 'team' ? 'Compartilhado com o Time' : 'Privado',
        description:
          level === 'team'
            ? 'Agora todos na sua empresa podem ver este dashboard.'
            : 'Este dashboard agora é visível apenas para você e administradores.',
      });
      setIsVisibilityDialogOpen(false);
      await fetchDashboardData();
    } catch (e) {
      console.error('Error updating visibility:', e);
      toast({ title: 'Erro ao atualizar visibilidade', variant: 'destructive' });
    } finally {
      setIsUpdatingVisibility(false);
    }
  }, [id, dashboard, fetchDashboardData, toast]);

  // ============================================================================
  // Handlers Simples
  // ============================================================================

  const handleExport = useCallback(() => {
    window.print();
  }, []);

  const handleFinanceShortcut = useCallback((prompt: string) => {
    setAiPrompt(prompt);
    // Auto-executar após definir
    setTimeout(() => {
      handleAiRequest();
    }, 100);
  }, [handleAiRequest]);

  // ============================================================================
  // Render: Loading State
  // ============================================================================

  if (!dashboard || isLoadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // ============================================================================
  // Dados Derivados para Render
  // ============================================================================

  const metrics = enrichedMetrics;
  const charts = dashboard.charts || [];
  const borderColors = intent === 'financial' ? INTENT_BORDER_COLORS.financial : INTENT_BORDER_COLORS.default;

  // ============================================================================
  // Render Principal
  // ============================================================================

  return (
    <AppLayout>
      <OnboardingTour />
      <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto">

          {/* ================================================================ */}
          {/* HEADER SIMPLIFICADO */}
          {/* ================================================================ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
            {/* Linha Principal */}
            <div className="p-4 lg:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              {/* Título e Navegação */}
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="no-print">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
                    {dashboard.name}
                    {intent === 'financial' && (
                      <Badge variant="secondary" className="text-xs font-medium bg-emerald-100 text-emerald-700 border-0">
                        Financeiro
                      </Badge>
                    )}
                  </h1>
                  {dashboard.description && (
                    <p className="text-slate-500 mt-1 max-w-2xl">
                      {dashboard.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {dashboard.fileName} • {dashboard.rowCount.toLocaleString('pt-BR')} registros
                  </p>
                </div>
              </div>

              {/* Toolbar de Ações */}
              <div className="flex items-center gap-2 no-print flex-wrap">
                {/* Seletor de Período */}
                <div className="bg-slate-100 p-1 rounded-lg flex gap-0.5">
                  {PERIOD_OPTIONS.slice(0, 4).map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 text-xs px-3 rounded-md transition-all',
                        selectedPeriod === p
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                      onClick={() => setSelectedPeriod(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                {/* Tipo de Análise */}
                <Select value={intent} onValueChange={(v) => updateIntent(v as DashboardIntent)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg bg-slate-100 border-0">
                    <SelectValue placeholder="Análise" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTENT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                {/* Botões de Ação */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={refreshDashboard}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setIsVisibilityDialogOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg bg-dataviz-blue hover:bg-dataviz-blue/90"
                  onClick={handleExport}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Exportar</span>
                </Button>
              </div>
            </div>

            {/* Insights Banner (se houver) */}
            {insights.length > 0 && (
              <div className="px-4 lg:px-6 pb-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-amber-800">Pontos de Atenção: </span>
                      <span className="text-xs text-amber-700">{insights.slice(0, 2).join(' • ')}</span>
                      {insights.length > 2 && (
                        <span className="text-xs text-amber-600 ml-1">+{insights.length - 2} mais</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* ÁREA DE AI COMPACTA (COLAPSÁVEL) */}
          {/* ================================================================ */}
          <Collapsible defaultOpen={false} className="mb-6 no-print">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Assistente IA</p>
                      <p className="text-xs text-white/70">Crie cards, gráficos e colunas calculadas</p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/70" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {/* Input de AI */}
                  <div className="flex gap-2">
                    <Input
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-10 rounded-lg"
                      placeholder="Ex: 'Gráfico de produtos mais vendidos' ou 'Calcular margem'"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiRequest()}
                    />
                    <Button
                      onClick={handleAiRequest}
                      disabled={isAiProcessing}
                      className="bg-white text-indigo-700 hover:bg-white/90 h-10 px-4 rounded-lg"
                    >
                      {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar'}
                    </Button>
                  </div>

                  {/* Sugestões Rápidas */}
                  <div className="flex flex-wrap gap-2">
                    {AI_SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setAiPrompt(s.prompt)}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white/90 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      onClick={handleAiFormula}
                      disabled={isAiProcessing}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white/90 px-3 py-1.5 rounded-full border border-dashed border-white/30 transition-colors"
                    >
                      <TableIcon className="w-3 h-3 inline mr-1" />
                      Calcular Coluna
                    </button>
                  </div>

                  {/* Atalhos Financeiros (apenas no modo financial) */}
                  {intent === 'financial' && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Atalhos Financeiros</p>
                      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                        {FINANCE_SHORTCUTS.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleFinanceShortcut(item.prompt)}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                          >
                            <item.icon className="w-4 h-4 text-white/80" />
                            <span className="text-[10px] text-white/70 text-center leading-tight">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* ================================================================ */}
          {/* CONTEÚDO PRINCIPAL COM TABS */}
          {/* ================================================================ */}
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                <TabsTrigger
                  value="overview"
                  className="rounded-lg data-[state=active]:bg-dataviz-blue data-[state=active]:text-white px-4"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger
                  value="charts"
                  className="rounded-lg data-[state=active]:bg-dataviz-blue data-[state=active]:text-white px-4"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Gráficos
                  {charts.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{charts.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="rounded-lg data-[state=active]:bg-dataviz-blue data-[state=active]:text-white px-4"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Dados
                </TabsTrigger>
              </TabsList>

              {/* Ações Contextuais */}
              <div className="flex gap-2 no-print">
                {localTableData.length > 0 && (
                  <Button
                    onClick={handleGenerateSmartMetrics}
                    disabled={isRefreshing}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Gerar Métricas
                  </Button>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* TAB: VISÃO GERAL - Métricas + Gráfico Principal */}
            {/* ============================================================ */}
            {/* ============================================================ */}
            {/* TAB: VISÃO GERAL - Layout Padrão Mestre */}
            {/* ============================================================ */}
            <TabsContent value="overview" className="space-y-12 mt-0">
              {/* 1. Blocos de Métricas (Topo, lado a lado) */}
              {metrics.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {metrics.map((metric, idx) => (
                    <div
                      key={metric.id}
                      className={cn(
                        'transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full',
                        borderColors[idx % borderColors.length]
                      )}
                    >
                      <MetricCard
                        metric={metric}
                        className="h-full border-0 shadow-sm"
                        onEdit={handleOpenMetricEditor}
                        onDelete={handleDeleteMetric}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dotted border-slate-300 p-8 text-center">
                  <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Nenhuma métrica configurada</p>
                </div>
              )}

              {/* 2. Gráficos (Meio, 50-100% largura) */}
              {charts.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-dataviz-blue" />
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Análises Visuais</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {charts.map((chart, idx) => (
                      <div
                        key={chart.id}
                        className={cn(
                          "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col",
                          idx === 0 ? "lg:col-span-12" : "lg:col-span-6"
                        )}
                      >
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                          <h3 className="font-bold text-slate-800 text-sm">{chart.title || 'Gráfico'}</h3>
                          <div className="flex gap-1 no-print">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenChartBuilder(chart)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteChart(chart.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 flex-1">
                          <ChartCard chart={chart} className="h-[350px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Tabela (Rodapé, rolagem para dados adicionais) */}
              <div className="space-y-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TableIcon className="w-5 h-5 text-dataviz-blue" />
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Base de Dados Completa</h2>
                  </div>
                  <div className="no-print">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormulaToEdit(null);
                        setIsFormulaDialogOpen(true);
                      }}
                      className="rounded-lg h-8 text-xs font-semibold"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Nova Fórmula
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="max-h-[600px] overflow-auto">
                    <DataTable
                      data={localTableData}
                      columns={localTableColumns}
                      onEditRow={tableOps.openRowEditor}
                      onEditCell={tableOps.editCell}
                      onRenameColumn={tableOps.renameColumn}
                      onDeleteRow={tableOps.deleteRow}
                      onDeleteColumn={tableOps.deleteColumn}
                      onAddRow={tableOps.addRow}
                      onAddColumn={tableOps.addColumn}
                      onAddFormula={() => {
                        setFormulaToEdit(null);
                        setIsFormulaDialogOpen(true);
                      }}
                      onEditFormula={handleRequestEditFormula}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB: GRÁFICOS */}
            {/* ============================================================ */}
            <TabsContent value="charts" className="space-y-6 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{charts.length} gráfico(s) no dashboard</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChartBuilder()}
                  disabled={localTableData.length === 0}
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Gráfico
                </Button>
              </div>

              {charts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {charts.map((chart) => (
                    <div key={chart.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm">{chart.title || 'Gráfico'}</h3>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenChartBuilder(chart)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteChart(chart.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <ChartCard chart={chart} className="h-[300px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium text-lg">Nenhum gráfico criado</p>
                  <p className="text-sm text-slate-400 mt-1 mb-4">Crie visualizações dos seus dados</p>
                  <Button onClick={() => handleOpenChartBuilder()} disabled={localTableData.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Gráfico
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB: DADOS */}
            {/* ============================================================ */}
            <TabsContent value="data" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Base de Dados</h3>
                  <p className="text-sm text-slate-500">{localTableData.length} registros • {localTableColumns.length} colunas</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormulaToEdit(null);
                      setIsFormulaDialogOpen(true);
                    }}
                    className="rounded-lg"
                  >
                    <TableIcon className="w-4 h-4 mr-2" />
                    Nova Fórmula
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenChartBuilder()}
                    disabled={localTableData.length === 0}
                    className="rounded-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Gráfico
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                <DataTable
                  data={localTableData}
                  columns={localTableColumns}
                  onEditRow={tableOps.openRowEditor}
                  onEditCell={tableOps.editCell}
                  onRenameColumn={tableOps.renameColumn}
                  onDeleteRow={tableOps.deleteRow}
                  onDeleteColumn={tableOps.deleteColumn}
                  onAddRow={tableOps.addRow}
                  onAddColumn={tableOps.addColumn}
                  onAddFormula={() => {
                    setFormulaToEdit(null);
                    setIsFormulaDialogOpen(true);
                  }}
                  onEditFormula={handleRequestEditFormula}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ============================================================================ */}
        {/* DIALOGS */}
        {/* ============================================================================ */}

        {/* Chart Builder Dialog */}
        <Dialog open={isChartBuilderOpen} onOpenChange={setIsChartBuilderOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingChartId ? 'Editar gráfico' : 'Criar gráfico'}</DialogTitle>
              <DialogDescription>
                Escolha as colunas e a agregação. Você verá uma pré-visualização antes de salvar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={newChartTitle}
                    onChange={(e) => setNewChartTitle(e.target.value)}
                    placeholder="Ex: Produção por máquina"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newChartType} onValueChange={(v) => setNewChartType(v as ChartConfig['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna X (categoria)</Label>
                  <Select value={newChartXKey} onValueChange={setNewChartXKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {localTableColumns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Agregação</Label>
                  <Select value={newChartAgg} onValueChange={(v) => setNewChartAgg(v as AggregationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn('space-y-2', newChartAgg === 'count' && 'opacity-50')}>
                  <Label>Coluna Y (numérica)</Label>
                  <Select value={newChartYKey} onValueChange={setNewChartYKey} disabled={newChartAgg === 'count'}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={availableNumericColumns.length ? 'Selecione' : 'Nenhuma coluna numérica'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNumericColumns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Pré-visualização</Label>
                {chartBuilderPreview ? (
                  <ChartCard chart={chartBuilderPreview} />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Preencha as opções para visualizar o gráfico.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsChartBuilderOpen(false);
                  setEditingChartId(null);
                }}
                disabled={isSavingChart}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateChartWidget} disabled={isSavingChart || !chartBuilderPreview}>
                {isSavingChart ? 'Salvando...' : editingChartId ? 'Salvar alterações' : 'Salvar gráfico'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Metric Editor Dialog */}
        <Dialog open={isMetricEditorOpen} onOpenChange={setIsMetricEditorOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Métrica</DialogTitle>
              <DialogDescription>Personalize o título, valor, ícone e cor da métrica.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  placeholder="Ex: Faturamento Total"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="Ex: R$ 150.000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prefixo (opcional)</Label>
                  <Input
                    value={metricPrefix}
                    onChange={(e) => setMetricPrefix(e.target.value)}
                    placeholder="Ex: R$"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sufixo (opcional)</Label>
                  <Input
                    value={metricSuffix}
                    onChange={(e) => setMetricSuffix(e.target.value)}
                    placeholder="Ex: %"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={metricIcon} onValueChange={setMetricIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Select value={metricColor} onValueChange={setMetricColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsMetricEditorOpen(false);
                  setEditingMetric(null);
                }}
                disabled={isSavingMetric}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveMetric} disabled={isSavingMetric || !metricLabel.trim()}>
                {isSavingMetric ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Row Editor Dialog */}
        <Dialog open={tableOps.isRowEditorOpen} onOpenChange={() => tableOps.closeRowEditor()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar linha</DialogTitle>
              <DialogDescription>Edite os valores e clique em salvar.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-auto pr-1">
              {localTableColumns.map((col) => (
                <div key={col} className="space-y-2">
                  <Label>{col}</Label>
                  <Input
                    value={String(tableOps.editingRowData?.[col] ?? '')}
                    onChange={(e) => tableOps.updateEditingRowField(col, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => tableOps.closeRowEditor()} disabled={tableOps.isSavingRow}>
                Cancelar
              </Button>
              <Button onClick={tableOps.saveRowEdit} disabled={tableOps.isSavingRow || !tableOps.editingRowData}>
                {tableOps.isSavingRow ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Formula Dialog */}
        <FormulaDialog
          isOpen={isFormulaDialogOpen}
          onClose={() => {
            setIsFormulaDialogOpen(false);
            setFormulaToEdit(null);
          }}
          columns={localTableColumns}
          onApply={handleManualFormula}
          initialColumnName={formulaToEdit?.name}
          initialFormula={formulaToEdit?.formula}
        />

        {/* Visibility Dialog */}
        <Dialog open={isVisibilityDialogOpen} onOpenChange={setIsVisibilityDialogOpen}>
          <DialogContent className="sm:max-w-[480px] bg-card/80 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                Configurações de Acesso
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                Escolha quem pode visualizar este dashboard dentro da sua organização.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 pt-6">
              <button
                onClick={() => handleUpdateVisibility('private')}
                disabled={isUpdatingVisibility}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group',
                  dashboard?.accessLevel === 'private'
                    ? 'border-primary bg-primary/5 shadow-inner'
                    : 'border-border/50 hover:border-primary/30 hover:bg-primary/5'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    dashboard?.accessLevel === 'private'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}
                >
                  <Lock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Privado
                    {dashboard?.accessLevel === 'private' && (
                      <Badge className="h-4 px-1 text-[8px] bg-primary">Ativado</Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Apenas você, donos e gestores da conta podem visualizar este dashboard.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleUpdateVisibility('team')}
                disabled={isUpdatingVisibility}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group',
                  dashboard?.accessLevel === 'team'
                    ? 'border-primary bg-primary/5 shadow-inner'
                    : 'border-border/50 hover:border-primary/30 hover:bg-primary/5'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    dashboard?.accessLevel === 'team'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}
                >
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Time Inteiro
                    {dashboard?.accessLevel === 'team' && (
                      <Badge className="h-4 px-1 text-[8px] bg-primary">Ativado</Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Qualquer colaborador vinculado à sua empresa terá acesso a este dashboard.
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Link de Acesso Direto
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={window.location.href}
                    className="bg-muted/30 border-border/40 text-xs font-mono h-10 flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: 'Copiado!' });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button variant="ghost" onClick={() => setIsVisibilityDialogOpen(false)} className="w-full sm:w-auto">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
