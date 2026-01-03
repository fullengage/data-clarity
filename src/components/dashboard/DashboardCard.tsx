import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { DashboardCard as DashboardCardType, CardStatus } from '@/types/newDashboard.types';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  card: DashboardCardType;
  onClick?: (card: DashboardCardType) => void;
}

const statusConfig: Record<CardStatus, { color: string; icon: any; label: string }> = {
  normal: { color: 'bg-green-50 border-green-200', icon: CheckCircle, label: 'Normal' },
  warning: { color: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle, label: 'Atenção' },
  critical: { color: 'bg-red-50 border-red-200', icon: AlertCircle, label: 'Crítico' },
};

const cardTypeIcons: Record<string, any> = {
  abc_curve: PieChart,
  pareto: BarChart3,
  trend: Activity,
  top_ranking: Target,
  calculated_column: Calculator,
  attention_points: AlertTriangle,
  metric: BarChart3,
  chart: BarChart3,
};

export default function DashboardCard({ card, onClick }: DashboardCardProps) {
  const status = card.status || 'normal';
  const statusInfo = statusConfig[status];
  const IconComponent = cardTypeIcons[card.type] || BarChart3;
  const StatusIcon = statusInfo.icon;

  const handleClick = () => {
    if (onClick) onClick(card);
  };

  return (
    <Card 
      className={cn(
        'transition-all hover:shadow-lg cursor-pointer border-2',
        statusConfig[status].color,
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              status === 'critical' ? 'bg-red-100' : 
              status === 'warning' ? 'bg-yellow-100' : 
              'bg-blue-100'
            )}>
              <IconComponent className={cn(
                'w-5 h-5',
                status === 'critical' ? 'text-red-600' : 
                status === 'warning' ? 'text-yellow-600' : 
                'text-blue-600'
              )} />
            </div>
            <CardTitle className="text-base font-semibold">{card.title}</CardTitle>
          </div>
          {status !== 'normal' && (
            <Badge variant={status === 'critical' ? 'destructive' : 'secondary'} className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderCardContent(card)}
      </CardContent>
    </Card>
  );
}

function renderCardContent(card: DashboardCardType) {
  switch (card.type) {
    case 'metric':
      return <MetricContent card={card} />;
    case 'trend':
      return <TrendContent card={card} />;
    case 'top_ranking':
      return <TopRankingContent card={card} />;
    case 'abc_curve':
      return <ABCCurveContent card={card} />;
    case 'pareto':
      return <ParetoContent card={card} />;
    case 'attention_points':
      return <AttentionPointsContent card={card} />;
    case 'calculated_column':
      return <CalculatedColumnContent card={card} />;
    default:
      return <div className="text-sm text-muted-foreground">Tipo de card não suportado</div>;
  }
}

function MetricContent({ card }: { card: Extract<DashboardCardType, { type: 'metric' }> }) {
  const { value, prefix, suffix, change, changeLabel, secondaryInfo } = card.data;
  
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <span className="text-3xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-2">
          {change > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : change < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : null}
          <span className={cn(
            'text-sm font-medium',
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
      
      {secondaryInfo && (
        <p className="text-sm text-muted-foreground">{secondaryInfo}</p>
      )}
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{card.insight}</p>
      )}
    </div>
  );
}

function TrendContent({ card }: { card: Extract<DashboardCardType, { type: 'trend' }> }) {
  const { current, previous, change, changePercentage } = card.data;
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Atual</p>
          <p className="text-2xl font-bold">{current.toLocaleString('pt-BR')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Anterior</p>
          <p className="text-2xl font-bold text-gray-500">{previous.toLocaleString('pt-BR')}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 pt-2 border-t">
        {changePercentage > 0 ? (
          <TrendingUp className="w-5 h-5 text-green-600" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-600" />
        )}
        <span className={cn(
          'text-lg font-semibold',
          changePercentage > 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
        </span>
        <span className="text-sm text-muted-foreground">
          ({change > 0 ? '+' : ''}{change.toLocaleString('pt-BR')})
        </span>
      </div>
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">{card.insight}</p>
      )}
    </div>
  );
}

function TopRankingContent({ card }: { card: Extract<DashboardCardType, { type: 'top_ranking' }> }) {
  const { items, total } = card.data;
  
  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((item) => (
        <div key={item.rank} className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-gray-500 w-6">#{item.rank}</span>
            <span className="text-sm truncate">{item.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{item.value.toLocaleString('pt-BR')}</span>
            {item.percentage && (
              <span className="text-xs text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
            )}
          </div>
        </div>
      ))}
      
      <div className="pt-2 border-t text-xs text-muted-foreground">
        Total: {total.toLocaleString('pt-BR')}
      </div>
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{card.insight}</p>
      )}
    </div>
  );
}

function ABCCurveContent({ card }: { card: Extract<DashboardCardType, { type: 'abc_curve' }> }) {
  const { classA, classB, classC } = card.data;
  
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
          <span className="text-sm font-semibold text-green-700">Classe A</span>
          <span className="text-sm font-bold text-green-700">{classA.percentage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
          <span className="text-sm font-semibold text-yellow-700">Classe B</span>
          <span className="text-sm font-bold text-yellow-700">{classB.percentage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-red-50 rounded">
          <span className="text-sm font-semibold text-red-700">Classe C</span>
          <span className="text-sm font-bold text-red-700">{classC.percentage.toFixed(1)}%</span>
        </div>
      </div>
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{card.insight}</p>
      )}
    </div>
  );
}

function ParetoContent({ card }: { card: Extract<DashboardCardType, { type: 'pareto' }> }) {
  const { top20Percentage, items } = card.data;
  
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-xs text-muted-foreground">Top 20% representam</p>
        <p className="text-2xl font-bold text-blue-600">{top20Percentage.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">do valor total</p>
      </div>
      
      <div className="space-y-1">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="truncate flex-1">{item.name}</span>
            <span className="font-semibold">{item.accumulated.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{card.insight}</p>
      )}
    </div>
  );
}

function AttentionPointsContent({ card }: { card: Extract<DashboardCardType, { type: 'attention_points' }> }) {
  const { points } = card.data;
  
  const severityConfig = {
    low: { color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle },
    high: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
  };
  
  return (
    <div className="space-y-2">
      {points.map((point, idx) => {
        const config = severityConfig[point.severity];
        const Icon = config.icon;
        
        return (
          <div key={idx} className={cn('p-2 rounded flex items-start gap-2', config.bg)}>
            <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.color)} />
            <div className="flex-1">
              <p className={cn('text-xs font-medium', config.color)}>{point.message}</p>
              {point.affectedItems && point.affectedItems.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Afeta: {point.affectedItems.slice(0, 3).join(', ')}
                  {point.affectedItems.length > 3 && ` +${point.affectedItems.length - 3}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalculatedColumnContent({ card }: { card: Extract<DashboardCardType, { type: 'calculated_column' }> }) {
  const { columnName, formula, stats } = card.data;
  
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">Coluna</p>
        <p className="text-sm font-semibold">{columnName}</p>
      </div>
      
      <div>
        <p className="text-xs text-muted-foreground">Fórmula</p>
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{formula}</code>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground">Média</p>
          <p className="text-sm font-semibold">{stats.avg.toLocaleString('pt-BR')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">{stats.sum.toLocaleString('pt-BR')}</p>
        </div>
      </div>
      
      {card.insight && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{card.insight}</p>
      )}
    </div>
  );
}
