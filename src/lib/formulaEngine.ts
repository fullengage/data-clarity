export interface FormulaResult {
    data: Record<string, unknown>[];
    addedColumns: string[];
}

/**
 * Avalia uma fórmula matemática simples sobre uma linha de dados.
 * Exemplo: "([Quantidade] * [Preço])"
 */
export function evaluateFormula(formula: string, row: Record<string, unknown>): number {
    try {
        let expression = formula;

        // Encontrar todos os tokens entre colchetes [Nome da Coluna]
        const tokens = formula.match(/\[(.*?)\]/g);

        if (tokens) {
            tokens.forEach(token => {
                const colName = token.slice(1, -1);
                const rawVal = row[colName];

                let val = 0;
                if (typeof rawVal === 'number') val = rawVal;
                else if (typeof rawVal === 'string') {
                    const clean = rawVal.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                    val = parseFloat(clean) || 0;
                }

                // Substitui o token pelo valor numérico na expressão
                // Usamos placeholder para evitar problemas de recursão se um nome de coluna contiver outro
                expression = expression.replace(token, String(val));
            });
        }

        // Limpeza básica de segurança para eval (apenas números e operadores permitidos)
        // Isso é um eval "controlado", mas ainda requer cuidado. 
        // Em um ambiente real, um parser de expressão seria melhor.
        const safeExpression = expression.replace(/[^-()\d/*+.\s]/g, '');

        // eslint-disable-next-line no-eval
        const result = eval(safeExpression);
        return Number.isFinite(result) ? result : 0;
    } catch (e) {
        console.error('Error evaluating formula:', formula, e);
        return 0;
    }
}

/**
 * Aplica fórmulas automáticas baseadas no mapeamento semântico.
 * 
 * Regras:
 * 1. Se tem 'quantidade' e 'custo_unitario' e não tem 'despesa' -> Cria 'despesa'
 * 2. Se tem 'quantidade' e 'receita_unitaria' e não tem 'receita' -> Cria 'receita'
 * 3. Se tem 'receita' e 'despesa' e não tem 'resultado' -> Cria 'resultado'
 */
export function applyFinancialFormulas(
    data: Record<string, unknown>[],
    mappings: Record<string, string> // originalColumn -> semanticName
): FormulaResult {
    if (!data || data.length === 0) return { data, addedColumns: [] };

    // Inverter mapeamento para facilitar busca (semanticName -> originalColumn)
    const semanticToOriginal: Record<string, string> = {};
    Object.entries(mappings).forEach(([orig, sem]) => {
        semanticToOriginal[sem] = orig;
    });

    const hasMapping = (sem: string) => !!semanticToOriginal[sem];
    const getVal = (row: Record<string, unknown>, sem: string) => {
        const origName = semanticToOriginal[sem];
        if (!origName) return 0;
        const val = row[origName];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const clean = val.replace(/[R$\s]/g, '').replace(',', '.');
            return parseFloat(clean) || 0;
        }
        return 0;
    };

    const newData = [...data];
    const addedColumns: string[] = [];

    // Verificadores de existência no mapeamento
    const canCalcExpense = hasMapping('quantidade') && hasMapping('custo_unitario') && !hasMapping('despesa');
    const canCalcRevenue = hasMapping('quantidade') && hasMapping('receita_unitaria') && !hasMapping('receita');

    if (canCalcExpense) addedColumns.push('despesa');
    if (canCalcRevenue) addedColumns.push('receita');

    newData.forEach((row, i) => {
        const rowCopy = { ...row };
        let rowRevenue = hasMapping('receita') ? getVal(row, 'receita') : 0;
        let rowExpense = hasMapping('despesa') ? getVal(row, 'despesa') : 0;

        if (canCalcExpense) {
            rowExpense = getVal(row, 'quantidade') * getVal(row, 'custo_unitario');
            rowCopy['Custo Total (Calc)'] = rowExpense;
        }

        if (canCalcRevenue) {
            rowRevenue = getVal(row, 'quantidade') * getVal(row, 'receita_unitaria');
            rowCopy['Receita Total (Calc)'] = rowRevenue;
        }

        // Se agora temos ambos (seja original ou calculado), podemos calcular resultado
        if ((hasMapping('receita') || canCalcRevenue) && (hasMapping('despesa') || canCalcExpense) && !hasMapping('resultado')) {
            rowCopy['Resultado (Calc)'] = rowRevenue - rowExpense;
            if (i === 0) addedColumns.push('resultado');
        }

        newData[i] = rowCopy;
    });

    return { data: newData, addedColumns };
}
