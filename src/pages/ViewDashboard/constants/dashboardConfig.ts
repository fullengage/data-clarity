/**
 * Constantes e Configurações do ViewDashboard
 */

import {
  DollarSign,
  TrendingDown,
  Activity,
  Factory,
  User,
  History,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { DashboardMetric, ChartConfig } from '@/types/dashboard';
import { FinanceShortcut, AiSuggestion } from '../types/viewDashboard.types';

// ============================================================================
// Atalhos de Análise Financeira
// ============================================================================

export const FINANCE_SHORTCUTS: FinanceShortcut[] = [
  { 
    icon: DollarSign, 
    label: 'Receita Total', 
    prompt: 'Gere um card com a Receita Total (Soma do Valor)' 
  },
  { 
    icon: TrendingDown, 
    label: 'Custo Total', 
    prompt: 'Gere um card com o Custo Total (Soma do Valor filtrando despesas)' 
  },
  { 
    icon: Activity, 
    label: 'Lucro/Prejuízo', 
    prompt: 'Gere uma análise de Resultado de Lucro ou Prejuízo' 
  },
  { 
    icon: Factory, 
    label: 'Por Projeto', 
    prompt: 'Gere um gráfico de barras comparando Valor por Projeto' 
  },
  { 
    icon: User, 
    label: 'Por Cliente', 
    prompt: 'Gere um gráfico comparando Valor por Cliente' 
  },
  { 
    icon: History, 
    label: 'Status Fin.', 
    prompt: 'Gere um gráfico de pizza por Status Financeiro' 
  },
  { 
    icon: CreditCard, 
    label: 'Pagamentos', 
    prompt: 'Gere um gráfico de barras por Forma de Pagamento' 
  },
  { 
    icon: Calendar, 
    label: 'Evolução', 
    prompt: 'Gere um gráfico de linha da evolução financeira ao longo do tempo' 
  },
];

// ============================================================================
// Sugestões de AI
// ============================================================================

export const AI_SUGGESTIONS: AiSuggestion[] = [
  { label: '📊 Curva ABC', prompt: 'Gere uma análise de Curva ABC' },
  { label: '🎯 Pareto', prompt: 'Faça um gráfico de Pareto dos principais itens' },
  { label: '📈 Tendência Mensal', prompt: 'Mostre a tendência de faturamento mensal' },
  { label: '🏆 Tops', prompt: 'Quais são os 10 itens que mais trazem resultado?' },
];

// ============================================================================
// Períodos de Seleção
// ============================================================================

export const PERIOD_OPTIONS = ['Dezembro 2024', 'Hoje', '7D', '30D'] as const;

export type PeriodOption = typeof PERIOD_OPTIONS[number];

// ============================================================================
// Opções de Ícones para Métricas
// ============================================================================

export const METRIC_ICON_OPTIONS = [
  { value: 'dollar', label: '💵 Dinheiro' },
  { value: 'users', label: '👥 Usuários' },
  { value: 'cart', label: '🛒 Carrinho' },
  { value: 'chart', label: '📊 Gráfico' },
  { value: 'box', label: '📦 Caixa' },
  { value: 'percent', label: '% Percentual' },
  { value: 'activity', label: '📈 Atividade' },
  { value: 'briefcase', label: '💼 Maleta' },
  { value: 'trending-up', label: '📈 Crescimento' },
  { value: 'trending-down', label: '📉 Queda' },
] as const;

// ============================================================================
// Opções de Cores para Métricas
// ============================================================================

export const METRIC_COLOR_OPTIONS = [
  { value: 'blue', label: '🔵 Azul' },
  { value: 'orange', label: '🟠 Laranja' },
  { value: 'green', label: '🟢 Verde' },
  { value: 'purple', label: '🟣 Roxo' },
  { value: 'yellow', label: '🟡 Amarelo' },
  { value: 'red', label: '🔴 Vermelho' },
  { value: 'teal', label: '🔷 Azul-petróleo' },
] as const;

// ============================================================================
// Tipos de Gráfico
// ============================================================================

export const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Barras' },
  { value: 'horizontal_bar', label: 'Barras horizontais' },
  { value: 'line', label: 'Linha' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Pizza' },
] as const;

// ============================================================================
// Tipos de Agregação
// ============================================================================

export const AGGREGATION_OPTIONS = [
  { value: 'count', label: 'Contagem' },
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
] as const;

// ============================================================================
// Labels de Intenção
// ============================================================================

export const INTENT_LABELS = {
  financial: '💰 Dashboard Financeiro',
  sales: '📈 Vendas / Faturamento',
  customers: '👥 Clientes',
  production: '🏭 Produção / Operação',
  inventory: '📦 Estoque / Suprimentos',
  growth: '🚀 Growth / Marketing',
  unknown: '🔍 Análise Geral',
} as const;

// ============================================================================
// Cores de Borda por Intent
// ============================================================================

export const INTENT_BORDER_COLORS = {
  financial: [
    'border-t-emerald-500',
    'border-t-teal-500',
    'border-t-emerald-600',
    'border-t-cyan-600',
  ],
  default: [
    'border-t-dataviz-blue',
    'border-t-indigo-500',
    'border-t-amber-500',
    'border-t-pink-500',
  ],
} as const;

// ============================================================================
// Dados Mock (para demonstração)
// ============================================================================

export const MOCK_METRICS: DashboardMetric[] = [
  { id: '1', label: 'Faturamento Total', value: 'R$ 1.477.273,86', icon: 'dollar', color: 'blue' },
  { id: '2', label: 'Ticket Médio', value: 'R$ 32.114,65', icon: 'users', color: 'orange' },
  { id: '3', label: 'Total de Pedidos', value: '46', icon: 'cart', color: 'green' },
  { id: '4', label: 'Mix Médio', value: '7,8 produtos', icon: 'box', color: 'purple' },
];

export const MOCK_CHARTS: ChartConfig[] = [
  {
    id: '1',
    type: 'bar',
    title: 'Distribuição por Classe ABC',
    data: [
      { name: 'A', value: 740000 },
      { name: 'B', value: 460000 },
      { name: 'C', value: 300000 },
    ],
  },
  {
    id: '2',
    type: 'pie',
    title: 'Vendas por Categoria',
    data: [
      { name: 'Categoria A', value: 42 },
      { name: 'Categoria B', value: 39 },
      { name: 'Categoria C', value: 17 },
      { name: 'Outros', value: 2 },
    ],
  },
];

export const MOCK_TABLE_DATA = [
  { Produto: 'Produto A', Categoria: 'Cat 1', Valor: 'R$ 15.000', Quantidade: 50 },
  { Produto: 'Produto B', Categoria: 'Cat 2', Valor: 'R$ 22.000', Quantidade: 75 },
  { Produto: 'Produto C', Categoria: 'Cat 1', Valor: 'R$ 8.500', Quantidade: 30 },
  { Produto: 'Produto D', Categoria: 'Cat 3', Valor: 'R$ 45.000', Quantidade: 120 },
  { Produto: 'Produto E', Categoria: 'Cat 2', Valor: 'R$ 12.300', Quantidade: 45 },
];

// ============================================================================
// Posição Padrão de Widget
// ============================================================================

export const DEFAULT_WIDGET_POSITION = { x: 0, y: 0, w: 3, h: 2 };
