import type { DataRow } from '@/types';
import type { SheetTabInfo } from '@/core/google/types';
import { getErrorMessage, readJson } from '@/core/utils/errors';
import { GoogleAuthService } from '@/core/google/services/googleAuthService';

interface SheetMetadataResponse {
  sheets?: Array<{ properties: { title: string; sheetId: number } }>;
}

interface SheetValuesResponse {
  values?: unknown[][];
  error?: { message?: string };
}

export class GoogleReadService extends GoogleAuthService {
  public static async fetchSheetMetadata(spreadsheetId: string): Promise<SheetTabInfo[]> {
    const token = this.getAccessToken();
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        return [];
      }

      const data = await readJson<SheetMetadataResponse>(response, {});
      return (data.sheets ?? []).map(({ properties }) => ({
        title: properties.title,
        sheetId: properties.sheetId,
      }));
    } catch (error: unknown) {
      console.warn(`Không thể đọc metadata Google Sheet: ${getErrorMessage(error)}`);
      return [];
    }
  }

  public static async fetchSheet(spreadsheetId: string, sheetTitle = 'Sheet1'): Promise<DataRow[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google OAuth.');
    }

    const safeTitle = encodeURIComponent(sheetTitle);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeTitle}'!A:Z`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await readJson<SheetValuesResponse>(response, {});
    if (!response.ok) {
      throw new Error(data.error?.message || `Không thể đọc dữ liệu trang "${sheetTitle}".`);
    }

    const values = data.values ?? [];
    if (values.length <= 1) {
      return [];
    }

    const headers = values[0].map((header, index) => String(header || `Cột_${index + 1}`));
    return values.slice(1).map((row, rowIndex) => {
      const rowData = Object.fromEntries(
        headers.map((header, columnIndex) => [header, row[columnIndex] ?? '']),
      );
      return {
        id: `gs-${sheetTitle}-${rowIndex + 1}-${Date.now()}`,
        rowNumber: rowIndex + 1,
        data: rowData,
        status: 'pending' as const,
      };
    });
  }
}
