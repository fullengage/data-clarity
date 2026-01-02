/**
 * Hook customizado para gerenciar dados do Dashboard
 * 
 * Centraliza a lógica de fetch, transformação e persistência dos dados.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DashboardIntent, DashboardProject, DashboardMetric, ChartConfig } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';
import {
  isColumnStructureCorrupted,
  createColumnCorrectionMap,
  findNumericColumns
} from '../utils/dataUtils';
import { buildChartData, detectChartFormat } from '../utils/chartUtils';
import { ColumnStructure } from '../types/viewDashboard.types';

// ============================================================================
// Tipos
// ============================================================================

interface UseDashboardDataParams {
  dashboardId: string | undefined;
  userId: string | undefined;
}

interface UseDashboardDataReturn {
  // Estado
  dashboard: DashboardProject | null;
  isLoadingData: boolean;
  isRefreshing: boolean;
  tableData: Record<string, unknown>[];
  tableColumns: string[];
  structuredDatasetId: string | null;
  semanticDatasetId: string | null;
  intent: DashboardIntent;

  // Ações
  fetchDashboardData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  updateIntent: (intent: DashboardIntent) => Promise<void>;

  // Operações de Dados
  updateTableRows: (rows: Record<string, unknown>[]) => Promise<void>;
  updateTableStructure: (structure: ColumnStructure[], rows: Record<string, unknown>[]) => Promise<void>;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useDashboardData({
  dashboardId,
  userId,
}: UseDashboardDataParams): UseDashboardDataReturn {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estado principal
  const [dashboard, setDashboard] = useState<DashboardProject | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [structuredDatasetId, setStructuredDatasetId] = useState<string | null>(null);
  const [semanticDatasetId, setSemanticDatasetId] = useState<string | null>(null);
  const [intent, setIntent] = useState<DashboardIntent>('unknown');

  // ============================================================================
  // Fetch Principal
  // ============================================================================

  const fetchDashboardData = useCallback(async () => {
    if (!dashboardId || !userId) return;

    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select(`
          id,
          title,
          description,
          created_at,
          datasets (
            id,
            user_id,
            name,
            original_columns,
            sample_data,
            row_count
          ),
          ai_decisions (
            id,
            dataset_type,
            field_map,
            metrics,
            charts
          ),
          dashboard_blocks (
            id,
            type,
            config,
            position
          )
        `)
        .eq('id', dashboardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard');
        return;
      }

      // Extrair dados aninhados com tipagem segura
      const typedData = data as any;
      const dataset = typedData?.datasets;
      const aiDecision = typedData?.ai_decisions;
      const blocks = typedData?.dashboard_blocks || [];

      // Verificar permissão de acesso
      if (dataset?.user_id && dataset.user_id !== userId) {
        navigate('/dashboard');
        return;
      }

      // Atualizar IDs
      setStructuredDatasetId(dataset?.id || null);
      setSemanticDatasetId(aiDecision?.id || null);

      // Processar intent (vinda do dataset_type na nova migração)
      setIntent((aiDecision?.dataset_type as DashboardIntent) || 'unknown');

      // Processar linhas
      const rows: Record<string, unknown>[] = Array.isArray(dataset?.sample_data)
        ? dataset.sample_data
        : [];

      // Processar colunas
      const { columns, correctionMap } = processColumns(dataset?.original_columns, rows);
      setTableData(rows);
      setTableColumns(columns);

      // Processar widgets (agora chamados de dashboard_blocks)
      const { metrics, charts } = processWidgets(
        blocks,
        rows,
        columns,
        correctionMap
      );

      // Métricas derivadas se não houver métricas salvas
      const finalMetrics = metrics.length > 0
        ? metrics
        : createDefaultMetrics(dataset, rows, columns, 'ready');

      // Montar objeto do dashboard
      const formattedDashboard: DashboardProject = {
        id: data.id,
        userId,
        name: typedData.title,
        fileName: dataset?.name || 'Untitled',
        fileType: 'excel', // Simplificado na nova migração
        status: 'ready',
        createdAt: new Date(typedData.created_at),
        updatedAt: new Date(typedData.created_at),
        columns: dataset?.original_columns || [],
        rowCount: dataset?.row_count || rows.length,
        metrics: finalMetrics,
        charts,
        accessLevel: 'private', // Valor padrão se não houver na tabela
      };

      setDashboard(formattedDashboard);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      navigate('/dashboard');
    } finally {
      setIsLoadingData(false);
    }
  }, [dashboardId, userId, navigate]);

  // ============================================================================
  // Refresh
  // ============================================================================

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  }, [fetchDashboardData]);

  // ============================================================================
  // Atualizar Intent
  // ============================================================================

  const updateIntent = useCallback(async (nextIntent: DashboardIntent) => {
    setIntent(nextIntent);
    if (!semanticDatasetId) return;

    try {
      const { error: updErr } = await supabase
        .from('ai_decisions')
        .update({
          dataset_type: nextIntent
        })
        .eq('id', semanticDatasetId);

      if (updErr) throw updErr;

      await fetchDashboardData();
      toast({ title: 'Intenção atualizada', description: 'O dashboard foi recalculado.' });
    } catch (e) {
      console.error('Error updating intent:', e);
      toast({
        title: 'Erro ao atualizar intenção',
        description: 'Não foi possível salvar a intenção.',
        variant: 'destructive'
      });
    }
  }, [semanticDatasetId, fetchDashboardData, toast]);

  // ============================================================================
  // Operações de Dados
  // ============================================================================

  const updateTableRows = useCallback(async (rows: Record<string, unknown>[]) => {
    if (!structuredDatasetId) {
      toast({
        title: 'Dataset não encontrado',
        description: 'Não foi possível identificar o dataset para salvar as alterações.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('datasets')
      .update({ sample_data: rows })
      .eq('id', structuredDatasetId);

    if (error) throw error;
    setTableData(rows);
  }, [structuredDatasetId, toast]);

  const updateTableStructure = useCallback(async (
    structure: ColumnStructure[],
    rows: Record<string, unknown>[]
  ) => {
    if (!structuredDatasetId) {
      toast({
        title: 'Dataset não encontrado',
        description: 'Não foi possível identificar o dataset para salvar as alterações.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('datasets')
      .update({
        original_columns: structure,
        sample_data: rows
      })
      .eq('id', structuredDatasetId);

    if (error) throw error;

    setTableData(rows);
    setTableColumns(structure.map(c => c.name));
  }, [structuredDatasetId, toast]);

  // ============================================================================
  // Effect Inicial
  // ============================================================================

  useEffect(() => {
    if (dashboardId && userId) {
      fetchDashboardData();
    }
  }, [dashboardId, userId, fetchDashboardData]);

  return {
    dashboard,
    isLoadingData,
    isRefreshing,
    tableData,
    tableColumns,
    structuredDatasetId,
    semanticDatasetId,
    intent,
    fetchDashboardData,
    refreshDashboard,
    updateIntent,
    updateTableRows,
    updateTableStructure,
  };
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Processa estrutura de colunas, detectando e corrigindo corrupção
 */
