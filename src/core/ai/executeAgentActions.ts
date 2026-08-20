import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionExecutionResult, ActionExecutionReport } from '@/core/ai/actionExecutionTypes';
import { DESTRUCTIVE_ACTION_TYPES } from '@/core/ai/actionExecutionTypes';
import { resolveTargetCell, generateFormulaRange } from '@/core/ai/formulaUtils';

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
    /** Callback to request user confirmation for destructive actions */
    requestDestructiveConfirmation?: (action: AgentAction) => Promise<boolean>;
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

function makeResult(
    action: AgentAction,
    status: ActionExecutionResult['status'],
    message: string,
    extras?: Partial<ActionExecutionResult>
): ActionExecutionResult {
    return {
        actionId: `${action.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: action.type,
        status,
        message,
        ...extras,
    };
}

/**
 * Execute a batch of agent actions.
 * Destructive actions pause for user confirmation before executing.
 * Returns both legacy summaries (string[]) and structured ActionExecutionReport.
 */
export async function executeAgentActions(
    actions: AgentAction[],
    context: AgentActionContext
): Promise<{ summaries: string[]; report: ActionExecutionReport }> {
    const summaries: string[] = [];
    const results: ActionExecutionResult[] = [];
    const batchUpdates: BatchUpdate[] = [];
    const deletedRowIds: string[] = [];
    const { rows, activeSheetTitle } = context;

    for (const action of actions) {
        try {
            // ─── Destructive confirmation gate ──────────────────────
            if (DESTRUCTIVE_ACTION_TYPES.has(action.type) && context.requestDestructiveConfirmation) {
                const confirmed = await context.requestDestructiveConfirmation(action);
                if (!confirmed) {
                    const msg = `Đã hủy: ${action.type} trên "${action.sheetTitle || activeSheetTitle}"`;
                    summaries.push(msg);
                    results.push(makeResult(action, 'cancelled', msg, { sheetTitle: action.sheetTitle || activeSheetTitle }));
                    continue;
                }
            }

            // ─── Action execution ───────────────────────────────────
            if (action.type === 'create_sheet' && action.sheetTitle) {
                context.onCreateSheet?.(action.sheetTitle, action.headers);
                const msg = `Tạo sheet mới "${action.sheetTitle}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }));
            }
            else if (action.type === 'delete_sheet' && action.sheetTitle) {
                context.onDeleteSheet?.(action.sheetTitle);
                const msg = `Xóa trang "${action.sheetTitle}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }));
            }
            else if (action.type === 'duplicate_sheet' && action.sourceSheetTitle) {
                context.onDuplicateSheet?.(action.sourceSheetTitle, action.newSheetTitle);
                const msg = `Nhân bản trang "${action.sourceSheetTitle}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: action.sourceSheetTitle }));
            }
            else if (action.type === 'rename_sheet' && action.oldSheetTitle && action.newSheetTitle) {
                context.onRenameSheet?.(action.oldSheetTitle, action.newSheetTitle);
                const msg = `Đổi tên "${action.oldSheetTitle}" -> "${action.newSheetTitle}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: action.newSheetTitle }));
            }
            else if (action.type === 'update_headers' && action.headers && action.headers.length > 0) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onUpdateHeaders?.(targetSheet, action.headers);
                const msg = `Đổi tên cột sheet "${targetSheet}" -> [ ${action.headers.join(', ')} ]`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'add_column' && action.columnName) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onAddColumn?.(targetSheet, action.columnName);
                const msg = `Thêm cột "${action.columnName}" vào "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'delete_column' && action.colKey) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onDeleteColumn?.(targetSheet, action.colKey);
                const msg = `Xóa cột "${action.colKey}" khỏi "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'freeze_rows_cols') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onFreezeRowsCols?.(targetSheet, action.frozenRows ?? 1, action.frozenCols ?? 0);
                const msg = `Cố định ${action.frozenRows ?? 1} hàng đầu trên "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'sort_range' && action.colKey) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onSortRange?.(targetSheet, action.colKey, action.ascending ?? true);
                const msg = `Sắp xếp "${targetSheet}" theo cột "${action.colKey}" (${action.ascending ? 'A-Z' : 'Z-A'})`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'update_range' && action.range && action.values) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onUpdateRange?.(targetSheet, action.range, action.values);
                const msg = `Cập nhật dải ô "${action.range}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
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
                const msg = `Định dạng dải ô "${action.range || '1:1'}" trên "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'auto_resize_columns') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onAutoResizeColumns?.(targetSheet, action.startCol, action.endCol);
                const msg = `Tự động căn chỉnh độ rộng các cột trên "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'set_column_width') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onSetColumnWidth?.(targetSheet, action.pixelSize || 160, action.startCol, action.endCol);
                const msg = `Mở rộng độ rộng các cột lên ${action.pixelSize || 160}px trên "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'clear_charts') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onClearCharts?.(targetSheet);
                const msg = `Xóa toàn bộ biểu đồ trên "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'add_chart') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                const chartOffset = action.rowIndexOffset !== undefined
                    ? action.rowIndexOffset
                    : actions.filter((a) => a.type === 'add_chart').indexOf(action) * 19;
                context.onAddChart?.(targetSheet, action.chartType || 'COLUMN', action.title || 'Báo Cáo Thống Kê', action.domainColIndex ?? 0, action.seriesColIndex ?? 1, action.rowCount ?? 10, chartOffset);
                const msg = `Tạo biểu đồ "${action.title || 'Báo Cáo'}" (${action.chartType || 'COLUMN'})`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
            }
            else if (action.type === 'clear_sheet') {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                context.onClearSheet?.(targetSheet);
                const msg = `Xóa sạch toàn bộ dữ liệu trên trang "${targetSheet}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: targetSheet }));
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
                    const msg = `Hàng #${targetRow.rowNumber} (${matchedColumn} = "${value}")`;
                    summaries.push(msg);
                    results.push(makeResult(action, 'success', msg, {
                        affectedRows: [targetRow.rowNumber],
                        sheetTitle: activeSheetTitle,
                    }));
                }
            }
            else if (action.type === 'batch_update_rows' && action.updates) {
                const affectedRows: number[] = [];
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
                    affectedRows.push(targetRow.rowNumber);
                    summaries.push(`${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}: ${matchedColumn} = "${update.newValue}"`);
                });
                results.push(makeResult(action, 'success', `Cập nhật ${affectedRows.length} hàng`, {
                    affectedRows,
                    sheetTitle: activeSheetTitle,
                }));
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
                const msg = `Thêm: "${rowData.name || rowData.NAME || 'Hàng mới'}"`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, { sheetTitle: activeSheetTitle }));
            }
            else if (action.type === 'batch_add_rows' && action.rowsData) {
                action.rowsData.forEach((rowData) => {
                    context.onAddRow(rowData);
                    summaries.push(`Thêm: "${rowData.name || rowData.NAME || 'Hàng mới'}"`);
                });
                results.push(makeResult(action, 'success', `Thêm ${action.rowsData.length} hàng mới`, { sheetTitle: activeSheetTitle }));
            }
            else if (action.type === 'delete_row') {
                const targetRow = findRow(rows, action);
                if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                    deletedRowIds.push(targetRow.id);
                    const msg = `Xóa dòng ${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}`;
                    summaries.push(msg);
                    results.push(makeResult(action, 'success', msg, {
                        affectedRows: [targetRow.rowNumber],
                        sheetTitle: activeSheetTitle,
                    }));
                }
            }
            else if (action.type === 'batch_delete_rows') {
                const affectedRows: number[] = [];
                action.idCols?.forEach((idCol) => {
                    const targetRow = findRow(rows, { idCol });
                    if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                        deletedRowIds.push(targetRow.id);
                        affectedRows.push(targetRow.rowNumber);
                        summaries.push(`Xóa dòng ${targetRow.data['ID'] || targetRow.data['id'] || '#' + targetRow.rowNumber}`);
                    }
                });
                action.rowNumbers?.forEach((rowNumber) => {
                    const targetRow = findRow(rows, { rowNumber });
                    if (targetRow && !deletedRowIds.includes(targetRow.id)) {
                        deletedRowIds.push(targetRow.id);
                        affectedRows.push(targetRow.rowNumber);
                        summaries.push(`Xóa hàng #${rowNumber}`);
                    }
                });
                results.push(makeResult(action, 'success', `Xóa ${affectedRows.length} hàng`, {
                    affectedRows,
                    sheetTitle: activeSheetTitle,
                }));
            }
            else if (action.type === 'switch_sheet' && action.sheetTitle) {
                if (context.onSelectSheetTab) {
                    context.onSelectSheetTab(action.sheetTitle);
                    const msg = `Chuyển sang trang "${action.sheetTitle}"`;
                    summaries.push(msg);
                    results.push(makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }));
                }
            }
            else if (action.type === 'start_pipeline') {
                context.onStartPipeline();
                const msg = 'Khởi chạy tự động hoá';
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'pause_pipeline' && context.onPausePipeline) {
                context.onPausePipeline();
                const msg = 'Tạm dừng quy trình';
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'resume_pipeline' && context.onResumePipeline) {
                context.onResumePipeline();
                const msg = 'Tiếp tục quy trình';
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'reset_pipeline' && context.onResetPipeline) {
                context.onResetPipeline();
                const msg = 'Đặt lại trạng thái bảng';
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'clear_logs' && context.onClearLogs) {
                context.onClearLogs();
                const msg = 'Xóa sạch nhật ký';
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'change_speed' && action.speedMs && context.onChangeSpeed) {
                context.onChangeSpeed(action.speedMs);
                const msg = `Đổi tốc độ thành ${action.speedMs}ms`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'load_url' && action.url && context.onFetchFromUrl) {
                context.onFetchFromUrl(action.url);
                const msg = `Nạp bảng từ link: ${action.url}`;
                summaries.push(msg);
                results.push(makeResult(action, 'success', msg));
            }
            else if (action.type === 'set_formula' && action.formula) {
                const targetSheet = action.sheetTitle || activeSheetTitle;
                const colKey = action.colKey || 'A1';
                const headers = rows.length > 0 ? Object.keys(rows[0].data) : [];
                const targetInfo = resolveTargetCell(colKey, headers);

                // Calculate start and end rows
                const startRow = targetInfo.startRow;
                let endRow = startRow;
                if (action.endRow !== undefined && action.endRow >= startRow) {
                    endRow = action.endRow;
                } else if (action.fillDown) {
                    // Row 1 is header, data rows are 2 .. rows.length + 1
                    endRow = Math.max(startRow, rows.length + 1);
                }

                // Generate formula 2D matrix with relative reference adjustments
                const fillResult = generateFormulaRange(
                    action.formula,
                    startRow,
                    endRow,
                    targetInfo.colLetter,
                    action.fillDown ?? false
                );

                if (context.onUpdateRange) {
                    context.onUpdateRange(targetSheet, fillResult.rangeA1, fillResult.values);
                }

                // Update local rows if matched column exists in dataset
                const matchedCol = targetInfo.colName || (targetInfo.colIndex < headers.length ? headers[targetInfo.colIndex] : undefined);
                const affectedRowNumbers: number[] = [];

                if (matchedCol) {
                    fillResult.formulas.forEach((f, idx) => {
                        const rowNum = startRow + idx;
                        affectedRowNumbers.push(rowNum);
                        const targetRow = rows.find((r) => r.rowNumber === rowNum);
                        if (targetRow) {
                            batchUpdates.push({
                                rowId: targetRow.id,
                                updatedData: { ...targetRow.data, [matchedCol]: f },
                                colKey: matchedCol,
                                newValue: f,
                            });
                        }
                    });
                } else {
                    for (let r = startRow; r <= endRow; r++) {
                        affectedRowNumbers.push(r);
                    }
                }

                const msg = action.fillDown && fillResult.rowCount > 1
                    ? `Gán và kéo công thức ${action.formula} xuống dải ${fillResult.rangeA1} (${fillResult.rowCount} hàng) trên "${targetSheet}"`
                    : `Gán công thức ${action.formula} vào ô ${fillResult.rangeA1} trên "${targetSheet}"`;

                summaries.push(msg);
                results.push(makeResult(action, 'success', msg, {
                    affectedRows: affectedRowNumbers,
                    sheetTitle: targetSheet,
                }));
            }
            else if (action.type === 'export_csv') {
                try {
                    if (rows.length === 0) {
                        const msg = 'Không có dữ liệu để xuất CSV.';
                        summaries.push(msg);
                        results.push(makeResult(action, 'failed', msg));
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
                        const csvUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = csvUrl;
                        link.download = `${activeSheetTitle || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
                        link.click();
                        URL.revokeObjectURL(csvUrl);
                        const msg = `Đã xuất CSV (${rows.length} hàng) — tệp đang tải về.`;
                        summaries.push(msg);
                        results.push(makeResult(action, 'success', msg));
                    }
                } catch (e: any) {
                    console.warn('Export CSV failed:', e);
                    const msg = 'Lỗi khi xuất CSV.';
                    summaries.push(msg);
                    results.push(makeResult(action, 'failed', msg, { error: e.message }));
                }
            }
        } catch (err: any) {
            const msg = `Lỗi thực thi ${action.type}: ${err.message}`;
            summaries.push(msg);
            results.push(makeResult(action, 'failed', msg, {
                error: err.message,
                sheetTitle: action.sheetTitle || activeSheetTitle,
            }));
        }
    }

    // ─── Flush batched updates ─────────────────────────────────
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

    const report: ActionExecutionReport = {
        results,
        totalActions: actions.length,
        successCount: results.filter((r) => r.status === 'success').length,
        failedCount: results.filter((r) => r.status === 'failed').length,
        cancelledCount: results.filter((r) => r.status === 'cancelled').length,
    };

    return { summaries, report };
}
