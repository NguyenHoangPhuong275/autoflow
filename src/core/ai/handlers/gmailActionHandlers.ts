import type { AgentAction } from '@/core/ai/agentTypes';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import { GoogleGmailService } from '@/core/google/services/googleGmailService';

function cleanSender(raw: string): string {
  if (!raw) return 'Ẩn danh';
  const match = raw.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
  return (match ? match[1].trim() : raw.replace(/<.*>/, '').trim()) || 'Ẩn danh';
}

function formatDate(rawDate: string): string {
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (!Number.isNaN(date.getTime())) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  }
  return rawDate.slice(0, 16);
}

function extractOtpCode(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:code|mã|mfa|otp|verification|identity|xác minh|xác thực)[:\s]*([0-9]{4,8})/i) ||
                text.match(/\b([0-9]{6})\b/);
  return match ? match[1] : null;
}

export async function executeGmailAction(
  action: AgentAction,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  if (action.type === 'search_emails') {
    const max = action.maxResults || 5;
    const emails = await GoogleGmailService.listRecentEmails({
      query: action.query,
      maxResults: max,
    });

    const displayList = emails.slice(0, max);
    if (displayList.length === 0) {
      const msg = `Không tìm thấy email nào phù hợp với từ khóa "${action.query || 'gần đây'}".`;
      return {
        result: makeResult(action, 'success', msg, { emails: [] }),
        summary: 'Không tìm thấy email',
      };
    }

    const isOtpQuery = Boolean(action.query && /\b(otp|m[aã]|code|x[aá]c th[uự]c|x[aá]c minh|verification|auth)\b/i.test(action.query));

    if (displayList.length === 1 || isOtpQuery) {
      const e = displayList[0];
      const sender = cleanSender(e.from);
      const time = formatDate(e.date);
      const code = extractOtpCode(e.snippet) || extractOtpCode(e.subject);

      if (code) {
        const msg = `🔑 Mã OTP (${sender}): ${code} (${time})`;
        return {
          result: makeResult(action, 'success', msg, { emails: displayList }),
          summary: `Mã OTP: ${code}`,
        };
      }

      if (displayList.length === 1) {
        const msg = `📬 [${time}] ${sender}: "${e.subject}"`;
        return {
          result: makeResult(action, 'success', msg, { emails: displayList }),
          summary: `Đã đọc email từ ${sender}`,
        };
      }
    }

    const summaryList = displayList
      .map((e, idx) => {
        const sender = cleanSender(e.from);
        const time = formatDate(e.date);
        const code = extractOtpCode(e.snippet) || extractOtpCode(e.subject);
        const codeText = code ? ` ➔ 🔑 Mã OTP: ${code}` : '';
        return `${idx + 1}. [${time}] ${sender}: "${e.subject}"${codeText}`;
      })
      .join('\n');

    const msg = `📬 ${displayList.length} thư mới nhất:\n${summaryList}`;

    return {
      result: makeResult(action, 'success', msg, { emails: displayList }),
      summary: `Đã đọc ${displayList.length} email gần nhất`,
    };
  }

  if (action.type === 'read_email') {
    if (!action.messageId) {
      throw new Error('Thiếu messageId của email cần đọc.');
    }
    const email = await GoogleGmailService.fetchEmail(action.messageId);
    const time = formatDate(email.date);
    const sender = cleanSender(email.from);
    const code = extractOtpCode(email.bodyText) || extractOtpCode(email.snippet) || extractOtpCode(email.subject);

    if (code) {
      const msg = `🔑 Mã OTP (${sender}): ${code} (${time})`;
      return {
        result: makeResult(action, 'success', msg, { email }),
        summary: `Mã OTP: ${code}`,
      };
    }

    const msg = `✉️ [${time}] ${sender}: "${email.subject}"\n${email.bodyText.slice(0, 300)}${email.bodyText.length > 300 ? '...' : ''}`;
    return {
      result: makeResult(action, 'success', msg, { email }),
      summary: `Đã đọc thư từ ${sender}`,
    };
  }

  if (action.type === 'send_email') {
    if (!action.to || !action.subject || !action.body) {
      throw new Error('Thiếu thông tin người nhận (to), tiêu đề (subject) hoặc nội dung (body).');
    }
    const sent = await GoogleGmailService.sendEmail({
      to: action.to,
      subject: action.subject,
      body: action.body,
      cc: action.cc,
    });
    const msg = `✅ Đã gửi email tới ${action.to}: "${action.subject}"`;
    return {
      result: makeResult(action, 'success', msg, { sent }),
      summary: msg,
    };
  }

  if (action.type === 'trash_email') {
    if (!action.messageId) throw new Error('Thiếu messageId của email cần xóa.');
    await GoogleGmailService.trashEmail(action.messageId);
    const msg = `🗑️ Đã chuyển email vào Thùng rác.`;
    return {
      result: makeResult(action, 'success', msg),
      summary: msg,
    };
  }

  if (action.type === 'delete_email') {
    if (!action.messageId) throw new Error('Thiếu messageId của email cần xóa vĩnh viễn.');
    await GoogleGmailService.deleteEmail(action.messageId);
    const msg = `❌ Đã xóa vĩnh viễn email.`;
    return {
      result: makeResult(action, 'success', msg),
      summary: msg,
    };
  }

  return null;
}
