import React, { useRef } from 'react';
import {
  ArrowUpTrayIcon as Upload,
  FolderIcon as Folder,
  EnvelopeIcon as Mail,
  DocumentTextIcon as FileDoc,
} from '@heroicons/react/24/outline';

interface ControlBarProps {
  isLoading: boolean;
  onFileUpload: (file: File) => void;
  onOpenDrive?: () => void;
  onOpenGmail?: () => void;
  onOpenDocs?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isLoading,
  onFileUpload,
  onOpenDrive,
  onOpenGmail,
  onOpenDocs,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-9 px-2 sm:px-3 py-1.5 panel-card rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
      <div className="flex min-w-0 items-center gap-2 text-[10px] sm:text-[11px]">
        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-200 truncate">Nguồn dữ liệu</p>
          <p className="text-[9px] text-slate-500 truncate">Chọn trực tiếp từ tài khoản Google hoặc tải tệp Excel/CSV</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenDrive && (
          <button
            onClick={onOpenDrive}
            className="px-2 sm:px-2.5 py-1 rounded bg-[#0b1528] hover:bg-[#132342] text-blue-300 hover:text-white flex items-center gap-1 border border-blue-900/60 shrink-0 text-[10px] sm:text-[11px] transition-colors"
            title="Chọn bảng tính từ tài khoản Google"
          >
            <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Chọn từ Drive</span>
          </button>
        )}

        {onOpenGmail && (
          <button
            onClick={onOpenGmail}
            className="px-2 sm:px-2.5 py-1 rounded bg-[#200f14] hover:bg-[#341720] text-rose-300 hover:text-white flex items-center gap-1 border border-rose-900/60 shrink-0 text-[10px] sm:text-[11px] transition-colors"
            title="Duyệt và trích xuất dữ liệu từ hộp thư Gmail"
          >
            <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Gmail</span>
          </button>
        )}

        {onOpenDocs && (
          <button
            onClick={onOpenDocs}
            className="px-2 sm:px-2.5 py-1 rounded bg-[#0b1d24] hover:bg-[#122e3a] text-cyan-300 hover:text-white flex items-center gap-1 border border-cyan-900/60 shrink-0 text-[10px] sm:text-[11px] transition-colors"
            title="Đọc văn bản từ Google Docs"
          >
            <FileDoc className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Chọn Docs</span>
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-2 sm:px-2.5 py-1 rounded bg-[#0e1422] hover:bg-[#161f32] text-slate-300 hover:text-white flex items-center gap-1.5 border border-[#1a2336] shrink-0 text-[10px] sm:text-[11px] transition-colors"
        >
          <Upload className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Tải Excel/CSV</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            className="hidden"
          />
        </button>
      </div>
    </div>
  );
};
