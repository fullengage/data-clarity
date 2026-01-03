import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  AreaChart as AreaIcon,
} from 'lucide-react';
import { ChartConfig } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

// ============================================================================
// Types
// ============================================================================

interface ChartCardProps {
  chart: ChartConfig;
  className?: string;
}

type ChartType = 'bar' | 'horizontal_bar' | 'line' | 'area' | 'pie';

interface ChartTypeOption {
  id: ChartType;
  icon: typeof BarChart3;
  label: string;
}

interface DataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = [
  '#0066cc', // blue
  '#667eea', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // purple
] as const;

const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { id: 'bar', icon: BarChart3, label: 'Gráfico de barras' },
  { id: 'line', icon: LineIcon, label: 'Gráfico de linha' },
  { id: 'area', icon: AreaIcon, label: 'Gráfico de área' },
  { id: 'pie', icon: PieIcon, label: 'Gráfico de pizza' },
];

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
} as const;

const MIN_BAR_ITEMS = 10;

// ============================================================================
// Utility Functions
// ============================================================================

const isPaddingName = (name: unknown): boolean =>
  typeof name === 'string' && name.startsWith('__pad_');

const createPaddingData = (currentLength: number): DataPoint[] =>
  Array.from({ length: MIN_BAR_ITEMS - currentLength }, (_, i) => ({
    name: `__pad_${i + 1}`,
    value: 0,
  }));

// ============================================================================
// Hooks
// ============================================================================

