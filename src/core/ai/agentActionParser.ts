import type { AgentAction, ChatMessageOption } from '@/core/ai/agentTypes';
import type { DeepSeekToolCall } from '@/core/services/deepSeekService';
import { isRecord } from '@/core/utils/errors';

export const AGENT_ACTION_TYPES = new Set<AgentAction['type']>([
    'create_spreadsheet', 'create_sheet', 'delete_sheet', 'duplicate_sheet', 'rename_sheet', 'switch_sheet', 'clear_sheet',
    'update_headers', 'add_column', 'delete_column', 'freeze_rows_cols', 'sort_range', 'update_range',
    'set_formula', 'format_cells', 'auto_resize_columns', 'set_column_width', 'add_chart', 'clear_charts',
    'update_row', 'batch_update_rows', 'add_row', 'batch_add_rows', 'delete_row', 'batch_delete_rows',
    'start_pipeline', 'pause_pipeline', 'resume_pipeline', 'reset_pipeline', 'change_speed', 'clear_logs',
    'export_csv', 'load_url', 'search_emails', 'read_email', 'send_email', 'trash_email', 'delete_email',
    'search_drive', 'create_drive_folder', 'rename_drive_file', 'delete_drive_file', 'read_google_doc',
    'create_google_doc', 'append_google_doc',
]);

export function isAgentAction(value: unknown): value is AgentAction {
    return isRecord(value)
        && typeof value.type === 'string'
        && AGENT_ACTION_TYPES.has(value.type as AgentAction['type']);
}

export function parseToolCall(toolCall: DeepSeekToolCall): AgentAction | null {
    try {
        const parsedArguments = toolCall.function.arguments
            ? JSON.parse(toolCall.function.arguments) as unknown
            : {};
        const action = {
            type: toolCall.function.name,
            ...(isRecord(parsedArguments) ? parsedArguments : {}),
        };
        return isAgentAction(action) ? action : null;
    } catch (error: unknown) {
        if (error instanceof SyntaxError) return null;
        throw error;
    }
}

export function extractTextActions(content: string): {
    cleanReply: string;
    actions: AgentAction[];
    options?: ChatMessageOption[];
} {
    const actionBlock = extractJsonBlock(content, 'action');
    const withoutActions = actionBlock.match ? content.replace(actionBlock.match[0], '').trim() : content;
    const optionsBlock = extractOptionsBlock(withoutActions);
    const cleanReply = optionsBlock.match ? withoutActions.replace(optionsBlock.match[0], '').trim() : withoutActions;
    const actionCandidates = Array.isArray(actionBlock.value) ? actionBlock.value : [actionBlock.value];
    const actions = actionCandidates.filter(isAgentAction);
    const options = Array.isArray(optionsBlock.value) ? optionsBlock.value.filter(isChatMessageOption) : [];

    return { cleanReply, actions, options: options.length ? options : undefined };
}

function extractJsonBlock(content: string, blockName: 'action' | 'options'): {
    match: RegExpMatchArray | null;
    value: unknown;
} {
    const expression = new RegExp('```' + blockName + '\\s*([\\s\\S]*?)\\s*```');
    const match = content.match(expression);
    if (!match?.[1]) {
        return { match, value: undefined };
    }

    try {
        return { match, value: JSON.parse(match[1]) as unknown };
    } catch (error: unknown) {
        if (error instanceof SyntaxError) return { match: null, value: undefined };
        throw error;
    }
}

function extractOptionsBlock(content: string): {
    match: RegExpMatchArray | null;
    value: unknown;
} {
    const expression = new RegExp('```options\\s*([\\s\\S]*?)\\s*```');
    const match = content.match(expression);
    if (!match?.[1]) {
        return { match, value: undefined };
    }

    try {
        return { match, value: JSON.parse(match[1]) as unknown };
    } catch (error: unknown) {
        if (!(error instanceof SyntaxError)) throw error;
        return { match, value: parseNumberedOptions(match[1]) };
    }
}

function parseNumberedOptions(content: string): ChatMessageOption[] {
    return content
        .split(/\r?\n/)
        .map((line) => line.trim().match(/^(?:\d+[.)]|[-*])\s+(.+)$/)?.[1]?.trim())
        .filter((label): label is string => Boolean(label))
        .map((label) => ({
            label,
            prompt: `Áp dụng lựa chọn: ${label}`,
        }));
}

function isChatMessageOption(value: unknown): value is ChatMessageOption {
    return isRecord(value) && typeof value.label === 'string';
}
