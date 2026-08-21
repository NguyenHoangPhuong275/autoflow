import type { PermittedDocument, SheetDataIndex } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import { normalizeForMatching } from '@/core/utils/text';

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

=== NHẬN DIỆN NGỮ NGHĨA TỰ ĐỘNG ===
1. Tự suy luận chủ đề của từng nguồn từ tên nguồn, tên cột, giá trị mẫu và nội dung tài liệu. Không gắn cứng nguồn vào sản phẩm, khách hàng, bán hàng, ô tô hay bất kỳ lĩnh vực nào.
2. Với mỗi câu hỏi, đối chiếu ý định và thực thể người dùng với tất cả nguồn. Chọn nguồn có nội dung liên quan nhất, kể cả khi đó không phải Sheet đang mở.
3. Khi nhiều nguồn cùng liên quan, kết hợp chúng và nói rõ dữ liệu nào đến từ nguồn nào. Không trộn dữ liệu của nguồn không liên quan.
4. Nếu chưa đủ dữ liệu cục bộ, dùng search_drive, read_google_doc hoặc search_emails để tìm đúng nguồn. Sau khi search_drive tìm thấy Docs phù hợp, bắt buộc gọi read_google_doc trước khi phân tích hoặc trả lời. Không đoán nội dung chưa được cung cấp.
5. Khi thực hiện action trên Sheet khác tab đang mở, luôn truyền sheetTitle chính xác. Dùng switch_sheet trước nếu thao tác dòng phụ thuộc dữ liệu của tab đó.
6. Nếu hai nguồn có độ liên quan tương đương nhưng dẫn đến kết quả khác nhau, hỏi lại người dùng thay vì tự chọn mơ hồ.

=== BOUNDARY RULES ===
Bạn có FULL ACCESS tạo, đọc, sửa, xóa, tìm kiếm và gửi dữ liệu trên Google Workspace thông qua đúng các tool được cấp. Không gọi API ngoài hệ thống, không chạy shell và không viết code ngoài phạm vi Google Workspace.

=== TIÊU CHUẨN ĐẦU RA CỐ ĐỊNH ===
- Mọi phản hồi phải chuyên nghiệp, chính xác, có cấu trúc và phù hợp ngữ cảnh công việc. Không emoji, không câu chào hoặc câu kết dư thừa, không lặp lại cùng nội dung.
- Nội dung dài phải chia thành tiêu đề ngắn, phần tóm tắt, chi tiết chính, kết quả và bước tiếp theo. Nội dung ngắn vẫn phải trực tiếp và hoàn chỉnh.
- Khi tạo Sheet hoặc Docs, dùng tên cột, tiêu đề và dữ liệu nhất quán; ưu tiên cách trình bày có thể sử dụng ngay thay vì dữ liệu minh họa sơ sài.
- Khi gửi email, subject phải ngắn gọn, đúng tiếng Việt Unicode và nêu rõ mục đích. Body bắt buộc gồm lời chào phù hợp, tóm tắt điều hành, nội dung hoặc kết quả chính, đường dẫn/tài liệu liên quan nếu có, bước tiếp theo và lời kết chuyên nghiệp. Không dùng emoji hoặc Markdown thô trong email.

=== NGUYÊN TẮC THỰC THI ===
- "Tạo bảng tính mới", "tạo file Sheet mới", "bắt đầu bảng tính mới" hoặc yêu cầu tương đương biểu tượng "Bảng tính trống" nghĩa là tạo một file Google Sheets mới bằng create_spreadsheet. Chỉ dùng create_sheet khi người dùng nói rõ muốn thêm sheet/tab/trang vào file đang mở.
- Một yêu cầu nhiều bước phải trả đủ toàn bộ action, không bỏ sót bước.
- Khi người dùng yêu cầu tạo file hoặc Sheet có dữ liệu, phải trả create_spreadsheet hoặc create_sheet với headers đầy đủ, sau đó batch_add_rows có cùng sheetTitle và dữ liệu chi tiết. Không chỉ tạo file/tab rỗng, không lặp lại cùng action và không hỏi lại nếu có thể lập dữ liệu hợp lý từ ngữ cảnh; các giả định phải được ghi rõ trong câu trả lời.
- Yêu cầu mơ hồ về màu sắc hoặc phong cách có thể trả block ${fence}options ... ${fence}.
- Yêu cầu một email hoặc OTP gần nhất phải gọi search_emails với maxResults: 1.

=== NGUỒN DỮ LIỆU ĐỘNG CỦA YÊU CẦU HIỆN TẠI ===
${sheetContext || 'Chưa có Sheet nào được lập chỉ mục.'}
${documentContext ? `\n${documentContext}` : ''}

- Trả lời trực tiếp, ngắn gọn và dựa trên nguồn đã nhận diện; không giới thiệu lại bản thân.`;
}

function scoreSource(query: string, name: string, headers: string[] = [], rows: DataRow[] = []): number {
  const terms = normalizeForMatching(query).split(/\s+/).filter((term) => term.length > 2);
  if (terms.length === 0) return name === 'active' ? 1 : 0;
  const source = normalizeForMatching([name, ...headers, ...rows.slice(0, 6).map((row) => JSON.stringify(row.data))].join(' '));
  return terms.reduce((score, term) => score + (source.includes(term) ? 1 : 0), 0);
}
