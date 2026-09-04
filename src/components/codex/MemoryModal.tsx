import React, { useState, useRef } from 'react';
import { memory } from '../../lib/memory.js';
import {
  Brain,
  X,
  Download,
  Upload,
  Trash2,
  Plus,
  FileCode,
  CheckCircle2,
  Database,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryUpdated: () => void;
  onOpenFile?: (path: string) => void;
}

export function MemoryModal({
  isOpen,
  onClose,
  onMemoryUpdated,
  onOpenFile,
}: MemoryModalProps) {
  const [newFact, setNewFact] = useState('');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const stats = memory.getStats();
  const facts = memory.getFacts();
  const savedFiles = memory.getSavedFiles();

  const handleAddFact = () => {
    if (!newFact.trim()) return;
    memory.rememberFact(newFact.trim());
    setNewFact('');
    onMemoryUpdated();
  };

  const handleRemoveFact = (index: number) => {
    memory.removeFact(index);
    onMemoryUpdated();
  };

  const handleExport = () => {
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
    showNotice('💾 Memory exported successfully!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = memory.importMemory(content);
        if (result.success) {
          showNotice('✅ Memory restored from backup!');
          onMemoryUpdated();
        } else {
          showNotice(`❌ ${result.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all persistent memory and start completely fresh?')) {
      memory.clearAllMemory();
      showNotice('🧹 All memory cleared');
      onMemoryUpdated();
    }
  };

  const showNotice = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,217,255,0.15)] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,217,255,0.4)]">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide font-mono">
                  ALTREX PERSISTENT MEMORY
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PERSISTENT & ACTIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Full session state, created files, chat history, and AI Brain context persist across page reloads.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Notice toast */}
        {copiedNotification && (
          <div className="px-6 py-2 bg-cyan-950/80 border-b border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-slide-in">
            <CheckCircle2 size={13} />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>Saved Files</span>
                <FileCode size={13} className="text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.totalFiles}</div>
              <div className="text-[10px] text-zinc-500">Auto-restored on boot</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>Messages</span>
                <Database size={13} className="text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.totalMessages}</div>
              <div className="text-[10px] text-zinc-500">Persisted turns</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>AI Brain Facts</span>
                <Sparkles size={13} className="text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.factsCount}</div>
              <div className="text-[10px] text-zinc-500">Via /remember</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>Last Synced</span>
                <Clock size={13} className="text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">
                {new Date(stats.lastActivity).toLocaleTimeString()}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">Debounced local RAM</div>
            </div>
          </div>

          {/* Section: AI Brain Facts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                  AI Brain Stored Facts ({facts.length})
                </h4>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Injected into LLM context on every query
              </span>
            </div>

            {/* Add Fact Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFact()}
                placeholder="E.g., I prefer Tailwind CSS v4 and modern TypeScript functional components..."
                className="flex-1 bg-[#0A0E1A] border border-[#2A3142] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              />
              <button
                onClick={handleAddFact}
                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <Plus size={13} />
                <span>Add Fact</span>
              </button>
            </div>

            {/* Facts List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {facts.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500 bg-white/[0.02] border border-dashed border-white/10 rounded-lg">
                  No custom facts saved yet. Add a fact above or type <code className="text-cyan-400 font-mono">/remember &lt;fact&gt;</code> in chat.
                </div>
              ) : (
                facts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs text-zinc-300 font-mono group hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="truncate">{fact}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFact(idx)}
                      title="Remove Fact"
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors shrink-0 cursor-pointer opacity-70 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Files Remembered in Workspace */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-cyan-400" />
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                  Persistent Project Files ({savedFiles.length})
                </h4>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Preserved across page refreshes
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {savedFiles.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500 bg-white/[0.02] border border-dashed border-white/10 rounded-lg">
                  Workspace is currently clean. Ask ALTREX to generate files and they will automatically be recorded here!
                </div>
              ) : (
                savedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono group hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-zinc-200 truncate">
                      <FileCode size={13} className="text-blue-400 shrink-0" />
                      <span className="font-semibold text-cyan-300">{file.path}</span>
                      <span className="text-zinc-500 text-[10px]">({file.size} bytes)</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-500">
                        {new Date(file.updatedAt).toLocaleTimeString()}
                      </span>
                      {onOpenFile && (
                        <button
                          onClick={() => {
                            onOpenFile(file.path);
                            onClose();
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-[10px] text-cyan-300 transition-colors cursor-pointer"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer: Export, Import, Reset */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/15 text-xs text-zinc-200 font-mono transition-all cursor-pointer"
            >
              <Download size={13} className="text-cyan-400" />
              <span>Export Memory</span>
            </button>

            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/15 text-xs text-zinc-200 font-mono transition-all cursor-pointer"
            >
              <Upload size={13} className="text-indigo-400" />
              <span>Import Memory</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/70 border border-red-500/30 text-xs text-red-300 font-mono transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear Memory</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-mono transition-all cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
