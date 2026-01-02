import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  InterpretationResult,
  SuggestedField,
  DetectedPattern,
  DetectedProblem,
  ColumnMapping
} from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';

interface RawDataset {
  id: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface UseInterpretationResult {
  interpretation: InterpretationResult | null;
  rawDataset: RawDataset | null;
  mappings: ColumnMapping[];
  isLoading: boolean;
  error: string | null;
  updateMapping: (originalName: string, updates: Partial<ColumnMapping>) => void;
  confirmAllMappings: () => void;
  saveMappings: () => Promise<boolean>;
  refetch: () => void;
}

export function useInterpretation(sourceId: string | undefined): UseInterpretationResult {
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [rawDataset, setRawDataset] = useState<RawDataset | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!sourceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch interpretation data (ai_decisions)
      const { data: aiData, error: aiError } = await supabase
        .from('ai_decisions')
        .select('*')
        .eq('dataset_id', sourceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aiError) throw aiError;

      // Fetch dataset
      const { data: dataset, error: dsError } = await supabase
        .from('datasets')
        .select('id, original_columns, sample_data, row_count')
        .eq('id', sourceId)
        .maybeSingle();

      if (dsError) throw dsError;

      // Parse interpretation
      if (aiData) {
        const parsed: InterpretationResult = {
          id: aiData.id,
          sourceId: aiData.dataset_id,
          suggestedFields: [], // Use field_map to populate if possible or leave empty
          detectedPatterns: [],
          detectedProblems: [],
          overallConfidence: Number(aiData.confidence) || 0,
          datasetType: aiData.dataset_type,
          createdAt: new Date(aiData.created_at),
        };

        // Try to reconstruct suggestedFields from field_map if needed
        // For now, let's keep it simple
        setInterpretation(parsed);

        const initialMappings: ColumnMapping[] = Object.entries(aiData.field_map || {}).map(([orig, mapped]: [string, any]) => ({
          originalName: orig,
          mappedName: typeof mapped === 'string' ? mapped : mapped.name,
          mappedType: (typeof mapped === 'string' ? 'unknown' : mapped.type) as any,
          status: 'confirmed',
          confidence: 1,
        }));
        setMappings(initialMappings);
      }

      // Parse dataset
      if (dataset) {
        const columns = dataset.original_columns?.map((col: any) => typeof col === 'string' ? col : col.name) || [];
        setRawDataset({
          id: dataset.id,
          columns,
          rows: dataset.sample_data || [],
          rowCount: dataset.row_count || dataset.sample_data?.length || 0,
        });

        if (!aiData && columns.length > 0) {
          const basicMappings: ColumnMapping[] = columns.map((col: string) => ({
            originalName: col,
            mappedName: col,
            mappedType: 'unknown' as const,
            status: 'pending' as const,
            confidence: 0,
          }));
          setMappings(basicMappings);
        }
      }

    } catch (err) {
      console.error('Error fetching interpretation:', err);
      setError('Não foi possível carregar os dados de interpretação.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateMapping = useCallback((originalName: string, updates: Partial<ColumnMapping>) => {
    setMappings(prev => prev.map(m =>
      m.originalName === originalName
        ? { ...m, ...updates }
        : m
    ));
  }, []);

  const confirmAllMappings = useCallback(() => {
    setMappings(prev => prev.map(m =>
      m.status === 'pending' ? { ...m, status: 'confirmed' as const } : m
    ));
  }, []);

  const saveMappings = useCallback(async (): Promise<boolean> => {
    if (!sourceId) return false;

    try {
      const fieldMap = mappings
        .filter(m => m.status !== 'ignored')
        .reduce((acc, m) => ({
          ...acc,
          [m.originalName]: m.mappedName
        }), {});

      const { error: aiErr } = await supabase
        .from('ai_decisions')
        .update({
          field_map: fieldMap,
          dataset_type: interpretation?.datasetType || 'generico',
        })
        .eq('dataset_id', sourceId);

      if (aiErr) throw aiErr;

      toast({
        title: 'Mapeamento salvo!',
        description: 'Suas configurações foram aplicadas.',
      });

      return true;
    } catch (err) {
      console.error('Error saving mappings:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o mapeamento.',
        variant: 'destructive',
      });
      return false;
    }
  }, [sourceId, interpretation, mappings, toast]);


  return {
    interpretation,
    rawDataset,
    mappings,
    isLoading,
    error,
    updateMapping,
    confirmAllMappings,
    saveMappings,
    refetch: fetchData,
  };
}
