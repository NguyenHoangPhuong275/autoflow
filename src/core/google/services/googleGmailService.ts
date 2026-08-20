import { getErrorMessage, readJson } from '../../utils/errors.ts';
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

interface GmailPayload {
  mimeType?: string;
  headers?: EmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
}

interface GmailMessageReference {
  id: string;
  threadId: string;
}

interface GmailMessage extends GmailMessageReference {
  snippet?: string;
  labelIds?: string[];
  payload?: GmailPayload;
}

interface GmailListResponse {
  messages?: GmailMessageReference[];
}

interface GmailErrorResponse {
  error?: { message?: string };
}

interface SendEmailResult {
  id: string;
  threadId: string;
}

function decodeBase64Utf8(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error: unknown) {
    console.warn(`Không thể giải mã Gmail payload bằng UTF-8: ${getErrorMessage(error)}`);
    try {
      return atob(normalized);
    } catch (fallbackError: unknown) {
      console.warn(`Không thể giải mã Gmail payload: ${getErrorMessage(fallbackError)}`);
      return '';
    }
  }
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
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

function extractBody(payload?: GmailPayload): string {
  if (!payload) {
    return '';
  }

  if (payload.body?.data && (!payload.mimeType || payload.mimeType === 'text/plain')) {
    return decodeBase64Utf8(payload.body.data);
  }

  const parts = payload.parts ?? [];
  const plainPart = parts.find((part) => part.mimeType === 'text/plain');
  if (plainPart?.body?.data) {
    return decodeBase64Utf8(plainPart.body.data);
  }

  for (const part of parts) {
    const nestedText = extractBody(part);
    if (nestedText) {
      return nestedText;
    }
  }

  const htmlPart = parts.find((part) => part.mimeType === 'text/html');
  if (htmlPart?.body?.data) {
    return htmlToText(decodeBase64Utf8(htmlPart.body.data));
  }

  return payload.body?.data ? decodeBase64Utf8(payload.body.data) : '';
}

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function toEmailSummary(message: GmailMessage): EmailSummary {
  const headers = message.payload?.headers;
  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet || '',
    subject: getHeader(headers, 'Subject') || '(Không có tiêu đề)',
    from: getHeader(headers, 'From'),
    date: getHeader(headers, 'Date'),
    unread: (message.labelIds ?? []).includes('UNREAD'),
  };
}

export class GoogleGmailService extends GoogleAuthService {
  private static expandSearchQuery(query?: string): string[] {
    if (!query?.trim()) {
      return [''];
    }

    const normalizedQuery = query.trim();
    const queries = [normalizedQuery];
    const hasOtp = /\b(otp|m[aã]|code|x[aá]c th[uự]c|x[aá]c minh|verification|auth|authentication)\b/i.test(normalizedQuery);
    const hasOpenAi = /\b(openai|chatgpt)\b/i.test(normalizedQuery);

    if (hasOpenAi && hasOtp) {
      queries.push('(OpenAI OR ChatGPT) (code OR verification OR authentication OR OTP OR "xác nhận" OR "xác minh")');
      queries.push('from:openai (code OR verification OR authentication OR OTP)');
      queries.push('OpenAI', 'ChatGPT');
    } else if (hasOtp) {
      queries.push(normalizedQuery.replace(/\b(otp|m[aã] otp)\b/gi, '(code OR verification OR authentication OR OTP OR "mã xác nhận")'));
    } else if (normalizedQuery.includes('from:')) {
      const senderFilter = normalizedQuery.split(/\s+/).find((part) => part.startsWith('from:'));
      if (senderFilter) {
        queries.push(senderFilter);
      }
    }

    return [...new Set(queries)];
  }

  public static async listRecentEmails(options?: {
    maxResults?: number;
    query?: string;
  }): Promise<EmailSummary[]> {
    const token = this.requireAccessToken();
    const maxResults = options?.maxResults || 10;
    const messages = await this.findMessages(token, maxResults, options?.query);
    const summaries = await Promise.all(messages.map((message) => this.fetchSummary(token, message.id)));
    return summaries.filter((summary): summary is EmailSummary => summary !== null);
  }

  public static async fetchEmail(messageId: string): Promise<EmailDetail> {
    const token = this.requireAccessToken();
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      throw new Error(`Gmail API lỗi: ${await this.readApiError(response)}`);
    }

    const message = await readJson<GmailMessage>(response, { id: messageId, threadId: '' });
    return {
      ...toEmailSummary(message),
      labels: message.labelIds ?? [],
      bodyText: extractBody(message.payload) || message.snippet || '',
    };
  }

  public static async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
  }): Promise<SendEmailResult> {
    const token = this.requireAccessToken();
    const encodedSubject = `=?utf-8?B?${encodeBase64Utf8(params.subject)}?=`;
    const message = [
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : '',
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.body,
    ].filter(Boolean).join('\r\n');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodeBase64Utf8(message) }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API lỗi khi gửi email: ${await this.readApiError(response)}`);
    }

    return readJson<SendEmailResult>(response, { id: '', threadId: '' });
  }

  public static async trashEmail(messageId: string): Promise<void> {
    const token = this.requireAccessToken();
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      throw new Error(`Gmail API lỗi khi chuyển vào thùng rác: ${await this.readApiError(response)}`);
    }
  }

  public static async deleteEmail(messageId: string): Promise<void> {
    const token = this.requireAccessToken();
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Gmail API lỗi khi xóa vĩnh viễn: ${await this.readApiError(response)}`);
    }
  }

  private static requireAccessToken(): string {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập tài khoản Google.');
    }
    return token;
  }

  private static async findMessages(token: string, maxResults: number, query?: string): Promise<GmailMessageReference[]> {
    for (const candidate of this.expandSearchQuery(query)) {
      const queryString = candidate ? `&q=${encodeURIComponent(candidate)}` : '';
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        continue;
      }

      const result = await readJson<GmailListResponse>(response, {});
      if (result.messages?.length) {
        return result.messages;
      }
    }

    return [];
  }

  private static async fetchSummary(token: string, messageId: string): Promise<EmailSummary | null> {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        return null;
      }

      return toEmailSummary(await readJson<GmailMessage>(response, { id: messageId, threadId: '' }));
    } catch (error: unknown) {
      console.warn(`Không thể đọc metadata email ${messageId}: ${getErrorMessage(error)}`);
      return null;
    }
  }

  private static async readApiError(response: Response): Promise<string> {
    const result = await readJson<GmailErrorResponse>(response, {});
    return result.error?.message || `HTTP ${response.status}`;
  }
}
