import type { AgentAction } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import type { AgentActionContext } from '@/core/ai/executeAgentActions';

export async function executePipelineAction(
  action: AgentAction,
  context: AgentActionContext,
  rows: DataRow[],
  activeSheetTitle: string,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  if (action.type === 'start_pipeline') {
    context.onStartPipeline();
    const msg = 'Bắt đầu tự động hóa';
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'pause_pipeline') {
    context.onPausePipeline?.();
    const msg = 'Tạm dừng quy trình';
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'resume_pipeline') {
    context.onResumePipeline?.();
    const msg = 'Tiếp tục quy trình';
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'reset_pipeline') {
    context.onResetPipeline?.();
    const msg = 'Đặt lại toàn bộ trạng thái về Chờ xử lý';
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'change_speed' && action.speedMs) {
    context.onChangeSpeed?.(action.speedMs);
    const msg = `Đổi tốc độ thực thi sang ${action.speedMs}ms`;
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'clear_logs') {
    context.onClearLogs?.();
    const msg = 'Xóa nhật ký Terminal';
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'load_url' && action.url) {
    context.onFetchFromUrl?.(action.url);
    const msg = `Nạp dữ liệu từ URL: ${action.url}`;
    return { result: makeResult(action, 'success', msg), summary: msg };
  }

  if (action.type === 'export_csv') {
    try {
      if (rows.length === 0) {
        const msg = 'Không có dữ liệu để xuất CSV.';
        return { result: makeResult(action, 'failed', msg), summary: msg };
      } else {
        const headers = Object.keys(rows[0].data);
        const csvLines = [
          headers.join(','),
          ...rows.map((row) =>
            headers.map((h) => {
              const val = String(row.data[h] ?? '');
              return val.includes(',') || val.includes('"') || val.includes('\n')
                ? `"${val.replace(/"/g, '""')}"`
                : val;
            }).join(',')
          ),
        ];
        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const csvUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = csvUrl;
        link.download = `${activeSheetTitle || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(csvUrl);
        const msg = `Đã xuất CSV (${rows.length} hàng) — tệp đang tải về.`;
        return { result: makeResult(action, 'success', msg), summary: msg };
      }
    } catch (e: any) {
      console.warn('[executeAgentActions] Export CSV failed:', e);
      const msg = 'Lỗi khi xuất CSV.';
      return { result: makeResult(action, 'failed', msg, { error: e.message }), summary: msg };
    }
  }

  return null;
}
