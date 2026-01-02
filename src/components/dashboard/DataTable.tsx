import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Download, Edit2, Trash2, X, Plus, Columns, Sigma, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  className?: string;
  onEditRow?: (rowIndex: number, row: Record<string, unknown>) => void;
  onEditCell?: (rowIndex: number, column: string, value: unknown) => void;
  onRenameColumn?: (oldName: string, newName: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onDeleteColumn?: (column: string) => void;
  onAddRow?: () => void;
  onAddColumn?: () => void;
  onAddFormula?: () => void;
  onEditFormula?: (column: string) => void;
}

export default function DataTable({
  data,
  columns,
  className,
  onEditRow,
  onEditCell,
  onRenameColumn,
  onDeleteRow,
  onDeleteColumn,
  onAddRow,
  onAddColumn,
  onAddFormula,
  onEditFormula
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const itemsPerPage = 10;

  const filteredData = data
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = filteredData.map(({ row }) =>
      columns.map(col => `"${String(row[col] ?? '')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_exportados.csv';
    a.click();
  };

  const startEditCell = (rowIdx: number, colName: string, currentValue: unknown) => {
    if (!onEditCell) return;
    setEditingCell({ row: rowIdx, col: colName });
    setEditValue(String(currentValue ?? ''));
  };

  const saveCell = () => {
    if (editingCell && onEditCell) {
      onEditCell(editingCell.row, editingCell.col, editValue);
    }
    setEditingCell(null);
  };

  const startEditHeader = (colName: string) => {
    if (!onRenameColumn) return;
    setEditingHeader(colName);
    setEditValue(colName);
  };

  const saveHeader = () => {
    if (editingHeader && onRenameColumn && editValue && editValue !== editingHeader) {
      onRenameColumn(editingHeader, editValue);
    }
    setEditingHeader(null);
  };

  return (
    <div className={cn('bg-card rounded-xl shadow-sm border border-border', className)}>
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nos dados..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-9 transition-all focus:ring-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden md:block mr-2 italic">
            Dica: clique duplo para editar qualquer campo
          </p>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          {onAddColumn && (
            <Button variant="outline" size="sm" onClick={onAddColumn} className="hover:bg-primary/10 hover:text-primary border-primary/20">
              <Columns className="w-4 h-4 mr-2" />
              Nova Coluna
            </Button>
          )}
          {onAddFormula && (
            <Button variant="outline" size="sm" onClick={onAddFormula} className="hover:bg-primary/10 hover:text-primary border-primary/20">
              <Sigma className="w-4 h-4 mr-2" />
              Fórmula
            </Button>
          )}
          {onAddRow && (
            <Button variant="default" size="sm" onClick={onAddRow} className="bg-primary hover:bg-primary/90 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Linha
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f9fafb]">
              {columns.map((col) => (
                <TableHead key={col} className="font-bold whitespace-nowrap group text-[#666] border-b-2 border-slate-100 h-12">
                  {editingHeader === col ? (
                    <Input
                      autoFocus
                      className="h-7 min-w-[120px] text-xs font-semibold py-0 px-2"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveHeader}
                      onKeyDown={(e) => e.key === 'Enter' && saveHeader()}
                    />
                  ) : (
                    <div className="flex items-center justify-between group/header">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-[#0066cc] transition-colors flex-1"
                        onDoubleClick={() => startEditHeader(col)}
                        title="Clique duplo para renomear"
                      >
                        {col}
                      </div>
                      {onEditFormula && (
                        <button
                          onClick={() => onEditFormula(col)}
                          className="opacity-25 group-hover/header:opacity-100 p-1 hover:bg-[#0066cc]/10 text-slate-400 hover:text-[#0066cc] rounded transition-all ml-1"
                          title="Editar fórmula"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteColumn && (
                        <button
                          onClick={() => onDeleteColumn(col)}
                          className="opacity-25 group-hover/header:opacity-100 p-1 hover:bg-destructive/10 text-slate-400 hover:text-destructive rounded transition-all ml-0.5"
                          title="Excluir coluna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
              {onEditRow && (
                <TableHead className="font-bold whitespace-nowrap text-right text-[#666] border-b-2 border-slate-100 bg-[#f9fafb] h-12">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map(({ row, idx }) => (
                <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                  {columns.map((col) => {
                    const isEditing = editingCell?.row === idx && editingCell?.col === col;
                    return (
                      <TableCell
                        key={col}
                        className="whitespace-nowrap group relative"
                        onDoubleClick={() => startEditCell(idx, col, row[col])}
                      >
                        {isEditing ? (
                          <Input
                            autoFocus
                            className="h-8 min-w-[100px] text-sm py-0 px-2"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCell}
                            onKeyDown={(e) => e.key === 'Enter' && saveCell()}
                          />
                        ) : (
                          <span className="cursor-text select-none">
                            {String(row[col] ?? '-')}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  {(onEditRow || onDeleteRow) && (
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEditRow && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => onEditRow(idx, row)}
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="ml-1 sr-only md:not-sr-only">Formulário</span>
                          </Button>
                        )}
                        {onDeleteRow && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => onDeleteRow(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (onEditRow ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
