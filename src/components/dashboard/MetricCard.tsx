import {
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Package,
  Percent,
  LucideIcon,
  Activity,
  Briefcase,
  User,
  CreditCard,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardMetric } from '@/types/dashboard';
import { Button } from '@/components/ui/button';

interface MetricCardProps {
  metric: DashboardMetric;
  className?: string;
  onEdit?: (metric: DashboardMetric) => void;
  onDelete?: (metricId: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  dollar: DollarSign,
  users: Users,
  cart: ShoppingCart,
  chart: BarChart3,
  box: Package,
  percent: Percent,
  activity: Activity,
  briefcase: Briefcase,
  user: User,
  'credit-card': CreditCard,
  calendar: Calendar,
  'trending-up': TrendingUpIcon,
  'trending-down': TrendingDownIcon,
};

const colorClasses = {
  blue: {
    bg: 'bg-dataviz-blue-light',
    icon: 'text-dataviz-blue',
    accent: 'border-l-dataviz-blue',
  },
  orange: {
    bg: 'bg-dataviz-orange-light',
    icon: 'text-dataviz-orange',
    accent: 'border-l-dataviz-orange',
  },
  green: {
    bg: 'bg-dataviz-green-light',
    icon: 'text-dataviz-green',
    accent: 'border-l-dataviz-green',
  },
  purple: {
    bg: 'bg-dataviz-purple-light',
    icon: 'text-dataviz-purple',
    accent: 'border-l-dataviz-purple',
  },
  yellow: {
    bg: 'bg-dataviz-yellow-light',
    icon: 'text-dataviz-yellow',
    accent: 'border-l-dataviz-yellow',
  },
  red: {
    bg: 'bg-dataviz-red-light',
    icon: 'text-dataviz-red',
    accent: 'border-l-dataviz-red',
  },
  teal: {
    bg: 'bg-dataviz-teal-light',
    icon: 'text-dataviz-teal',
    accent: 'border-l-dataviz-teal',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    accent: 'border-l-indigo-600',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    accent: 'border-l-pink-600',
  },
};

export default function MetricCard({ metric, className, onEdit, onDelete }: MetricCardProps) {
  const Icon = iconMap[metric.icon || 'chart'];
  const colors = colorClasses[metric.color || 'blue'];

  const label =
    (typeof metric.label === 'string' && metric.label.trim().length > 0
      ? metric.label.trim()
      : typeof (metric as any).name === 'string' && String((metric as any).name).trim().length > 0
        ? String((metric as any).name).trim()
        : typeof (metric as any).title === 'string' && String((metric as any).title).trim().length > 0
          ? String((metric as any).title).trim()
          : 'Métrica');

  const description =
    typeof (metric as any).description === 'string' && String((metric as any).description).trim().length > 0
      ? String((metric as any).description).trim()
      : null;

  // Determine border color based on metric color or type
  const borderTopColor = cn(
    metric.color === 'blue' && 'border-t-[#0066cc]',
    metric.color === 'indigo' && 'border-t-[#667eea]',
    metric.color === 'orange' && 'border-t-[#f59e0b]',
    metric.color === 'pink' && 'border-t-[#ec4899]',
    metric.color === 'green' && 'border-t-[#22c55e]',
    metric.color === 'red' && 'border-t-[#ef4444]',
    metric.color === 'purple' && 'border-t-[#8b5cf6]',
    metric.color === 'yellow' && 'border-t-[#facc15]',
    metric.color === 'teal' && 'border-t-[#14b8a6]',
    !metric.color && 'border-t-[#0066cc]'
  );

  return (
    <div
      className={cn(
        'bg-card rounded-xl p-6 shadow-sm hover:shadow-premium transition-all duration-300 group relative overflow-hidden border-t-4',
        borderTopColor,
        className
      )}
    >
      {/* Edit/Delete buttons - shown on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(metric);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/90 hover:bg-white hover:text-red-600 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(metric.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[12px] text-[#999] font-bold uppercase tracking-wider">
            {label}
          </p>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
            colors.bg
          )}>
            <Icon className={cn('w-5 h-5', colors.icon)} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            {metric.prefix && <span className="text-xl font-bold text-[#1a1a1a]">{metric.prefix}</span>}
            <p className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
              {metric.value}
            </p>
            {metric.suffix && <span className="text-sm font-bold text-[#1a1a1a] ml-0.5">{metric.suffix}</span>}
          </div>

          {(metric.change !== undefined || metric.trend) && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold mt-2',
                (metric.trend === 'up' || (metric.change !== undefined && metric.change > 0)) && 'text-[#22c55e]',
                (metric.trend === 'down' || (metric.change !== undefined && metric.change < 0)) && 'text-[#ef4444]',
                (metric.trend === 'neutral' || metric.change === 0) && 'text-[#999]'
              )}
            >
              <span className="flex items-center">
                {(metric.trend === 'up' || (metric.change !== undefined && metric.change > 0)) && <TrendingUpIcon className="w-3 h-3 mr-1" />}
                {(metric.trend === 'down' || (metric.change !== undefined && metric.change < 0)) && <TrendingDownIcon className="w-3 h-3 mr-1" />}
                {(metric.trend === 'neutral' || metric.change === 0) && <Minus className="w-3 h-3 mr-1" />}
                <span className="ml-0.5">{metric.change !== undefined ? `${Math.abs(metric.change)}%` : 'Estável'}</span>
              </span>
              <span className="opacity-70 font-normal">vs. período anterior</span>
            </div>
          )}

          {metric.insight && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 italic leading-relaxed">
                "{metric.insight}"
              </p>
            </div>
          )}

          {!metric.change && !metric.trend && !metric.insight && (
            <div className="mt-2 h-4" /> // Spacer to keep height consistent
          )}
        </div>
      </div>

      {/* Status Badge */}
      {metric.status && (
        <div className="absolute bottom-4 right-4">
          {metric.status === 'good' && <CheckCircle2 className="w-5 h-5 text-[#22c55e] fill-[#22c55e]/10" />}
          {metric.status === 'warning' && <AlertCircle className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b]/10" />}
          {metric.status === 'critical' && <XCircle className="w-5 h-5 text-[#ef4444] fill-[#ef4444]/10" />}
        </div>
      )}
    </div>
  );
}
