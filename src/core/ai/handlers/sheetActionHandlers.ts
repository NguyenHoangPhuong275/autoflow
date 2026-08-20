import type { AgentAction } from '@/core/ai/agentTypes';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import type { AgentActionContext } from '@/core/ai/executeAgentActions';
import { resolveTargetCell, generateFormulaRange } from '@/core/ai/formulaUtils';

export async function executeSheetAction(
  action: AgentAction,
  actions: AgentAction[],
  context: AgentActionContext,
  activeSheetTitle: string,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  const rows = context.rows;

  if (action.type === 'create_sheet' && action.sheetTitle) {
    context.onCreateSheet?.(action.sheetTitle, action.headers);
    const msg = `Tạo trang tính mới "${action.sheetTitle}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }), summary: msg };
  }

  if (action.type === 'delete_sheet' && action.sheetTitle) {
    context.onDeleteSheet?.(action.sheetTitle);
    const msg = `Xóa trang tính "${action.sheetTitle}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }), summary: msg };
  }

  if (action.type === 'duplicate_sheet' && action.sourceSheetTitle && action.newSheetTitle) {
    context.onDuplicateSheet?.(action.sourceSheetTitle, action.newSheetTitle);
    const msg = `Nhân bản trang tính "${action.sourceSheetTitle}" thành "${action.newSheetTitle}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: action.newSheetTitle }), summary: msg };
  }

  if (action.type === 'rename_sheet' && action.oldSheetTitle && action.newSheetTitle) {
    context.onRenameSheet?.(action.oldSheetTitle, action.newSheetTitle);
    const msg = `Đổi tên trang tính "${action.oldSheetTitle}" thành "${action.newSheetTitle}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: action.newSheetTitle }), summary: msg };
  }

  if (action.type === 'switch_sheet' && action.sheetTitle) {
    context.onSelectSheetTab?.(action.sheetTitle);
    const msg = `Chuyển sang trang tính "${action.sheetTitle}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: action.sheetTitle }), summary: msg };
  }

  if (action.type === 'update_headers' && action.headers) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onUpdateHeaders?.(targetSheet, action.headers);
    const msg = `Cập nhật tiêu đề cột (${action.headers.length} cột) trên "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'add_column' && action.columnName) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onAddColumn?.(targetSheet, action.columnName);
    const msg = `Thêm cột "${action.columnName}" vào "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'delete_column' && action.colKey) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onDeleteColumn?.(targetSheet, action.colKey);
    const msg = `Xóa cột "${action.colKey}" khỏi "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'freeze_rows_cols') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onFreezeRowsCols?.(targetSheet, action.frozenRows ?? 1, action.frozenCols ?? 0);
    const msg = `Cố định ${action.frozenRows ?? 1} hàng đầu trên "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'sort_range' && action.colKey) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onSortRange?.(targetSheet, action.colKey, action.ascending ?? true);
    const msg = `Sắp xếp "${targetSheet}" theo cột "${action.colKey}" (${action.ascending ? 'A-Z' : 'Z-A'})`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'update_range' && action.range && action.values) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onUpdateRange?.(targetSheet, action.range, action.values);
    const msg = `Cập nhật dải ô "${action.range}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'format_cells') {
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
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'auto_resize_columns') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onAutoResizeColumns?.(targetSheet, action.startCol, action.endCol);
    const msg = `Tự động căn chỉnh độ rộng các cột trên "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'set_column_width') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onSetColumnWidth?.(targetSheet, action.pixelSize || 160, action.startCol, action.endCol);
    const msg = `Mở rộng độ rộng các cột lên ${action.pixelSize || 160}px trên "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'clear_charts') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onClearCharts?.(targetSheet);
    const msg = `Xóa toàn bộ biểu đồ trên "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'add_chart') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    const chartOffset = action.rowIndexOffset !== undefined
      ? action.rowIndexOffset
      : actions.filter((a) => a.type === 'add_chart').indexOf(action) * 19;
    context.onAddChart?.(targetSheet, action.chartType || 'COLUMN', action.title || 'Báo Cáo Thống Kê', action.domainColIndex ?? 0, action.seriesColIndex ?? 1, action.rowCount ?? 10, chartOffset);
    const msg = `Tạo biểu đồ "${action.title || 'Báo Cáo'}" (${action.chartType || 'COLUMN'})`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'clear_sheet') {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    context.onClearSheet?.(targetSheet);
    const msg = `Xóa sạch toàn bộ dữ liệu trên trang "${targetSheet}"`;
    return { result: makeResult(action, 'success', msg, { sheetTitle: targetSheet }), summary: msg };
  }

  if (action.type === 'set_formula' && action.colKey && action.formula) {
    const targetSheet = action.sheetTitle || activeSheetTitle;
    const availableHeaders = rows.length > 0 ? Object.keys(rows[0].data) : [];
    const resolved = resolveTargetCell(action.colKey, availableHeaders);
    const startRow = action.rowNumber ?? resolved.startRow;

    const dataRowCount = rows.length > 0
      ? Math.max(...rows.map((r) => r.rowNumber))
      : startRow;
    const targetEndRow = action.endRow ?? (action.fillDown ? dataRowCount : startRow);

    const fillResult = generateFormulaRange(action.formula, startRow, targetEndRow, resolved.colLetter, action.fillDown);
    context.onUpdateRange?.(targetSheet, fillResult.rangeA1, fillResult.values);

    const affectedRowNumbers: number[] = [];
    for (let r = startRow; r <= targetEndRow; r++) {
      affectedRowNumbers.push(r);
    }

    const msg = action.fillDown && fillResult.rowCount > 1
      ? `Gán và kéo công thức ${action.formula} xuống dải ${fillResult.rangeA1} (${fillResult.rowCount} hàng) trên "${targetSheet}"`
      : `Gán công thức ${action.formula} vào ô ${fillResult.rangeA1} trên "${targetSheet}"`;

    return {
      result: makeResult(action, 'success', msg, {
        affectedRows: affectedRowNumbers,
        sheetTitle: targetSheet,
      }),
      summary: msg,
    };
  }

  return null;
}
