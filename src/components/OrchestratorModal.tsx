import React, { useState, useEffect } from 'react';
import { ProviderStatus, AgentMode } from '../types';
import {
  X,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gauge,
  Layers,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface OrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
}

export function OrchestratorModal({
  isOpen,
  onClose,
  mode,
  onSelectMode,
}: OrchestratorModalProps) {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [lastProbedTime, setLastProbedTime] = useState<string>('');

  const fetchStatus = () => {
    fetch('/api/orchestrator/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.statuses) setStatuses(d.statuses);
      })
      .catch(() => {});
  };

  const handleProbeAll = async () => {
    setIsProbing(true);
    try {
      const res = await fetch('/api/orchestrator/probe', { method: 'POST' });
      const data = await res.json();
      if (data.statuses) {
        setStatuses(data.statuses);
        setLastProbedTime(new Date().toLocaleTimeString());
      }
    } catch {
      // ignore
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onlineCount = statuses.filter((s) => s.online).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#090e1a] border-2 border-cyan-500/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1628] border-b border-cyan-500/30">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Zap className="w-5 h-5 fill-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Phase 2: Multi-Model Orchestrator
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  ATX-1 Core
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Provider Registry, Smart Task Router & Parallel Consensus Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mode Selector */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Orchestration Mode</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'speed',
                  name: 'Speed Mode',
                  badge: 'FASTEST',
                  badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
                  desc: 'Queries the lowest latency online model immediately. Lowest TTFT.',
                  accent: 'border-emerald-500/50 hover:border-emerald-400',
                  activeBg: 'bg-emerald-950/30 ring-1 ring-emerald-400',
                },
                {
                  id: 'balanced',
                  name: 'Balanced Mode',
                  badge: 'SMART ROUTE',
                  badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
                  desc: 'Classifies task into 7 types and routes to optimal free model.',
                  accent: 'border-cyan-500/50 hover:border-cyan-400',
                  activeBg: 'bg-cyan-950/30 ring-1 ring-cyan-400',
                },
                {
                  id: 'deep',
                  name: 'Deep Mode',
                  badge: 'ENSEMBLE CONSENSUS',
                  badgeColor: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500/40',
                  desc: 'Executes across multiple models in parallel with Jaccard consensus synthesis.',
                  accent: 'border-fuchsia-500/50 hover:border-fuchsia-400',
                  activeBg: 'bg-fuchsia-950/30 ring-1 ring-fuchsia-400',
                },
              ].map((m) => {
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMode(m.id as AgentMode)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${m.activeBg} border-transparent shadow-[0_0_20px_rgba(6,182,212,0.15)]`
                        : `bg-[#0b1220] ${m.accent}`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-xs">{m.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Provider Registry Status */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Provider Registry ({onlineCount}/{statuses.length} Online)</span>
              </div>
              <button
                onClick={handleProbeAll}
                disabled={isProbing}
                className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
                <span>{isProbing ? 'Probing Latency...' : 'Probe Providers'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {statuses.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-center text-slate-500">
                  Loading provider registry statuses...
                </div>
              ) : (
                statuses.map((s) => (
                  <div
                    key={s.name}
                    className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {s.online ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500" />
                        )}
                        {s.online && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          {s.name}
                          {s.online && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              ONLINE
                            </span>
                          )}
                          {!s.online && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                              STANDBY / OFFLINE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {s.name.includes('xKiro') && 'Primary: Qwen 3.8 Max Free via API Gateway'}
                          {s.name.includes('Groq') && 'Ultra-low latency Llama 3.3 70B inference'}
                          {s.name.includes('Ollama') && 'Local offline inference at http://localhost:11434/v1'}
                          {s.name.includes('Gemini') && 'Multimodal planning & synthesis judge'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold font-mono text-cyan-300 text-xs">
                        {s.latencyMs > 0 ? `${s.latencyMs} ms` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {s.lastChecked ? `checked ${new Date(s.lastChecked).toLocaleTimeString()}` : 'unprobed'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {lastProbedTime && (
              <div className="text-[10px] text-slate-500 text-right mt-1.5">
                Last verified: {lastProbedTime}
              </div>
            )}
          </div>

          {/* Smart Task Routing Table */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart Task Routing Matrix</span>
            </div>
            <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-[11px] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-cyan-300 font-semibold">Code Generation:</span>{' '}
                  <span className="text-slate-400">xKiro (Qwen 3.8 Max), Groq</span>
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Code Review:</span>{' '}
                  <span className="text-slate-400">Gemini 3.8 Flash, Groq</span>
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Planning / Architect:</span>{' '}
                  <span className="text-slate-400">Gemini 3.8 Flash, xKiro</span>
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Refactoring:</span>{' '}
                  <span className="text-slate-400">xKiro, Groq Llama 3.3</span>
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Documentation:</span>{' '}
                  <span className="text-slate-400">Gemini 3.8 Flash, Groq</span>
                </div>
                <div>
                  <span className="text-cyan-300 font-semibold">Shell Execution:</span>{' '}
                  <span className="text-slate-400">xKiro, Groq, Ollama</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#0e1628] border-t border-cyan-500/30">
          <span className="text-slate-500 text-[11px]">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300">Ctrl+M</kbd> to cycle modes in terminal
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
