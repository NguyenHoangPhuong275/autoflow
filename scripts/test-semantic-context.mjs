import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const prompt = read('src/core/ai/buildAgentPrompt.ts');
const automation = read('src/hooks/useAutomation.ts');
const app = read('src/App.tsx');
const service = read('src/core/services/aiAgentService.ts');
const deepSeek = read('src/core/services/deepSeekService.ts');
const executor = read('src/core/ai/executeAgentActions.ts');

const checks = [
  ['prompt accepts all sheet rows', prompt.includes('allSheetRows: SheetDataIndex')],
  ['prompt infers topics instead of fixed categories', prompt.includes('Không gắn cứng nguồn')],
  ['prompt compares every source', prompt.includes('tất cả nguồn')],
  ['prompt separates source data', prompt.includes('Không trộn dữ liệu')],
  ['automation indexes every sheet', automation.includes('allSheetRows') && automation.includes('missingTabs')],
  ['imported docs become agent sources', app.includes('importedDocuments') && app.includes('contentSummary: doc.bodyText')],
  ['service forwards semantic index', service.includes('allSheetRows: SheetDataIndex')],
  ['retrieval tool loop is bounded', service.includes('round < 3')],
  ['tool results are sent back to DeepSeek', service.includes("role: 'tool'")],
  ['assistant tool calls are preserved', deepSeek.includes('tool_calls?: DeepSeekToolCall[]')],
  ['search results require document reading', prompt.includes('bắt buộc gọi read_google_doc')],
  ['duplicate actions are removed', service.includes('deduplicateActions')],
  ['new sheet population is required', prompt.includes('batch_add_rows có cùng sheetTitle')],
  ['row tools accept a target sheet', read('src/core/ai/tools/rowTools.ts').includes("sheetTitle: { type: 'string'")],
  ['sheet creation is awaited', read('src/core/ai/handlers/sheetActionHandlers.ts').includes('await context.onCreateSheet')],
  ['row insertion is awaited', read('src/core/ai/handlers/rowActionHandlers.ts').includes('await context.onAddRow')],
  ['new spreadsheet file tool exists', read('src/core/ai/tools/sheetTools.ts').includes("tool('create_spreadsheet'")],
  ['spreadsheet creation calls Google API', read('src/core/google/services/googleStructureService.ts').includes("fetch('https://sheets.googleapis.com/v4/spreadsheets'")],
  ['prompt distinguishes file from tab', prompt.includes('Chỉ dùng create_sheet khi người dùng nói rõ')],
  ['created sheet link flows into email', executor.includes('Google Sheets: ${createdSpreadsheetUrl}')],
  ['failed spreadsheet creation stops dependent actions', executor.includes("if (action.type === 'create_spreadsheet') break")],
  ['format operations are awaited', read('src/core/ai/handlers/sheetActionHandlers.ts').includes('await context.onFormatCells')],
  ['dynamic context follows stable prompt policy', prompt.indexOf('TIÊU CHUẨN ĐẦU RA CỐ ĐỊNH') < prompt.indexOf('NGUỒN DỮ LIỆU ĐỘNG')],
  ['sample spreadsheet is not hardcoded', !automation.includes('1afOya-FzRWZK9wrstjeXlVWvf-ZInvWO9XThNbh44w8')],
  ['new workbook resets semantic state', automation.includes('spreadsheetIdRef.current !== spreadsheetId') && automation.includes('setAllSheetHeaders({})')],
  ['stale workbook requests are ignored', automation.includes('if (spreadsheetIdRef.current !== spreadsheetId) return')],
  ['active workbook uses session scope', automation.includes('sessionStorage.setItem(ACTIVE_SPREADSHEET_URL_KEY')],
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`✅ ${name}`);
  else {
    failed += 1;
    console.error(`❌ ${name}`);
  }
}

console.log(`Semantic context tests: ${checks.length - failed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
