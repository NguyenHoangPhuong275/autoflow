import React, { useState } from 'react';
import { ArrowDownIcon as ArrowDown, CheckIcon as Check, CommandLineIcon as TerminalIcon, DocumentDuplicateIcon as Copy, TrashIcon as Trash2, } from '@heroicons/react/24/outline';
import { LogEntry, LogLevel } from '@/types';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useClipboardFeedback } from '@/hooks/useClipboardFeedback';
interface TerminalLogsProps {
    logs: LogEntry[];
    onClearLogs: () => void;
}
export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, onClearLogs }) => {
    const [autoScroll, setAutoScroll] = useState(true);
    const bottomRef = useAutoScroll<HTMLDivElement>(autoScroll, [logs, autoScroll]);
    const { copied, copy } = useClipboardFeedback(1500);
    const handleCopy = () => {
        const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
        copy(text);
    };
    const getTag = (level: LogLevel) => {
        switch (level) {
            case 'process': return <span className="text-purple-400 font-bold shrink-0">[PROCESS]</span>;
            case 'success': return <span className="text-emerald-400 font-bold shrink-0">[SUCCESS]</span>;
            case 'warn': return <span className="text-amber-400 font-bold shrink-0">[WARN]</span>;
            case 'error': return <span className="text-rose-400 font-bold shrink-0">[ERROR]</span>;
            default: return <span className="text-cyan-400 font-bold shrink-0">[INFO]</span>;
        }
    };
    return (<div className="panel-card rounded-lg flex flex-col h-full overflow-hidden text-xs font-mono">

      <div className="h-9 px-3 bg-[#0b101c] border-b border-[#1a2336] flex items-center justify-between shrink-0 whitespace-nowrap">
        <div className="flex items-center gap-2 font-bold text-slate-300">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400"/>
          <span>NHẬT KÝ TÁC VỤ (TERMINAL)</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setAutoScroll(!autoScroll)} className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${autoScroll ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800' : 'bg-[#090d16] text-slate-500 border border-[#1a2336]'}`}>
            <ArrowDown className="w-2.5 h-2.5"/>
            <span>Auto-Scroll</span>
          </button>

          <button onClick={handleCopy} className="p-1 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 hover:text-[var(--text-primary)] border border-[#1a2336] transition-colors" title="Sao chép toàn bộ nhật ký">
            {copied ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}
          </button>

          <button onClick={onClearLogs} className="p-1 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 hover:text-rose-400 border border-[#1a2336] transition-colors" title="Xóa nhật ký">
            <Trash2 className="w-3 h-3"/>
          </button>
        </div>
      </div>

      <div className="flex-1 p-2 bg-[#070a12] overflow-y-auto space-y-1 select-text">
        {logs.length === 0 ? (<div className="text-slate-600 text-[10px] italic p-1">Chờ khởi chạy tác vụ...</div>) : (logs.map((l) => (<div key={l.id} className="flex items-center gap-1.5 text-[11px] hover:bg-[#11192a] px-1 py-0.5 rounded whitespace-nowrap truncate transition-colors">
              <span className="text-slate-500 text-[10px] shrink-0">{l.timestamp}</span>
              {getTag(l.level)}
              <span className={`truncate ${l.level === 'error' ? 'text-rose-300' :
                l.level === 'success' ? 'text-emerald-300' :
                    l.level === 'process' ? 'text-purple-300' :
                        l.level === 'warn' ? 'text-amber-300' :
                            'text-slate-300'}`}>
                {l.message}
              </span>
            </div>)))}
        <div ref={bottomRef}/>
      </div>
    </div>);
};
