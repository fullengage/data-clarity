/**
 * Utilitários de Parsing e Formatação para o ViewDashboard
 * 
 * Funções puras para detecção de tipos, conversão e formatação de dados.
 */

// ============================================================================
// Detecção de Tipos
// ============================================================================

/**
 * Verifica se um valor pode ser interpretado como número
 */
export const isProbablyNumber = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  
  const trimmed = value.trim();
  if (!trimmed) return false;
  
  // Remove formatação brasileira de moeda
  const normalized = trimmed
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = Number(normalized);
  return Number.isFinite(num);
};

/**
 * Verifica se um valor pode ser interpretado como data
 */
export const isProbablyDate = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;
  
  const s = value.trim();
  if (!s) return false;
  
  // ISO format: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  
  // BR format: 15/01/2024 ou 15/01/24
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return true;
  
  return false;
};

// ============================================================================
// Conversão de Tipos
// ============================================================================

/**
 * Converte um valor para número, tratando formatação brasileira
 */
export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const clean = value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  }
  
  return 0;
};

/**
 * Converte um valor para Date
 */
export const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;
  
  const s = value.trim();
  if (!s) return null;

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // BR format: dd/mm/yyyy ou dd/mm/yy
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const dd = Number(match[1]);
    const mm = Number(match[2]);
    const yy = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  return null;
};

// ============================================================================
// Formatação
// ============================================================================

/**
 * Formata uma data no padrão brasileiro
 */
export const formatDateBR = (d: Date): string => {
  try {
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

/**
 * Formata um número como moeda brasileira
 */
export const formatCurrencyBR = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata um número com separadores brasileiros
 */
export const formatNumberBR = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formata um número como percentual
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${formatNumberBR(value, decimals)}%`;
};

// ============================================================================
// Análise de Colunas
// ============================================================================

/**
 * Identifica colunas numéricas em um dataset
 */
export const findNumericColumns = (
  columns: string[],
  rows: Record<string, unknown>[],
  sampleSize = 30
): string[] => {
  return columns.filter((col) => {
    const sample = rows.slice(0, sampleSize).map((r) => r?.[col]);
    return sample.some((v) => isProbablyNumber(v));
  });
};

/**
 * Identifica colunas de data em um dataset
 */
export const findDateColumns = (
  columns: string[],
  rows: Record<string, unknown>[],
  sampleSize = 50,
  threshold = 0.6
): string[] => {
  return columns.filter((col) => {
    const sample = rows.slice(0, sampleSize).map((r) => r?.[col]);
    const dateHits = sample.filter((v) => isProbablyDate(v)).length;
    const minHits = Math.max(3, Math.ceil(sample.length * threshold));
    return dateHits >= minHits;
  });
};

/**
 * Verifica se a estrutura de colunas está corrompida
 * (contém dados ao invés de nomes de colunas)
 */
export const isColumnStructureCorrupted = (columns: string[]): boolean => {
  return columns.some(col =>
    col.length > 50 || 
    /^\d+$/.test(col) || 
    col.includes('LTDA') || 
    col.includes('S/A')
  );
};

/**
 * Cria um mapa de correção para colunas corrompidas
 */
export const createColumnCorrectionMap = (
  corruptedColumns: string[],
  realColumns: string[]
): Map<string, string> => {
  const map = new Map<string, string>();
  
  corruptedColumns.forEach((corruptedName, index) => {
    if (index < realColumns.length) {
      map.set(corruptedName, realColumns[index]);
    }
  });
  
  return map;
};

// ============================================================================
// Cálculo de Completude
// ============================================================================

/**
 * Calcula a taxa de preenchimento de um dataset
 */
export const calculateFilledRate = (
  rows: Record<string, unknown>[],
  columns: string[]
): number => {
  let emptyCells = 0;
  let totalCells = 0;

  rows.forEach((row) => {
    columns.forEach((col) => {
      totalCells += 1;
      const value = row?.[col];
      if (value === null || value === undefined || String(value).trim() === '') {
        emptyCells += 1;
      }
    });
  });

  return totalCells > 0 ? (totalCells - emptyCells) / totalCells : 0;
};
