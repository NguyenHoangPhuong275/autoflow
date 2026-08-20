import { GoogleWriteService } from '@/core/google/services/googleWriteService';

export class GoogleStructureService extends GoogleWriteService {
  public static async addSheetTab(
    spreadsheetId: string,
    sheetTitle: string,
    initialHeaders?: string[]
  ): Promise<number> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền tạo trang tính.');
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể tạo trang tính "${sheetTitle}".`);
    }

    const resData = await response.json();
    const newSheetId = resData.replies?.[0]?.addSheet?.properties?.sheetId || 0;

    if (initialHeaders && initialHeaders.length > 0) {
      await this.updateHeaders(spreadsheetId, sheetTitle, initialHeaders);
    }

    return newSheetId;
  }

  public static async deleteSheetTab(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Bấm nút "Đăng nhập Google" ở góc trên để cấp quyền xóa trang tính.');
    }

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    if (!target) {
      throw new Error(`Không tìm thấy trang tính "${sheetTitle}" để xóa.`);
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId: target.sheetId,
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể xóa trang tính "${sheetTitle}".`);
    }
  }

  public static async duplicateSheetTab(
    spreadsheetId: string,
    sourceSheetTitle: string,
    newSheetTitle?: string
  ): Promise<number> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google.');
    }

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sourceSheetTitle.toLowerCase());
    if (!target) {
      throw new Error(`Không tìm thấy trang tính "${sourceSheetTitle}" để nhân bản.`);
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              duplicateSheet: {
                sourceSheetId: target.sheetId,
                newSheetName: newSheetTitle || `${sourceSheetTitle} (Copy)`,
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể nhân bản trang "${sourceSheetTitle}".`);
    }

    const resData = await response.json();
    return resData.replies?.[0]?.duplicateSheet?.properties?.sheetId || 0;
  }

  public static async renameSheetTab(
    spreadsheetId: string,
    oldSheetTitle: string,
    newSheetTitle: string
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google.');
    }

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === oldSheetTitle.toLowerCase());
    if (!target) {
      throw new Error(`Không tìm thấy trang tính "${oldSheetTitle}".`);
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: target.sheetId,
                  title: newSheetTitle,
                },
                fields: 'title',
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể đổi tên trang tính.`);
    }
  }

  public static async freezeRowsCols(
    spreadsheetId: string,
    sheetTitle: string,
    frozenRowCount: number = 1,
    frozenColumnCount: number = 0
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    if (!target) throw new Error(`Không tìm thấy trang "${sheetTitle}".`);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: target.sheetId,
                  gridProperties: {
                    frozenRowCount,
                    frozenColumnCount,
                  },
                },
                fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount',
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Không thể cố định hàng/cột.');
    }
  }

  public static async sortRange(
    spreadsheetId: string,
    sheetTitle: string,
    colIndex: number,
    ascending: boolean = true
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    if (!target) throw new Error(`Không tìm thấy trang "${sheetTitle}".`);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              sortRange: {
                range: {
                  sheetId: target.sheetId,
                  startRowIndex: 1,
                },
                sortSpecs: [
                  {
                    dimensionIndex: colIndex,
                    sortOrder: ascending ? 'ASCENDING' : 'DESCENDING',
                  },
                ],
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Không thể sắp xếp dữ liệu.');
    }
  }

  public static async updateRangeValues(
    spreadsheetId: string,
    sheetTitle: string,
    rangeA1: string,
    values: any[][]
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const fullRange = rangeA1.includes('!') ? rangeA1 : `'${sheetTitle}'!${rangeA1}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: fullRange,
        majorDimension: 'ROWS',
        values,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể cập nhật dải ô "${rangeA1}".`);
    }
  }

  public static async addColumn(
    spreadsheetId: string,
    sheetTitle: string,
    columnName: string,
    currentHeaders: string[]
  ): Promise<string[]> {
    const updatedHeaders = [...currentHeaders, columnName];
    await this.updateHeaders(spreadsheetId, sheetTitle, updatedHeaders);
    return updatedHeaders;
  }

  public static async deleteColumn(
    spreadsheetId: string,
    sheetTitle: string,
    colKey: string,
    currentHeaders: string[]
  ): Promise<string[]> {
    const colIndex = currentHeaders.findIndex((h) => h.toLowerCase() === colKey.toLowerCase());
    if (colIndex === -1) {
      throw new Error(`Không tìm thấy cột "${colKey}" để xóa.`);
    }

    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    const sheetId = target ? target.sheetId : 0;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: colIndex,
                  endIndex: colIndex + 1,
                },
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Không thể xóa cột "${colKey}".`);
    }

    return currentHeaders.filter((_, idx) => idx !== colIndex);
  }

  public static async autoFillFormula(
    spreadsheetId: string,
    sheetTitle: string,
    formulaValues: string[][],
    rangeA1: string
  ): Promise<void> {
    await this.updateRangeValues(spreadsheetId, sheetTitle, rangeA1, formulaValues);
  }
}
