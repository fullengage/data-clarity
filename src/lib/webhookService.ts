import { ParsedFileData } from './fileParser';
import { ProcessingResponse, DashboardMetric, ChartConfig } from '@/types/dashboard';
import { supabase } from './supabase';
import { askOpenAIForWidget, askOpenAIForFormula, isOpenAIConfigured } from './openaiService';

/**
 * DC - Full Pipeline Webhook Service (VERSÃO CORRIGIDA)
 * 
 * Melhorias:
 * ✅ Melhor desempacotamento de respostas N8N
 * ✅ Detecta e remove wrappers como { myField: {...} }
 * ✅ Logging detalhado para debug
 * ✅ Trata arrays e strings JSON corretamente
 * ✅ Validação robusta de resposta
 */

const WEBHOOK_URL = 'https://autowebhook.chathook.com.br/webhook/dc/full-pipeline';
const AI_ASSISTANT_URL = 'https://autowebhook.chathook.com.br/webhook/a4ia-chat';
const AI_FORMULA_URL = 'https://autowebhook.chathook.com.br/webhook/dc/formula-generator';
const SAMPLE_SIZE = 100;

/**
 * FUNÇÃO MELHORADA: Desempacota respostas N8N com múltiplos níveis de wrapper
 * 
 * Casos suportados:
 * - [{ status: 'success', ... }]  → Desempacota array com 1 item
 * - { myField: { status: 'success', ... } }  → Remove wrapper suspeito
 * - { data: { status: 'success', ... } }  → Remove wrapper comum
 * - '{"status": "success", ...}'  → Faz JSON.parse de string
 * - Combinações dos acima
 */
function normalizeWebhookResult(input: any, depth: number = 0): any {
  let result = input;
  const MAX_DEPTH = 10;

  if (depth > MAX_DEPTH) {
    console.warn(`⚠️ [Normalize] Max depth (${MAX_DEPTH}) reached, stopping`);
    return result;
  }

  const indent = '  '.repeat(depth);
  console.log(
    `${indent}[Normalize:${depth}] Type: ${typeof result}${Array.isArray(result) ? ' (Array)' : ''}`
  );

  // 1️⃣ DESEMPACOTAR ARRAYS
  if (Array.isArray(result)) {
    console.log(`${indent}  📦 Array with ${result.length} item(s)`);

    if (result.length === 0) {
      console.log(`${indent}  ❌ Empty array`);
      return result;
    }

    if (result.length === 1) {
      console.log(`${indent}  ➡️  Unwrapping single item...`);
      return normalizeWebhookResult(result[0], depth + 1);
    }

    // Procurar melhor item em múltiplos itens (normalizando cada item)
    const normalizedItems = result.map((item) => normalizeWebhookResult(item, depth + 1));
    const best = normalizedItems.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as any;
      return obj.status === 'success' || !!(obj.dashboard_id || obj.projectId);
    });

    if (best) {
      console.log(`${indent}  ✅ Found best item with status/ID`);
      return normalizeWebhookResult(best, depth + 1);
    }

    console.log(`${indent}  ➡️  Using first item`);
    return normalizeWebhookResult(normalizedItems[0], depth + 1);
  }

  // 2️⃣ PARSEAR STRINGS JSON
  if (typeof result === 'string') {
    console.log(`${indent}  📝 String, attempting parse...`);
    try {
      const parsed = JSON.parse(result);
      console.log(`${indent}  ✅ Successfully parsed as JSON`);
      return normalizeWebhookResult(parsed, depth + 1);
    } catch {
      console.log(`${indent}  ⚠️  Not JSON, keeping as string`);
      return result;
    }
  }

  // 3️⃣ PROCESSAR OBJETOS
  if (result && typeof result === 'object') {
    const keys = Object.keys(result);
    console.log(`${indent}  📋 Object with ${keys.length} key(s): [${keys.join(', ')}]`);

    // SUCESSO: Tem as chaves esperadas!
    if (
      (result as any).status === 'success' ||
      (result as any).dashboard_id ||
      (result as any).projectId
    ) {
      console.log(`${indent}  ✨✨✨ VALID STRUCTURE FOUND! ✨✨✨`);
      console.log(`${indent}     status: ${(result as any).status}`);
      console.log(`${indent}     dashboard_id: ${(result as any).dashboard_id}`);
      console.log(`${indent}     projectId: ${(result as any).projectId}`);
      return result;
    }

    // PROCURAR WRAPPERS COMUNS
    const commonWrappers = ['data', 'body', 'result', 'output', 'response', 'payload', 'json', 'card', 'widget'];
    for (const key of commonWrappers) {
      if (key in result && result[key] && typeof result[key] === 'object') {
        console.log(`${indent}  🎁 Found common wrapper: "${key}"`);
        return normalizeWebhookResult(result[key], depth + 1);
      }
    }

    // 🔓 CHAVE ÚNICA: FORÇAR DESEMPACOTAMENTO (SEM RESTRIÇÕES)
    if (keys.length === 1) {
      const key = keys[0];
      const val = (result as any)[key];

      console.log(`${indent}  🔓 Single key detected: "${key}"`);

      // Se for objeto, SEMPRE desempacotar
      if (val && typeof val === 'object') {
        console.log(`${indent}     Value is object, unwrapping...`);
        return normalizeWebhookResult(val, depth + 1);
      }

      // Se for string, tentar parsear como JSON
      if (typeof val === 'string') {
        console.log(`${indent}     Attempting JSON.parse on string value...`);
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object') {
            console.log(`${indent}     Successfully parsed as JSON`);
            return normalizeWebhookResult(parsed, depth + 1);
          }
        } catch {
          console.log(`${indent}     Not valid JSON`);
          console.log(`${indent}     value preview: ${val.slice(0, 200)}`);
        }
      }

      console.log(`${indent}     Value is primitive (${typeof val}), unwrapping anyway`);
      return val;
    }

    // MÚLTIPLAS CHAVES: Logar para debug
    console.log(`${indent}  Multiple keys present, cannot auto-unwrap`);
    console.log(`${indent}     Checking structure...`);
    console.log(`${indent}     - status: ${!!(result as any).status}`);
    console.log(`${indent}     - dashboard_id: ${!!(result as any).dashboard_id}`);
    console.log(`${indent}     - projectId: ${!!(result as any).projectId}`);
  }

  console.log(`${indent}  Returning at depth ${depth}`);
  return result;
}

