import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboards } from '@/hooks/useDashboards';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function History() {
  const { user } = useAuth();
  const { dashboards, isLoading, deleteDashboard } = useDashboards(user?.id);

  const sortedDashboards = [...dashboards].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="w-4 h-4 text-dataviz-green" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-dataviz-blue animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-dataviz-red" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-muted-foreground mt-1">
            Todos os dashboards criados, ordenados por data
          </p>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedDashboards.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <HistoryIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum histórico
            </h2>
            <p className="text-muted-foreground mb-6">
              Seus dashboards aparecerão aqui assim que forem criados.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {sortedDashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-primary-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {dashboard.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="truncate">{dashboard.fileName}</span>
                      <span>•</span>
                      <span>{dashboard.rowCount} linhas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3">
                    {getStatusIcon(dashboard.status)}
                    <span className={cn(
                      'text-sm font-medium',
                      dashboard.status === 'ready' && 'text-dataviz-green',
                      dashboard.status === 'processing' && 'text-dataviz-blue',
                      dashboard.status === 'error' && 'text-dataviz-red',
                    )}>
                      {dashboard.status === 'ready' ? 'Pronto' :
                        dashboard.status === 'processing' ? 'Processando' : 'Erro'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[200px]">
                    <Clock className="w-4 h-4" />
                    {formatDate(dashboard.updatedAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    {dashboard.status === 'ready' && (
                      <Link to={`/view/${dashboard.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteDashboard(dashboard.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
