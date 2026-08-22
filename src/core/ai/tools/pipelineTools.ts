import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const PIPELINE_TOOLS: DeepSeekToolDefinition[] = [
  tool('start_pipeline', 'Bắt đầu khởi chạy chu trình xử lý tự động hóa.'),
  tool('pause_pipeline', 'Tạm dừng quy trình tự động hóa.'),
  tool('resume_pipeline', 'Tiếp tục quy trình tự động hóa đang tạm dừng.'),
  tool('reset_pipeline', 'Đặt lại trạng thái của tất cả các dòng về Chờ xử lý.'),
  tool('change_speed', 'Thay đổi tốc độ thực thi của chu trình.', objectSchema({ speedMs: { type: 'integer', enum: [200, 500, 600, 1000] } }, ['speedMs'])),
  tool('clear_logs', 'Xóa sạch danh sách nhật ký trong Terminal.'),
  tool('export_csv', 'Xuất dữ liệu bảng hiện tại ra tệp CSV để tải về.'),
  tool('load_url', 'Nạp liên kết Google Sheet mới vào hệ thống.', objectSchema({
    url: { type: 'string', description: 'Đường dẫn Google Sheets URL' },
    sheetTitle: { type: 'string', description: 'Tên tab cần đọc, nếu người dùng đã chỉ định' },
  }, ['url'])),
];
