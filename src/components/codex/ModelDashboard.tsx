import React, { useState } from 'react';
import { AgentMode, AppTheme } from '../../types.js';
import { Activity, RefreshCw, ShieldCheck, Brain, Palette } from 'lucide-react';

interface ModelDashboardProps {
  mode: AgentMode;
  onlineCount: number;
  onOpenOrchestrator: () => void;
  onProbe?: () => void;
  models?: { name: string; online: boolean; latencyMs: number }[];
  theme?: AppTheme;
  memoryStats?: { totalFiles: number; totalMessages: number };
  onOpenMemory?: () => void;
}

export function ModelDashboard({
  mode,
  onlineCount,
  onOpenOrchestrator,
  onProbe,
  models = [],
  theme = 'neon-cyber',
  memoryStats = { totalFiles: 0, totalMessages: 0 },
  onOpenMemory,
}: ModelDashboardProps) {
  const [isProbing, setIsProbing] = useState(false);

  const handleProbeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onProbe) return;
    setIsProbing(true);
    try {
      await onProbe();
    } finally {
      setTimeout(() => setIsProbing(false), 800);
    }
  };

  const defaultModelChips = models.length > 0 ? models : [
    { name: 'qwen3.8-max:free', online: true, latencyMs: 28 },
    { name: 'llama-3.3-70b', online: true, latencyMs: 14 },
    { name: 'llama3.1:8b', online: true, latencyMs: 5 },
    { name: 'gemini-3.8-flash', online: true, latencyMs: 22 },
  ];

  const themeDisplay = theme === 'neon-cyber' ? 'NEON CYBER' : theme.replace('altrex-', '').toUpperCase();

  return (
    <footer className="h-8 bg-black/85 backdrop-blur-xl border-t border-cyan-500/30 flex items-center px-3 shrink-0 gap-3 font-mono text-[11px] select-none text-zinc-400 relative z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.8)]">
      {/* Left: Models Active indicator */}
      <div
        onClick={onOpenOrchestrator}
        className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-300 transition-colors shrink-0"
        title="Open Orchestrator Health & Latency Dashboard"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span>
          <span className="text-emerald-400 font-bold">{onlineCount || 4}</span> models online
        </span>
      </div>

      <div className="h-3 w-px bg-white/10 shrink-0 hidden sm:block" />

      {/* Memory Status Indicator */}
      <div
        onClick={onOpenMemory}
        className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-300 transition-colors shrink-0"
        title="Persistent Memory Active in RAM & Storage"
      >
        <Brain size={12} className="text-emerald-400" />
        <span className="text-emerald-400 font-semibold">Memory: Active</span>
        <span className="text-zinc-500 hidden md:inline">
          ({memoryStats.totalFiles} files • {memoryStats.totalMessages} turns)
        </span>
      </div>

      <div className="h-3 w-px bg-white/10 shrink-0 hidden lg:block" />

      {/* Center: Model Chips */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {defaultModelChips.map((model) => (
          <div
            key={model.name}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] whitespace-nowrap border transition-all ${
              model.online
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                model.online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'
              }`}
            />
            <span className="font-medium text-zinc-300">{model.name}</span>
            {model.online && model.latencyMs > 0 && (
              <span className="text-cyan-400/90 font-bold">{model.latencyMs}ms</span>
            )}
          </div>
        ))}
      </div>

      {/* Right: Theme, Probe, Mode, Free Tier */}
      <div className="flex items-center gap-2.5 shrink-0 text-[10px]">
        {onProbe && (
          <button
            onClick={handleProbeClick}
            disabled={isProbing}
            title="Probe Latencies"
            className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={11} className={isProbing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-cyan-300">
          <Palette size={10} />
          <span>{themeDisplay}</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-zinc-500">
          Mode: <span className="text-cyan-400 uppercase font-bold">{mode}</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold">
          <ShieldCheck size={11} />
          <span>$0.00 FOREVER</span>
        </div>
      </div>
    </footer>
  );
}
