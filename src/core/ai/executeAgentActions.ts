import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionExecutionResult, ActionExecutionReport } from '@/core/ai/actionExecutionTypes';
import { DESTRUCTIVE_ACTION_TYPES, getActionLabel } from '@/core/ai/actionExecutionTypes';
import { executeSheetAction } from './handlers/sheetActionHandlers';
import { executeRowAction } from './handlers/rowActionHandlers';
import { executePipelineAction } from './handlers/pipelineActionHandlers';
import { executeGmailAction } from './handlers/gmailActionHandlers';
import { executeDriveAction } from './handlers/driveActionHandlers';
import { executeDocsAction } from './handlers/docsActionHandlers';
import { getUserErrorMessage } from '@/core/utils/errors';
import { isRecord } from '@/core/utils/errors';

export interface BatchUpdate {
  rowId: string;
  updatedData: Record<string, unknown>;
  colKey?: string;
  newValue?: unknown;
}

export interface CellFormatOptions {
  backgroundColor?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface AgentActionContext {
  rows: DataRow[];
  activeSheetTitle: string;
  onCreateSpreadsheet?: (title: string, sheetTitle?: string, headers?: string[]) => Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitle: string }>;
  onUpdateHeaders?: (sheetTitle: string, newHeaders: string[]) => void;
  onAddColumn?: (sheetTitle: string, columnName: string) => void;
  onDeleteColumn?: (sheetTitle: string, colKey: string) => void;
  onFreezeRowsCols?: (sheetTitle: string, frozenRows?: number, frozenCols?: number) => void | Promise<void>;
  onSortRange?: (sheetTitle: string, colKey: string, ascending?: boolean) => void;
  onUpdateRange?: (sheetTitle: string, range: string, values: unknown[][]) => void;
  onFormatCells?: (sheetTitle: string, rangeA1?: string, options?: CellFormatOptions) => void | Promise<boolean | void>;
  onAutoResizeColumns?: (sheetTitle?: string, startCol?: number, endCol?: number) => void | Promise<void>;
  onSetColumnWidth?: (sheetTitle?: string, pixelSize?: number, startCol?: number, endCol?: number) => void;
  onAddChart?: (sheetTitle: string, chartType?: 'COLUMN' | 'BAR' | 'LINE' | 'PIE', title?: string, domainColIndex?: number, seriesColIndex?: number, rowCount?: number, rowIndexOffset?: number) => void;
  onClearCharts?: (sheetTitle?: string) => void;
  onCreateSheet?: (sheetTitle: string, initialHeaders?: string[]) => void | Promise<void>;
  onDeleteSheet?: (sheetTitle: string) => void;
  onDuplicateSheet?: (sourceTitle: string, newTitle?: string) => void;
  onRenameSheet?: (oldTitle: string, newTitle: string) => void;
  onUpdateRow: (rowId: string, updatedData: Record<string, unknown>, colKey?: string, newValue?: unknown) => void;
  onBatchUpdateRows?: (updates: BatchUpdate[]) => void;
  onBatchDeleteRows?: (rowIds: string[]) => void;
  onAddRow: (customData?: Record<string, unknown>, sheetTitle?: string) => void | Promise<void>;
  onDeleteRow: (rowId: string) => void;
  onClearSheet?: (sheetTitle?: string) => void;
  onSelectSheetTab?: (sheetTitle: string) => void;
  onStartPipeline: () => void;
  onPausePipeline?: () => void;
  onResumePipeline?: () => void;
  onResetPipeline?: () => void;
  onClearLogs?: () => void;
  onChangeSpeed?: (ms: number) => void;
  onFetchFromUrl?: (url: string, sheetTitle?: string) => void | Promise<void>;
  requestDestructiveConfirmation?: (action: AgentAction) => Promise<boolean>;
}

