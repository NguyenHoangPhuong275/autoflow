/**
 * AutoFlow — Phase 0.1 Characterization / Contract Tests
 *
 * Run with:  node scripts/contract-tests.mjs
 *
 * This script validates that the public API surface and configuration
 * of the project have not drifted unexpectedly. It does NOT call any
 * real Google or DeepSeek APIs; it only inspects source code files.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const NOW = new Date().toISOString().slice(0, 10);
const PREVIEW_DIR = resolve('D:/Preview', `${NOW}_contract-tests`);

let passed = 0;
let failed = 0;
const results = [];

function hash(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}

function read(relPath) {
  const full = resolve(ROOT, relPath);
  if (!existsSync(full)) {
    throw new Error(`File not found: ${relPath}`);
  }
  return readFileSync(full, 'utf8');
}

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ ${label}`);
  } else {
    failed++;
    results.push(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  results.push(`\n── ${title} ──`);
}

// ─── 1. DeepSeek model, tool_choice & tool names ──────────────────

section('DeepSeek Service Contract');

const deepSeekSrc = read('src/core/services/deepSeekService.ts');
assert(
  'Model is "deepseek-chat"',
  deepSeekSrc.includes("model = 'deepseek-chat'")
);
assert(
  'tool_choice is "auto"',
  deepSeekSrc.includes("tool_choice: 'auto'")
);
assert(
  'API proxy path is /api/deepseek/chat/completions',
  deepSeekSrc.includes("apiUrl = '/api/deepseek/chat/completions'")
);

// ─── 2. Agent tool names snapshot ─────────────────────────────────

section('Agent Tools Snapshot');

const toolFiles = [
  'src/core/ai/agentTools.ts',
  'src/core/ai/tools/sheetTools.ts',
  'src/core/ai/tools/rowTools.ts',
  'src/core/ai/tools/pipelineTools.ts',
  'src/core/ai/tools/gmailTools.ts',
  'src/core/ai/tools/driveTools.ts',
  'src/core/ai/tools/docsTools.ts',
];
let toolsSrc = '';
for (const f of toolFiles) {
  try { toolsSrc += '\n' + read(f); } catch {}
}
const toolNameRegex = /tool\(\s*'([a-z_]+)'/g;
const toolNames = [];
let match;
while ((match = toolNameRegex.exec(toolsSrc)) !== null) {
  if (!toolNames.includes(match[1])) {
    toolNames.push(match[1]);
  }
}

const EXPECTED_TOOLS = [
  'create_spreadsheet', 'create_sheet', 'delete_sheet', 'duplicate_sheet', 'rename_sheet',
  'switch_sheet', 'clear_sheet', 'update_headers', 'add_column',
  'delete_column', 'freeze_rows_cols', 'sort_range', 'update_range',
  'set_formula', 'format_cells', 'auto_resize_columns', 'set_column_width',
  'add_chart', 'clear_charts', 'update_row', 'batch_update_rows',
  'add_row', 'batch_add_rows', 'delete_row', 'batch_delete_rows',
  'start_pipeline', 'pause_pipeline', 'resume_pipeline', 'reset_pipeline',
  'change_speed', 'clear_logs', 'export_csv', 'load_url',
  'search_emails', 'read_email', 'send_email', 'trash_email', 'delete_email',
  'search_drive', 'create_drive_folder', 'rename_drive_file', 'delete_drive_file',
  'read_google_doc', 'create_google_doc', 'append_google_doc',
];

assert(
  `Tool count is ${EXPECTED_TOOLS.length}`,
  toolNames.length === EXPECTED_TOOLS.length,
  `found ${toolNames.length}`
);

for (const expected of EXPECTED_TOOLS) {
  assert(`Tool "${expected}" exists`, toolNames.includes(expected));
}

// ─── 3. Agent Action Parser action types ──────────────────────────

section('Agent Action Parser Contract');

const parserSrc = read('src/core/ai/agentActionParser.ts');
for (const expected of EXPECTED_TOOLS) {
  assert(
    `AGENT_ACTION_TYPES has "${expected}"`,
    parserSrc.includes(`'${expected}'`)
  );
}

// ─── 4. System prompt hash ────────────────────────────────────────

section('System Prompt');

const promptSrc = read('src/core/ai/buildAgentPrompt.ts');
const promptHash = hash(promptSrc);
assert('buildAgentPrompt.ts hash captured: ' + promptHash, Boolean(promptHash));
assert(
  'Prompt contains boundary rules',
  promptSrc.includes('BOUNDARY RULES')
);
assert(
  'Prompt contains FULL ACCESS policy',
  promptSrc.includes('FULL ACCESS')
);

// ─── 5. GoogleSyncService public methods ──────────────────────────

section('GoogleSyncService Inheritance Chain');

const authSrc    = read('src/core/google/services/googleAuthService.ts');
const readSrc    = read('src/core/google/services/googleReadService.ts');
const writeSrc   = read('src/core/google/services/googleWriteService.ts');
const structSrc  = read('src/core/google/services/googleStructureService.ts');
const formatSrc  = read('src/core/google/services/googleFormattingService.ts');
const syncSrc    = read('src/core/services/googleSyncService.ts');

// Verify inheritance chain
assert('GoogleReadService extends GoogleAuthService',    readSrc.includes('extends GoogleAuthService'));
assert('GoogleWriteService extends GoogleReadService',   writeSrc.includes('extends GoogleReadService'));
assert('GoogleStructureService extends GoogleWriteService', structSrc.includes('extends GoogleWriteService'));
assert('GoogleFormattingService extends GoogleStructureService', formatSrc.includes('extends GoogleStructureService'));
assert('GoogleSyncService extends GoogleFormattingService', syncSrc.includes('extends GoogleFormattingService'));

// Key public methods
const EXPECTED_AUTH_METHODS    = ['init', 'getSession', 'getAccessToken', 'getUserEmail', 'logout', 'loginWithGoogle'];
const EXPECTED_READ_METHODS    = ['fetchSheetMetadata', 'fetchSheet'];
const EXPECTED_WRITE_METHODS   = ['updateHeaders', 'updateCell', 'appendRow', 'deleteRowsByTitle', 'clearSheet'];
const EXPECTED_STRUCT_METHODS  = ['createSpreadsheet', 'addSheetTab', 'deleteSheetTab', 'duplicateSheetTab', 'renameSheetTab', 'freezeRowsCols', 'sortRange', 'updateRangeValues', 'addColumn', 'deleteColumn'];
const EXPECTED_FORMAT_METHODS  = ['formatCells', 'addChart', 'clearCharts', 'autoResizeColumns', 'setColumnWidth', 'fetchSheetChartIds', 'fetchSheetHeaderNames', 'fetchSheetFormat'];

for (const m of EXPECTED_AUTH_METHODS)   assert(`Auth: ${m}()`,    authSrc.includes(m));
for (const m of EXPECTED_READ_METHODS)   assert(`Read: ${m}()`,    readSrc.includes(m));
for (const m of EXPECTED_WRITE_METHODS)  assert(`Write: ${m}()`,   writeSrc.includes(m));
for (const m of EXPECTED_STRUCT_METHODS) assert(`Struct: ${m}()`,  structSrc.includes(m));
for (const m of EXPECTED_FORMAT_METHODS) assert(`Format: ${m}()`,  formatSrc.includes(m));

// ─── 6. useAutomation return contract ─────────────────────────────

section('useAutomation Hook Contract');

const automationSrc = read('src/hooks/useAutomation.ts');
const EXPECTED_RETURN_KEYS = [
  'url', 'setUrl', 'activeSourceId', 'stage', 'rows', 'logs', 'stats',
  'speed', 'isLoading', 'sheetTabs', 'allSheetHeaders', 'activeSheetTitle',
  'selectSheetTab', 'loadFile', 'fetchFromUrl', 'updateHeaders', 'addColumn',
  'deleteColumn', 'freezeRowsCols', 'sortRange', 'updateRange', 'formatCells',
  'autoResizeColumns', 'setColumnWidth', 'addChart', 'clearCharts',
  'createSheet', 'deleteSheet', 'duplicateSheet', 'renameSheet',
  'updateRow', 'batchUpdateRows', 'batchDeleteRows', 'deleteRow',
  'clearSheet', 'addRow', 'start', 'pause', 'resume', 'reset',
  'clearLogs', 'changeSpeed',
];

for (const key of EXPECTED_RETURN_KEYS) {
  assert(`useAutomation returns "${key}"`, automationSrc.includes(key));
}

// ─── 7. Config file hashes ────────────────────────────────────────

section('Config File Hashes');

const configFiles = ['.env.example', 'vite.config.ts', 'package.json', 'tsconfig.json'];
for (const file of configFiles) {
  try {
    const content = read(file);
    const h = hash(content);
    assert(`${file} hash: ${h}`, true);
  } catch (e) {
    assert(`${file} exists`, false, e.message);
  }
}

// Verify .env is NOT committed (check .gitignore)
const gitignore = read('.gitignore');
assert('.gitignore excludes .env', gitignore.includes('.env'));

// ─── 8. AgentTypes contract ───────────────────────────────────────

section('AgentTypes Contract');

const typesSrc = read('src/core/ai/agentTypes.ts');
assert('ChatMessage interface exists',       typesSrc.includes('interface ChatMessage'));
assert('ChatMessageOption interface exists',  typesSrc.includes('interface ChatMessageOption'));
assert('AgentAction interface exists',        typesSrc.includes('interface AgentAction'));
assert('PermittedDocument interface exists',  typesSrc.includes('interface PermittedDocument'));

// ─── 9. Error Boundary Contract ───────────────────────────────────

section('Error Boundary Contract');

const errorBoundarySrc = read('src/components/error/AppErrorBoundary.tsx');
const mainSrc = read('src/main.tsx');

assert('AppErrorBoundary class exists', errorBoundarySrc.includes('class AppErrorBoundary'));
assert('AppErrorBoundary implements getDerivedStateFromError', errorBoundarySrc.includes('static getDerivedStateFromError'));
assert('AppErrorBoundary implements componentDidCatch', errorBoundarySrc.includes('componentDidCatch'));
assert('AppErrorBoundary logs errors with stack', errorBoundarySrc.includes('console.error'));
assert('AppErrorBoundary wraps App in main.tsx', mainSrc.includes('<AppErrorBoundary>') && mainSrc.includes('</AppErrorBoundary>'));

// ─── Summary ──────────────────────────────────────────────────────

results.push('');
results.push(`═══ RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total ═══`);

const output = results.join('\n');
console.log(output);

// Save to Preview directory
try {
  mkdirSync(PREVIEW_DIR, { recursive: true });
  writeFileSync(resolve(PREVIEW_DIR, 'contract-test-results.txt'), output, 'utf8');
  console.log(`\nArtifacts saved to: ${PREVIEW_DIR}`);
} catch (e) {
  console.warn(`Could not write to Preview dir: ${e.message}`);
}

// Exit code
process.exit(failed > 0 ? 1 : 0);
