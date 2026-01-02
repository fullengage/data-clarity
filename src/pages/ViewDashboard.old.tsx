import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboards } from '@/hooks/useDashboards';
import AppLayout from '@/components/layout/AppLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import ChartCard from '@/components/dashboard/ChartCard';
import DataTable from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import OnboardingTour from '@/components/dashboard/OnboardingTour';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Calendar,
  Sparkles,
  Briefcase,
  TrendingDown,
  TrendingUp,
  LayoutDashboard,
  Factory,
  User,
  CreditCard,
  History,
  Activity,
  DollarSign,
  Lock,
  Globe
} from 'lucide-react';
import { DashboardIntent, DashboardProject, DashboardMetric, ChartConfig } from '@/types/dashboard';
import { askAiForWidget, askAiForFormula } from '@/lib/webhookService';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { evaluateFormula } from '@/lib/formulaEngine';
import { FormulaDialog } from '@/components/dashboard/FormulaDialog';
import { generateSmartMetrics, convertToDashboardMetrics } from '@/lib/smartMetrics';

// Mock data for demonstration when no real data exists
const mockMetrics: DashboardMetric[] = [
  { id: '1', label: 'Faturamento Total', value: 'R$ 1.477.273,86', icon: 'dollar', color: 'blue' },
  { id: '2', label: 'Ticket Médio', value: 'R$ 32.114,65', icon: 'users', color: 'orange' },
  { id: '3', label: 'Total de Pedidos', value: '46', icon: 'cart', color: 'green' },
  { id: '4', label: 'Mix Médio', value: '7,8 produtos', icon: 'box', color: 'purple' },
];

const mockCharts: ChartConfig[] = [
  {
    id: '1',
    type: 'bar',
    title: 'Distribuição por Classe ABC',
    data: [
      { name: 'A', value: 740000 },
      { name: 'B', value: 460000 },
      { name: 'C', value: 300000 },
    ],
  },
  {
    id: '2',
    type: 'pie',
    title: 'Vendas por Categoria',
    data: [
      { name: 'Categoria A', value: 42 },
      { name: 'Categoria B', value: 39 },
      { name: 'Categoria C', value: 17 },
      { name: 'Outros', value: 2 },
    ],
  },
];

const mockTableData = [
  { Produto: 'Produto A', Categoria: 'Cat 1', Valor: 'R$ 15.000', Quantidade: 50 },
  { Produto: 'Produto B', Categoria: 'Cat 2', Valor: 'R$ 22.000', Quantidade: 75 },
  { Produto: 'Produto C', Categoria: 'Cat 1', Valor: 'R$ 8.500', Quantidade: 30 },
  { Produto: 'Produto D', Categoria: 'Cat 3', Valor: 'R$ 45.000', Quantidade: 120 },
  { Produto: 'Produto E', Categoria: 'Cat 2', Valor: 'R$ 12.300', Quantidade: 45 },
];

