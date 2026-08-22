import { DeepSeekService, type DeepSeekMessage, } from '@/core/services/deepSeekService';
import { extractTextActions, parseToolCall, } from '@/core/ai/agentActionParser';
import { buildAgentPrompt } from '@/core/ai/buildAgentPrompt';
import { completeWorkspaceActions, selectWorkspaceTools } from '@/core/ai/agentTools';
import type { AgentAction, ChatMessage, ChatMessageOption, PermittedDocument, SheetDataIndex, } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
import { makeResult } from '@/core/ai/executeAgentActions';
import { executeDriveAction } from '@/core/ai/handlers/driveActionHandlers';
import { executeDocsAction } from '@/core/ai/handlers/docsActionHandlers';
import { executeGmailAction } from '@/core/ai/handlers/gmailActionHandlers';
import { GoogleSheetReader } from '@/core/parsers/googleSheetReader';
import { GoogleSyncService } from '@/core/services/googleSyncService';
import { normalizeForMatching } from '@/core/utils/text';
import {
    DEEPSEEK_MAX_INPUT_CHARACTERS,
    DEEPSEEK_MAX_INPUT_TOKENS,
    truncateToTokenBudget,
} from '@/core/services/deepSeekLimits';
export type { AgentAction, ChatMessage, ChatMessageOption, PermittedDocument, } from '@/core/ai/agentTypes';
function isKnownSheetAction(action: AgentAction, knownTabs: Set<string>): boolean {
    if (action.type === 'create_sheet'
        || action.type === 'rename_sheet'
        || action.type === 'duplicate_sheet') {
        return true;
    }
    if (action.type !== 'clear_sheet'
        && action.type !== 'switch_sheet'
        && action.type !== 'update_headers'
        && action.type !== 'delete_sheet') {
        return true;
    }
    return action.sheetTitle
        ? knownTabs.has(action.sheetTitle.trim().toLowerCase())
        : true;
}
export class AiAgentService {
    public static async chatWithAgent(userMessage: string, history: ChatMessage[], currentRows: DataRow[], activeSheetTitle: string, allSheetTabs: string[], permittedDocs: PermittedDocument[], allSheetHeaders: Record<string, string[]> = {}, allSheetRows: SheetDataIndex = {}): Promise<{
        reply: string;
        actions: AgentAction[];
        options?: ChatMessageOption[];
    }> {
        const systemPrompt = buildAgentPrompt({
            userMessage,
            currentRows,
            activeSheetTitle,
            allSheetTabs,
            permittedDocs,
            allSheetHeaders,
            allSheetRows,
        });
        const messages: DeepSeekMessage[] = [{ role: 'system', content: systemPrompt }];
        history.slice(-8).forEach((message) => {
            if (message.sender === 'user' || message.sender === 'ai') {
                messages.push({
                    role: message.sender === 'user' ? 'user' : 'assistant',
                    content: message.text.slice(0, 1200),
                });
            }
        });
        messages.push({ role: 'user', content: userMessage });
        const availableTools = selectWorkspaceTools(userMessage);
        let response = await DeepSeekService.chatCompletionWithTools(messages, availableTools);
        const deferredActions: AgentAction[] = [];
        for (let round = 0; round < 3 && response.toolCalls.length > 0; round += 1) {
            const parsedCalls = response.toolCalls.map((toolCall) => ({
                toolCall,
                action: parseToolCall(toolCall),
            }));
            const retrievalCalls = parsedCalls.filter(({ action }) => action && RETRIEVAL_ACTIONS.has(action.type));
            if (retrievalCalls.length === 0) {
                deferredActions.push(...parsedCalls
                    .map(({ action }) => action)
                    .filter((action): action is AgentAction => action !== null));
                break;
            }

            messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.toolCalls,
            });
            for (const { toolCall, action } of parsedCalls) {
                const content = action === null
                    ? JSON.stringify({ status: 'failed', message: 'Tool call không hợp lệ và không thể thực thi.' })
                    : RETRIEVAL_ACTIONS.has(action.type)
                        ? JSON.stringify(await executeRetrievalAction(action))
                        : JSON.stringify({ status: 'deferred', message: 'Action sẽ được thực thi sau khi hoàn tất truy vấn nguồn.', action: action.type });
                if (action !== null && (action.type === 'load_url' || !RETRIEVAL_ACTIONS.has(action.type))) {
                    deferredActions.push(action);
                }
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content,
                });
            }
            response = await DeepSeekService.chatCompletionWithTools(messages, availableTools);
        }

        const toolActions = response.toolCalls
            .map(parseToolCall)
            .filter((action): action is AgentAction => action !== null)
            .filter((action) => !RETRIEVAL_ACTIONS.has(action.type));
        const textResult = extractTextActions(response.content);
        const knownTabs = new Set([...allSheetTabs, activeSheetTitle].filter(Boolean).map((title) => title.trim().toLowerCase()));
        let actions = deduplicateActions([...deferredActions, ...toolActions, ...textResult.actions]);
        actions = ensureRequestedEmailAction(userMessage, textResult.cleanReply, actions);
        actions = deduplicateActions(completeWorkspaceActions(userMessage, actions, activeSheetTitle, allSheetTabs, allSheetHeaders, allSheetRows));
        return {
            reply: textResult.cleanReply || 'Đã thực thi toàn bộ yêu cầu của bạn.',
            actions: actions.filter((action) => isKnownSheetAction(action, knownTabs)),
            options: textResult.options,
        };
    }
}

