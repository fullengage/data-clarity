import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InterpretationResult, ColumnMapping, SuggestedField } from '@/types/dashboard';
import ColumnMappingCard from './ColumnMappingCard';
import ProblemAlert from './ProblemAlert';

interface MappingCanvasProps {
  interpretation: InterpretationResult | null;
  mappings: ColumnMapping[];
  suggestedFields: SuggestedField[];
  isLoading: boolean;
  onUpdateMapping: (originalName: string, updates: Partial<ColumnMapping>) => void;
  onConfirmAll: () => void;
  onSave: () => void;
  onRefresh: () => void;
  isSaving?: boolean;
}

export default function MappingCanvas({
  interpretation,
  mappings,
  suggestedFields,
  isLoading,
  onUpdateMapping,
  onConfirmAll,
  onSave,
  onRefresh,
  isSaving = false,
}: MappingCanvasProps) {
  // Progress calculation
  const progress = useMemo(() => {
    if (mappings.length === 0) return 0;
    const completed = mappings.filter(m => m.status !== 'pending').length;
    return Math.round((completed / mappings.length) * 100);
  }, [mappings]);

  const pendingCount = mappings.filter(m => m.status === 'pending').length;
  const confirmedCount = mappings.filter(m => m.status === 'confirmed' || m.status === 'edited').length;
  const ignoredCount = mappings.filter(m => m.status === 'ignored').length;

  // Get sample values for a column
  const getSampleValues = (originalName: string): string[] => {
    const field = suggestedFields.find(f => f.originalName === originalName);
    return field?.sampleValues || [];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando interpretação dos dados...</p>
      </div>
    );
  }

  const hasProblems = interpretation?.detectedProblems && interpretation.detectedProblems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Mapeamento de Colunas
                {interpretation?.overallConfidence && interpretation.overallConfidence >= 0.7 && (
                  <Badge className="bg-dataviz-green/10 text-dataviz-green">
                    Confiança alta
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Revise as sugestões da IA e confirme ou ajuste conforme necessário
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso do mapeamento</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
              <span className="text-dataviz-green">{confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}</span>
              <span>{ignoredCount} ignorado{ignoredCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Quick actions */}
          {pendingCount > 0 && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={onConfirmAll}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Confirmar todas as sugestões
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problems/Warnings */}
      {hasProblems && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-dataviz-orange" />
            Avisos sobre seus dados
          </h3>
          {interpretation!.detectedProblems.map((problem, idx) => (
            <ProblemAlert key={idx} problem={problem} />
          ))}
        </div>
      )}

      {/* Dataset type summary */}
      {interpretation?.datasetType && (
        <Card className="bg-gradient-to-r from-dataviz-purple/5 to-dataviz-blue/5 border-dataviz-purple/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dataviz-purple/10 flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  Tipo detectado: <span className="capitalize">{interpretation.datasetType}</span>
                </p>
                {interpretation.summary && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {interpretation.summary}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Column mappings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Colunas detectadas ({mappings.length})
        </h3>
        
        {mappings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma coluna encontrada para mapear.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mappings.map((mapping) => (
              <ColumnMappingCard
                key={mapping.originalName}
                mapping={mapping}
                sampleValues={getSampleValues(mapping.originalName)}
                onUpdate={(updates) => onUpdateMapping(mapping.originalName, updates)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t -mx-4 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 
              ? `${pendingCount} coluna${pendingCount !== 1 ? 's' : ''} aguardando revisão`
              : 'Todas as colunas foram revisadas!'
            }
          </p>
          <Button 
            onClick={onSave} 
            disabled={isSaving || mappings.length === 0}
            className="min-w-[160px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Salvar e continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