function useValueFormatter(format?: string) {
  return useCallback(
    (value: number): string => {
      const absValue = Math.abs(value);

      if (format === 'currency') {
        if (value === 0) return 'R$ 0';
        if (absValue >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
        if (absValue >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      }

      if (format === 'percentage') {
        return `${value.toFixed(1)}%`;
      }

      // Default: number
      if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
      return String(value);
    },
    [format]
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ChartIcon({ type }: { type: ChartType }) {
  const iconClass = 'w-5 h-5 text-[#0066cc]';

  switch (type) {
    case 'bar':
    case 'horizontal_bar':
      return <BarChart3 className={iconClass} />;
    case 'line':
      return <LineIcon className={iconClass} />;
    case 'area':
      return <AreaIcon className={iconClass} />;
    case 'pie':
      return <PieIcon className={iconClass} />;
    default:
      return null;
  }
}

interface ChartTypeSelectorProps {
  currentType: ChartType;
  onTypeChange: (type: ChartType) => void;
}

function ChartTypeSelector({ currentType, onTypeChange }: ChartTypeSelectorProps) {
  return (
    <div
      className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity"
      role="group"
      aria-label="Tipo de gráfico"
    >
      {CHART_TYPE_OPTIONS.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 rounded-lg',
            currentType === id
              ? 'bg-white text-[#0066cc] shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          )}
          onClick={() => onTypeChange(id)}
          aria-label={label}
          aria-pressed={currentType === id}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// Chart Renderers
// ============================================================================

interface BaseChartProps {
  data: DataPoint[];
  formatValue: (value: number) => string;
  title: string;
  yKey?: string;
}

function BarChartRenderer({
  data,
  formatValue,
  title,
  yKey,
  isHorizontal = false,
}: BaseChartProps & { isHorizontal?: boolean }) {
  const chartHeight = isHorizontal ? 320 : 300;

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload?.[0]?.payload;
    if (isPaddingName(p?.name)) return null;

    return (
      <div style={TOOLTIP_STYLE} className="px-3 py-2">
        <div className="text-xs text-slate-500 mb-1">{String(p?.name ?? '')}</div>
        <div className="text-sm font-medium text-slate-800">
          {yKey || 'Valor'}: {formatValue(Number(p?.value ?? 0))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 30, left: isHorizontal ? 60 : 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <Legend
            verticalAlign="top"
            align="center"
            iconType="rect"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          <XAxis
            type={isHorizontal ? 'number' : 'category'}
            dataKey={isHorizontal ? undefined : 'name'}
            tick={{ fill: '#64748B', fontSize: 11 }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            interval={isHorizontal ? undefined : 0}
            angle={isHorizontal ? 0 : -15}
            textAnchor={isHorizontal ? 'middle' : 'end'}
            tickFormatter={
              isHorizontal ? formatValue : (val) => (isPaddingName(val) ? '' : String(val))
            }
          />
          <YAxis
            type={isHorizontal ? 'category' : 'number'}
            dataKey={isHorizontal ? 'name' : undefined}
            tick={{ fill: '#64748B', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={isHorizontal ? 0 : undefined}
            tickFormatter={isHorizontal ? undefined : formatValue}
            width={isHorizontal ? 120 : 60}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            content={renderTooltip}
          />
          <Bar
            name={title}
            dataKey="value"
            radius={isHorizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]}
            barSize={30}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartRenderer({ data, yKey }: BaseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function LineChartRenderer({ data, formatValue, yKey }: BaseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94A3B8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(val: number) => [formatValue(val), yKey || 'Valor']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          strokeWidth={3}
          dot={{ r: 4, fill: CHART_COLORS[0], strokeWidth: 2, stroke: '#FFFFFF' }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartRenderer({ data, formatValue, yKey }: BaseChartProps) {
  const gradientId = 'colorValue';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94A3B8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(val: number) => [formatValue(val), yKey || 'Valor']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          strokeWidth={3}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function UnsupportedChart() {
  return (
    <div className="h-[300px] flex items-center justify-center text-slate-400">
      Tipo de gráfico não suportado
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ChartCard({ chart, className }: ChartCardProps) {
  const [currentType, setCurrentType] = useState<ChartType>(chart.type as ChartType);
  const formatValue = useValueFormatter(chart.format);

  // Memoize data processing
  const processedData = useMemo(() => {
    const baseData = (chart.data || []) as DataPoint[];
    const type = currentType || chart.type;
    const needsPadding =
      (type === 'bar' || type === 'horizontal_bar') &&
      baseData.length > 0 &&
      baseData.length < MIN_BAR_ITEMS;

    return needsPadding ? [...baseData, ...createPaddingData(baseData.length)] : baseData;
  }, [chart.data, chart.type, currentType]);

  // Memoize chart props
  const chartProps = useMemo<BaseChartProps>(
    () => ({
      data: processedData,
      formatValue,
      title: chart.title,
      yKey: chart.yKey,
    }),
    [processedData, formatValue, chart.title, chart.yKey]
  );

  const handleTypeChange = useCallback((type: ChartType) => {
    setCurrentType(type);
  }, []);

  const renderChart = () => {
    const type = currentType || chart.type;

    switch (type) {
      case 'bar':
        return <BarChartRenderer {...chartProps} />;
      case 'horizontal_bar':
        return <BarChartRenderer {...chartProps} isHorizontal />;
      case 'pie':
        return <PieChartRenderer {...chartProps} />;
      case 'line':
        return <LineChartRenderer {...chartProps} />;
      case 'area':
        return <AreaChartRenderer {...chartProps} />;
      default:
        return <UnsupportedChart />;
    }
  };

  return (
    <article
      className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col h-full group/card',
        className
      )}
    >
      <header className="flex items-center justify-between mb-6 border-b border-[#eee] pb-4">
        <div className="flex items-center gap-2">
          <ChartIcon type={chart.type as ChartType} />
          <div>
            <h3 className="text-[16px] font-bold text-[#1a1a1a] leading-none">{chart.title}</h3>
            {chart.yKey && (
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Análise de {chart.yKey}
              </p>
            )}
          </div>
        </div>

        <ChartTypeSelector currentType={currentType} onTypeChange={handleTypeChange} />
      </header>

      <div className="flex-1">{renderChart()}</div>
    </article>
  );
}