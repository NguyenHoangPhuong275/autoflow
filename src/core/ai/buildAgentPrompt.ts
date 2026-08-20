import type { PermittedDocument, SheetDataIndex } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';

interface AgentPromptInput {
  userMessage: string;
  currentRows: DataRow[];
  activeSheetTitle: string;
  allSheetTabs: string[];
  permittedDocs: PermittedDocument[];
  allSheetHeaders: Record<string, string[]>;
  allSheetRows: SheetDataIndex;
}

export function buildAgentPrompt({
  userMessage,
  currentRows,
  activeSheetTitle,
  allSheetTabs,
  permittedDocs,
  allSheetHeaders,
  allSheetRows,
}: AgentPromptInput): string {
  const sheetNames = [...new Set([...allSheetTabs, ...Object.keys(allSheetHeaders), ...Object.keys(allSheetRows), activeSheetTitle])];
  const rankedSheets = sheetNames
    .map((sheetName) => ({ sheetName, score: scoreSource(userMessage, sheetName, allSheetHeaders[sheetName], allSheetRows[sheetName]) }))
    .sort((left, right) => right.score - left.score || (left.sheetName === activeSheetTitle ? -1 : 1));
  const selectedSheets = rankedSheets.slice(0, 4).map(({ sheetName }) => sheetName);
  const sheetContext = selectedSheets.map((sheetName) => {
    const rows = allSheetRows[sheetName] ?? (sheetName === activeSheetTitle ? currentRows : []);
    const headers = allSheetHeaders[sheetName] ?? (rows[0] ? Object.keys(rows[0].data) : []);
    const samples = rows.slice(0, 4).map((row) => `    #${row.rowNumber}: ${JSON.stringify(row.data)}`).join('\n').slice(0, 1200);
    return [
      `Nguồn Sheet: "${sheetName}"${sheetName === activeSheetTitle ? ' [đang mở]' : ''}`,
      `  Cột: [${headers.join(', ')}]`,
      `  Số dòng đã lập chỉ mục: ${rows.length}`,
      samples || '  Chưa có mẫu dữ liệu',
    ].join('\n');
  }).join('\n\n');

  const documentContext = permittedDocs
    .filter((document) => document.isGranted)
    .map((document) => ({ document, score: scoreSource(userMessage, document.name, [], [{ data: { content: document.contentSummary }, id: document.id, rowNumber: 0, status: 'pending' }]) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ document }) => `Nguồn tài liệu: "${document.name}"\n${document.contentSummary.slice(0, 1800)}`)
    .join('\n\n');

  const fence = String.fromCharCode(96).repeat(3);

  return `BẠN LÀ AUTOFLOW AGENT, trợ lý DeepSeek điều phối Google Sheets, Gmail, Drive và Docs bằng các tool được cấp.

=== NGUỒN DỮ LIỆU WORKSPACE ===
${sheetContext || 'Chưa có Sheet nào được lập chỉ mục.'}
${documentContext ? `\n${documentContext}` : ''}

=== NHẬN DIỆN NGỮ NGHĨA TỰ ĐỘNG ===
1. Tự suy luận chủ đề của từng nguồn từ tên nguồn, tên cột, giá trị mẫu và nội dung tài liệu. Không gắn cứng nguồn vào sản phẩm, khách hàng, bán hàng, ô tô hay bất kỳ lĩnh vực nào.
2. Với mỗi câu hỏi, đối chiếu ý định và thực thể người dùng với tất cả nguồn. Chọn nguồn có nội dung liên quan nhất, kể cả khi đó không phải Sheet đang mở.
3. Khi nhiều nguồn cùng liên quan, kết hợp chúng và nói rõ dữ liệu nào đến từ nguồn nào. Không trộn dữ liệu của nguồn không liên quan.
4. Nếu chưa đủ dữ liệu cục bộ, dùng search_drive, read_google_doc hoặc search_emails để tìm đúng nguồn. Không đoán nội dung chưa được cung cấp.
5. Khi thực hiện action trên Sheet khác tab đang mở, luôn truyền sheetTitle chính xác. Dùng switch_sheet trước nếu thao tác dòng phụ thuộc dữ liệu của tab đó.
6. Nếu hai nguồn có độ liên quan tương đương nhưng dẫn đến kết quả khác nhau, hỏi lại người dùng thay vì tự chọn mơ hồ.

=== BOUNDARY RULES ===
Bạn có FULL ACCESS tạo, đọc, sửa, xóa, tìm kiếm và gửi dữ liệu trên Google Workspace thông qua đúng các tool được cấp. Không gọi API ngoài hệ thống, không chạy shell và không viết code ngoài phạm vi Google Workspace.

=== NGUYÊN TẮC THỰC THI ===
- Một yêu cầu nhiều bước phải trả đủ toàn bộ action, không bỏ sót bước.
- Yêu cầu mơ hồ về màu sắc hoặc phong cách có thể trả block ${fence}options ... ${fence}.
- Yêu cầu một email hoặc OTP gần nhất phải gọi search_emails với maxResults: 1.
- Trả lời trực tiếp, ngắn gọn và dựa trên nguồn đã nhận diện; không giới thiệu lại bản thân.`;
}

function scoreSource(query: string, name: string, headers: string[] = [], rows: DataRow[] = []): number {
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 2);
  if (terms.length === 0) return name === 'active' ? 1 : 0;
  const source = normalize([name, ...headers, ...rows.slice(0, 6).map((row) => JSON.stringify(row.data))].join(' '));
  return terms.reduce((score, term) => score + (source.includes(term) ? 1 : 0), 0);
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
