import React, { useState } from 'react';
import { AgentMode, AppTheme, EditorPreviewMode } from '../../types.js';
import {
  Zap,
  Settings,
  Cpu,
  Terminal,
  Layers,
  Layout,
  Brain,
  FolderGit2,
  Rocket,
  Smartphone,
  Globe,
  Palette,
  Check,
  ChevronDown,
  Eye,
  UploadCloud,
} from 'lucide-react';

interface TopBarProps {
  mode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
  onlineCount: number;
  activeView: 'codex' | 'terminal' | 'workspace';
  onChangeView: (view: 'codex' | 'terminal' | 'workspace') => void;
  theme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
  onOpenMemory: () => void;
  memoryStats: { totalFiles: number; totalMessages: number };
  onOpenOrchestrator: () => void;
  onOpenArchitecture: () => void;
  onOpenContext: () => void;
  onOpenBenchmark: () => void;
  onOpenGit: () => void;
  onOpenDeploy: () => void;
  onOpenCustomDeploy?: () => void;
  onOpenAPK: () => void;
  onOpenLanguages: () => void;
  onOpenSettings: () => void;
  previewMode?: EditorPreviewMode;
  onTogglePreview?: () => void;
}

const modes: { id: AgentMode; label: string; icon: any; color: string }[] = [
  { id: 'speed', label: 'Speed', icon: Zap, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-sm' },
  { id: 'balanced', label: 'Balanced', icon: Cpu, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40 shadow-sm' },
  { id: 'deep', label: 'Deep', icon: Settings, color: 'text-purple-400 border-purple-500/40 bg-purple-950/40 shadow-sm' },
];

const THEMES: { id: AppTheme; name: string; colors: string; icon: string; bg: string }[] = [
  { id: 'neon-cyber', name: 'Neon Cyber (HUD)', colors: 'from-[#00F0FF] to-[#FF00E5]', icon: '⚡', bg: '#000000' },
  { id: 'altrex-cyber', name: 'Cyber Blue', colors: 'from-[#00D9FF] to-[#0099FF]', icon: '🔷', bg: '#0A0E1A' },
  { id: 'altrex-midnight', name: 'Midnight OLED', colors: 'from-[#00F0FF] to-[#7000FF]', icon: '🌑', bg: '#000000' },
  { id: 'altrex-ocean', name: 'Ocean Deep', colors: 'from-[#06B6D4] to-[#3B82F6]', icon: '🌊', bg: '#050E1F' },
  { id: 'altrex-sunset', name: 'Sunset Plum', colors: 'from-[#F43F5E] to-[#FB923C]', icon: '🌅', bg: '#120914' },
  { id: 'altrex-matrix', name: 'Matrix Emerald', colors: 'from-[#10B981] to-[#22C55E]', icon: '🟩', bg: '#040D07' },
];

export function TopBar({
  mode,
  onSelectMode,
  onlineCount,
  activeView,
  onChangeView,
  theme,
  onChangeTheme,
  onOpenMemory,
  memoryStats,
  onOpenOrchestrator,
  onOpenArchitecture,
  onOpenContext,
  onOpenBenchmark,
  onOpenGit,
  onOpenDeploy,
  onOpenCustomDeploy,
  onOpenAPK,
  onOpenLanguages,
  onOpenSettings,
  previewMode = 'code',
  onTogglePreview,
}: TopBarProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const currentThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <header className="h-12 bg-black/80 backdrop-blur-xl border-b border-cyan-500/30 flex items-center justify-between px-3 shrink-0 font-mono text-xs select-none relative z-30 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
      {/* Left: Logo & Phase Badge */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f0ff] via-[#6366F1] to-[#ff00e5] flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.6)]">
          <Zap size={15} className="text-white fill-white" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-orbitron tracking-wider text-cyan-400 text-glow">
              ALTREX
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold">
              HUD
            </span>
          </div>
        </div>
      </div>

      {/* Center Left: Memory Badge & Theme Switcher */}
      <div className="flex items-center gap-2">
        {/* Memory System Indicator */}
        <button
          onClick={onOpenMemory}
          title="Click to view & manage persistent AI memory"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] group font-rajdhani font-semibold tracking-wide"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="hidden sm:inline">MEMORY</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            {memoryStats.totalFiles}f • {memoryStats.totalMessages}m
          </span>
        </button>

        {/* 6 Themes Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Switch Theme (5 cyber variants + Neon Cyber HUD)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer font-rajdhani font-semibold tracking-wide shadow-[0_0_8px_rgba(0,240,255,0.15)]"
          >
            <Palette size={12} className="text-cyan-400" />
            <span className="hidden md:inline">{currentThemeObj.name}</span>
            <ChevronDown size={11} className="text-zinc-400" />
          </button>

          {showThemeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowThemeMenu(false)}
              />
              <div className="absolute top-10 left-0 z-50 w-52 rounded-xl hud-panel border-cyan-500/60 shadow-2xl p-1.5 space-y-1 animate-scale-in">
                <div className="px-2 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-rajdhani">
                  Design Gallery (Default: Neon Cyber)
                </div>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onChangeTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left cursor-pointer ${
                      theme === t.id
                        ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'text-zinc-300 hover:bg-cyan-950/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${t.colors} border border-white/20 shadow-sm`}
                      />
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && <Check size={12} className="text-cyan-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mode Selector */}
        <div className="hidden lg:flex items-center gap-1 bg-black/60 border border-cyan-500/30 rounded-lg p-0.5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-rajdhani font-semibold tracking-wide transition-all border ${
                mode === m.id
                  ? m.color
                  : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <m.icon size={11} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TOP CENTER: Glowing Neon Bracketed Frame Logo */}
      <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-400 font-mono text-xs tracking-tighter opacity-80 select-none font-bold">╔═══[</span>
          <div className="neon-logo pointer-events-auto cursor-default">
            ALTREX
          </div>
          <span className="text-cyan-400 font-mono text-xs tracking-tighter opacity-80 select-none font-bold">]═══╗</span>
        </div>
      </div>

      {/* Right side: Studio vs CLI, Deploy, APK, 50+ Langs, Git, Orchestrator, Settings */}
      <div className="flex items-center gap-1.5">
        {/* Studio / CLI View Switcher */}
        <div className="flex items-center bg-black/60 border border-cyan-500/30 rounded-lg p-0.5">
          <button
            onClick={() => onChangeView('codex')}
            title="Codex 3-Panel Studio Layout"
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-rajdhani font-semibold tracking-wider transition-all ${
              activeView === 'codex'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.3)] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layout size={12} />
            <span className="hidden xl:inline">HUD STUDIO</span>
          </button>

          <button
            onClick={() => onChangeView('terminal')}
            title="Terminal Ink CLI View"
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-rajdhani font-semibold tracking-wider transition-all ${
              activeView === 'terminal'
                ? 'bg-magenta/20 text-[#ff8df7] border border-magenta shadow-[0_0_8px_rgba(255,0,229,0.3)] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal size={12} />
            <span className="hidden xl:inline">CLI</span>
          </button>
        </div>

        {/* Phase 7.2 PREVIEW Trigger Button (Neon Button) */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            title="Toggle Live Web Preview (In-Memory Blob Engine)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all cursor-pointer ${
              previewMode === 'split' || previewMode === 'preview'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                : 'bg-black/60 hover:bg-cyan-950/40 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            }`}
          >
            <Eye size={13} className="text-cyan-400" />
            <span>👁 PREVIEW</span>
            {previewMode !== 'code' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        )}

        {/* Phase 6 Deploy Button (Neon Button) */}
        <button
          onClick={onOpenDeploy}
          title="24/7 FREE Deploy Engine"
          className="neon-btn text-xs font-bold"
        >
          <Rocket size={12} className="text-cyan-400" />
          <span>DEPLOY</span>
        </button>

        {/* Phase 7.5 Custom ZIP Deploy Button */}
        <button
          onClick={onOpenCustomDeploy || onOpenDeploy}
          title="Custom ZIP Deploy: Upload any .zip, AI deep analysis & verified deploy"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-magenta/15 hover:bg-magenta/25 border border-magenta/50 text-[#ff8df7] font-rajdhani font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(255,0,229,0.25)] hover:shadow-[0_0_18px_rgba(255,0,229,0.4)]"
        >
          <UploadCloud size={13} className="text-[#ff00e5]" />
          <span>ZIP DEPLOY</span>
        </button>

        {/* Phase 6 APK Builder Button (Magenta Neon Button) */}
        <button
          onClick={onOpenAPK}
          title="Android APK Builder + QR Code Download"
          className="neon-btn magenta text-xs font-bold"
        >
          <Smartphone size={12} className="text-[#ff00e5]" />
          <span>APK</span>
        </button>

        {/* Phase 6 50+ Languages Button */}
        <button
          onClick={onOpenLanguages}
          title="Universal 50+ Languages Registry"
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-rajdhani font-semibold transition-colors cursor-pointer"
        >
          <Globe size={12} className="text-cyan-400" />
          <span>50+ LANGS</span>
        </button>

        {/* Git & PR Button */}
        <button
          onClick={onOpenGit}
          title="Git Engine & PR Generator"
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-rajdhani font-semibold transition-colors cursor-pointer"
        >
          <FolderGit2 size={12} className="text-cyan-400" />
          <span>GIT</span>
        </button>

        {/* Benchmark Button */}
        <button
          onClick={onOpenBenchmark}
          title="Multi-Model Benchmark"
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-purple-950/40 border border-purple-500/30 text-purple-300 font-rajdhani font-semibold transition-colors cursor-pointer"
        >
          <Zap size={12} className="text-purple-400" />
          <span>BENCH</span>
        </button>

        {/* Context Button */}
        <button
          onClick={onOpenContext}
          title="Codebase Intelligence & Vector Store"
          className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-rajdhani font-semibold transition-colors cursor-pointer"
        >
          <Brain size={12} className="text-indigo-400" />
          <span>CONTEXT</span>
        </button>

        {/* Orchestrator button */}
        <button
          onClick={onOpenOrchestrator}
          title="Multi-Model Health"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-rajdhani font-semibold transition-colors cursor-pointer"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
          <span className="hidden sm:inline">{onlineCount || 4} MODELS</span>
        </button>

        {/* Architecture Modal */}
        <button
          onClick={onOpenArchitecture}
          title="Inspect Monorepo & Phase Architecture"
          className="p-1.5 rounded-lg bg-black/50 hover:bg-cyan-950/40 border border-cyan-500/30 text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <Layers size={13} />
        </button>

        {/* Settings Modal */}
        <button
          onClick={onOpenSettings}
          title="Configure API Keys"
          className="p-1.5 rounded-lg bg-black/50 hover:bg-cyan-950/40 border border-cyan-500/30 text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <Settings size={13} />
        </button>
      </div>
    </header>
  );
}
