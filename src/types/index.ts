export type DataSourceId = 'sample' | 'google_sheets' | 'local_file';
export type AppServiceId = 'google_sheets' | 'google_docs' | 'ms_excel' | 'local_file';
export type RowStatus = 'pending' | 'running' | 'success' | 'failed';
export interface DataRow {
    id: string;
    rowNumber: number;
    data: Record<string, any>;
    status: RowStatus;
    resultMessage?: string;
    executionTimeMs?: number;
}
export type LogLevel = 'info' | 'process' | 'success' | 'warn' | 'error';
export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: string;
    rowId?: string;
}
export type PipelineStage = 'idle' | 'authorizing' | 'fetching_data' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
export interface ExecutionStats {
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
    progressPercent: number;
}
