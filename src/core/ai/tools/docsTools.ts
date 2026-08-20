import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const DOCS_TOOLS: DeepSeekToolDefinition[] = [
  tool('read_google_doc', 'Đọc nội dung văn bản và bảng của một tài liệu Google Docs theo documentId, tên file, hoặc tự động đọc tài liệu gần nhất trên Drive nếu để trống.', objectSchema({
    documentId: { type: 'string', description: 'ID tài liệu, link URL hoặc tên file Google Docs (để trống nếu muốn đọc tài liệu gần nhất trên Drive)' },
  })),
  tool('create_google_doc', 'Tạo một tài liệu Google Docs mới trong Google Drive.', objectSchema({
    title: { type: 'string', description: 'Tiêu đề tài liệu' },
    content: { type: 'string', description: 'Nội dung khởi tạo ban đầu (tùy chọn)' },
  }, ['title'])),
  tool('append_google_doc', 'Ghi thêm văn bản hoặc đoạn văn vào cuối tài liệu Google Docs.', objectSchema({
    documentId: { type: 'string', description: 'ID tài liệu Google Docs' },
    text: { type: 'string', description: 'Đoạn văn bản cần ghi thêm' },
  }, ['documentId', 'text'])),
];
