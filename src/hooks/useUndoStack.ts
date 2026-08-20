import { useState, useCallback } from 'react';
import type { UndoTransaction } from '@/core/undo/undoTypes';

const MAX_UNDO_STACK_SIZE = 20;

export function useUndoStack() {
  const [undoStack, setUndoStack] = useState<UndoTransaction[]>([]);

  const pushTransaction = useCallback((tx: UndoTransaction) => {
    if (tx.inverseActions.length === 0) return;

    setUndoStack((prev) => {
      const next = [tx, ...prev];
      return next.slice(0, MAX_UNDO_STACK_SIZE);
    });
  }, []);

  const popTransaction = useCallback((): UndoTransaction | undefined => {
    let popped: UndoTransaction | undefined;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[0];
      return prev.slice(1);
    });
    return popped;
  }, []);

  const canUndo = undoStack.length > 0;

  return {
    undoStack,
    canUndo,
    pushTransaction,
    popTransaction,
  };
}
