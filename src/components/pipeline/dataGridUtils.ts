import type { DataRow, RowStatus } from '@/types';
export const STATUS_FILTERS: Array<{
    value: RowStatus | 'all';
    label: string;
}> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ' },
    { value: 'running', label: 'Đang chạy' },
    { value: 'success', label: 'Hoàn thành' },
    { value: 'failed', label: 'Lỗi' },
];
export function isNumericColumn(key: string, rows: DataRow[]): boolean {
    if (/price|giá|stock|kho|amount|total|tổng|qty|quantity|số lượng/i.test(key)) {
        return true;
    }
    const values = rows
        .map((row) => row.data[key])
        .filter((value) => value !== '' && value != null)
        .slice(0, 20);
    return values.length > 0 && values.every((value) => typeof value === 'number' || /^-?[\d.,]+(?:đ|₫)?$/i.test(String(value).trim()));
}
export function escapeCsv(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
