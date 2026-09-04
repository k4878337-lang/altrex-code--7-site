import React, { useState } from 'react';
import { X, Layers, Cpu, Wrench, Terminal, CheckCircle2, ChevronRight, Code2 } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<'phase6' | 'phase5' | 'phase4' | 'phase3' | 'phase2' | 'overview' | 'monorepo' | 'providers' | 'tools' | 'react'>('phase6');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b101d] border border-cyan-500/40 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0e1628]">
          <div className="flex items-center space-x-3">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                ALTREX CODE <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30">Phase 6 Universal Platform</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">50+ Universal Languages, Universal Preview, 24/7 FREE Hosting & APK Builder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-[#080d19] px-6 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('phase6')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'phase6' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 6: Universal Platform
          </button>
          <button
            onClick={() => setActiveTab('phase5')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'phase5' ? 'border-emerald-400 text-emerald-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 5: Production Suite
          </button>
          <button
            onClick={() => setActiveTab('phase4')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'phase4' ? 'border-indigo-400 text-indigo-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 4: Codebase Intelligence
          </button>
          <button
            onClick={() => setActiveTab('phase3')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'phase3' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 3: Codex Web UI
          </button>
          <button
            onClick={() => setActiveTab('phase2')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'phase2' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 2: Multi-Model Orchestrator
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'overview' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('monorepo')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'monorepo' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Monorepo Structure
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'providers' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Providers (xKiro / Groq / Ollama / Gemini)
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'tools' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            The 5 Tools
          </button>
          <button
            onClick={() => setActiveTab('react')}
            className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'react' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ReAct Loop
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono leading-relaxed">
          {activeTab === 'phase6' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200">
                <div className="font-bold text-sm mb-1 text-cyan-300">Phase 6: Universal Language Engine, Preview v2, 24/7 Hosting & APK Builder</div>
                Phase 6 transforms ALTREX CODE into a universal development operating system. It features a 50+ programming language registry with execution mappings, a universal multi-runtime preview engine, 24/7 free edge hosting automation (Cloudflare, Vercel, Netlify, GitHub Pages, Surge), and a native Android APK build pipeline with mobile QR code installation.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-cyan-300 font-bold mb-1 flex items-center gap-2">
                    <span>🌍 Universal 50+ Language Engine</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">Registry</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• 50+ languages cataloged with Monaco IDs, file extensions, and starter templates.</p>
                    <p>• Category filters: Web & UI, Systems, Scripting, Mobile, Data/SQL, DevOps, Markup.</p>
                    <p>• Native compilation flags for GCC/Clang, Go, Rust, Java, Kotlin, Swift, and Zig.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-emerald-300 font-bold mb-1 flex items-center gap-2">
                    <span>👁️ Universal Preview Engine v2</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">Dual-Mode</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Seamless dual-mode: rich web canvas for HTML/JS/CSS, terminal runner for backend code.</p>
                    <p>• Captures real stdout, stderr, exit codes, and millisecond execution metrics.</p>
                    <p>• Interactive one-click rerun and clipboard output export.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-orange-300 font-bold mb-1 flex items-center gap-2">
                    <span>🚀 24/7 FREE Hosting Engine</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-950 text-orange-300 border border-orange-500/30">Edge Deploy</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• One-click deploy to Cloudflare Pages (unlimited bandwidth, 500 builds/mo).</p>
                    <p>• Multi-cloud targets: Vercel, Netlify, GitHub Pages, and Surge.sh.</p>
                    <p>• Automated build pipeline packaging with live status logs and active URLs.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-teal-300 font-bold mb-1 flex items-center gap-2">
                    <span>📱 Android APK Builder + QR</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-500/30">Capacitor</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Converts workspace web applications into native Android APK packages.</p>
                    <p>• Target Android API Level 34 with package manifest customization.</p>
                    <p>• Generates instant mobile QR Code for over-the-air camera installation.</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#050811] border border-cyan-500/20 rounded-lg space-y-2">
                <div className="text-cyan-300 font-bold text-[11px] uppercase tracking-wider">
                  Phase 6 API & Slash Commands
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#0b101d] p-2 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">Endpoints:</span>
                    <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                      <li><code>GET /api/languages</code></li>
                      <li><code>POST /api/preview/file</code> & <code>/code</code></li>
                      <li><code>POST /api/deploy</code></li>
                      <li><code>POST /api/build-apk</code></li>
                      <li><code>GET /api/download?path=...</code></li>
                    </ul>
                  </div>
                  <div className="bg-[#0b101d] p-2 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">Slash Commands:</span>
                    <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                      <li><code>/deploy</code> - Open 24/7 Hosting modal</li>
                      <li><code>/apk</code> - Open APK Builder & QR modal</li>
                      <li><code>/languages</code> - Browse 50+ languages</li>
                      <li><code>/preview</code> - Trigger universal preview</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phase5' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
                <div className="font-bold text-sm mb-1 text-emerald-300">Phase 5: Production-Grade Engineering Suite</div>
                In Phase 5, ALTREX CODE reaches full production maturity. It provides secure isolated execution environments (Docker/Process sandboxing), automated Git version control & AI PR generation, a live multi-model benchmarking engine, and an extensible plugin loader with dynamic provider registration.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-cyan-300 font-bold mb-1 flex items-center gap-2">
                    <span>🐳 Docker & Process Sandbox</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">Isolation</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Bounded CPU (1.0), memory (512MB), and process limits (64 pids).</p>
                    <p>• Network-isolated runtime (<code>--network=none</code>) for safe untrusted code execution.</p>
                    <p>• Transparent fallback to process isolation with memory caps and strict execution timeouts.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-indigo-300 font-bold mb-1 flex items-center gap-2">
                    <span>🔀 Git Operations & PR Generator</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">Automation</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Atomic staging, commit authoring, and branch management inside the workspace.</p>
                    <p>• Unified diff inspection highlighting additions and deletions.</p>
                    <p>• Automated GitHub Pull Request Markdown generation summarizing changes.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-purple-300 font-bold mb-1 flex items-center gap-2">
                    <span>⚡ Multi-Model Benchmark Suite</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">Evaluation</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Parallel A/B prompt execution across all active providers.</p>
                    <p>• Latency profiling (ms), throughput calculation (tokens/sec), and output inspection.</p>
                    <p>• Generates formatted ASCII comparison matrices and crowns the fastest & highest detail models.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-emerald-300 font-bold mb-1 flex items-center gap-2">
                    <span>🔌 Dynamic Plugin Architecture</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">Extensibility</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <p>• Automatic discovery of external providers in <code>.altrex/plugins</code> via <code>altrex-plugin.json</code>.</p>
                    <p>• Hot-loads plugin classes directly into the unified <code>ProviderRegistry</code> at runtime.</p>
                    <p>• Includes reference implementation for third-party providers (Anthropic, OpenRouter, Mistral, etc.).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phase4' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-indigo-200">
                <div className="font-bold text-sm mb-1 text-indigo-300">Phase 4: Codebase Intelligence Engine</div>
                In Phase 4, ALTREX CODE transitions into a true codebase-aware AI system. It indexes the entire project, creates smart AST-aware chunks (functions, classes, interfaces, methods), runs local vector embeddings, builds import dependency graphs, and dynamically selects the most relevant context within strict token budgets.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-indigo-300 font-bold mb-1">1. Smart Project Indexer</div>
                  <div className="text-slate-400 text-[11px]">
                    Recursive filesystem traversal respecting <code>.gitignore</code> and <code>.altrexignore</code>. Splits files into function/class-aware blocks with import extraction.
                  </div>
                </div>

                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-cyan-300 font-bold mb-1">2. Vector Store & Embeddings</div>
                  <div className="text-slate-400 text-[11px]">
                    Ollama (<code>nomic-embed-text</code>) + Jina AI cloud fallback + high-speed keyword token overlap search. Persisted to <code>.altrex/.altrex-index.json</code>.
                  </div>
                </div>

                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-purple-300 font-bold mb-1">3. Context Selector & Graph</div>
                  <div className="text-slate-400 text-[11px]">
                    Multi-stage selection: semantic similarity matching → import graph traversal → config file inclusion → 50K token budget trimming.
                  </div>
                </div>
              </div>

              {/* ASCII Architecture Flowchart */}
              <div className="p-4 rounded-lg bg-[#050811] border border-zinc-800 text-zinc-300 overflow-x-auto text-[11px]">
                <div className="text-indigo-400 font-bold mb-2">Context Intelligence Execution Pipeline</div>
                <pre>{`User Prompt: "Fix authentication middleware"
       │
       ▼
┌─────────────────────────────────┐
│ 1. Semantic & Vector Search     │ ──► Directly matches auth.ts, middleware.ts
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 2. Import Graph Traversal       │ ──► Follows relative imports: token-utils.ts, db.ts
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 3. Config & Meta Files          │ ──► Injects package.json & tsconfig.json
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 4. Token Budget Guard (50K)     │ ──► Mathematically trims context to fit model window
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 5. Agent V3 Prompt Injection    │ ──► LLM receives authoritative project context
└─────────────────────────────────┘`}</pre>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0b1224] border border-indigo-500/20 text-slate-300">
                <div className="text-indigo-300 font-bold mb-1">Live Reactive File Watcher & LSP</div>
                <div className="text-[11px] text-slate-400">
                  A debounced file watcher continuously monitors file modifications, rebuilds affected chunk embeddings in the background, and exposes LSP diagnostic and document symbol interfaces.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phase3' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-cyan-200">
                <div className="font-bold text-sm mb-1 text-cyan-300">Phase 3: Codex-Quality Professional Web UI</div>
                In Phase 3, ALTREX CODE evolves into a full-scale AI developer IDE. It provides a synchronized 3-panel architecture (Workspace File Explorer, Monaco Code Editor with Diff Viewer, and Server-Sent Events Streaming Chat Panel), anchored by a real-time Model Health & Cost Dashboard ($0.00 Free Tier stack).
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-cyan-300 font-bold mb-1">1. 3-Panel Synchronized Layout</div>
                  <div className="text-slate-400 text-[11px]">
                    Collapsible Workspace File Explorer on the left, Monaco Editor in center with side-by-side Diff Viewer and TabBar, and SSE Chat Panel on the right.
                  </div>
                </div>
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-blue-300 font-bold mb-1">2. Monaco Editor Integration</div>
                  <div className="text-slate-400 text-[11px]">
                    Powered by <code>@monaco-editor/react</code> with syntax highlighting, smooth cursor blinking, bracket pair colorization, minimap, and instant disk saving.
                  </div>
                </div>
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-purple-300 font-bold mb-1">3. Streaming SSE & Rich Cards</div>
                  <div className="text-slate-400 text-[11px]">
                    Chunk-level text streaming with blinking cursor (<code>▊</code>), expandable ToolCall cards with timestamp telemetry, and Ensemble consensus badges.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-2">
                <div className="text-slate-200 font-bold">Phase 3 Monorepo Package (`packages/web-ui`):</div>
                <pre className="text-zinc-400 text-[11px] overflow-x-auto p-2 bg-[#050810] rounded border border-zinc-800">
{`packages/web-ui/
├── src/
│   ├── app/ (layout.tsx, page.tsx, globals.css, api/chat, api/models, api/files)
│   ├── components/
│   │   ├── layout/ (TopBar, FileTree, CodeEditor, ChatPanel, ModelDashboard)
│   │   ├── chat/ (Message, ToolCallCard, ThinkingIndicator, EnsembleBadge)
│   │   └── editor/ (TabBar, DiffViewer)
│   ├── hooks/ (useChat, useModels, useFileTree)
│   ├── lib/ (types.ts)
│   └── stores/ (appStore.ts - Zustand)
├── package.json
└── next.config.js`}
                </pre>
              </div>
            </div>
          )}
          {activeTab === 'phase2' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-fuchsia-950/30 border border-fuchsia-500/40 text-fuchsia-200">
                <div className="font-bold text-sm mb-1 text-fuchsia-300">Phase 2: Multi-Model Power & Parallel Execution</div>
                In Phase 2, ALTREX CODE transforms from a single-model agent into a <strong>multi-brain orchestrator</strong>. It manages a unified provider registry, uses zero-latency keyword/intent heuristics to route tasks to specialized models, and runs parallel queries across models with Jaccard-based consensus scoring and synthesis.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-emerald-300 font-bold mb-1">1. ProviderRegistry</div>
                  <div className="text-slate-400 text-[11px]">
                    Maintains live provider health, probes latency via lightweight ping requests, tracks rate limits, and prioritizes active models.
                  </div>
                </div>
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-cyan-300 font-bold mb-1">2. SmartRouter</div>
                  <div className="text-slate-400 text-[11px]">
                    Maps 7 TaskTypes (code generation, code review, shell execution, planning, refactoring, documentation, general) to optimal models with fallback.
                  </div>
                </div>
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="text-fuchsia-300 font-bold mb-1">3. EnsembleEngine</div>
                  <div className="text-slate-400 text-[11px]">
                    Executes queries concurrently via <code>Promise.allSettled</code>, computes word-level Jaccard similarity agreement, and uses a judge model for synthesis.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-300 font-bold">Three Operational Modes:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-black/40 border border-emerald-500/30 rounded">
                    <span className="text-emerald-400 font-bold">⚡ SPEED MODE:</span>
                    <p className="text-slate-400 text-[10px] mt-0.5">Queries the lowest latency online model immediately. Lowest TTFT.</p>
                  </div>
                  <div className="p-2.5 bg-black/40 border border-cyan-500/30 rounded">
                    <span className="text-cyan-400 font-bold">🎯 BALANCED MODE:</span>
                    <p className="text-slate-400 text-[10px] mt-0.5">Routes prompt to the best specialized provider using SmartRouter heuristics.</p>
                  </div>
                  <div className="p-2.5 bg-black/40 border border-fuchsia-500/30 rounded">
                    <span className="text-fuchsia-400 font-bold">🧠 DEEP MODE:</span>
                    <p className="text-slate-400 text-[10px] mt-0.5">Runs across multiple models in parallel with consensus scoring and synthesis.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                <div className="font-bold text-sm mb-1 text-cyan-300">Phase 1 Complete Implementation:</div>
                ALTREX CODE operates as a fully autonomous software engineering agent. It parses user intent, reasons step-by-step, inspects the codebase using tools, writes files, executes commands natively in bash/python, and evaluates outputs before returning.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                    <Cpu className="w-4 h-4" /> Multi-Provider Core
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Integrated with <strong>xKiro</strong> (Qwen 3.8 Max), <strong>Groq</strong> (Llama 3.3 70B), <strong>Ollama</strong> (Local 8B), and <strong>Gemini</strong> with hot-swap support.
                  </div>
                </div>

                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <Wrench className="w-4 h-4" /> 5 Essential Tools
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Autonomous file I/O and execution sandbox: read_file, write_file, list_directory, search_files, execute_command.
                  </div>
                </div>

                <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold mb-1">
                    <Terminal className="w-4 h-4" /> Ink Terminal CLI
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    React-based terminal interface with live streaming tokens, tool invocation badges, and responsive hot-keys.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monorepo' && (
            <div className="space-y-3">
              <div className="text-slate-300 font-bold text-xs">Monorepo Package Layout (`pnpm` workspaces):</div>
              <pre className="p-3.5 bg-black/60 rounded-lg border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto leading-5">
{`altrex-code/
├── pnpm-workspace.yaml         # Packages: packages/*
├── tsconfig.base.json          # Shared strict ES2022 / NodeNext config
├── packages/
│   ├── shared/                 # @altrex/shared
│   │   └── src/types.ts        # Message, ToolCall, StreamChunk, ToolDefinition
│   ├── core/                   # @altrex/core
│   │   ├── src/providers/      # BaseProvider, OpenAICompatible, xKiro, Groq, Ollama
│   │   ├── src/tools/          # read_file, write_file, list_directory, search_files, execute_command
│   │   └── src/agent/agent.ts  # ReAct Autonomous Agent Loop (streaming generator)
│   └── cli/                    # @altrex/cli
│       ├── src/index.tsx       # Ink CLI entry point
│       └── src/components/App.tsx # Ink React Terminal Component with Ctrl+M`}
              </pre>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-3">
              <div className="text-slate-300 font-bold text-xs">Configured Providers in ALTREX CODE:</div>
              <div className="space-y-2">
                <div className="p-3 bg-[#0a1122] border border-cyan-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold">xKiro Gateway (Active)</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded">Configured & Tested</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    Endpoint: <code>https://api.xkiro.com/v1/chat/completions</code><br />
                    Model: <code>qwen/qwen3.8-max:free</code><br />
                    Key: <code>sk-xt-19b03eb11...</code> (Pre-configured)
                  </div>
                </div>

                <div className="p-3 bg-[#0a1122] border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300 font-bold">Groq Cloud</span>
                    <span className="text-[10px] text-slate-500">Fast Cloud Inference</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    Endpoint: <code>https://api.groq.com/openai/v1/chat/completions</code><br />
                    Model: <code>llama-3.3-70b-versatile</code>
                  </div>
                </div>

                <div className="p-3 bg-[#0a1122] border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 font-bold">Ollama</span>
                    <span className="text-[10px] text-slate-500">Local Daemon</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    Endpoint: <code>http://localhost:11434/v1/chat/completions</code><br />
                    Model: <code>llama3.1:8b</code> / <code>qwen2.5-coder:7b</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-2">
              <div className="text-slate-300 font-bold text-xs">The 5 Core Tools:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#080d1a] border border-slate-800 rounded">
                  <div className="text-cyan-400 font-bold">1. read_file(path)</div>
                  <div className="text-slate-400 text-[11px]">Reads file contents into memory for code analysis.</div>
                </div>
                <div className="p-2.5 bg-[#080d1a] border border-slate-800 rounded">
                  <div className="text-cyan-400 font-bold">2. write_file(path, content)</div>
                  <div className="text-slate-400 text-[11px]">Creates or updates file content, auto-creating directories.</div>
                </div>
                <div className="p-2.5 bg-[#080d1a] border border-slate-800 rounded">
                  <div className="text-cyan-400 font-bold">3. list_directory(path)</div>
                  <div className="text-slate-400 text-[11px]">Inspects workspace directory files and structure.</div>
                </div>
                <div className="p-2.5 bg-[#080d1a] border border-slate-800 rounded">
                  <div className="text-cyan-400 font-bold">4. search_files(pattern)</div>
                  <div className="text-slate-400 text-[11px]">Searches files matching globs (e.g. *.py, *.ts).</div>
                </div>
                <div className="p-2.5 bg-[#080d1a] border border-slate-800 rounded md:col-span-2">
                  <div className="text-cyan-400 font-bold">5. execute_command(command)</div>
                  <div className="text-slate-400 text-[11px]">Executes shell commands in bash with timeout, capturing stdout and stderr.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'react' && (
            <div className="space-y-3">
              <div className="text-slate-300 font-bold text-xs">ReAct Autonomous Loop Flow:</div>
              <div className="p-3 bg-black/50 border border-slate-800 rounded-lg space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-cyan-400">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 1: User Request</strong>
                  <span className="text-slate-400">("Create python script called hello.py that prints ALTREX IS ONLINE and execute it")</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400 ml-4">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 2: Thought & Tool Call 1</strong>
                  <span className="text-slate-400">LLM calls <code>write_file(path="hello.py", content="print('ALTREX IS ONLINE')")</code></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 ml-8">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 3: Tool Execution 1</strong>
                  <span className="text-slate-400">System writes file to <code>./altrex-workspace/hello.py</code></span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400 ml-4">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 4: Observation & Tool Call 2</strong>
                  <span className="text-slate-400">LLM calls <code>execute_command(command="python3 hello.py")</code></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 ml-8">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 5: Execution Result</strong>
                  <span className="text-slate-400">Stdout: <code>ALTREX IS ONLINE</code></span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300 ml-4">
                  <ChevronRight className="w-3.5 h-3.5" /> <strong>Step 6: Final Synthesis</strong>
                  <span className="text-slate-400">Agent explains verified execution and outputs confirmation.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#080d19] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
