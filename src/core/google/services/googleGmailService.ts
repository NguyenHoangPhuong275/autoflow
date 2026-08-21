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

function encodeBase64UrlUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodeBase64HeaderUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatProfessionalEmailHtml(subject: string, body: string): string {
  const content = body.split(/\r?\n/).map((rawLine) => {
    const line = rawLine.trim().replace(/\*\*/g, '');
    if (!line) return '<div style="height:12px"></div>';
    const safeLine = escapeHtml(line).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#2563eb;text-decoration:none">$1</a>',
    );
    if (/^#{1,3}\s+/.test(line)) {
      return `<h2 style="margin:24px 0 10px;color:#0f172a;font-size:18px">${safeLine.replace(/^#{1,3}\s+/, '')}</h2>`;
    }
    if ((line.endsWith(':') || line === line.toUpperCase()) && line.length <= 100) {
      return `<h3 style="margin:20px 0 8px;color:#1e293b;font-size:15px">${safeLine}</h3>`;
    }
    if (/^[-•]\s+/.test(line)) {
      return `<div style="margin:6px 0 6px 18px"><span style="color:#2563eb">•</span> ${safeLine.replace(/^[-•]\s+/, '')}</div>`;
    }
    return `<p style="margin:7px 0">${safeLine}</p>`;
  }).join('');

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',sans-serif;color:#334155"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><tr><td style="padding:24px 30px;background:#0f172a;color:#ffffff"><div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd">AutoFlow Workspace</div><div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.35">${escapeHtml(subject)}</div></td></tr><tr><td style="padding:28px 30px;font-size:14px;line-height:1.7">${content}</td></tr><tr><td style="padding:18px 30px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px">Email được tạo tự động bởi AutoFlow. Vui lòng kiểm tra dữ liệu trước khi sử dụng cho quyết định quan trọng.</td></tr></table></td></tr></table></body></html>`;
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
    const subject = sanitizeHeader(params.subject);
    const recipient = sanitizeHeader(params.to);
    const cc = params.cc ? sanitizeHeader(params.cc) : '';
    const encodedSubject = `=?UTF-8?B?${encodeBase64HeaderUtf8(subject)}?=`;
    const boundary = `autoflow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const htmlBody = formatProfessionalEmailHtml(subject, params.body);
    const messageParts: Array<string | null> = [
      `To: ${recipient}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.body,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      '',
      `--${boundary}--`,
    ];
    const message = messageParts.filter((line): line is string => line !== null).join('\r\n');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodeBase64UrlUtf8(message) }),
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
