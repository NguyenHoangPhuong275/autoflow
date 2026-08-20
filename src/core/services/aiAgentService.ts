import { DeepSeekService, type DeepSeekMessage, } from '@/core/services/deepSeekService';
import { extractTextActions, parseToolCall, } from '@/core/ai/agentActionParser';
import { buildAgentPrompt } from '@/core/ai/buildAgentPrompt';
import { AUTOFLOW_TOOLS } from '@/core/ai/agentTools';
import type { AgentAction, ChatMessage, ChatMessageOption, PermittedDocument, } from '@/core/ai/agentTypes';
import type { DataRow } from '@/types';
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
    public static async chatWithAgent(userMessage: string, history: ChatMessage[], currentRows: DataRow[], activeSheetTitle: string, allSheetTabs: string[], permittedDocs: PermittedDocument[], allSheetHeaders: Record<string, string[]> = {}): Promise<{
        reply: string;
        actions: AgentAction[];
        options?: ChatMessageOption[];
    }> {
        const systemPrompt = buildAgentPrompt({
            currentRows,
            activeSheetTitle,
            allSheetTabs,
            permittedDocs,
            allSheetHeaders,
        });
        const messages: DeepSeekMessage[] = [{ role: 'system', content: systemPrompt }];
        history.slice(-12).forEach((message) => {
            if (message.sender === 'user' || message.sender === 'ai') {
                messages.push({
                    role: message.sender === 'user' ? 'user' : 'assistant',
                    content: message.text,
                });
            }
        });
        messages.push({ role: 'user', content: userMessage });
        const response = await DeepSeekService.chatCompletionWithTools(messages, AUTOFLOW_TOOLS);
        const toolActions = response.toolCalls
            .map(parseToolCall)
            .filter((action): action is AgentAction => action !== null);
        const textResult = extractTextActions(response.content);
        const knownTabs = new Set([...allSheetTabs, activeSheetTitle].map((title) => title.trim().toLowerCase()));
        return {
            reply: textResult.cleanReply || 'Đã thực thi toàn bộ yêu cầu của bạn.',
            actions: [...toolActions, ...textResult.actions]
                .filter((action) => isKnownSheetAction(action, knownTabs)),
            options: textResult.options,
        };
    }
}
