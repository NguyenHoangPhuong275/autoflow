import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionExecutionResult, ActionExecutionReport } from '@/core/ai/actionExecutionTypes';
import { DESTRUCTIVE_ACTION_TYPES } from '@/core/ai/actionExecutionTypes';
import { executeSheetAction } from './handlers/sheetActionHandlers';
import { executeRowAction } from './handlers/rowActionHandlers';
import { executePipelineAction } from './handlers/pipelineActionHandlers';
import { executeGmailAction } from './handlers/gmailActionHandlers';
import { executeDriveAction } from './handlers/driveActionHandlers';
import { executeDocsAction } from './handlers/docsActionHandlers';
import { getErrorMessage } from '@/core/utils/errors';

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
  onUpdateHeaders?: (sheetTitle: string, newHeaders: string[]) => void;
  onAddColumn?: (sheetTitle: string, columnName: string) => void;
  onDeleteColumn?: (sheetTitle: string, colKey: string) => void;
  onFreezeRowsCols?: (sheetTitle: string, frozenRows?: number, frozenCols?: number) => void;
  onSortRange?: (sheetTitle: string, colKey: string, ascending?: boolean) => void;
  onUpdateRange?: (sheetTitle: string, range: string, values: unknown[][]) => void;
  onFormatCells?: (sheetTitle: string, rangeA1?: string, options?: CellFormatOptions) => void;
  onAutoResizeColumns?: (sheetTitle?: string, startCol?: number, endCol?: number) => void;
  onSetColumnWidth?: (sheetTitle?: string, pixelSize?: number, startCol?: number, endCol?: number) => void;
  onAddChart?: (sheetTitle: string, chartType?: 'COLUMN' | 'BAR' | 'LINE' | 'PIE', title?: string, domainColIndex?: number, seriesColIndex?: number, rowCount?: number, rowIndexOffset?: number) => void;
  onClearCharts?: (sheetTitle?: string) => void;
  onCreateSheet?: (sheetTitle: string, initialHeaders?: string[]) => void;
  onDeleteSheet?: (sheetTitle: string) => void;
  onDuplicateSheet?: (sourceTitle: string, newTitle?: string) => void;
  onRenameSheet?: (oldTitle: string, newTitle: string) => void;
  onUpdateRow: (rowId: string, updatedData: Record<string, unknown>, colKey?: string, newValue?: unknown) => void;
  onBatchUpdateRows?: (updates: BatchUpdate[]) => void;
  onBatchDeleteRows?: (rowIds: string[]) => void;
  onAddRow: (customData?: Record<string, unknown>) => void;
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

  for (const action of actions) {
    try {
      if (DESTRUCTIVE_ACTION_TYPES.has(action.type) && context.requestDestructiveConfirmation) {
        const confirmed = await context.requestDestructiveConfirmation(action);
        if (!confirmed) {
          const msg = `Đã hủy: ${action.type} trên "${action.sheetTitle || activeSheetTitle}"`;
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
      } else {
        const msg = `Không tìm thấy bộ xử lý cho action "${action.type}".`;
        summaries.push(msg);
        results.push(makeResult(action, 'failed', msg));
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error(`Lỗi thực thi action "${action.type}": ${errorMessage}`);
      const msg = `Lỗi thực thi ${action.type}: ${errorMessage}`;
      summaries.push(msg);
      results.push(makeResult(action, 'failed', msg, {
        error: errorMessage,
        sheetTitle: action.sheetTitle || activeSheetTitle,
      }));
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
