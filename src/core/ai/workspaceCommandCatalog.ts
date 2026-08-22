import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { SHEET_TOOLS } from '@/core/ai/tools/sheetTools';
import { ROW_TOOLS } from '@/core/ai/tools/rowTools';
import { PIPELINE_TOOLS } from '@/core/ai/tools/pipelineTools';
import { GMAIL_TOOLS } from '@/core/ai/tools/gmailTools';
import { DRIVE_TOOLS } from '@/core/ai/tools/driveTools';
import { DOCS_TOOLS } from '@/core/ai/tools/docsTools';
import type { AgentAction, SheetDataIndex } from '@/core/ai/agentTypes';
import { isFormattingRequest, normalizeForMatching } from '@/core/utils/text';

export type WorkspaceCommandCategory = 'sheet' | 'row' | 'pipeline' | 'gmail' | 'drive' | 'docs';

export interface WorkspaceCommandEntry {
  name: string;
  category: WorkspaceCommandCategory;
  tool: DeepSeekToolDefinition;
}

export const WORKSPACE_COMMAND_GROUPS: Record<WorkspaceCommandCategory, DeepSeekToolDefinition[]> = {
  sheet: SHEET_TOOLS,
  row: ROW_TOOLS,
  pipeline: PIPELINE_TOOLS,
  gmail: GMAIL_TOOLS,
  drive: DRIVE_TOOLS,
  docs: DOCS_TOOLS,
};

export const WORKSPACE_COMMAND_CATALOG: WorkspaceCommandEntry[] = Object.entries(WORKSPACE_COMMAND_GROUPS)
  .flatMap(([category, tools]) => tools.map((tool) => ({
    name: tool.function.name,
    category: category as WorkspaceCommandCategory,
    tool,
  })));

export const AUTOFLOW_TOOLS: DeepSeekToolDefinition[] = WORKSPACE_COMMAND_CATALOG.map(({ tool }) => tool);

const CATEGORY_PATTERNS: Record<Exclude<WorkspaceCommandCategory, 'row'>, RegExp> = {
  sheet: /\b(sheet|sheets|spreadsheet|excel|tab|cell|range|formula|chart|column|row|header|csv|test case)\b|bang tinh|trang tinh|cot|dong|hang|o tinh|cong thuc|bieu do/i,
  pipeline: /\b(pipeline|workflow|process|speed|log|reset|pause|resume|start|export)\b|quy trinh|toc do|nhat ky|tam dung|tiep tuc|dat lai|xuat du lieu/i,
  gmail: /\b(gmail|email|mail|inbox|otp|message)\b|hop thu|thu dien tu|nguoi gui|gui thu/i,
  drive: /\b(drive|folder|file|files)\b|thu muc|tep/i,
  docs: /\b(docs|doc|document|documents)\b|tai lieu|van ban/i,
};

const OVERVIEW_PATTERN = /\b(overview|workspace|overall|all|cross)\b|tong quan|tong hop|toan bo|tat ca|ket hop|lien quan nhieu nguon/i;

export function classifyWorkspaceRequest(userMessage: string): WorkspaceCommandCategory[] {
  const normalizedMessage = normalizeForMatching(userMessage);
  const categories: WorkspaceCommandCategory[] = (Object.entries(CATEGORY_PATTERNS) as Array<[Exclude<WorkspaceCommandCategory, 'row'>, RegExp]>)
    .filter(([, pattern]) => pattern.test(normalizedMessage))
    .map(([category]) => category);

  if (/\b(link|url)\b|lien ket|duong dan|dia chi/i.test(normalizedMessage)) {
    categories.push('drive');
  }

  if (categories.includes('sheet')) categories.push('row');
  if (categories.includes('sheet') && hasNamedSheetReference(normalizedMessage)) categories.push('drive');
  if (categories.includes('docs') && !categories.includes('drive')) categories.push('drive');
  if (categories.includes('drive') && !categories.includes('docs')) categories.push('docs');
  if (OVERVIEW_PATTERN.test(normalizedMessage) && categories.length === 0) {
    return Object.keys(WORKSPACE_COMMAND_GROUPS) as WorkspaceCommandCategory[];
  }
  return [...new Set(categories)];
}

export function selectWorkspaceTools(userMessage: string): DeepSeekToolDefinition[] {
  const categories = classifyWorkspaceRequest(userMessage);
  if (categories.length === 0) return AUTOFLOW_TOOLS;
  const selectedNames = new Set(categories.flatMap((category) => WORKSPACE_COMMAND_GROUPS[category].map((tool) => tool.function.name)));
  if (categories.includes('sheet') && categories.includes('drive')) selectedNames.add('load_url');
  return WORKSPACE_COMMAND_CATALOG
    .filter(({ name }) => selectedNames.has(name))
    .map(({ tool }) => tool);
}

