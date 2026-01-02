import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sigma, Calculator, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FormulaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    columns: string[];
    onApply: (columnName: string, formula: string) => void;
    initialColumnName?: string;
    initialFormula?: string;
}

export function FormulaDialog({
    isOpen,
    onClose,
    columns,
    onApply,
    initialColumnName = '',
    initialFormula = ''
}: FormulaDialogProps) {
    const [columnName, setColumnName] = useState(initialColumnName);
    const [formula, setFormula] = useState(initialFormula);

    React.useEffect(() => {
        if (isOpen) {
            setColumnName(initialColumnName);
            setFormula(initialFormula);
        }
    }, [isOpen, initialColumnName, initialFormula]);

    const insertToken = (token: string) => {
        setFormula(prev => prev + `[${token}]`);
    };

    const handleApply = () => {
        if (!columnName.trim() || !formula.trim()) return;
        onApply(columnName.trim(), formula.trim());
        setColumnName('');
        setFormula('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-primary" />
                        {initialColumnName ? `Editar Coluna: ${initialColumnName}` : 'Nova Coluna Calculada'}
                    </DialogTitle>
                    <DialogDescription>
                        {initialColumnName
                            ? 'Atualize a fórmula matemática para recalcular esta coluna.'
                            : 'Crie uma nova coluna usando uma fórmula matemática baseada em outras colunas.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome da nova coluna</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Lucro Total"
                            value={columnName}
                            onChange={(e) => setColumnName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label className="flex justify-between items-center">
                            Fórmula
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Utilize os botões abaixo
                            </span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="formula"
                                placeholder="([Coluna A] * [Coluna B]) / 100"
                                value={formula}
                                onChange={(e) => setFormula(e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">Colunas disponíveis (Clique para inserir)</Label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border rounded-lg bg-slate-50/50">
                            {columns.map((col) => (
                                <Badge
                                    key={col}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors py-1.5"
                                    onClick={() => insertToken(col)}
                                >
                                    {col}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['+', '-', '*', '/', '(', ')'].map(op => (
                            <Button
                                key={op}
                                variant="outline"
                                size="sm"
                                className="w-10 h-10 font-mono text-lg"
                                onClick={() => setFormula(prev => prev + op)}
                            >
                                {op}
                            </Button>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-3 h-10 text-destructive hover:bg-destructive/10"
                            onClick={() => setFormula('')}
                        >
                            Limpar
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleApply} disabled={!columnName.trim() || !formula.trim()}>
                        {initialColumnName ? 'Salvar e Recalcular' : 'Criar Coluna'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
