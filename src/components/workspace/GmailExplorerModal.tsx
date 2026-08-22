import React, { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon as X,
  EnvelopeIcon as Mail,
  ArrowPathIcon as Loader2,
  ChevronLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { GoogleGmailService, EmailSummary, EmailDetail } from '@/core/google/services/googleGmailService';
import { getUserErrorMessage } from '@/core/utils/errors';

interface GmailExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmails: (emails: EmailSummary[]) => void;
}

const PRESET_FILTERS = [
  { label: 'Tất cả', query: '' },
  { label: '⭐ Quan trọng', query: 'is:important' },
  { label: '📄 Báo giá / Hóa đơn', query: 'invoice OR "báo giá" OR "hóa đơn"' },
  { label: '📅 7 ngày qua', query: 'newer_than:7d' },
];

export const GmailExplorerModal: React.FC<GmailExplorerModalProps> = ({
  isOpen,
  onClose,
  onImportEmails,
}) => {
  const [query, setQuery] = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEmails = useCallback(async (searchQuery?: string) => {
    setIsLoading(true);
    setError(null);
    const effectiveQuery = searchQuery !== undefined ? searchQuery : query;
    try {
      const list = await GoogleGmailService.listRecentEmails({
        query: effectiveQuery.trim() || undefined,
        maxResults: 20,
      });
      setEmails(list);
      setSelectedIds(new Set()); // Reset selection on new search
    } catch (err: unknown) {
      const message = getUserErrorMessage(err, 'Không thể tải hộp thư Gmail. Vui lòng kiểm tra quyền truy cập và thử lại.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
      setSelectedEmail(null);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApplyPreset = (presetQuery: string) => {
    setActivePreset(presetQuery);
    setQuery(presetQuery);
    fetchEmails(presetQuery);
  };

  const handleViewDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await GoogleGmailService.fetchEmail(id);
      setSelectedEmail(detail);
    } catch (err: unknown) {
      const message = getUserErrorMessage(err, 'Không thể đọc nội dung chi tiết email.');
      setError(message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === emails.length && emails.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleImportSelected = () => {
    let toImport: EmailSummary[] = [];
    if (selectedIds.size > 0) {
      toImport = emails.filter((e) => selectedIds.has(e.id));
    } else {
      toImport = emails;
    }
    if (toImport.length > 0) {
      onImportEmails(toImport);
      onClose();
    }
  };

  const handleImportSingle = (email: EmailSummary) => {
    onImportEmails([email]);
    onClose();
  };

  const handleCopyBody = () => {
    if (!selectedEmail) return;
    const textToCopy = selectedEmail.bodyText || selectedEmail.snippet;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const countToImport = selectedIds.size > 0 ? selectedIds.size : emails.length;
  const isAllSelected = emails.length > 0 && selectedIds.size === emails.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-modal-title"
    >
      <div className="w-full max-w-5xl h-[92vh] sm:h-[86vh] max-h-[820px] rounded-2xl border border-slate-700/60 bg-[#0c121e]/95 text-slate-100 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#090e18]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 text-rose-400 shadow-sm shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="gmail-modal-title" className="text-sm sm:text-base font-bold text-slate-100 truncate tracking-tight">
                  Gmail Inbox & Data Extractor
                </h2>
                {emails.length > 0 && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    {emails.length} thư
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Duyệt thư, đọc chi tiết hoặc nạp email tự động vào Bảng tính
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchEmails()}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
              title="Tải lại hộp thư"
            >
              <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
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

        {/* Search & Actions Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#080d16]/70 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center bg-[#111928] rounded-xl border border-slate-700/60 px-3 py-1.5 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30 transition-all shadow-inner">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEmails()}
                placeholder='Tìm kiếm thư (vd: "from:shopee", "invoice", "báo giá")...'
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setActivePreset('');
                    fetchEmails('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 mr-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => fetchEmails()}
                disabled={isLoading}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm disabled:opacity-50"
              >
                Tìm kiếm
              </button>
            </div>

            <button
              onClick={handleImportSelected}
              disabled={emails.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shrink-0 transition-all shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/60"
              title="Tạo các hàng dữ liệu từ danh sách email này"
            >
              <span>Nạp {countToImport} Email vào Bảng</span>
            </button>
          </div>

          {/* Filter Chips & Multi-select Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 mr-1">
                Lọc nhanh:
              </span>
              {PRESET_FILTERS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleApplyPreset(preset.query)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    activePreset === preset.query
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {emails.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleSelectAll}
                  className="px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center gap-1.5 transition-colors"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      isAllSelected
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : selectedIds.size > 0
                        ? 'bg-rose-600/50 border-rose-500 text-white'
                        : 'border-slate-600'
                    }`}
                  >
                    {isAllSelected && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    {!isAllSelected && selectedIds.size > 0 && <span className="w-1.5 h-0.5 bg-white rounded-full" />}
                  </div>
                  <span>{selectedIds.size > 0 ? `Đã chọn ${selectedIds.size}` : 'Chọn tất cả'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body: Responsive Master-Detail */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
          {/* Email List Column */}
          <div
            className={`md:col-span-5 lg:col-span-5 overflow-y-auto p-3 sm:p-4 space-y-2 h-full ${
              selectedEmail ? 'hidden md:block' : 'block'
            }`}
          >
            {isLoading ? (
              <div className="space-y-2.5 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 animate-pulse space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-28 bg-slate-700/60 rounded" />
                      <div className="h-2.5 w-16 bg-slate-700/40 rounded" />
                    </div>
                    <div className="h-3.5 w-4/5 bg-slate-700/80 rounded" />
                    <div className="h-2.5 w-full bg-slate-700/40 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex flex-col gap-2">
                <p className="font-semibold">Đã xảy ra lỗi:</p>
                <p className="text-rose-300/90 leading-relaxed">{error}</p>
                <button
                  onClick={() => fetchEmails()}
                  className="self-start mt-1 px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 rounded-lg text-rose-200 text-xs font-semibold transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : emails.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
                <p className="font-medium text-slate-300">Không tìm thấy email nào phù hợp.</p>
                <p className="text-slate-500 text-xs">Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedIds.has(email.id);
                const isActive = selectedEmail?.id === email.id;
                const senderClean = email.from.replace(/<.*>/, '').replace(/"/g, '').trim() || 'Ẩn danh';
                const senderInitial = senderClean.charAt(0).toUpperCase();

                return (
                  <div
                    key={email.id}
                    onClick={() => handleViewDetail(email.id)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-rose-950/20 border-rose-500/60 shadow-md ring-1 ring-rose-500/30'
                        : isSelected
                        ? 'bg-slate-800/50 border-rose-500/30'
                        : 'bg-[#111827]/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => handleToggleSelect(email.id, e)}
                        className="mt-0.5 p-0.5 rounded text-slate-400 hover:text-rose-400 shrink-0"
                        title={isSelected ? 'Bỏ chọn' : 'Chọn email này'}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-rose-600 border-rose-500 text-white'
                              : 'border-slate-600 group-hover:border-slate-500 bg-slate-900/50'
                          }`}
                        >
                          {isSelected && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>

                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {senderInitial}
                      </div>

                      {/* Content Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-rose-300 truncate max-w-[170px]">
                            {senderClean}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {email.date ? email.date.slice(0, 16) : ''}
                          </span>
                        </div>
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {email.subject || '(Không có tiêu đề)'}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {email.snippet}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Reader Pane */}
          <div
            className={`md:col-span-7 lg:col-span-7 overflow-y-auto p-4 sm:p-6 bg-[#080d16]/80 flex flex-col h-full ${
              selectedEmail ? 'block' : 'hidden md:flex'
            }`}
          >
            {/* Mobile Back Button */}
            {selectedEmail && (
              <div className="md:hidden mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 py-1 px-2 rounded-lg bg-rose-950/40 border border-rose-900/60"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Quay lại danh sách</span>
                </button>
                <button
                  onClick={() => handleImportSingle(selectedEmail)}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                >
                  <span>Nạp thư này</span>
                </button>
              </div>
            )}

            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center my-auto py-16 text-slate-400 gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Đang tải toàn văn email...</span>
              </div>
            ) : selectedEmail ? (
              <div className="flex flex-col h-full space-y-4">
                {/* Header Information */}
                <div className="space-y-3 pb-3 border-b border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                      {selectedEmail.subject || '(Không có tiêu đề)'}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <button
                        onClick={handleCopyBody}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="Sao chép nội dung thư"
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã sao chép!</span>
                          </>
                        ) : (
                          <span>Sao chép</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleImportSingle(selectedEmail)}
                        className="hidden md:flex px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm"
                        title="Nạp riêng email này vào hàng mới"
                      >
                        <span>Nạp email này</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 min-w-0">
                      <span className="text-slate-400 shrink-0">Người gửi:</span>
                      <span className="font-semibold text-rose-300 truncate" title={selectedEmail.from}>
                        {selectedEmail.from}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-slate-400 shrink-0">Thời gian:</span>
                      <span className="text-slate-300">{selectedEmail.date}</span>
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Nội dung thư
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(selectedEmail.bodyText || selectedEmail.snippet).length} ký tự
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800/90 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-rose-500/30 selection:text-white">
                    {selectedEmail.bodyText || selectedEmail.snippet || '(Email không có nội dung văn bản)'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center my-auto py-16 text-slate-400 gap-2">
                <p className="text-sm font-semibold text-slate-300">Chưa chọn email nào</p>
                <p className="text-xs text-slate-400">Nhấn vào một email trong danh sách bên trái để đọc chi tiết</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
