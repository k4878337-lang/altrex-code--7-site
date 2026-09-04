import React, { useState, useRef, useEffect } from 'react';
import { AgentMode } from '../../types.js';
import { Message, ChatMessageItem } from './Message.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import { Send, Bot, Sparkles, Trash2, StopCircle, Brain, Terminal, Download, Lightbulb, Plus, Clock } from 'lucide-react';
import { memory } from '../../lib/memory.js';

interface ChatPanelProps {
  messages: ChatMessageItem[];
  onSendMessage: (prompt: string) => void;
  onClearMessages: () => void;
  onCancelExecution?: () => void;
  isLoading: boolean;
  mode: AgentMode;
  onOpenMemory?: () => void;
  onAddLocalSystemMessage?: (msg: ChatMessageItem) => void;
  onNewConversation?: () => void;
  onOpenHistory?: () => void;
}

const QUICK_PROMPTS = [
  'Create a modern responsive portfolio website with interactive dark mode',
  'Build a fully functional Todo app with categories and local storage',
  'Write a Python financial loan payment calculator with unit tests',
];

const SLASH_COMMANDS = [
  { cmd: '/new', desc: 'Start a fresh conversation (resets LLM context)' },
  { cmd: '/memory', desc: 'View active memory status & AI brain facts' },
  { cmd: '/remember <fact>', desc: 'Store a fact in AI Brain' },
  { cmd: '/recall', desc: 'Recall everything remembered about this workspace' },
  { cmd: '/memory export', desc: 'Export full memory backup JSON' },
  { cmd: '/memory clear', desc: 'Clear all persistent memory and start fresh' },
];

