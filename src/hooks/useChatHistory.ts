import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage } from '@/core/ai/agentTypes';
import { getErrorMessage } from '@/core/utils/errors';

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

export function useChatHistory() {
  const [messages, setMessagesState] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error: unknown) {
      console.warn(`Không thể xóa lịch sử chat cũ: ${getErrorMessage(error)}`);
    }
  }, []);

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const trimmed = next.slice(-MAX_MESSAGES);
        return trimmed;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    const welcome = [createWelcomeMessage()];
    setMessagesState(welcome);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error: unknown) {
      console.warn(`Không thể xóa lịch sử chat: ${getErrorMessage(error)}`);
    }
  }, []);

  return { messages, setMessages, clearHistory };
}
