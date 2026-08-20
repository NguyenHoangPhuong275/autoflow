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

  /**
   * Creates a new folder in Google Drive.
   */
  public static async createFolder(folderName: string, parentFolderId?: string): Promise<DriveFileInfo> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const body: Record<string, any> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId) {
      body.parents = [parentFolderId];
    }

    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(`Drive Create Folder lỗi: ${errJson?.error?.message || res.statusText}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('[GoogleDriveService] Error creating folder:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Renames a file or folder in Google Drive.
   */
  public static async renameFile(fileId: string, newName: string): Promise<DriveFileInfo> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(`Drive Rename lỗi: ${errJson?.error?.message || res.statusText}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('[GoogleDriveService] Error renaming file:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Moves a file or folder to Google Drive Trash.
   */
  public static async trashFile(fileId: string): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(`Drive Trash lỗi: ${errJson?.error?.message || res.statusText}`);
      }
    } catch (err: any) {
      console.error('[GoogleDriveService] Error trashing file:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Permanently deletes a file or folder in Google Drive.
   */
  public static async deleteFile(fileId: string): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(`Drive Delete lỗi: ${errJson?.error?.message || res.statusText}`);
      }
    } catch (err: any) {
      console.error('[GoogleDriveService] Error deleting file:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
