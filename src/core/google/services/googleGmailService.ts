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

/**
 * Robust UTF-8 Base64 decoder for URL-safe Gmail payloads.
 */
function decodeBase64Utf8(base64Str: string): string {
  try {
    const clean = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.warn('[GoogleGmailService] Failed UTF-8 decode, falling back:', err);
    try {
      return atob(base64Str.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

/**
 * Robust UTF-8 Base64 encoder for URL-safe Gmail messages.
 */
function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Recursively extracts plain text or clean text from multipart email payload.
 */
function extractBodyFromPayload(payload: any): string {
  if (!payload) return '';

  // Single part with body data
  if (payload.body?.data && (!payload.mimeType || payload.mimeType === 'text/plain')) {
    return decodeBase64Utf8(payload.body.data);
  }

  // Multipart payload: check parts recursively
  if (payload.parts && Array.isArray(payload.parts)) {
    // Priority 1: text/plain
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plainPart?.body?.data) {
      return decodeBase64Utf8(plainPart.body.data);
    }

    // Priority 2: nested text/plain in sub-parts
    for (const part of payload.parts) {
      const nestedText = extractBodyFromPayload(part);
      if (nestedText) return nestedText;
    }

    // Priority 3: text/html stripped of tags
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = decodeBase64Utf8(htmlPart.body.data);
      return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                 .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/[ \t]+/g, ' ')
                 .replace(/\n\s*\n/g, '\n\n')
                 .trim();
    }
  }

  // Fallback: any direct body data
  if (payload.body?.data) {
    return decodeBase64Utf8(payload.body.data);
  }

  return '';
}

export class GoogleGmailService extends GoogleAuthService {
  /**
   * Expands user/AI queries into intelligent fallbacks (e.g. OTP -> code/verification/auth).
   */
  private static expandSearchQuery(query?: string): string[] {
    if (!query || !query.trim()) return [''];
    const q = query.trim();
    const queries = [q];

    const hasOtp = /\b(otp|m[aã]|code|x[aá]c th[uự]c|x[aá]c minh|verification|auth|authentication)\b/i.test(q);
    const hasOpenAi = /\b(openai|chatgpt)\b/i.test(q);

    if (hasOpenAi && hasOtp) {
      queries.push('(OpenAI OR ChatGPT) (code OR verification OR authentication OR OTP OR "xác nhận" OR "xác minh")');
      queries.push('from:openai (code OR verification OR authentication OR OTP)');
      queries.push('OpenAI');
      queries.push('ChatGPT');
    } else if (hasOtp) {
      const relaxed = q.replace(/\b(otp|m[aã] otp)\b/gi, '(code OR verification OR authentication OR OTP OR "mã xác nhận")');
      queries.push(relaxed);
    } else if (q.includes('from:')) {
      const parts = q.split(/\s+/);
      const fromPart = parts.find((p) => p.startsWith('from:'));
      if (fromPart) {
        queries.push(fromPart);
      }
    }

    return Array.from(new Set(queries));
  }

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
    const candidateQueries = this.expandSearchQuery(options?.query);

    try {
      let messages: { id: string; threadId: string }[] = [];

      for (const q of candidateQueries) {
        let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
        if (q) {
          url += `&q=${encodeURIComponent(q)}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const listData = await response.json();
          if (listData.messages && listData.messages.length > 0) {
            messages = listData.messages;
            break;
          }
        }
      }

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
   * Fetches full email body text with flawless UTF-8 decoding.
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

      // Decode full body text with UTF-8 decoding
      const bodyText = extractBodyFromPayload(data.payload) || data.snippet || '';

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

  /**
   * Sends an email via Gmail API with full UTF-8 encoding.
   */
  public static async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
  }): Promise<{ id: string; threadId: string }> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google.');
    }

    const subjectBase64 = encodeBase64Utf8(params.subject);
    const utf8Subject = `=?utf-8?B?${subjectBase64}?=`;

    const messageParts = [
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : '',
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.body,
    ].filter(Boolean);

    const message = messageParts.join('\r\n');
    const encodedMessage = encodeBase64Utf8(message);

    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        throw new Error(`Gmail API lỗi khi gửi email: ${errMsg}`);
      }

      const data = await res.json();
      return { id: data.id, threadId: data.threadId };
    } catch (err: any) {
      console.error('[GoogleGmailService] Error sending email:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Trashes an email.
   */
  public static async trashEmail(messageId: string): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(`Gmail API lỗi khi chuyển vào thùng rác: ${err?.error?.message || res.status}`);
    }
  }

  /**
   * Permanently deletes an email.
   */
  public static async deleteEmail(messageId: string): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Chưa đăng nhập Google.');

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(`Gmail API lỗi khi xóa vĩnh viễn: ${err?.error?.message || res.status}`);
    }
  }
}