function processColumns(
  structure: any[] | undefined,
  rows: Record<string, unknown>[]
): { columns: string[]; correctionMap: Map<string, string> } {
  const colsFromStructure: string[] = Array.isArray(structure)
    ? structure.map((c: any) => c?.name).filter(Boolean)
    : [];

  const isCorrupted = isColumnStructureCorrupted(colsFromStructure);

  const columns = (colsFromStructure.length && !isCorrupted)
    ? colsFromStructure
    : (rows[0] ? Object.keys(rows[0]) : []);

  const correctionMap = isCorrupted && rows.length > 0
    ? createColumnCorrectionMap(colsFromStructure, Object.keys(rows[0]))
    : new Map<string, string>();

  return { columns, correctionMap };
}

/**
 * Processa widgets em métricas e gráficos
 */
function processWidgets(
  widgets: any[],
  rows: Record<string, unknown>[],
  columns: string[],
  correctionMap: Map<string, string>
): { metrics: DashboardMetric[]; charts: ChartConfig[] } {
  const localNumericCols = findNumericColumns(columns, rows);

  const metrics: DashboardMetric[] = widgets
    .filter((w: any) => w.type === 'metric')
    .map((w: any) => ({
      id: w.id,
      ...w.config,
    }));

  const charts: ChartConfig[] = widgets
    .filter((w: any) => w.type === 'chart')
    .map((w: any) => {
      const cfg = w.config || {};

      // Suporte a versões antigas
      let xKey = cfg.builder?.xKey || cfg.xKey || cfg.x_key;
      let yKey = cfg.builder?.yKey || cfg.yKey || cfg.y_key;
      const agg = cfg.builder?.agg || cfg.agg || cfg.aggregation || 'sum';

      // Corrigir chaves corrompidas
      if (correctionMap.size > 0) {
        xKey = correctionMap.get(xKey) || xKey;
        yKey = correctionMap.get(yKey) || yKey;
      }

      const format = cfg.format || detectChartFormat(agg as any, yKey);

      // Recalcular dados dinamicamente
      if (xKey && rows.length > 0) {
        const effectiveYKey = yKey || localNumericCols[0];
        const derivedData = buildChartData(rows, {
          xKey,
          yKey: effectiveYKey,
          agg: agg as any,
        });

        return {
          ...cfg,
          id: w.id,
          title: cfg.title || 'Gráfico',
          type: cfg.type || 'bar',
          data: derivedData,
          xKey,
          yKey: effectiveYKey,
          agg,
          format,
        };
      }

      return { ...cfg, id: w.id, format };
    });

  return { metrics, charts };
}

/**
 * Cria métricas padrão quando não há métricas salvas
 */
function createDefaultMetrics(
  source: any,
  rows: Record<string, unknown>[],
  columns: string[],
  status: DashboardProject['status']
): DashboardMetric[] {
  return [
    {
      id: 'rows',
      label: 'Total de Registros',
      value: source?.row_count ?? rows.length,
      icon: 'chart',
      color: 'blue',
    },
    {
      id: 'cols',
      label: 'Total de Colunas',
      value: columns.length,
      icon: 'box',
      color: 'purple',
    },
    {
      id: 'filled',
      label: 'Células preenchidas',
      value: rows.length * columns.length,
      icon: 'percent',
      color: 'green',
    },
    {
      id: 'source_status',
      label: 'Status',
      value: status === 'ready' ? 'concluído' : status,
      icon: 'users',
      color: 'orange',
    },
  ];
}
