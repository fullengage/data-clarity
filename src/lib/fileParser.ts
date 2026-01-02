import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnInfo } from '@/types/dashboard';
import { supabase } from '@/lib/supabase';
import { buildStructuralDatasetFromGrid, type MergeRange, type StructuralDataset } from '@/lib/structuralReader';

export interface ParsedFileData {
  fileName: string;
  fileType: 'excel' | 'csv' | 'google_sheets';
  columns: ColumnInfo[];
  data: Record<string, unknown>[];
  rowCount: number;
  structural?: StructuralDataset;
  rawGrid?: unknown[][];
}

function pickPrimaryBlock(structural: StructuralDataset | undefined): { columns: string[]; rows: Record<string, unknown>[] } | null {
  if (!structural || !Array.isArray(structural.blocks) || structural.blocks.length === 0) return null;
  const primaryId = structural.decisions?.primaryBlockId;
  const primary = primaryId ? structural.blocks.find((b) => b.id === primaryId) : null;
  const chosen = primary || structural.blocks[0];
  return { columns: chosen.columns, rows: chosen.rows };
}

function toMergeRanges(merges: any[] | undefined): MergeRange[] {
  if (!Array.isArray(merges)) return [];
  return merges
    .map((m) => {
      const s = m?.s;
      const e = m?.e;
      if (!s || !e) return null;
      if (typeof s.r !== 'number' || typeof s.c !== 'number' || typeof e.r !== 'number' || typeof e.c !== 'number') return null;
      return { s: { r: s.r, c: s.c }, e: { r: e.r, c: e.c } } as MergeRange;
    })
    .filter((x): x is MergeRange => !!x);
}

function parseCsvGrid(input: File | string): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(input as any, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const grid = (results.data || []) as unknown[][];
        resolve(grid);
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`));
      },
    });
  });
}

function parseCsvObjects(input: File | string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(input as any, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const jsonData = (results.data || []) as Record<string, unknown>[];
        resolve(jsonData);
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`));
      },
    });
  });
}

function detectColumnType(values: unknown[]): ColumnInfo['type'] {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return 'unknown';

  let numberCount = 0;
  let dateCount = 0;
  let currencyCount = 0;
  let percentCount = 0;

  for (const val of nonNullValues.slice(0, 100)) {
    const str = String(val).trim();

    // Check for percentage
    if (str.endsWith('%') || str.includes('percent')) {
      percentCount++;
      continue;
    }

    // Check for currency (R$, $, €, etc.)
    if (/^[R$€£¥]\s*[\d.,]+$/.test(str) || /^[\d.,]+\s*[R$€£¥]$/.test(str) || str.includes('R$')) {
      currencyCount++;
      continue;
    }

    // Check for date
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{1,2}-\d{1,2}-\d{2,4}$/,
    ];
    if (datePatterns.some(p => p.test(str))) {
      dateCount++;
      continue;
    }

    // Check for number
    const cleanNumber = str.replace(/[.,\s]/g, '');
    if (!isNaN(Number(cleanNumber)) && cleanNumber !== '') {
      numberCount++;
    }
  }

  const total = nonNullValues.length;
  const threshold = 0.6;

  if (currencyCount / total > threshold) return 'currency';
  if (percentCount / total > threshold) return 'percentage';
  if (dateCount / total > threshold) return 'date';
  if (numberCount / total > threshold) return 'number';
  return 'text';
}

function analyzeColumns(data: Record<string, unknown>[]): ColumnInfo[] {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]);
  return columns.map(colName => {
    const values = data.map(row => row[colName]);
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const sampleValues = values
      .filter(v => v !== null && v !== undefined && v !== '')
      .slice(0, 5)
      .map(v => String(v));

    return {
      name: colName,
      type: detectColumnType(values),
      sampleValues,
      nullCount,
    };
  });
}

export function analyzeColumnsFromRows(data: Record<string, unknown>[]): ColumnInfo[] {
  return analyzeColumns(data);
}

