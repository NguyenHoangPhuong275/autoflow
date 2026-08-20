import React from 'react';
import { ArrowDownTrayIcon as Download, ArrowPathIcon as Loader2, CheckCircleIcon as CheckCircle2, ClockIcon as Clock, DocumentChartBarIcon as FileSpreadsheet, FunnelIcon, InboxIcon, MagnifyingGlassIcon as Search, PencilSquareIcon as Edit2, PlusIcon as Plus, TableCellsIcon as TableIcon, TrashIcon as Trash2, XCircleIcon as XCircle, } from '@heroicons/react/24/outline';
import { BlurFade } from '@/components/ui/blur-fade';
import { BorderBeam } from '@/components/ui/border-beam';
import { STATUS_FILTERS, } from '@/components/pipeline/dataGridUtils';
import { DataRow, RowStatus } from '@/types';
import { SheetTabInfo } from '@/core/services/googleSyncService';
import { useDataGridState } from '@/hooks/useDataGridState';
interface DataGridProps {
    rows: DataRow[];
    sheetTabs?: SheetTabInfo[];
    allSheetHeaders?: Record<string, string[]>;
    activeSheetTitle?: string;
    isLoading?: boolean;
    isBusy?: boolean;
    onSelectSheetTab?: (sheetTitle: string) => void;
    onUpdateRow?: (rowId: string, updatedData: Record<string, any>, colKey?: string, newValue?: any) => void;
    onDeleteRow?: (rowId: string) => void;
    onAddRow?: () => void;
}
export const DataGrid: React.FC<DataGridProps> = ({ rows, sheetTabs = [], allSheetHeaders = {}, activeSheetTitle = 'Sheet1', isLoading = false, isBusy = false, onSelectSheetTab, onUpdateRow, onDeleteRow, onAddRow, }) => {
    const { searchTerm, setSearchTerm, statusFilter, setStatusFilter, editingCell, editValue, setEditValue, columnKeys, numericColumns, primaryColumn, filteredRows, startEditing, saveEditing, handleCellKeyDown, handleExportCSV, } = useDataGridState({ rows, activeSheetTitle, allSheetHeaders, onUpdateRow });
    const renderStatus = (status: RowStatus) => {
        const config = {
            pending: {
                label: 'Chờ xử lý',
                icon: Clock,
                className: 'bg-[#101726] text-slate-400 border-[#1a2336]',
            },
            running: {
                label: 'Đang chạy',
                icon: Loader2,
                className: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
            },
            success: {
                label: 'Hoàn thành',
                icon: CheckCircle2,
                className: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
            },
            failed: {
                label: 'Có lỗi',
                icon: XCircle,
                className: 'bg-rose-950/80 text-rose-300 border-rose-800',
            },
        }[status];
        const Icon = config.icon;
        return (<span className={`inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[9px] font-semibold ${config.className}`}>
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`}/>
        {config.label}
      </span>);
    };
    return (<section className="panel-card relative flex h-full flex-col overflow-hidden rounded-xl font-mono text-xs">
      {(isBusy || isLoading) && (<BorderBeam size={90} duration={4.5} colorFrom="#22d3ee" colorTo="#6366f1" borderWidth={1.5}/>)}

      <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[#1a2336] bg-[#0b101c] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-indigo-500/40 bg-indigo-500/10 text-indigo-400">
            <TableIcon className="h-4 w-4"/>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[12px] font-bold tracking-tight text-[var(--text-primary)]">Bảng dữ liệu</h2>
              {isLoading && (<span className="inline-flex items-center gap-1 text-[9px] font-medium text-cyan-400">
                  <Loader2 className="h-3 w-3 animate-spin"/> Đang tải dữ liệu...
                </span>)}
              {isBusy && !isLoading && (<span className="inline-flex items-center gap-1 text-[9px] font-medium text-cyan-400">
                  <Loader2 className="h-3 w-3 animate-spin"/> Đang đồng bộ
                </span>)}
            </div>
            <p className="truncate text-[9px] text-slate-500">
              {activeSheetTitle} · {filteredRows.length}/{rows.length} dòng hiển thị {columnKeys.length > 0 ? `(${columnKeys.length} cột)` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onAddRow && (<button onClick={() => onAddRow()} disabled={isLoading} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 text-[10px] font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50" title="Thêm một dòng mới">
              <Plus className="h-3.5 w-3.5"/>
              Thêm dòng
            </button>)}
          <button onClick={handleExportCSV} disabled={columnKeys.length === 0 || isLoading} className="grid h-7 w-7 place-items-center rounded-md border border-[#1a2336] bg-[#090d16] text-slate-400 transition-colors hover:bg-[#161f32] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40" title="Xuất dữ liệu CSV">
            <Download className="h-3.5 w-3.5"/>
          </button>
        </div>
      </header>

      <div className="flex min-h-10 shrink-0 flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 border-b border-[#1a2336] bg-[#090d16] px-2.5 sm:px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sheetTabs.length > 0 ? sheetTabs.map((tab) => {
            const isActive = tab.title === activeSheetTitle;
            return (<button key={tab.title} onClick={() => onSelectSheetTab?.(tab.title)} disabled={isLoading} aria-pressed={isActive} className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[9px] font-semibold transition-colors disabled:opacity-50 ${isActive
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-transparent text-slate-500 hover:border-[#1a2336] hover:bg-[#131b2e] hover:text-slate-200'}`}>
                <FileSpreadsheet className="h-3 w-3"/>
                {tab.title}
              </button>);
        }) : (<span className="text-[9px] text-slate-600">Chưa có trang tính</span>)}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto max-w-full">
          <label className="relative block shrink-0">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"/>
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm kiếm" className="h-6 w-24 sm:w-32 rounded-md border border-[#1a2336] bg-[#070a12] pl-6 pr-2 text-[9px] text-[var(--text-primary)] outline-none transition-all placeholder:text-slate-600 focus:w-32 sm:focus:w-40 focus:border-indigo-500"/>
          </label>

          <div className="flex items-center gap-0.5 rounded-md border border-[#1a2336] bg-[#070a12] p-0.5 shrink-0">
            <FunnelIcon className="mx-1 h-3 w-3 text-slate-500"/>
            {STATUS_FILTERS.map((filter) => (<button key={filter.value} onClick={() => setStatusFilter(filter.value)} aria-pressed={statusFilter === filter.value} className={`h-5 rounded px-1.5 text-[9px] transition-colors ${statusFilter === filter.value
                ? 'bg-indigo-600 font-semibold text-white'
                : 'text-slate-500 hover:text-[var(--text-primary)]'}`}>
                {filter.label}
              </button>))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#070a12]">
        <BlurFade key={`${activeSheetTitle}-${rows.length}-${isLoading}`} duration={0.3} offset={4} blur="4px" className="min-w-full">
          {isLoading ? (<div className="grid min-h-[260px] place-items-center p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg border border-indigo-500/40 bg-[#101726] text-cyan-400">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400"/>
                </div>
                <p className="text-[12px] font-bold text-slate-200">Đang tải dữ liệu từ Google Sheets...</p>
                <p className="mt-1 text-[10px] text-slate-500">Đang kết nối và đồng bộ bảng tính {activeSheetTitle}.</p>
              </div>
            </div>) : columnKeys.length === 0 && rows.length === 0 ? (<div className="grid min-h-[260px] place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg border border-[#1a2336] bg-[#101726] text-slate-500">
                  <InboxIcon className="h-5 w-5"/>
                </div>
                <p className="text-[11px] font-semibold text-slate-300">Chưa có cấu trúc cột</p>
                <p className="mt-1 text-[9px] text-slate-600">Trang tính này hiện đang trống hoặc chưa nạp dữ liệu.</p>
              </div>
            </div>) : (<table className="w-max min-w-full border-collapse text-left text-[10px]">
              <thead className="sticky top-0 z-10 border-b border-[#1a2336] bg-[#0f1626] text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                <tr>
                  <th className="h-9 w-12 px-3 text-center">#</th>
                  <th className="h-9 min-w-[108px] px-3">Trạng thái</th>
                  {columnKeys.map((key) => (<th key={key} className={`h-9 min-w-[112px] px-3 font-bold text-slate-200 ${numericColumns.has(key) ? 'text-right' : ''}`}>
                      {key}
                    </th>))}
                  <th className="h-9 min-w-[200px] px-3">Phản hồi</th>
                  <th className="h-9 w-12 px-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162036]/60 whitespace-nowrap">
                {rows.length === 0 ? (<tr>
                    <td colSpan={columnKeys.length + 4} className="h-48 text-center p-8 bg-[#070a12]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <InboxIcon className="h-6 w-6 text-slate-600"/>
                        <p className="text-[11px] font-semibold text-slate-300">
                          Trang tính "{activeSheetTitle}" có {columnKeys.length} cột nhưng chưa có dòng dữ liệu nào
                        </p>
                        <p className="text-[9px] text-slate-500">
                          Bấm nút <span className="text-indigo-400 font-bold">"+ Thêm dòng"</span> ở góc trên hoặc ra lệnh cho DeepSeek AI để thêm dữ liệu tự động.
                        </p>
                      </div>
                    </td>
                  </tr>) : (filteredRows.map((row) => (<tr key={row.id} className={`group h-10 transition-colors even:bg-[var(--table-row-alt)] hover:bg-[var(--surface-hover)] ${row.status === 'running' ? 'bg-cyan-950/25' : ''}`}>
                      <td className="px-3 text-center text-[9px] font-medium tabular-nums text-slate-500">
                        {String(row.rowNumber).padStart(2, '0')}
                      </td>
                      <td className="px-3">{renderStatus(row.status)}</td>
                      {columnKeys.map((key) => {
                    const isEditing = editingCell?.rowId === row.id && editingCell.colKey === key;
                    const value = row.data[key] ?? '';
                    const isNumeric = numericColumns.has(key);
                    const isPrimary = key === primaryColumn;
                    return (<td key={key} onClick={() => startEditing(row.id, key, value)} className={`max-w-[190px] cursor-text px-3 transition-colors hover:bg-indigo-500/5 ${isNumeric ? 'text-right tabular-nums' : ''} ${isPrimary ? 'font-semibold text-[var(--text-primary)]' : 'text-slate-300'}`} title={`${key}: ${String(value)} · Nhấp để chỉnh sửa`}>
                            {isEditing ? (<input type="text" value={editValue} onChange={(event) => setEditValue(event.target.value)} onBlur={() => saveEditing(row)} onKeyDown={(event) => handleCellKeyDown(event, row)} autoFocus className={`h-7 w-full min-w-[96px] rounded-md border border-indigo-500 bg-[#1e293b] px-2 text-[10px] text-[var(--text-primary)] outline-none ring-2 ring-indigo-500/15 ${isNumeric ? 'text-right tabular-nums' : ''}`}/>) : (<div className="flex items-center justify-between gap-2">
                                <span className="truncate">{String(value) || '—'}</span>
                                <Edit2 className="h-3 w-3 shrink-0 text-indigo-400 opacity-0 transition-opacity group-hover:opacity-50"/>
                              </div>)}
                          </td>);
                })}
                      <td className="max-w-[240px] px-3 text-slate-500">
                        <span className="block truncate">{row.resultMessage || 'Chưa có phản hồi'}</span>
                      </td>
                      <td className="px-2 text-center">
                        {onDeleteRow && (<button onClick={() => onDeleteRow(row.id)} className="grid h-6 w-6 place-items-center rounded-md text-slate-600 opacity-0 transition-all hover:bg-rose-950 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100" title={`Xóa dòng ${row.rowNumber}`} aria-label={`Xóa dòng ${row.rowNumber}`}>
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>)}
                      </td>
                    </tr>)))}
              </tbody>
            </table>)}
        </BlurFade>
      </div>
    </section>);
};