export function ChatPanel({
  messages,
  onSendMessage,
  onClearMessages,
  onCancelExecution,
  isLoading,
  mode,
  onOpenMemory,
  onAddLocalSystemMessage,
  onNewConversation,
  onOpenHistory,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSlashHints, setShowSlashHints] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Ctrl+Shift+N for New Conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewConversation?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (input.startsWith('/')) {
      setShowSlashHints(true);
    } else {
      setShowSlashHints(false);
    }
  }, [input]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check for Slash Commands
    if (text.startsWith('/')) {
      const lower = text.toLowerCase();

      if (lower === '/new') {
        onNewConversation?.();
        setInput('');
        return;
      }

      if (lower === '/memory' || lower === '/memory status') {
        const stats = memory.getStats();
        const facts = memory.getFacts();
        const content = `🧠 ALTREX PERSISTENT MEMORY STATUS:
• Total Files Saved: ${stats.totalFiles}
• Total Messages Persisted: ${stats.totalMessages}
• AI Brain Facts (${facts.length}):
${facts.map((f, i) => `  ${i + 1}. ${f}`).join('\n') || '  (No facts saved yet. Type /remember <fact>)'}
• Storage Engine: Dual-layer (RAM state + localStorage v1 debounced)`;
        
        if (onAddLocalSystemMessage) {
          onAddLocalSystemMessage({
            id: `mem_${Date.now()}`,
            role: 'memory',
            content,
            timestamp: Date.now(),
          });
        }
        setInput('');
        return;
      }

      if (lower === '/memory clear') {
        if (window.confirm('Clear all persistent memory?')) {
          memory.clearAllMemory();
          if (onAddLocalSystemMessage) {
            onAddLocalSystemMessage({
              id: `mem_${Date.now()}`,
              role: 'memory',
              content: '🧹 All persistent memory, saved files, and AI brain facts cleared.',
              timestamp: Date.now(),
            });
          }
        }
        setInput('');
        return;
      }

      if (lower === '/memory export') {
        const dataStr = memory.exportMemory();
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `altrex-memory-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (onAddLocalSystemMessage) {
          onAddLocalSystemMessage({
            id: `mem_${Date.now()}`,
            role: 'memory',
            content: '💾 Memory backup JSON downloaded successfully.',
            timestamp: Date.now(),
          });
        }
        setInput('');
        return;
      }

      if (lower.startsWith('/remember ')) {
        const fact = text.slice(10).trim();
        if (fact) {
          memory.rememberFact(fact);
          if (onAddLocalSystemMessage) {
            onAddLocalSystemMessage({
              id: `mem_${Date.now()}`,
              role: 'memory',
              content: `🧠 Stored new fact in AI Brain: "${fact}"\nThis context will be passed to every subsequent generation prompt!`,
              timestamp: Date.now(),
            });
          }
          setInput('');
          return;
        }
      }

      if (lower === '/recall') {
        const summary = memory.getAIBrainSummary();
        if (onAddLocalSystemMessage) {
          onAddLocalSystemMessage({
            id: `mem_${Date.now()}`,
            role: 'memory',
            content: `🔍 ALTREX ACTIVE RECALL CONTEXT:\n${summary}`,
            timestamp: Date.now(),
          });
        }
        setInput('');
        return;
      }
    }

    onSendMessage(text);
    setInput('');
  };

  return (
    <aside className="w-96 bg-black/85 backdrop-blur-xl border-l border-magenta/40 flex flex-col shrink-0 overflow-hidden font-sans shadow-[0_0_20px_rgba(255,0,229,0.15)] relative">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-magenta/30 flex items-center justify-between bg-magenta/5 select-none">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-magenta/20 border border-magenta/50 text-[#ff00e5] shadow-[0_0_10px_rgba(255,0,229,0.4)]">
            <Bot size={15} />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5 font-mono">
              ATX-1
              <span className="text-[10px] text-[#ff8df7] uppercase font-semibold">({mode})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* New Chat Button */}
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              title="Start New Conversation (Ctrl+Shift+N or /new)"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-rajdhani font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              <Plus size={12} className="text-cyan-400" />
              <span>NEW</span>
            </button>
          )}

          {/* History Drawer Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="Chat History & Past Sessions"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-rajdhani font-bold text-magenta bg-magenta/10 hover:bg-magenta/20 border border-magenta/50 transition-all shadow-[0_0_8px_rgba(255,0,229,0.2)] hover:shadow-[0_0_12px_rgba(255,0,229,0.4)] cursor-pointer"
            >
              <Clock size={12} />
              <span>HISTORY</span>
            </button>
          )}

          {onOpenMemory && (
            <button
              onClick={onOpenMemory}
              title="Open Persistent Memory System"
              className="p-1 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/30 transition-colors cursor-pointer"
            >
              <Brain size={14} />
            </button>
          )}

          {isLoading && onCancelExecution && (
            <button
              onClick={onCancelExecution}
              title="Stop execution (Ctrl+C)"
              className="px-2 py-0.5 rounded text-red-400 hover:bg-red-950/40 border border-red-500/30 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <StopCircle size={12} />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={onClearMessages}
            title="Clear Chat History"
            className="p-1 rounded-lg text-zinc-400 hover:text-magenta hover:bg-magenta/10 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3 px-2 text-center select-none">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,217,255,0.2)]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Ask ALTREX to Build Anything</div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                Files and code will be generated live in real-time. Persistent memory keeps your project safe across reloads.
              </p>
            </div>

            <div className="w-full space-y-1.5 mt-2">
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold tracking-wider">
                Quick Starters:
              </span>
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] text-zinc-300 font-mono transition-all truncate hover:border-cyan-500/30"
                >
                  › {p}
                </button>
              ))}
            </div>

            <div className="w-full p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono text-left flex items-start gap-2">
              <Brain size={13} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>
                Tip: Use <strong className="text-white">/remember &lt;fact&gt;</strong> to teach ALTREX your preferences (e.g. <em>/remember I prefer TypeScript with strict typing</em>).
              </span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isLoading && <ThinkingIndicator text="ATX-1 ReAct Loop Executing..." />}
        <div ref={messagesEndRef} />
      </div>

      {/* Slash Command Hints Popup */}
      {showSlashHints && (
        <div className="px-3 py-2 bg-black/90 border-t border-cyan-500/30 text-xs font-mono space-y-1 backdrop-blur-md">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Terminal size={11} className="text-cyan-400" />
            <span>Memory & System Slash Commands</span>
          </div>
          <div className="space-y-1">
            {SLASH_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                onClick={() => {
                  if (item.cmd.includes('<fact>')) {
                    setInput('/remember ');
                  } else {
                    setInput(item.cmd);
                  }
                  inputRef.current?.focus();
                }}
                className="w-full flex items-center justify-between text-left p-1 rounded hover:bg-white/10 transition-colors"
              >
                <span className="text-cyan-300 font-semibold">{item.cmd}</span>
                <span className="text-zinc-500 text-[10px] truncate">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="p-3 border-t border-magenta/30 bg-black/60">
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
            placeholder="Ask ALTREX to build, or type / for memory commands..."
            rows={2}
            className="w-full bg-black/80 border border-magenta/40 rounded-xl px-3 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/50 transition-all font-mono leading-relaxed shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 bottom-3 p-1.5 rounded-lg transition-all ${
              isLoading || !input.trim()
                ? 'text-zinc-600 cursor-not-allowed'
                : 'neon-btn magenta'
            }`}
          >
            <Send size={13} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1 px-1">
          <span>Enter ↵ to send • Shift+Enter for newline</span>
          <span className="text-[#ff8df7] font-semibold font-rajdhani">⚡ MODE: {mode.toUpperCase()}</span>
        </div>
      </div>
    </aside>
  );
}
