export interface PythonEngineDatasetSummary {
  id: string;
  block_index: number;
  rows: number;
  columns: string[];
}

export interface PythonEngineSheetSummary {
  name: string;
  datasets: PythonEngineDatasetSummary[];
}

export interface PythonEngineParseSheetResponse {
  status: 'ok';
  sheets: PythonEngineSheetSummary[];
}

export interface PythonEngineExtractBlockResponse {
  status: 'ok';
  sheet: string;
  dataset: {
    id: string;
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
}

function getPythonEngineBaseUrl(): string {
  const fromEnv = (import.meta as any).env?.VITE_PYTHON_ENGINE_URL;
  return typeof fromEnv === 'string' && fromEnv.trim().length > 0 ? fromEnv.trim() : 'http://localhost:8000';
}

export async function parseSheetWithPython(file: File): Promise<PythonEngineParseSheetResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${getPythonEngineBaseUrl()}/parse-sheet`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Python Engine indisponível (HTTP ${res.status}). ${text}`.trim());
  }

  const json = (await res.json()) as PythonEngineParseSheetResponse;
  if (!json || json.status !== 'ok') {
    throw new Error('Resposta inválida do Python Engine em /parse-sheet');
  }

  return json;
}

export async function extractBlockWithPython(params: {
  file: File;
  sheet: string;
  blockIndex: number;
}): Promise<PythonEngineExtractBlockResponse> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('sheet', params.sheet);
  form.append('block_index', String(params.blockIndex));

  const res = await fetch(`${getPythonEngineBaseUrl()}/extract-block`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao extrair dataset (HTTP ${res.status}). ${text}`.trim());
  }

  const json = (await res.json()) as PythonEngineExtractBlockResponse;
  if (!json || json.status !== 'ok' || !json.dataset || !Array.isArray(json.dataset.rows)) {
    throw new Error('Resposta inválida do Python Engine em /extract-block');
  }

  return json;
}
