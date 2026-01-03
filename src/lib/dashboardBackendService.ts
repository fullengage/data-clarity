/**
 * Dashboard Backend Service
 * 
 * Handles all backend communication for dashboard data.
 * All calculations are done in the backend (Python/SQL).
 * Frontend only renders the results.
 */

import { DashboardData, DashboardApiResponse, ChatApiRequest, ChatApiResponse } from '@/types/newDashboard.types';

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL;

if (!PYTHON_API_URL) {
  console.warn('VITE_PYTHON_API_URL not configured. Dashboard backend features will be limited.');
}

// ============================================================================
// DASHBOARD DATA
// ============================================================================

/**
 * Fetches complete dashboard data from backend
 * Backend returns all calculated cards, charts, and metrics
 */
export async function fetchDashboardData(
  dashboardId: string,
  userId: string
): Promise<DashboardApiResponse> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/dashboard/${dashboardId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
    };
  }
}

/**
 * Refreshes dashboard calculations
 * Triggers backend to recalculate all metrics and cards
 */
export async function refreshDashboard(
  dashboardId: string,
  userId: string
): Promise<DashboardApiResponse> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/dashboard/${dashboardId}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh dashboard',
    };
  }
}

// ============================================================================
// CHAT / CONVERSATIONAL AI
// ============================================================================

/**
 * Sends a chat message to the AI assistant
 * AI ONLY explains and answers questions - does NOT calculate
 */
export async function sendChatMessage(
  request: ChatApiRequest
): Promise<ChatApiResponse> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/dashboard/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

// ============================================================================
// MOCK DATA (for development/testing)
// ============================================================================

/**
 * Returns mock dashboard data for testing
 * Remove this once backend is fully implemented
 */
export function getMockDashboardData(dashboardId: string): DashboardData {
  return {
    id: dashboardId,
    title: 'Dashboard de Vendas 2024',
    description: 'Análise completa de vendas e performance comercial',
    status: {
      status: 'updated',
      lastUpdate: new Date(),
      message: 'Dados atualizados com sucesso',
    },
    cards: [
      {
        id: 'metric-1',
        type: 'metric',
        title: 'Faturamento Total',
        icon: 'dollar-sign',
        data: {
          value: 'R$ 1.245.678,90',
          change: 12.5,
          changeLabel: 'vs mês anterior',
          secondaryInfo: 'Meta: R$ 1.200.000,00',
        },
        insight: 'Excelente! Você superou a meta em 3,8%.',
      },
      {
        id: 'trend-1',
        type: 'trend',
        title: 'Vendas Mensais',
        icon: 'trending-up',
        data: {
          current: 1245678,
          previous: 1107234,
          change: 138444,
          changePercentage: 12.5,
          series: [
            { period: 'Jan', value: 980000 },
            { period: 'Fev', value: 1050000 },
            { period: 'Mar', value: 1107234 },
            { period: 'Abr', value: 1245678 },
          ],
        },
        insight: 'Crescimento consistente nos últimos 4 meses.',
      },
      {
        id: 'top-1',
        type: 'top_ranking',
        title: 'Top 5 Clientes',
        icon: 'users',
        data: {
          items: [
            { rank: 1, name: 'Cliente A', value: 234567, percentage: 18.8 },
            { rank: 2, name: 'Cliente B', value: 189234, percentage: 15.2 },
            { rank: 3, name: 'Cliente C', value: 156789, percentage: 12.6 },
            { rank: 4, name: 'Cliente D', value: 134567, percentage: 10.8 },
            { rank: 5, name: 'Cliente E', value: 98765, percentage: 7.9 },
          ],
          total: 1245678,
        },
        insight: 'Top 5 clientes representam 65,3% do faturamento.',
      },
      {
        id: 'abc-1',
        type: 'abc_curve',
        title: 'Curva ABC de Produtos',
        icon: 'pie-chart',
        data: {
          classA: { count: 15, percentage: 80, value: 996542 },
          classB: { count: 35, percentage: 15, value: 186851 },
          classC: { count: 150, percentage: 5, value: 62284 },
        },
        insight: 'Apenas 15 produtos geram 80% da receita.',
      },
      {
        id: 'pareto-1',
        type: 'pareto',
        title: 'Análise de Pareto',
        icon: 'bar-chart',
        data: {
          top20Percentage: 78.5,
          items: [
            { name: 'Produto 1', value: 234567, accumulated: 18.8 },
            { name: 'Produto 2', value: 189234, accumulated: 33.9 },
            { name: 'Produto 3', value: 156789, accumulated: 46.5 },
          ],
        },
        insight: '20% dos produtos geram 78,5% da receita.',
      },
    ],
    charts: [
      {
        id: 'chart-1',
        type: 'chart',
        title: 'Vendas por Região',
        icon: 'bar-chart',
        data: {
          chartType: 'bar',
          series: [
            { name: 'Sul', value: 345678 },
            { name: 'Sudeste', value: 567890 },
            { name: 'Centro-Oeste', value: 234567 },
            { name: 'Nordeste', value: 97543 },
          ],
          format: 'currency',
        },
      },
      {
        id: 'chart-2',
        type: 'chart',
        title: 'Evolução Mensal',
        icon: 'line-chart',
        data: {
          chartType: 'line',
          series: [
            { name: 'Jan', value: 980000 },
            { name: 'Fev', value: 1050000 },
            { name: 'Mar', value: 1107234 },
            { name: 'Abr', value: 1245678 },
          ],
          format: 'currency',
        },
      },
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'attention_points',
        title: 'Pontos de Atenção',
        icon: 'alert-triangle',
        status: 'warning',
        data: {
          points: [
            {
              severity: 'high',
              message: '3 clientes com queda de 20% nas compras',
              affectedItems: ['Cliente X', 'Cliente Y', 'Cliente Z'],
            },
            {
              severity: 'medium',
              message: 'Estoque baixo em 5 produtos principais',
              affectedItems: ['Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E'],
            },
            {
              severity: 'low',
              message: '2 vendedores abaixo da meta mensal',
              affectedItems: ['Vendedor 1', 'Vendedor 2'],
            },
          ],
        },
      },
    ],
    tableData: {
      columns: ['Cliente', 'Produto', 'Quantidade', 'Valor', 'Data'],
      rows: [
        { Cliente: 'Cliente A', Produto: 'Produto 1', Quantidade: 100, Valor: 10000, Data: '2024-01-15' },
        { Cliente: 'Cliente B', Produto: 'Produto 2', Quantidade: 50, Valor: 7500, Data: '2024-01-16' },
        { Cliente: 'Cliente C', Produto: 'Produto 3', Quantidade: 75, Valor: 9000, Data: '2024-01-17' },
      ],
      totalRows: 1234,
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      dataSource: 'vendas_2024.xlsx',
      rowCount: 1234,
      columnCount: 5,
    },
  };
}
