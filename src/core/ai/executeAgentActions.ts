import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
interface BatchUpdate {
    rowId: string;
    updatedData: Record<string, any>;
    colKey?: string;
    newValue?: any;
}
export interface AgentActionContext {
    rows: DataRow[];
    activeSheetTitle: string;
    onUpdateHeaders?: (sheetTitle: string, newHeaders: string[]) => void;
    onAddColumn?: (sheetTitle: string, columnName: string) => void;
    onDeleteColumn?: (sheetTitle: string, colKey: string) => void;
    onFreezeRowsCols?: (sheetTitle: string, frozenRows?: number, frozenCols?: number) => void;
    onSortRange?: (sheetTitle: string, colKey: string, ascending?: boolean) => void;
    onUpdateRange?: (sheetTitle: string, range: string, values: any[][]) => void;
    onFormatCells?: (sheetTitle: string, rangeA1?: string, options?: any) => void;
    onAutoResizeColumns?: (sheetTitle?: string, startCol?: number, endCol?: number) => void;
    onSetColumnWidth?: (sheetTitle?: string, pixelSize?: number, startCol?: number, endCol?: number) => void;
    onAddChart?: (sheetTitle: string, chartType?: 'COLUMN' | 'BAR' | 'LINE' | 'PIE', title?: string, domainColIndex?: number, seriesColIndex?: number, rowCount?: number, rowIndexOffset?: number) => void;
    onClearCharts?: (sheetTitle?: string) => void;
    onCreateSheet?: (sheetTitle: string, initialHeaders?: string[]) => void;
    onDeleteSheet?: (sheetTitle: string) => void;
    onDuplicateSheet?: (sourceTitle: string, newTitle?: string) => void;
    onRenameSheet?: (oldTitle: string, newTitle: string) => void;
    onUpdateRow: (rowId: string, updatedData: Record<string, any>, colKey?: string, newValue?: any) => void;
    onBatchUpdateRows?: (updates: BatchUpdate[]) => void;
    onBatchDeleteRows?: (rowIds: string[]) => void;
    onAddRow: (customData?: Record<string, any>) => void;
    onDeleteRow: (rowId: string) => void;
    onClearSheet?: (sheetTitle?: string) => void;
    onSelectSheetTab?: (sheetTitle: string) => void;
    onStartPipeline: () => void;
    onPausePipeline?: () => void;
    onResumePipeline?: () => void;
    onResetPipeline?: () => void;
    onClearLogs?: () => void;
    onChangeSpeed?: (ms: number) => void;
    onFetchFromUrl?: (url: string) => void;
}
function findRow(rows: DataRow[], target: {
    rowId?: string;
    rowNumber?: number;
    idCol?: string;
}, includeInternalId = true): DataRow | undefined {
    return rows.find((row) => (target.rowId && row.id === target.rowId)
        || (target.rowNumber && row.rowNumber === target.rowNumber)
        || (target.idCol && (String(row.data['ID'] ?? row.data['id'] ?? '').toLowerCase()
            === String(target.idCol).toLowerCase()
            || (includeInternalId && row.id === target.idCol))));
}
function findColumn(row: DataRow, requestedColumn: string): string {
    return Object.keys(row.data).find((column) => column.toLowerCase() === requestedColumn.toLowerCase()) || requestedColumn;
}
export function executeAgentActions(actions: AgentAction[], context: AgentActionContext): string[] {
    const summaries: string[] = [];
    const batchUpdates: BatchUpdate[] = [];
    const deletedRowIds: string[] = [];
    const { rows, activeSheetTitle } = context;
    actions.forEach((action) => {
        if (action.type === 'create_sheet' && action.sheetTitle) {
            context.onCreateSheet?.(action.sheetTitle, action.headers);
            summaries.push(`Tạo sheet mới "${action.sheetTitle}"`);
        }
        else if (action.type === 'delete_sheet' && action.sheetTitle) {
            context.onDeleteSheet?.(action.sheetTitle);
            summaries.push(`Xóa trang "${action.sheetTitle}"`);
        }
        else if (action.type === 'duplicate_sheet' && action.sourceSheetTitle) {
            context.onDuplicateSheet?.(action.sourceSheetTitle, action.newSheetTitle);
            summaries.push(`Nhân bản trang "${action.sourceSheetTitle}"`);
        }
        else if (action.type === 'rename_sheet' && action.oldSheetTitle && action.newSheetTitle) {
            context.onRenameSheet?.(action.oldSheetTitle, action.newSheetTitle);
            summaries.push(`Đổi tên "${action.oldSheetTitle}" -> "${action.newSheetTitle}"`);
        }
        else if (action.type === 'update_headers' && action.headers && action.headers.length > 0) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onUpdateHeaders?.(targetSheet, action.headers);
            summaries.push(`Đổi tên cột sheet "${targetSheet}" -> [ ${action.headers.join(', ')} ]`);
        }
        else if (action.type === 'add_column' && action.columnName) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onAddColumn?.(targetSheet, action.columnName);
            summaries.push(`Thêm cột "${action.columnName}" vào "${targetSheet}"`);
        }
        else if (action.type === 'delete_column' && action.colKey) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onDeleteColumn?.(targetSheet, action.colKey);
            summaries.push(`Xóa cột "${action.colKey}" khỏi "${targetSheet}"`);
        }
        else if (action.type === 'freeze_rows_cols') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onFreezeRowsCols?.(targetSheet, action.frozenRows ?? 1, action.frozenCols ?? 0);
            summaries.push(`Cố định ${action.frozenRows ?? 1} hàng đầu trên "${targetSheet}"`);
        }
        else if (action.type === 'sort_range' && action.colKey) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onSortRange?.(targetSheet, action.colKey, action.ascending ?? true);
            summaries.push(`Sắp xếp "${targetSheet}" theo cột "${action.colKey}" (${action.ascending ? 'A-Z' : 'Z-A'})`);
        }
        else if (action.type === 'update_range' && action.range && action.values) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onUpdateRange?.(targetSheet, action.range, action.values);
            summaries.push(`Cập nhật dải ô "${action.range}"`);
        }
        else if (action.type === 'format_cells') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onFormatCells?.(targetSheet, action.range || '1:1', {
                backgroundColor: action.backgroundColor,
                fontColor: action.fontColor,
                bold: action.bold,
                italic: action.italic,
                fontSize: action.fontSize,
                fontFamily: action.fontFamily,
                alignment: action.alignment,
            });
            summaries.push(`Định dạng dải ô "${action.range || '1:1'}" trên "${targetSheet}"`);
        }
        else if (action.type === 'auto_resize_columns') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onAutoResizeColumns?.(targetSheet, action.startCol, action.endCol);
            summaries.push(`Tự động căn chỉnh độ rộng các cột trên "${targetSheet}"`);
        }
        else if (action.type === 'set_column_width') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onSetColumnWidth?.(targetSheet, action.pixelSize || 160, action.startCol, action.endCol);
            summaries.push(`Mở rộng độ rộng các cột lên ${action.pixelSize || 160}px trên "${targetSheet}"`);
        }
        else if (action.type === 'clear_charts') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onClearCharts?.(targetSheet);
            summaries.push(`Xóa toàn bộ biểu đồ trên "${targetSheet}"`);
        }
        else if (action.type === 'add_chart') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            const chartOffset = action.rowIndexOffset !== undefined
                ? action.rowIndexOffset
                : actions.filter((a) => a.type === 'add_chart').indexOf(action) * 19;
            context.onAddChart?.(targetSheet, action.chartType || 'COLUMN', action.title || 'Báo Cáo Thống Kê', action.domainColIndex ?? 0, action.seriesColIndex ?? 1, action.rowCount ?? 10, chartOffset);
            summaries.push(`Tạo biểu đồ "${action.title || 'Báo Cáo'}" (${action.chartType || 'COLUMN'})`);
        }
        else if (action.type === 'clear_sheet') {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            context.onClearSheet?.(targetSheet);
            summaries.push(`Xóa sạch toàn bộ dữ liệu trên trang "${targetSheet}"`);
        }
        else if (action.type === 'update_row') {
            const targetRow = findRow(rows, action);
            if (targetRow) {
                const requestedColumn = action.colKey || Object.keys(action.updatedData || {})[0] || 'price';
                const matchedColumn = findColumn(targetRow, requestedColumn);
                const value = action.newValue !== undefined
                    ? action.newValue
                    : action.updatedData ? action.updatedData[matchedColumn] : '';
                batchUpdates.push({
                    rowId: targetRow.id,
                    updatedData: { ...targetRow.data, [matchedColumn]: value, ...(action.updatedData || {}) },
                    colKey: matchedColumn,
                    newValue: value,
                });
                summaries.push(`Hàng #${targetRow.rowNumber} (${matchedColumn} = "${value}")`);
            }
        }
        else if (action.type === 'batch_update_rows' && action.updates) {
            action.updates.forEach((update) => {
                const targetRow = findRow(rows, update, false);
                if (!targetRow)
                    return;
                const matchedColumn = findColumn(targetRow, update.colKey);
                batchUpdates.push({
                    rowId: targetRow.id,
                    updatedData: { ...targetRow.data, [matchedColumn]: update.newValue },
                    colKey: matchedColumn,
                    newValue: update.newValue,
                });
                summaries.push(`${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}: ${matchedColumn} = "${update.newValue}"`);
            });
        }
        else if (action.type === 'add_row') {
            const rowData = action.rowData || {
                id: 'p_new',
                name: 'Sản phẩm mới',
                price: '0',
                stock: '1',
                type: 'account',
            };
            context.onAddRow(rowData);
            summaries.push(`Thêm: "${rowData.name || rowData.NAME || 'Hàng mới'}"`);
        }
        else if (action.type === 'batch_add_rows' && action.rowsData) {
            action.rowsData.forEach((rowData) => {
                context.onAddRow(rowData);
                summaries.push(`Thêm: "${rowData.name || rowData.NAME || 'Hàng mới'}"`);
            });
        }
        else if (action.type === 'delete_row') {
            const targetRow = findRow(rows, action);
            if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                deletedRowIds.push(targetRow.id);
                summaries.push(`Xóa dòng ${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}`);
            }
        }
        else if (action.type === 'batch_delete_rows') {
            action.idCols?.forEach((idCol) => {
                const targetRow = findRow(rows, { idCol });
                if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                    deletedRowIds.push(targetRow.id);
                    summaries.push(`Xóa dòng ${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}`);
                }
            });
            action.rowNumbers?.forEach((rowNumber) => {
                const targetRow = findRow(rows, { rowNumber });
                if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                    deletedRowIds.push(targetRow.id);
                    summaries.push(`Xóa hàng #${rowNumber}`);
                }
            });
        }
        else if (action.type === 'switch_sheet' && action.sheetTitle) {
            if (context.onSelectSheetTab) {
                context.onSelectSheetTab(action.sheetTitle);
                summaries.push(`Chuyển sang trang "${action.sheetTitle}"`);
            }
        }
        else if (action.type === 'start_pipeline') {
            context.onStartPipeline();
            summaries.push('Khởi chạy tự động hoá');
        }
        else if (action.type === 'pause_pipeline' && context.onPausePipeline) {
            context.onPausePipeline();
            summaries.push('Tạm dừng quy trình');
        }
        else if (action.type === 'resume_pipeline' && context.onResumePipeline) {
            context.onResumePipeline();
            summaries.push('Tiếp tục quy trình');
        }
        else if (action.type === 'reset_pipeline' && context.onResetPipeline) {
            context.onResetPipeline();
            summaries.push('Đặt lại trạng thái bảng');
        }
        else if (action.type === 'clear_logs' && context.onClearLogs) {
            context.onClearLogs();
            summaries.push('Xóa sạch nhật ký');
        }
        else if (action.type === 'change_speed' && action.speedMs && context.onChangeSpeed) {
            context.onChangeSpeed(action.speedMs);
            summaries.push(`Đổi tốc độ thành ${action.speedMs}ms`);
        }
        else if (action.type === 'load_url' && action.url && context.onFetchFromUrl) {
            context.onFetchFromUrl(action.url);
            summaries.push(`Nạp bảng từ link: ${action.url}`);
        }
        else if (action.type === 'set_formula' && action.formula) {
            const targetSheet = action.sheetTitle || activeSheetTitle;
            const colKey = action.colKey || 'A1';
            // If colKey is a column name, resolve to A1 cell in row 2 (first data row)
            const headers = rows.length > 0 ? Object.keys(rows[0].data) : [];
            const colIndex = headers.findIndex((h) => h.toLowerCase() === colKey.toLowerCase());
            let cellRef = colKey;
            if (colIndex >= 0) {
                const colLetter = String.fromCharCode(65 + colIndex);
                cellRef = `${colLetter}2`;
            }
            if (context.onUpdateRange) {
                context.onUpdateRange(targetSheet, cellRef, [[action.formula]]);
            }
            summaries.push(`Gán công thức ${action.formula} vào ô ${cellRef} trên "${targetSheet}"`);
        }
        else if (action.type === 'export_csv') {
            try {
                if (rows.length === 0) {
                    summaries.push('Không có dữ liệu để xuất CSV.');
                } else {
                    const headers = Object.keys(rows[0].data);
                    const csvLines = [
                        headers.join(','),
                        ...rows.map((row) =>
                            headers.map((h) => {
                                const val = String(row.data[h] ?? '');
                                return val.includes(',') || val.includes('"') || val.includes('\n')
                                    ? `"${val.replace(/"/g, '""')}"`
                                    : val;
                            }).join(',')
                        ),
                    ];
                    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${activeSheetTitle || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    summaries.push(`Đã xuất CSV (${rows.length} hàng) — tệp đang tải về.`);
                }
            } catch (e) {
                console.warn('Export CSV failed:', e);
                summaries.push('Lỗi khi xuất CSV.');
            }
        }
    });
    if (batchUpdates.length > 0) {
        if (context.onBatchUpdateRows)
            context.onBatchUpdateRows(batchUpdates);
        else
            batchUpdates.forEach((update) => context.onUpdateRow(update.rowId, update.updatedData, update.colKey, update.newValue));
    }
    if (deletedRowIds.length > 0) {
        if (context.onBatchDeleteRows)
            context.onBatchDeleteRows(deletedRowIds);
        else
            deletedRowIds.forEach(context.onDeleteRow);
    }
    return summaries;
}
