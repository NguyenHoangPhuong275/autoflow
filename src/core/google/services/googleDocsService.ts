import { GoogleAuthService } from './googleAuthService.ts';

export interface GoogleDocContent {
  documentId: string;
  title: string;
  bodyText: string;
  revisionId?: string;
}

export class GoogleDocsService extends GoogleAuthService {
  /**
   * Fetches a Google Doc and converts its structural elements into plain text/markdown.
   */
  public static async fetchDocument(documentId: string): Promise<GoogleDocContent> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }

    const cleanDocId = documentId.replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1').trim();
    const url = `https://docs.googleapis.com/v1/documents/${cleanDocId}`;

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
        console.error('[GoogleDocsService] Failed to fetch document:', errMsg);
        if (errMsg.toLowerCase().includes('insufficient')) {
          throw new Error('Token hiện tại chưa có quyền đọc Google Docs. Vui lòng Đăng xuất và Đăng nhập lại Google.');
        }
        throw new Error(`Google Docs API lỗi: ${errMsg}`);
      }

      const doc = await response.json();
      const title = doc.title || 'Untitled Document';
      const textPieces: string[] = [];

      if (doc.body?.content) {
        for (const element of doc.body.content) {
          if (element.paragraph?.elements) {
            for (const pElem of element.paragraph.elements) {
              if (pElem.textRun?.content) {
                textPieces.push(pElem.textRun.content);
              }
            }
          } else if (element.table?.tableRows) {
            for (const row of element.table.tableRows) {
              const rowTexts: string[] = [];
              for (const cell of row.tableCells || []) {
                const cellText = (cell.content || [])
                  .map((c: any) =>
                    (c.paragraph?.elements || [])
                      .map((p: any) => p.textRun?.content || '')
                      .join('')
                  )
                  .join(' ')
                  .trim();
                rowTexts.push(cellText);
              }
              textPieces.push(`| ${rowTexts.join(' | ')} |\n`);
            }
          }
        }
      }

      return {
        documentId: cleanDocId,
        title,
        bodyText: textPieces.join(''),
        revisionId: doc.revisionId,
      };
    } catch (err: any) {
      console.error('[GoogleDocsService] Error during fetchDocument:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Creates a new Google Doc and optionally writes initial content.
   */
  public static async createDocument(title: string, initialContent?: string): Promise<{ documentId: string; title: string }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    try {
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => null);
        const errMsg = errJson?.error?.message || createRes.statusText;
        if (errMsg.toLowerCase().includes('insufficient')) {
          throw new Error('Token hiện tại chưa có quyền tạo Google Docs (đang là Read-Only). Vui lòng bấm Đăng xuất ở Header và Đăng nhập lại Google để nhận quyền Tạo/Sửa.');
        }
        throw new Error(`Google Docs Create lỗi: ${errMsg}`);
      }

      const newDoc = await createRes.json();
      const documentId = newDoc.documentId;

      if (initialContent?.trim()) {
        await this.appendText(documentId, initialContent);
      }

      return { documentId, title };
    } catch (err: any) {
      console.error('[GoogleDocsService] Error creating document:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Appends text to the end of a Google Doc.
   */
  public static async appendText(documentId: string, text: string): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const cleanDocId = documentId.replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1').trim();
    const url = `https://docs.googleapis.com/v1/documents/${cleanDocId}:batchUpdate`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                endOfSegmentLocation: {},
                text: text.endsWith('\n') ? text : `${text}\n`,
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || res.statusText;
        if (errMsg.toLowerCase().includes('insufficient')) {
          throw new Error('Token hiện tại chưa có quyền chỉnh sửa Google Docs. Vui lòng Đăng xuất và Đăng nhập lại.');
        }
        throw new Error(`Google Docs Append Text lỗi: ${errMsg}`);
      }
    } catch (err: any) {
      console.error('[GoogleDocsService] Error appending text:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
