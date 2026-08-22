import { APP_CONFIG } from '@/core/config';
import { readJson } from '@/core/utils/errors';
import {
    DEEPSEEK_CONTEXT_WINDOW_TOKENS,
    DEEPSEEK_MAX_INPUT_TOKENS,
    DEEPSEEK_MAX_OUTPUT_TOKENS,
    estimateTokenCount,
    truncateMessagesToTokenBudget,
    truncateToTokenBudget,
} from '@/core/services/deepSeekLimits';
export interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: DeepSeekToolCall[];
}
export interface DeepSeekToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
export interface DeepSeekToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
interface DeepSeekResponseMessage {
    content?: string | null;
    tool_calls?: DeepSeekToolCall[];
}
interface DeepSeekApiResponse {
    choices?: Array<{
        message?: DeepSeekResponseMessage;
    }>;
    error?: {
        message?: string;
    };
}
export class DeepSeekService {
    private static readonly apiUrl = '/api/deepseek/chat/completions';
    private static readonly model = 'deepseek-v4-flash';
    private static sanitizeContent(content: unknown): string {
        return typeof content === 'string'
            ? truncateToTokenBudget(content
                .replace(/\*/g, '')
                .replace(/\p{Extended_Pictographic}/gu, '')
                .replace(/\uFE0F/g, '')
                .trim(), DEEPSEEK_MAX_OUTPUT_TOKENS)
            : '';
    }
    private static async request(payload: Record<string, unknown>): Promise<DeepSeekResponseMessage> {
        const key = APP_CONFIG.deepSeekApiKey;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (key) {
            headers['Authorization'] = `Bearer ${key}`;
        }
        const messages = payload.messages;
        const normalizedPayload = Array.isArray(messages)
            ? {
                ...payload,
                messages: truncateMessagesToTokenBudget(messages as DeepSeekMessage[], DEEPSEEK_MAX_INPUT_TOKENS),
            }
            : payload;
        const inputTokens = Array.isArray(normalizedPayload.messages)
            ? normalizedPayload.messages.reduce((total, message) => total + estimateTokenCount(message.content), 0)
            : 0;
        const requestedOutputTokens = typeof normalizedPayload.max_tokens === 'number'
            ? normalizedPayload.max_tokens
            : DEEPSEEK_MAX_OUTPUT_TOKENS;
        const requestPayload = {
            ...normalizedPayload,
            max_tokens: Math.min(
                requestedOutputTokens,
                DEEPSEEK_MAX_OUTPUT_TOKENS,
                Math.max(1, DEEPSEEK_CONTEXT_WINDOW_TOKENS - inputTokens),
            ),
        };
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestPayload),
        });
        const data = await readJson<DeepSeekApiResponse>(response, {});
        if (!response.ok) {
            throw new Error(data.error?.message || `Lỗi DeepSeek API (HTTP ${response.status})`);
        }
        const message = data.choices?.[0]?.message;
        if (!message) {
            throw new Error('DeepSeek không trả về nội dung hợp lệ.');
        }
        return message;
    }
    public static async chatCompletion(messages: DeepSeekMessage[], temperature = 0.3, maxTokens = DEEPSEEK_MAX_OUTPUT_TOKENS): Promise<string> {
        const message = await this.request({
            model: this.model,
            messages,
            temperature,
            max_tokens: Math.min(maxTokens, DEEPSEEK_MAX_OUTPUT_TOKENS),
        });
        return this.sanitizeContent(message.content);
    }
    public static async chatCompletionWithTools(messages: DeepSeekMessage[], tools: DeepSeekToolDefinition[], temperature = 0.1): Promise<{
        content: string;
        toolCalls: DeepSeekToolCall[];
    }> {
        const message = await this.request({
            model: this.model,
            messages,
            tools,
            tool_choice: 'auto',
            temperature,
            max_tokens: DEEPSEEK_MAX_OUTPUT_TOKENS,
        });
        return {
            content: this.sanitizeContent(message.content),
            toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
        };
    }
    public static async processRow(rowData: Record<string, unknown>): Promise<string> {
        const data = Object.entries(rowData)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');
        return this.chatCompletion([
            {
                role: 'system',
                content: 'Bạn là trợ lý xử lý dữ liệu. Trả lời dưới 25 từ bằng văn bản thuần, không Markdown, dấu sao hoặc emoji.',
            },
            {
                role: 'user',
                content: `Dữ liệu hàng: [${data}]. Hãy tạo trạng thái ngắn gọn cho biết hàng đã được xử lý.`,
            },
        ], 0.3, 96);
    }
}
