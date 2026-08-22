import * as XLSX from 'xlsx';
import { DataRow } from '@/types';
import { toError } from '@/core/utils/errors';
export class ExcelParser {
    public static async parseFile(file: File): Promise<DataRow[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
                    if (json.length === 0) {
                        throw new Error('Tệp không có dữ liệu ở trang đầu tiên.');
                    }
                    const rows: DataRow[] = json.map((item, idx) => ({
                        id: `row-${idx + 1}-${Date.now()}`,
                        rowNumber: idx + 1,
                        data: item,
                        status: 'pending',
                    }));
                    resolve(rows);
                }
                catch (error: unknown) {
                    reject(toError(error, 'Không thể phân tích tệp Excel.'));
                }
            };
            reader.onerror = () => {
                const error = new Error('Không thể đọc tệp Excel từ bộ nhớ trình duyệt.');
                reject(error);
            };
            reader.readAsArrayBuffer(file);
        });
    }
}
