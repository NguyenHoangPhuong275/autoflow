import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const GMAIL_TOOLS: DeepSeekToolDefinition[] = [
  tool('search_emails', 'Tìm kiếm email trong hộp thư Gmail theo từ khóa, người gửi hoặc nhãn.', objectSchema({
    query: { type: 'string', description: 'Từ khóa tìm kiếm (ví dụ "from:netflix", "OpenAI", "invoice")' },
    maxResults: { type: 'integer', description: 'Số lượng thư tối đa muốn lấy (mặc định 5)' },
  })),
  tool('read_email', 'Đọc toàn bộ nội dung chi tiết của một email cụ thể qua messageId.', objectSchema({
    messageId: { type: 'string', description: 'ID của bức thư cần đọc' },
  }, ['messageId'])),
  tool('send_email', 'Soạn và gửi email trực tiếp qua Gmail API.', objectSchema({
    to: { type: 'string', description: 'Địa chỉ email người nhận (ví dụ abc@gmail.com)' },
    subject: { type: 'string', description: 'Tiêu đề bức thư' },
    body: { type: 'string', description: 'Nội dung thư' },
    cc: { type: 'string', description: 'Địa chỉ email CC (nếu có)' },
  }, ['to', 'subject', 'body'])),
  tool('trash_email', 'Chuyển một email vào Thùng rác (Trash) trong Gmail.', objectSchema({
    messageId: { type: 'string', description: 'ID của email cần xóa tạm' },
  }, ['messageId'])),
  tool('delete_email', 'Xóa vĩnh viễn một email khỏi Gmail.', objectSchema({
    messageId: { type: 'string', description: 'ID của email cần xóa vĩnh viễn' },
  }, ['messageId'])),
];
