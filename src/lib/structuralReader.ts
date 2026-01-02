export type CellValue = string | number | boolean | Date | null;

export interface MergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface StructuralBlock {
  id: string;
  headerRowIndex: number;
  headerRowSpan: number;
  dataStartRowIndex: number;
  dataEndRowIndex: number;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  confidence: number;
  removedTotalsRowCount: number;
}

export interface StructuralDecisions {
  mergedCellsFixed: boolean;
  blocksDetected: number;
  primaryBlockId: string | null;
}

export interface StructuralDataset {
  blocks: StructuralBlock[];
  decisions: StructuralDecisions;
  confidence: number;
  warnings: string[];
}

function normalizeCell(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'nan') return null;
    if (trimmed === '#DIV/0!') return 0;
    return trimmed;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isNumericLike(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return false;
    const normalized = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return normalized !== '' && !Number.isNaN(Number(normalized));
  }
  return false;
}

function isTextLike(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

function nonEmptyCount(row: unknown[]): number {
  let count = 0;
  for (const v of row) {
    if (normalizeCell(v) !== null) count += 1;
  }
  return count;
}

function isRowEmpty(row: unknown[]): boolean {
  return nonEmptyCount(row) === 0;
}

function headerScore(row: unknown[]): number {
  const nonEmpty = nonEmptyCount(row);
  if (nonEmpty < 2) return 0;

  let text = 0;
  let numeric = 0;
  let looksLikeDataValue = 0;
  const set = new Set<string>();

  // NOVO: Verifica primeira célula
  const firstCell = normalizeCell(row.find(v => normalizeCell(v) !== null));

  // Se primeira célula é um número pequeno (1-100), provavelmente é um ID/índice, não cabeçalho
  if (firstCell !== null && typeof firstCell === 'number' && firstCell >= 1 && firstCell <= 100) {
    return 0; // Definitivamente não é cabeçalho
  }

  // Se primeira célula é string que parece ID ("1", "2", "ID", "Nº")
  if (firstCell !== null && typeof firstCell === 'string') {
    const firstStr = String(firstCell).trim();
    if (/^\d+$/.test(firstStr) && Number(firstStr) >= 1 && Number(firstStr) <= 100) {
      return 0; // É um ID numérico, não cabeçalho
    }
  }

  for (const v of row) {
    const n = normalizeCell(v);
    if (n === null) continue;
    const s = String(n).trim();
    set.add(s.toLowerCase());

    if (isNumericLike(n)) {
      numeric += 1;
      // Penalizar números grandes ou formatados (preço, quantidade) que raramente são headers
      if (typeof n === 'number' && n > 500) looksLikeDataValue += 1;
      if (s.includes('R$') || s.includes('$') || s.includes('%')) looksLikeDataValue += 1;
    } else {
      text += 1;
      // Se a string é muito longa, provavelmente é um texto longo de dados, não um header
      if (s.length > 50) looksLikeDataValue += 1;
    }
  }

  const uniqueRate = set.size / nonEmpty;
  const textRate = text / nonEmpty;
  const numericRate = numeric / nonEmpty;
  const dataValuePenalty = looksLikeDataValue / nonEmpty;

  // Header ideal: tudo texto, tudo único, nada com cara de valor (moeda, %, número alto)
  // Penalizamos fortemente se tiver cara de dado
  return Math.max(0, (textRate * 1.5 + uniqueRate * 0.5 - numericRate * 1.0 - dataValuePenalty * 2.0));
}

function looksLikeTotalRow(row: unknown[]): boolean {
  const parts: string[] = [];
  for (const v of row) {
    const n = normalizeCell(v);
    if (n === null) continue;
    parts.push(String(n));
  }
  if (parts.length === 0) return false;
  const head = parts.join(' ').toLowerCase();
  if (/\b(total|subtotal|totais|total geral|geral|soma|sum|grand total)\b/i.test(head)) {
    return true;
  }

  const nonEmpty = parts.length;
  const numeric = parts.filter((p) => isNumericLike(p)).length;
  const text = parts.filter((p) => !isNumericLike(p)).length;

  return nonEmpty >= 3 && numeric / nonEmpty >= 0.7 && text <= 1;
}

function mergeFillGrid(input: unknown[][], merges: MergeRange[] | undefined): { grid: unknown[][]; changed: boolean } {
  if (!merges || merges.length === 0) return { grid: input, changed: false };

  const grid = input.map((r) => [...r]);
  let changed = false;

  for (const m of merges) {
    const r0 = m.s.r;
    const c0 = m.s.c;
    const r1 = m.e.r;
    const c1 = m.e.c;

    const topLeft = grid[r0]?.[c0];
    const topLeftNorm = normalizeCell(topLeft);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r === r0 && c === c0) continue;
        const cur = grid[r]?.[c];
        if (normalizeCell(cur) === null && topLeftNorm !== null) {
          if (!grid[r]) grid[r] = [];
          grid[r][c] = topLeftNorm;
          changed = true;
        }
      }
    }
  }

  return { grid, changed };
}

