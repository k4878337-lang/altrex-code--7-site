import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { AgentMode } from '../lib/types.js';

export function useChat() {
  const {
    messages,
    addMessage,
    updateLastAssistant,
    clearMessages,
    isLoading,
    setIsLoading,
    mode,
    setMode,
  } = useAppStore();

  const sendMessage = useCallback(
    async (content: string, customMode?: AgentMode) => {
      if (!content.trim() || isLoading) return;

      const userMsg = {
        id: `usr_${Date.now()}`,
        role: 'user' as const,
        content: content.trim(),
        timestamp: Date.now(),
      };

      addMessage(userMsg);
      setIsLoading(true);

      const assistantId = `ast_${Date.now() + 1}`;
      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      });

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, mode: customMode || mode }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'text' && parsed.content) {
                    assistantContent += parsed.content;
                    updateLastAssistant(assistantContent);
                  } else if (parsed.type === 'tool_execution' || parsed.type === 'tool') {
                    addMessage({
                      id: `tool_${Date.now()}_${Math.random()}`,
                      role: 'tool',
                      content: parsed.result || parsed.content,
                      toolName: parsed.name || parsed.toolName,
                      timestamp: Date.now(),
                    });
                  } else if (parsed.type === 'ensemble_info') {
                    addMessage({
                      id: `ens_${Date.now()}_${Math.random()}`,
                      role: 'ensemble',
                      content: parsed.info || parsed.content,
                      timestamp: Date.now(),
                    });
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err: any) {
        addMessage({
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err.message}`,
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, mode, addMessage, updateLastAssistant, setIsLoading]
  );

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    mode,
    setMode,
  };
}
