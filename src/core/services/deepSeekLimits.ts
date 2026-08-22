export const DEEPSEEK_CONTEXT_WINDOW_TOKENS = 1_000_000;
export const DEEPSEEK_MAX_INPUT_TOKENS = DEEPSEEK_CONTEXT_WINDOW_TOKENS;
export const DEEPSEEK_MAX_OUTPUT_TOKENS = 384_000;
export const DEEPSEEK_ESTIMATED_CHARS_PER_TOKEN = 1;
export const DEEPSEEK_MAX_INPUT_CHARACTERS = DEEPSEEK_MAX_INPUT_TOKENS * DEEPSEEK_ESTIMATED_CHARS_PER_TOKEN;
export const DEEPSEEK_MAX_REQUEST_BYTES = 32 * 1024 * 1024;

export function estimateTokenCount(value: string): number {
  return Math.ceil(value.length / DEEPSEEK_ESTIMATED_CHARS_PER_TOKEN);
}

export function truncateToTokenBudget(value: string, maxTokens: number): string {
  const maxCharacters = maxTokens * DEEPSEEK_ESTIMATED_CHARS_PER_TOKEN;
  if (value.length <= maxCharacters) return value;
  const suffix = '...';
  return `${value.slice(0, Math.max(0, maxCharacters - suffix.length))}${suffix}`;
}

export function truncateMessagesToTokenBudget<T extends { content: string }>(messages: T[], maxTokens: number): T[] {
  const maxCharacters = maxTokens * DEEPSEEK_ESTIMATED_CHARS_PER_TOKEN;
  const totalCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  if (totalCharacters <= maxCharacters) return messages;

  const firstMessage = messages[0];
  const firstContent = firstMessage?.content.slice(0, maxCharacters) || '';
  let remainingCharacters = Math.max(0, maxCharacters - firstContent.length);
  const retainedMessages: T[] = [];
  for (let index = messages.length - 1; index >= 1 && remainingCharacters > 0; index -= 1) {
    const message = messages[index];
    const content = message.content.slice(Math.max(0, message.content.length - remainingCharacters));
    retainedMessages.unshift({ ...message, content });
    remainingCharacters -= content.length;
  }
  return firstMessage ? [{ ...firstMessage, content: firstContent }, ...retainedMessages] : retainedMessages;
}
