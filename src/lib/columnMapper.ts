import { DashboardTemplate, TemplateColumn } from '@/types/template';

export interface ColumnMappingSuggestion {
    originalColumn: string;
    suggestedMapping: string | null; // Nome semântico do template
    confidence: number; // 0-1
    isRequired: boolean;
    templateColumn?: TemplateColumn;
}

/**
 * Mapeia colunas da planilha para campos semânticos do template
 * usando similaridade de texto e aliases
 */
export function suggestColumnMapping(
    actualColumns: string[],
    template: DashboardTemplate
): ColumnMappingSuggestion[] {
    return actualColumns.map(actualCol => {
        const normalized = actualCol.toLowerCase().trim();

        // Tentar encontrar melhor match
        let bestMatch: { column: TemplateColumn; score: number } | null = null;

        for (const templateCol of template.expectedColumns) {
            // Verificar se é exato no semantic name
            if (templateCol.semanticName.toLowerCase() === normalized) {
                bestMatch = { column: templateCol, score: 1.0 };
                break;
            }

            // Verificar aliases
            for (const alias of templateCol.aliases) {
                const aliasNormalized = alias.toLowerCase().trim();

                // Match exato - ALTA CONFIANÇA
                if (aliasNormalized === normalized) {
                    bestMatch = { column: templateCol, score: 0.98 };
                    break;
                }

                // Remover espaços e caracteres especiais para comparação
                const cleanNormalized = normalized.replace(/[^a-z0-9]/g, '');
                const cleanAlias = aliasNormalized.replace(/[^a-z0-9]/g, '');

                if (cleanNormalized === cleanAlias) {
                    bestMatch = { column: templateCol, score: 0.95 };
                    break;
                }

                // Similaridade forte - contém um ao outro
                if (cleanNormalized.includes(cleanAlias) || cleanAlias.includes(cleanNormalized)) {
                    const score = Math.max(
                        cleanNormalized.length / cleanAlias.length,
                        cleanAlias.length / cleanNormalized.length
                    ) * 0.85;

                    if (!bestMatch || score > bestMatch.score) {
                        bestMatch = { column: templateCol, score };
                    }
                }
            }

            if (bestMatch && bestMatch.score >= 0.95) break;
        }

        return {
            originalColumn: actualCol,
            suggestedMapping: bestMatch ? bestMatch.column.semanticName : null,
            confidence: bestMatch ? bestMatch.score : 0,
            isRequired: bestMatch ? bestMatch.column.required : false,
            templateColumn: bestMatch?.column,
        };
    });
}

/**
 * Valida se todas as colunas obrigatórias estão mapeadas
 */
export function validateMapping(
    mappings: ColumnMappingSuggestion[],
    template: DashboardTemplate
): { isValid: boolean; missingRequired: string[] } {
    const mappedSemanticNames = mappings
        .filter(m => m.suggestedMapping)
        .map(m => m.suggestedMapping);

    const requiredColumns = template.expectedColumns
        .filter(col => col.required)
        .map(col => col.semanticName);

    const missingRequired = requiredColumns.filter(
        req => !mappedSemanticNames.includes(req)
    );

    return {
        isValid: missingRequired.length === 0,
        missingRequired,
    };
}

/**
 * Cria um mapeamento personalizado (quando usuário ajusta manualmente)
 */
export function createCustomMapping(
    originalColumn: string,
    semanticName: string,
    template: DashboardTemplate
): ColumnMappingSuggestion {
    const templateColumn = template.expectedColumns.find(
        col => col.semanticName === semanticName
    );

    return {
        originalColumn,
        suggestedMapping: semanticName,
        confidence: 1.0, // Usuário confirmou
        isRequired: templateColumn?.required || false,
        templateColumn,
    };
}