export async function parseExcelFile(file: File): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const grid = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          defval: null,
          blankrows: true,
        }) as unknown[][];

        const merges = toMergeRanges((worksheet as any)['!merges']);
        const structural = buildStructuralDatasetFromGrid({ grid, merges });
        const primary = pickPrimaryBlock(structural);

        if (primary) {
          resolve({
            fileName: file.name,
            fileType: 'excel',
            columns: analyzeColumns(primary.rows),
            data: primary.rows,
            rowCount: primary.rows.length,
            structural,
            rawGrid: grid,
          });
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        resolve({
          fileName: file.name,
          fileType: 'excel',
          columns: analyzeColumns(jsonData),
          data: jsonData,
          rowCount: jsonData.length,
          structural,
          rawGrid: grid,
        });
      } catch (error) {
        reject(new Error('Erro ao processar arquivo Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCSVFile(file: File): Promise<ParsedFileData> {
  const grid = await parseCsvGrid(file);
  const structural = buildStructuralDatasetFromGrid({ grid });
  const primary = pickPrimaryBlock(structural);

  const fallbackRows = await parseCsvObjects(file).catch(() => []);

  if (!primary) {
    return {
      fileName: file.name,
      fileType: 'csv',
      columns: analyzeColumns(fallbackRows),
      data: fallbackRows,
      rowCount: fallbackRows.length,
      structural,
      rawGrid: grid,
    };
  }

  // Se o bloco estrutural parece truncado (muito menor que o parse clássico), prefere fallback.
  if (fallbackRows.length > 0 && primary.rows.length > 0 && primary.rows.length < Math.ceil(fallbackRows.length * 0.6)) {
    return {
      fileName: file.name,
      fileType: 'csv',
      columns: analyzeColumns(fallbackRows),
      data: fallbackRows,
      rowCount: fallbackRows.length,
      structural,
      rawGrid: grid,
    };
  }

  return {
    fileName: file.name,
    fileType: 'csv',
    columns: analyzeColumns(primary.rows),
    data: primary.rows,
    rowCount: primary.rows.length,
    structural,
    rawGrid: grid,
  };
}

export function extractGoogleSheetsId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function extractGoogleSheetsGid(url: string): string | null {
  // Supports both .../edit?gid=123 and .../edit#gid=123
  const match = url.match(/[?#]gid=(\d+)/);
  return match ? match[1] : null;
}

export async function parseGoogleSheetsUrl(url: string): Promise<ParsedFileData> {
  const sheetId = extractGoogleSheetsId(url);
  if (!sheetId) {
    throw new Error('URL inválida. Verifique se o link é de uma planilha do Google Sheets.');
  }

  const gid = extractGoogleSheetsGid(url);
  const candidateUrls: string[] = [];

  // 1) "export?format=csv" (sometimes fails depending on sharing settings)
  candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
  if (gid) candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);

  // 2) gviz endpoint tends to work for "anyone with the link" sheets
  candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
  if (gid) candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);

  let lastStatus: number | null = null;
  let lastBodySnippet = '';
  let csvText: string | null = null;

  for (const u of candidateUrls) {
    const res = await fetch(u, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,*/*',
      },
    });

    lastStatus = res.status;
    const text = await res.text().catch(() => '');

    // Google sometimes returns an HTML page (login/error) with 200/400.
    const looksLikeHtml = /^\s*<!doctype html/i.test(text) || /<html\b/i.test(text);
    if (res.ok && !looksLikeHtml && text.trim().length > 0) {
      csvText = text;
      break;
    }

    lastBodySnippet = text.slice(0, 160);
  }

  // Fallback: use Supabase Edge Function proxy (avoids browser/CORS limitations)
  if (!csvText) {
    for (const u of candidateUrls) {
      const { data, error } = await supabase.functions.invoke('google-sheets-proxy', {
        body: { url: u },
      });

      if (!error && typeof data === 'string' && data.trim().length > 0) {
        csvText = data;
        break;
      }

      if (error) {
        lastBodySnippet = error.message;
      } else if (typeof data === 'object' && data && 'body_snippet' in (data as any)) {
        lastBodySnippet = String((data as any).body_snippet || '').slice(0, 160);
      }
    }
  }

  if (!csvText) {
    throw new Error(
      `Não foi possível acessar a planilha (HTTP ${lastStatus ?? '??'}). ` +
      `Verifique se está pública ("Qualquer pessoa com o link"), e tente também: Arquivo -> Compartilhar -> Publicar na Web. ` +
      (lastBodySnippet ? `Resposta: ${lastBodySnippet}` : '')
    );
  }

  // 🧹 NOVO: Tenta limpar CSV com Python antes de processar
  try {
    console.log('🔄 Tentando limpar Google Sheets com API Python...');
    const { cleanFileWithPython } = await import('@/lib/pythonCleaner');

    // Converte CSV text em File para enviar à API Python
    const csvBlob = new Blob([csvText], { type: 'text/csv' });
    const csvFile = new File([csvBlob], `google_sheets_${sheetId}.csv`, { type: 'text/csv' });

    const cleaned = await cleanFileWithPython(csvFile);

    if (cleaned && cleaned.sample_data && cleaned.sample_data.length > 0) {
      console.log('✅ Google Sheets limpo pela API Python!');
      console.log(`   📋 ${cleaned.row_count} linhas × ${cleaned.file.columns.length} colunas`);
      console.log(`   🗑️ Removidos: títulos (QUADRO RESUMO), colunas vazias, rodapés`);

      const columns = analyzeColumns(cleaned.sample_data);

      return {
        fileName: `Google Sheets - ${sheetId}`,
        fileType: 'google_sheets',
        columns,
        data: cleaned.sample_data,
        rowCount: cleaned.row_count,
        structural: {
          blocks: [{
            id: 'python_cleaned',
            headerRowIndex: 0,
            headerRowSpan: 1,
            dataStartRowIndex: 1,
            dataEndRowIndex: cleaned.row_count,
            columns: cleaned.file.columns,
            rows: cleaned.sample_data,
            rowCount: cleaned.row_count,
            confidence: 1.0,
            removedTotalsRowCount: cleaned._meta?.removed_totals || 0,
          }],
          decisions: {
            mergedCellsFixed: false,
            blocksDetected: 1,
            primaryBlockId: 'python_cleaned',
          },
          confidence: 1.0,
          warnings: ['Google Sheets processado e limpo pela API Python'],
        },
      };
    }
  } catch (error) {
    console.warn('⚠️ Limpeza Python não disponível para Google Sheets, usando método padrão:', error);
  }

  // Fallback: processamento padrão (JavaScript)
  const grid = await parseCsvGrid(csvText);
  const structural = buildStructuralDatasetFromGrid({ grid });
  const primary = pickPrimaryBlock(structural);

  const fallbackRows = await parseCsvObjects(csvText).catch(() => []);

  if (!primary) {
    return {
      fileName: `Google Sheets - ${sheetId}`,
      fileType: 'google_sheets',
      columns: analyzeColumns(fallbackRows),
      data: fallbackRows,
      rowCount: fallbackRows.length,
      structural,
    };
  }

  // Se o bloco estrutural parece truncado (muito menor que o parse clássico), prefere fallback.
  if (fallbackRows.length > 0 && primary.rows.length > 0 && primary.rows.length < Math.ceil(fallbackRows.length * 0.6)) {
    return {
      fileName: `Google Sheets - ${sheetId}`,
      fileType: 'google_sheets',
      columns: analyzeColumns(fallbackRows),
      data: fallbackRows,
      rowCount: fallbackRows.length,
      structural,
    };
  }

  return {
    fileName: `Google Sheets - ${sheetId}`,
    fileType: 'google_sheets',
    columns: analyzeColumns(primary.rows),
    data: primary.rows,
    rowCount: primary.rows.length,
    structural,
  };
}

export async function parseFile(file: File): Promise<ParsedFileData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  // 🧹 NOVO: Tenta limpar com Python primeiro
  try {
    const { cleanFileWithPython } = await import('@/lib/pythonCleaner');
    const cleaned = await cleanFileWithPython(file);

    if (cleaned && cleaned.sample_data && cleaned.sample_data.length > 0) {
      console.log('✅ Usando dados limpos da API Python!');
      console.log(`   📋 ${cleaned.row_count} linhas × ${cleaned.file.columns.length} colunas`);
      console.log(`   🗑️ Removidos: títulos, colunas vazias, rodapés`);

      // Converte dados limpos do Python para o formato esperado
      const columns = analyzeColumns(cleaned.sample_data);

      return {
        fileName: file.name,
        fileType: extension === 'csv' ? 'csv' : 'excel',
        columns,
        data: cleaned.sample_data,
        rowCount: cleaned.row_count,
        structural: {
          blocks: [{
            id: 'python_cleaned',
            headerRowIndex: 0,
            headerRowSpan: 1,
            dataStartRowIndex: 1,
            dataEndRowIndex: cleaned.row_count,
            columns: cleaned.file.columns,
            rows: cleaned.sample_data,
            rowCount: cleaned.row_count,
            confidence: 1.0,
            removedTotalsRowCount: cleaned._meta?.removed_totals || 0,
          }],
          decisions: {
            mergedCellsFixed: false,
            blocksDetected: 1,
            primaryBlockId: 'python_cleaned',
          },
          confidence: 1.0,
          warnings: ['Processado e limpo pela API Python'],
        },
      };
    }
  } catch (error) {
    console.warn('⚠️ Limpeza Python não disponível, usando método padrão:', error);
  }

  // Fallback: processo padrão (JavaScript)
  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else {
    throw new Error('Formato de arquivo não suportado. Use Excel (.xlsx, .xls) ou CSV (.csv)');
  }
}

