import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const prompt = read('src/core/ai/buildAgentPrompt.ts');
const automation = read('src/hooks/useAutomation.ts');
const app = read('src/App.tsx');
const service = read('src/core/services/aiAgentService.ts');

const checks = [
  ['prompt accepts all sheet rows', prompt.includes('allSheetRows: SheetDataIndex')],
  ['prompt infers topics instead of fixed categories', prompt.includes('Không gắn cứng nguồn')],
  ['prompt compares every source', prompt.includes('tất cả nguồn')],
  ['prompt separates source data', prompt.includes('Không trộn dữ liệu')],
  ['automation indexes every sheet', automation.includes('allSheetRows') && automation.includes('missingTabs')],
  ['imported docs become agent sources', app.includes('importedDocuments') && app.includes('contentSummary: doc.bodyText')],
  ['service forwards semantic index', service.includes('allSheetRows: SheetDataIndex')],
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
