import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MappingCanvas from '@/components/mapping/MappingCanvas';
import { Button } from '@/components/ui/button';
import { useInterpretation } from '@/hooks/useInterpretation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { buildDefaultWidgets, DashboardIntent } from '@/lib/dashboardAutoBuilder';

export default function MappingPage() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const [searchParams] = useSearchParams();
  const dashboardId = searchParams.get('dashboard');
  const intentParam = (searchParams.get('intent') as DashboardIntent | null) || null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    interpretation,
    rawDataset,
    mappings,
    isLoading,
    error,
    updateMapping,
    confirmAllMappings,
    saveMappings,
    refetch,
  } = useInterpretation(sourceId);

  const [isSaving, setIsSaving] = useState(false);

  const ensureIntentAndWidgets = async (params: { dashboardId: string; intent?: DashboardIntent | null }) => {
    const { dashboardId, intent } = params;

    const { data: dashData, error: dashErr } = await supabase
      .from('dashboards')
      .select(`
        id,
        dashboard_blocks ( id ),
        ai_decisions (
          id,
          dataset_type,
          datasets (
            id,
            original_columns,
            sample_data
          )
        )
      `)
      .eq('id', dashboardId)
      .maybeSingle();

    if (dashErr) throw dashErr;
    if (!dashData) return;

    const existingBlocks = Array.isArray((dashData as any)?.dashboard_blocks) ? (dashData as any).dashboard_blocks : [];
    const aiDecision = (dashData as any)?.ai_decisions;
    const aiId = aiDecision?.id as string | undefined;

    if (aiId && intent && aiDecision?.dataset_type !== intent) {
      await supabase
        .from('ai_decisions')
        .update({ dataset_type: intent })
        .eq('id', aiId);
    }

    if (existingBlocks.length > 0) return;

    const dataset = aiDecision?.datasets;
    const structure = Array.isArray(dataset?.original_columns) ? dataset.original_columns : [];
    const rows = Array.isArray(dataset?.sample_data) ? dataset.sample_data : [];

    const effectiveIntent: DashboardIntent = (intent as DashboardIntent) || (aiDecision?.dataset_type as DashboardIntent) || 'unknown';
    const widgets = buildDefaultWidgets({ intent: effectiveIntent, columns: structure, rows });

    if (widgets.length === 0) return;

    const payload = widgets.map((w) => ({
      dashboard_id: dashboardId,
      type: w.type,
      title: w.config?.label || 'Widget',
      config: w.config,
      position: {},
    }));

    const { error: insertErr } = await supabase
      .from('dashboard_blocks')
      .insert(payload);

    if (insertErr) throw insertErr;
  };


  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveMappings();
    setIsSaving(false);

    if (success) {
      try {
        if (dashboardId) {
          await ensureIntentAndWidgets({ dashboardId, intent: intentParam });
        }
      } catch (e) {
        console.error('Error generating default widgets:', e);
        toast({
          title: 'Aviso',
          description: 'O mapeamento foi salvo, mas não foi possível gerar o dashboard automaticamente.',
          variant: 'destructive',
        });
      }

      // Navigate to dashboard view or creation
      if (dashboardId) {
        navigate(`/view/${dashboardId}`);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-4" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Main canvas */}
        <MappingCanvas
          interpretation={interpretation}
          mappings={mappings}
          suggestedFields={interpretation?.suggestedFields || []}
          isLoading={isLoading}
          onUpdateMapping={updateMapping}
          onConfirmAll={confirmAllMappings}
          onSave={handleSave}
          onRefresh={refetch}
          isSaving={isSaving}
        />
      </div>
    </AppLayout>
  );
}
