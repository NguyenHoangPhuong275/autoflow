import { GoogleAuthService } from './googleAuthService.ts';

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export class GoogleDriveService extends GoogleAuthService {
  /**
   * Fetches files from user's Google Drive.
   */
  public static async listFiles(options?: {
    pageSize?: number;
    query?: string;
    fields?: string;
  }): Promise<DriveFileInfo[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }

    const pageSize = options?.pageSize || 20;
    const fields = options?.fields || 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)';
    let url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc`;

    if (options?.query) {
      url += `&q=${encodeURIComponent(options.query)}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[GoogleDriveService] Failed to list Drive files:', errMsg);
        throw new Error(`Google Drive API lỗi: ${errMsg}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (err: any) {
      console.error('[GoogleDriveService] Error during listFiles:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Searches for Google Sheets in Drive.
   */
  public static async searchSheets(nameQuery?: string): Promise<DriveFileInfo[]> {
    let q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
    if (nameQuery?.trim()) {
      q += ` and name contains '${nameQuery.replace(/'/g, "\\'")}'`;
    }
    return this.listFiles({ query: q, pageSize: 20 });
  }

  /**
   * Searches for Google Docs in Drive.
   */
  public static async searchDocs(nameQuery?: string): Promise<DriveFileInfo[]> {
    let q = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
    if (nameQuery?.trim()) {
      q += ` and name contains '${nameQuery.replace(/'/g, "\\'")}'`;
    }
    return this.listFiles({ query: q, pageSize: 20 });
  }
}
