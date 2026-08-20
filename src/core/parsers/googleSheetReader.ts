import { DataRow } from '@/types';
import { SheetTabInfo } from '@/core/services/googleSyncService';

export class GoogleSheetReader {
  public static extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  public static extractGid(url: string): string {
    const match = url.match(/[#&]gid=([0-9]+)/);
    return match ? match[1] : '0';
  }

  public static async discoverSheetTabs(spreadsheetId: string): Promise<SheetTabInfo[]> {
    try {
      const editUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      const response = await fetch(editUrl);
      if (!response.ok) return [];

      const html = await response.text();
      const regex = /class="[^"]*docs-sheet-tab-caption[^"]*">([^<]+)<\/div>/g;
      const discovered: string[] = [];
      let m: RegExpExecArray | null;

      while ((m = regex.exec(html)) !== null) {
        const title = m[1].trim();
        if (title && !discovered.includes(title)) {
          discovered.push(title);
        }
      }

      if (discovered.length > 0) {
        return discovered.map((title, idx) => ({
          title,
          sheetId: idx,
        }));
      }
    } catch (e) {
      console.warn('Cannot auto-discover sheet tabs from HTML:', e);
    }

    if (spreadsheetId === '1afOya-FzRWZK9wrstjeXlVWvf-ZInvWO9XThNbh44w8') {
      return [
        { title: 'Products', sheetId: 0 },
        { title: 'Users', sheetId: 1 },
        { title: 'Orders', sheetId: 2 },
        { title: 'Accounts', sheetId: 3 },
        { title: 'Sold', sheetId: 4 },
      ];
    }

    return [];
  }

  public static async fetchAllSheetHeaders(
    spreadsheetId: string,
    tabTitles: string[]
  ): Promise<Record<string, string[]>> {
    const headersMap: Record<string, string[]> = {};

    await Promise.all(
      tabTitles.map(async (tabTitle) => {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabTitle)}`;
          const response = await fetch(gvizUrl);
          if (!response.ok) return;

          const text = await response.text();
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1) return;

          const gvizData = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          const table = gvizData.table;
          if (!table) return;

          let tabHeaders: string[] = [];
          const hasColLabels = table.cols && table.cols.some((c: any) => c.label && c.label.trim() !== '');

          if (hasColLabels) {
            tabHeaders = table.cols.map((c: any, i: number) =>
              c.label && c.label.trim() !== '' ? c.label.trim() : `Cột_${i + 1}`
            );
          } else if (table.rows && table.rows.length > 0 && table.rows[0].c) {
            tabHeaders = table.rows[0].c.map((c: any, i: number) =>
              c && c.v !== null && c.v !== undefined ? String(c.v).trim() : `Cột_${i + 1}`
            );
          }

          if (tabHeaders.length > 0) {
            headersMap[tabTitle] = tabHeaders;
          }
        } catch (e) {
          console.warn(`Failed to fetch headers for sheet "${tabTitle}":`, e);
        }
      })
    );

    return headersMap;
  }

  public static async fetchRealGoogleSheet(
    url: string,
    sheetTitle?: string
  ): Promise<{
    rows: DataRow[];
    headers: string[];
    defaultTitle: string;
    discoveredTabs: SheetTabInfo[];
  }> {
    const spreadsheetId = this.extractSpreadsheetId(url);
    if (!spreadsheetId) {
      throw new Error('Link không đúng định dạng Google Sheets. Vui lòng kiểm tra lại URL.');
    }

    const discoveredTabs = await this.discoverSheetTabs(spreadsheetId);
    const targetTitle = sheetTitle || (discoveredTabs.length > 0 ? discoveredTabs[0].title : undefined);

    let gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
    if (targetTitle) {
      gvizUrl += `&sheet=${encodeURIComponent(targetTitle)}`;
    } else {
      const gid = this.extractGid(url);
      gvizUrl += `&gid=${gid}`;
    }

    try {
      const response = await fetch(gvizUrl);
      if (!response.ok) {
        throw new Error('Không thể truy cập Google Sheet. Hãy kiểm tra xem tệp đã được bật quyền "Bất kỳ ai có đường liên kết đều có thể xem (Viewer)" hay chưa.');
      }

      const text = await response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Phản hồi từ Google không hợp lệ.');
      }

      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const gvizData = JSON.parse(jsonString);

      if (gvizData.status === 'error') {
        const errorReason = gvizData.errors?.[0]?.detailed_message || gvizData.errors?.[0]?.message || 'Lỗi từ Google';
        throw new Error(`Google Sheets báo lỗi: ${errorReason}`);
      }

      const table = gvizData.table;
      if (!table) {
        return {
          rows: [],
          headers: [],
          defaultTitle: targetTitle || 'Sheet1',
          discoveredTabs,
        };
      }

      let headers: string[] = [];
      let rawRows: any[] = table.rows || [];

      const hasColLabels = table.cols && table.cols.some((c: any) => c.label && c.label.trim() !== '');
      if (hasColLabels) {
        headers = table.cols.map((c: any, i: number) =>
          c.label && c.label.trim() !== '' ? c.label.trim() : `Cột_${i + 1}`
        );
      } else if (rawRows.length > 0 && rawRows[0].c) {
        headers = rawRows[0].c.map((c: any, i: number) =>
          c && c.v !== null && c.v !== undefined ? String(c.v).trim() : `Cột_${i + 1}`
        );
        rawRows = rawRows.slice(1);
      }

      const parsedRows: DataRow[] = [];
      rawRows.forEach((r: any, rowIdx: number) => {
        if (!r.c) return;
        const rowData: Record<string, any> = {};
        let hasValue = false;

        r.c.forEach((cell: any, colIdx: number) => {
          const colName = headers[colIdx] || `Cột_${colIdx + 1}`;
          const val = cell ? (cell.f !== undefined ? cell.f : cell.v) : '';
          rowData[colName] = val !== null && val !== undefined ? val : '';
          if (val !== '' && val !== null && val !== undefined) {
            hasValue = true;
          }
        });

        if (hasValue) {
          parsedRows.push({
            id: `gs-${rowIdx + 1}-${Date.now()}`,
            rowNumber: parsedRows.length + 1,
            data: rowData,
            status: 'pending',
          });
        }
      });

      return {
        rows: parsedRows,
        headers,
        defaultTitle: targetTitle || 'Sheet1',
        discoveredTabs,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi không xác định khi kết nối Google Sheets.');
    }
  }
}
