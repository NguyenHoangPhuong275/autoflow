import React, { useState } from 'react';
import {
  XMarkIcon as X,
  DocumentTextIcon as FileDoc,
  ArrowPathIcon as Loader2,
  ArrowDownTrayIcon as Download,
} from '@heroicons/react/24/outline';
import { GoogleDocsService, GoogleDocContent } from '@/core/google/services/googleDocsService';

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
  const [docInput, setDocInput] = useState('');
  const [docData, setDocData] = useState<GoogleDocContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!docInput.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await GoogleDocsService.fetchDocument(docInput);
      setDocData(data);
    } catch (err: any) {
      console.error('[DocsImporterModal] Error fetching document:', err);
      setError(err.message || 'Không thể tải nội dung Google Docs.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-2xl rounded-xl border border-[#1a2336] bg-[#0b0f19] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2336] bg-[#080c14]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileDoc className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Google Docs Reader & Extractor</h2>
              <p className="text-[10px] text-slate-400">Trích xuất văn bản và bảng dữ liệu từ Google Docs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-b border-[#1a2336] bg-[#070a12] flex gap-2">
          <input
            type="text"
            value={docInput}
            onChange={(e) => setDocInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            placeholder="Dán URL Google Docs hoặc Document ID (ví dụ: 1ZU7LMlffoZv...)"
            className="flex-1 bg-[#0e1422] rounded-lg border border-[#1a2336] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleFetch}
            disabled={isLoading || !docInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Đọc Doc</span>
          </button>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {docData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300">{docData.title}</h3>
                  <p className="text-[10px] text-slate-500">ID: {docData.documentId}</p>
                </div>
                <button
                  onClick={handleImport}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Chuyển vào Bảng tính</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1a2336] text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[45vh] overflow-y-auto">
                {docData.bodyText || '(Tài liệu không có nội dung văn bản)'}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              Nhập link hoặc ID tài liệu Google Docs để trích xuất nội dung
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
