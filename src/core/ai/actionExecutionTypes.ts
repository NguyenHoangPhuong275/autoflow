import type { AgentAction } from '@/core/ai/agentTypes';

export interface ActionExecutionResult {
  actionId: string;
  type: AgentAction['type'];
  status: 'success' | 'failed' | 'cancelled';
  message: string;
  error?: string;
  affectedRows?: number[];
  sheetTitle?: string;
  data?: unknown;
  emails?: unknown;
  email?: unknown;
  files?: unknown;
  doc?: unknown;
  [key: string]: unknown;
}

export interface ActionExecutionReport {
  results: ActionExecutionResult[];
  totalActions: number;
  successCount: number;
  failedCount: number;
  cancelledCount: number;
}

export const DESTRUCTIVE_ACTION_TYPES: ReadonlySet<AgentAction['type']> = new Set([
  'delete_sheet',
  'clear_sheet',
  'batch_delete_rows',
]);

export interface PendingDestructiveAction {
  id: string;
  action: AgentAction;
  targetSheet: string;
  description: string;
  affectedRowCount?: number;
  resolve: (confirmed: boolean) => void;
}

export function describeDestructiveAction(action: AgentAction, activeSheetTitle: string): string {
  const sheet = action.sheetTitle || activeSheetTitle;
  switch (action.type) {
    case 'delete_sheet':
      return `Xóa hoàn toàn trang tính "${sheet}" — không thể hoàn tác!`;
    case 'clear_sheet':
      return `Xóa sạch toàn bộ dữ liệu trên trang "${sheet}" — không thể hoàn tác!`;
    case 'batch_delete_rows': {
      const count = (action.idCols?.length || 0) + (action.rowNumbers?.length || 0);
      return `Xóa ${count} dòng dữ liệu trên trang "${sheet}" — không thể hoàn tác!`;
    }
    default:
      return `Thao tác phá hủy trên "${sheet}"`;
  }
}

export function buildModelFacingSummary(report: ActionExecutionReport): string {
  const lines: string[] = [];
  for (const r of report.results) {
    if (r.status === 'success') {
      lines.push(`✅ ${r.type}: ${r.message}`);
    } else if (r.status === 'failed') {
      lines.push(`❌ ${r.type}: ${r.error || r.message}`);
    } else {
      lines.push(`⏹️ ${r.type}: Người dùng đã hủy`);
    }
  }
  return lines.join('\n');
}
