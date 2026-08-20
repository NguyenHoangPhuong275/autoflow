import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';
import { SHEET_TOOLS } from './tools/sheetTools';
import { ROW_TOOLS } from './tools/rowTools';
import { PIPELINE_TOOLS } from './tools/pipelineTools';
import { GMAIL_TOOLS } from './tools/gmailTools';
import { DRIVE_TOOLS } from './tools/driveTools';
import { DOCS_TOOLS } from './tools/docsTools';

export { SHEET_TOOLS } from './tools/sheetTools';
export { ROW_TOOLS } from './tools/rowTools';
export { PIPELINE_TOOLS } from './tools/pipelineTools';
export { GMAIL_TOOLS } from './tools/gmailTools';
export { DRIVE_TOOLS } from './tools/driveTools';
export { DOCS_TOOLS } from './tools/docsTools';

export const AUTOFLOW_TOOLS: DeepSeekToolDefinition[] = [
  ...SHEET_TOOLS,
  ...ROW_TOOLS,
  ...PIPELINE_TOOLS,
  ...GMAIL_TOOLS,
  ...DRIVE_TOOLS,
  ...DOCS_TOOLS,
];
