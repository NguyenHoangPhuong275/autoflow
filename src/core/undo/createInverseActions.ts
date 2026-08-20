import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionSnapshot } from '@/core/undo/undoTypes';
import { resolveTargetCell } from '../ai/formulaUtils.ts';

function findSnapshotRow(
  rows: DataRow[],
  target: { rowId?: string; rowNumber?: number; idCol?: string }
): DataRow | undefined {
  return rows.find(
    (row) =>
      (target.rowId && row.id === target.rowId) ||
      (target.rowNumber && row.rowNumber === target.rowNumber) ||
      (target.idCol &&
        (String(row.data['ID'] ?? row.data['id'] ?? '').toLowerCase() ===
          String(target.idCol).toLowerCase() ||
          row.id === target.idCol))
  );
}

function findColumnKey(row: DataRow, requestedColumn: string): string {
  return (
    Object.keys(row.data).find(
      (col) => col.toLowerCase() === requestedColumn.toLowerCase()
    ) || requestedColumn
  );
}

/**
 * Creates inverse actions for a batch of executed actions based on the before-state snapshot.
 * Actions are processed in reverse order so that rollback correctly undoes step by step.
 */
export function createInverseActions(
  actions: AgentAction[],
  snapshot: ActionSnapshot
): AgentAction[] {
  const inverseActions: AgentAction[] = [];
  const { rows, headers, sheetTitle } = snapshot;

  // Process in reverse order for correct rollback sequence
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];

    switch (action.type) {
      case 'update_row': {
        const targetRow = findSnapshotRow(rows, action);
        if (targetRow) {
          const requestedCol = action.colKey || Object.keys(action.updatedData || {})[0] || 'price';
          const matchedCol = findColumnKey(targetRow, requestedCol);
          const previousValue = targetRow.data[matchedCol] ?? '';

          inverseActions.push({
            type: 'update_row',
            rowNumber: targetRow.rowNumber,
            idCol: targetRow.data['ID'] || targetRow.data['id'] || targetRow.id,
            colKey: matchedCol,
            newValue: previousValue,
            updatedData: { ...targetRow.data, [matchedCol]: previousValue },
          });
        }
        break;
      }

      case 'batch_update_rows': {
        if (action.updates && action.updates.length > 0) {
          const inverseUpdates: Array<{
            idCol?: string;
            rowNumber?: number;
            colKey: string;
            newValue: unknown;
          }> = [];

          action.updates.forEach((update) => {
            const targetRow = findSnapshotRow(rows, update);
            if (targetRow) {
              const matchedCol = findColumnKey(targetRow, update.colKey);
              inverseUpdates.push({
                idCol: targetRow.data['ID'] || targetRow.data['id'] || targetRow.id,
                rowNumber: targetRow.rowNumber,
                colKey: matchedCol,
                newValue: targetRow.data[matchedCol] ?? '',
              });
            }
          });

          if (inverseUpdates.length > 0) {
            inverseActions.push({
              type: 'batch_update_rows',
              updates: inverseUpdates,
            });
          }
        }
        break;
      }

      case 'add_row': {
        const addedId = action.rowData?.id || action.rowData?.ID;
        if (addedId) {
          inverseActions.push({
            type: 'delete_row',
            idCol: String(addedId),
          });
        } else {
          // If no explicit ID, target the last row
          inverseActions.push({
            type: 'delete_row',
            rowNumber: rows.length + 1,
          });
        }
        break;
      }

      case 'batch_add_rows': {
        if (action.rowsData && action.rowsData.length > 0) {
          const idCols: string[] = [];
          const rowNumbers: number[] = [];

          action.rowsData.forEach((r, idx) => {
            const id = r.id || r.ID;
            if (id) {
              idCols.push(String(id));
            } else {
              rowNumbers.push(rows.length + 1 + idx);
            }
          });

          inverseActions.push({
            type: 'batch_delete_rows',
            idCols: idCols.length > 0 ? idCols : undefined,
            rowNumbers: rowNumbers.length > 0 ? rowNumbers : undefined,
          });
        }
        break;
      }

      case 'delete_row': {
        const targetRow = findSnapshotRow(rows, action);
        if (targetRow) {
          inverseActions.push({
            type: 'add_row',
            rowData: targetRow.data,
          });
        }
        break;
      }

      case 'batch_delete_rows': {
        const deletedRows: DataRow[] = [];
        action.idCols?.forEach((idCol) => {
          const targetRow = findSnapshotRow(rows, { idCol });
          if (targetRow && !deletedRows.includes(targetRow)) {
            deletedRows.push(targetRow);
          }
        });
        action.rowNumbers?.forEach((rowNumber) => {
          const targetRow = findSnapshotRow(rows, { rowNumber });
          if (targetRow && !deletedRows.includes(targetRow)) {
            deletedRows.push(targetRow);
          }
        });

        if (deletedRows.length > 0) {
          inverseActions.push({
            type: 'batch_add_rows',
            rowsData: deletedRows.map((r) => r.data),
          });
        }
        break;
      }

      case 'clear_sheet': {
        const targetSheet = action.sheetTitle || sheetTitle;
        if (rows.length > 0) {
          inverseActions.push({
            type: 'batch_add_rows',
            sheetTitle: targetSheet,
            rowsData: rows.map((r) => r.data),
          });
        }
        break;
      }

      case 'update_headers': {
        const targetSheet = action.sheetTitle || sheetTitle;
        if (headers.length > 0) {
          inverseActions.push({
            type: 'update_headers',
            sheetTitle: targetSheet,
            headers: [...headers],
          });
        }
        break;
      }

      case 'add_column': {
        const targetSheet = action.sheetTitle || sheetTitle;
        if (action.columnName) {
          inverseActions.push({
            type: 'delete_column',
            sheetTitle: targetSheet,
            colKey: action.columnName,
          });
        }
        break;
      }

      case 'delete_column': {
        const targetSheet = action.sheetTitle || sheetTitle;
        if (action.colKey) {
          // Re-add column and restore values
          inverseActions.push({
            type: 'add_column',
            sheetTitle: targetSheet,
            columnName: action.colKey,
          });

          const restoreUpdates: Array<{
            idCol?: string;
            rowNumber?: number;
            colKey: string;
            newValue: unknown;
          }> = [];

          rows.forEach((r) => {
            if (r.data[action.colKey!] !== undefined) {
              restoreUpdates.push({
                idCol: r.data['ID'] || r.data['id'] || r.id,
                rowNumber: r.rowNumber,
                colKey: action.colKey!,
                newValue: r.data[action.colKey!],
              });
            }
          });

          if (restoreUpdates.length > 0) {
            inverseActions.push({
              type: 'batch_update_rows',
              updates: restoreUpdates,
            });
          }
        }
        break;
      }

      case 'create_sheet': {
        if (action.sheetTitle) {
          inverseActions.push({
            type: 'delete_sheet',
            sheetTitle: action.sheetTitle,
          });
        }
        break;
      }

      case 'delete_sheet': {
        if (action.sheetTitle) {
          inverseActions.push({
            type: 'create_sheet',
            sheetTitle: action.sheetTitle,
            headers: [...headers],
          });
          if (rows.length > 0) {
            inverseActions.push({
              type: 'batch_add_rows',
              sheetTitle: action.sheetTitle,
              rowsData: rows.map((r) => r.data),
            });
          }
        }
        break;
      }

      case 'rename_sheet': {
        if (action.oldSheetTitle && action.newSheetTitle) {
          inverseActions.push({
            type: 'rename_sheet',
            oldSheetTitle: action.newSheetTitle,
            newSheetTitle: action.oldSheetTitle,
          });
        }
        break;
      }

      case 'duplicate_sheet': {
        const dupTitle = action.newSheetTitle || `${action.sourceSheetTitle}_Copy`;
        inverseActions.push({
          type: 'delete_sheet',
          sheetTitle: dupTitle,
        });
        break;
      }

      case 'set_formula': {
        const targetSheet = action.sheetTitle || sheetTitle;
        const colKey = action.colKey || 'A1';
        const targetInfo = resolveTargetCell(colKey, headers);
        const colName = targetInfo.colName;

        if (colName && rows.length > 0) {
          const restoreUpdates: Array<{
            idCol?: string;
            rowNumber?: number;
            colKey: string;
            newValue: unknown;
          }> = [];

          rows.forEach((r) => {
            restoreUpdates.push({
              idCol: r.data['ID'] || r.data['id'] || r.id,
              rowNumber: r.rowNumber,
              colKey: colName,
              newValue: r.data[colName] ?? '',
            });
          });

          if (restoreUpdates.length > 0) {
            inverseActions.push({
              type: 'batch_update_rows',
              sheetTitle: targetSheet,
              updates: restoreUpdates,
            });
          }
        }
        break;
      }

      default:
        // Actions without direct inverse (e.g. format_cells, start_pipeline) do not block rollback
        break;
    }
  }

  return inverseActions;
}
