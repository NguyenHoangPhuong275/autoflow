import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/core/ai/agentTypes';

const STORAGE_KEY = 'autoflow_chat_history_v1';
const MAX_MESSAGES = 100;

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    sender: 'ai',
    text: 'Xin chào! Tôi là AutoFlow Agent — sẵn sàng thao tác trên bảng tính của bạn. Hãy cho tôi biết bạn cần làm gì.',
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
  };
}

function isValidMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.sender === 'user' || m.sender === 'ai' || m.sender === 'system') &&
    typeof m.text === 'string' &&
    typeof m.timestamp === 'string'
  );
}

function loadFromStorage(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createWelcomeMessage()];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [createWelcomeMessage()];

    const validated = parsed.filter(isValidMessage);
    if (validated.length === 0) return [createWelcomeMessage()];

    return validated.slice(-MAX_MESSAGES);
  } catch {
    return [createWelcomeMessage()];
  }
}

function saveToStorage(messages: ChatMessage[]): void {
  try {
    // Strip transient state — only persist stable fields
    const toSave = messages.slice(-MAX_MESSAGES).map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp,
      ...(msg.actionSummary ? { actionSummary: msg.actionSummary } : {}),
      ...(msg.options && msg.options.length > 0 ? { options: msg.options } : {}),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function useChatHistory() {
  const [messages, setMessagesState] = useState<ChatMessage[]>(loadFromStorage);
  const messagesRef = useRef(messages);

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const trimmed = next.slice(-MAX_MESSAGES);
        messagesRef.current = trimmed;
        saveToStorage(trimmed);
        return trimmed;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    const welcome = [createWelcomeMessage()];
    messagesRef.current = welcome;
    setMessagesState(welcome);
    saveToStorage(welcome);
  }, []);

  return { messages, setMessages, clearHistory };
}
