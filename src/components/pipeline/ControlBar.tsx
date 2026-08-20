import React, { useRef } from 'react';
import {
  ArrowPathIcon as Loader2,
  ArrowRightIcon as ArrowRight,
  ArrowUpTrayIcon as Upload,
  LinkIcon as Link2,
  FolderIcon as Folder,
  EnvelopeIcon as Mail,
  DocumentTextIcon as FileDoc,
} from '@heroicons/react/24/outline';

interface ControlBarProps {
  url: string;
  setUrl: (url: string) => void;
  isLoading: boolean;
  onFileUpload: (file: File) => void;
  onFetchFromUrl: (url: string) => void;
  onOpenDrive?: () => void;
  onOpenGmail?: () => void;
  onOpenDocs?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  url,
  setUrl,
  isLoading,
  onFileUpload,
  onFetchFromUrl,
  onOpenDrive,
  onOpenGmail,
  onOpenDocs,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFetchFromUrl(url);
    }
  };

  return (
    <div className="min-h-9 px-2 sm:px-3 py-1.5 panel-card rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
      <div className="flex-1 min-w-[240px] flex items-center bg-[#070a12] rounded border border-[#1a2336] px-2 sm:px-2.5 py-1 focus-within:border-indigo-500 transition-colors">
        <Link2 className="w-3.5 h-3.5 text-slate-500 mr-1.5 sm:mr-2 shrink-0" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Dán link Google Sheets hoặc bấm chọn từ Drive / Gmail / Docs..."
          className="w-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none text-[10px] sm:text-[11px]"
        />
        <button
          onClick={() => onFetchFromUrl(url)}
          disabled={isLoading || !url.trim()}
          className="ml-1.5 sm:ml-2 px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] sm:text-[10px] flex items-center gap-1 shrink-0 disabled:opacity-40 transition-colors shadow-sm"
          title="Tải dữ liệu từ đường dẫn"
        >
          {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ArrowRight className="w-2.5 h-2.5" />}
          <span>Nạp Sheet</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenDrive && (
          <button
            onClick={onOpenDrive}
            className="px-2 sm:px-2.5 py-1 rounded bg-[#0b1528] hover:bg-[#132342] text-blue-300 hover:text-white flex items-center gap-1 border border-blue-900/60 shrink-0 text-[10px] sm:text-[11px] transition-colors"
            title="Duyệt và nạp file từ Google Drive"
          >
            <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Drive</span>
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
            <span>Docs</span>
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2 sm:px-2.5 py-1 rounded bg-[#0e1422] hover:bg-[#161f32] text-slate-300 hover:text-white flex items-center gap-1.5 border border-[#1a2336] shrink-0 text-[10px] sm:text-[11px] transition-colors"
        >
          <Upload className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Tải Excel</span>
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
