'use client';

import React from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { AgentMode } from '../../lib/types.js';
import { Zap, Settings, GitBranch, Cpu, Terminal, RefreshCw } from 'lucide-react';

interface TopBarProps {
  onOpenOrchestrator?: () => void;
  onOpenArchitecture?: () => void;
  onToggleTerminal?: () => void;
  showTerminal?: boolean;
}

const modes: { id: AgentMode; label: string; icon: any; color: string }[] = [
  { id: 'speed', label: 'Speed', icon: Zap, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-sm' },
  { id: 'balanced', label: 'Balanced', icon: Cpu, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40 shadow-sm' },
  { id: 'deep', label: 'Deep', icon: Settings, color: 'text-purple-400 border-purple-500/40 bg-purple-950/40 shadow-sm' },
];

export function TopBar({
  onOpenOrchestrator,
  onOpenArchitecture,
  onToggleTerminal,
  showTerminal = false,
}: TopBarProps) {
  const { mode, setMode, onlineCount } = useAppStore();

  return (
    <header className="h-12 bg-[#090d17] border-b border-zinc-800/80 flex items-center justify-between px-4 shrink-0 font-mono text-xs select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
          <Zap size={15} className="text-white fill-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent tracking-wide">
              ALTREX CODE
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
              Phase 3
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 -mt-0.5">Codex Studio UI</div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-1 bg-[#050810] border border-zinc-800 rounded-lg p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all border ${
              mode === m.id
                ? m.color
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <m.icon size={13} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Right side utilities */}
      <div className="flex items-center gap-3">
        {onToggleTerminal && (
          <button
            onClick={onToggleTerminal}
            title="Toggle Ink Terminal overlay"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              showTerminal
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Terminal size={12} />
            <span className="hidden sm:inline">CLI Terminal</span>
          </button>
        )}

        <button
          onClick={onOpenOrchestrator}
          title="Inspect Multi-Model Registry & Health"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b101c] border border-zinc-800 hover:border-cyan-500/50 text-zinc-300 hover:text-cyan-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{onlineCount || 4} Models</span>
        </button>

        <div className="hidden lg:flex items-center gap-1 text-zinc-500">
          <GitBranch size={13} />
          <span>main</span>
        </div>

        {onOpenArchitecture && (
          <button
            onClick={onOpenArchitecture}
            title="View Phase Architecture"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
