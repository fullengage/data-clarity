import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DetectedProblem } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ProblemAlertProps {
  problem: DetectedProblem;
}

export default function ProblemAlert({ problem }: ProblemAlertProps) {
  const getIcon = () => {
    switch (problem.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (): 'default' | 'destructive' => {
    return problem.severity === 'error' ? 'destructive' : 'default';
  };

  const getTypeLabel = () => {
    const labels: Record<DetectedProblem['type'], string> = {
      missing_values: 'Valores faltando',
      inconsistent_format: 'Formato inconsistente',
      duplicate_rows: 'Linhas duplicadas',
      mixed_types: 'Tipos misturados',
      encoding: 'Problema de caracteres',
      empty_column: 'Coluna vazia',
    };
    return labels[problem.type] || problem.type;
  };

  return (
    <Alert 
      variant={getVariant()}
      className={cn(
        "border-l-4",
        problem.severity === 'error' && "border-l-dataviz-red bg-dataviz-red/5",
        problem.severity === 'warning' && "border-l-dataviz-orange bg-dataviz-orange/5",
        problem.severity === 'info' && "border-l-dataviz-blue bg-dataviz-blue/5",
      )}
    >
      {getIcon()}
      <AlertTitle className="text-sm font-medium">
        {getTypeLabel()}
        {problem.affectedColumns.length > 0 && (
          <span className="font-normal text-muted-foreground ml-2">
            em {problem.affectedColumns.join(', ')}
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="text-sm">
        {problem.description}
        {problem.suggestedFix && (
          <span className="block mt-1 text-foreground/80">
            💡 {problem.suggestedFix}
          </span>
        )}
        {problem.rowCount && problem.rowCount > 0 && (
          <span className="block mt-1 text-muted-foreground text-xs">
            Afeta {problem.rowCount} {problem.rowCount === 1 ? 'linha' : 'linhas'}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