const RETRIEVAL_ACTIONS = new Set<AgentAction['type']>([
  'search_emails',
  'read_email',
  'search_drive',
  'read_google_doc',
  'load_url',
]);

async function executeRetrievalAction(action: AgentAction): Promise<unknown> {
    if (action.type === 'load_url') {
        return executeSheetRetrievalAction(action);
    }

    const result = action.type === 'search_drive'
        ? await executeDriveAction(action, makeResult)
        : action.type === 'read_google_doc'
            ? await executeDocsAction(action, makeResult)
            : await executeGmailAction(action, makeResult);
    return result ? {
        summary: result.summary,
        data: truncateRetrievalData(result.result),
    } : { summary: 'Không có bộ xử lý cho truy vấn này.' };
}

function truncateRetrievalData(value: unknown): unknown {
    const serialized = JSON.stringify(value);
    if (serialized.length <= DEEPSEEK_MAX_INPUT_CHARACTERS) return value;
    return truncateToTokenBudget(serialized, DEEPSEEK_MAX_INPUT_TOKENS);
}

async function executeSheetRetrievalAction(action: AgentAction): Promise<unknown> {
    const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(action.url || '');
    if (!spreadsheetId) {
        return { summary: 'URL Google Sheets không hợp lệ.', data: null };
    }

    const tabs = await GoogleSyncService.fetchSheetMetadata(spreadsheetId);
    const requestedTitle = action.sheetTitle?.trim();
    const selectedTab = tabs.find((tab) => tab.title.toLowerCase() === requestedTitle?.toLowerCase())?.title
        || tabs[0]?.title
        || requestedTitle
        || 'Sheet1';
    const context = await GoogleSyncService.fetchSheetContext(spreadsheetId, selectedTab);

    return {
        summary: `Đã đọc cấu trúc Sheet "${selectedTab}".`,
        data: {
            spreadsheetId,
            sheetTitle: selectedTab,
            headers: context.headers,
            rows: context.rows.map((row) => row.data),
            rowCount: context.rows.length,
        },
    };
}

function deduplicateActions(actions: AgentAction[]): AgentAction[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
        const key = action.type === 'create_sheet' || action.type === 'create_spreadsheet'
            ? `${action.type}:${action.sheetTitle?.trim().toLowerCase()}`
            : JSON.stringify(action);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function ensureRequestedEmailAction(
    userMessage: string,
    reply: string,
    actions: AgentAction[]
): AgentAction[] {
    const recipient = userMessage.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const normalized = normalizeForMatching(userMessage);
    const explicitlyRequestsSending = /\b(send|email|mail)\b|gui\s+(email|mail|thu)|gui\s+den/.test(normalized);
    if (!recipient || !explicitlyRequestsSending || actions.some((action) => action.type === 'send_email')) return actions;

    return [...actions, {
        type: 'send_email',
        to: recipient,
        subject: 'Kết quả xử lý yêu cầu từ AutoFlow',
        body: reply || `Đã hoàn tất yêu cầu: ${userMessage}`,
    }];
}
