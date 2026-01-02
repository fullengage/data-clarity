import { useState, useEffect } from 'react';
import { DashboardProject, DashboardMetric, ChartConfig, DashboardIntent } from '@/types/dashboard';
import { supabase } from '@/lib/supabase';
import { cleanDataArray } from '@/lib/dataCleanup';
import { useToast } from '@/hooks/use-toast';

export function useDashboards(userId: string | undefined) {
  const [dashboards, setDashboards] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const normalizeMetric = (input: any, id: string): DashboardMetric => {
    const labelRaw = input?.label ?? input?.name ?? input?.title;
    const label = typeof labelRaw === 'string' && labelRaw.trim().length > 0 ? labelRaw.trim() : 'Métrica';
    return {
      id,
      label,
      value: input?.value ?? 0,
      prefix: input?.prefix,
      suffix: input?.suffix,
      change: input?.change,
      changeType: input?.changeType,
      icon: input?.icon,
      color: input?.color,
      ...(typeof input?.description === 'string' ? { description: input.description } : {}),
    } as any;
  };

  const fetchDashboards = async () => {
    if (!userId) {
      setDashboards([]);
      setIsLoading(false);
      return;
    }

    try {
      const formatted: DashboardProject[] = [];

      // 1) Buscar dashboards com datasets
      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from('dashboards')
        .select('*, datasets(*)')
        .order('created_at', { ascending: false });

      if (dashboardsError) {
        console.warn('Error fetching dashboards:', dashboardsError);
        setDashboards([]);
        return;
      }

      if (!dashboardsData || dashboardsData.length === 0) {
        console.log('📊 [Dashboards] Found 0 dashboards');
        setDashboards([]);
        return;
      }

      // Filtrar apenas dashboards do usuário
      const userDashboards = dashboardsData.filter((d: any) => 
        d.datasets?.user_id === userId
      );

      const dashboardIds = userDashboards.map((d: any) => d.id);

      // 2) Buscar dashboard_blocks em lote
      const { data: blocksData, error: blocksError } = await supabase
        .from('dashboard_blocks')
        .select('id, dashboard_id, type, title, config, position')
        .in('dashboard_id', dashboardIds);

      if (blocksError) {
        console.warn('Error fetching dashboard_blocks:', blocksError);
      }

      // Agrupar blocks por dashboard_id
      const blocksByDashboard = new Map<string, any[]>();
      for (const block of blocksData || []) {
        const list = blocksByDashboard.get(block.dashboard_id) || [];
        list.push(block);
        blocksByDashboard.set(block.dashboard_id, list);
      }

      // 3) Montar dashboards formatados
      for (const dashboard of userDashboards) {
        const dataset = dashboard.datasets;
        if (!dataset) continue;

        const blocks = blocksByDashboard.get(dashboard.id) || [];
        const metrics = blocks
          .filter((b: any) => b.type === 'metric')
          .map((b: any) => normalizeMetric(b.config || {}, b.id));

        const charts = blocks
          .filter((b: any) => b.type === 'chart')
          .map((b: any) => ({ ...b.config, id: b.id }));

        formatted.push({
          id: dashboard.id,
          userId: userId,
          name: dashboard.title || dataset.name || 'Untitled',
          description: dashboard.description,
          fileName: dataset.name || 'Untitled',
          fileType: 'excel',
          status: 'ready',
          createdAt: new Date(dashboard.created_at),
          updatedAt: new Date(dashboard.created_at),
          columns: dataset.original_columns || [],
          rowCount: dataset.row_count || 0,
          metrics,
          charts,
          accessLevel: 'team',
        });
      }

      console.log(`📊 [Dashboards] Found ${formatted.length} dashboards`);
      setDashboards(formatted);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      toast({
        title: 'Erro ao carregar dashboards',
        description: 'Não foi possível sincronizar com o banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchDashboards();
  }, [userId]);

  const addDashboard = async (
    dashboard: DashboardProject,
    dataPayload?: { data: any[], columns: any[] },
    options?: { intent?: DashboardIntent }
  ) => {
    if (!userId) return;

    try {
      // 0. Sync user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        await supabase.from('users').upsert({
          id: userId,
          email: user.email,
          name: user.user_metadata.name || user.email?.split('@')[0]
        });
      }

      // 1. Create Dataset
      const cleanedData = cleanDataArray(dataPayload?.data || []);
      
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          user_id: userId,
          name: dashboard.fileName,
          original_columns: dashboard.columns || [],
          sample_data: cleanedData.slice(0, 10),
          row_count: dashboard.rowCount || 0
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      // 2. Create AI Decision (opcional)
      const { data: aiDecision } = await supabase
        .from('ai_decisions')
        .insert({
          dataset_id: dataset.id,
          dataset_type: options?.intent || 'generico',
          field_map: {},
          metrics: dashboard.metrics || [],
          charts: dashboard.charts || [],
          confidence: 0.8
        })
        .select()
        .single();

      // 3. Create Dashboard
      const { data: newDash, error: dashError } = await supabase
        .from('dashboards')
        .insert({
          dataset_id: dataset.id,
          ai_decision_id: aiDecision?.id,
          title: dashboard.name,
          description: dashboard.description || 'Auto-generated dashboard',
        })
        .select()
        .single();

      if (dashError) throw dashError;

      // 4. Create Dashboard Blocks (métricas e gráficos)
      const blocksToInsert = [];
      if (dashboard.metrics) {
        dashboard.metrics.forEach((m, idx) => {
          blocksToInsert.push({
            dashboard_id: newDash.id,
            type: 'metric',
            title: m.label || 'Métrica',
            config: m,
            position: { h: 1, w: 2, x: 0, y: idx }
          });
        });
      }
      if (dashboard.charts) {
        dashboard.charts.forEach((c, idx) => {
          blocksToInsert.push({
            dashboard_id: newDash.id,
            type: 'chart',
            title: c.title || 'Gráfico',
            config: c,
            position: { h: 4, w: 4, x: 0, y: (dashboard.metrics?.length || 0) + idx }
          });
        });
      }

      if (blocksToInsert.length > 0) {
        const { error: blockErr } = await supabase.from('dashboard_blocks').insert(blocksToInsert);
        if (blockErr) console.warn('Error saving initial blocks:', blockErr);
      }

      setIsLoading(true);
      await fetchDashboards();

      return newDash;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Falha ao gravar no banco de dados.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateDashboard = async (id: string, updates: Partial<DashboardProject>) => {
    // If we are adding metrics/charts, we need to insert them into dashboard_blocks table
    if (updates.metrics || updates.charts) {
      const blocksToInsert = [];

      if (updates.metrics) {
        updates.metrics.forEach((m, idx) => {
          blocksToInsert.push({
            dashboard_id: id,
            type: 'metric',
            title: m.label || 'Métrica',
            config: m,
            position: { h: 1, w: 2, x: 0, y: idx }
          });
        });
      }

      if (updates.charts) {
        updates.charts.forEach((c, idx) => {
          blocksToInsert.push({
            dashboard_id: id,
            type: 'chart',
            title: c.title || 'Gráfico',
            config: c,
            position: { h: 4, w: 4, x: 0, y: (updates.metrics?.length || 0) + idx }
          });
        });
      }

      if (blocksToInsert.length > 0) {
        const { error } = await supabase.from('dashboard_blocks').insert(blocksToInsert);
        if (error) console.error('Error saving blocks:', error);
      }
    }

    // Update title/description
    if (updates.name || updates.description) {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.title = updates.name;
      if (updates.description) dbUpdates.description = updates.description;

      await supabase
        .from('dashboards')
        .update(dbUpdates)
        .eq('id', id);
    }

    // Refresh local
    await fetchDashboards();
  };

  const deleteDashboard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDashboards(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o dashboard.',
        variant: 'destructive'
      });
    }
  };


  const getDashboard = (id: string) => {
    return dashboards.find(d => d.id === id);
  };

  return {
    dashboards,
    isLoading,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    getDashboard,
  };
}
