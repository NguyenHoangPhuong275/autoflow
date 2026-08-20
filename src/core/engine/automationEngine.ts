import { DataRow, LogEntry, ExecutionStats } from '@/types';
import { DeepSeekService } from '@/core/services/deepSeekService';
import { createLogEntry } from '@/core/logging/createLogEntry';
import { getErrorMessage } from '@/core/utils/errors';
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
    public setRows(rawObjects: Record<string, any>[]): DataRow[] {
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
    public updateRow(rowId: string, updatedData: Record<string, any>): DataRow[] {
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
        updatedData: Record<string, any>;
    }>): DataRow[] {
        const updateMap = new Map<string, Record<string, any>>();
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
    public addRow(customData?: Record<string, any>): DataRow[] {
        const defaultData: Record<string, any> = {};
        const existingHeaders = this.rows.length > 0 ? Object.keys(this.rows[0].data) : ['ID', 'NAME', 'PRICE', 'STOCK', 'TYPE', 'DESC'];
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
        if (defaultData['ID'] === '' || defaultData['ID'] === undefined) {
            defaultData['ID'] = `p${this.rows.length + 1}`;
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
        this.addLog('process', `Khởi chạy pipeline với ${this.rows.length} hàng dữ kiện [DeepSeek AI Active].`);
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
            this.addLog('info', `[#${row.rowNumber}] DeepSeek AI đang phân tích: ${keyVal}...`, row.id);
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
                this.addLog('success', `[#${row.rowNumber}] AI phản hồi: "${aiResult}" (${executionTime}ms)`, row.id);
            }
            catch (error: unknown) {
                const message = getErrorMessage(error);
                console.error(`[AutomationEngine] Row #${row.rowNumber} pipeline execution failed:`, error);
                const executionTime = Date.now() - startTime;
                row.executionTimeMs = executionTime;
                row.status = 'failed';
                row.resultMessage = `Lỗi AI: ${message}`;
                this.addLog('error', `[#${row.rowNumber}] Thất bại: ${message}`, row.id);
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
        this.addLog('process', `Pipeline hoàn tất: ${finalStats.success}/${finalStats.total} thành công, ${finalStats.failed} lỗi.`);
        this.notifyStats('completed');
        this.onComplete?.();
    }
    public pause() {
        this.isPaused = true;
        this.addLog('warn', 'Tạm dừng pipeline.');
        this.notifyStats('paused');
    }
    public resume() {
        this.isPaused = false;
        this.addLog('info', 'Tiếp tục pipeline.');
        this.notifyStats('running');
    }
    public stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.addLog('warn', 'Dừng pipeline.');
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
