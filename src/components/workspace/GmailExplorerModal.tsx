import React, { useState, useEffect } from 'react';
import {
  XMarkIcon as X,
  MagnifyingGlassIcon as Search,
  EnvelopeIcon as Mail,
  ArrowPathIcon as Loader2,
  ArrowDownTrayIcon as Download,
} from '@heroicons/react/24/outline';
import { GoogleGmailService, EmailSummary, EmailDetail } from '@/core/google/services/googleGmailService';

interface GmailExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmails: (emails: EmailSummary[]) => void;
}

export const GmailExplorerModal: React.FC<GmailExplorerModalProps> = ({
  isOpen,
  onClose,
  onImportEmails,
}) => {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await GoogleGmailService.listRecentEmails({
        query: query.trim() || undefined,
        maxResults: 15,
      });
      setEmails(list);
    } catch (err: any) {
      console.error('[GmailExplorerModal] Error fetching emails:', err);
      setError(err.message || 'Không thể tải hộp thư Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
      setSelectedEmail(null);
    }
  }, [isOpen]);

  const handleViewDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await GoogleGmailService.fetchEmail(id);
      setSelectedEmail(detail);
    } catch (err: any) {
      console.error('[GmailExplorerModal] Error viewing email:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleImport = () => {
    if (emails.length > 0) {
      onImportEmails(emails);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-3xl rounded-xl border border-[#1a2336] bg-[#0b0f19] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2336] bg-[#080c14]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Gmail Inbox & Data Extractor</h2>
              <p className="text-[10px] text-slate-400">Duyệt thư, đọc chi tiết hoặc nạp email tự động vào Bảng tính</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-3 border-b border-[#1a2336] bg-[#070a12] flex flex-wrap gap-2 items-center justify-between">
          <div className="flex-1 min-w-[220px] flex items-center bg-[#0e1422] rounded-lg border border-[#1a2336] px-2.5 py-1.5 focus-within:border-rose-500">
            <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEmails()}
              placeholder='Tìm kiếm email (ví dụ: "from:netflix", "invoice", "báo giá")...'
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <button
              onClick={fetchEmails}
              disabled={isLoading}
              className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shrink-0 transition-colors"
            >
              Tìm
            </button>
          </div>

          <button
            onClick={handleImport}
            disabled={emails.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
            title="Tạo các hàng dữ liệu từ danh sách email này"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Nạp {emails.length} Email vào Bảng</span>
          </button>
        </div>

        {/* Body (Split list and preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#1a2336]">
          {/* Email list */}
          <div className="md:col-span-6 overflow-y-auto p-3 space-y-2 max-h-[50vh] md:max-h-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                <span className="text-xs">Đang quét hòm thư Gmail...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            ) : emails.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Không tìm thấy email nào phù hợp.
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleViewDetail(email.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selectedEmail?.id === email.id
                      ? 'bg-[#1a121e] border-rose-500/60 text-slate-200'
                      : 'bg-[#0e1422] border-[#162036] hover:bg-[#151c2e] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-semibold text-rose-300 truncate max-w-[180px]">
                      {email.from.replace(/<.*>/, '').trim() || 'Ẩn danh'}
                    </span>
                    <span className="text-[9px] text-slate-500 shrink-0">
                      {email.date ? email.date.slice(0, 16) : ''}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 truncate">{email.subject}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{email.snippet}</p>
                </div>
              ))
            )}
          </div>

          {/* Email detail preview */}
          <div className="md:col-span-6 overflow-y-auto p-4 bg-[#070a12] flex flex-col">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                <span className="text-xs">Đang tải nội dung thư...</span>
              </div>
            ) : selectedEmail ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedEmail.subject}</h3>
                  <p className="text-[10px] text-rose-400 mt-0.5">Từ: {selectedEmail.from}</p>
                  <p className="text-[9px] text-slate-500">Ngày: {selectedEmail.date}</p>
                </div>

                <div className="h-px bg-[#1a2336]" />

                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1a2336] text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[35vh] overflow-y-auto">
                  {selectedEmail.bodyText || selectedEmail.snippet}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
                <Mail className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                <span>Nhấn vào một email bên trái để xem nội dung chi tiết</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
