import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
type JsonSchema = Record<string, unknown>;
const EMPTY_OBJECT_SCHEMA: JsonSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false,
};
function objectSchema(properties: Record<string, JsonSchema>, required?: string[]): JsonSchema {
    return {
        type: 'object',
        properties,
        ...(required ? { required } : {}),
        additionalProperties: false,
    };
}
function tool(name: string, description: string, parameters: JsonSchema = EMPTY_OBJECT_SCHEMA): DeepSeekToolDefinition {
    return { type: 'function', function: { name, description, parameters } };
}
export const AUTOFLOW_TOOLS: DeepSeekToolDefinition[] = [
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
    tool('update_range', 'Cập nhật trực tiếp một dải ô A1 (ví dụ B2:E5) với ma trận giá trị 2D.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet' },
        range: { type: 'string', description: 'Địa chỉ dải ô A1 (ví dụ B2:D4 hoặc A1:Z1)' },
        values: {
            type: 'array',
            items: { type: 'array', items: {} },
            description: 'Ma trận 2D chứa các giá trị',
        },
    }, ['range', 'values'])),
    tool('set_formula', 'Gán công thức tính toán Excel/Google Sheets (ví dụ =SUM(E2:E10), =C2*D2, =VLOOKUP(...)).', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet' },
        colKey: { type: 'string', description: 'Tên cột hoặc ô (ví dụ total hoặc E10)' },
        formula: { type: 'string', description: 'Công thức toán học (bắt đầu bằng dấu =)' },
    }, ['colKey', 'formula'])),
    tool('format_cells', 'Đổi Font chữ, Cỡ chữ, Đậm/Nghiêng, Màu chữ, Màu nền, Căn lề của hàng tiêu đề hoặc dải ô A1.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet' },
        range: { type: 'string', description: 'Dải ô cần định dạng (ví dụ "1:1", "A1:Z1", "B2:E10")' },
        backgroundColor: { type: 'string', description: 'Mã màu nền hex (ví dụ #0b101c, #4f46e5) hoặc tên màu' },
        fontColor: { type: 'string', description: 'Mã màu chữ hex (ví dụ #ffffff, #22d3ee) hoặc tên màu' },
        bold: { type: 'boolean', description: 'In đậm' },
        italic: { type: 'boolean', description: 'In nghiêng' },
        fontSize: { type: 'integer', description: 'Cỡ chữ' },
        fontFamily: { type: 'string', description: 'Font chữ (ví dụ Roboto, Arial, Consolas, Montserrat)' },
        alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT'], description: 'Căn lề' },
    })),
    tool('auto_resize_columns', 'Tự động căn chỉnh/mở rộng độ rộng các cột (Auto-fit Column Width) để không bị hẹp hay che khuất chữ.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet cần giãn cột' },
        startCol: { type: 'integer', description: 'Chỉ số cột bắt đầu (0 là cột A)' },
        endCol: { type: 'integer', description: 'Chỉ số cột kết thúc' },
    })),
    tool('set_column_width', 'Đặt kích thước chiều rộng cố định cho cột theo pixel (ví dụ 140px, 160px, 200px) để tạo không gian rộng rãi.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet' },
        pixelSize: { type: 'integer', description: 'Độ rộng pixel (ví dụ 150, 180, 200)' },
        startCol: { type: 'integer', description: 'Chỉ số cột bắt đầu (0 là cột A)' },
        endCol: { type: 'integer', description: 'Chỉ số cột kết thúc' },
    }, ['pixelSize'])),
    tool('add_chart', 'Tạo biểu đồ (Cột, Thanh, Đường, Tròn) từ dữ liệu bảng tính để báo cáo thống kê trực quan.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet' },
        chartType: { type: 'string', enum: ['COLUMN', 'BAR', 'LINE', 'PIE'], description: 'Loại biểu đồ' },
        title: { type: 'string', description: 'Tiêu đề biểu đồ báo cáo' },
        domainColIndex: { type: 'integer', description: 'Chỉ số cột danh mục/nhãn (0 là cột A)' },
        seriesColIndex: { type: 'integer', description: 'Chỉ số cột giá trị số liệu (1 là cột B, 2 là cột C...)' },
        rowCount: { type: 'integer', description: 'Số dòng dữ liệu cần vẽ biểu đồ' },
        rowIndexOffset: { type: 'integer', description: 'Độ lệch hàng để xếp các biểu đồ không đè lên nhau' },
    }, ['title'])),
    tool('clear_charts', 'Xóa toàn bộ các biểu đồ cũ trên trang tính.', objectSchema({
        sheetTitle: { type: 'string', description: 'Tên sheet cần xóa biểu đồ' },
    })),
    tool('update_row', 'Cập nhật một ô trong hàng, xác định hàng bằng rowNumber hoặc ID (idCol).', objectSchema({
        rowNumber: { type: 'integer', minimum: 1 },
        idCol: { type: 'string', description: 'Mã ID của dòng (ví dụ p1, p2)' },
        colKey: { type: 'string', description: 'Tên cột cần cập nhật (ví dụ PRICE, STOCK, NAME)' },
        newValue: { description: 'Giá trị mới cần gán' },
    }, ['colKey', 'newValue'])),
    tool('batch_update_rows', 'Cập nhật nhiều ô hoặc tăng giảm giá hàng loạt trên nhiều dòng.', objectSchema({
        updates: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    idCol: { type: 'string' },
                    rowNumber: { type: 'integer' },
                    colKey: { type: 'string' },
                    newValue: {},
                },
                required: ['colKey', 'newValue'],
            },
        },
    }, ['updates'])),
    tool('add_row', 'Thêm một hàng mới vào trang tính hiện tại.', objectSchema({
        rowData: {
            type: 'object',
            description: 'Object chứa các cặp key-value tương ứng với các cột',
            additionalProperties: true,
        },
    }, ['rowData'])),
    tool('batch_add_rows', 'Thêm nhiều hàng mới cùng lúc vào bảng.', objectSchema({
        rowsData: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
        },
    }, ['rowsData'])),
    tool('delete_row', 'Xóa một hàng khỏi bảng, xác định bằng rowNumber hoặc ID (idCol).', objectSchema({
        rowNumber: { type: 'integer', minimum: 1 },
        idCol: { type: 'string', description: 'Mã ID của dòng cần xóa (ví dụ p5, p6)' },
    })),
    tool('batch_delete_rows', 'Xóa nhiều hàng cùng một lúc bằng danh sách ID hoặc danh sách số thứ tự hàng.', objectSchema({
        idCols: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách ID cần xóa, ví dụ ["p5", "p6"]',
        },
        rowNumbers: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Danh sách số thứ tự hàng cần xóa',
        },
    })),
    tool('start_pipeline', 'Bắt đầu khởi chạy chu trình xử lý tự động hóa.'),
    tool('pause_pipeline', 'Tạm dừng quy trình tự động hóa.'),
    tool('resume_pipeline', 'Tiếp tục quy trình tự động hóa đang tạm dừng.'),
    tool('reset_pipeline', 'Đặt lại trạng thái của tất cả các dòng về Chờ xử lý.'),
    tool('change_speed', 'Thay đổi tốc độ thực thi của chu trình.', objectSchema({ speedMs: { type: 'integer', enum: [200, 500, 600, 1000] } }, ['speedMs'])),
    tool('clear_logs', 'Xóa sạch danh sách nhật ký trong Terminal.'),
    tool('export_csv', 'Xuất dữ liệu bảng hiện tại ra tệp CSV để tải về.'),
    tool('load_url', 'Nạp liên kết Google Sheet mới vào hệ thống.', objectSchema({
        url: { type: 'string', description: 'Đường dẫn Google Sheets URL' },
    }, ['url'])),
];
