import React, { useState } from 'react';
import { useAutomation } from '@/hooks/useAutomation';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/layout/Header';
import { PipelineVisualizer } from '@/components/pipeline/PipelineVisualizer';
import { ControlBar } from '@/components/pipeline/ControlBar';
import { DataGrid } from '@/components/pipeline/DataGrid';
import { TerminalLogs } from '@/components/pipeline/TerminalLogs';
import { AiCopilotChat } from '@/components/chat/AiCopilotChat';
import { AGENT_BRAND } from '@/core/ai/agentBrand';
import { CommandLineIcon as TerminalIcon, CpuChipIcon as Bot, } from '@heroicons/react/24/outline';
export const App: React.FC = () => {
    const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'terminal'>('chat');
    const { theme, setTheme } = useTheme();
    const { url, setUrl, activeSourceId, stage, rows, logs, stats, speed, isLoading, sheetTabs, allSheetHeaders, activeSheetTitle, selectSheetTab, loadFile, fetchFromUrl, updateHeaders, addColumn, deleteColumn, freezeRowsCols, sortRange, updateRange, formatCells, autoResizeColumns, setColumnWidth, addChart, clearCharts, createSheet, deleteSheet, duplicateSheet, renameSheet, updateRow, batchUpdateRows, batchDeleteRows, deleteRow, clearSheet, addRow, start, pause, resume, reset, clearLogs, changeSpeed, } = useAutomation();
    const handleLoginSuccess = () => {
        if (url.trim()) {
            fetchFromUrl(url);
        }
    };
    return (<div className="min-h-screen xl:h-screen w-screen flex flex-col p-2 sm:p-2.5 gap-2 bg-[var(--app-background)] text-[var(--text-primary)] overflow-y-auto xl:overflow-hidden select-none font-mono">

      <Header stats={stats} stage={stage} speed={speed} onStart={start} onPause={pause} onResume={resume} onReset={reset} onChangeSpeed={changeSpeed} onLoginSuccess={handleLoginSuccess} theme={theme} onThemeChange={setTheme}/>

      <ControlBar url={url} setUrl={setUrl} isLoading={isLoading} onFileUpload={(file) => loadFile(file)} onFetchFromUrl={(targetUrl) => fetchFromUrl(targetUrl)}/>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-2 pb-2 xl:pb-0">

        <div className="col-span-1 xl:col-span-7 h-[460px] sm:h-[540px] xl:h-full min-h-0">
          <DataGrid rows={rows} sheetTabs={sheetTabs} allSheetHeaders={allSheetHeaders} activeSheetTitle={activeSheetTitle} isLoading={isLoading} onSelectSheetTab={selectSheetTab} onUpdateRow={updateRow} onDeleteRow={deleteRow} onAddRow={addRow}/>
        </div>

        <div className="col-span-1 xl:col-span-5 h-[580px] xl:h-full min-h-0 flex flex-col gap-2">

          <div className="h-[180px] sm:h-[200px] xl:h-[32%] min-h-[120px]">
            <PipelineVisualizer activeSourceId={activeSourceId} stage={stage}/>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-1.5">

            <div className="flex items-center justify-between px-1 shrink-0 text-[11px]">
              <div className="flex items-center gap-1 bg-[#070a12] p-0.5 rounded border border-[#1a2336] max-w-full overflow-x-auto">
                <button onClick={() => setRightPanelTab('chat')} className={`px-2.5 py-0.5 rounded flex items-center gap-1.5 font-bold transition-colors shrink-0 ${rightPanelTab === 'chat'
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:text-slate-200'}`}>
                  <Bot className="w-3 h-3 text-cyan-400"/>
                  <span className="truncate">{AGENT_BRAND.tabLabel}</span>
                </button>
                <button onClick={() => setRightPanelTab('terminal')} className={`px-2.5 py-0.5 rounded flex items-center gap-1.5 font-bold transition-colors shrink-0 ${rightPanelTab === 'terminal'
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:text-slate-200'}`}>
                  <TerminalIcon className="w-3 h-3 text-slate-400"/>
                  <span>Nhật Ký</span>
                  {logs.length > 0 && (<span className="px-1 py-0.2 rounded bg-[#162036] text-[9px] text-slate-400 border border-[#232f48]">
                      {logs.length}
                    </span>)}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {rightPanelTab === 'chat' ? (<AiCopilotChat rows={rows} sheetTabs={sheetTabs} allSheetHeaders={allSheetHeaders} activeSheetTitle={activeSheetTitle} onUpdateHeaders={updateHeaders} onAddColumn={addColumn} onDeleteColumn={deleteColumn} onFreezeRowsCols={freezeRowsCols} onSortRange={sortRange} onUpdateRange={updateRange} onFormatCells={formatCells} onAutoResizeColumns={autoResizeColumns} onSetColumnWidth={setColumnWidth} onAddChart={addChart} onClearCharts={clearCharts} onCreateSheet={createSheet} onDeleteSheet={deleteSheet} onDuplicateSheet={duplicateSheet} onRenameSheet={renameSheet} onUpdateRow={updateRow} onBatchUpdateRows={batchUpdateRows} onBatchDeleteRows={batchDeleteRows} onAddRow={addRow} onDeleteRow={deleteRow} onClearSheet={clearSheet} onSelectSheetTab={selectSheetTab} onStartPipeline={start} onPausePipeline={pause} onResumePipeline={resume} onResetPipeline={reset} onClearLogs={clearLogs} onChangeSpeed={changeSpeed} onFetchFromUrl={fetchFromUrl}/>) : (<TerminalLogs logs={logs} onClearLogs={clearLogs}/>)}
            </div>
          </div>
        </div>
      </div>
    </div>);
};
