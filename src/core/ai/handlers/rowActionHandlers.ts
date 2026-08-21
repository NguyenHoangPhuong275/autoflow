import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import type { AgentActionContext, BatchUpdate } from '@/core/ai/executeAgentActions';

export function findRow(
  rows: DataRow[],
  target: {
    rowId?: string;
    rowNumber?: number;
    idCol?: string;
  },
  includeInternalId = true
): DataRow | undefined {
  return rows.find((row) =>
    (target.rowId && row.id === target.rowId)
    || (target.rowNumber && row.rowNumber === target.rowNumber)
    || (target.idCol && (
      String(row.data['ID'] ?? row.data['id'] ?? '').toLowerCase() === String(target.idCol).toLowerCase()
      || (includeInternalId && row.id === target.idCol)
    ))
  );
}

export function findColumn(row: DataRow, requestedColumn: string): string {
  return Object.keys(row.data).find((column) => column.toLowerCase() === requestedColumn.toLowerCase()) || requestedColumn;
}

export async function executeRowAction(
  action: AgentAction,
  context: AgentActionContext,
  activeSheetTitle: string,
  batchUpdates: BatchUpdate[],
  deletedRowIds: string[],
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  const rows = context.rows;

  if (action.type === 'update_row') {
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
      return {
        result: makeResult(action, 'success', msg, {
          affectedRows: [targetRow.rowNumber],
          sheetTitle: activeSheetTitle,
        }),
        summary: msg,
      };
    } else {
      const msg = `Không tìm thấy hàng ${action.rowNumber ? '#' + action.rowNumber : action.idCol || ''}`;
      return {
        result: makeResult(action, 'failed', msg, { error: msg, sheetTitle: activeSheetTitle }),
        summary: msg,
      };
    }
  }

  if (action.type === 'batch_update_rows' && action.updates) {
    const affectedRows: number[] = [];
    action.updates.forEach((item) => {
      const r = findRow(rows, item);
      if (r) {
        const updateData = item.updatedData || (item.colKey ? { [item.colKey]: item.newValue } : {});
        batchUpdates.push({
          rowId: r.id,
          updatedData: { ...r.data, ...updateData },
        });
        affectedRows.push(r.rowNumber);
      }
    });
    const msg = `Cập nhật nhanh ${affectedRows.length} hàng cùng lúc`;
    return {
      result: makeResult(action, 'success', msg, {
        affectedRows,
        sheetTitle: activeSheetTitle,
      }),
      summary: msg,
    };
  }

  if (action.type === 'add_row') {
    await context.onAddRow(action.rowData, action.sheetTitle || activeSheetTitle);
    const msg = 'Thêm 1 hàng mới';
    return {
      result: makeResult(action, 'success', msg, { sheetTitle: activeSheetTitle }),
      summary: msg,
    };
  }

  if (action.type === 'batch_add_rows' && action.rowsData) {
    for (const data of action.rowsData) {
      await context.onAddRow(data, action.sheetTitle || activeSheetTitle);
    }
    const msg = `Thêm nhanh ${action.rowsData.length} hàng mới`;
    return {
      result: makeResult(action, 'success', msg, { sheetTitle: activeSheetTitle }),
      summary: msg,
    };
  }

  if (action.type === 'delete_row') {
    const targetRow = findRow(rows, action);
    if (targetRow) {
      deletedRowIds.push(targetRow.id);
      const msg = `Xóa hàng #${targetRow.rowNumber}`;
      return {
        result: makeResult(action, 'success', msg, {
          affectedRows: [targetRow.rowNumber],
          sheetTitle: activeSheetTitle,
        }),
        summary: msg,
      };
    } else {
      const msg = `Không tìm thấy hàng ${action.rowNumber ? '#' + action.rowNumber : action.idCol || ''}`;
      return {
        result: makeResult(action, 'failed', msg, { error: msg, sheetTitle: activeSheetTitle }),
        summary: msg,
      };
    }
  }

  if (action.type === 'batch_delete_rows') {
    const targetIds: string[] = [];
    const affectedRowNums: number[] = [];

    if (action.idCols && Array.isArray(action.idCols)) {
      action.idCols.forEach((id) => {
        const r = findRow(rows, { idCol: id });
        if (r) {
          targetIds.push(r.id);
          affectedRowNums.push(r.rowNumber);
        }
      });
    }

    if (action.rowNumbers && Array.isArray(action.rowNumbers)) {
      action.rowNumbers.forEach((rNum) => {
        const r = findRow(rows, { rowNumber: rNum });
        if (r && !targetIds.includes(r.id)) {
          targetIds.push(r.id);
          affectedRowNums.push(r.rowNumber);
        }
      });
    }

    if (targetIds.length > 0) {
      deletedRowIds.push(...targetIds);
      const msg = `Xóa hàng loạt ${targetIds.length} hàng`;
      return {
        result: makeResult(action, 'success', msg, {
          affectedRows: affectedRowNums,
          sheetTitle: activeSheetTitle,
        }),
        summary: msg,
      };
    } else {
      const msg = 'Không tìm thấy dòng phù hợp để xóa hàng loạt';
      return {
        result: makeResult(action, 'failed', msg, { error: msg, sheetTitle: activeSheetTitle }),
        summary: msg,
      };
    }
  }

  return null;
}