function buildHeader(grid: unknown[][], headerRowIndex: number, span: number): string[] {
  const row0 = grid[headerRowIndex] || [];
  const row1 = span >= 2 ? grid[headerRowIndex + 1] || [] : [];

  const maxCols = Math.max(row0.length, row1.length);
  const headers: string[] = [];

  for (let c = 0; c < maxCols; c++) {
    const a = normalizeCell(row0[c]);
    const b = span >= 2 ? normalizeCell(row1[c]) : null;

    const parts = [a, b]
      .filter((x) => x !== null)
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);

    const name = Array.from(new Set(parts)).join(' ');
    headers.push(name);
  }

  const seen = new Map<string, number>();
  return headers.map((h, idx) => {
    const base = h && h.trim().length > 0 ? h.trim() : `col_${idx + 1}`;
    const key = base.toLowerCase();
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}

function toObjectRows(params: { grid: unknown[][]; headerRowIndex: number; headerRowSpan: number; startRow: number; endRow: number; columns: string[] }): { rows: Record<string, unknown>[]; removedTotals: number } {
  const { grid, startRow, endRow, columns } = params;
  const rows: Record<string, unknown>[] = [];
  let removedTotals = 0;

  for (let r = startRow; r <= endRow; r++) {
    const row = grid[r] || [];
    if (isRowEmpty(row)) continue;
    if (looksLikeTotalRow(row)) {
      removedTotals += 1;
      continue;
    }

    const obj: Record<string, unknown> = {};
    let nonEmpty = 0;

    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const val = normalizeCell(row[c]);
      if (val !== null) nonEmpty += 1;
      obj[col] = val;
    }

    if (nonEmpty > 0) rows.push(obj);
  }

  return { rows, removedTotals };
}

function findNextHeader(grid: unknown[][], startRow: number): { rowIndex: number; span: number } | null {
  const scanLimit = Math.min(grid.length, startRow + 60);

  let best: { rowIndex: number; score: number; span: number } | null = null;

  for (let r = startRow; r < scanLimit; r++) {
    const row = grid[r] || [];
    if (isRowEmpty(row)) continue;

    const s0 = headerScore(row);
    if (s0 <= 0.5) continue;

    let span = 1;
    const s1 = headerScore(grid[r + 1] || []);

    if (s1 > 0.5) {
      span = 2;
    }

    const score = s0 + (span === 2 ? s1 * 0.3 : 0);
    if (!best || score > best.score) {
      best = { rowIndex: r, score, span };
    }
  }

  if (!best) return null;
  return { rowIndex: best.rowIndex, span: best.span };
}

function computeBlockConfidence(params: { headerRow: unknown[]; rows: Record<string, unknown>[]; removedTotals: number }): number {
  const header = params.headerRow;
  const s = headerScore(header);
  const base = Math.max(0, Math.min(1, s));
  const rowFactor = Math.min(1, params.rows.length / 50);
  const penalty = Math.min(0.3, params.removedTotals * 0.05);
  return Math.max(0, Math.min(1, base * 0.7 + rowFactor * 0.3 - penalty));
}

