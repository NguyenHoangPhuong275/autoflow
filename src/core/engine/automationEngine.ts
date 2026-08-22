import { DataRow, LogEntry, ExecutionStats } from '@/types';
import { DeepSeekService } from '@/core/services/deepSeekService';
import { createLogEntry } from '@/core/logging/createLogEntry';
import { getUserErrorMessage } from '@/core/utils/errors';
export class AutomationEngine {
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private rows: DataRow[] = [];
    private speedMs: number = 600;
    private useAiProcessing: boolean = true;
    public onStateChange?: (stats: ExecutionStats, stage: string) => void;
    public onRowUpdate?: (row: DataRow) => void;
    public onLog?: (log: LogEntry) => void;
    public onComplete?: () => void;
    public setSpeed(ms: number) {
        this.speedMs = ms;
    }
    public setUseAiProcessing(enable: boolean) {
        this.useAiProcessing = enable;
    }
    public getRows(): DataRow[] {
        return this.rows;
    }
    public setRows(rawObjects: Record<string, unknown>[]): DataRow[] {
        this.rows = rawObjects.map((item, idx) => ({
            id: `row-${idx + 1}-${Date.now()}`,
            rowNumber: idx + 1,
            data: item,
            status: 'pending',
        }));
        return this.rows;
    }
    public clearRows(): DataRow[] {
        this.rows = [];
        return this.rows;
    }
    public updateRow(rowId: string, updatedData: Record<string, unknown>): DataRow[] {
        this.rows = this.rows.map((r) => {
            if (r.id === rowId) {
                return { ...r, data: updatedData };
            }
            return r;
        });
        return this.rows;
    }
    public batchUpdateRows(updates: Array<{
        rowId: string;
        updatedData: Record<string, unknown>;
    }>): DataRow[] {
        const updateMap = new Map<string, Record<string, unknown>>();
        updates.forEach((u) => updateMap.set(u.rowId, u.updatedData));
        this.rows = this.rows.map((r) => {
            if (updateMap.has(r.id)) {
                return { ...r, data: updateMap.get(r.id)! };
            }
            return r;
        });
        return this.rows;
    }
    public deleteRow(rowId: string): DataRow[] {
        return this.deleteRows([rowId]);
    }
    public deleteRows(rowIds: string[]): DataRow[] {
        const ids = new Set(rowIds);
        this.rows = this.rows.filter((r) => !ids.has(r.id)).map((r, idx) => ({
            ...r,
            rowNumber: idx + 1,
        }));
        return this.rows;
    }
    public addRow(customData?: Record<string, unknown>): DataRow[] {
        const defaultData: Record<string, unknown> = {};
        const existingHeaders = this.rows.length > 0 ? Object.keys(this.rows[0].data) : Object.keys(customData || {});
        if (existingHeaders.length === 0) {
            return this.rows;
        }
        existingHeaders.forEach((k) => {
            defaultData[k] = '';
        });
        if (customData) {
            Object.entries(customData).forEach(([inputKey, val]) => {
                const matchedHeader = existingHeaders.find((h) => h.toLowerCase() === inputKey.toLowerCase());
                if (matchedHeader) {
                    defaultData[matchedHeader] = String(val);
                }
                else {
                    defaultData[inputKey] = String(val);
                }
            });
        }
        const newRow: DataRow = {
            id: `row-new-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            rowNumber: this.rows.length + 1,
            data: defaultData,
            status: 'pending',
        };
        this.rows = [...this.rows, newRow];
        return this.rows;
    }
    public getStats(): ExecutionStats {
        const total = this.rows.length;
        const pending = this.rows.filter((r) => r.status === 'pending').length;
        const running = this.rows.filter((r) => r.status === 'running').length;
        const success = this.rows.filter((r) => r.status === 'success').length;
        const failed = this.rows.filter((r) => r.status === 'failed').length;
        const processed = success + failed;
        const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;
        return { total, pending, running, success, failed, progressPercent };
    }
    public async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.isPaused = false;
        this.notifyStats('running');
        this.addLog('process', `Đã bắt đầu xử lý ${this.rows.length} hàng dữ liệu bằng AI.`);
        for (let i = 0; i < this.rows.length; i++) {
            if (!this.isRunning)
                break;
            while (this.isPaused) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                if (!this.isRunning)
                    break;
            }
            const row = this.rows[i];
            if (row.status === 'success')
                continue;
            row.status = 'running';
            this.onRowUpdate?.({ ...row });
            this.notifyStats('running');
            const keyVal = Object.values(row.data)[1] || Object.values(row.data)[0] || `Hàng #${row.rowNumber}`;
            this.addLog('info', `Hàng ${row.rowNumber}: AI đang phân tích dữ liệu ${keyVal}...`, row.id);
            const startTime = Date.now();
            try {
                let aiResult = '';
                if (this.useAiProcessing) {
                    aiResult = await DeepSeekService.processRow(row.data);
                }
                else {
                    await new Promise((resolve) => setTimeout(resolve, this.speedMs));
                    aiResult = 'Đã xử lý xong';
                }
                const executionTime = Date.now() - startTime;
                row.executionTimeMs = executionTime;
                row.status = 'success';
                row.resultMessage = aiResult;
                this.addLog('success', `Hàng ${row.rowNumber}: AI đã hoàn tất — "${aiResult}" (thời gian xử lý: ${executionTime} ms)`, row.id);
            }
            catch (error: unknown) {
            const message = getUserErrorMessage(error, 'Không thể xử lý dữ liệu của hàng. Vui lòng thử lại.');
                const executionTime = Date.now() - startTime;
                row.executionTimeMs = executionTime;
                row.status = 'failed';
                row.resultMessage = `Không thể xử lý dữ liệu: ${message}`;
                this.addLog('error', `Hàng ${row.rowNumber}: Không thể hoàn tất. ${message}`, row.id);
            }
            this.onRowUpdate?.({ ...row });
            this.notifyStats('running');
            if (this.speedMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, Math.min(this.speedMs, 300)));
            }
        }
        this.isRunning = false;
        this.isPaused = false;
        const finalStats = this.getStats();
        this.addLog('process', `Đã hoàn tất quy trình: ${finalStats.success}/${finalStats.total} hàng thành công, ${finalStats.failed} hàng chưa xử lý được.`);
        this.notifyStats('completed');
        this.onComplete?.();
    }
    public pause() {
        this.isPaused = true;
        this.addLog('warn', 'Đã tạm dừng quy trình.');
        this.notifyStats('paused');
    }
    public resume() {
        this.isPaused = false;
        this.addLog('info', 'Đã tiếp tục quy trình.');
        this.notifyStats('running');
    }
    public stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.addLog('warn', 'Đã dừng quy trình.');
        this.notifyStats('ready');
    }
    public reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.rows = this.rows.map((r) => ({
            ...r,
            status: 'pending',
            resultMessage: undefined,
            executionTimeMs: undefined,
        }));
        this.addLog('info', 'Đã đặt lại trạng thái các hàng về chờ xử lý.');
        this.notifyStats('ready');
    }
    private addLog(level: LogEntry['level'], message: string, rowId?: string) {
        this.onLog?.(createLogEntry(level, message, rowId));
    }
    private notifyStats(stage: string) {
        this.onStateChange?.(this.getStats(), stage);
    }
}
