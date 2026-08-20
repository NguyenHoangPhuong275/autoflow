import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';

/** Snapshot of state before an action batch is executed */
export interface ActionSnapshot {
  sheetTitle: string;
  rows: DataRow[];
  headers: string[];
  allSheetHeaders?: Record<string, string[]>;
  timestamp: number;
}

/** Represents a single undoable transaction */
export interface UndoTransaction {
  id: string;
  timestamp: number;
  description: string;
  sheetTitle: string;
  originalActions: AgentAction[];
  inverseActions: AgentAction[];
  snapshot: ActionSnapshot;
  status: 'ready' | 'rolled_back' | 'partially_rolled_back' | 'failed';
}

/** Result of an undo/rollback operation */
export interface UndoRollbackResult {
  transactionId: string;
  status: 'success' | 'partially_rolled_back' | 'failed';
  message: string;
  executedInverseCount: number;
  totalInverseCount: number;
  error?: string;
}