export function makeResult(
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

export async function executeAgentActions(
  actions: AgentAction[],
  context: AgentActionContext
): Promise<{ summaries: string[]; report: ActionExecutionReport }> {
  const summaries: string[] = [];
  const results: ActionExecutionResult[] = [];
  const batchUpdates: BatchUpdate[] = [];
  const deletedRowIds: string[] = [];
  const { rows, activeSheetTitle } = context;
  let createdSpreadsheetUrl = '';
  const orderedActions = prioritizeSourceLoading(actions);

  for (const originalAction of orderedActions) {
    const action = originalAction.type === 'send_email' && createdSpreadsheetUrl
      ? {
          ...originalAction,
          body: originalAction.body?.includes(createdSpreadsheetUrl)
            ? originalAction.body
            : `${originalAction.body || ''}\n\nGoogle Sheets: ${createdSpreadsheetUrl}`.trim(),
        }
      : originalAction;
    try {
      if (DESTRUCTIVE_ACTION_TYPES.has(action.type) && context.requestDestructiveConfirmation) {
        const confirmed = await context.requestDestructiveConfirmation(action);
        if (!confirmed) {
          const msg = `Đã hủy thao tác ${getActionLabel(action)} trên "${action.sheetTitle || activeSheetTitle}".`;
          summaries.push(msg);
          results.push(makeResult(action, 'cancelled', msg, { sheetTitle: action.sheetTitle || activeSheetTitle }));
          continue;
        }
      }

      const handled =
        (await executeSheetAction(action, actions, context, activeSheetTitle, makeResult)) ||
        (await executeRowAction(action, context, activeSheetTitle, batchUpdates, deletedRowIds, makeResult)) ||
        (await executePipelineAction(action, context, rows, activeSheetTitle, makeResult)) ||
        (await executeGmailAction(action, makeResult)) ||
        (await executeDriveAction(action, makeResult)) ||
        (await executeDocsAction(action, makeResult));

      if (handled) {
        summaries.push(handled.summary);
        results.push(handled.result);
        if (action.type === 'create_spreadsheet' && isRecord(handled.result.data) && typeof handled.result.data.spreadsheetUrl === 'string') {
          createdSpreadsheetUrl = handled.result.data.spreadsheetUrl;
        }
      } else {
        const msg = `Chưa thể thực hiện thao tác ${getActionLabel(action)}. Vui lòng thử lại.`;
        summaries.push(msg);
        results.push(makeResult(action, 'failed', msg));
      }
    } catch (error: unknown) {
      const errorMessage = getUserErrorMessage(error, 'Vui lòng kiểm tra dữ liệu và thử lại.');
      const msg = `Không thể thực hiện thao tác ${getActionLabel(action)}. ${errorMessage}`;
      summaries.push(msg);
      results.push(makeResult(action, 'failed', msg, {
        error: errorMessage,
        sheetTitle: action.sheetTitle || activeSheetTitle,
      }));
      if (action.type === 'create_spreadsheet') break;
    }
  }

  if (batchUpdates.length > 0) {
    if (context.onBatchUpdateRows) {
      context.onBatchUpdateRows(batchUpdates);
    } else {
      batchUpdates.forEach((u) => context.onUpdateRow(u.rowId, u.updatedData, u.colKey, u.newValue));
    }
  }

  if (deletedRowIds.length > 0) {
    if (context.onBatchDeleteRows) {
      context.onBatchDeleteRows(deletedRowIds);
    } else {
      deletedRowIds.forEach((id) => context.onDeleteRow(id));
    }
  }

  const report: ActionExecutionReport = {
    results,
    totalActions: results.length,
    successCount: results.filter((r) => r.status === 'success').length,
    failedCount: results.filter((r) => r.status === 'failed').length,
    cancelledCount: results.filter((r) => r.status === 'cancelled').length,
  };

  return { summaries, report };
}

function prioritizeSourceLoading(actions: AgentAction[]): AgentAction[] {
  const sourceLoadingActions = actions.filter((action) => action.type === 'load_url');
  if (sourceLoadingActions.length === 0) return actions;
  return [...sourceLoadingActions, ...actions.filter((action) => action.type !== 'load_url')];
}
