import React, { useState, useEffect, useMemo } from 'react';
import {
  XMarkIcon as X,
  MagnifyingGlassIcon as Search,
  DocumentTextIcon as FileDoc,
  ArrowPathIcon as Loader2,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { GoogleDocsService, GoogleDocContent } from '@/core/google/services/googleDocsService';
import { GoogleDriveService, DriveFileInfo } from '@/core/google/services/googleDriveService';
import { getUserErrorMessage } from '@/core/utils/errors';

interface DocsImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocContent: (doc: GoogleDocContent) => void;
}

export const DocsImporterModal: React.FC<DocsImporterModalProps> = ({
  isOpen,
  onClose,
  onImportDocContent,
}) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<DriveFileInfo[]>([]);
  const [docData, setDocData] = useState<GoogleDocContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setQuery('');
      setFiles([]);
      setDocData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async () => {
    const searchTerm = query.trim();
    if (!searchTerm) {
      setError('Hãy nhập tên tài liệu cần tìm trong tài khoản Google đã đăng nhập.');
      setFiles([]);
      return;
    }
    setIsSearching(true);
    setError(null);
    setDocData(null);
    try {
      setFiles(await GoogleDriveService.searchDocs(searchTerm));
    } catch (err: unknown) {
      setError(getUserErrorMessage(err, 'Không thể tìm tài liệu Google Docs trong tài khoản đã đăng nhập. Vui lòng kiểm tra quyền truy cập và thử lại.'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleRead = async (file: DriveFileInfo) => {
    setIsLoading(true);
    setError(null);
    try {
      setDocData(await GoogleDocsService.fetchDocument(file.id));
    } catch (err: unknown) {
      setError(getUserErrorMessage(err, 'Không thể đọc tài liệu Google Docs từ tài khoản đã đăng nhập. Vui lòng kiểm tra quyền truy cập và thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (docData) {
      onImportDocContent(docData);
      onClose();
    }
  };

  const handleCopyBody = () => {
    if (!docData?.bodyText) return;
    navigator.clipboard.writeText(docData.bodyText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyId = () => {
    if (!docData?.documentId) return;
    navigator.clipboard.writeText(docData.documentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const stats = useMemo(() => {
    if (!docData?.bodyText) return null;
    const text = docData.bodyText.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const paragraphs = text ? text.split(/\n\s*\n/).filter(Boolean).length : 0;
    return { chars, words, paragraphs };
  }, [docData]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-modal-title"
    >
      <div className="w-full max-w-3xl h-[90vh] sm:h-[84vh] max-h-[760px] rounded-2xl border border-slate-700/60 bg-[#0c121e]/95 text-slate-100 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#090e18]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-sm shrink-0">
              <FileDoc className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="docs-modal-title" className="text-sm sm:text-base font-bold text-slate-100 truncate tracking-tight">
                  Google Docs Reader & Extractor
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Docs AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Trích xuất văn bản và bảng dữ liệu từ Google Docs để nạp vào bảng tính hoặc làm ngữ cảnh AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#080d16]/70 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#111928] rounded-xl border border-slate-700/60 px-3 py-1.5 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Tìm tài liệu theo tên trong tài khoản Google..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setFiles([]);
                    setError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 mr-1.5"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Tìm trong Drive</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex flex-col gap-2">
              <p className="font-semibold">Lỗi trích xuất tài liệu:</p>
              <p className="text-rose-300/90 leading-relaxed">{error}</p>
            </div>
          )}

          {isSearching || isLoading ? (
            <div className="flex flex-col items-center justify-center my-auto py-20 text-slate-400 gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <span className="text-sm font-medium">{isSearching ? 'Đang tìm tài liệu trong tài khoản Google...' : 'Đang đọc và phân tích tài liệu Google Docs...'}</span>
            </div>
          ) : docData ? (
            <div className="space-y-4 flex flex-col h-full">
              <div className="p-4 rounded-xl bg-[#111928]/80 border border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-cyan-300 truncate">
                      {docData.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={handleCopyId}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40"
                        title="Sao chép Document ID"
                      >
                        {copiedId ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép ID</span>
                          </>
                        ) : (
                          <span>ID: {docData.documentId}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyBody}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {copiedText ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <span>Sao chép văn bản</span>
                      )}
                    </button>
                    <button
                      onClick={handleImport}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                    >
                      <span>Chuyển vào Bảng tính</span>
                    </button>
                  </div>
                </div>

                {stats && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                    <div className="p-2 rounded-lg bg-[#090e18]/80">
                      <span className="text-[10px] text-slate-400 block">Số từ</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200">{stats.words.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#090e18]/80">
                      <span className="text-[10px] text-slate-400 block">Ký tự</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200">{stats.chars.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#090e18]/80">
                      <span className="text-[10px] text-slate-400 block">Đoạn văn</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200">{stats.paragraphs.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Văn bản trích xuất
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800/90 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-cyan-500/30 selection:text-white max-h-[38vh]">
                  {docData.bodyText || '(Tài liệu không có nội dung văn bản)'}
                </div>
              </div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">Tài liệu tìm thấy trong tài khoản</p>
                <span className="text-[11px] text-slate-500">{files.length} kết quả</span>
              </div>
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => handleRead(file)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111928]/80 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0">
                      <FileDoc className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs sm:text-sm font-semibold text-slate-200 truncate">{file.name}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Google Docs{file.modifiedTime ? ` · ${new Date(file.modifiedTime).toLocaleDateString('vi-VN')}` : ''}</span>
                    </span>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shrink-0">Đọc</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-3">
              <div className="max-w-md space-y-1">
                <p className="font-semibold text-slate-200">Tìm tài liệu trong tài khoản Google</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Nhập tên tài liệu ở phía trên. Hệ thống sẽ tìm trong đúng tài khoản Google đang đăng nhập và chỉ đọc tài liệu bạn chọn.
                </p>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-[#111928]/60 border border-slate-800 text-left max-w-md w-full space-y-2">
                <span className="text-xs font-semibold text-cyan-400 block">Cách sử dụng:</span>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Tìm theo tên tài liệu trong Google Drive của tài khoản đã đăng nhập.</li>
                  <li>Chọn đúng tài liệu để đọc nội dung và nạp vào bảng tính khi cần.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
