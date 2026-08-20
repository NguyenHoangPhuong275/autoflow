import { useState, useCallback } from 'react';
import type { UndoTransaction } from '@/core/undo/undoTypes';

const MAX_UNDO_STACK_SIZE = 20;

export function useUndoStack() {
  const [undoStack, setUndoStack] = useState<UndoTransaction[]>([]);

  /**
   * Push a new transaction to the top of the stack.
   * Enforces the maximum limit of 20 transactions.
   */
  const pushTransaction = useCallback((tx: UndoTransaction) => {
    // Only push if there are valid inverse actions
    if (tx.inverseActions.length === 0) return;

    setUndoStack((prev) => {
      const next = [tx, ...prev];
      return next.slice(0, MAX_UNDO_STACK_SIZE);
    });
  }, []);

  /**
   * Pop the most recent transaction from the stack.
   */
  const popTransaction = useCallback((): UndoTransaction | undefined => {
    let popped: UndoTransaction | undefined;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[0];
      return prev.slice(1);
    });
    return popped;
  }, []);

  /**
   * Peek at the latest transaction without removing it.
   */
  const peekTransaction = useCallback((): UndoTransaction | undefined => {
    return undoStack[0];
  }, [undoStack]);

  /**
   * Clear the entire undo history.
   */
  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  const canUndo = undoStack.length > 0;
  const latestTransaction = undoStack[0] ?? null;

  return {
    undoStack,
    canUndo,
    latestTransaction,
    pushTransaction,
    popTransaction,
    peekTransaction,
    clearUndoStack,
  };
}
