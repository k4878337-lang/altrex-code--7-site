import React, { useState } from 'react';
import { X, Play, Zap, Brain, CheckCircle, AlertTriangle, Copy, Check, Clock, Gauge } from 'lucide-react';
import { BenchmarkReport, BenchmarkResult } from '../../types';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PROMPTS = [
  {
    label: 'Reverse Linked List',
    prompt: 'Write a function to reverse a linked list in Python with type hints and doctests.',
  },
  {
    label: 'LRU Cache (TS)',
    prompt: 'Implement an LRU Cache in TypeScript with O(1) get and put, explaining the doubly linked list and Map approach.',
  },
  {
    label: 'REST API Rate Limiter',
    prompt: 'Create an Express middleware for token-bucket rate limiting with error handling.',
  },
];

export function BenchmarkModal({ isOpen, onClose }: BenchmarkModalProps) {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].prompt);
  const [maxProviders, setMaxProviders] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [formattedTable, setFormattedTable] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<BenchmarkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxProviders, timeout: 30000 }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setReport(data.report);
      setFormattedTable(data.formattedTable || '');
      if (data.report?.results?.length > 0) {
        setSelectedResult(data.report.results[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Benchmark execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const copyTable = () => {
    if (!formattedTable) return;
    navigator.clipboard.writeText(formattedTable);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[88vh] bg-[#090e1a] border border-cyan-500/30 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0c1426]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Model Benchmark Suite
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  Phase 5 Live A/B Testing
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Compare latency, tokens/sec, and code output across registered AI providers simultaneously.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {/* Preset Prompts & Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold">Benchmark Prompt</label>
              <div className="flex gap-2">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(p.prompt)}
                    className="px-2 py-1 rounded bg-[#0b1326] hover:bg-[#121f3d] border border-cyan-500/20 text-cyan-300 text-[11px] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#050811] border border-slate-800 focus:border-cyan-500 text-slate-100 placeholder-slate-600 outline-none resize-none font-mono text-xs leading-relaxed"
              placeholder="Enter benchmark prompt..."
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4 text-slate-400">
                <label className="flex items-center gap-2">
                  <span>Max Models:</span>
                  <select
                    value={maxProviders}
                    onChange={(e) => setMaxProviders(parseInt(e.target.value))}
                    className="bg-[#0b1326] border border-slate-700 text-slate-200 rounded px-2 py-1"
                  >
                    <option value={2}>2 Models</option>
                    <option value={4}>4 Models</option>
                    <option value={6}>6 Models</option>
                    <option value={10}>All Registered Models</option>
                  </select>
                </label>
              </div>

              <button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing Parallel Benchmark...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-white" />
                    <span>Run A/B Benchmark</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-200 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Results section */}
          {report && (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.bestLatency && (
                  <div className="p-3.5 rounded-lg bg-[#081524] border border-cyan-500/40 flex items-start justify-between">
                    <div>
                      <div className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs mb-1">
                        <Zap size={14} />
                        <span>🏆 FASTEST MODEL</span>
                      </div>
                      <div className="text-sm font-bold text-white">{report.bestLatency.provider}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Latency: <span className="text-cyan-300 font-bold">{report.bestLatency.latencyMs}ms</span> •{' '}
                        Speed: <span className="text-cyan-300 font-bold">{report.bestLatency.tokensPerSecond} tok/s</span>
                      </div>
                    </div>
                  </div>
                )}

                {report.bestQuality && (
                  <div className="p-3.5 rounded-lg bg-[#140e26] border border-indigo-500/40 flex items-start justify-between">
                    <div>
                      <div className="text-indigo-400 font-bold flex items-center gap-1.5 text-xs mb-1">
                        <Brain size={14} />
                        <span>🧠 MOST DETAILED</span>
                      </div>
                      <div className="text-sm font-bold text-white">{report.bestQuality.provider}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Length: <span className="text-indigo-300 font-bold">~{report.bestQuality.tokenCount} tokens</span> •{' '}
                        Model: <span className="text-slate-300">{report.bestQuality.model}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Models Comparison Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#060a14]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1122] border-b border-slate-800">
                  <span className="font-bold text-slate-200">Comparison Matrix</span>
                  <button
                    onClick={copyTable}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0f1a33] hover:bg-[#152447] text-cyan-300 text-[11px] transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy ASCII Table'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#070c18] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Provider / Model</th>
                        <th className="p-2.5">Latency</th>
                        <th className="p-2.5">Est. Tokens</th>
                        <th className="p-2.5">Throughput</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {report.results.map((res, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedResult(res)}
                          className={`hover:bg-[#0c152a] cursor-pointer transition-colors ${
                            selectedResult?.provider === res.provider ? 'bg-[#0f1a36]' : ''
                          }`}
                        >
                          <td className="p-2.5 font-bold text-slate-100 flex items-center gap-2">
                            <span>{res.provider}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({res.model})</span>
                          </td>
                          <td className="p-2.5 text-cyan-300">{res.latencyMs}ms</td>
                          <td className="p-2.5 text-slate-300">~{res.tokenCount}</td>
                          <td className="p-2.5 text-indigo-300">{res.tokensPerSecond} tok/s</td>
                          <td className="p-2.5">
                            {res.success ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-950 text-green-300 border border-green-800 text-[10px]">
                                <CheckCircle size={10} /> Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px]">
                                ❌ Error
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="text-cyan-400 underline hover:text-cyan-300 text-[11px]">
                              Inspect Output
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspect selected output */}
              {selectedResult && (
                <div className="p-4 rounded-lg bg-[#050811] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="font-bold text-cyan-300 flex items-center gap-2">
                      <span>📄 Response: {selectedResult.provider}</span>
                      <span className="text-slate-500 text-[11px]">({selectedResult.model})</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {selectedResult.latencyMs}ms • ~{selectedResult.tokenCount} tokens
                    </div>
                  </div>
                  <pre className="p-3 rounded bg-[#03050a] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto text-[11px] leading-relaxed">
                    {selectedResult.response || selectedResult.error || '(No output returned)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#080d19] text-slate-500 text-[11px]">
          <span>⚡ ALTREX CODE Benchmark Suite • Multi-Provider Parallel Evaluation</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
