import React, { useEffect } from 'react';
import { ExclamationTriangleIcon, ShieldExclamationIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { PendingDestructiveAction } from '@/core/ai/actionExecutionTypes';

interface DestructiveActionDialogProps {
  pendingAction: PendingDestructiveAction;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DestructiveActionDialog: React.FC<DestructiveActionDialogProps> = ({
  pendingAction,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans animate-in fade-in duration-150"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="destructive-title"
    >
      <div className="w-full max-w-md bg-[#0c121e]/95 border border-rose-600/40 rounded-2xl text-slate-100 shadow-[0_25px_50px_-12px_rgba(225,29,72,0.35)] overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-950/60 to-rose-900/30 border-b border-rose-800/40">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm sm:text-base">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <ShieldExclamationIcon className="w-5 h-5 text-rose-400" />
            </div>
            <span id="destructive-title">Xác Nhận Thao Tác Phá Hủy</span>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors"
            aria-label="Đóng"
            title="Đóng (Esc)"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-rose-100">
                {pendingAction.action.type === 'delete_sheet' && 'Xóa trang tính vĩnh viễn'}
                {pendingAction.action.type === 'clear_sheet' && 'Xóa sạch toàn bộ dữ liệu trang tính'}
                {pendingAction.action.type === 'batch_delete_rows' && 'Xóa nhiều dòng dữ liệu'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Trang mục tiêu: <span className="text-slate-200 font-semibold">{pendingAction.targetSheet}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111827] border border-rose-800/30 text-xs text-rose-200 leading-relaxed font-sans">
            {pendingAction.description}
          </div>

          {pendingAction.affectedRowCount !== undefined && pendingAction.affectedRowCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Thao tác này sẽ xóa <strong>{pendingAction.affectedRowCount}</strong> dòng dữ liệu</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-800/80 bg-[#090e18]/90">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-semibold transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-950/50 flex items-center gap-1.5"
          >
            <ShieldExclamationIcon className="w-4 h-4" />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