export interface DashboardGenerationPayload {
  user_id: string;
  template_id: string;
  template_name?: string;
  file: {
    name: string;
    type: string;
    columns: string[];
    row_count: number;
  };
  sample_data: Record<string, unknown>[];
  dataset?: {
    columns: string[];
    rows: Record<string, unknown>[];
    blocks?: Array<{
      id: string;
      columns: string[];
      row_count: number;
      confidence: number;
    }>;
  };
  structure_decisions?: {
    merged_cells_fixed: boolean;
    totals_removed: boolean;
    blocks_detected: number;
    primary_block_id: string | null;
  };
  structure_confidence?: number;
  structure_warnings?: string[];
  column_mapping?: Record<string, string>;
  timestamp: string;
}

/**
 * Envia dados para o webhook do N8N e processa a resposta
 */
export async function sendToWebhook(
  userId: string,
  parsedData: ParsedFileData,
  templateId: string = 'unknown',
  columnMapping?: Record<string, string>
): Promise<ProcessingResponse> {
  console.log('📤 [DC Pipeline] Starting...', {
    userId,
    fileName: parsedData.fileName,
    templateId,
  });

  try {
    // Extrai nomes das colunas
    const columnNames = parsedData.columns?.map((c) =>
      typeof c === 'string' ? c : c.name
    ) || [];

    const totalsRemoved = Array.isArray(parsedData.structural?.blocks)
      ? parsedData.structural!.blocks.reduce((acc, b) => acc + (b.removedTotalsRowCount || 0), 0) > 0
      : false;

    const payload: DashboardGenerationPayload = {
      user_id: userId,
      template_id: templateId,
      file: {
        name: parsedData.fileName,
        type: parsedData.fileType,
        columns: columnNames,
        row_count: parsedData.rowCount,
      },
      sample_data: parsedData.data.slice(0, SAMPLE_SIZE),
      dataset: {
        columns: columnNames,
        rows: parsedData.data,
        blocks: Array.isArray(parsedData.structural?.blocks)
          ? parsedData.structural!.blocks.map((b) => ({
            id: b.id,
            columns: b.columns,
            row_count: b.rowCount,
            confidence: b.confidence,
          }))
          : undefined,
      },
      structure_decisions: parsedData.structural
        ? {
          merged_cells_fixed: !!parsedData.structural.decisions?.mergedCellsFixed,
          totals_removed: totalsRemoved,
          blocks_detected: parsedData.structural.decisions?.blocksDetected || 0,
          primary_block_id: parsedData.structural.decisions?.primaryBlockId || null,
        }
        : undefined,
      structure_confidence: parsedData.structural?.confidence,
      structure_warnings: parsedData.structural?.warnings,
      column_mapping: columnMapping,
      timestamp: new Date().toISOString(),
    };

    console.log('📦 [DC Pipeline] Sending payload:', {
      columns: columnNames.length,
      sampleRows: parsedData.data.slice(0, SAMPLE_SIZE).length,
      templateId,
    });

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(' [DC Pipeline] Response status:', response.status);

    if (!response.ok) {
      console.error(
        ` [DC Pipeline] HTTP Error: ${response.status} ${response.statusText}`
      );
      return {
        status: 'incomplete',
        reason: 'webhook_unavailable',
        message: `O servidor está indisponível (HTTP ${response.status}).`,
      };
    }

    let result: any;
    const text = await response.text();

    // Tenta parsear a resposta
    try {
      result = JSON.parse(text);
      console.log(' [DC Pipeline] Response parsed successfully');
      console.log('   Raw response keys:', Object.keys(result));
    } catch (e) {
      console.error(' [DC Pipeline] Invalid JSON response:', text.substring(0, 200));
      return {
        status: 'incomplete',
        reason: 'invalid_response',
        message: 'Resposta inválida do servidor (JSON inválido).',
        nextAction: 'retry',
      };
    }

    // NORMALIZAR A RESPOSTA (remove wrappers)
    console.log(' [DC Pipeline] Normalizing response...');
    result = normalizeWebhookResult(result);

    console.log(' [DC Pipeline] After normalization:', {
      type: typeof result,
      isObject: typeof result === 'object',
      keys: typeof result === 'object' ? Object.keys(result) : 'N/A',
    });

    // Validações
    if (!result || (typeof result !== 'object' && typeof result !== 'string')) {
      console.error(' [DC Pipeline] Response is not an object or string:', {
        type: typeof result,
        value: result,
      });
      return {
        status: 'incomplete',
        reason: 'invalid_schema',
        message: `Formato inesperado. (Tipo: ${typeof result})`,
      };
    }

    // Detectar resposta assíncrona do N8N
    if (
      typeof result === 'object' &&
      (result.message === 'Workflow was started' || (result as any).workflow_id)
    ) {
      console.warn(' [DC Pipeline] N8N returned async response');
      return {
        status: 'incomplete',
        reason: 'webhook_unavailable',
        message: 'O servidor iniciou processamento mas não retornou dados síncronos.',
      };
    }

    // Validar se é sucesso
    const isSuccess =
      typeof result === 'object' &&
      ((result as any).status === 'success' ||
        !!((result as any).dashboard_id || (result as any).projectId));

    if (
      typeof result === 'object' &&
      isSuccess &&
      ((result as any).dashboard_id || (result as any).projectId)
    ) {
      console.log(' [DC Pipeline] SUCCESS! Returning dashboard data');
      return {
        status: 'success',
        projectId: (result as any).dashboard_id || (result as any).projectId,
        metrics: Array.isArray((result as any).metrics)
          ? (result as any).metrics
          : [],
        charts: Array.isArray((result as any).charts) ? (result as any).charts : [],
        insights: Array.isArray((result as any).insights)
          ? (result as any).insights
          : [],
        organizedData: (result as any).organizedData || parsedData.data,
      };
    }

    // Erro: resposta não tem sucesso
    const keys = typeof result === 'object' ? Object.keys(result) : [];
    console.error(' [DC Pipeline] Invalid response or server error:', {
      status: typeof result === 'object' ? (result as any).status : undefined,
      keys,
      message: typeof result === 'object' ? (result as any).message : undefined,
      fullBody: result,
    });

    return {
      status: 'incomplete',
      reason: 'invalid_schema',
      message:
        typeof result === 'object' && (result as any).message
          ? (result as any).message
          : typeof result === 'string'
            ? `Formato inesperado: ${result}`
            : `Formato inesperado. Campos: ${keys.join(', ')}`,
    };
  } catch (error) {
    console.error('🔥 [DC Pipeline] Fatal error:', error);
    return {
      status: 'incomplete',
      reason: 'webhook_unavailable',
      message:
        error instanceof Error
          ? `Erro de conexão: ${error.message}`
          : 'Erro de conexão com o servidor.',
    };
  }
}

