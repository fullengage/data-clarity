/**
 * Utilitários para limpeza e formatação de dados
 * 
 * Garante que valores numéricos sejam arredondados corretamente
 * antes de serem salvos no banco de dados ou exibidos na UI.
 */

/**
 * Arredonda número para N casas decimais
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Converte valor para número e arredonda
 */
export function parseAndRound(value: unknown, decimals: number = 2): number {
    if (typeof value === 'number') {
        return roundToDecimals(value, decimals);
    }
    
    if (value == null) return 0;
    if (typeof value !== 'string') return 0;

    // Remove R$, espaços, % e converte formato brasileiro
    const cleaned = value
        .replace(/R\$|\s|%/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? roundToDecimals(parsed, decimals) : 0;
}

/**
 * Limpa objeto de dados, arredondando valores numéricos
 */
export function cleanDataRow(row: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number') {
            // Arredondar números para 2 casas decimais
            cleaned[key] = roundToDecimals(value, 2);
        } else if (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.,-]/g, '')))) {
            // Tentar converter strings numéricas
            const parsed = parseAndRound(value, 2);
            cleaned[key] = parsed !== 0 ? parsed : value;
        } else {
            cleaned[key] = value;
        }
    }
    
    return cleaned;
}

/**
 * Limpa array de dados
 */
export function cleanDataArray(data: Record<string, unknown>[]): Record<string, unknown>[] {
    return data.map(row => cleanDataRow(row));
}

/**
 * Formata valor numérico para exibição
 */
export function formatNumber(value: number, decimals: number = 2): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Formata valor como moeda brasileira
 */
export function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Formata valor como percentual
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}
