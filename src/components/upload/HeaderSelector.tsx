import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MousePointer2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderSelectorProps {
    grid: unknown[][];
    onSelect: (headerRowIndex: number) => void;
    onBack: () => void;
    suggestedIndex?: number;
}

export default function HeaderSelector({ grid, onSelect, onBack, suggestedIndex = 0 }: HeaderSelectorProps) {
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number>(suggestedIndex);

    // Mostrar apenas as primeiras 15 linhas para seleção
    const previewRows = grid.slice(0, 15);

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Padronização de Cabeçalho</p>
                    <p>Selecione a linha que contém os <strong>títulos das colunas</strong>.
                        As linhas acima dela serão ignoradas e as abaixo serão tratadas como dados.</p>
                </div>
            </div>

            <Card className="border-2 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableBody>
                            {previewRows.map((row, rowIndex) => (
                                <TableRow
                                    key={rowIndex}
                                    className={cn(
                                        "cursor-pointer transition-colors relative group",
                                        selectedRow === rowIndex ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => setSelectedRow(rowIndex)}
                                    onMouseEnter={() => setHoveredRow(rowIndex)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                >
                                    <TableCell className="w-12 text-center border-r bg-muted/30 font-mono text-xs text-muted-foreground p-0">
                                        {rowIndex + 1}
                                    </TableCell>

                                    <TableCell className="p-0 w-10 text-center">
                                        {selectedRow === rowIndex ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary mx-auto" />
                                        ) : (
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 mx-auto transition-opacity",
                                                hoveredRow === rowIndex ? "opacity-100 border-primary/50" : "opacity-0"
                                            )} />
                                        )}
                                    </TableCell>

                                    {row.slice(0, 8).map((cell, cellIndex) => (
                                        <TableCell
                                            key={cellIndex}
                                            className={cn(
                                                "max-w-[200px] truncate py-3",
                                                selectedRow === rowIndex ? "font-bold text-primary" : "text-muted-foreground"
                                            )}
                                        >
                                            {cell === null || cell === undefined ? (
                                                <span className="text-muted-foreground/30 italic font-normal">vazio</span>
                                            ) : (
                                                String(cell)
                                            )}
                                        </TableCell>
                                    ))}

                                    {row.length > 8 && (
                                        <TableCell className="text-muted-foreground/50 text-xs italic">
                                            +{row.length - 8} colunas...
                                        </TableCell>
                                    )}

                                    {selectedRow === rowIndex && (
                                        <TableCell className="p-0 w-0 relative">
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 whitespace-nowrap">
                                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                                    Cabeçalho Selecionado
                                                </Badge>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={onBack}>
                    Voltar
                </Button>
                <Button
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={() => onSelect(selectedRow)}
                >
                    Confirmar e Mapear Colunas
                    <MousePointer2 className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
