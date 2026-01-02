import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import AppLayout from '@/components/layout/AppLayout';
import FileUpload from '@/components/upload/FileUpload';
import HeaderSelector from '@/components/upload/HeaderSelector';
import ColumnMappingReview from '@/components/upload/ColumnMappingReview';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle2, Brain, BarChart3, Zap, Crown } from 'lucide-react';
import { processToPythonApi, checkPythonApiHealth } from '@/lib/pythonApiService';
import { analyzeColumnsFromRows } from '@/lib/fileParser';
import { parseSheetWithPython, extractBlockWithPython, type PythonEngineSheetSummary } from '@/lib/pythonEngine';
import { getTemplateById } from '@/lib/templateConfig';
import { suggestColumnMapping, type ColumnMappingSuggestion } from '@/lib/columnMapper';
import { supabase } from '@/lib/supabase';
import { cleanDataArray } from '@/lib/dataCleanup';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


interface FileData {
  fileName: string;
  fileType: 'excel' | 'csv' | 'google_sheets';
  rawFile: File | null;
  columns: any[];
  data: Record<string, unknown>[];
  rowCount: number;
  rawGrid?: unknown[][];
  structural?: any;
}

type ProcessingStep = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'saving' | 'done';

const PROCESSING_STEPS: Record<ProcessingStep, { label: string; progress: number; icon: any }> = {
  idle: { label: 'Aguardando arquivo...', progress: 0, icon: Sparkles },
  uploading: { label: 'Enviando dados...', progress: 20, icon: Loader2 },
  analyzing: { label: 'Analisando estrutura com IA...', progress: 40, icon: Brain },
  generating: { label: 'Gerando métricas e gráficos...', progress: 70, icon: BarChart3 },
  saving: { label: 'Salvando dashboard...', progress: 90, icon: Zap },
  done: { label: 'Dashboard pronto!', progress: 100, icon: CheckCircle2 },
};

