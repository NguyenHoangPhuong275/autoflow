import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const ROW_TOOLS: DeepSeekToolDefinition[] = [
  tool('update_row', 'Chỉnh sửa dữ liệu của một hàng cụ thể trong bảng.', objectSchema({
    rowNumber: { type: 'integer', minimum: 1 },
    idCol: { type: 'string', description: 'Mã ID của dòng trong dữ liệu đã tải' },
    colKey: { type: 'string', description: 'Tên cột cần sửa' },
    newValue: { description: 'Giá trị mới cần cập nhật' },
    updatedData: { type: 'object', additionalProperties: true, description: 'Cập nhật nhiều cột cùng lúc dưới dạng object { col1: val1, col2: val2 }' },
  })),
  tool('batch_update_rows', 'Cập nhật nhiều hàng cùng một lúc trong 1 thao tác duy nhất.', objectSchema({
    updates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rowNumber: { type: 'integer' },
          idCol: { type: 'string' },
          updatedData: { type: 'object', additionalProperties: true },
        },
      },
      description: 'Mảng các dòng cần cập nhật',
    },
  }, ['updates'])),
  tool('add_row', 'Thêm một hàng mới vào cuối bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet đích; bắt buộc khi vừa tạo sheet mới hoặc ghi vào sheet không đang mở' },
    rowData: { type: 'object', additionalProperties: true, description: 'Object chứa dữ liệu thực tế của hàng mới' },
  }, ['rowData'])),
  tool('batch_add_rows', 'Thêm nhiều hàng mới cùng lúc vào cuối bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet đích; bắt buộc khi vừa tạo sheet mới hoặc ghi vào sheet không đang mở' },
    rowsData: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
  }, ['rowsData'])),
  tool('delete_row', 'Xóa một hàng khỏi bảng, xác định bằng rowNumber hoặc ID (idCol).', objectSchema({
    rowNumber: { type: 'integer', minimum: 1 },
    idCol: { type: 'string', description: 'Mã ID của dòng cần xóa trong dữ liệu đã tải' },
  })),
  tool('batch_delete_rows', 'Xóa nhiều hàng cùng một lúc bằng danh sách ID hoặc danh sách số thứ tự hàng.', objectSchema({
    idCols: {
      type: 'array',
      items: { type: 'string' },
      description: 'Danh sách ID cần xóa',
    },
    rowNumbers: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Danh sách số thứ tự hàng cần xóa',
    },
  })),
];
