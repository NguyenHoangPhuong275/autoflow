import React from 'react';
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
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0e1422] border border-rose-800/50 rounded-xl p-0 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-rose-950/40 border-b border-rose-800/50">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldExclamationIcon className="w-5 h-5 text-rose-400" />
            <span>XÁC NHẬN THAO TÁC PHÁ HỦY</span>
          </div>
          <button
            onClick={onCancel}
            className="rounded p-1 text-slate-400 hover:bg-rose-950 hover:text-rose-300 transition-colors"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          {/* Warning icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-700/60 flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-200">
                {pendingAction.action.type === 'delete_sheet' && 'Xóa trang tính'}
                {pendingAction.action.type === 'clear_sheet' && 'Xóa sạch dữ liệu'}
                {pendingAction.action.type === 'batch_delete_rows' && 'Xóa nhiều dòng'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Trang: <span className="text-slate-200 font-semibold">{pendingAction.targetSheet}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-3 rounded-lg bg-[#070a12] border border-rose-800/30 text-xs text-rose-200 leading-relaxed">
            {pendingAction.description}
          </div>

          {/* Affected rows indicator */}
          {pendingAction.affectedRowCount !== undefined && pendingAction.affectedRowCount > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-700/40 rounded-lg px-3 py-2">
              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sẽ ảnh hưởng đến <strong>{pendingAction.affectedRowCount}</strong> dòng dữ liệu</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#1a2336] bg-[#0b101c]">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg bg-[#090d16] hover:bg-[#161f32] text-slate-300 border border-[#1a2336] text-xs font-bold transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors border border-rose-500/50 flex items-center gap-1.5"
          >
            <ShieldExclamationIcon className="w-3.5 h-3.5" />
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};
