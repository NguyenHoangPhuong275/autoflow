import { GoogleAuthService } from './googleAuthService.ts';

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

export interface EmailDetail extends EmailSummary {
  bodyText: string;
  labels: string[];
}

export class GoogleGmailService extends GoogleAuthService {
  /**
   * Lists recent emails with metadata (Subject, From, Date, Snippet).
   */
  public static async listRecentEmails(options?: {
    maxResults?: number;
    query?: string;
  }): Promise<EmailSummary[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }

    const maxResults = options?.maxResults || 10;
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    if (options?.query) {
      url += `&q=${encodeURIComponent(options.query)}`;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[GoogleGmailService] Failed to list messages:', errMsg);
        throw new Error(`Gmail API lỗi: ${errMsg}`);
      }

      const listData = await response.json();
      const messages = listData.messages || [];

      // Fetch summary headers for each message in parallel (up to maxResults)
      const summaries = await Promise.all(
        messages.map(async (msg: { id: string; threadId: string }) => {
          try {
            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!detailRes.ok) return null;
            const detail = await detailRes.json();
            const headers: EmailHeader[] = detail.payload?.headers || [];
            const getH = (name: string) =>
              headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            return {
              id: detail.id,
              threadId: detail.threadId,
              snippet: detail.snippet || '',
              subject: getH('Subject') || '(Không có tiêu đề)',
              from: getH('From'),
              date: getH('Date'),
              unread: (detail.labelIds || []).includes('UNREAD'),
            } as EmailSummary;
          } catch (itemErr) {
            console.warn(`[GoogleGmailService] Failed to fetch summary for message ${msg.id}:`, itemErr);
            return null;
          }
        })
      );

      return summaries.filter((s): s is EmailSummary => s !== null);
    } catch (err: any) {
      console.error('[GoogleGmailService] Error during listRecentEmails:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Fetches full email body text.
   */
  public static async fetchEmail(messageId: string): Promise<EmailDetail> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google.');
    }

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        throw new Error(`Gmail API lỗi: ${errMsg}`);
      }

      const data = await res.json();
      const headers: EmailHeader[] = data.payload?.headers || [];
      const getH = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      // Decode base64 body if available
      let bodyText = data.snippet || '';
      const parts = data.payload?.parts || [];
      const textPart = parts.find((p: any) => p.mimeType === 'text/plain') || data.payload;

      if (textPart?.body?.data) {
        try {
          const decoded = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          bodyText = decoded;
        } catch {
          // fallback to snippet
        }
      }

      return {
        id: data.id,
        threadId: data.threadId,
        snippet: data.snippet || '',
        subject: getH('Subject') || '(Không có tiêu đề)',
        from: getH('From'),
        date: getH('Date'),
        unread: (data.labelIds || []).includes('UNREAD'),
        labels: data.labelIds || [],
        bodyText,
      };
    } catch (err: any) {
      console.error('[GoogleGmailService] Error during fetchEmail:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
