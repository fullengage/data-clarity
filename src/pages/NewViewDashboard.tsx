import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DashboardChat from '@/components/dashboard/DashboardChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Table as TableIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DashboardData, 
  DashboardCard as DashboardCardType,
  ChatContext,
  DashboardDataStatus 
} from '@/types/newDashboard.types';

const statusConfig: Record<DashboardDataStatus, { 
  icon: any; 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  updated: { 
    icon: CheckCircle, 
    label: 'Atualizado', 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-200' 
  },
  attention: { 
    icon: AlertTriangle, 
    label: 'Atenção', 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50 border-yellow-200' 
  },
  partial: { 
    icon: AlertCircle, 
    label: 'Parcial', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 border-orange-200' 
  },
  loading: { 
    icon: Loader2, 
    label: 'Carregando', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200' 
  },
};

export default function NewViewDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (id && user?.id) {
      loadDashboard();
    }
  }, [id, user?.id]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${id}`, {
        headers: {
          'Authorization': `Bearer ${user?.id}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load dashboard');

      const result = await response.json();
      setDashboardData(result.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copiado para a área de transferência!');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!dashboardData) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h2 className="text-2xl font-bold">Dashboard não encontrado</h2>
          <Link to="/dashboard">
            <Button>Voltar para Dashboards</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const StatusIcon = statusConfig[dashboardData.status.status].icon;
  const chatContext: ChatContext = {
    dashboardId: dashboardData.id,
    availableCards: dashboardData.cards.map(c => ({ 
      id: c.id, 
      type: c.type, 
      title: c.title 
    })),
    currentMetrics: dashboardData.cards
      .filter(c => c.type === 'metric')
      .reduce((acc, card) => {
        if (card.type === 'metric') {
          acc[card.id] = card.data.value;
        }
        return acc;
      }, {} as Record<string, string | number>),
    recentAlerts: dashboardData.alerts.flatMap(a => 
      a.data.points.map(p => p.message)
    ),
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {dashboardData.title}
                </h1>
                {dashboardData.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboardData.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Status Banner */}
          <Card className={cn('border-2', statusConfig[dashboardData.status.status].bgColor)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon className={cn('w-6 h-6', statusConfig[dashboardData.status.status].color)} />
                  <div>
                    <p className="font-semibold">
                      Status: {statusConfig[dashboardData.status.status].label}
                    </p>
                    {dashboardData.status.message && (
                      <p className="text-sm text-muted-foreground">
                        {dashboardData.status.message}
                      </p>
                    )}
                  </div>
                </div>
                {dashboardData.status.lastUpdate && (
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {new Date(dashboardData.status.lastUpdate).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              {dashboardData.status.warnings && dashboardData.status.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  {dashboardData.status.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm text-yellow-700">⚠️ {warning}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts Section */}
          {dashboardData.alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">⚠️ Pontos de Atenção</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.alerts.map((alert) => (
                  <DashboardCard key={alert.id} card={alert} />
                ))}
              </div>
            </div>
          )}

          {/* Main Cards Grid */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">📊 Indicadores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dashboardData.cards.map((card) => (
                <DashboardCard key={card.id} card={card} />
              ))}
            </div>
          </div>

          {/* Charts Section */}
          {dashboardData.charts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">📈 Gráficos</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dashboardData.charts.map((chart) => (
                  <Card key={chart.id} className="border-2">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">{chart.title}</h3>
                      <div className="h-64 flex items-center justify-center bg-slate-50 rounded">
                        <p className="text-sm text-muted-foreground">
                          Gráfico {chart.data.chartType} será renderizado aqui
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Table Section */}
          {dashboardData.tableData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">📋 Dados</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTable(!showTable)}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {showTable ? 'Ocultar' : 'Mostrar'} Tabela
                </Button>
              </div>

              {showTable && (
                <Card className="border-2">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            {dashboardData.tableData.columns.map((col) => (
                              <th key={col} className="px-4 py-2 text-left font-semibold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.tableData.rows.slice(0, 50).map((row, idx) => (
                            <tr key={idx} className="border-t hover:bg-slate-50">
                              {dashboardData.tableData!.columns.map((col) => (
                                <td key={col} className="px-4 py-2">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-slate-50 border-t text-xs text-muted-foreground">
                      Mostrando 50 de {dashboardData.tableData.totalRows} registros
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Metadata */}
          {dashboardData.metadata && (
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pb-8">
              <span>Fonte: {dashboardData.metadata.dataSource}</span>
              <span>•</span>
              <span>{dashboardData.metadata.rowCount.toLocaleString('pt-BR')} linhas</span>
              <span>•</span>
              <span>{dashboardData.metadata.columnCount} colunas</span>
              <span>•</span>
              <span>Criado em {new Date(dashboardData.metadata.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Component */}
      <DashboardChat
        dashboardId={dashboardData.id}
        context={chatContext}
        position="right"
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </AppLayout>
  );
}
