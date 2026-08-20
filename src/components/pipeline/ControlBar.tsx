import React, { useRef } from 'react';
import { ArrowPathIcon as Loader2, ArrowRightIcon as ArrowRight, ArrowUpTrayIcon as Upload, LinkIcon as Link2, } from '@heroicons/react/24/outline';
interface ControlBarProps {
    url: string;
    setUrl: (url: string) => void;
    isLoading: boolean;
    onFileUpload: (file: File) => void;
    onFetchFromUrl: (url: string) => void;
}
export const ControlBar: React.FC<ControlBarProps> = ({ url, setUrl, isLoading, onFileUpload, onFetchFromUrl, }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onFetchFromUrl(url);
        }
    };
    return (<div className="h-9 px-3 panel-card rounded-lg flex items-center justify-between gap-2.5 shrink-0 text-xs font-mono whitespace-nowrap">

      <div className="flex-1 flex items-center bg-[#070a12] rounded border border-[#1a2336] px-2.5 py-1 focus-within:border-indigo-500 transition-colors">
        <Link2 className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0"/>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={handleKeyDown} placeholder="Dán link Google Sheets thật hoặc kéo thả file Excel..." className="w-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none text-[11px]"/>
        <button onClick={() => onFetchFromUrl(url)} disabled={isLoading || !url.trim()} className="ml-2 px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 disabled:opacity-40 transition-colors" title="Tải dữ liệu từ đường dẫn">
          {isLoading ? (<Loader2 className="w-2.5 h-2.5 animate-spin"/>) : (<ArrowRight className="w-2.5 h-2.5"/>)}
          <span>Nạp Sheet</span>
        </button>
      </div>

      <button onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 rounded bg-[#0e1422] hover:bg-[#161f32] text-slate-300 hover:text-white flex items-center gap-1.5 border border-[#1a2336] shrink-0 text-[11px] transition-colors">
        <Upload className="w-3 h-3 text-indigo-400"/>
        <span>Tải file Excel (.xlsx / .csv)</span>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} className="hidden"/>
      </button>
    </div>);
};