/**
 * Tentativa com fallback (atualmente sem fallback local implementado)
 */
export async function sendToWebhookWithFallback(
  userId: string,
  parsedData: ParsedFileData,
  templateId: string = 'unknown'
): Promise<ProcessingResponse> {
  try {
    // Tenta webhook
    const result = await sendToWebhook(userId, parsedData, templateId);

    if (result.status === 'success') {
      console.log('✅ [DC Pipeline] Webhook successful, returning result');
      return result;
    }

    console.warn(
      '⚠️ [DC Pipeline] Webhook incomplete, returning incomplete status'
    );
    return result;
  } catch (webhookError) {
    console.error('❌ [DC Pipeline] Webhook error:', webhookError);
    throw webhookError;
  }
}

/**
 * Envia um pedido de linguagem natural para a IA gerar um widget
 * Formato atualizado para webhook chata4 com context completo
 */
export async function askAiForWidget(
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
    // Novos campos para contexto completo
    metrics?: Array<{ label: string; value: number | string }>;
    charts?: Array<{ title: string; type: string; data: any[] }>;
    tableSample?: any[];
    aiDecisionId?: string;
  }
): Promise<{ status: 'success' | 'error'; widgetConfig?: any; type?: 'metric' | 'chart'; message?: string; answer?: string; insights?: string[] }> {
  console.log('🤖 [AI Assistant] Asking for widget:', { prompt, dashboardId });

  // Usa OpenAI diretamente se configurada
  if (isOpenAIConfigured()) {
    console.log('🚀 [AI Assistant] Using OpenAI Assistants API directly');
    return askOpenAIForWidget(userId, dashboardId, prompt, context);
  }

  console.log('📡 [AI Assistant] Sending to webhook chata4');

  try {
    // Formato do payload para o webhook chata4
    const payload = {
      action: 'chat_dashboard',
      question: prompt,
      dashboard: {
        id: dashboardId,
        dataset_id: context.sourceId || null,
        ai_decision_id: context.aiDecisionId || context.semanticDatasetId || null,
        title: context.fileName || 'Dashboard'
      },
      context: {
        metrics: context.metrics || [],
        charts: context.charts || [],
        table_sample: (context.tableSample || []).slice(0, 10) // Limitar a 10 linhas
      },
      user: {
        id: userId
      }
    };

    console.log('🚀 [AI Assistant] Sending payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(AI_ASSISTANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('🔥 [AI Assistant] Server error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500)
      });
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}. Details: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    console.log('📥 [AI Assistant] Raw response:', result);

    // Normalizar resposta (mesma lógica do pipeline se houver wrappers)
    const normalized = normalizeWebhookResult(result);

    // Verificar se é uma resposta de chat (answer/insights) ou widget
    if (normalized.answer || normalized.output) {
      // Resposta tipo chat - parsear o output se for string JSON
      let parsedOutput = normalized;
      if (typeof normalized.output === 'string') {
        try {
          parsedOutput = JSON.parse(normalized.output);
        } catch {
          parsedOutput = { answer: normalized.output };
        }
      }

      return {
        status: 'success',
        answer: parsedOutput.answer || normalized.answer,
        insights: parsedOutput.insights || normalized.insights || [],
        message: parsedOutput.answer || normalized.answer
      };
    }

    // Resposta tipo widget (comportamento anterior)
    let widgetConfig = normalized.widgetConfig || normalized.config || normalized;

    // Se o widget tiver um wrapper 'card', tente desempacotar
    if (widgetConfig.card && typeof widgetConfig.card === 'object') {
      widgetConfig = widgetConfig.card;
    }

    const type = normalized.type || widgetConfig.type || (widgetConfig.xKey || (widgetConfig.config && widgetConfig.config.xKey) ? 'chart' : 'metric');

    // Se for um gráfico, GARANTIR que a estrutura do builder exista e os campos estão corretos
    if (type === 'chart' || widgetConfig.type === 'chart') {
      // Se a config estiver aninhada (comum em respostas n8n)
      const baseConfig = widgetConfig.config || widgetConfig;

      widgetConfig = {
        title: widgetConfig.title || baseConfig.title || 'Novo Gráfico',
        type: baseConfig.type || 'bar',
        builder: {
          xKey: baseConfig.xKey || baseConfig.x_key,
          yKey: baseConfig.yKey || baseConfig.y_key,
          agg: baseConfig.agg || baseConfig.aggregation || 'sum'
        }
      };
    }

    return {
      status: normalized.status === 'error' ? 'error' : 'success',
      widgetConfig,
      type: type === 'chart' ? 'chart' : 'metric',
      message: normalized.message
    };
  } catch (error) {
    console.error('🔥 [AI Assistant] Fatal error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao conectar com a IA.',
    };
  }
}

