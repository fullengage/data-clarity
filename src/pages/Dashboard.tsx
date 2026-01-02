import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboards } from '@/hooks/useDashboards';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileSpreadsheet,
  MoreVertical,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { dashboards, isLoading, deleteDashboard } = useDashboards(user?.id);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Pronto';
      case 'processing':
        return 'Processando';
      case 'error':
        return 'Erro';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Dashboards</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas planilhas e visualizações
            </p>
          </div>
          <Link to="/templates">
            <Button size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Plus className="w-5 h-5 mr-2" />
              Novo Dashboard
            </Button>
          </Link>
        </div>

        {/* Dashboard Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : dashboards.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-dataviz-blue-light flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet className="w-10 h-10 text-dataviz-blue" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum dashboard ainda
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Comece enviando sua primeira planilha. Nós vamos organizar e visualizar seus dados automaticamente.
            </p>
            <Link to="/templates">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Criar primeiro dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/view/${dashboard.id}`} className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteDashboard(dashboard.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1 truncate">
                    {dashboard.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate mb-4">
                    {dashboard.fileName}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(dashboard.status)}
                      <span className={cn(
                        'font-medium',
                        dashboard.status === 'ready' && 'text-dataviz-green',
                        dashboard.status === 'processing' && 'text-dataviz-blue',
                        dashboard.status === 'error' && 'text-dataviz-red',
                      )}>
                        {getStatusLabel(dashboard.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDate(dashboard.createdAt)}
                    </div>
                  </div>
                </div>

                {dashboard.status === 'ready' && (
                  <Link
                    to={`/view/${dashboard.id}`}
                    className="block border-t border-border py-3 px-5 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Ver Dashboard →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