export function completeWorkspaceActions(
  userMessage: string,
  actions: AgentAction[],
  activeSheetTitle: string,
  knownSheetTitles: string[],
  allSheetHeaders: Record<string, string[]> = {},
  allSheetRows: SheetDataIndex = {}
): AgentAction[] {
  const completed = [...actions];
  if (isFormattingRequest(userMessage)) {
    const sheetTitle = resolveTargetSheet(userMessage, completed, activeSheetTitle, knownSheetTitles);
    if (sheetTitle.trim()) {
      if (!completed.some((action) => action.type === 'format_cells' && isHeaderRange(action.range))) {
        const headerStyle = resolveHeaderStyle(userMessage);
        completed.push({
          type: 'format_cells',
          sheetTitle,
          range: '1:1',
          backgroundColor: headerStyle.backgroundColor,
          fontColor: headerStyle.fontColor,
          bold: true,
          fontSize: 11,
          fontFamily: 'Arial',
          alignment: 'CENTER',
        });
      }
      if (!completed.some((action) => action.type === 'freeze_rows_cols')) {
        completed.push({ type: 'freeze_rows_cols', sheetTitle, frozenRows: 1, frozenCols: 0 });
      }
      if (!completed.some((action) => action.type === 'auto_resize_columns')) {
        completed.push({ type: 'auto_resize_columns', sheetTitle });
      }
    }
  }

  return completeRequestedSampleData(userMessage, completed, activeSheetTitle, knownSheetTitles, allSheetHeaders, allSheetRows);
}

function completeRequestedSampleData(
  userMessage: string,
  actions: AgentAction[],
  activeSheetTitle: string,
  knownSheetTitles: string[],
  allSheetHeaders: Record<string, string[]>,
  allSheetRows: SheetDataIndex
): AgentAction[] {
  if (!requestsSampleData(userMessage)) return actions;

  const creation = actions.find((action) => action.type === 'create_sheet' || action.type === 'create_spreadsheet');
  if (!creation?.sheetTitle) return actions;
  if (actions.some((action) => action.type === 'add_row' || action.type === 'batch_add_rows')) return actions;

  const source = resolveSampleSource(
    userMessage,
    creation.sheetTitle,
    activeSheetTitle,
    knownSheetTitles,
    allSheetHeaders,
    allSheetRows
  );
  const headers = normalizeHeaders(creation.headers).length > 0
    ? normalizeHeaders(creation.headers)
    : source.headers;
  if (headers.length === 0) return actions;

  const completed = actions.map((action) => (
    action === creation ? { ...action, headers } : action
  ));
  completed.push({
    type: 'batch_add_rows',
    sheetTitle: creation.sheetTitle,
    rowsData: [source.rows[0] ? alignRowToHeaders(source.rows[0].data, headers) : buildSampleRow(headers)],
  });
  return completed;
}

function requestsSampleData(userMessage: string): boolean {
  const normalized = normalizeForMatching(userMessage);
  return /\b(sample|example|demo|mock)\b|du lieu mau|mau du lieu|dong mau|hang mau/.test(normalized);
}

function normalizeHeaders(headers?: string[]): string[] {
  return (headers || []).map((header) => header.trim()).filter(Boolean);
}

function resolveSampleSource(
  userMessage: string,
  targetSheetTitle: string,
  activeSheetTitle: string,
  knownSheetTitles: string[],
  allSheetHeaders: Record<string, string[]>,
  allSheetRows: SheetDataIndex
): { headers: string[]; rows: Array<{ data: Record<string, unknown> }> } {
  const normalizedMessage = normalizeForMatching(userMessage);
  const sourceTitles = [...new Set([...Object.keys(allSheetHeaders), ...Object.keys(allSheetRows), ...knownSheetTitles])];
  const candidates = sourceTitles
    .map((title) => ({
      title,
      headers: normalizeHeaders(allSheetHeaders[title] || (allSheetRows[title]?.[0] ? Object.keys(allSheetRows[title][0].data) : [])),
      rows: allSheetRows[title] || [],
      score: scoreHeaderSource(title, normalizedMessage, title === activeSheetTitle),
    }))
    .filter(({ title, headers }) => title.toLowerCase() !== targetSheetTitle.toLowerCase() && headers.length > 0)
    .sort((left, right) => right.score - left.score);

  const selected = candidates[0];
  if (selected) return { headers: selected.headers, rows: selected.rows };

  const activeHeaders = normalizeHeaders(allSheetHeaders[activeSheetTitle]);
  if (activeHeaders.length > 0) return { headers: activeHeaders, rows: allSheetRows[activeSheetTitle] || [] };

  const knownSource = knownSheetTitles.find((title) => title.toLowerCase() !== targetSheetTitle.toLowerCase());
  return {
    headers: normalizeHeaders(knownSource ? allSheetHeaders[knownSource] : undefined),
    rows: knownSource ? allSheetRows[knownSource] || [] : [],
  };
}

