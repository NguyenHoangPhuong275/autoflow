import type { LogEntry } from '@/types';
export function createLogEntry(level: LogEntry['level'], message: string, rowId?: string): LogEntry {
    return {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
        level,
        message,
        rowId,
    };
}
