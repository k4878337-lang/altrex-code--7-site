'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { Activity, RefreshCw, Cpu, Zap, ShieldCheck } from 'lucide-react';

interface ModelDashboardProps {
  onOpenOrchestrator?: () => void;
}

export function ModelDashboard({ onOpenOrchestrator }: ModelDashboardProps) {
  const { models, setModels, onlineCount, mode } = useAppStore();
  const [isProbing, setIsProbing] = useState(false);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models) {
        setModels(data.models);
      }
    } catch {
      // ignore
    }
  };

  const handleProbe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProbing(true);
    try {
      const res = await fetch('/api/orchestrator/probe', { method: 'POST' });
      const data = await res.json();
      if (data.statuses) {
        setModels(data.statuses);
      }
    } catch {
      // ignore
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-10 bg-[#080d19] border-t border-zinc-800/80 flex items-center px-4 shrink-0 gap-4 font-mono text-xs select-none">
      {/* Left: Status indicator */}
      <div
        onClick={onOpenOrchestrator}
        className="flex items-center gap-2 text-zinc-400 cursor-pointer hover:text-cyan-300 transition-colors shrink-0"
      >
        <Activity size={13} className="text-emerald-400" />
        <span className="text-[11px]">
          <span className="text-emerald-400 font-bold">{onlineCount || models.filter((m) => m.online).length}</span> models active
        </span>
      </div>

      {/* Center: Model chips */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {models.map((model) => (
          <div
            key={model.name}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] whitespace-nowrap border transition-all ${
              model.online
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                model.online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="font-semibold text-zinc-200">{model.name}</span>
            {model.online && model.latencyMs > 0 && (
              <span className="text-cyan-400/80 font-bold">({model.latencyMs}ms)</span>
            )}
          </div>
        ))}
        {models.length === 0 && (
          <span className="text-[10px] text-zinc-600">Connecting to model registry...</span>
        )}
      </div>

      {/* Right: Mode & Cost */}
      <div className="flex items-center gap-3 shrink-0 text-[11px]">
        <button
          onClick={handleProbe}
          disabled={isProbing}
          title="Probe latency"
          className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={isProbing ? 'animate-spin' : ''} />
        </button>

        <span className="text-zinc-500 hidden sm:inline">
          Mode: <span className="text-cyan-400 uppercase font-bold">{mode}</span>
        </span>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
          <ShieldCheck size={11} />
          <span className="font-bold">Cost: $0.00</span>
        </div>
      </div>
    </footer>
  );
}
