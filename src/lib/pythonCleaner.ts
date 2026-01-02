/**
 * Cliente para a API Python de limpeza de planilhas
 */

function getPythonApiUrl(): string {
  const env = (import.meta as any).env;
  const fromPrimary = env?.VITE_PYTHON_API_URL;
  const fromLegacy = env?.VITE_PYTHON_ENGINE_URL;
  const fromEnv = fromPrimary ?? fromLegacy;
  return typeof fromEnv === 'string' && fromEnv.trim().length > 0
    ? fromEnv.trim()
    : 'http://localhost:8000';
}

export interface PythonCleanedData {
  user_id: string;
  intent: string;
  file: {
    name: string;
    type: string;
    columns: string[];
  };
  columns: Array<{
    name: string;
    type: string;
    sample: unknown[];
  }>;
  sample_data: Record<string, unknown>[];
  row_count: number;
  timestamp: string;
  _meta?: {
    sheet: string;
    block_index: number;
    total_blocks: number;
    removed_totals: number;
    header_span: number;
  };
}

/**
 * Envia arquivo para a API Python para limpeza
 */
export async function cleanFileWithPython(
  file: File,
  userId: string = 'default',
  intent: string = 'gerar dashboard'
): Promise<PythonCleanedData | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('intent', intent);

    console.log('🧹 Enviando para API Python de limpeza...');
    console.log(`   📄 Arquivo: ${file.name} (${file.size} bytes)`);
    console.log(`   🔗 URL: ${getPythonApiUrl()}/process-for-n8n`);

    const response = await fetch(`${getPythonApiUrl()}/process-for-n8n`, {
      method: 'POST',
      body: formData,
    });

    console.log(`   📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Python:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Planilha limpa pela API Python:', data);
    console.log(`   📊 ${data.row_count} linhas × ${data.file.columns.length} colunas`);

    if (data._meta) {
      console.log(`   🗑️ Limpeza realizada:`);
      console.log(`      - Sheet: ${data._meta.sheet}`);
      console.log(`      - Blocos totais: ${data._meta.total_blocks}`);
      console.log(`      - Linhas de total removidas: ${data._meta.removed_totals}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao conectar com API Python:', error);
    console.error('   Stack:', (error as Error).stack);
    console.warn('⚠️ Continuando sem limpeza Python...');
    return null;
  }
}

/**
 * Verifica se a API Python está disponível
 */
export async function checkPythonAPI(): Promise<boolean> {
  try {
    const response = await fetch(`${getPythonApiUrl()}/health`, {
      method: 'GET',
    });
    const data = await response.json();
    console.log('✅ API Python está online:', data);
    return response.ok;
  } catch (error) {
    console.warn('⚠️ API Python não está disponível');
    return false;
  }
}
