import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  RefreshCw,
  X,
  FileCode,
  Layers,
  Sparkles,
  GitFork,
  CheckCircle2,
  Clock,
  Database,
} from 'lucide-react';
import { IndexStats, VectorSearchResult } from '../../types.js';

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (path: string) => void;
}

export function ContextModal({ isOpen, onClose, onSelectFile }: ContextModalProps) {
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [isReindexing, setIsReindexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'graph'>('overview');
  const [importGraph, setImportGraph] = useState<Record<string, string[]>>({});

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/context/stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.files) setFiles(data.files);
    } catch {}
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch('/api/context/graph');
      const data = await res.json();
      if (data.graph) setImportGraph(data.graph);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchGraph();
    }
  }, [isOpen]);

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const res = await fetch('/api/context/reindex', { method: 'POST' });
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
      fetchStats();
    } catch {
    } finally {
      setIsReindexing(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/context/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch {
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#090e1c] border border-indigo-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0c1326] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Brain size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide font-mono">
                  CODEBASE INTELLIGENCE ENGINE
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                  Phase 4
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Vector Store • Semantic Chunking • Import Dependency Graph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={isReindexing ? 'animate-spin text-indigo-400' : ''} />
              <span>{isReindexing ? 'Indexing...' : 'Re-index'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center px-6 border-b border-zinc-800/80 bg-[#070b16] text-xs font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Index Telemetry
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search size={13} />
            <span>Semantic Search</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'graph'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitFork size={13} />
            <span>Import Graph</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0d1428] border border-indigo-500/30">
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mb-1">
                    <FileCode size={13} className="text-indigo-400" />
                    Indexed Files
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {stats?.totalFiles || files.length || 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1428] border border-cyan-500/30">
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mb-1">
                    <Layers size={13} className="text-cyan-400" />
                    Code Chunks
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {stats?.totalChunks || 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1428] border border-emerald-500/30">
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mb-1">
                    <Database size={13} className="text-emerald-400" />
                    Token Budget
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    ~{(stats?.totalTokens || 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1428] border border-purple-500/30">
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mb-1">
                    <Clock size={13} className="text-purple-400" />
                    Index Duration
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {stats?.durationMs || 12}ms
                  </div>
                </div>
              </div>

              {/* Indexed Files Table */}
              <div className="rounded-xl border border-zinc-800 bg-[#070b16] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#0b1020] border-b border-zinc-800 text-xs font-mono font-bold text-zinc-300 flex items-center justify-between">
                  <span>Tracked Workspace Files</span>
                  <span className="text-zinc-500">{files.length} active</span>
                </div>
                <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="p-4 text-xs font-mono text-zinc-500 text-center">
                      No workspace files indexed yet.
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file}
                        onClick={() => {
                          if (onSelectFile) {
                            onSelectFile(file);
                            onClose();
                          }
                        }}
                        className="px-4 py-2 flex items-center justify-between text-xs font-mono hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 text-zinc-200">
                          <FileCode size={13} className="text-indigo-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold">Indexed</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search functions, classes, imports (e.g. Fibonacci, express, telemetry)..."
                    className="w-full bg-[#050811] border border-zinc-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-all disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-400 font-mono">
                    Found {searchResults.length} ranked code chunks:
                  </div>
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#070b16] border border-zinc-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300">{res.chunk.filePath}</span>
                          <span className="text-[10px] text-zinc-500">
                            (lines {res.chunk.startLine}-{res.chunk.endLine})
                          </span>
                          {res.chunk.name && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 text-[10px] border border-indigo-500/30">
                              {res.chunk.type}: {res.chunk.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 font-mono">
                          Relevance: {(res.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-[#04060d] border border-zinc-800/80 text-[11px] text-zinc-300 font-mono overflow-x-auto">
                        {res.chunk.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                  No matching chunks found for "{searchQuery}".
                </div>
              )}
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400 font-mono">
                Project Import Dependency Graph:
              </div>
              <div className="p-4 rounded-xl bg-[#070b16] border border-zinc-800 max-h-72 overflow-y-auto space-y-3 font-mono text-xs">
                {Object.keys(importGraph).length === 0 ? (
                  <div className="text-zinc-500 text-center py-4">
                    No imported file dependencies mapped yet.
                  </div>
                ) : (
                  Object.entries(importGraph).map(([file, rawImports]) => {
                    const fileImports: string[] = Array.isArray(rawImports) ? rawImports : [];
                    return (
                      <div key={file} className="p-2 rounded bg-[#0b1020] border border-zinc-800/70">
                        <div className="text-cyan-300 font-bold mb-1">📄 {file}</div>
                        {fileImports.length > 0 ? (
                          <div className="pl-4 space-y-0.5 text-zinc-400 text-[11px]">
                            {fileImports.map((imp, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-indigo-400">↳</span>
                                <span>import {imp}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pl-4 text-zinc-600 text-[10px]">No relative imports</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