export default function ViewDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getDashboard, dashboards } = useDashboards(user?.id);
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardProject | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [structuredDatasetId, setStructuredDatasetId] = useState<string | null>(null);
  const [semanticDatasetId, setSemanticDatasetId] = useState<string | null>(null);
  const [intent, setIntent] = useState<DashboardIntent>('unknown');
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [newChartTitle, setNewChartTitle] = useState('');
  const [newChartType, setNewChartType] = useState<ChartConfig['type']>('bar');
  const [newChartXKey, setNewChartXKey] = useState<string>('');
  const [newChartYKey, setNewChartYKey] = useState<string>('');
  const [newChartAgg, setNewChartAgg] = useState<'count' | 'sum' | 'avg'>('sum');

  const [isRowEditorOpen, setIsRowEditorOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, unknown> | null>(null);
  const [isSavingRow, setIsSavingRow] = useState(false);

  // AI Card Engine state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
  const [formulaToEdit, setFormulaToEdit] = useState<{ name: string; formula: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('Dezembro 2024');

  // Metric Editor state
  const [isMetricEditorOpen, setIsMetricEditorOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DashboardMetric | null>(null);
  const [metricLabel, setMetricLabel] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricIcon, setMetricIcon] = useState('chart');
  const [metricColor, setMetricColor] = useState('blue');
  const [metricPrefix, setMetricPrefix] = useState('');
  const [metricSuffix, setMetricSuffix] = useState('');
  const [isSavingMetric, setIsSavingMetric] = useState(false);

  const [isVisibilityDialogOpen, setIsVisibilityDialogOpen] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const isProbablyNumber = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const normalized = trimmed.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num);
  };

  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const clean = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const num = Number(clean);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  };

  const isProbablyDate = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (value instanceof Date) return true;
    if (typeof value !== 'string') return false;
    const s = value.trim();
    if (!s) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return true;
    return false;
  };

  const toDate = (value: unknown): Date | null => {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return Number.isFinite(d.getTime()) ? d : null;
    }

    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
      const d = new Date(yy, mm - 1, dd);
      return Number.isFinite(d.getTime()) ? d : null;
    }

    return null;
  };

  const formatDateBR = (d: Date) => {
    try {
      return new Intl.DateTimeFormat('pt-BR').format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  const availableNumericColumns = useMemo(() => {
    return tableColumns.filter((col) => {
      const sample = tableData.slice(0, 30).map((r) => r?.[col]);
      return sample.some((v) => isProbablyNumber(v));
    });
  }, [tableColumns, tableData]);

  const detectFormat = (agg: string, yKey?: string): ChartConfig['format'] => {
    if (agg === 'count') return 'number';
    const key = yKey?.toLowerCase() || '';
    if (key.includes('receita') || key.includes('valor') || key.includes('faturamento') || key.includes('custo') || key.includes('preço')) {
      return 'currency';
    }
    if (key.includes('percentual') || key.includes('porcentagem') || key.includes('taxa')) {
      return 'percentage';
    }
    return 'number';
  };

  const buildChartData = (rows: Record<string, unknown>[], params: { xKey: string; yKey?: string; agg: 'count' | 'sum' | 'avg' }) => {
    const { xKey, yKey, agg } = params;
    const groups = new Map<string, { sum: number; count: number }>();

    rows.forEach((r) => {
      const rawName = r?.[xKey];
      let name = rawName === null || rawName === undefined || String(rawName).trim() === '' ? '(vazio)' : String(rawName);

      // Se detectarmos que é uma data e estamos agrupando por data, vamos formatar para exibir melhor
      if (isProbablyDate(rawName)) {
        const d = toDate(rawName);
        if (d) {
          // Usamos o formato BR, mas garantimos que as chaves sejam únicas no mapa se houver horas?
          // Para gráfico de "evolução", geralmente queremos agrupar por DIA.
          name = formatDateBR(d);
        }
      }

      const current = groups.get(name) || { sum: 0, count: 0 };
      current.count += 1;

      if (agg !== 'count' && yKey) {
        current.sum += toNumber(r?.[yKey]);
      }

      groups.set(name, current);
    });

    let data = Array.from(groups.entries()).map(([name, v]) => {
      const value = agg === 'count' ? v.count : agg === 'avg' ? (v.count ? v.sum / v.count : 0) : v.sum;
      return { name, value };
    });

    // Se a agregação falhou e retornou tudo zero/um (e queríamos soma),
    // e temos um yKey, vamos verificar se o toNumber está funcionando
    if (agg === 'sum' && yKey && data.every(d => d.value <= 1) && rows.length > 0) {
      console.warn(`[buildChartData] Data seems suspicious for column ${yKey}. Retrying with stricter parsing.`);
    }

    // Ordenação Inteligente:
    // Se o xKey parece uma data, ordena cronologicamente
    const firstVal = rows[0]?.[xKey];
    if (isProbablyDate(firstVal)) {
      data.sort((a, b) => {
        const da = toDate(a.name);
        const db = toDate(b.name);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      });
      return data.slice(0, 50);
    }

    // Para gráficos de ranking/top (muitas categorias), ordenar por valor decrescente
    if (data.length > 10) {
      data.sort((a, b) => b.value - a.value);
      const top9 = data.slice(0, 9);
      const others = data.slice(9);
      const othersSum = others.reduce((acc, d) => acc + d.value, 0);

      return [
        ...top9,
        { name: 'Outros', value: othersSum }
      ];
    }

    // Para poucos itens, manter ordem de aparição
    const orderMap = new Map<string, number>();
    rows.forEach((r, idx) => {
      const rawName = r?.[xKey];
      let name = rawName === null || rawName === undefined || String(rawName).trim() === '' ? '(vazio)' : String(rawName);
      if (!orderMap.has(name)) {
        orderMap.set(name, idx);
      }
    });

    data.sort((a, b) => {
      const orderA = orderMap.get(a.name) ?? 999999;
      const orderB = orderMap.get(b.name) ?? 999999;
      return orderA - orderB;
    });

    return data.slice(0, 50);
  };


  const handleOpenRowEditor = (rowIndex: number, row: Record<string, unknown>) => {
    setEditingRowIndex(rowIndex);
    setEditingRowData({ ...row });
    setIsRowEditorOpen(true);
  };

  const handleSaveRowEdit = async () => {
    if (!structuredDatasetId) {
      toast({
        title: 'Dataset não encontrado',
        description: 'Não foi possível identificar o dataset para salvar as alterações.',
        variant: 'destructive',
      });
      return;
    }
    if (editingRowIndex === null || !editingRowData) return;

    setIsSavingRow(true);
    try {
      const nextRows = [...tableData];
      nextRows[editingRowIndex] = editingRowData;
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      setIsRefreshing(true);
      setIsRowEditorOpen(false);
      setEditingRowIndex(null);
      setEditingRowData(null);

      await fetchDashboardData();
      toast({ title: 'Dados atualizados', description: 'A linha foi salva com sucesso.' });
    } catch (e) {
      console.error('Error saving row edit:', e);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a edição. Verifique permissões (RLS) e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingRow(false);
      setIsRefreshing(false);
    }
  };

  const handleEditCell = async (rowIndex: number, column: string, value: unknown) => {
    if (!structuredDatasetId) return;
    setIsRefreshing(true);

    try {
      const nextRows = [...tableData];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [column]: value };
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Valor atualizado' });
    } catch (e) {
      console.error('Error editing cell:', e);
      toast({ title: 'Erro ao salvar valor', variant: 'destructive' });
      fetchDashboardData(); // Reverte se falhar
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRenameColumn = async (oldName: string, newName: string) => {
    if (!structuredDatasetId || !dashboard) return;
    setIsRefreshing(true);

    try {
      // 1. Atualiza cabeçalhos locais
      const nextCols = tableColumns.map(c => c === oldName ? newName : c);
      setTableColumns(nextCols);

      // 2. Atualiza dados locais (chaves dos objetos)
      const nextRows = tableData.map(row => {
        const newRow: Record<string, unknown> = {};
        Object.keys(row).forEach(key => {
          const newKey = key === oldName ? newName : key;
          newRow[newKey] = row[key];
        });
        return newRow;
      });
      setTableData(nextRows);

      // 3. Prepara estrutura para o DB
      const nextStructure = (dashboard.columns as any[]).map(c =>
        c.name === oldName ? { ...c, name: newName } : c
      );

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Coluna renomeada com sucesso' });
    } catch (e) {
      console.error('Error renaming column:', e);
      toast({ title: 'Erro ao renomear coluna', variant: 'destructive' });
      fetchDashboardData(); // Reverte se falhar
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!structuredDatasetId) return;

    const ok = window.confirm('Tem certeza que deseja excluir este registro?');
    if (!ok) return;

    setIsRefreshing(true);
    try {
      const nextRows = tableData.filter((_, i) => i !== rowIndex);
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Registro excluído' });
    } catch (e) {
      console.error('Error deleting row:', e);
      toast({ title: 'Erro ao excluir registro', variant: 'destructive' });
      fetchDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteColumn = async (column: string) => {
    if (!structuredDatasetId || !dashboard) return;

    const ok = window.confirm(`Tem certeza que deseja excluir a coluna "${column}"? Todos os dados desta coluna serão perdidos.`);
    if (!ok) return;

    setIsRefreshing(true);
    try {
      // 1. Remove coluna dos cabeçalhos
      const nextCols = tableColumns.filter(c => c !== column);
      setTableColumns(nextCols);

      // 2. Remove campo dos dados
      const nextRows = tableData.map(row => {
        const { [column]: _, ...rest } = row;
        return rest;
      });
      setTableData(nextRows);

      // 3. Atualiza estrutura (Garantindo que filtramos independente do formato inicial)
      const currentStructure = Array.isArray(dashboard.columns) ? dashboard.columns : [];
      const nextStructure = currentStructure.filter((c: any) => c.name !== column);

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;

      await fetchDashboardData();
      toast({
        title: 'Coluna removida',
        description: `A coluna "${column}" e seus dados associados foram excluídos.`
      });
    } catch (e) {
      console.error('Error deleting column:', e);
      toast({
        title: 'Erro ao excluir coluna',
        description: 'Não foi possível completar a operação no banco de dados.',
        variant: 'destructive'
      });
      await fetchDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRow = async () => {
    if (!structuredDatasetId) return;
    setIsRefreshing(true);
    try {
      const newRow: Record<string, unknown> = {};
      tableColumns.forEach(col => newRow[col] = '');
      const nextRows = [...tableData, newRow];
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Linha adicionada' });
    } catch (e) {
      console.error('Error adding row:', e);
      toast({ title: 'Erro ao adicionar linha', variant: 'destructive' });
      fetchDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddColumn = async () => {
    const columnName = window.prompt('Nome da nova coluna:');
    if (!columnName || !structuredDatasetId || !dashboard) return;

    if (tableColumns.includes(columnName)) {
      toast({ title: 'Coluna já existe', variant: 'destructive' });
      return;
    }

    setIsRefreshing(true);
    try {
      const nextCols = [...tableColumns, columnName];
      const nextRows = tableData.map(row => ({ ...row, [columnName]: '' }));
      const nextStructure = [...(dashboard.columns as any[]), { name: columnName, type: 'string' }];

      setTableColumns(nextCols);
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Coluna adicionada' });
    } catch (e) {
      console.error('Error adding column:', e);
      toast({ title: 'Erro ao adicionar coluna', variant: 'destructive' });
      fetchDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };


  const fetchDashboardData = async () => {
    if (!id || !user?.id) return;

    setIsLoadingData(true);
    try {
      // Load dashboard + dataset rows through relations
      const { data, error } = await supabase
        .from('dashboards')
        .select(`
          id,
          title,
          description,
          created_at,
          widgets (
            id,
            type,
            config
          ),
          semantic_datasets (
            id,
            dataset_type,
            semantic_map,
            structured_datasets (
              id,
              user_id,
              structure,
              normalized_rows,
              sources (
                file_name,
                source_type,
                row_count,
                status
              )
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard');
        return;
      }

      const struct = (data as any)?.semantic_datasets?.structured_datasets;
      const source = struct?.sources;
      const semantic = (data as any)?.semantic_datasets;

      const hasStructure = Array.isArray(struct?.structure) ? struct.structure.length > 0 : !!struct?.structure;
      const hasRows = Array.isArray(struct?.normalized_rows) ? struct.normalized_rows.length > 0 : (source?.row_count || 0) > 0;
      const effectiveStatus: DashboardProject['status'] =
        source?.status === 'processing' && hasStructure && hasRows ? 'ready' : (source?.status || 'ready');

      // Ensure the dashboard belongs to the logged-in user
      if (struct?.user_id && struct.user_id !== user.id) {
        navigate('/dashboard');
        return;
      }

      const widgets = (data as any)?.widgets || [];

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
          trend: input?.trend,
          status: input?.status,
          insight: input?.insight,
          color: input?.color,
          icon: input?.icon,
          ...(typeof input?.description === 'string' ? { description: input.description } : {}),
        };
      };

      const metrics: DashboardMetric[] = widgets
        .filter((w: any) => w.type === 'metric')
        .map((w: any) => normalizeMetric(w.config || {}, w.id));

      const rows: Record<string, unknown>[] = Array.isArray(struct?.normalized_rows)
        ? struct.normalized_rows
        : [];

      setStructuredDatasetId(struct?.id || null);
      setSemanticDatasetId(semantic?.id || null);

      const semanticIntent = (semantic as any)?.semantic_map?.__meta?.intent as DashboardIntent | undefined;
      setIntent(semanticIntent || 'unknown');

      // Extrair nomes de colunas da estrutura
      const colsFromStructure: string[] = Array.isArray(struct?.structure)
        ? struct.structure.map((c: any) => c?.name).filter(Boolean)
        : [];

      // Validar se colsFromStructure não está corrompido (contendo dados ao invés de nomes)
      // Se a primeira coluna tiver mais de 50 caracteres ou números, provavelmente é dado corrompido
      const isStructureCorrupted = colsFromStructure.some(col =>
        col.length > 50 || /^\d+$/.test(col) || col.includes('LTDA') || col.includes('S/A')
      );

      // Se estrutura está corrompida ou vazia, usar chaves dos dados reais
      const derivedColumns = (colsFromStructure.length && !isStructureCorrupted)
        ? colsFromStructure
        : (rows[0] ? Object.keys(rows[0]) : []);

      setTableData(rows);
      setTableColumns(derivedColumns);

      const localNumericCols = derivedColumns.filter((col) => {
        const sample = rows.slice(0, 30).map((r) => r?.[col]);
        return sample.some((v) => isProbablyNumber(v));
      });

      // Criar mapa de correção: nomes corrompidos → nomes corretos
      const columnCorrectionMap = new Map<string, string>();
      if (isStructureCorrupted && rows.length > 0) {
        const realColumns = Object.keys(rows[0]);
        colsFromStructure.forEach((corruptedName, index) => {
          if (index < realColumns.length) {
            columnCorrectionMap.set(corruptedName, realColumns[index]);
          }
        });
      }

      const charts: ChartConfig[] = widgets
        .filter((w: any) => w.type === 'chart')
        .map((w: any) => {
          const cfg = w.config || {};

          // Legacy support: if builder doesn't exist, try to find keys at top level
          let xKey = cfg.builder?.xKey || cfg.xKey || cfg.x_key;
          let yKey = cfg.builder?.yKey || cfg.yKey || cfg.y_key;
          const agg = cfg.builder?.agg || cfg.agg || cfg.aggregation || 'sum';

          // ✅ CORREÇÃO: Se as chaves estão corrompidas, mapear para os nomes corretos
          if (columnCorrectionMap.size > 0) {
            xKey = columnCorrectionMap.get(xKey) || xKey;
            yKey = columnCorrectionMap.get(yKey) || yKey;
          }

          // Detectar formato
          const format = cfg.format || detectFormat(agg as string, yKey);

          // SEMPRE Recalcular dados para garantir que o gráfico seja dinâmico
          // Se tivermos as chaves e houver dados na tabela, reconstruímos o data
          if (xKey && rows.length > 0) {
            const effectiveYKey = yKey || localNumericCols[0] || availableNumericColumns[0];
            const derivedData = buildChartData(rows, {
              xKey,
              yKey: effectiveYKey,
              agg: agg as any || 'sum',
            });

            return {
              ...cfg,
              id: w.id,
              title: cfg.title || 'Gráfico',
              type: cfg.type || 'bar',
              data: derivedData,
              xKey,
              yKey: effectiveYKey,
              agg: agg || 'sum',
              format: cfg.format || format,
            };
          }

          return { ...cfg, id: w.id, format: cfg.format || format };
        });

      const derivedMetrics: DashboardMetric[] = metrics.length
        ? metrics
        : [
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
            value: derivedColumns.length,
            icon: 'box',
            color: 'purple',
          },
          {
            id: 'filled',
            label: 'Células preenchidas',
            value: rows.length * derivedColumns.length,
            icon: 'percent',
            color: 'green',
          },
          {
            id: 'source_status',
            label: 'Status',
            value: effectiveStatus === 'ready' ? 'concluído' : effectiveStatus,
            icon: 'users',
            color: 'orange',
          },
        ];

      const formatted: DashboardProject = {
        id: data.id,
        userId: user.id,
        name: data.title,
        fileName: source?.file_name || 'Untitled',
        fileType: source?.source_type === 'upload' ? 'excel' : 'csv',
        status: effectiveStatus,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.created_at),
        columns: struct?.structure || [],
        rowCount: source?.row_count || rows.length,
        metrics: derivedMetrics,
        charts,
      };

      setDashboard(formatted);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      navigate('/dashboard');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!id || !user) return;

    // Use cached dashboard quickly (if available) but still fetch real rows
    if (dashboards.length > 0) {
      const found = getDashboard(id);
      if (found) setDashboard(found);
    }

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    window.print();
  };

  const handleShare = () => {
    setIsVisibilityDialogOpen(true);
  };

  const handleUpdateVisibility = async (level: 'private' | 'team') => {
    if (!id || !dashboard) return;

    setIsUpdatingVisibility(true);
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({ access_level: level })
        .eq('id', id);

      if (error) throw error;

      setDashboard(prev => prev ? { ...prev, accessLevel: level } : null);
      toast({
        title: level === 'team' ? 'Compartilhado com o Time' : 'Privado',
        description: level === 'team'
          ? 'Agora todos na sua empresa podem ver este dashboard.'
          : 'Este dashboard agora é visível apenas para você e administradores.'
      });
      setIsVisibilityDialogOpen(false);
    } catch (e) {
      console.error('Error updating visibility:', e);
      toast({ title: 'Erro ao atualizar visibilidade', variant: 'destructive' });
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleUpdateIntent = async (nextIntent: DashboardIntent) => {
    setIntent(nextIntent);
    if (!semanticDatasetId) return;

    try {
      const { data: semData, error: semErr } = await supabase
        .from('semantic_datasets')
        .select('semantic_map')
        .eq('id', semanticDatasetId)
        .maybeSingle();

      if (semErr) throw semErr;
      const currentMap = (semData as any)?.semantic_map || {};
      const currentMeta = currentMap?.__meta || {};

      const { error: updErr } = await supabase
        .from('semantic_datasets')
        .update({ semantic_map: { ...currentMap, __meta: { ...currentMeta, intent: nextIntent } } })
        .eq('id', semanticDatasetId);

      if (updErr) throw updErr;
      await fetchDashboardData();
      toast({ title: 'Intenção atualizada', description: 'O dashboard foi recalculado.' });
    } catch (e) {
      console.error('Error updating intent:', e);
      toast({ title: 'Erro ao atualizar intenção', description: 'Não foi possível salvar a intenção.', variant: 'destructive' });
    }
  };

  const handleAiRequest = async () => {
    if (!aiPrompt.trim() || !dashboard || !id) return;

    setIsAiProcessing(true);
    try {
      const { data: semData } = await supabase
        .from('semantic_datasets')
        .select('semantic_map')
        .eq('id', semanticDatasetId)
        .single();

      const result = await askAiForWidget(user?.id || '', id, aiPrompt, {
        columns: dashboard.columns,
        semanticMap: (semData as any)?.semantic_map || [],
        intent: intent,
        rowCount: dashboard.rowCount,
        fileName: dashboard.fileName,
        sourceId: structuredDatasetId || undefined,
        semanticDatasetId: semanticDatasetId || undefined,
      });

      if (result.status === 'success') {
        if (result.widgetConfig) {
          const { error: saveErr } = await supabase
            .from('widgets')
            .insert({
              dashboard_id: id,
              type: result.type,
              config: result.widgetConfig,
              position: { x: 0, y: 0, w: 3, h: 2 }, // Posição padrão obrigatória pelo schema
            });

          if (saveErr) throw saveErr;
        }

        setAiPrompt('');
        await fetchDashboardData();
        toast({
          title: 'Card criado!',
          description: result.message || 'O novo card foi adicionado ao seu dashboard.',
        });
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
  };

  const handleAiFormula = async () => {
    if (!aiPrompt.trim() || !dashboard || !id || !structuredDatasetId) return;

    setIsAiProcessing(true);
    try {
      const result = await askAiForFormula(user?.id || '', aiPrompt, {
        columns: tableColumns,
        fileName: dashboard.fileName || 'unknown',
        dashboardId: id,
      });

      if (result.status === 'success' && result.formula) {
        // 1. Calcular novos valores
        const nextRows = tableData.map(row => {
          const val = evaluateFormula(result.formula!, row);
          return { ...row, [result.columnName!]: val };
        });

        // 2. Atualizar estrutura
        const nextStructure = [...(dashboard.columns as any[]), { name: result.columnName, type: 'number' }];

        // 3. Persistir no Supabase
        const { error: updErr } = await supabase
          .from('structured_datasets')
          .update({
            structure: nextStructure,
            normalized_rows: nextRows
          })
          .eq('id', structuredDatasetId);

        if (updErr) throw updErr;

        setTableData(nextRows);
        setTableColumns([...tableColumns, result.columnName!]);

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
  };

  const handleManualFormula = async (colName: string, formulaStr: string) => {
    if (!structuredDatasetId || !dashboard) return;

    setIsRefreshing(true);
    try {
      // 1. Calcular novos valores
      const nextRows = tableData.map(row => {
        const val = evaluateFormula(formulaStr, row);
        return { ...row, [colName]: val };
      });

      // 2. Atualizar estrutura (Mantendo/adicionando a fórmula no metadata)
      const currentStructure = (dashboard.columns as any[]) || [];
      const colExists = currentStructure.findIndex((c: any) => c.name === colName);

      let nextStructure;
      if (colExists >= 0) {
        nextStructure = [...currentStructure];
        nextStructure[colExists] = { ...nextStructure[colExists], formula: formulaStr };
      } else {
        nextStructure = [...currentStructure, { name: colName, type: 'number', formula: formulaStr }];
      }

      // 3. Persistir no Supabase
      const { error: updErr } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (updErr) throw updErr;

      setTableData(nextRows);
      if (colExists < 0) {
        setTableColumns([...tableColumns, colName]);
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
      setIsRefreshing(false);
      setFormulaToEdit(null);
    }
  };

  const handleRequestEditFormula = (colName: string) => {
    const structure = (dashboard?.columns as any[]) || [];
    const colMetadata = structure.find((c: any) => c.name === colName);

    if (colMetadata?.formula) {
      setFormulaToEdit({ name: colName, formula: colMetadata.formula });
      setIsFormulaDialogOpen(true);
    } else {
      // Se não tem fórmula salva, abre vazio com o nome da coluna
      setFormulaToEdit({ name: colName, formula: '' });
      setIsFormulaDialogOpen(true);
    }
  };

  const handleOpenMetricEditor = (metric: DashboardMetric) => {
    setEditingMetric(metric);
    setMetricLabel(metric.label || '');
    setMetricValue(String(metric.value || ''));
    setMetricIcon(metric.icon || 'chart');
    setMetricColor(metric.color || 'blue');
    setMetricPrefix(metric.prefix || '');
    setMetricSuffix(metric.suffix || '');
    setIsMetricEditorOpen(true);
  };

  const handleSaveMetric = async () => {
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

      const { error } = await supabase
        .from('widgets')
        .update({ config: updatedConfig })
        .eq('id', editingMetric.id);

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
  };

  const handleDeleteMetric = async (metricId: string) => {
    const ok = window.confirm('Tem certeza que deseja excluir esta métrica?');
    if (!ok) return;

    setIsRefreshing(true);
    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', metricId);

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
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerateSmartMetrics = async () => {
    if (!id || !dashboard) return;

    setIsRefreshing(true);
    try {
      const { type, metrics } = generateSmartMetrics(tableData, tableColumns);

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
        const { error } = await supabase
          .from('widgets')
          .insert({
            dashboard_id: id,
            type: 'metric',
            config: metric,
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
        description: `${metrics.length} métricas inteligentes criadas para ${typeLabels[type]}.`,
      });
    } catch (e) {
      console.error('Error generating smart metrics:', e);
      toast({
        title: 'Erro ao gerar métricas',
        description: 'Não foi possível gerar as métricas automaticamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const derivedInsights = useMemo(() => {
    const rows = tableData;
    const cols = tableColumns;

    const rowCount = rows.length;
    const colCount = cols.length;

    const insights: string[] = [];
    insights.push(`Dataset com ${rowCount.toLocaleString('pt-BR')} linha(s) e ${colCount} coluna(s).`);

    if (rowCount === 0 || colCount === 0) {
      insights.push('Não há dados suficientes para gerar insights. Verifique se a tabela foi importada corretamente.');
      return insights;
    }

    let emptyCells = 0;
    let totalCells = 0;

    const numericCols: string[] = [];
    const dateCols: string[] = [];

    for (const c of cols) {
      const sample = rows.slice(0, 50).map((r) => r?.[c]);
      const numericHits = sample.filter((v) => isProbablyNumber(v)).length;
      const dateHits = sample.filter((v) => isProbablyDate(v)).length;

      if (numericHits >= Math.max(3, Math.ceil(sample.length * 0.6))) numericCols.push(c);
      if (dateHits >= Math.max(3, Math.ceil(sample.length * 0.6))) dateCols.push(c);
    }

    rows.forEach((r) => {
      cols.forEach((c) => {
        totalCells += 1;
        const v = r?.[c];
        if (v === null || v === undefined || String(v).trim() === '') emptyCells += 1;
      });
    });

    const filledRate = totalCells > 0 ? (totalCells - emptyCells) / totalCells : 0;
    insights.push(`Completude aproximada: ${Math.round(filledRate * 100)}% das células preenchidas.`);

    if (numericCols.length > 0) {
      insights.push(`Colunas numéricas detectadas: ${numericCols.slice(0, 4).join(', ')}${numericCols.length > 4 ? '…' : ''}.`);
    }

    if (dateCols.length > 0) {
      const c = dateCols[0];
      const dates = rows
        .map((r) => toDate(r?.[c]))
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length >= 2) {
        insights.push(`Período detectado (${c}): de ${formatDateBR(dates[0])} até ${formatDateBR(dates[dates.length - 1])}.`);
      }
    }

    // 4. BUSINESS INTELLIGENCE (Sales Focus)
    const activeCharts = dashboard?.charts || [];

    // Check for Concentration (>40% in any category)
    activeCharts.forEach(chart => {
      if (chart.data && chart.data.length > 0) {
        const total = chart.data.reduce((acc, d) => acc + (d.value || 0), 0);
        const topItem = [...chart.data].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
        if (topItem && total > 0) {
          const share = topItem.value / total;
          if (share > 0.4) {
            insights.push(`⚠️ ALERTA DE CONCENTRAÇÃO: O item "${topItem.name}" representa ${Math.round(share * 100)}% de "${chart.title}".`);
          }
        }
      }
    });

    // Performance Insights from Metrics
    dashboard?.metrics?.forEach(m => {
      if (m.change !== undefined) {
        if (m.change < -10) {
          insights.push(`🚨 QUEDA CRÍTICA: "${m.label}" caiu ${Math.abs(m.change)}% em relação ao período anterior.`);
        } else if (m.change > 15) {
          insights.push(`🚀 EXCELENTE DESEMPENHO: "${m.label}" cresceu ${m.change}%!`);
        }
      }
    });

    return insights.slice(0, 8);
  }, [tableData, tableColumns]);

  const insights = dashboard?.insights?.length ? dashboard.insights : derivedInsights;

  const metrics = dashboard?.metrics?.length ? dashboard.metrics : [];
  const charts = dashboard?.charts?.length ? dashboard.charts : [];

  // Enriquecimento Inteligente de Métricas
  const enrichedMetrics = useMemo(() => {
    return metrics.map(m => {
      const enriched = { ...m };

      // Se não tem status definido, inferir pelo change
      if (!enriched.status && enriched.change !== undefined) {
        if (enriched.change <= -10) enriched.status = 'critical';
        else if (enriched.change < 0) enriched.status = 'warning';
        else if (enriched.change > 0) enriched.status = 'good';
      }

      // Se não tem insight, gerar baseado no contexto
      if (!enriched.insight && enriched.change !== undefined) {
        if (enriched.change < -15) enriched.insight = "Queda acentuada detectada. Recomenda-se revisão imediata.";
        else if (enriched.change > 20) enriched.insight = "Crescimento excelente! Otimize para manter o ritmo.";
        else if (enriched.change > 0) enriched.insight = "Desempenho positivo e tendência de alta.";
        else if (enriched.change < 0) enriched.insight = "Leve queda. Monitore a evolução na próxima semana.";
      }

      return enriched;
    });
  }, [metrics]);

  if (!dashboard || isLoadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }


  const chartBuilderPreview: ChartConfig | null = (() => {
    if (!newChartXKey) return null;
    if (newChartAgg !== 'count' && !newChartYKey) return null;
    if (tableData.length === 0) return null;

    const data = buildChartData(tableData, {
      xKey: newChartXKey,
      yKey: newChartAgg === 'count' ? undefined : newChartYKey,
      agg: newChartAgg,
    });

    return {
      id: 'preview',
      type: newChartType,
      title: newChartTitle || 'Pré-visualização',
      data,
      xKey: newChartXKey,
      yKey: newChartAgg === 'count' ? undefined : newChartYKey,
      format: detectFormat(newChartAgg, newChartYKey),
    };
  })();

  const handleOpenChartBuilder = (chart?: ChartConfig) => {
    if (chart) {
      const anyChart = chart as any;
      const builder = anyChart?.builder;
      setEditingChartId(chart.id);
      setNewChartTitle(chart.title || '');
      setNewChartType(chart.type || 'bar');
      setNewChartXKey(builder?.xKey || chart.xKey || tableColumns[0] || '');
      setNewChartAgg(builder?.agg || (builder?.yKey ? 'sum' : 'count'));
      setNewChartYKey(builder?.yKey || chart.yKey || availableNumericColumns[0] || '');
      setIsChartBuilderOpen(true);
      return;
    }

    setEditingChartId(null);
    setNewChartTitle('');
    setNewChartType('bar');
    setNewChartXKey(tableColumns[0] || '');
    setNewChartYKey(availableNumericColumns[0] || '');
    setNewChartAgg(availableNumericColumns.length > 0 ? 'sum' : 'count');
    setIsChartBuilderOpen(true);
  };

  const handleCreateChartWidget = async () => {
    if (!id) return;
    if (!newChartXKey) {
      toast({ title: 'Selecione a coluna X', description: 'Escolha a coluna para agrupar no eixo X.', variant: 'destructive' });
      return;
    }

    if (newChartAgg !== 'count' && !newChartYKey) {
      toast({ title: 'Selecione a coluna Y', description: 'Escolha uma coluna numérica para calcular.', variant: 'destructive' });
      return;
    }

    if (tableData.length === 0) {
      toast({ title: 'Sem dados', description: 'Este dataset não possui linhas para gerar gráficos.', variant: 'destructive' });
      return;
    }

    setIsSavingChart(true);
    try {
      const data = buildChartData(tableData, {
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
        format: detectFormat(newChartAgg, newChartYKey),
        builder: {
          xKey: newChartXKey,
          yKey: newChartAgg === 'count' ? undefined : newChartYKey,
          agg: newChartAgg,
        },
      };

      const { error } = editingChartId
        ? await supabase
          .from('widgets')
          .update({ config: widgetConfig })
          .eq('id', editingChartId)
          .eq('dashboard_id', id)
        : await supabase
          .from('widgets')
          .insert({
            dashboard_id: id,
            type: 'chart',
            config: widgetConfig,
            position: {},
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
  };

  const handleDeleteChart = async (chartId: string) => {
    if (!id) return;

    const ok = window.confirm('Excluir este gráfico?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', chartId)
        .eq('dashboard_id', id);

      if (error) throw error;
      await fetchDashboardData();
      toast({ title: 'Gráfico excluído', description: 'O gráfico foi removido do dashboard.' });
    } catch (e) {
      console.error('Error deleting chart widget:', e);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o gráfico.', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <OnboardingTour />
      <div className="min-h-screen bg-gradient-sales p-4 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className={cn(
            "rounded-xl p-6 lg:p-10 mb-8 shadow-md border-l-[6px] transition-all duration-500",
            intent === 'financial'
              ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-900/20"
              : "bg-white border-[#0066cc] text-slate-900"
          )}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="no-print">
                  <Button variant="ghost" size="icon" className={cn("hover:bg-black/10", intent === 'financial' && "text-white")}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#1a1a1a]">
                      {intent === 'financial' ? '💎' : '📊'} {dashboard.name}
                    </h1>
                    {intent === 'financial' && (
                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors">
                        Modo Executivo Financeiro
                      </Badge>
                    )}
                  </div>
                  <p className={cn("text-sm mt-1 opacity-80", intent === 'financial' ? "text-emerald-50 text-white/80" : "text-[#666]")}>
                    {intent === 'financial' ? `${dashboard.fileName} • ${dashboard.rowCount.toLocaleString('pt-BR')} registros` : 'Acompanhe sua performance comercial em tempo real'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={cn(
                  "p-1 rounded-xl flex gap-1 mr-2 border",
                  intent === 'financial' ? "bg-black/20 border-white/10" : "bg-white border-[#ddd]"
                )}>
                  {['Dezembro 2024', 'Hoje', '7D', '30D'].map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 text-xs px-4 rounded-lg transition-all",
                        selectedPeriod === p
                          ? (intent === 'financial' ? "bg-white text-emerald-800 shadow-sm" : "bg-[#0066cc] text-white shadow-sm border-[#0066cc]")
                          : (intent === 'financial' ? "text-white/70 hover:text-white" : "text-[#1a1a1a] hover:border-[#0066cc]")
                      )}
                      onClick={() => setSelectedPeriod(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 no-print">
                  <Select value={intent} onValueChange={(v) => handleUpdateIntent(v as DashboardIntent)}>
                    <SelectTrigger className={cn(
                      "h-10 w-[180px] rounded-xl border-none",
                      intent === 'financial' ? "bg-black/20 text-white" : "bg-slate-100 text-slate-900"
                    )}>
                      <SelectValue placeholder="Análise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">💰 Dashboard Financeiro</SelectItem>
                      <SelectItem value="sales">📈 Vendas / Faturamento</SelectItem>
                      <SelectItem value="customers">👥 Clientes</SelectItem>
                      <SelectItem value="production">🏭 Produção / Operação</SelectItem>
                      <SelectItem value="inventory">📦 Estoque / Suprimentos</SelectItem>
                      <SelectItem value="growth">🚀 Growth / Marketing</SelectItem>
                      <SelectItem value="unknown">🔍 Análise Geral</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10 rounded-xl", intent === 'financial' ? "text-white hover:bg-black/10" : "text-slate-500 hover:bg-slate-100")}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn("h-10 gap-2 rounded-xl", intent === 'financial' ? "text-white hover:bg-black/10" : "text-slate-500 hover:bg-slate-100")}
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>

                  <Button
                    className={cn(
                      "h-10 gap-2 rounded-xl shadow-lg border-none",
                      intent === 'financial' ? "bg-white text-emerald-800 hover:bg-white/90" : "bg-[#0066cc] text-white hover:bg-[#0055aa]"
                    )}
                    onClick={handleExport}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Finance Quick Analysis Bar */}
            {intent === 'financial' && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <LayoutDashboard className="w-4 h-4 text-emerald-200" />
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Atalhos de Análise Financeira</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {[
                    { icon: DollarSign, label: 'Receita Total', prompt: 'Gere um card com a Receita Total (Soma do Valor)' },
                    { icon: TrendingDown, label: 'Custo Total', prompt: 'Gere um card com o Custo Total (Soma do Valor filtrando despesas)' },
                    { icon: Activity, label: 'Lucro/Prejuízo', prompt: 'Gere uma análise de Resultado de Lucro ou Prejuízo' },
                    { icon: Factory, label: 'Por Projeto', prompt: 'Gere um gráfico de barras comparando Valor por Projeto' },
                    { icon: User, label: 'Por Cliente', prompt: 'Gere um gráfico comparando Valor por Cliente' },
                    { icon: History, label: 'Status Fin.', prompt: 'Gere um gráfico de pizza por Status Financeiro' },
                    { icon: CreditCard, label: 'Pagamentos', prompt: 'Gere um gráfico de barras por Forma de Pagamento' },
                    { icon: Calendar, label: 'Evolução', prompt: 'Gere um gráfico de linha da evolução financeira ao longo do tempo' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setAiPrompt(item.prompt);
                        handleAiRequest();
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <item.icon className="w-4 h-4 text-emerald-200" />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-50 text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt Section - "Invisible Engine" style */}
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
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiRequest()}
                    />
                  </div>
                  <Button
                    onClick={handleAiRequest}
                    disabled={isAiProcessing || !aiPrompt.trim()}
                    className="bg-dataviz-blue hover:bg-dataviz-blue/90 text-white rounded-lg px-6"
                  >
                    {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Card'}
                  </Button>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-2 pl-14">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Sugestões:</span>
                  {[
                    { label: '📊 Curva ABC', prompt: 'Gere uma análise de Curva ABC' },
                    { label: '🎯 Pareto', prompt: 'Faça um gráfico de Pareto dos principais itens' },
                    { label: '📈 Tendência Mensal', prompt: 'Mostre a tendência de faturamento mensal' },
                    { label: '🏆 Tops', prompt: 'Quais são os 10 itens que mais trazem resultado?' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setAiPrompt(s.prompt)}
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
                    onClick={handleAiFormula}
                    disabled={isAiProcessing || !aiPrompt.trim()}
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

          {/* Insights Banner */}
          {insights.length > 0 && (
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
          )}

          {/* Smart Metrics Generator */}
          {tableData.length > 0 && (
            <div className="mb-6">
              <Button
                onClick={handleGenerateSmartMetrics}
                disabled={isRefreshing}
                className="bg-gradient-to-r from-dataviz-blue to-indigo-600 hover:from-dataviz-blue/90 hover:to-indigo-600/90 text-white shadow-lg"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar Métricas Inteligentes
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                O sistema analisa seus dados e cria KPIs automáticos baseados no tipo de informação detectada
              </p>
            </div>
          )}

          {/* Metrics Grid - Flexible layout with colored accents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mb-8">
            {enrichedMetrics.map((metric, idx) => {
              const borderColors = intent === 'financial'
                ? ['border-t-emerald-500', 'border-t-teal-500', 'border-t-emerald-600', 'border-t-cyan-600']
                : ['border-t-dataviz-blue', 'border-t-indigo-500', 'border-t-amber-500', 'border-t-pink-500'];

              return (
                <div key={metric.id} className={cn("transition-all duration-300 hover:-translate-y-2", borderColors[idx % borderColors.length])}>
                  <MetricCard
                    metric={metric}
                    className={cn("h-full")}
                    onEdit={handleOpenMetricEditor}
                    onDelete={handleDeleteMetric}
                  />
                </div>
              );
            })}
          </div>

          {/* Dynamic Widgets Layout */}
          <div className="space-y-8">
            {/* Main Chart (Full Width) */}
            {dashboard.charts && dashboard.charts.length > 0 && (
              <div className="relative group">
                <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenChartBuilder(dashboard.charts![0])}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteChart(dashboard.charts![0].id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <ChartCard chart={dashboard.charts[0]} className="shadow-sm border-none bg-white rounded-2xl h-[400px]" />
              </div>
            )}

            {/* Secondary Charts Grid - Show all remaining charts */}
            {dashboard.charts && dashboard.charts.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dashboard.charts.slice(1).map((chart) => (
                  <div key={chart.id} className="relative group">
                    <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenChartBuilder(chart)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteChart(chart.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <ChartCard chart={chart} className="shadow-sm border-none bg-white rounded-2xl h-[380px]" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-dataviz-blue" />
                Base de Dados Detalhada
              </h2>
              <Button
                variant="outline"
                onClick={() => handleOpenChartBuilder()}
                disabled={tableData.length === 0}
                className="rounded-xl border-slate-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Gráfico Manual
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <DataTable
                data={tableData}
                columns={tableColumns}
                onEditRow={handleOpenRowEditor}
                onEditCell={handleEditCell}
                onRenameColumn={handleRenameColumn}
                onDeleteRow={handleDeleteRow}
                onDeleteColumn={handleDeleteColumn}
                onAddRow={handleAddRow}
                onAddColumn={handleAddColumn}
                onAddFormula={() => {
                  setFormulaToEdit(null);
                  setIsFormulaDialogOpen(true);
                }}
                onEditFormula={handleRequestEditFormula}
              />
            </div>
          </div>
        </div>

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
                  <Input value={newChartTitle} onChange={(e) => setNewChartTitle(e.target.value)} placeholder="Ex: Produção por máquina" />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newChartType} onValueChange={(v) => setNewChartType(v as ChartConfig['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Barras</SelectItem>
                      <SelectItem value="horizontal_bar">Barras horizontais</SelectItem>
                      <SelectItem value="line">Linha</SelectItem>
                      <SelectItem value="area">Área</SelectItem>
                      <SelectItem value="pie">Pizza</SelectItem>
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
                      {tableColumns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Agregação</Label>
                  <Select value={newChartAgg} onValueChange={(v) => setNewChartAgg(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Contagem</SelectItem>
                      <SelectItem value="sum">Soma</SelectItem>
                      <SelectItem value="avg">Média</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn('space-y-2', newChartAgg === 'count' && 'opacity-50')}>
                  <Label>Coluna Y (numérica)</Label>
                  <Select value={newChartYKey} onValueChange={setNewChartYKey} disabled={newChartAgg === 'count'}>
                    <SelectTrigger>
                      <SelectValue placeholder={availableNumericColumns.length ? 'Selecione' : 'Nenhuma coluna numérica'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNumericColumns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
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
                {isSavingChart ? 'Salvando...' : (editingChartId ? 'Salvar alterações' : 'Salvar gráfico')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMetricEditorOpen} onOpenChange={setIsMetricEditorOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Métrica</DialogTitle>
              <DialogDescription>
                Personalize o título, valor, ícone e cor da métrica.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} placeholder="Ex: Faturamento Total" />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={metricValue} onChange={(e) => setMetricValue(e.target.value)} placeholder="Ex: R$ 150.000" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prefixo (opcional)</Label>
                  <Input value={metricPrefix} onChange={(e) => setMetricPrefix(e.target.value)} placeholder="Ex: R$" />
                </div>

                <div className="space-y-2">
                  <Label>Sufixo (opcional)</Label>
                  <Input value={metricSuffix} onChange={(e) => setMetricSuffix(e.target.value)} placeholder="Ex: %" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={metricIcon} onValueChange={setMetricIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollar">💵 Dinheiro</SelectItem>
                    <SelectItem value="users">👥 Usuários</SelectItem>
                    <SelectItem value="cart">🛒 Carrinho</SelectItem>
                    <SelectItem value="chart">📊 Gráfico</SelectItem>
                    <SelectItem value="box">📦 Caixa</SelectItem>
                    <SelectItem value="percent">% Percentual</SelectItem>
                    <SelectItem value="activity">📈 Atividade</SelectItem>
                    <SelectItem value="briefcase">💼 Maleta</SelectItem>
                    <SelectItem value="trending-up">📈 Crescimento</SelectItem>
                    <SelectItem value="trending-down">📉 Queda</SelectItem>
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
                    <SelectItem value="blue">🔵 Azul</SelectItem>
                    <SelectItem value="orange">🟠 Laranja</SelectItem>
                    <SelectItem value="green">🟢 Verde</SelectItem>
                    <SelectItem value="purple">🟣 Roxo</SelectItem>
                    <SelectItem value="yellow">🟡 Amarelo</SelectItem>
                    <SelectItem value="red">🔴 Vermelho</SelectItem>
                    <SelectItem value="teal">🔷 Azul-petróleo</SelectItem>
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

        <Dialog open={isRowEditorOpen} onOpenChange={setIsRowEditorOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar linha</DialogTitle>
              <DialogDescription>
                Edite os valores e clique em salvar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-auto pr-1">
              {tableColumns.map((col) => (
                <div key={col} className="space-y-2">
                  <Label>{col}</Label>
                  <Input
                    value={String(editingRowData?.[col] ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingRowData((prev) => ({ ...(prev || {}), [col]: v }));
                    }}
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRowEditorOpen(false);
                  setEditingRowIndex(null);
                  setEditingRowData(null);
                }}
                disabled={isSavingRow}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveRowEdit} disabled={isSavingRow || !editingRowData}>
                {isSavingRow ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FormulaDialog
          isOpen={isFormulaDialogOpen}
          onClose={() => {
            setIsFormulaDialogOpen(false);
            setFormulaToEdit(null);
          }}
          columns={tableColumns}
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
                  "flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                  dashboard?.accessLevel === 'private'
                    ? "border-primary bg-primary/5 shadow-inner"
                    : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  dashboard?.accessLevel === 'private' ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Lock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Privado
                    {dashboard?.accessLevel === 'private' && <Badge className="h-4 px-1 text-[8px] bg-primary">Ativado</Badge>}
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
                  "flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                  dashboard?.accessLevel === 'team'
                    ? "border-primary bg-primary/5 shadow-inner"
                    : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  dashboard?.accessLevel === 'team' ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Time Inteiro
                    {dashboard?.accessLevel === 'team' && <Badge className="h-4 px-1 text-[8px] bg-primary">Ativado</Badge>}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Qualquer colaborador vinculado à sua empresa terá acesso a este dashboard.
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Link de Acesso Direto</Label>
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
