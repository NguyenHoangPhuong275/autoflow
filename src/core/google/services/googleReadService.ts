import type { DataRow } from '@/types';
import type { SheetTabInfo } from '@/core/google/types';
import { GoogleAuthService } from '@/core/google/services/googleAuthService';

export class GoogleReadService extends GoogleAuthService {
  public static async fetchSheetMetadata(spreadsheetId: string): Promise<SheetTabInfo[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      const data = await response.json();
      const sheets = data.sheets || [];
      return sheets.map((s: any) => ({
        title: s.properties.title,
        sheetId: s.properties.sheetId,
      }));
    } catch (e) {
      console.warn('Failed to fetch sheet metadata:', e);
      return [];
    }
  }

  public static async fetchSheet(
    spreadsheetId: string,
    sheetTitle: string = 'Sheet1'
  ): Promise<DataRow[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google OAuth.');
    }

    const safeTitle = encodeURIComponent(sheetTitle);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeTitle}'!A:Z`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Không thể đọc dữ liệu trang "${sheetTitle}".`);
    }

    const data = await response.json();
    const values: any[][] = data.values || [];
    if (values.length <= 1) {
      return [];
    }

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map((r, rowIdx) => {
      const rowData: Record<string, any> = {};
      headers.forEach((h: string, colIdx: number) => {
        rowData[h || `Cột_${colIdx + 1}`] = r[colIdx] !== undefined ? r[colIdx] : '';
      });
      return {
        id: `gs-${sheetTitle}-${rowIdx + 1}-${Date.now()}`,
        rowNumber: rowIdx + 1,
        data: rowData,
        status: 'pending',
      };
    });
  }
}
