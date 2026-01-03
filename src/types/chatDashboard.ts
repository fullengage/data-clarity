/**
 * Chat Dashboard Types
 * 
 * Contrato rígido para comunicação com webhook chat_dashboard
 * 
 * PRINCÍPIOS:
 * - Frontend NÃO é fonte da verdade
 * - IA NÃO calcula números
 * - IA NÃO lê linhas de tabela
 * - IA responde APENAS com base em métricas já existentes no backend
 */

/**
 * Payload enviado ao webhook chat_dashboard
 * 
 * APENAS IDENTIFICADORES - SEM DADOS ANALÍTICOS
 */
export interface ChatDashboardRequest {
  action: 'chat_dashboard';
  question: string;
  dashboard: {
    id: string;
    ai_decision_id: string;
    title?: string; // Opcional, apenas informativo
  };
  user: {
    id: string;
  };
}

/**
 * Resposta do webhook chat_dashboard
 */
export interface ChatDashboardResponse {
  status: 'success' | 'error';
  answer?: string;
  insights?: string[];
  message?: string;
  
  // Caso a análise não esteja disponível
  analysis_unavailable?: boolean;
  suggestion?: string; // Ex: "Você pode gerar um novo card para visualizar essa informação"
  
  // Campos opcionais para respostas de widget (retrocompatibilidade)
  widgetConfig?: any;
  config?: any;
  type?: 'metric' | 'chart';
}

/**
 * Resposta quando a análise solicitada não existe
 */
export interface AnalysisUnavailableResponse extends ChatDashboardResponse {
  status: 'success';
  analysis_unavailable: true;
  answer: string; // Ex: "Este dashboard ainda não possui essa análise."
  suggestion: string; // Ex: "Você pode gerar um novo card para visualizar essa informação."
}
