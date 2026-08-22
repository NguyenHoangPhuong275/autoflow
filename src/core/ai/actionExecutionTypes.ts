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

const ACTION_LABELS: Record<AgentAction['type'], string> = {
  create_spreadsheet: 'tạo bảng tính',
  create_sheet: 'tạo trang tính',
  delete_sheet: 'xóa trang tính',
  duplicate_sheet: 'nhân bản trang tính',
  rename_sheet: 'đổi tên trang tính',
  switch_sheet: 'chuyển trang tính',
  clear_sheet: 'xóa dữ liệu trang tính',
  update_headers: 'cập nhật tiêu đề cột',
  add_column: 'thêm cột',
  delete_column: 'xóa cột',
  freeze_rows_cols: 'cố định hàng và cột',
  sort_range: 'sắp xếp dữ liệu',
  update_range: 'cập nhật vùng dữ liệu',
  set_formula: 'thiết lập công thức',
  format_cells: 'định dạng ô',
  auto_resize_columns: 'tự động căn chỉnh cột',
  set_column_width: 'điều chỉnh độ rộng cột',
  add_chart: 'tạo biểu đồ',
  clear_charts: 'xóa biểu đồ',
  update_row: 'cập nhật hàng',
  batch_update_rows: 'cập nhật nhiều hàng',
  add_row: 'thêm hàng',
  batch_add_rows: 'thêm nhiều hàng',
  delete_row: 'xóa hàng',
  batch_delete_rows: 'xóa nhiều hàng',
  start_pipeline: 'bắt đầu quy trình',
  pause_pipeline: 'tạm dừng quy trình',
  resume_pipeline: 'tiếp tục quy trình',
  reset_pipeline: 'đặt lại quy trình',
  change_speed: 'thay đổi tốc độ xử lý',
  clear_logs: 'xóa nhật ký tác vụ',
  export_csv: 'xuất dữ liệu CSV',
  load_url: 'nạp dữ liệu',
  search_emails: 'tìm kiếm email',
  read_email: 'đọc email',
  send_email: 'gửi email',
  trash_email: 'chuyển email vào thùng rác',
  delete_email: 'xóa email',
  search_drive: 'tìm kiếm trên Google Drive',
  create_drive_folder: 'tạo thư mục Google Drive',
  rename_drive_file: 'đổi tên tệp Google Drive',
  delete_drive_file: 'xóa tệp Google Drive',
  read_google_doc: 'đọc tài liệu Google Docs',
  create_google_doc: 'tạo tài liệu Google Docs',
  append_google_doc: 'cập nhật tài liệu Google Docs',
};

export function getActionLabel(action: AgentAction): string {
  return ACTION_LABELS[action.type];
}

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
      lines.push(`✅ ${getActionLabel({ type: r.type })}: ${r.message}`);
    } else if (r.status === 'failed') {
      lines.push(`❌ ${getActionLabel({ type: r.type })}: ${r.error || r.message}`);
    } else {
      lines.push(`⏹️ ${getActionLabel({ type: r.type })}: Người dùng đã hủy`);
    }
  }
  return lines.join('\n');
}
