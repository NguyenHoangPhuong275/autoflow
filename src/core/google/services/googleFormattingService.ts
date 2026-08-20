import { detectColorToGoogleRgb } from '@/core/google/color';
import { GoogleStructureService } from '@/core/google/services/googleStructureService';
import { readGoogleApiError } from '@/core/google/services/googleApiUtils';

export class GoogleFormattingService extends GoogleStructureService {
  public static detectColorToGoogleRgb(colorStr: string): { red: number; green: number; blue: number } {
    return detectColorToGoogleRgb(colorStr);
  }

  public static async fetchSheetFormat(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<{
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    backgroundColor?: string;
    fontColor?: string;
  } | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?ranges=${encodeURIComponent(sheetTitle)}!1:1&fields=sheets.data.rowData.values.userEnteredFormat`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const format = data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.userEnteredFormat;
      if (!format) return null;

      const rgbToHex = (c?: { red?: number; green?: number; blue?: number }) => {
        if (!c) return undefined;
        const r = Math.round((c.red || 0) * 255).toString(16).padStart(2, '0');
        const g = Math.round((c.green || 0) * 255).toString(16).padStart(2, '0');
        const b = Math.round((c.blue || 0) * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      };

      return {
        fontFamily: format.textFormat?.fontFamily,
        fontSize: format.textFormat?.fontSize,
        bold: format.textFormat?.bold,
        backgroundColor: rgbToHex(format.backgroundColor),
        fontColor: rgbToHex(format.textFormat?.foregroundColor),
      };
    } catch (err) {
      console.warn('[GoogleFormattingService] Failed to fetch sheet format:', err);
      return null;
    }
  }

  public static async formatCells(
    spreadsheetId: string,
    sheetTitle: string,
    rangeA1: string = '1:1',
    options: {
      backgroundColor?: string;
      fontColor?: string;
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
      fontFamily?: string;
      alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    } = {}
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    const sheetId = target ? target.sheetId : 0;

    let startRow = 0;
    let endRow = 1;
    let startCol = 0;
    let endCol = 10;

    if (rangeA1 === '1:1' || rangeA1.toLowerCase() === 'header' || rangeA1.toLowerCase() === 'headers') {
      startRow = 0;
      endRow = 1;
      startCol = 0;

      try {
        const safeTitle = encodeURIComponent(sheetTitle);
        const headerRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeTitle}'!1:1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (headerRes.ok) {
          const headerData = await headerRes.json();
          const firstRow = headerData.values?.[0] || [];
          endCol = firstRow.length > 0 ? firstRow.length : 10;
        }
      } catch (e) {
        console.warn('Failed to fetch header columns count:', e);
      }
    } else {
      const match = rangeA1.match(/([A-Za-z]+)?(\d+)?(?::([A-Za-z]+)?(\d+)?)?/);
      if (match) {
        if (match[1]) startCol = match[1].toUpperCase().charCodeAt(0) - 65;
        if (match[2]) startRow = parseInt(match[2], 10) - 1;
        if (match[3]) endCol = match[3].toUpperCase().charCodeAt(0) - 64;
        if (match[4]) endRow = parseInt(match[4], 10);
      }
    }

    const userEnteredFormat: Record<string, unknown> = {};
    const fields: string[] = [];

    if (options.backgroundColor) {
      userEnteredFormat.backgroundColor = this.detectColorToGoogleRgb(options.backgroundColor);
      fields.push('userEnteredFormat.backgroundColor');
    }

    const textFormat: Record<string, unknown> = {};
    if (options.fontColor) {
      textFormat.foregroundColor = this.detectColorToGoogleRgb(options.fontColor);
      fields.push('userEnteredFormat.textFormat.foregroundColor');
    }
    if (options.bold !== undefined) {
      textFormat.bold = options.bold;
      fields.push('userEnteredFormat.textFormat.bold');
    }
    if (options.italic !== undefined) {
      textFormat.italic = options.italic;
      fields.push('userEnteredFormat.textFormat.italic');
    }
    if (options.fontSize) {
      textFormat.fontSize = options.fontSize;
      fields.push('userEnteredFormat.textFormat.fontSize');
    }
    if (options.fontFamily) {
      textFormat.fontFamily = options.fontFamily;
      fields.push('userEnteredFormat.textFormat.fontFamily');
    }
    if (Object.keys(textFormat).length > 0) {
      userEnteredFormat.textFormat = textFormat;
    }

    if (options.alignment) {
      userEnteredFormat.horizontalAlignment = options.alignment.toUpperCase();
      fields.push('userEnteredFormat.horizontalAlignment');
    }

    if (fields.length === 0) return;

    const requests: Array<Record<string, unknown>> = [
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: startRow,
            endRowIndex: endRow,
            startColumnIndex: startCol,
            endColumnIndex: endCol,
          },
          cell: { userEnteredFormat },
          fields: fields.join(','),
        },
      },
    ];

    if (startRow === 0 && endRow === 1 && endCol < 26) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: endCol,
            endColumnIndex: 26,
          },
          cell: {},
          fields: 'userEnteredFormat',
        },
      });
    }

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
      throw new Error(await readGoogleApiError(response, 'Không thể định dạng ô tính.'));
    }
  }

  public static async fetchSheetChartIds(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<number[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title),charts.chartId)`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json() as {
        sheets?: Array<{
          properties?: { title?: string };
          charts?: Array<{ chartId?: number }>;
        }>;
      };
      const targetSheet = (data.sheets || []).find(
        (sheet) => sheet.properties?.title?.toLowerCase() === sheetTitle.toLowerCase()
      );
      if (!targetSheet || !targetSheet.charts) return [];
      return targetSheet.charts
        .map((chart) => chart.chartId)
        .filter((chartId): chartId is number => chartId !== undefined);
    } catch (err) {
      console.warn('[GoogleFormattingService] Failed to fetch sheet chart IDs:', err);
      return [];
    }
  }

  public static async clearCharts(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const chartIds = await this.fetchSheetChartIds(spreadsheetId, sheetTitle);
    if (chartIds.length === 0) return;

    const requests = chartIds.map((chartId) => ({
      deleteEmbeddedObject: {
        objectId: chartId,
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
      throw new Error(await readGoogleApiError(response, 'Không thể xóa biểu đồ.'));
    }
  }

  public static async addChart(
    spreadsheetId: string,
    sheetTitle: string,
    chartType: 'COLUMN' | 'BAR' | 'LINE' | 'PIE' = 'COLUMN',
    title: string = 'Báo Cáo Thống Kê',
    domainColIndex: number = 0,
    seriesColIndex: number = 1,
    rowCount: number = 10,
    rowIndexOffset: number = 0
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    const sheetId = target ? target.sheetId : 0;

    const headerNames = await this.fetchSheetHeaderNames(spreadsheetId, sheetTitle);
    const anchorCol = headerNames.length > 0 ? headerNames.length + 1 : 7;

    const chartSpec = chartType === 'PIE'
      ? {
          title,
          pieChart: {
            legendPosition: 'RIGHT_LEGEND',
            domain: {
              sourceRange: {
                sources: [
                  {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: rowCount + 1,
                    startColumnIndex: domainColIndex,
                    endColumnIndex: domainColIndex + 1,
                  },
                ],
              },
            },
            series: {
              sourceRange: {
                sources: [
                  {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: rowCount + 1,
                    startColumnIndex: seriesColIndex,
                    endColumnIndex: seriesColIndex + 1,
                  },
                ],
              },
            },
          },
        }
      : {
          title,
          basicChart: {
            chartType,
            legendPosition: 'BOTTOM_LEGEND',
            lineSmoothing: chartType === 'LINE',
            axis: [
              { position: 'BOTTOM_AXIS', title: 'Danh mục / Nhãn' },
              { position: 'LEFT_AXIS', title: 'Giá trị' },
            ],
            domains: [
              {
                domain: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId,
                        startRowIndex: 0,
                        endRowIndex: rowCount + 1,
                        startColumnIndex: domainColIndex,
                        endColumnIndex: domainColIndex + 1,
                      },
                    ],
                  },
                },
              },
            ],
            series: [
              {
                series: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId,
                        startRowIndex: 0,
                        endRowIndex: rowCount + 1,
                        startColumnIndex: seriesColIndex,
                        endColumnIndex: seriesColIndex + 1,
                      },
                    ],
                  },
                },
                targetAxis: 'LEFT_AXIS',
              },
            ],
          },
        };

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
              addChart: {
                chart: {
                  spec: chartSpec,
                  position: {
                    overlayPosition: {
                      anchorCell: {
                        sheetId,
                        rowIndex: rowIndexOffset,
                        columnIndex: anchorCol,
                      },
                      widthPixels: 550,
                      heightPixels: 340,
                    },
                  },
                },
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await readGoogleApiError(response, 'Không thể tạo biểu đồ trên Google Sheets.'));
    }
  }

  public static async fetchSheetHeaderNames(spreadsheetId: string, sheetTitle: string): Promise<string[]> {
    const token = this.getAccessToken();
    if (!token) return [];
    try {
      const safeTitle = encodeURIComponent(sheetTitle);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeTitle}'!1:1`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json() as { values?: unknown[][] };
      const row = data.values?.[0] || [];
      return row.map((cell) => String(cell || '').trim()).filter(Boolean);
    } catch (err) {
      console.warn('[GoogleFormattingService] Failed to fetch sheet header names:', err);
      return [];
    }
  }

  public static async autoResizeColumns(
    spreadsheetId: string,
    sheetTitle: string,
    startCol: number = 0,
    endCol?: number
  ): Promise<void> {
    return this.setColumnWidth(spreadsheetId, sheetTitle, 160, startCol, endCol);
  }

  public static async setColumnWidth(
    spreadsheetId: string,
    sheetTitle: string,
    pixelSize: number = 160,
    startCol: number = 0,
    endCol?: number
  ): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const metadata = await this.fetchSheetMetadata(spreadsheetId);
    const target = metadata.find((s) => s.title.toLowerCase() === sheetTitle.toLowerCase());
    const sheetId = target ? target.sheetId : 0;

    let targetEndCol = endCol;
    if (targetEndCol === undefined) {
      const headerNames = await this.fetchSheetHeaderNames(spreadsheetId, sheetTitle);
      targetEndCol = headerNames.length > 0 ? headerNames.length : 12;
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
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: startCol,
                  endIndex: targetEndCol,
                },
                properties: {
                  pixelSize,
                },
                fields: 'pixelSize',
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await readGoogleApiError(response, 'Không thể cập nhật độ rộng cột.'));
    }
  }
}