export function buildStructuralDatasetFromGrid(params: { grid: unknown[][]; merges?: MergeRange[] }): StructuralDataset {
  const merged = mergeFillGrid(params.grid, params.merges);
  const grid = merged.grid;

  const blocks: StructuralBlock[] = [];
  const warnings: string[] = [];

  let cursor = 0;

  while (cursor < grid.length) {
    while (cursor < grid.length && isRowEmpty(grid[cursor] || [])) cursor += 1;
    if (cursor >= grid.length) break;

    const header = findNextHeader(grid, cursor);
    if (!header) break;

    const headerRowIndex = header.rowIndex;
    const headerRowSpan = header.span;

    const columns = buildHeader(grid, headerRowIndex, headerRowSpan);

    let dataStart = headerRowIndex + headerRowSpan;
    while (dataStart < grid.length && isRowEmpty(grid[dataStart] || [])) dataStart += 1;

    let dataEnd = dataStart - 1;
    let r = dataStart;
    let blankSkips = 0;

    while (r < grid.length) {
      const row = grid[r] || [];

      if (isRowEmpty(row)) {
        let k = r;
        while (k < grid.length && isRowEmpty(grid[k] || [])) k += 1;
        const next = k < grid.length ? (grid[k] || []) : null;
        const nextLooksHeader = next ? headerScore(next) > 0.8 : false;
        const blankSpan = k - r;

        // Em CSV/Sheets é comum ter 1 linha em branco no meio da tabela.
        // Se a próxima linha não parecer um novo cabeçalho, seguimos o mesmo bloco.
        if (!nextLooksHeader && blankSpan <= 2 && blankSkips < 2) {
          blankSkips += 1;
          r = k;
          continue;
        }

        dataEnd = r - 1;
        r = k;
        break;
      }

      const potentialHeader = headerScore(row);
      if (potentialHeader > 0.8 && r > dataStart + 2) {
        dataEnd = r - 1;
        break;
      }

      dataEnd = r;
      r += 1;
    }

    if (dataEnd >= dataStart) {
      const { rows, removedTotals } = toObjectRows({
        grid,
        headerRowIndex,
        headerRowSpan,
        startRow: dataStart,
        endRow: dataEnd,
        columns,
      });

      if (rows.length === 0) {
        warnings.push(`Bloco em ${headerRowIndex + 1} não possui linhas de dados válidas.`);
      }

      const conf = computeBlockConfidence({ headerRow: grid[headerRowIndex] || [], rows, removedTotals });

      blocks.push({
        id: crypto.randomUUID(),
        headerRowIndex,
        headerRowSpan,
        dataStartRowIndex: dataStart,
        dataEndRowIndex: dataEnd,
        columns,
        rows,
        rowCount: rows.length,
        confidence: conf,
        removedTotalsRowCount: removedTotals,
      });
    }

    cursor = Math.max(r, dataEnd + 1);
  }

  if (blocks.length === 0) {
    let firstNonEmpty = -1;
    for (let r = 0; r < grid.length; r++) {
      if (!isRowEmpty(grid[r] || [])) {
        firstNonEmpty = r;
        break;
      }
    }

    if (firstNonEmpty >= 0) {
      const columns = buildHeader(grid, firstNonEmpty, 1);
      const { rows, removedTotals } = toObjectRows({
        grid,
        headerRowIndex: firstNonEmpty,
        headerRowSpan: 1,
        startRow: firstNonEmpty + 1,
        endRow: grid.length - 1,
        columns,
      });

      const block: StructuralBlock = {
        id: crypto.randomUUID(),
        headerRowIndex: firstNonEmpty,
        headerRowSpan: 1,
        dataStartRowIndex: firstNonEmpty + 1,
        dataEndRowIndex: grid.length - 1,
        columns,
        rows,
        rowCount: rows.length,
        confidence: rows.length > 0 ? 0.35 : 0.15,
        removedTotalsRowCount: removedTotals,
      };

      const nextWarnings = warnings.length ? warnings : [];
      nextWarnings.push('Estrutura não detectada com alta confiança. Aplicado fallback usando a primeira linha não vazia como cabeçalho.');

      return {
        blocks: [block],
        decisions: {
          mergedCellsFixed: merged.changed,
          blocksDetected: 1,
          primaryBlockId: block.id,
        },
        confidence: block.confidence,
        warnings: nextWarnings,
      };
    }

    return {
      blocks: [],
      decisions: {
        mergedCellsFixed: merged.changed,
        blocksDetected: 0,
        primaryBlockId: null,
      },
      confidence: 0,
      warnings: warnings.length ? warnings : ['Nenhum bloco de dados foi detectado.'],
    };
  }

  const primary = blocks
    .map((b) => ({ b, score: b.rowCount * (0.5 + b.confidence) }))
    .sort((a, b) => b.score - a.score)[0]?.b;

  const overallConfidence = Math.max(0, Math.min(1, primary.confidence));

  return {
    blocks,
    decisions: {
      mergedCellsFixed: merged.changed,
      blocksDetected: blocks.length,
      primaryBlockId: primary?.id || null,
    },
    confidence: overallConfidence,
    warnings,
  };
}
