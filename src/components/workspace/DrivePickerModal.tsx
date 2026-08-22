import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XMarkIcon as X,
  TableCellsIcon as FileSpreadsheet,
  DocumentTextIcon as FileDoc,
  ArrowPathIcon as Loader2,
  FolderIcon as Folder,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { GoogleDriveService, DriveFileInfo } from '@/core/google/services/googleDriveService';
import { getUserErrorMessage } from '@/core/utils/errors';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSheet: (spreadsheetId: string) => void;
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
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await GoogleDriveService.searchFiles({
        type: filterType === 'all' ? 'supported' : filterType,
        nameQuery: query,
        pageSize: 30,
      });
      setFiles(list);
    } catch (err: unknown) {
      const message = getUserErrorMessage(
        err,
        'Không thể tải danh sách tệp Google Drive. Vui lòng kiểm tra quyền truy cập và thử lại.'
      );
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, query]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, filterType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (file: DriveFileInfo) => {
    if (file.mimeType.includes('spreadsheet')) {
      onSelectSheet(file.id);
      onClose();
    } else if (file.mimeType.includes('document')) {
      if (onSelectDoc) {
        onSelectDoc(file.id, file.name);
      }
      onClose();
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const dateA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
      const dateB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
      return dateB - dateA;
    });
  }, [files, sortBy]);

  const sheetCount = useMemo(() => files.filter((f) => f.mimeType.includes('spreadsheet')).length, [files]);
  const docCount = useMemo(() => files.filter((f) => f.mimeType.includes('document')).length, [files]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
    >
      <div className="w-full max-w-3xl h-[90vh] sm:h-[84vh] max-h-[760px] rounded-2xl border border-slate-700/60 bg-[#0c121e]/95 text-slate-100 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#090e18]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/30 text-blue-400 shadow-sm shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="drive-modal-title" className="text-sm sm:text-base font-bold text-slate-100 truncate tracking-tight">
                  Google Drive Explorer
                </h2>
                {files.length > 0 && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {files.length} tệp
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Chọn bảng tính Google Sheets hoặc tài liệu Google Docs từ Drive của bạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchFiles()}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
              title="Tải lại danh sách tệp"
            >
              <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#080d16]/70 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#111928] rounded-xl border border-slate-700/60 px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all shadow-inner">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                placeholder="Tìm kiếm tệp theo tên trên Google Drive..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    fetchFiles();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 mr-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => fetchFiles()}
                disabled={isLoading}
                className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm disabled:opacity-50"
              >
                Tìm
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 font-semibold shadow-sm'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                }`}
              >
                Tất cả ({files.length})
              </button>
              <button
                onClick={() => setFilterType('sheets')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  filterType === 'sheets'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Sheets {filterType === 'all' ? `(${sheetCount})` : ''}</span>
              </button>
              <button
                onClick={() => setFilterType('docs')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  filterType === 'docs'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                }`}
              >
                <FileDoc className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Docs {filterType === 'all' ? `(${docCount})` : ''}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
              <span>Sắp xếp:</span>
              <button
                onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                className="px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/50 transition-colors"
              >
                {sortBy === 'date' ? 'Mới nhất' : 'Tên A-Z'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="space-y-2.5 py-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 animate-pulse flex items-center justify-between">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-9 h-9 bg-slate-700/60 rounded-lg shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-3/5 bg-slate-700/80 rounded" />
                      <div className="h-2.5 w-2/5 bg-slate-700/40 rounded" />
                    </div>
                  </div>
                  <div className="h-7 w-20 bg-slate-700/50 rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex flex-col gap-2">
              <p className="font-semibold">Đã xảy ra lỗi:</p>
              <p className="text-rose-300/90 leading-relaxed">{error}</p>
              <button
                onClick={() => fetchFiles()}
                className="self-start mt-1 px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 rounded-lg text-rose-200 text-xs font-semibold transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
              <p className="font-medium text-slate-300">Không tìm thấy tệp nào trên Google Drive.</p>
              <p className="text-slate-500 text-xs">Hãy kiểm tra quyền truy cập hoặc thử tìm kiếm với từ khóa khác.</p>
            </div>
          ) : (
            sortedFiles.map((file) => {
              const isSheet = file.mimeType.includes('spreadsheet');
              const isDoc = file.mimeType.includes('document');

              return (
                <div
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSheet
                      ? 'bg-[#0f172a]/70 border-slate-800/80 hover:bg-emerald-950/20 hover:border-emerald-500/50 hover:shadow-md'
                      : isDoc
                      ? 'bg-[#0f172a]/70 border-slate-800/80 hover:bg-cyan-950/20 hover:border-cyan-500/50 hover:shadow-md'
                      : 'bg-[#0f172a]/70 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 mr-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isSheet
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 group-hover:scale-105 transition-transform'
                          : isDoc
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 group-hover:scale-105 transition-transform'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isSheet ? <FileSpreadsheet className="w-5 h-5" /> : <FileDoc className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                        {file.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                        <span
                          className={`px-1.5 py-0.2 rounded font-medium ${
                            isSheet
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isDoc
                              ? 'bg-cyan-500/10 text-cyan-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSheet ? 'Google Sheets' : isDoc ? 'Google Docs' : 'File'}
                        </span>

                        <button
                          onClick={(e) => handleCopyId(file.id, e)}
                          className="hover:text-slate-200 flex items-center gap-1 font-mono text-[10px] bg-slate-800/40 px-1.5 py-0.2 rounded border border-slate-700/40"
                          title="Sao chép File ID"
                        >
                          {copiedId === file.id ? (
                            <>
                              <CheckIcon className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Đã chép ID</span>
                            </>
                          ) : (
                            <span className="truncate max-w-[100px] sm:max-w-[140px]">ID: {file.id}</span>
                          )}
                        </button>

                        {file.modifiedTime && (
                          <span className="hidden sm:inline text-slate-500">
                            {new Date(file.modifiedTime).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(file);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                        isSheet
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      <span>{isSheet ? 'Nạp Sheet' : 'Mở Doc'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
