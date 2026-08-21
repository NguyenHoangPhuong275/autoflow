import fs from 'node:fs';

const { isFormattingRequest, normalizeForMatching } = await import('../src/core/utils/text.ts');

const catalog = fs.readFileSync('src/core/ai/workspaceCommandCatalog.ts', 'utf8');
const compatibility = fs.readFileSync('src/core/ai/agentTools.ts', 'utf8');
const service = fs.readFileSync('src/core/services/aiAgentService.ts', 'utf8');

const checks = [
  ['catalog contains all groups', ['sheet', 'row', 'pipeline', 'gmail', 'drive', 'docs'].every((group) => catalog.includes(`${group}:`))],
  ['sheet requests include row commands', catalog.includes("categories.push('row')")],
  ['docs and drive are linked', catalog.includes("categories.includes('docs')") && catalog.includes("categories.includes('drive')")],
  ['unknown requests fall back to all tools', catalog.includes('if (categories.length === 0) return AUTOFLOW_TOOLS')],
  ['overview requests aggregate groups', catalog.includes('OVERVIEW_PATTERN') && catalog.includes('Object.keys(WORKSPACE_COMMAND_GROUPS)')],
  ['legacy imports re-export catalog', compatibility.includes("from '@/core/ai/workspaceCommandCatalog'")],
  ['agent selects tools per request', service.includes('selectWorkspaceTools(userMessage)')],
  ['retrieval rounds reuse selected tools', service.includes('chatCompletionWithTools(messages, availableTools)')],
  ['explicit email requests enforce send action', service.includes('ensureRequestedEmailAction')],
  ['email fallback does not call deepseek again', !service.includes('reminderMessages') && !service.includes('GMAIL_TOOLS')],
  ['format requests complete locally', catalog.includes('completeWorkspaceActions') && catalog.includes("type: 'format_cells'")],
  ['professional formatting includes freeze and resize', catalog.includes("type: 'freeze_rows_cols'") && catalog.includes("type: 'auto_resize_columns'")],
  ['vietnamese đ normalizes for formatting intent', normalizeForMatching('bây giờ định dạng lại sheet Tuần 6') === 'bay gio dinh dang lai sheet tuan 6'],
  ['screenshot formatting request is detected', isFormattingRequest('bây giờ định dạng lại sheet tuần 6 test case')],
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`✅ ${name}`);
  else {
    failed += 1;
    console.error(`❌ ${name}`);
  }
}

console.log(`Command catalog tests: ${checks.length - failed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
