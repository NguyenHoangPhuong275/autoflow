export interface SampleDataset {
    key: string;
    name: string;
    rows: Record<string, unknown>[];
}
export const SAMPLE_DATASETS: Record<string, SampleDataset> = {
    marketing_leads: {
        key: 'marketing_leads',
        name: 'Mẫu khách hàng',
        rows: [
            { STT: 1, 'Họ Tên': 'Nguyễn Văn An', Email: 'an.nguyen@tech.vn', 'Số ĐT': '0901234567', 'Tình Trạng': 'Mới', 'Dịch Vụ': 'Pro Cloud', 'Ngân Sách': '15.000.000đ' },
            { STT: 2, 'Họ Tên': 'Trần Thị Bích', Email: 'bich.tran@vina.com', 'Số ĐT': '0912345678', 'Tình Trạng': 'Tư Vấn', 'Dịch Vụ': 'API Auto', 'Ngân Sách': '28.000.000đ' },
            { STT: 3, 'Họ Tên': 'Lê Hoàng Cường', Email: 'cuong.le@corp.io', 'Số ĐT': '0987654321', 'Tình Trạng': 'Chờ', 'Dịch Vụ': 'Scraping', 'Ngân Sách': '12.500.000đ' },
            { STT: 4, 'Họ Tên': 'Phạm Thu Dung', Email: 'dung.pham@ent.vn', 'Số ĐT': '0933445566', 'Tình Trạng': 'VIP', 'Dịch Vụ': 'ERP Sync', 'Ngân Sách': '65.000.000đ' },
            { STT: 5, 'Họ Tên': 'Hoàng Minh Đức', Email: 'duc.hoang@agency.co', 'Số ĐT': '0944556677', 'Tình Trạng': 'Mới', 'Dịch Vụ': 'Email Bot', 'Ngân Sách': '9.000.000đ' },
            { STT: 6, 'Họ Tên': 'Vũ Mai Hoa', Email: 'hoa.vu@logistics.vn', 'Số ĐT': '0977889900', 'Tình Trạng': 'Báo Giá', 'Dịch Vụ': 'Telegram', 'Ngân Sách': '18.000.000đ' },
            { STT: 7, 'Họ Tên': 'Đặng Quốc Khánh', Email: 'khanh.dang@fintech.net', 'Số ĐT': '0966112233', 'Tình Trạng': 'Xác Minh', 'Dịch Vụ': 'Data Sync', 'Ngân Sách': '34.000.000đ' },
            { STT: 8, 'Họ Tên': 'Bùi Ngọc Lan', Email: 'lan.bui@store.com', 'Số ĐT': '0988223344', 'Tình Trạng': 'VIP', 'Dịch Vụ': 'Orders Sync', 'Ngân Sách': '45.000.000đ' },
        ],
    },
    products_pricing: {
        key: 'products_pricing',
        name: 'Mẫu sản phẩm',
        rows: [
            { STT: 1, 'Mã SP': 'SKU-9901', 'Tên SP': 'MacBook Pro M3 Max 36GB', 'Giá Cũ': '68.990.000đ', 'Kênh': 'Shopee', 'Kho': 'Còn Hàng' },
            { STT: 2, 'Mã SP': 'SKU-9902', 'Tên SP': 'iPhone 16 Pro Max 256GB', 'Giá Cũ': '34.490.000đ', 'Kênh': 'Lazada', 'Kho': 'Còn Hàng' },
            { STT: 3, 'Mã SP': 'SKU-9903', 'Tên SP': 'Bàn Phím Keychron Q1 Pro', 'Giá Cũ': '4.590.000đ', 'Kênh': 'Tiki', 'Kho': 'Sắp Hết' },
            { STT: 4, 'Mã SP': 'SKU-9904', 'Tên SP': 'Màn Dell UltraSharp 27 4K', 'Giá Cũ': '14.200.000đ', 'Kênh': 'Shopee', 'Kho': 'Còn Hàng' },
            { STT: 5, 'Mã SP': 'SKU-9905', 'Tên SP': 'Chuột Logitech MX Master 3S', 'Giá Cũ': '2.490.000đ', 'Kênh': 'Lazada', 'Kho': 'Còn Hàng' },
        ],
    },
    docs_tasks: {
        key: 'docs_tasks',
        name: 'Mẫu tác vụ',
        rows: [
            { STT: 1, 'Tác Vụ': 'Gửi Email kích hoạt Pro', 'Target': 'SendGrid API', 'Template': 'tpl_welcome', 'Ưu Tiên': 'Cao' },
            { STT: 2, 'Tác Vụ': 'Cập nhật hạn mức Quota', 'Target': 'PostgreSQL DB', 'Template': 'query_quota', 'Ưu Tiên': 'Rất Cao' },
            { STT: 3, 'Tác Vụ': 'Bắn thông báo Admin', 'Target': 'Telegram Bot', 'Template': 'tg_alert', 'Ưu Tiên': 'Trung Bình' },
            { STT: 4, 'Tác Vụ': 'Ghi nhật ký CloudWatch', 'Target': 'AWS CloudWatch', 'Template': 'log_stream', 'Ưu Tiên': 'Thấp' },
        ],
    },
};
