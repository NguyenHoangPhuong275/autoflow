import React, { useState } from 'react';
import { TrashIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import {
  ArrowPathIcon as Loader2,
  ArrowTrendingUpIcon as TrendingUp,
  ChartBarIcon as BarChart3,
  CheckCircleIcon as CheckCircle2,
  CheckCircleIcon as CheckSquare,
  CpuChipIcon as Bot,
  CpuChipIcon as BrainCircuit,
  DocumentPlusIcon as FilePlus2,
  DocumentTextIcon as FileText,
  DocumentTextIcon as FileDoc,
  EnvelopeIcon as Mail,
  FolderIcon as Folder,
  ExclamationCircleIcon as CircleAlert,
  MinusCircleIcon as Square,
  PaperAirplaneIcon as Send,
  ShieldCheckIcon as ShieldCheck,
  SparklesIcon as Sparkles,
  UserIcon as User,
  XMarkIcon as X,
} from '@heroicons/react/24/outline';
import { DataRow } from '@/types';
import type { PermittedDocument, SheetDataIndex } from '@/core/ai/agentTypes';
import { AiAgentService, ChatMessage, ChatMessageOption } from '@/core/services/aiAgentService';
import { executeAgentActions, type CellFormatOptions } from '@/core/ai/executeAgentActions';
import { buildModelFacingSummary } from '@/core/ai/actionExecutionTypes';
import { createInverseActions } from '@/core/undo/createInverseActions';
import type { ActionSnapshot } from '@/core/undo/undoTypes';
import { GoogleSheetReader } from '@/core/parsers/googleSheetReader';
import { SheetTabInfo } from '@/core/services/googleSyncService';
import { useAgentDocuments } from '@/hooks/useAgentDocuments';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useDestructiveActionQueue } from '@/hooks/useDestructiveActionQueue';
import { useUndoStack } from '@/hooks/useUndoStack';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { AGENT_BRAND } from '@/core/ai/agentBrand';
import { TypingAnimation } from '@/components/ui/typing-animation';
import { DestructiveActionDialog } from '@/components/chat/DestructiveActionDialog';
import { getErrorMessage } from '@/core/utils/errors';
interface AiCopilotChatProps {
    rows: DataRow[];
    sheetTabs?: SheetTabInfo[];
    allSheetHeaders?: Record<string, string[]>;
    allSheetRows?: SheetDataIndex;
    externalDocuments?: PermittedDocument[];
    activeSheetTitle: string;
    onUpdateHeaders?: (sheetTitle: string, newHeaders: string[]) => void;
    onAddColumn?: (sheetTitle: string, columnName: string) => void;
    onDeleteColumn?: (sheetTitle: string, colKey: string) => void;
    onFreezeRowsCols?: (sheetTitle: string, frozenRows?: number, frozenCols?: number) => void;
    onSortRange?: (sheetTitle: string, colKey: string, ascending?: boolean) => void;
    onUpdateRange?: (sheetTitle: string, range: string, values: unknown[][]) => void;
    onFormatCells?: (sheetTitle: string, rangeA1?: string, options?: CellFormatOptions) => void;
    onAutoResizeColumns?: (sheetTitle?: string, startCol?: number, endCol?: number) => void;
    onSetColumnWidth?: (sheetTitle?: string, pixelSize?: number, startCol?: number, endCol?: number) => void;
    onAddChart?: (sheetTitle: string, chartType?: 'COLUMN' | 'BAR' | 'LINE' | 'PIE', title?: string, domainColIndex?: number, seriesColIndex?: number, rowCount?: number, rowIndexOffset?: number) => void;
    onClearCharts?: (sheetTitle?: string) => void;
    onCreateSheet?: (sheetTitle: string, initialHeaders?: string[]) => void;
    onDeleteSheet?: (sheetTitle: string) => void;
    onDuplicateSheet?: (sourceTitle: string, newTitle?: string) => void;
    onRenameSheet?: (oldTitle: string, newTitle: string) => void;
    onUpdateRow: (rowId: string, updatedData: Record<string, unknown>, colKey?: string, newValue?: unknown) => void;
    onBatchUpdateRows?: (updates: Array<{
        rowId: string;
        updatedData: Record<string, unknown>;
        colKey?: string;
        newValue?: unknown;
    }>) => void;
    onBatchDeleteRows?: (rowIds: string[]) => void;
    onAddRow: (customData?: Record<string, unknown>) => void;
    onDeleteRow: (rowId: string) => void;
    onClearSheet?: (sheetTitle?: string) => void;
    onSelectSheetTab?: (sheetTitle: string) => void;
    onStartPipeline: () => void;
    onPausePipeline?: () => void;
    onResumePipeline?: () => void;
    onResetPipeline?: () => void;
    onClearLogs?: () => void;
    onChangeSpeed?: (ms: number) => void;
    onFetchFromUrl?: (url: string) => void;
}
const QUICK_ACTIONS = [
    {
        label: '📧 Đọc 5 email mới',
        prompt: 'Đọc 5 email mới nhất trong hòm thư Gmail và tóm tắt nội dung',
        icon: Mail,
    },
    {
        label: '📁 Tìm file trên Drive',
        prompt: 'Tìm kiếm tất cả bảng tính Google Sheets và tài liệu Google Docs có trong Google Drive của tôi',
        icon: Folder,
    },
    {
        label: '📝 Đọc Google Docs',
        prompt: 'Đọc và trích xuất nội dung từ tài liệu Google Docs',
        icon: FileDoc,
    },
    {
        label: 'Phân tích nguồn liên quan',
        prompt: 'Tự tìm các nguồn dữ liệu liên quan đến chủ đề tôi nêu và tổng hợp thông tin chính',
        icon: BarChart3,
    },
    {
        label: 'Đổi tên cột camelCase',
        prompt: 'thay đổi tên các cột ở trong sheet hiện tại theo format: aB (camelCase)',
        icon: TrendingUp,
    },
] as const;
function sanitizeBotText(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*(?:-{3,}|_{3,})\s*$/gm, '')
        .replace(/_{2}([^_\n]+)_{2}/g, '$1')
        .trim();
}
export const AiCopilotChat: React.FC<AiCopilotChatProps> = ({ rows, sheetTabs = [], allSheetHeaders = {}, allSheetRows = {}, externalDocuments = [], activeSheetTitle, onUpdateHeaders, onAddColumn, onDeleteColumn, onFreezeRowsCols, onSortRange, onUpdateRange, onFormatCells, onAutoResizeColumns, onSetColumnWidth, onAddChart, onClearCharts, onCreateSheet, onDeleteSheet, onDuplicateSheet, onRenameSheet, onUpdateRow, onBatchUpdateRows, onBatchDeleteRows, onAddRow, onDeleteRow, onClearSheet, onSelectSheetTab, onStartPipeline, onPausePipeline, onResumePipeline, onResetPipeline, onClearLogs, onChangeSpeed, onFetchFromUrl, }) => {
    const { messages, setMessages, clearHistory } = useChatHistory();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showDocModal, setShowDocModal, newDocName, setNewDocName, newDocContent, setNewDocContent, permittedDocs, toggleDocPermission, handleAddCustomDoc, } = useAgentDocuments(externalDocuments);
    const { pendingAction, requestConfirmation, confirmAction, cancelAction } = useDestructiveActionQueue();
    const { undoStack, canUndo, pushTransaction, popTransaction } = useUndoStack();
    const messagesEndRef = useAutoScroll<HTMLDivElement>(true, [messages, isLoading]);

    const handleUndo = async () => {
        if (!canUndo || isLoading) return;
        const tx = popTransaction();
        if (!tx) return;

        setIsLoading(true);
        try {
            const { summaries, report } = await executeAgentActions(tx.inverseActions, {
                rows,
                activeSheetTitle: tx.sheetTitle || activeSheetTitle,
                onUpdateHeaders,
                onAddColumn,
                onDeleteColumn,
                onFreezeRowsCols,
                onSortRange,
                onUpdateRange,
                onFormatCells,
                onAutoResizeColumns,
                onSetColumnWidth,
                onAddChart,
                onClearCharts,
                onCreateSheet,
                onDeleteSheet,
                onDuplicateSheet,
                onRenameSheet,
                onUpdateRow,
                onBatchUpdateRows,
                onBatchDeleteRows,
                onAddRow,
                onDeleteRow,
                onClearSheet,
                onSelectSheetTab,
                onStartPipeline,
                onPausePipeline,
                onResumePipeline,
                onResetPipeline,
                onClearLogs,
                onChangeSpeed,
                onFetchFromUrl,
                requestDestructiveConfirmation: (action) => requestConfirmation(action, tx.sheetTitle || activeSheetTitle, rows.length),
            });

            const isFullSuccess = report.failedCount === 0 && report.cancelledCount === 0;
            const undoMsg: ChatMessage = {
                id: `undo-${Date.now()}`,
                sender: isFullSuccess ? 'system' : 'ai',
                text: isFullSuccess
                    ? `↩️ Đã hoàn tác thành công: ${tx.description}`
                    : `⚠️ Hoàn tác một phần (${report.successCount}/${report.totalActions} thành công): ${summaries.join(', ')}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
            };
            setMessages((prev) => [...prev, undoMsg]);
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            console.error(`Lỗi hoàn tác: ${message}`);
            const errorMsg: ChatMessage = {
                id: `undo-err-${Date.now()}`,
                sender: 'system',
                text: `❌ Lỗi khi hoàn tác: ${message}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const query = textToSend || input;
        if (!query.trim() || isLoading)
            return;
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: query.trim(),
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
        };
        setMessages((prev) => [...prev, userMsg]);
        if (!textToSend)
            setInput('');
        setIsLoading(true);
        const extractedId = GoogleSheetReader.extractSpreadsheetId(query);
        if (extractedId && onFetchFromUrl) {
            const matchUrl = query.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/);
            if (matchUrl) {
                onFetchFromUrl(matchUrl[0]);
            }
        }
        try {
            const snapshot: ActionSnapshot = {
                sheetTitle: activeSheetTitle,
                rows: rows.map((r) => ({ ...r, data: { ...r.data } })),
                headers: rows.length > 0 ? Object.keys(rows[0].data) : (allSheetHeaders[activeSheetTitle] || []),
                allSheetHeaders: { ...allSheetHeaders },
                timestamp: Date.now(),
            };

            const allTabs = sheetTabs.map((t) => t.title);
            const response = await AiAgentService.chatWithAgent(query.trim(), messages, rows, activeSheetTitle, allTabs, permittedDocs, allSheetHeaders, allSheetRows);
            const { summaries: actionSummaries, report } = await executeAgentActions(response.actions ?? [], {
                rows,
                activeSheetTitle,
                onUpdateHeaders,
                onAddColumn,
                onDeleteColumn,
                onFreezeRowsCols,
                onSortRange,
                onUpdateRange,
                onFormatCells,
                onAutoResizeColumns,
                onSetColumnWidth,
                onAddChart,
                onClearCharts,
                onCreateSheet,
                onDeleteSheet,
                onDuplicateSheet,
                onRenameSheet,
                onUpdateRow,
                onBatchUpdateRows,
                onBatchDeleteRows,
                onAddRow,
                onDeleteRow,
                onClearSheet,
                onSelectSheetTab,
                onStartPipeline,
                onPausePipeline,
                onResumePipeline,
                onResetPipeline,
                onClearLogs,
                onChangeSpeed,
                onFetchFromUrl,
                requestDestructiveConfirmation: (action) => requestConfirmation(action, activeSheetTitle, rows.length),
            });

            let actionSummaryText: string | undefined;
            if (report.totalActions > 0) {
                const parts: string[] = [];
                if (report.successCount > 0) parts.push(`${report.successCount} thành công`);
                if (report.failedCount > 0) parts.push(`${report.failedCount} thất bại`);
                if (report.cancelledCount > 0) parts.push(`${report.cancelledCount} đã hủy`);
                actionSummaryText = `Đã thực thi ${report.totalActions} thao tác: ${parts.join(', ')}`;
            }

            if (report.successCount > 0) {
                const succeededActions = (response.actions ?? []).filter((_, idx) => report.results[idx]?.status === 'success');
                if (succeededActions.length > 0) {
                    const inverseActions = createInverseActions(succeededActions, snapshot);
                    if (inverseActions.length > 0) {
                        pushTransaction({
                            id: `tx-${Date.now()}`,
                            timestamp: Date.now(),
                            description: actionSummaryText || 'Thao tác bảng tính',
                            sheetTitle: activeSheetTitle,
                            originalActions: succeededActions,
                            inverseActions,
                            snapshot,
                            status: 'ready',
                        });
                    }
                }
            }

            const informationalResults = report.results
                .filter((r) => r.status === 'success' && r.message)
                .map((r) => r.message);

            let finalDisplayText = response.reply?.trim();
            const isGenericReply = !finalDisplayText || 
                finalDisplayText === 'Đã thực thi toàn bộ yêu cầu của bạn.' || 
                finalDisplayText === 'Đã thực hiện toàn bộ yêu cầu của bạn.';

            if (isGenericReply) {
                if (informationalResults.length > 0) {
                    finalDisplayText = informationalResults.join('\n\n');
                } else if (actionSummaries.length > 0) {
                    finalDisplayText = `✅ ${actionSummaries.join('\n• ')}`;
                } else {
                    finalDisplayText = 'Đã thực thi toàn bộ yêu cầu của bạn.';
                }
            } else if (informationalResults.length > 0 && !informationalResults.some(r => finalDisplayText.includes(r.slice(0, 20)))) {
                finalDisplayText = `${finalDisplayText}\n\n${informationalResults.join('\n\n')}`;
            }

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: sanitizeBotText(finalDisplayText),
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
                actionSummary: actionSummaryText,
                options: response.options,
            };
            setMessages((prev) => [...prev, aiMsg]);

            if (report.totalActions > 0 && (report.failedCount > 0 || report.cancelledCount > 0)) {
                const resultMsg: ChatMessage = {
                    id: `action-result-${Date.now()}`,
                    sender: 'system',
                    text: buildModelFacingSummary(report),
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
                };
                setMessages((prev) => [...prev, resultMsg]);
            }
        }
        catch (error: unknown) {
            const message = getErrorMessage(error);
            console.error(`Lỗi xử lý AI: ${message}`);
            const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                sender: 'system',
                text: `Lỗi xử lý AI: ${message}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSelectOption = (opt: ChatMessageOption) => {
        if (isLoading)
            return;
        if (opt.action) {
            const act = opt.action;
            const targetSheet = act.sheetTitle || activeSheetTitle;
            if (act.type === 'format_cells' && onFormatCells) {
                onFormatCells(targetSheet, act.range || '1:1', {
                    backgroundColor: act.backgroundColor,
                    fontColor: act.fontColor,
                    bold: act.bold,
                    italic: act.italic,
                    fontSize: act.fontSize,
                    fontFamily: act.fontFamily,
                    alignment: act.alignment,
                });
            }
            else if (act.type === 'add_chart' && onAddChart) {
                onAddChart(targetSheet, act.chartType || 'COLUMN', act.title || 'Báo Cáo Thống Kê', act.domainColIndex ?? 0, act.seriesColIndex ?? 1, act.rowCount ?? 10);
            }
            else if (act.type === 'update_headers' && act.headers && onUpdateHeaders) {
                onUpdateHeaders(targetSheet, act.headers);
            }
            else if (act.type === 'sort_range' && act.colKey && onSortRange) {
                onSortRange(targetSheet, act.colKey, act.ascending ?? true);
            }
            const userChoiceMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                sender: 'user',
                text: `Đã chọn: ${sanitizeBotText(opt.label)}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
            };
            const aiConfirmMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: `Đã áp dụng thiết lập ${sanitizeBotText(opt.label)} lên bảng "${targetSheet}" và tự động đồng bộ lên Google Sheet!`,
                actionSummary: `Đã thực thi: Thiết lập "${opt.label}" trên ${targetSheet}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
            };
            setMessages((prev) => [...prev, userChoiceMsg, aiConfirmMsg]);
        }
        else if (opt.prompt) {
            handleSendMessage(opt.prompt);
        }
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    return (<div className="panel-card rounded-lg flex flex-col h-full overflow-hidden text-xs font-mono">

      <div className="h-9 px-3 bg-[#0b101c] border-b border-[#1a2336] flex items-center justify-between shrink-0 whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <BrainCircuit className="w-3.5 h-3.5 text-cyan-400"/>
          <span>{AGENT_BRAND.headerTitle}</span>
        </div>

        <div className="flex items-center gap-1.5">

          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-400"/>
            <span>{AGENT_BRAND.statusLabel}</span>
          </div>

          <button
            onClick={handleUndo}
            disabled={!canUndo || isLoading}
            className="px-2 py-0.5 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-300 hover:text-white border border-[#1a2336] disabled:opacity-30 disabled:hover:bg-[#090d16] flex items-center gap-1 font-bold text-[10px] transition-colors"
            title={canUndo ? `Hoàn tác thao tác trước (${undoStack.length} bước lưu trữ)` : "Không có thao tác nào để hoàn tác"}
          >
            <ArrowUturnLeftIcon className="w-3 h-3 text-amber-400" />
            <span>Hoàn tác{canUndo ? ` (${undoStack.length})` : ''}</span>
          </button>

          <button onClick={() => setShowDocModal(true)} className="p-1 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 hover:text-[var(--text-primary)] border border-[#1a2336]" title="Cấp quyền thêm tài liệu cho AI">
            <FilePlus2 className="w-3 h-3"/>
          </button>

          <button onClick={clearHistory} className="p-1 rounded bg-[#090d16] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#1a2336]" title="Xóa lịch sử hội thoại">
            <TrashIcon className="w-3 h-3"/>
          </button>
        </div>
      </div>

      <div className="px-2.5 py-1 bg-[#070a12] border-b border-[#1a2336] flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
        <span className="text-slate-500 font-bold uppercase shrink-0">Workspace:</span>
        <span className="px-2 py-0.5 rounded flex items-center gap-1 shrink-0 bg-[#0e1c2e] border border-emerald-500/40 text-emerald-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Sheet: {activeSheetTitle}</span>
        </span>
        <span className="px-2 py-0.5 rounded flex items-center gap-1 shrink-0 bg-[#241219] border border-rose-500/40 text-rose-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>Gmail</span>
        </span>
        <span className="px-2 py-0.5 rounded flex items-center gap-1 shrink-0 bg-[#0f1d38] border border-blue-500/40 text-blue-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>Drive</span>
        </span>
        <span className="px-2 py-0.5 rounded flex items-center gap-1 shrink-0 bg-[#0b222d] border border-cyan-500/40 text-cyan-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>Docs</span>
        </span>
        {permittedDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => toggleDocPermission(doc.id)}
            className={`px-2 py-0.5 rounded flex items-center gap-1 shrink-0 border transition-colors ${
              doc.isGranted
                ? 'bg-[#131b2e] border-indigo-500/50 text-indigo-200'
                : 'bg-[#090d16] border-[#1a2336] text-slate-600'
            }`}
            title={doc.contentSummary}
          >
            {doc.isGranted ? <CheckSquare className="w-2.5 h-2.5 text-indigo-400" /> : <Square className="w-2.5 h-2.5 text-slate-600" />}
            <span className="truncate max-w-[130px]">{doc.name}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 p-3 bg-[#070a12] overflow-y-auto space-y-3 select-text">
        {messages.map((msg) => (<div key={msg.id} className={`flex gap-2 text-[11px] leading-relaxed ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender !== 'user' && (<div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 mt-0.5 ${msg.sender === 'system'
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : 'bg-[#162036] border-[#232f48] text-cyan-400'}`}>
                {msg.sender === 'system'
                    ? <CircleAlert className="w-3.5 h-3.5"/>
                    : <Bot className="w-3.5 h-3.5"/>}
              </div>)}

            <div className={`max-w-[85%] rounded-lg p-2.5 space-y-1.5 ${msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : msg.sender === 'system'
                    ? 'bg-rose-950/80 border border-rose-800 text-rose-200'
                    : 'bg-[#111726] border border-[#1a2336] text-slate-200 rounded-bl-none'}`}>
              <div className="whitespace-pre-wrap">
                {msg.sender === 'user'
                  ? msg.text
                  : msg.id === 'welcome'
                    ? <TypingAnimation text={msg.text} duration={25} />
                    : sanitizeBotText(msg.text)}
              </div>

              {msg.options && msg.options.length > 0 && (<div className="mt-2.5 pt-2 border-t border-[#1a2336] space-y-1.5">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400"/>
                    <span>Chọn phong cách để áp dụng ngay:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {msg.options.map((opt, optIdx) => (<button key={optIdx} onClick={() => handleSelectOption(opt)} disabled={isLoading} className="w-full text-left p-2 rounded-md bg-[#090e1a] hover:bg-[#152136] border border-[#1e2a42] hover:border-indigo-500/80 transition-all flex items-center justify-between group disabled:opacity-50 active:scale-[0.99] shadow-sm">
                        <div className="flex items-center gap-2 min-w-0 pr-2">

                          {opt.previewBg ? (<div className="w-4 h-4 rounded shrink-0 border border-white/20 shadow-sm flex items-center justify-center font-bold text-[8px]" style={{
                            backgroundColor: opt.previewBg,
                            color: opt.previewColor || '#ffffff',
                        }} title={`Màu nền: ${opt.previewBg}`}>
                              Aa
                            </div>) : (<div className="w-4 h-4 rounded shrink-0 bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-[9px]">
                              {optIdx + 1}
                            </div>)}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 group-hover:text-white text-[11px] truncate flex items-center gap-1.5">
                              <span>{sanitizeBotText(opt.label)}</span>
                              {opt.badge && (<span className="px-1 py-0.2 rounded bg-indigo-950/80 text-indigo-300 text-[9px] border border-indigo-700/50">
                                  {sanitizeBotText(opt.badge)}
                                </span>)}
                            </div>
                            {opt.description && (<div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">
                                {sanitizeBotText(opt.description)}
                              </div>)}
                          </div>
                        </div>

                        <div className="shrink-0 px-2 py-0.5 rounded bg-indigo-600/90 group-hover:bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1 border border-indigo-400/30 shadow-sm">
                          <span>Áp dụng</span>
                        </div>
                      </button>))}
                  </div>
                </div>)}

              {msg.actionSummary && (<div className="mt-1 flex items-center justify-between gap-2 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[10px]">
                  <div className="flex items-center gap-1 font-bold truncate">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0"/>
                    <span className="truncate">{sanitizeBotText(msg.actionSummary)}</span>
                  </div>
                  {canUndo && (
                    <button
                      onClick={handleUndo}
                      disabled={isLoading}
                      className="shrink-0 px-1.5 py-0.2 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 flex items-center gap-0.5 text-[9px] font-bold transition-colors"
                      title="Hoàn tác thao tác này"
                    >
                      <ArrowUturnLeftIcon className="w-2.5 h-2.5" />
                      <span>Hoàn tác</span>
                    </button>
                  )}
                </div>)}

              <div className={`text-[9px] ${msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-500'}`}>
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (<div className="w-6 h-6 rounded bg-indigo-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5"/>
              </div>)}
          </div>))}

        {isLoading && (<div className="flex gap-2 items-center text-slate-400 text-[11px]">
            <div className="w-6 h-6 rounded bg-[#162036] flex items-center justify-center text-cyan-400 shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin"/>
            </div>
            <span className="italic">DeepSeek AI đang tự động xử lý toàn quyền...</span>
          </div>)}
        <div ref={messagesEndRef}/>
      </div>

      <div className="px-2.5 py-1 bg-[#090d16] border-t border-[#1a2336] flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
        {QUICK_ACTIONS.map(({ label, prompt, icon: Icon }) => (<button key={prompt} onClick={() => handleSendMessage(prompt)} disabled={isLoading} className="px-2 py-0.5 rounded bg-[#111726] hover:bg-[#162036] border border-[#1a2336] text-slate-400 hover:text-slate-200 shrink-0 disabled:opacity-40 transition-colors flex items-center gap-1.5">
            <Icon className="w-3 h-3 shrink-0"/>
            <span>{label}</span>
          </button>))}
      </div>

      <div className="p-2 bg-[#0b101c] border-t border-[#1a2336] flex items-center gap-1.5 shrink-0">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Hỏi hoặc ra lệnh theo dữ liệu bạn đang quản lý..." className="flex-1 bg-[#070a12] border border-[#1a2336] rounded-md px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] placeholder-slate-600 focus:outline-none focus:border-indigo-500"/>
        <button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()} className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shrink-0">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
        </button>
      </div>

      {showDocModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-[92vw] max-w-md bg-[#0e1422] border border-[#1a2336] rounded-xl p-3.5 sm:p-4 space-y-3 text-slate-100">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2 font-bold text-sm">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <FileText className="w-4 h-4"/>
                <span>Cấp Quyền Tài Liệu Bổ Sung Cho AI</span>
              </div>
              <button onClick={() => setShowDocModal(false)} className="rounded p-1 text-slate-400 hover:bg-[#161f32] hover:text-[var(--text-primary)]" aria-label="Đóng" title="Đóng">
                <X className="h-3.5 w-3.5"/>
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tên tài liệu / Tệp:</label>
              <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="Ví dụ: Bảng giá ưu đãi tháng 8, Kịch bản chăm sóc..." className="w-full bg-[#070a12] border border-[#1a2336] rounded px-2.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"/>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nội dung / Ghi chú ngữ cảnh:</label>
              <textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} rows={4} placeholder="Dán nội dung văn bản hoặc quy tắc nghiệp vụ tại đây để AI đọc và làm theo..." className="w-full bg-[#070a12] border border-[#1a2336] rounded p-2 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"/>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1a2336]">
              <button onClick={() => setShowDocModal(false)} className="px-3 py-1 rounded bg-[#090d16] hover:bg-[#161f32] text-slate-400 border border-[#1a2336]">
                Hủy
              </button>
              <button onClick={handleAddCustomDoc} disabled={!newDocName.trim()} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50">
                Cấp Quyền Tài Liệu
              </button>
            </div>
          </div>
        </div>)}

      {pendingAction && (
        <DestructiveActionDialog
          pendingAction={pendingAction}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
      )}
    </div>);
};
