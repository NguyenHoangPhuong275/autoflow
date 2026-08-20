import type { DeepSeekToolCall } from '@/core/services/deepSeekService';
import type { AgentAction, ChatMessageOption } from '@/core/ai/agentTypes';
export const AGENT_ACTION_TYPES = new Set<AgentAction['type']>([
    'create_sheet',
    'delete_sheet',
    'duplicate_sheet',
    'rename_sheet',
    'switch_sheet',
    'clear_sheet',
    'update_headers',
    'add_column',
    'delete_column',
    'freeze_rows_cols',
    'sort_range',
    'update_range',
    'set_formula',
    'format_cells',
    'auto_resize_columns',
    'set_column_width',
    'add_chart',
    'clear_charts',
    'update_row',
    'batch_update_rows',
    'add_row',
    'batch_add_rows',
    'delete_row',
    'batch_delete_rows',
    'start_pipeline',
    'pause_pipeline',
    'resume_pipeline',
    'reset_pipeline',
    'change_speed',
    'clear_logs',
    'export_csv',
    'load_url',
    'search_emails',
    'read_email',
    'send_email',
    'trash_email',
    'delete_email',
    'search_drive',
    'create_drive_folder',
    'rename_drive_file',
    'delete_drive_file',
    'read_google_doc',
    'create_google_doc',
    'append_google_doc',
]);
export function isAgentAction(value: unknown): value is AgentAction {
    if (!value || typeof value !== 'object')
        return false;
    return AGENT_ACTION_TYPES.has((value as AgentAction).type);
}
export function parseToolCall(toolCall: DeepSeekToolCall): AgentAction | null {
    try {
        const args = toolCall.function.arguments
            ? (JSON.parse(toolCall.function.arguments) as Record<string, unknown>)
            : {};
        const action = { type: toolCall.function.name, ...args };
        return isAgentAction(action) ? action : null;
    }
    catch (err) {
        console.warn(`[agentActionParser] Failed to parse tool call arguments for "${toolCall?.function?.name}":`, err);
        return null;
    }
}
export function extractTextActions(content: string): {
    cleanReply: string;
    actions: AgentAction[];
    options?: ChatMessageOption[];
} {
    let cleanReply = content;
    const actions: AgentAction[] = [];
    const options: ChatMessageOption[] = [];
    const actionMatch = content.match(/```action\s*([\s\S]*?)\s*```/);
    if (actionMatch?.[1]) {
        try {
            const parsed = JSON.parse(actionMatch[1]);
            if (Array.isArray(parsed)) {
                actions.push(...parsed.filter(isAgentAction));
            }
            else if (isAgentAction(parsed)) {
                actions.push(parsed);
            }
            cleanReply = cleanReply.replace(/```action[\s\S]*?```/, '').trim();
        }
        catch (error) {
            console.warn('Failed to parse text action block:', error);
        }
    }
    const optionsMatch = cleanReply.match(/```options\s*([\s\S]*?)\s*```/);
    if (optionsMatch?.[1]) {
        try {
            const parsedOpts = JSON.parse(optionsMatch[1]);
            if (Array.isArray(parsedOpts)) {
                options.push(...parsedOpts);
            }
            cleanReply = cleanReply.replace(/```options[\s\S]*?```/, '').trim();
        }
        catch (error) {
            console.warn('Failed to parse text options block:', error);
        }
    }
    return {
        cleanReply,
        actions,
        options: options.length > 0 ? options : undefined,
    };
}
