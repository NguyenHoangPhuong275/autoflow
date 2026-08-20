import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';

export interface ActionSnapshot {
  sheetTitle: string;
  rows: DataRow[];
  headers: string[];
  allSheetHeaders?: Record<string, string[]>;
  timestamp: number;
}

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
