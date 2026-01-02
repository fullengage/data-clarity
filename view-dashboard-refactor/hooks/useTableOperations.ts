/**
 * Hook customizado para operações de edição da tabela
 * 
 * Gerencia todas as operações CRUD na tabela de dados.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { DashboardProject } from '@/types/dashboard';
import { ColumnStructure } from '../types/viewDashboard.types';

// ============================================================================
// Tipos
// ============================================================================

interface UseTableOperationsParams {
  structuredDatasetId: string | null;
  dashboard: DashboardProject | null;
  tableData: Record<string, unknown>[];
  tableColumns: string[];
  setTableData: (data: Record<string, unknown>[]) => void;
  setTableColumns: (cols: string[]) => void;
  onRefresh: () => Promise<void>;
}

interface UseTableOperationsReturn {
  // Estado
  isRefreshing: boolean;
  
  // Row Editor State
  isRowEditorOpen: boolean;
  editingRowIndex: number | null;
  editingRowData: Record<string, unknown> | null;
  isSavingRow: boolean;
  
  // Row Operations
  openRowEditor: (rowIndex: number, row: Record<string, unknown>) => void;
  closeRowEditor: () => void;
  updateEditingRowField: (column: string, value: unknown) => void;
  saveRowEdit: () => Promise<void>;
  editCell: (rowIndex: number, column: string, value: unknown) => Promise<void>;
  deleteRow: (rowIndex: number) => Promise<void>;
  addRow: () => Promise<void>;
  
  // Column Operations
  renameColumn: (oldName: string, newName: string) => Promise<void>;
  deleteColumn: (column: string) => Promise<void>;
  addColumn: () => Promise<void>;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useTableOperations({
  structuredDatasetId,
  dashboard,
  tableData,
  tableColumns,
  setTableData,
  setTableColumns,
  onRefresh,
}: UseTableOperationsParams): UseTableOperationsReturn {
  const { toast } = useToast();

  // Estado local
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRowEditorOpen, setIsRowEditorOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, unknown> | null>(null);
  const [isSavingRow, setIsSavingRow] = useState(false);

  // ============================================================================
  // Row Editor
  // ============================================================================

  const openRowEditor = useCallback((rowIndex: number, row: Record<string, unknown>) => {
    setEditingRowIndex(rowIndex);
    setEditingRowData({ ...row });
    setIsRowEditorOpen(true);
  }, []);

  const closeRowEditor = useCallback(() => {
    setIsRowEditorOpen(false);
    setEditingRowIndex(null);
    setEditingRowData(null);
  }, []);

  const updateEditingRowField = useCallback((column: string, value: unknown) => {
    setEditingRowData((prev) => prev ? { ...prev, [column]: value } : null);
  }, []);

  // ============================================================================
  // Row Operations
  // ============================================================================

  const saveRowEdit = useCallback(async () => {
    if (!structuredDatasetId) {
      toast({
        title: 'Dataset não encontrado',
        description: 'Não foi possível identificar o dataset para salvar as alterações.',
        variant: 'destructive',
      });
      return;
    }
    
    if (editingRowIndex === null || !editingRowData) return;

    setIsSavingRow(true);
    try {
      const nextRows = [...tableData];
      nextRows[editingRowIndex] = editingRowData;
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;

      setIsRefreshing(true);
      closeRowEditor();
      await onRefresh();
      
      toast({ title: 'Dados atualizados', description: 'A linha foi salva com sucesso.' });
    } catch (e) {
      console.error('Error saving row edit:', e);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a edição. Verifique permissões (RLS) e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingRow(false);
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, editingRowIndex, editingRowData, tableData, setTableData, closeRowEditor, onRefresh, toast]);

  const editCell = useCallback(async (rowIndex: number, column: string, value: unknown) => {
    if (!structuredDatasetId) return;
    
    setIsRefreshing(true);
    try {
      const nextRows = [...tableData];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [column]: value };
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      
      await onRefresh();
      toast({ title: 'Valor atualizado' });
    } catch (e) {
      console.error('Error editing cell:', e);
      toast({ title: 'Erro ao salvar valor', variant: 'destructive' });
      await onRefresh(); // Reverte se falhar
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, tableData, setTableData, onRefresh, toast]);

  const deleteRow = useCallback(async (rowIndex: number) => {
    if (!structuredDatasetId) return;

    const ok = window.confirm('Tem certeza que deseja excluir este registro?');
    if (!ok) return;

    setIsRefreshing(true);
    try {
      const nextRows = tableData.filter((_, i) => i !== rowIndex);
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      
      await onRefresh();
      toast({ title: 'Registro excluído' });
    } catch (e) {
      console.error('Error deleting row:', e);
      toast({ title: 'Erro ao excluir registro', variant: 'destructive' });
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, tableData, setTableData, onRefresh, toast]);

  const addRow = useCallback(async () => {
    if (!structuredDatasetId) return;
    
    setIsRefreshing(true);
    try {
      const newRow: Record<string, unknown> = {};
      tableColumns.forEach(col => newRow[col] = '');
      
      const nextRows = [...tableData, newRow];
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({ normalized_rows: nextRows })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      
      await onRefresh();
      toast({ title: 'Linha adicionada' });
    } catch (e) {
      console.error('Error adding row:', e);
      toast({ title: 'Erro ao adicionar linha', variant: 'destructive' });
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, tableData, tableColumns, setTableData, onRefresh, toast]);

  // ============================================================================
  // Column Operations
  // ============================================================================

  const renameColumn = useCallback(async (oldName: string, newName: string) => {
    if (!structuredDatasetId || !dashboard) return;
    
    setIsRefreshing(true);
    try {
      // Atualizar cabeçalhos
      const nextCols = tableColumns.map(c => c === oldName ? newName : c);
      setTableColumns(nextCols);

      // Atualizar dados (chaves dos objetos)
      const nextRows = tableData.map(row => {
        const newRow: Record<string, unknown> = {};
        Object.keys(row).forEach(key => {
          const newKey = key === oldName ? newName : key;
          newRow[newKey] = row[key];
        });
        return newRow;
      });
      setTableData(nextRows);

      // Preparar estrutura para DB
      const currentStructure = (dashboard.columns as ColumnStructure[]) || [];
      const nextStructure = currentStructure.map(c =>
        c.name === oldName ? { ...c, name: newName } : c
      );

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      
      await onRefresh();
      toast({ title: 'Coluna renomeada com sucesso' });
    } catch (e) {
      console.error('Error renaming column:', e);
      toast({ title: 'Erro ao renomear coluna', variant: 'destructive' });
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, dashboard, tableColumns, tableData, setTableColumns, setTableData, onRefresh, toast]);

  const deleteColumn = useCallback(async (column: string) => {
    if (!structuredDatasetId || !dashboard) return;

    const ok = window.confirm(
      `Tem certeza que deseja excluir a coluna "${column}"? Todos os dados desta coluna serão perdidos.`
    );
    if (!ok) return;

    setIsRefreshing(true);
    try {
      // Remover coluna dos cabeçalhos
      const nextCols = tableColumns.filter(c => c !== column);
      setTableColumns(nextCols);

      // Remover campo dos dados
      const nextRows = tableData.map(row => {
        const { [column]: _, ...rest } = row;
        return rest;
      });
      setTableData(nextRows);

      // Atualizar estrutura
      const currentStructure = Array.isArray(dashboard.columns) ? dashboard.columns : [];
      const nextStructure = currentStructure.filter((c: any) => c.name !== column);

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;

      await onRefresh();
      toast({
        title: 'Coluna removida',
        description: `A coluna "${column}" e seus dados associados foram excluídos.`
      });
    } catch (e) {
      console.error('Error deleting column:', e);
      toast({
        title: 'Erro ao excluir coluna',
        description: 'Não foi possível completar a operação no banco de dados.',
        variant: 'destructive'
      });
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, dashboard, tableColumns, tableData, setTableColumns, setTableData, onRefresh, toast]);

  const addColumn = useCallback(async () => {
    const columnName = window.prompt('Nome da nova coluna:');
    if (!columnName || !structuredDatasetId || !dashboard) return;

    if (tableColumns.includes(columnName)) {
      toast({ title: 'Coluna já existe', variant: 'destructive' });
      return;
    }

    setIsRefreshing(true);
    try {
      const nextCols = [...tableColumns, columnName];
      const nextRows = tableData.map(row => ({ ...row, [columnName]: '' }));
      const currentStructure = (dashboard.columns as ColumnStructure[]) || [];
      const nextStructure = [...currentStructure, { name: columnName, type: 'string' }];

      setTableColumns(nextCols);
      setTableData(nextRows);

      const { error } = await supabase
        .from('structured_datasets')
        .update({
          structure: nextStructure,
          normalized_rows: nextRows
        })
        .eq('id', structuredDatasetId);

      if (error) throw error;
      
      await onRefresh();
      toast({ title: 'Coluna adicionada' });
    } catch (e) {
      console.error('Error adding column:', e);
      toast({ title: 'Erro ao adicionar coluna', variant: 'destructive' });
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [structuredDatasetId, dashboard, tableColumns, tableData, setTableColumns, setTableData, onRefresh, toast]);

  return {
    isRefreshing,
    isRowEditorOpen,
    editingRowIndex,
    editingRowData,
    isSavingRow,
    openRowEditor,
    closeRowEditor,
    updateEditingRowField,
    saveRowEdit,
    editCell,
    deleteRow,
    addRow,
    renameColumn,
    deleteColumn,
    addColumn,
  };
}
