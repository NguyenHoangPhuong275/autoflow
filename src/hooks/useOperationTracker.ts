import { useState, useCallback, useRef } from 'react';

export type OperationLabel =
  | 'row'
  | 'range'
  | 'format'
  | 'chart'
  | 'sheet'
  | 'header'
  | 'column'
  | 'sort'
  | 'freeze';

interface TrackedOperation {
  id: string;
  label: OperationLabel;
  startedAt: number;
}

/**
 * Tracks multiple concurrent Google API operations.
 * Each operation is identified by a unique ID and cleaned up in `finally`.
 * Two parallel requests won't prematurely cancel the loading state.
 */
export function useOperationTracker() {
  const [operations, setOperations] = useState<TrackedOperation[]>([]);
  const counterRef = useRef(0);

  const startOperation = useCallback((label: OperationLabel): string => {
    const id = `op-${label}-${++counterRef.current}-${Date.now()}`;
    setOperations((prev) => [...prev, { id, label, startedAt: Date.now() }]);
    return id;
  }, []);

  const endOperation = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  /**
   * Wrap an async operation with automatic tracking.
   * The operation ID is cleaned up in `finally` regardless of success/failure.
   */
  const trackOperation = useCallback(
    async <T>(label: OperationLabel, fn: () => Promise<T>): Promise<T> => {
      const id = startOperation(label);
      try {
        return await fn();
      } finally {
        endOperation(id);
      }
    },
    [startOperation, endOperation]
  );

  const isMutating = operations.length > 0;

  const pendingOperations = operations.map((op) => op.label);

  /** Human-readable label for the current operations */
  const operationSummary: string | null = isMutating
    ? `Đang xử lý: ${[...new Set(pendingOperations)].map(labelToVi).join(', ')}...`
    : null;

  return {
    startOperation,
    endOperation,
    trackOperation,
    isMutating,
    pendingOperations,
    operationSummary,
  };
}

function labelToVi(label: OperationLabel): string {
  const map: Record<OperationLabel, string> = {
    row: 'dữ liệu hàng',
    range: 'dải ô',
    format: 'định dạng',
    chart: 'biểu đồ',
    sheet: 'trang tính',
    header: 'tiêu đề cột',
    column: 'cột',
    sort: 'sắp xếp',
    freeze: 'cố định hàng/cột',
  };
  return map[label] || label;
}