/**
 * Infere o tipo da coluna baseado nos valores de amostra
 */
function inferColumnType(values: unknown[]): string {
  if (values.length === 0) return 'unknown';

  const sample = values.slice(0, 10);

  // Verificar se é número
  const numericCount = sample.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') {
      const clean = v.replace(/[R$\s.]/g, '').replace(',', '.');
      return !isNaN(Number(clean)) && clean.trim() !== '';
    }
    return false;
  }).length;

  if (numericCount >= sample.length * 0.7) {
    // Verificar se parece currency
    const hasCurrency = sample.some(v =>
      typeof v === 'string' && (v.includes('R$') || v.includes('$'))
    );
    return hasCurrency ? 'currency' : 'number';
  }

  // Verificar se é data
  const dateCount = sample.filter(v => {
    if (typeof v !== 'string') return false;
    return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v) || /^\d{4}-\d{2}-\d{2}/.test(v);
  }).length;

  if (dateCount >= sample.length * 0.7) return 'date';

  // Verificar se é percentual
  const percentCount = sample.filter(v =>
    typeof v === 'string' && v.includes('%')
  ).length;

  if (percentCount >= sample.length * 0.5) return 'percentage';

  return 'text';
}

/**
 * Envia pedido para IA sugerir fórmula - v3 com dashboard_id
 * Usa OpenAI Assistants API diretamente quando configurada, senão fallback para webhook
 */