function scoreHeaderSource(title: string, normalizedMessage: string, isActive: boolean): number {
  const titleTerms = normalizeForMatching(title).split(/\s+/).filter((term) => term.length > 1);
  const overlap = titleTerms.reduce((score, term) => score + (normalizedMessage.includes(term) ? 2 : 0), 0);
  return overlap + (isActive ? 1 : 0);
}

function buildSampleRow(headers: string[]): Record<string, unknown> {
  return Object.fromEntries(headers.map((header, index) => [header, sampleValueForHeader(header, index)]));
}

function alignRowToHeaders(sourceRow: Record<string, unknown>, headers: string[]): Record<string, unknown> {
  return Object.fromEntries(headers.map((header) => [
    header,
    Object.entries(sourceRow).find(([key]) => key.toLowerCase() === header.toLowerCase())?.[1] ?? '',
  ]));
}

function sampleValueForHeader(header: string, index: number): string {
  const normalized = normalizeForMatching(header);
  if (/^(id|code|ma)$/.test(normalized) || /\b(id|code|ma)\b/.test(normalized)) return 'TC-001';
  if (/start state|trang thai bat dau|trang thai/.test(normalized)) return 'Initial state';
  if (/input|input data|du lieu vao|dau vao/.test(normalized)) return 'Valid input';
  if (/output|expected|ky vong|ket qua/.test(normalized)) return 'Operation completed successfully';
  if (/condition|dieu kien|precondition/.test(normalized)) return 'Precondition is satisfied';
  if (/action|hanh dong|thao tac/.test(normalized)) return 'Execute the main action';
  if (/path|duong di|flow|luong/.test(normalized)) return 'Main flow';
  if (/coverage|do phu/.test(normalized)) return 'Main path covered';
  return `Sample data ${index + 1}`;
}

function hasNamedSheetReference(normalizedMessage: string): boolean {
  const mentionsSheet = /\b(sheet|sheets|spreadsheet|tab)\b|bang tinh|trang tinh/i.test(normalizedMessage);
  const refersToCurrentSource = /\b(current|active|existing)\b|hien tai|dang mo|nay/i.test(normalizedMessage);
  return mentionsSheet && !refersToCurrentSource;
}

function isHeaderRange(range?: string): boolean {
  return /^(?:header|headers|1:1|[A-Za-z]+1:[A-Za-z]+1)$/i.test(range?.trim() || '');
}

function resolveHeaderStyle(userMessage: string): { backgroundColor: string; fontColor: string } {
  const normalized = normalizeForMatching(userMessage);
  const backgroundMatch = normalized.match(/header[\s\S]{0,120}#([0-9a-f]{6})/i);
  const fontMatch = normalized.match(/(?:chu|font|text)[\s\S]{0,80}#([0-9a-f]{6})/i);
  return {
    backgroundColor: backgroundMatch ? `#${backgroundMatch[1]}` : '#0f172a',
    fontColor: fontMatch ? `#${fontMatch[1]}` : '#ffffff',
  };
}

function resolveTargetSheet(
  userMessage: string,
  actions: AgentAction[],
  activeSheetTitle: string,
  knownSheetTitles: string[]
): string {
  const actionTarget = actions.find((action) => action.sheetTitle)?.sheetTitle;
  if (actionTarget) return actionTarget;
  const messageTerms = new Set(normalizeForMatching(userMessage).split(/\s+/).filter((term) => term.length > 1));
  const ranked = knownSheetTitles
    .map((title) => ({
      title,
      score: normalizeForMatching(title).split(/\s+/).filter((term) => messageTerms.has(term)).length,
    }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score ? ranked[0].title : activeSheetTitle;
}

export { SHEET_TOOLS, ROW_TOOLS, PIPELINE_TOOLS, GMAIL_TOOLS, DRIVE_TOOLS, DOCS_TOOLS };
