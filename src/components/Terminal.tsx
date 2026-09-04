import React, { useState, useRef, useEffect } from 'react';
import { LogItem, AgentMode } from '../types';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Cpu,
  CornerDownLeft,
  XCircle,
  Brain,
  Layers,
  Gauge,
} from 'lucide-react';

interface TerminalProps {
  logs: LogItem[];
  isLoading: boolean;
  activeProvider: string;
  mode: AgentMode;
  onlineCount?: number;
  onSwitchMode: () => void;
  onOpenOrchestrator: () => void;
  onSubmitPrompt: (prompt: string) => void;
  onClearLogs: () => void;
  onCancelExecution?: () => void;
}

export function Terminal({
  logs,
  isLoading,
  activeProvider,
  mode,
  onlineCount = 4,
  onSwitchMode,
  onOpenOrchestrator,
  onSubmitPrompt,
  onClearLogs,
  onCancelExecution,
}: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [collapsedTools, setCollapsedTools] = useState<Record<string, boolean>>({});
  const [expandedEnsemble, setExpandedEnsemble] = useState<Record<string, boolean>>({});

  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, isLoading]);

  // Focus input on mount & click
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const trimmed = input.trim();
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput('');
    onSubmitPrompt(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Up arrow for history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      if (onCancelExecution && isLoading) {
        onCancelExecution();
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const toggleToolCollapse = (id: string) => {
    setCollapsedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const samplePrompts = [
    {
      label: '⚡ Hello ALTREX (Python)',
      prompt: "Create a python script called hello.py that prints 'ALTREX IS ONLINE' and then execute it.",
    },
    {
      label: '📂 List Directory',
      prompt: 'List the workspace directory contents and tell me what files are present.',
    },
    {
      label: '🔍 Search Files',
      prompt: 'Search for all python (.py) and markdown (.md) files in the workspace.',
    },
    {
      label: '🧪 Math & Tests',
      prompt: 'Write a python script fibonacci.py that calculates fib(20) with tests, then run it.',
    },
  ];

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full bg-[#070b14] border-2 border-cyan-500/80 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] select-text"
    >
      {/* Ink Terminal Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0d1424] border-b border-cyan-500/40 text-xs font-mono select-none">
        <div className="flex items-center space-x-2.5 text-cyan-400">
          <Zap className="w-4 h-4 fill-cyan-400 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wide text-white">ALTREX CODE v2.0</span>
          <span className="text-cyan-500/70 font-semibold">(Phase 2)</span>
          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Model Registry count badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenOrchestrator();
            }}
            title="Open Provider Registry & Health Probe"
            className="px-2 py-0.5 rounded font-bold text-[11px] transition-all bg-slate-900/90 text-slate-300 border border-slate-700 hover:border-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{onlineCount} Models Online</span>
          </button>

          {/* Mode Switcher Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchMode();
            }}
            title="Click to cycle mode (Speed → Balanced → Deep) or press Ctrl+M"
            className={`px-2.5 py-0.5 rounded font-bold uppercase text-[11px] transition-all border flex items-center gap-1 shadow-sm ${
              mode === 'speed'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 hover:border-emerald-400'
                : mode === 'balanced'
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60 hover:border-cyan-400'
                : 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40 hover:bg-fuchsia-900/60 hover:border-fuchsia-400'
            }`}
          >
            <Gauge className="w-3 h-3" />
            <span>MODE: {mode.toUpperCase()}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
          <span className="hidden md:inline text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[10px]">Ctrl+M</kbd> Switch Mode
          </span>
          <span className="hidden md:inline text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl+C</kbd> Cancel
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearLogs();
            }}
            title="Clear logs"
            className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Log Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <div className="p-3 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
              <TerminalIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">ALTREX CODE Engine Ready</div>
              <div className="text-slate-500 text-xs mt-0.5">
                Active Provider: <span className="text-cyan-400 font-bold">{activeProvider.toUpperCase()}</span> (Qwen 3.8 Max Free)
              </div>
            </div>
            <div className="text-[11px] text-slate-400 max-w-md">
              Ask ALTREX to write, test, and run code. The ReAct autonomous loop will inspect files, execute commands, and verify results.
            </div>

            {/* Starter chips */}
            <div className="pt-2 flex flex-wrap gap-2 justify-center max-w-lg">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubmitPrompt(s.prompt);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0c1426] hover:bg-[#13203c] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-left transition-all text-[11px] flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          logs.map((log) => {
            if (log.type === 'user') {
              return (
                <div key={log.id} className="pt-2">
                  <div className="flex items-start space-x-2 text-cyan-400 font-bold text-sm">
                    <span className="text-cyan-500 select-none">❯</span>
                    <span className="text-cyan-200">{log.content}</span>
                  </div>
                </div>
              );
            }

            if (log.type === 'system') {
              return (
                <div key={log.id} className="text-yellow-400/90 text-xs flex items-center space-x-1.5 py-0.5">
                  <span className="select-none">⚙️</span>
                  <span>{log.content}</span>
                </div>
              );
            }

            if (log.type === 'ensemble_info') {
              return (
                <div
                  key={log.id}
                  className="py-1 px-3 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/40 text-fuchsia-200 text-xs flex items-center space-x-2 my-1"
                >
                  <Brain className="w-4 h-4 text-fuchsia-400 animate-pulse shrink-0" />
                  <span className="font-semibold">{log.content}</span>
                </div>
              );
            }

            if (log.type === 'ensemble_data' && log.ensembleData) {
              const data = log.ensembleData;
              const isExpanded = expandedEnsemble[log.id];
              const scorePct = Math.round(data.agreementScore * 100);

              return (
                <div
                  key={log.id}
                  className="my-2 rounded-xl border border-fuchsia-500/30 bg-[#0e091e] overflow-hidden text-xs shadow-lg"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedEnsemble((prev) => ({ ...prev, [log.id]: !prev[log.id] }));
                    }}
                    className="p-3 bg-[#170e30] hover:bg-[#1e123d] cursor-pointer flex items-center justify-between border-b border-fuchsia-500/20 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Brain className="w-4 h-4 text-fuchsia-400" />
                      <span className="font-bold text-white">Parallel Ensemble Consensus</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40 font-bold">
                        {scorePct}% Agreement Score
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                      <span>{data.individualResponses.length} Models Queried</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-black/60 space-y-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Individual Model Contributions Before Consensus Synthesis
                      </div>
                      <div className="space-y-2">
                        {data.individualResponses.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-[#0b0914] border border-slate-800 space-y-1"
                          >
                            <div className="text-cyan-300 font-bold text-[11px] flex items-center justify-between">
                              <span>{item.provider}</span>
                              <span className="text-[10px] text-slate-500">model response</span>
                            </div>
                            <pre className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                              {item.response}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (log.type === 'error') {
              return (
                <div key={log.id} className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start space-x-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="break-all">{log.content}</div>
                </div>
              );
            }

            if (log.type === 'tool_started' || log.type === 'tool_completed') {
              const isDone = log.type === 'tool_completed';
              const isCollapsed = collapsedTools[log.id];

              return (
                <div
                  key={log.id}
                  className="my-1.5 rounded-lg border border-cyan-500/20 bg-[#091122] overflow-hidden text-xs"
                >
                  {/* Tool Header */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolCollapse(log.id);
                    }}
                    className="flex items-center justify-between px-3 py-1.5 bg-[#0e1930] hover:bg-[#12203d] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="select-none">🛠️</span>
                      <span className="font-bold text-cyan-300">{log.toolName}</span>
                      {log.toolArgs && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
                          {log.toolName === 'execute_command' && log.toolArgs.command && (
                            <code className="text-emerald-300 font-bold">$ {log.toolArgs.command}</code>
                          )}
                          {log.toolName === 'write_file' && log.toolArgs.path && (
                            <code className="text-yellow-300">{log.toolArgs.path}</code>
                          )}
                          {log.toolName === 'read_file' && log.toolArgs.path && (
                            <code className="text-slate-300">{log.toolArgs.path}</code>
                          )}
                          {log.toolName === 'list_directory' && (
                            <code className="text-slate-300">{log.toolArgs.path || '.'}</code>
                          )}
                          {log.toolName === 'search_files' && (
                            <code className="text-slate-300">{log.toolArgs.pattern}</code>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px]">
                      {isDone ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Check className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-cyan-400 font-semibold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Executing...
                        </span>
                      )}
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                  </div>

                  {/* Tool Body (if not collapsed) */}
                  {!isCollapsed && (
                    <div className="p-2.5 bg-black/40 space-y-2 border-t border-slate-800">
                      {/* Arguments */}
                      {log.toolArgs && (
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Arguments</div>
                          <pre className="p-2 rounded bg-black/60 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.toolArgs, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Result */}
                      {log.toolResult !== undefined && (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                            <span>Output Result</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(log.toolResult || '', log.id);
                              }}
                              className="text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedIndex === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedIndex === log.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="p-2 rounded bg-black/70 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {log.toolResult || '(Empty output)'}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (log.type === 'assistant') {
              return (
                <div key={log.id} className="py-1 text-slate-200">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {log.content}
                  </div>
                </div>
              );
            }

            return null;
          })
        )}

        {/* Loading / Thinking indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-cyan-400 text-xs py-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold">ATX-1 Thinking & Executing ReAct Loop...</span>
          </div>
        )}

        <div ref={logsEndRef} />
      </div>

      {/* Suggested chips below terminal logs when active */}
      {logs.length > 0 && (
        <div className="px-4 py-1.5 bg-[#090f1d] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto select-none">
          <span className="text-[10px] text-slate-500 shrink-0 font-bold">Quick test:</span>
          {samplePrompts.slice(0, 3).map((s, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onSubmitPrompt(s.prompt);
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 px-2 py-0.5 rounded whitespace-nowrap transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Ink Terminal Input Bar */}
      <div className="p-3 bg-[#0d1424] border-t border-cyan-500/40">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="flex items-center text-cyan-400 font-bold text-sm select-none pl-1">
            <span>❯</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? 'ATX-1 is executing...' : 'Ask ALTREX to build something... (e.g., create hello.py and execute it)'}
            className="flex-1 bg-transparent border-none text-white text-xs font-mono focus:outline-none focus:ring-0 placeholder:text-slate-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-black text-xs font-bold font-mono transition-all flex items-center gap-1 shadow-sm"
          >
            <span>Send</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