export default function NewDashboard() {
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuth();
  const { hasReachedDashboardLimit, isLoadingCount, dashboardCount, plan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  // Buscar template
  const template = templateId ? getTemplateById(templateId) : null;

  const [step, setStep] = useState<'upload' | 'dataset' | 'header-selection' | 'mapping' | 'naming' | 'processing' | 'setup'>('setup');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(-1);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [pythonSheets, setPythonSheets] = useState<PythonEngineSheetSummary[] | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<{ sheet: string; blockIndex: number } | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingSuggestion[]>([]);
  const [rawGrid, setRawGrid] = useState<unknown[][] | null>(null);

  // Se não encontrou template, redirecionar
  if (!template) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Template não encontrado</h2>
          <p className="text-muted-foreground mb-6">
            O template que você está procurando não existe.
          </p>
          <Link to="/templates">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Templates
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const handleFileProcessed = async (data: FileData) => {
    setFileData(data);
    setDashboardName(data.fileName.replace(/\.[^/.]+$/, ''));
    setPythonSheets(null);
    setSelectedDataset(null);

    if (data.rawFile && (data.fileType === 'excel' || data.fileType === 'csv')) {
      try {
        const parsed = await parseSheetWithPython(data.rawFile);
        setPythonSheets(parsed.sheets);

        // Se tem múltiplos datasets, pedir para escolher
        const totalDatasets = parsed.sheets.reduce((acc, sheet) => acc + (sheet.datasets?.length || 0), 0);
        if (totalDatasets > 1) {
          setStep('dataset');
          return;
        }
      } catch (e) {
        console.warn('Python Engine indisponível para análise de sheets');
      }
    }

    // Se temos o grid bruto e o usuário JÁ escolheu a linha OU quer detectar
    if (data.rawGrid && data.rawGrid.length > 0) {
      setRawGrid(data.rawGrid);

      // 1. Se o usuário escolheu uma linha específica MANUALMENTE no Step 0
      if (headerRowIndex >= 0 && headerRowIndex < data.rawGrid.length) {
        console.log(`⏩ Aplicando cabeçalho manual (Linha ${headerRowIndex + 1})`);
        handleHeaderSelect(headerRowIndex, data.rawGrid, data);
        return;
      }

      // 2. Se está em modo automático (-1), verifica se a detecção inteligente já resolveu
      const confidence = (data as any).structural?.confidence ?? 0;
      if (headerRowIndex === -1 && confidence > 0.80) {
        console.log(`✨ Detecção inteligente confiável (${(confidence * 100).toFixed(0)}%). Usando estrutura sugerida.`);
        // Já temos data.columns e data.data corretos do fileParser
        if (template && data.columns.length > 0) {
          const columnNames = data.columns.map(c => typeof c === 'string' ? c : (c as any).name);
          const suggestions = suggestColumnMapping(columnNames, template);
          setColumnMappings(suggestions);
          setStep('mapping');
        } else {
          setStep('naming');
        }
        return;
      }

      // 3. Caso contrário, ou se a confiança for baixa, mostra a tela de seleção
      console.log(`🤔 Confiança na estrutura: ${(confidence * 100).toFixed(0)}%. Solicitando confirmação.`);
      setStep('header-selection');
    } else if (template && data.columns.length > 0) {
      const columnNames = data.columns.map(c => typeof c === 'string' ? c : (c as any).name);
      const suggestions = suggestColumnMapping(columnNames, template);
      setColumnMappings(suggestions);
      setStep('mapping');
    } else {
      setStep('naming');
    }
  };

  const handleConfirmDataset = async () => {
    if (!fileData?.rawFile || !selectedDataset) {
      setStep('naming');
      return;
    }

    try {
      setIsProcessing(true);
      const extracted = await extractBlockWithPython({
        file: fileData.rawFile,
        sheet: selectedDataset.sheet,
        blockIndex: selectedDataset.blockIndex,
      });

      const rows = extracted.dataset.rows;
      const newFileData = {
        ...fileData,
        data: rows,
        rowCount: rows.length,
        columns: analyzeColumnsFromRows(rows),
      };
      setFileData(newFileData);

      // Se temos grid bruto do extrator, permitir seleção de cabeçalho
      if (extracted.dataset && Array.isArray(extracted.dataset.rows)) {
        // O extracted.dataset.rows aqui já são objetos. 
        // Idealmente o extrator deveria retornar o grid bruto também.
        // Como o extrator já tenta extrair, vamos para o mapeamento direto se não tivermos o grid.
        if (template) {
          const columnNames = newFileData.columns.map(c => typeof c === 'string' ? c : c.name);
          const suggestions = suggestColumnMapping(columnNames, template);
          setColumnMappings(suggestions);
          setStep('mapping');
        } else {
          setStep('naming');
        }
      }
    } catch (e) {
      toast({
        title: 'Falha ao selecionar dataset',
        description: e instanceof Error ? e.message : 'Não foi possível extrair o bloco selecionado.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHeaderSelect = (headerIndex: number, providedGrid?: unknown[][], providedFileData?: FileData) => {
    const activeGrid = providedGrid || rawGrid;
    const activeFileData = providedFileData || fileData;

    if (!activeGrid || !activeFileData) return;

    const headers = activeGrid[headerIndex].map(h => String(h || `Coluna ${Math.random().toString(36).substring(7)}`));
    const dataRows = activeGrid.slice(headerIndex + 1);

    const data = dataRows.map(row => {
      const obj: Record<string, unknown> = {};
      row.forEach((cell, i) => {
        if (headers[i]) obj[headers[i]] = cell;
      });
      return obj;
    });

    const columns = analyzeColumnsFromRows(data);
    const newFileData = { ...activeFileData, data, columns, rowCount: data.length };
    setFileData(newFileData);

    if (template) {
      const suggestions = suggestColumnMapping(headers, template);
      setColumnMappings(suggestions);
      setStep('mapping');
    } else {
      setStep('naming');
    }
  };

  const handleConfirmMapping = (finalMappings: ColumnMappingSuggestion[]) => {
    setColumnMappings(finalMappings);
    setStep('naming');
  };

  const handleCreateDashboard = async () => {
    console.log('🔍 [Dashboard] Starting creation check...');
    console.log('🔍 [Dashboard] User:', { id: user?.id, email: user?.email, accountId: user?.accountId, plan: user?.plan });
    console.log('🔍 [Dashboard] FileData:', { fileName: fileData?.fileName, rowCount: fileData?.rowCount });
    console.log('🔍 [Dashboard] Template:', templateId);
    console.log('🔍 [Dashboard] Subscription:', { dashboardCount, isLoadingCount, limit: hasReachedDashboardLimit() });

    if (!user || !fileData || !templateId) {
      console.log('❌ [Dashboard] Missing required data - returning early');
      return;
    }

    // Check plan limit
    if (hasReachedDashboardLimit()) {
      console.log('⚠️ [Dashboard] Limit reached! Opening upgrade dialog');
      setLimitDialogOpen(true);
      return;
    }

    console.log('✅ [Dashboard] All checks passed, proceeding with creation...');

    if (!dashboardName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Dê um nome ao seu dashboard.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setProcessingStep('uploading');

    try {
      // Simula progresso das etapas
      await new Promise(r => setTimeout(r, 500));
      setProcessingStep('analyzing');

      // 🐍 Chama a API Python diretamente (sem N8N!)
      console.log('🐍 Enviando para Python API...');
      console.log('🎨 Template:', templateId);

      // Verificar se API Python está disponível
      const apiAvailable = await checkPythonApiHealth();
      console.log('🔍 Python API disponível:', apiAvailable);

      await new Promise(r => setTimeout(r, 800));
      setProcessingStep('generating');

      const mappingRecord: Record<string, string> = {};
      columnMappings.forEach(m => {
        if (m.suggestedMapping) {
          mappingRecord[m.originalColumn] = m.suggestedMapping;
        }
      });

      // 🧮 APLICAR FÓRMULAS AUTOMÁTICAS (Financeiro)
      let processedData = fileData.data;
      if (templateId === 'financial') {
        const { applyFinancialFormulas } = await import('@/lib/formulaEngine');
        const formulaResult = applyFinancialFormulas(fileData.data, mappingRecord);
        processedData = formulaResult.data;

        // Se adicionamos colunas, precisamos mapeá-las semanticamente
        if (formulaResult.addedColumns.includes('despesa')) mappingRecord['Custo Total (Calc)'] = 'despesa';
        if (formulaResult.addedColumns.includes('receita')) mappingRecord['Receita Total (Calc)'] = 'receita';
        if (formulaResult.addedColumns.includes('resultado')) mappingRecord['Resultado (Calc)'] = 'resultado';

        console.log('🧮 Fórmulas aplicadas. Novas colunas:', formulaResult.addedColumns);
      }

      // 🐍 Usar Python API ao invés de N8N
      const formData = new FormData();
      if (fileData.rawFile) {
        formData.append('file', fileData.rawFile);
      }
      formData.append('userId', user.id);
      formData.append('templateId', templateId);
      formData.append('mapping', JSON.stringify(mappingRecord));
      formData.append('fileName', fileData.fileName);
      formData.append('rowCount', String(fileData.rowCount));

      const result = await processToPythonApi(formData);

      console.log('✅ Resultado do pipeline:', result);

      if (result.status !== 'success') {
        throw new Error(result.message || 'Falha ao processar dados');
      }

      setProcessingStep('saving');

      // 🐍 Agora criamos o dashboard diretamente no Supabase
      console.log('💾 Criando dashboard no Supabase...');

      // Verificar autenticação antes de inserir
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('✅ Usuário autenticado:', authUser.id);

      // Garantir que o usuário existe na tabela users
      await supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0]
      });

      // 1) Criar Dataset
      console.log('📝 Criando dataset...');

      // Limpar dados para arredondar valores numéricos
      const cleanedData = cleanDataArray(processedData || []);

      const { data: datasetResult, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          user_id: authUser.id,
          name: fileData.fileName,
          original_columns: fileData.columns || [],
          sample_data: cleanedData.slice(0, 10),
          row_count: fileData.rowCount || 0
        })
        .select()
        .single();

      if (datasetError) {
        console.error('❌ Erro ao criar dataset:', datasetError);
        throw new Error(`Erro ao criar dataset: ${datasetError.message}`);
      }

      console.log('✅ Dataset criado:', datasetResult.id);

      // 2) Criar AI Decision
      console.log('📝 Criando AI decision...');
      const { data: aiDecisionResult, error: aiDecisionError } = await supabase
        .from('ai_decisions')
        .insert({
          dataset_id: datasetResult.id,
          dataset_type: templateId === 'financial' ? 'financeiro' : 'generico',
          field_map: {},
          metrics: result.metrics || [],
          charts: result.charts || [],
          confidence: 0.8
        })
        .select()
        .single();

      if (aiDecisionError) {
        console.error('❌ Erro ao criar AI decision:', aiDecisionError);
        // Não bloquear se falhar, continuar sem AI decision
      }

      console.log('✅ AI decision criado:', aiDecisionResult?.id);

      // 3) Criar Dashboard
      console.log('📝 Criando dashboard...');
      const { data: dashboardResult, error: dashboardError } = await supabase
        .from('dashboards')
        .insert({
          dataset_id: datasetResult.id,
          ai_decision_id: aiDecisionResult?.id,
          title: dashboardName,
          description: dashboardDescription || 'Dashboard gerado automaticamente'
        })
        .select()
        .single();

      if (dashboardError) {
        console.error('❌ Erro ao criar dashboard:', dashboardError);
        throw new Error(`Erro ao criar dashboard: ${dashboardError.message}`);
      }

      if (!dashboardResult || dashboardResult.length === 0) {
        throw new Error('Dashboard criado mas não retornou dados');
      }

      const newDashboard = Array.isArray(dashboardResult) ? dashboardResult[0] : dashboardResult;
      const dashboardId = newDashboard.id;
      console.log('✅ Dashboard criado:', dashboardId);

      // 5) Salvar Dashboard Blocks (métricas e gráficos)
      const blocksToInsert: any[] = [];

      // Adicionar métricas
      result.metrics?.forEach((metric: any, idx: number) => {
        blocksToInsert.push({
          dashboard_id: dashboardId,
          type: 'metric',
          title: metric.title || metric.label || 'Métrica',
          config: {
            label: metric.title || metric.label || 'Métrica',
            value: metric.value,
            rawValue: metric.rawValue,
            field: metric.field,
            format: metric.format,
            icon: metric.icon,
            color: metric.color,
            prefix: metric.prefix,
            suffix: metric.suffix,
          },
          position: { h: 1, w: 2, x: 0, y: idx },
        });
      });

      // Adicionar gráficos
      result.charts?.forEach((chart: any, idx: number) => {
        blocksToInsert.push({
          dashboard_id: dashboardId,
          type: 'chart',
          title: chart.title || 'Gráfico',
          config: {
            title: chart.title || 'Gráfico',
            type: chart.type || 'bar',
            xKey: chart.xKey,
            yKey: chart.yKey,
            data: chart.data,
            builder: {
              xKey: chart.xKey,
              yKey: chart.yKey,
              agg: 'sum',
            },
          },
          position: { h: 4, w: 4, x: 0, y: idx + (result.metrics?.length || 0) },
        });
      });

      if (blocksToInsert.length > 0) {
        const { error: blockError } = await supabase
          .from('dashboard_blocks')
          .insert(blocksToInsert);

        if (blockError) {
          console.warn('⚠️ Erro ao salvar blocks:', blockError.message);
        } else {
          console.log(`✅ ${blocksToInsert.length} blocks salvos`);
        }
      }


      await new Promise(r => setTimeout(r, 500));
      setProcessingStep('done');
      await new Promise(r => setTimeout(r, 800));

      toast({
        title: '✨ Dashboard criado!',
        description: `${result.metrics?.length || 0} métricas e ${result.charts?.length || 0} gráficos gerados automaticamente.`,
      });

      // Navega direto para o dashboard pronto
      navigate(`/view/${dashboardId}`);

    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Falha ao processar',
        description: error instanceof Error ? error.message : 'Erro inesperado ao processar os dados.',
        variant: 'destructive',
      });
      setStep('naming');
      setProcessingStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStepInfo = PROCESSING_STEPS[processingStep];
  const StepIcon = currentStepInfo.icon;

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header com info do template */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${template.gradient} mb-4 shadow-lg`}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
          <p className="text-muted-foreground mt-2">{template.description}</p>

          {/* Tags do template */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {template.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>

        {step === 'processing' ? (
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="py-12">
              {/* Ícone animado */}
              <div className="relative flex justify-center mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${processingStep === 'done'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-primary/10 text-primary'
                  }`}>
                  <StepIcon className={`w-10 h-10 ${processingStep !== 'done' && processingStep !== 'idle' ? 'animate-spin' : ''
                    }`} />
                </div>
                {processingStep !== 'done' && processingStep !== 'idle' && (
                  <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 mx-auto animate-ping" />
                )}
              </div>

              {/* Texto do status */}
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                {currentStepInfo.label}
              </h2>

              <p className="text-muted-foreground text-center max-w-md mx-auto mb-8">
                {processingStep === 'analyzing' && 'A IA está identificando padrões, tipos de dados e relacionamentos...'}
                {processingStep === 'generating' && `Criando ${template.defaultMetrics.length} KPIs e ${template.defaultCharts.length} gráficos específicos de ${template.category}...`}
                {processingStep === 'saving' && 'Salvando seu dashboard no banco de dados...'}
                {processingStep === 'done' && 'Seu dashboard está pronto para uso!'}
                {(processingStep === 'uploading' || processingStep === 'idle') && 'Preparando seus dados para análise...'}
              </p>

              {/* Barra de progresso */}
              <div className="max-w-md mx-auto">
                <Progress value={currentStepInfo.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {currentStepInfo.progress}% concluído
                </p>
              </div>

              {/* Info do arquivo */}
              {fileData && (
                <div className="mt-8 p-4 rounded-lg bg-muted/50 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-center">{fileData.fileName}</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {fileData.rowCount.toLocaleString('pt-BR')} linhas • {fileData.columns.length} colunas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>
                {step === 'setup' && 'Configuração Inicial'}
                {step === 'upload' && template.uploadPrompt}
                {step === 'dataset' && 'Selecione o dataset'}
                {step === 'header-selection' && 'Identifique o Cabeçalho'}
                {step === 'mapping' && 'Confirme o mapeamento das colunas'}
                {step === 'naming' && 'Nomeie seu dashboard'}
              </CardTitle>
              <CardDescription>
                {step === 'setup' && 'Antes de enviar, nos conte um pouco sobre sua planilha'}
                {step === 'upload' && template.uploadHint}
                {step === 'dataset' && 'Encontramos mais de uma tabela. Escolha qual você quer analisar'}
                {step === 'header-selection' && 'Ajude-nos a identificar qual linha contém os títulos das colunas'}
                {step === 'mapping' && 'Revise o mapeamento automático e ajuste se necessário'}
                {step === 'naming' && 'Dê um nome para identificar facilmente depois'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'setup' ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      A planilha tem cabeçalho?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Geralmente a primeira linha contém os nomes das colunas.
                    </p>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Label>Em qual linha estão os títulos das colunas?</Label>
                        <Select
                          value={String(headerRowIndex)}
                          onValueChange={(v) => setHeaderRowIndex(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-1">Detectar Automaticamente (Recomendado)</SelectItem>
                            <SelectItem value="0">Linha 1</SelectItem>
                            <SelectItem value="1">Linha 2</SelectItem>
                            <SelectItem value="2">Linha 3</SelectItem>
                            <SelectItem value="3">Linha 4</SelectItem>
                            <SelectItem value="4">Linha 5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <strong>Dica:</strong> Se sua planilha tem títulos ou logotipos no topo,
                        o cabeçalho pode estar em uma linha mais abaixo.
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 bg-primary text-primary-foreground font-semibold"
                    onClick={() => setStep('upload')}
                  >
                    Próximo: Upload Contextualizado
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : step === 'upload' ? (
                <>
                  <FileUpload
                    onFileProcessed={handleFileProcessed}
                    isProcessing={isProcessing}
                  />

                  {/* Dica de colunas esperadas */}
                  <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      📋 Colunas esperadas para este template:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.expectedColumns.filter(col => col.required).map(col => (
                        <Badge key={col.semanticName} variant="outline" className="border-blue-300 text-blue-700">
                          {col.displayName}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Não se preocupe com nomes exatos. A IA reconhece variações!
                    </p>
                  </div>
                </>
              ) : step === 'dataset' ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-700">
                      ✓ Arquivo carregado: {fileData?.fileName}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {fileData?.rowCount.toLocaleString('pt-BR')} linhas (prévia) • {fileData?.columns.length} colunas
                    </p>
                  </div>

                  <div className="space-y-3">
                    {(pythonSheets || []).flatMap((s) =>
                      (s.datasets || []).map((d) => {
                        const isSelected =
                          selectedDataset?.sheet === s.name && selectedDataset?.blockIndex === d.block_index;
                        return (
                          <Button
                            key={`${s.name}-${d.id}`}
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-auto justify-start py-4 px-4 w-full"
                            onClick={() => setSelectedDataset({ sheet: s.name, blockIndex: d.block_index })}
                            disabled={isProcessing}
                          >
                            <div className="text-left">
                              <div className="font-medium">{s.name} • {d.id}</div>
                              <div className="text-xs opacity-70 mt-0.5">
                                {d.rows.toLocaleString('pt-BR')} linhas • {d.columns.length} colunas
                              </div>
                            </div>
                          </Button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFileData(null);
                        setPythonSheets(null);
                        setSelectedDataset(null);
                        setStep('upload');
                      }}
                      disabled={isProcessing}
                    >
                      Trocar arquivo
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleConfirmDataset}
                      disabled={isProcessing || !selectedDataset}
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : step === 'header-selection' ? (
                <HeaderSelector
                  grid={rawGrid || []}
                  onSelect={(idx) => handleHeaderSelect(idx)}
                  onBack={() => setStep('upload')}
                  suggestedIndex={fileData?.structural?.blocks?.find((b: any) => b.id === fileData.structural?.decisions?.primaryBlockId)?.headerRowIndex ?? 0}
                />
              ) : step === 'mapping' ? (
                <ColumnMappingReview
                  template={template}
                  mappings={columnMappings}
                  onConfirm={handleConfirmMapping}
                  onBack={() => setStep('upload')}
                />
              ) : (
                <div className="space-y-6">
                  {/* Info do arquivo */}
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-700">
                      ✓ Arquivo: {fileData?.fileName}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {fileData?.rowCount.toLocaleString('pt-BR')} linhas • {fileData?.columns.length} colunas
                    </p>
                  </div>

                  {/* Input do nome */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Dashboard</Label>
                    <Input
                      id="name"
                      placeholder={`Ex: ${template.name} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      className="h-12"
                      disabled={isProcessing}
                      autoFocus
                    />
                  </div>

                  {/* Input da descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Breve descrição dos objetivos deste dashboard..."
                      value={dashboardDescription}
                      onChange={(e) => setDashboardDescription(e.target.value)}
                      className="resize-none h-24"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Preview de KPIs */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      📊 Você receberá automaticamente:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {template.defaultMetrics.slice(0, 4).map(metric => (
                        <div key={metric.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span>{metric.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep('upload')}
                      disabled={isProcessing}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button
                      className={`flex-1 bg-gradient-to-r ${template.gradient} hover:opacity-90 text-white`}
                      onClick={handleCreateDashboard}
                      disabled={isProcessing || !dashboardName.trim()}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Criar Dashboard
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">Limite atingido</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Você atingiu o limite do <strong>Plano Gratuito</strong>.
              <br /><br />
              Para criar mais dashboards e liberar recursos avançados, faça upgrade do seu plano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
              onClick={() => navigate('/subscription')}
            >
              Fazer upgrade de plano
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setLimitDialogOpen(false)}
            >
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
