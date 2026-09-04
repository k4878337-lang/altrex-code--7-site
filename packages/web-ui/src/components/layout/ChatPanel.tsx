'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { Message } from '../chat/Message.js';
import { ThinkingIndicator } from '../chat/ThinkingIndicator.js';
import { Send, Bot, Sparkles, Trash2, StopCircle } from 'lucide-react';

const SUGGESTIONS = [
  'Build an Express health monitor in src/health.ts',
  'Write a Fibonacci benchmark algorithm in TypeScript',
  'Check system architecture and active provider latency',
];

export function ChatPanel() {
  const [input, setInput] = useState('');
  const {
    messages,
    addMessage,
    updateLastAssistant,
    clearMessages,
    isLoading,
    setIsLoading,
    mode,
    setFileTree,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const refreshFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) setFileTree(data.files);
    } catch {
      // ignore
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      addMessage({
        id: `sys_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Execution stopped by user.',
        timestamp: Date.now(),
      });
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user' as const,
      content: textToSend,
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    const assistantId = `ast_${Date.now() + 1}`;
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, mode }),
        signal: controller.signal,
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
                  refreshFiles();
                } else if (parsed.type === 'ensemble_info') {
                  addMessage({
                    id: `ens_${Date.now()}_${Math.random()}`,
                    role: 'ensemble',
                    content: parsed.info || parsed.content,
                    timestamp: Date.now(),
                  });
                } else if (parsed.type === 'ensemble_data') {
                  addMessage({
                    id: `ens_data_${Date.now()}_${Math.random()}`,
                    role: 'ensemble',
                    content: `Consensus agreement score: ${Math.round(parsed.data.agreementScore * 100)}%`,
                    ensembleData: parsed.data,
                    timestamp: Date.now(),
                  });
                } else if (parsed.type === 'error') {
                  addMessage({
                    id: `err_${Date.now()}`,
                    role: 'assistant',
                    content: `Error: ${parsed.content || parsed.error}`,
                    timestamp: Date.now(),
                  });
                }
              } catch {
                // ignore json parse error
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addMessage({
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
        });
      }
    } finally {
      setIsLoading(false);
      refreshFiles();
    }
  };

  return (
    <aside className="w-96 bg-[#0a0f1d] border-l border-zinc-800 flex flex-col shrink-0 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/80 flex items-center justify-between bg-[#0c1222]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
            <Bot size={15} />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5 font-mono">
              ALTREX AGENT
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">({mode})</span>
            </div>
            <div className="text-[10px] text-zinc-500">Autonomous ReAct & Consensus</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isLoading && (
            <button
              onClick={handleCancel}
              title="Stop execution (Ctrl+C)"
              className="p-1 rounded text-red-400 hover:bg-red-950/40 border border-red-500/30 text-[11px] font-mono flex items-center gap-1 transition-colors"
            >
              <StopCircle size={13} />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          <button
            onClick={clearMessages}
            title="Clear Chat History"
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 px-2 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-300">Phase 3 Codex Assistant</div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Generate code, refactor files, inspect workspace, or run multi-model consensus.
              </p>
            </div>

            <div className="w-full space-y-1.5 mt-2">
              <span className="text-[10px] uppercase font-mono text-zinc-600 font-bold tracking-wider">
                Quick Prompts:
              </span>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="w-full text-left p-2 rounded-lg bg-[#0e1628] hover:bg-[#152038] border border-zinc-800 text-[11px] text-zinc-300 font-mono transition-all truncate"
                >
                  › {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isLoading && <ThinkingIndicator text="ATX-1 ReAct Loop Executing..." />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-zinc-800/80 bg-[#090d18]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask ALTREX to write, test, or refactor code..."
            rows={2}
            className="w-full bg-[#050811] border border-zinc-800 rounded-xl px-3 py-2.5 pr-10 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 bottom-3 p-1.5 rounded-lg transition-all ${
              isLoading || !input.trim()
                ? 'text-zinc-600 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
            }`}
          >
            <Send size={13} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono mt-1 px-1">
          <span>Enter ↵ to send • Shift+Enter for newline</span>
          <span className="text-cyan-500/70">Mode: {mode}</span>
        </div>
      </div>
    </aside>
  );
}
