import { GoogleReadService } from '@/core/google/services/googleReadService';

export class GoogleWriteService extends GoogleReadService {
  public static async updateHeaders(
    spreadsheetId: string,
    sheetTitle: string,
    newHeaders: string[]
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền ghi.');
    }

    const lastColLetter = newHeaders.length <= 26 
      ? String.fromCharCode(64 + newHeaders.length) 
      : 'Z';
    const range = `'${sheetTitle}'!A1:${lastColLetter}1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [newHeaders],
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể cập nhật tiêu đề cột trang "${sheetTitle}".`);
    }
  }

  public static async updateCell(
    spreadsheetId: string,
    sheetTitle: string,
    rowNumber: number,
    colKey: string,
    allHeaders: string[],
    newValue: any
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền ghi.');
    }

    const colIndex = allHeaders.findIndex((h) => h.toLowerCase() === colKey.toLowerCase());
    if (colIndex === -1) return;

    const colLetter = String.fromCharCode(65 + colIndex);
    const sheetRowNumber = rowNumber + 1;
    const range = `'${sheetTitle}'!${colLetter}${sheetRowNumber}`;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[newValue]],
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể cập nhật ô "${colKey}".`);
    }
  }

  public static async appendRow(
    spreadsheetId: string,
    sheetTitle: string,
    allHeaders: string[],
    rowData: Record<string, any>
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền ghi.');
    }

    const rowValues = allHeaders.map((h) => rowData[h] ?? '');
    const range = `'${sheetTitle}'!A1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể thêm hàng vào trang "${sheetTitle}".`);
    }
  }

  public static async deleteRowsByTitle(
    spreadsheetId: string,
    sheetTitle: string,
    rowNumbers: number[]
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền xóa trên Cloud.');
    }

    if (rowNumbers.length === 0) return;

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const targetSheet = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    const sheetId = targetSheet ? targetSheet.sheetId : 0;

    const requests = [...new Set(rowNumbers)]
      .sort((a, b) => b - a)
      .map((rowNumber) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber,
            endIndex: rowNumber + 1,
          },
        },
      }));

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Không thể xóa hàng trên Google Sheet.');
    }
  }

  public static async clearSheet(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền xóa trên Cloud.');
    }

    const range = `'${sheetTitle}'!A2:Z5000`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể xóa dữ liệu trang "${sheetTitle}".`);
    }
  }
}