export async function askAiForFormula(
  userId: string,
  prompt: string,
  context: {
    columns: any[];
    fileName: string;
    dashboardId: string;
  }
): Promise<{ status: 'success' | 'error'; columnName?: string; formula?: string; message?: string }> {
  console.log('🤖 [AI Formula] Asking for calculation:', { prompt, dashboardId: context.dashboardId });

  // Usa OpenAI diretamente se configurada
  if (isOpenAIConfigured()) {
    console.log('🚀 [AI Formula] Using OpenAI Assistants API directly');
    return askOpenAIForFormula(userId, prompt, context);
  }

  console.log('📡 [AI Formula] Falling back to webhook');

  try {
    const payload = {
      user_id: userId,
      user_prompt: prompt,
      dashboard_id: context.dashboardId,
      file_name: context.fileName || 'unknown',
    };

    console.log('📤 [AI Formula] Sending payload:', payload);

    const response = await fetch(AI_FORMULA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('🔥 [AI Formula] Server error:', {
        status: response.status,
        body: errorText.substring(0, 500)
      });
      throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const normalized = normalizeWebhookResult(result);

    return {
      status: normalized.status === 'error' ? 'error' : 'success',
      columnName: normalized.columnName || normalized.name || 'Nova Coluna',
      formula: normalized.formula,
      message: normalized.message
    };
  } catch (error) {
    console.error('🔥 [AI Formula] Fatal error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao conectar com a IA.',
    };
  }
}