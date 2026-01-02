import { ColumnInfo, AiDecision } from '@/types/dashboard';

/**
 * OpenAI Proxy Service (via Python Engine)
 *
 * Agora as chamadas são roteadas pelo backend Python para evitar CORS
 * e proteger a API Key.
 */

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL;

if (!PYTHON_API_URL) {
  throw new Error(
    "ERRO CRÍTICO: A variável de ambiente VITE_PYTHON_API_URL não está definida. " +
    "Verifique o arquivo .env e faça rebuild do frontend."
  );
}

/**
 * Solicita geração de widget para o dashboard via Proxy Python
 */
export async function askOpenAIForWidget(
  userId: string,
  dashboardId: string,
  prompt: string,
  context: {
    columns: any[];
    semanticMap: any[];
    intent: any;
    rowCount: number;
    fileName: string;
    sourceId?: string;
    semanticDatasetId?: string;
  }
): Promise<{ status: 'success' | 'error'; widgetConfig?: any; type?: 'metric' | 'chart'; message?: string }> {
  console.log('🎨 [OpenAI Proxy] Widget Request:', { prompt, dashboardId });

  try {
    const response = await fetch(`${PYTHON_API_URL}/ai/ask-widget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        dashboard_id: dashboardId,
        prompt,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('🔥 [OpenAI Proxy] Error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao conectar via proxy de IA.',
    };
  }
}

/**
 * Solicita geração de fórmula para coluna calculada via Proxy Python
 */
export async function askOpenAIForFormula(
  userId: string,
  prompt: string,
  context: {
    columns: any[];
    fileName: string;
    dashboardId: string;
  }
): Promise<{ status: 'success' | 'error'; columnName?: string; formula?: string; message?: string }> {
  console.log('📐 [OpenAI Proxy] Formula Request:', { prompt, dashboardId: context.dashboardId });

  try {
    const response = await fetch(`${PYTHON_API_URL}/ai/ask-formula`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        prompt,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('🔥 [OpenAI Proxy] Error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao conectar via proxy de fórmula.',
    };
  }
}

/**
 * Chat livre (não implementado no proxy ainda, mas mantemos a assinatura)
 */
export async function chatWithAssistant(
  dashboardId: string,
  message: string,
  context?: any
): Promise<{ status: 'success' | 'error'; response?: string; message?: string }> {
  console.warn('⚠️ [OpenAI Proxy] Chat not implemented');
  return { status: 'error', message: 'Chat não disponível via proxy no momento.' };
}

/**
 * Verifica se a API está configurada correctly (agora sempre retorna true se houver URL do Python)
 */
export function isOpenAIConfigured(): boolean {
  return true; // Assumimos que o Python engine está configurado
}

/**
 * Limpa o thread (não implementado no proxy básico ainda)
 */
export function clearThread(dashboardId: string): void {
  console.log('🗑️ [OpenAI Proxy] Clear thread requested for:', dashboardId);
}

/**
 * Solicita uma interpretação completa do dataset para a IA
 * Retorna o JSON estruturado conforme o esquema de ai_decisions
 */
export async function askOpenAIForInterpretation(
  userId: string,
  dashboardId: string,
  context: {
    columns: ColumnInfo[];
    sampleData: Record<string, unknown>[];
    fileName: string;
    rowCount: number;
    intent?: string;
  }
): Promise<{ status: 'success' | 'error'; decision?: AiDecision; message?: string }> {
  console.log('🧠 [OpenAI Proxy] Interpretation Request:', { fileName: context.fileName });
  return { status: 'error', message: 'Interpretação via proxy não disponível no momento.' };
}

// O ID do Assistente agora é gerenciado pelo backend
export const ASSISTANT_ID = 'proxy';

