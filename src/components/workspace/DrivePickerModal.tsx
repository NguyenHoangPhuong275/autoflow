import React, { useState, useEffect } from 'react';
import {
  XMarkIcon as X,
  MagnifyingGlassIcon as Search,
  TableCellsIcon as FileSpreadsheet,
  DocumentTextIcon as FileDoc,
  ArrowPathIcon as Loader2,
  FolderIcon as Folder,
} from '@heroicons/react/24/outline';
import { GoogleDriveService, DriveFileInfo } from '@/core/google/services/googleDriveService';
import { getErrorMessage } from '@/core/utils/errors';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSheet: (url: string) => void;
  onSelectDoc?: (docId: string, title: string) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSheet,
  onSelectDoc,
}) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<DriveFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'sheets' | 'docs'>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let q = 'trashed = false';
      if (filterType === 'sheets') {
        q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
      } else if (filterType === 'docs') {
        q += " and mimeType = 'application/vnd.google-apps.document'";
      } else {
        q += " and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.document')";
      }

      if (query.trim()) {
        q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
      }

      const list = await GoogleDriveService.listFiles({ query: q, pageSize: 25 });
      setFiles(list);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể tải danh sách tệp Google Drive.');
      console.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, filterType]);

  if (!isOpen) return null;

  const handleSelect = (file: DriveFileInfo) => {
    if (file.mimeType.includes('spreadsheet')) {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
      onSelectSheet(sheetUrl);
      onClose();
    } else if (file.mimeType.includes('document')) {
      if (onSelectDoc) {
        onSelectDoc(file.id, file.name);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-2xl rounded-xl border border-[#1a2336] bg-[#0b0f19] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2336] bg-[#080c14]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Google Drive Explorer</h2>
              <p className="text-[10px] text-slate-400">Chọn bảng tính hoặc tài liệu từ Google Drive của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[#1a2336] bg-[#070a12] flex flex-wrap gap-2 items-center justify-between">
          <div className="flex-1 min-w-[200px] flex items-center bg-[#0e1422] rounded-lg border border-[#1a2336] px-2.5 py-1.5 focus-within:border-blue-500">
            <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
              placeholder="Tìm kiếm file theo tên..."
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shrink-0 transition-colors"
            >
              Tìm
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-[#0e1422]'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('sheets')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'sheets'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-[#0e1422]'
              }`}
            >
              📊 Sheets
            </button>
            <button
              onClick={() => setFilterType('docs')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'docs'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-[#0e1422]'
              }`}
            >
              📝 Docs
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-xs">Đang quét Google Drive...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Không tìm thấy tệp nào phù hợp trên Google Drive.
            </div>
          ) : (
            files.map((file) => {
              const isSheet = file.mimeType.includes('spreadsheet');
              const isDoc = file.mimeType.includes('document');

              return (
                <div
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#162036] bg-[#0e1422] hover:bg-[#162138] hover:border-blue-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded shrink-0 ${
                        isSheet
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isDoc
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {isSheet ? <FileSpreadsheet className="w-4 h-4" /> : <FileDoc className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                        {file.name}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate">
                        ID: {file.id} • {isSheet ? 'Google Sheets' : 'Google Docs'}
                      </p>
                    </div>
                  </div>

                  <button className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] font-bold shrink-0 transition-colors opacity-0 group-hover:opacity-100">
                    {isSheet ? 'Nạp Sheet' : 'Mở Doc'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
