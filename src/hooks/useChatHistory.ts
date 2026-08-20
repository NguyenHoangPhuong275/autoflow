import { useState, useCallback, useRef, useEffect } from 'react';
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

/**
 * useChatHistory — Manages chat state for the current session.
 * Always starts with a fresh conversation upon page load / app entry.
 */
export function useChatHistory() {
  // Always start with a fresh welcome message on new visit/reload
  const [messages, setMessagesState] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const messagesRef = useRef(messages);

  // Clean up any legacy persistent storage on mount so previous sessions do not linger
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[useChatHistory] Failed to clear legacy storage:', err);
    }
  }, []);

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const trimmed = next.slice(-MAX_MESSAGES);
        messagesRef.current = trimmed;
        return trimmed;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    const welcome = [createWelcomeMessage()];
    messagesRef.current = welcome;
    setMessagesState(welcome);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[useChatHistory] Failed to clear storage on manual reset:', err);
    }
  }, []);

  return { messages, setMessages, clearHistory };
}
