import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { SHEET_TOOLS } from '@/core/ai/tools/sheetTools';
import { ROW_TOOLS } from '@/core/ai/tools/rowTools';
import { PIPELINE_TOOLS } from '@/core/ai/tools/pipelineTools';
import { GMAIL_TOOLS } from '@/core/ai/tools/gmailTools';
import { DRIVE_TOOLS } from '@/core/ai/tools/driveTools';
import { DOCS_TOOLS } from '@/core/ai/tools/docsTools';
import type { AgentAction } from '@/core/ai/agentTypes';
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

  if (categories.includes('sheet')) categories.push('row');
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
  return WORKSPACE_COMMAND_CATALOG
    .filter(({ name }) => selectedNames.has(name))
    .map(({ tool }) => tool);
}

export function completeWorkspaceActions(
  userMessage: string,
  actions: AgentAction[],
  activeSheetTitle: string,
  knownSheetTitles: string[]
): AgentAction[] {
  if (!isFormattingRequest(userMessage)) return actions;

  const sheetTitle = resolveTargetSheet(userMessage, actions, activeSheetTitle, knownSheetTitles);
  const completed = [...actions];
  if (!completed.some((action) => action.type === 'format_cells')) {
    completed.push({
      type: 'format_cells',
      sheetTitle,
      range: '1:1',
      backgroundColor: '#0f172a',
      fontColor: '#ffffff',
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
  return completed;
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
