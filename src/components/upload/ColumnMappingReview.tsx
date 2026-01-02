import { useState, useMemo } from 'react';
import { DashboardTemplate } from '@/types/template';
import { ColumnMappingSuggestion } from '@/lib/columnMapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, ArrowRight, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnMappingReviewProps {
    template: DashboardTemplate;
    mappings: ColumnMappingSuggestion[];
    onConfirm: (finalMappings: ColumnMappingSuggestion[]) => void;
    onBack: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    tempo: { label: '📅 TEMPO', icon: '📅' },
    valores: { label: '💰 VALORES', icon: '💰' },
    quantidade: { label: '📦 QUANTIDADE', icon: '📦' },
    organizacao: { label: '🏷️ ORGANIZAÇÃO', icon: '🏷️' },
    descritivo: { label: '📝 DESCRITIVO', icon: '📝' },
};

export default function ColumnMappingReview({
    template,
    mappings: initialMappings,
    onConfirm,
    onBack,
}: ColumnMappingReviewProps) {
    const [mappings, setMappings] = useState(initialMappings);

    // Agrupar colunas do template por categoria
    const groupedTemplateColumns = useMemo(() => {
        const groups: Record<string, typeof template.expectedColumns> = {};
        template.expectedColumns.forEach(col => {
            const cat = col.category || 'organizacao';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(col);
        });
        return groups;
    }, [template]);

    // Calcular validações
    const mappedSemanticNames = useMemo(() =>
        mappings.filter(m => m.suggestedMapping).map(m => m.suggestedMapping as string),
        [mappings]);

    const validations = useMemo(() => {
        const alerts: { type: 'error' | 'warning' | 'info'; message: string; sub: string }[] = [];

        // 1. Sem Data -> Erro Crítico
        if (!mappedSemanticNames.includes('data')) {
            alerts.push({
                type: 'error',
                message: 'Falta a coluna de Data',
                sub: 'Obrigatória para gerar gráficos de evolução temporal.'
            });
        }

        // 2. Receita sem Cliente -> Alerta Leve
        if (mappedSemanticNames.includes('receita') && !mappedSemanticNames.includes('cliente')) {
            alerts.push({
                type: 'warning',
                message: 'Receita sem Cliente',
                sub: 'Mapear o Cliente ajuda a identificar quem mais contribui para o faturamento.'
            });
        }

        // 3. Custo sem Fornecedor -> Alerta Leve
        if (mappedSemanticNames.includes('despesa') && !mappedSemanticNames.includes('fornecedor')) {
            alerts.push({
                type: 'warning',
                message: 'Custo sem Fornecedor',
                sub: 'Identificar Fornecedores é essencial para análise de gastos.'
            });
        }

        // 4. Tudo como "Valor" -> Alerta de baixa qualidade
        const allAreValor = mappedSemanticNames.length > 0 &&
            mappedSemanticNames.every(name => name === 'valor');
        if (allAreValor) {
            alerts.push({
                type: 'info',
                message: 'Classificação Genérica',
                sub: 'Você classificou tudo como "Valor". O dashboard será mais limitado.'
            });
        }

        return alerts;
    }, [mappedSemanticNames]);

    const isValid = !validations.some(a => a.type === 'error');

    // Atualizar mapeamento de uma coluna
    const updateMapping = (originalColumn: string, newSemanticName: string | null) => {
        setMappings(prev =>
            prev.map(m => {
                if (m.originalColumn === originalColumn) {
                    const templateColumn = template.expectedColumns.find(
                        col => col.semanticName === newSemanticName
                    );
                    return {
                        ...m,
                        suggestedMapping: newSemanticName,
                        confidence: newSemanticName ? 1.0 : 0,
                        templateColumn,
                        isRequired: templateColumn?.required || false,
                    };
                }
                return m;
            })
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">Essa coluna representa o quê?</h2>
                <p className="text-sm text-muted-foreground">
                    O sistema usará sua resposta para decidir cálculos e visualizações.
                </p>
            </div>

            {/* Alertas de Validação */}
            {validations.length > 0 && (
                <div className="space-y-2">
                    {validations.map((alert, i) => (
                        <div key={i} className={cn(
                            "p-3 rounded-lg border flex items-start gap-3",
                            alert.type === 'error' ? "bg-red-50 border-red-200 text-red-900" :
                                alert.type === 'warning' ? "bg-amber-50 border-amber-200 text-amber-900" :
                                    "bg-blue-50 border-blue-200 text-blue-900"
                        )}>
                            {alert.type === 'error' ? <XCircle className="w-5 h-5 mt-0.5" /> :
                                alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 mt-0.5" /> :
                                    <Info className="w-5 h-5 mt-0.5" />}
                            <div>
                                <p className="text-sm font-bold">{alert.message}</p>
                                <p className="text-xs opacity-80">{alert.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lista de mapeamentos */}
            <div className="space-y-3">
                {mappings.map((mapping, index) => (
                    <Card key={index} className="border shadow-sm hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                {/* Coluna original */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                        {mapping.originalColumn}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                        Detectado: {(mapping.templateColumn?.type || 'texto').replace('currency', 'moeda').replace('date', 'data').replace('number', 'número')}
                                    </p>
                                </div>

                                <ArrowRight className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />

                                {/* Select de mapeamento */}
                                <div className="flex-[1.5] min-w-[240px]">
                                    <Select
                                        value={mapping.suggestedMapping || 'none'}
                                        onValueChange={(value) =>
                                            updateMapping(mapping.originalColumn, value === 'none' ? null : value)
                                        }
                                    >
                                        <SelectTrigger className={cn(
                                            "w-full bg-background font-medium",
                                            mapping.isRequired && !mapping.suggestedMapping && "border-red-500 ring-red-500"
                                        )}>
                                            <SelectValue placeholder="Ignorar esta coluna" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[350px]">
                                            <SelectItem value="none">
                                                <span className="text-muted-foreground italic">Ignorar esta coluna</span>
                                            </SelectItem>

                                            {Object.entries(CATEGORY_LABELS).map(([catId, info]) => {
                                                const cols = groupedTemplateColumns[catId];
                                                if (!cols || cols.length === 0) return null;

                                                return (
                                                    <SelectGroup key={catId}>
                                                        <SelectLabel className="text-[10px] font-black text-primary/50 uppercase tracking-widest px-2 py-1.5 mt-2 bg-muted/30 rounded">
                                                            {info.label}
                                                        </SelectLabel>
                                                        {cols.map((col) => (
                                                            <SelectItem key={col.semanticName} value={col.semanticName}>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{col.displayName}</span>
                                                                    {col.required && <span className="text-[10px] text-red-500">*</span>}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>

                                    {/* Uso Sugerido */}
                                    {mapping.suggestedMapping && (
                                        <div className="mt-1.5 flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground">Usada para:</span>
                                            <span className="text-[10px] font-medium text-primary">
                                                {mapping.suggestedMapping === 'data' && 'Gráficos de evolução'}
                                                {['receita', 'despesa', 'valor'].includes(mapping.suggestedMapping) && 'Cálculos de KPI'}
                                                {['cliente', 'fornecedor', 'projeto', 'centro_custo', 'categoria'].includes(mapping.suggestedMapping) && 'Filtros e agrupamentos'}
                                                {['descricao', 'observacao'].includes(mapping.suggestedMapping) && 'Tabelas detalhadas'}
                                                {!['data', 'receita', 'despesa', 'valor', 'cliente', 'fornecedor', 'projeto', 'centro_custo', 'categoria', 'descricao', 'observacao'].includes(mapping.suggestedMapping) && 'Análise dimensional'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {mapping.suggestedMapping ? (
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-50" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Dica sobre colunas não mapeadas */}
            {mappings.some(m => !m.suggestedMapping) && (
                <div className="p-4 rounded-xl bg-muted/30 border border-dashed flex gap-3">
                    <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        Colunas ignoradas não entrarão no processamento da IA e não aparecerão nos filtros do dashboard.
                    </p>
                </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 pt-6">
                <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={onBack}
                >
                    Voltar
                </Button>
                <Button
                    className={cn(
                        "flex-1 h-12 font-bold",
                        isValid && `bg-gradient-to-r ${template.gradient} text-white hover:opacity-90 shadow-lg shadow-primary/20`
                    )}
                    onClick={() => onConfirm(mappings)}
                    disabled={!isValid}
                >
                    {isValid ? (
                        <>
                            Gerar Dashboard Inteligente
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    ) : (
                        'Corrija os alertas críticos'
                    )}
                </Button>
            </div>
        </div>
    );
}
