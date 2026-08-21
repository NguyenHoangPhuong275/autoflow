import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { tool, objectSchema } from './toolSchemaHelper';

export const SHEET_TOOLS: DeepSeekToolDefinition[] = [
  tool('create_spreadsheet', 'Tạo một file Google Sheets hoàn toàn mới trong Google Drive, tương đương chọn "Bảng tính trống". Dùng khi người dùng yêu cầu tạo bảng tính/file mới, không dùng để thêm tab vào file hiện tại.', objectSchema({
    title: { type: 'string', description: 'Tên file Google Sheets mới' },
    sheetTitle: { type: 'string', description: 'Tên tab đầu tiên trong file mới' },
    headers: { type: 'array', items: { type: 'string' }, description: 'Danh sách cột khởi tạo cho tab đầu tiên' },
  }, ['title'])),
  tool('create_sheet', 'Tạo một trang tính (Sheet Tab) mới trong file Google Sheets / Excel, có thể kèm danh sách cột khởi tạo.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet mới cần tạo' },
    headers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Danh sách các cột ban đầu của sheet mới (ví dụ ["id", "name", "price"])',
    },
  }, ['sheetTitle'])),
  tool('delete_sheet', 'Xóa hoàn toàn một trang tính (Sheet Tab) khỏi file Google Sheets.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet cần xóa' },
  }, ['sheetTitle'])),
  tool('duplicate_sheet', 'Nhân bản (sao chép/clone) một trang tính đã có trong workbook.', objectSchema({
    sourceSheetTitle: { type: 'string', description: 'Tên sheet nguồn cần nhân bản' },
    newSheetTitle: { type: 'string', description: 'Tên sheet mới sau khi sao chép' },
  }, ['sourceSheetTitle'])),
  tool('rename_sheet', 'Đổi tên một Sheet Tab trong file Google Sheets.', objectSchema({
    oldSheetTitle: { type: 'string', description: 'Tên sheet hiện tại' },
    newSheetTitle: { type: 'string', description: 'Tên sheet mới muốn đổi sang' },
  }, ['oldSheetTitle', 'newSheetTitle'])),
  tool('switch_sheet', 'Chuyển tab đang xem sang một Sheet khác trong danh sách.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet muốn chuyển sang' },
  }, ['sheetTitle'])),
  tool('clear_sheet', 'Xóa sạch toàn bộ dữ liệu hàng trong sheet được chỉ định (giữ lại hàng tiêu đề).', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet cần xóa sạch (ví dụ Orders, Products, Users)' },
  }, ['sheetTitle'])),
  tool('update_headers', 'Đổi tên hoặc định dạng lại toàn bộ tiêu đề các cột (Header Hàng 1) trong sheet (ví dụ sang camelCase aB, hoa, thường).', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet cần đổi tên cột (ví dụ Orders, Products, Users)' },
    headers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Danh sách tên các cột mới sau khi đổi (ví dụ ["orderId", "payosCode", "userId", ...])',
    },
  }, ['sheetTitle', 'headers'])),
  tool('add_column', 'Thêm một cột mới vào bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    columnName: { type: 'string', description: 'Tên cột mới' },
  }, ['columnName'])),
  tool('delete_column', 'Xóa một cột khỏi bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    colKey: { type: 'string', description: 'Tên cột cần xóa' },
  }, ['colKey'])),
  tool('freeze_rows_cols', 'Cố định hàng (freeze rows) hoặc cột (freeze columns) trong bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    frozenRows: { type: 'integer', description: 'Số lượng hàng cố định từ trên xuống (mặc định 1)' },
    frozenCols: { type: 'integer', description: 'Số lượng cột cố định từ trái sang' },
  })),
  tool('sort_range', 'Sắp xếp bảng tính theo một cột chỉ định (tăng dần hoặc giảm dần).', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    colKey: { type: 'string', description: 'Tên cột để sắp xếp' },
    ascending: { type: 'boolean', description: 'True: Tăng dần (A-Z, 0-9), False: Giảm dần' },
  }, ['colKey'])),
  tool('update_range', 'Cập nhật giá trị một dải ô (Range) trong bảng tính.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    range: { type: 'string', description: 'Tọa độ dải ô A1 (ví dụ A1:C5)' },
    values: {
      type: 'array',
      items: { type: 'array', items: {} },
      description: 'Ma trận giá trị 2 chiều',
    },
  }, ['range', 'values'])),
  tool('set_formula', 'Gán công thức Excel/Sheets (như SUM, IF, VLOOKUP, C2*D2) vào một ô hoặc cột, tự động tịnh tiến số dòng khi fillDown=true.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    colKey: { type: 'string', description: 'Tên cột hoặc ô (ví dụ "total", "Thành tiền", "E2")' },
    rowNumber: { type: 'integer', description: 'Số thứ tự dòng (bắt đầu từ 2 đối với hàng dữ liệu đầu tiên)' },
    formula: { type: 'string', description: 'Công thức toán học bắt đầu bằng dấu "=" (ví dụ: "=C2*D2")' },
    fillDown: { type: 'boolean', description: 'Nếu true, tự động kéo và tịnh tiến công thức từ dòng rowNumber xuống toàn bộ các dòng còn lại trong bảng' },
    endRow: { type: 'integer', description: 'Dòng kết thúc khi kéo công thức (tùy chọn)' },
  }, ['colKey', 'formula'])),
  tool('format_cells', 'Định dạng màu nền, màu chữ, in đậm, căn lề ô/cột/hàng. BẮT BUỘC phải truyền ít nhất một trong các thuộc tính: backgroundColor, fontColor, bold, fontSize, fontFamily, alignment. Không gọi tool này nếu không có giá trị định dạng cụ thể.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    range: { type: 'string', description: 'Tọa độ ô cần định dạng, ví dụ "1:1" cho hàng tiêu đề, "2:2" cho hàng 2, "A:A" cho cột A' },
    backgroundColor: { type: 'string', description: 'Mã màu nền HEX (ví dụ #0f172a, #1e3a5f, #2d6a4f)' },
    fontColor: { type: 'string', description: 'Mã màu chữ HEX (ví dụ #ffffff, #38bdf8, #f0f0f0)' },
    bold: { type: 'boolean', description: 'In đậm' },
    italic: { type: 'boolean', description: 'In nghiêng' },
    fontSize: { type: 'integer', description: 'Cỡ chữ' },
    fontFamily: { type: 'string', description: 'Font chữ (ví dụ Roboto, Montserrat)' },
    alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT'] },
  }, ['backgroundColor'])),
  tool('auto_resize_columns', 'Tự động căn chỉnh độ rộng cột vừa vặn với nội dung.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
  })),
  tool('set_column_width', 'Đặt chiều rộng pixel cố định cho các cột.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet' },
    pixelSize: { type: 'integer', description: 'Chiều rộng cột bằng pixel (mặc định 160)' },
  })),
  tool('add_chart', 'Tạo biểu đồ (Cột, Thanh, Đường, Tròn) trực quan hóa dữ liệu.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet chứa dữ liệu' },
    chartType: { type: 'string', enum: ['COLUMN', 'BAR', 'LINE', 'PIE'] },
    title: { type: 'string', description: 'Tiêu đề biểu đồ' },
    domainColIndex: { type: 'integer', description: 'Chỉ số cột trục hoành X (0 = Cột A)' },
    seriesColIndex: { type: 'integer', description: 'Chỉ số cột dữ liệu trục tung Y' },
  }, ['chartType', 'title', 'domainColIndex', 'seriesColIndex'])),
  tool('clear_charts', 'Xóa tất cả các biểu đồ hiện có trên sheet.', objectSchema({
    sheetTitle: { type: 'string', description: 'Tên sheet cần xóa biểu đồ' },
  }, ['sheetTitle'])),
];
