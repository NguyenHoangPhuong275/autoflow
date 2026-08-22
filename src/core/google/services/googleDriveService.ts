import { readJson } from '../../utils/errors.ts';
import { GoogleAuthService } from './googleAuthService.ts';

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export type DriveFileType = 'all' | 'supported' | 'sheets' | 'docs';

interface DriveListResponse {
  files?: DriveFileInfo[];
}

interface DriveErrorResponse {
  error?: { message?: string };
}

export class GoogleDriveService extends GoogleAuthService {
  public static async listFiles(options?: {
    pageSize?: number;
    query?: string;
    fields?: string;
  }): Promise<DriveFileInfo[]> {
    const token = this.requireAccessToken();
    const params = new URLSearchParams({
      pageSize: String(options?.pageSize || 20),
      fields: options?.fields || 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
      orderBy: 'modifiedTime desc',
    });
    if (options?.query) {
      params.set('q', options.query);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Google Drive API lỗi: ${await this.readApiError(response)}`);
    }

    const result = await readJson<DriveListResponse>(response, {});
    return result.files ?? [];
  }

  public static searchSheets(nameQuery?: string): Promise<DriveFileInfo[]> {
    return this.searchFiles({ type: 'sheets', nameQuery });
  }

  public static searchDocs(nameQuery?: string): Promise<DriveFileInfo[]> {
    return this.searchFiles({ type: 'docs', nameQuery });
  }

  public static searchFiles(options?: {
    type?: DriveFileType;
    nameQuery?: string;
    pageSize?: number;
  }): Promise<DriveFileInfo[]> {
    return this.listFiles({
      query: this.buildSearchQuery(options?.type || 'all', options?.nameQuery),
      pageSize: options?.pageSize || 20,
    });
  }

  public static async createFolder(folderName: string, parentFolderId?: string): Promise<DriveFileInfo> {
    const body: Record<string, unknown> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId) {
      body.parents = [parentFolderId];
    }

    return this.mutateFile(
      'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink',
      'POST',
      body,
      'Drive Create Folder lỗi',
    );
  }

  public static renameFile(fileId: string, newName: string): Promise<DriveFileInfo> {
    return this.mutateFile(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`,
      'PATCH',
      { name: newName },
      'Drive Rename lỗi',
    );
  }

  public static async trashFile(fileId: string): Promise<void> {
    await this.mutateFile(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      'PATCH',
      { trashed: true },
      'Drive Trash lỗi',
    );
  }

  public static async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.requireAccessToken()}` },
    });
    if (!response.ok) {
      throw new Error(`Drive Delete lỗi: ${await this.readApiError(response)}`);
    }
  }

  private static buildSearchQuery(fileType: DriveFileType, nameQuery?: string): string {
    const clauses = ['trashed = false'];
    if (fileType === 'sheets') {
      clauses.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
    } else if (fileType === 'docs') {
      clauses.push("mimeType = 'application/vnd.google-apps.document'");
    } else if (fileType === 'supported') {
      clauses.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.document')");
    }
    if (nameQuery?.trim()) {
      clauses.push(`name contains '${nameQuery.replace(/'/g, "\\'")}'`);
    }
    return clauses.join(' and ');
  }

  private static async mutateFile(
    url: string,
    method: 'POST' | 'PATCH',
    body: Record<string, unknown>,
    errorPrefix: string,
  ): Promise<DriveFileInfo> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.requireAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${errorPrefix}: ${await this.readApiError(response)}`);
    }
    return readJson<DriveFileInfo>(response, { id: '', name: '', mimeType: '' });
  }

  private static requireAccessToken(): string {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }
    return token;
  }

  private static async readApiError(response: Response): Promise<string> {
    const result = await readJson<DriveErrorResponse>(response, {});
    return result.error?.message || `HTTP ${response.status}: ${response.statusText}`;
  }
}
