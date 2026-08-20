import { readJson } from '../../utils/errors.ts';
import { GoogleAuthService } from './googleAuthService.ts';

export interface GoogleDocContent {
  documentId: string;
  title: string;
  bodyText: string;
  revisionId?: string;
}

interface GoogleDocElement {
  paragraph?: { elements?: Array<{ textRun?: { content?: string } }> };
  table?: { tableRows?: Array<{ tableCells?: Array<{ content?: GoogleDocElement[] }> }> };
}

interface GoogleDocResponse {
  documentId?: string;
  title?: string;
  revisionId?: string;
  body?: { content?: GoogleDocElement[] };
}

interface GoogleApiError {
  error?: { message?: string };
}

interface CreatedDocument {
  documentId: string;
  title: string;
}

export class GoogleDocsService extends GoogleAuthService {
  public static async fetchDocument(documentId: string): Promise<GoogleDocContent> {
    const cleanDocumentId = this.normalizeDocumentId(documentId);
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${cleanDocumentId}`, {
      headers: {
        Authorization: `Bearer ${this.requireAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const message = await this.readApiError(response);
      if (message.toLowerCase().includes('insufficient')) {
        throw new Error('Token hiện tại chưa có quyền đọc Google Docs. Vui lòng đăng xuất và đăng nhập lại Google.');
      }
      throw new Error(`Google Docs API lỗi: ${message}`);
    }

    const document = await readJson<GoogleDocResponse>(response, {});
    return {
      documentId: cleanDocumentId,
      title: document.title || 'Untitled Document',
      bodyText: this.extractText(document.body?.content ?? []),
      revisionId: document.revisionId,
    };
  }

  public static async createDocument(title: string, initialContent?: string): Promise<CreatedDocument> {
    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.requireAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const message = await this.readApiError(response);
      if (message.toLowerCase().includes('insufficient')) {
        throw new Error('Token hiện tại chưa có quyền tạo Google Docs. Vui lòng đăng xuất và đăng nhập lại Google để nhận quyền tạo và sửa.');
      }
      throw new Error(`Google Docs Create lỗi: ${message}`);
    }

    const createdDocument = await readJson<CreatedDocument>(response, { documentId: '', title });
    if (initialContent?.trim()) {
      await this.appendText(createdDocument.documentId, initialContent);
    }
    return createdDocument;
  }

  public static async appendText(documentId: string, text: string): Promise<void> {
    const cleanDocumentId = this.normalizeDocumentId(documentId);
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${cleanDocumentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.requireAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          insertText: {
            endOfSegmentLocation: {},
            text: text.endsWith('\n') ? text : `${text}\n`,
          },
        }],
      }),
    });

    if (!response.ok) {
      const message = await this.readApiError(response);
      if (message.toLowerCase().includes('insufficient')) {
        throw new Error('Token hiện tại chưa có quyền chỉnh sửa Google Docs. Vui lòng đăng xuất và đăng nhập lại.');
      }
      throw new Error(`Google Docs Append Text lỗi: ${message}`);
    }
  }

  private static normalizeDocumentId(value: string): string {
    return value.replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1').trim();
  }

  private static extractText(elements: GoogleDocElement[]): string {
    const pieces: string[] = [];
    for (const element of elements) {
      const paragraphText = element.paragraph?.elements
        ?.map((paragraphElement) => paragraphElement.textRun?.content || '')
        .join('');
      if (paragraphText) {
        pieces.push(paragraphText);
        continue;
      }

      for (const row of element.table?.tableRows ?? []) {
        const cells = (row.tableCells ?? []).map((cell) => this.extractText(cell.content ?? []).trim());
        pieces.push(`| ${cells.join(' | ')} |\n`);
      }
    }
    return pieces.join('');
  }

  private static requireAccessToken(): string {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }
    return token;
  }

  private static async readApiError(response: Response): Promise<string> {
    const result = await readJson<GoogleApiError>(response, {});
    return result.error?.message || `HTTP ${response.status}: ${response.statusText}`;
  }
}
