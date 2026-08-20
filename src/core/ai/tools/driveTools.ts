import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const DRIVE_TOOLS: DeepSeekToolDefinition[] = [
  tool('search_drive', 'Tìm kiếm và liệt kê tệp, bảng tính Google Sheets hoặc Google Docs trong Google Drive.', objectSchema({
    query: { type: 'string', description: 'Từ khóa tìm kiếm tên file' },
    fileType: { type: 'string', enum: ['all', 'sheets', 'docs'], description: 'Loại tệp cần lọc: "docs" (chỉ lấy Google Docs), "sheets" (chỉ lấy Sheets), hoặc "all"' },
    maxResults: { type: 'integer', description: 'Số lượng file tối đa (mặc định 10)' },
  })),
  tool('create_drive_folder', 'Tạo thư mục mới trong Google Drive.', objectSchema({
    folderName: { type: 'string', description: 'Tên thư mục mới' },
    parentFolderId: { type: 'string', description: 'ID thư mục cha (tùy chọn)' },
  }, ['folderName'])),
  tool('rename_drive_file', 'Đổi tên tệp hoặc thư mục trong Google Drive.', objectSchema({
    fileId: { type: 'string', description: 'ID tệp hoặc thư mục cần đổi tên' },
    newName: { type: 'string', description: 'Tên mới muốn đặt' },
  }, ['fileId', 'newName'])),
  tool('delete_drive_file', 'Xóa tệp hoặc thư mục trong Google Drive.', objectSchema({
    fileId: { type: 'string', description: 'ID tệp cần xóa' },
  }, ['fileId'])),
];
