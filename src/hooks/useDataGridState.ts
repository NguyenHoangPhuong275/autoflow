import { useMemo, useState, type KeyboardEvent } from 'react';
import { escapeCsv, isNumericColumn } from '@/components/pipeline/dataGridUtils';
import type { DataRow, RowStatus } from '@/types';
interface UseDataGridStateOptions {
    rows: DataRow[];
    activeSheetTitle: string;
    allSheetHeaders: Record<string, string[]>;
    onUpdateRow?: (rowId: string, updatedData: Record<string, unknown>, colKey?: string, newValue?: unknown) => void;
}
export function useDataGridState({ rows, activeSheetTitle, allSheetHeaders, onUpdateRow, }: UseDataGridStateOptions) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<RowStatus | 'all'>('all');
    const [editingCell, setEditingCell] = useState<{
        rowId: string;
        colKey: string;
    } | null>(null);
    const [editValue, setEditValue] = useState('');
    const fallbackHeaders = allSheetHeaders[activeSheetTitle] || [];
    const columnKeys = rows.length > 0 ? Object.keys(rows[0].data) : fallbackHeaders;
    const numericColumns = useMemo(() => new Set(columnKeys.filter((key) => isNumericColumn(key, rows))), [columnKeys.join('|'), rows]);
    const primaryColumn = columnKeys.find((key) => /name|tên|title|sản phẩm|họ tên/i.test(key));
    const filteredRows = rows.filter((row) => {
        const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || Object.values(row.data).some((value) => String(value).toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
    });
    const startEditing = (rowId: string, colKey: string, currentValue: unknown) => {
        setEditingCell({ rowId, colKey });
        setEditValue(String(currentValue ?? ''));
    };
    const saveEditing = (row: DataRow) => {
        if (!editingCell)
            return;
        const colKey = editingCell.colKey;
        onUpdateRow?.(row.id, { ...row.data, [colKey]: editValue }, colKey, editValue);
        setEditingCell(null);
    };
    const handleCellKeyDown = (event: KeyboardEvent, row: DataRow) => {
        if (event.key === 'Enter')
            saveEditing(row);
        if (event.key === 'Escape')
            setEditingCell(null);
    };
    const handleExportCSV = () => {
        if (columnKeys.length === 0)
            return;
        const csv = [
            ['STT', 'Trạng thái', ...columnKeys, 'Kết quả'].map(escapeCsv).join(','),
            ...rows.map((row) => [
                row.rowNumber,
                row.status,
                ...columnKeys.map((key) => row.data[key]),
                row.resultMessage ?? '',
            ].map(escapeCsv).join(',')),
        ].join('\n');
        const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `autoflow_${activeSheetTitle}_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(blobUrl);
    };
    return {
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        editingCell,
        editValue,
        setEditValue,
        columnKeys,
        numericColumns,
        primaryColumn,
        filteredRows,
        startEditing,
        saveEditing,
        handleCellKeyDown,
        handleExportCSV,
    };
}
