import { useState, useCallback } from 'react';
import type { AgentAction } from '@/core/ai/agentTypes';
import {
  DESTRUCTIVE_ACTION_TYPES,
  describeDestructiveAction,
  type PendingDestructiveAction,
} from '@/core/ai/actionExecutionTypes';

/**
 * Manages a queue of destructive actions that require user confirmation.
 * Only the first pending action is shown in the dialog at a time.
 */
export function useDestructiveActionQueue() {
  const [pendingAction, setPendingAction] = useState<PendingDestructiveAction | null>(null);

  /**
   * If the action is destructive, enqueue it and return a Promise that
   * resolves to `true` (confirmed) or `false` (cancelled).
   * If not destructive, resolves immediately to `true`.
   */
  const requestConfirmation = useCallback(
    (action: AgentAction, activeSheetTitle: string, rowCount?: number): Promise<boolean> => {
      if (!DESTRUCTIVE_ACTION_TYPES.has(action.type)) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        const id = `destructive-${action.type}-${Date.now()}`;
        const targetSheet = action.sheetTitle || activeSheetTitle;
        const description = describeDestructiveAction(action, activeSheetTitle);

        let affectedRowCount: number | undefined;
        if (action.type === 'batch_delete_rows') {
          affectedRowCount = (action.idCols?.length || 0) + (action.rowNumbers?.length || 0);
        } else if (action.type === 'clear_sheet') {
          affectedRowCount = rowCount;
        }

        setPendingAction({
          id,
          action,
          targetSheet,
          description,
          affectedRowCount,
          resolve: (confirmed: boolean) => {
            setPendingAction(null);
            resolve(confirmed);
          },
        });
      });
    },
    []
  );

  const confirmAction = useCallback(() => {
    pendingAction?.resolve(true);
  }, [pendingAction]);

  const cancelAction = useCallback(() => {
    pendingAction?.resolve(false);
  }, [pendingAction]);

  return {
    pendingAction,
    requestConfirmation,
    confirmAction,
    cancelAction,
  };
}
