import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  FileCode,
  Plus,
  RefreshCw,
  Copy,
  Check,
  FolderGit2,
} from 'lucide-react';
import { GitStatus, GitDiff, PRDescription } from '../../types';

interface GitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitModal({ isOpen, onClose }: GitModalProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [diffs, setDiffs] = useState<GitDiff[]>([]);
  const [commitMessage, setCommitMessage] = useState('feat: update workspace components');
  const [branchName, setBranchName] = useState('');
  const [prSummary, setPrSummary] = useState('');
  const [prData, setPrData] = useState<{ pr: PRDescription; markdown: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'diff' | 'pr'>('status');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGitData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadGitData = async () => {
    setIsLoading(true);
    setActionNotice(null);
    try {
      const [statusRes, diffRes] = await Promise.all([
        fetch('/api/git/status'),
        fetch('/api/git/diff'),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setStatus(s);
      }
      if (diffRes.ok) {
        const d = await diffRes.json();
        setDiffs(d.diffs || []);
      }
    } catch (err) {
      console.warn('Failed to load git data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`✅ Committed: ${commitMessage}`);
        loadGitData();
      } else {
        setActionNotice(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setActionNotice(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: branchName }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`✅ Switched to branch: ${branchName}`);
        setBranchName('');
        loadGitData();
      } else {
        setActionNotice(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setActionNotice(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePR = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: prSummary }),
      });
      const data = await res.json();
      setPrData(data);
      setActiveTab('pr');
    } catch (err: any) {
      setActionNotice(`❌ Failed to generate PR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMarkdown = () => {
    if (!prData?.markdown) return;
    navigator.clipboard.writeText(prData.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-[84vh] bg-[#090e1a] border border-cyan-500/30 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0c1426]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FolderGit2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Git Engine & Pull Request Generator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                  Phase 5 Git Automation
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Branching, staged diffs, atomic commits, and AI-powered pull request generation.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#060a14] px-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Branch & Status
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            File Diffs ({diffs.length})
          </button>
          <button
            onClick={() => setActiveTab('pr')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'pr'
                ? 'border-indigo-400 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pull Request
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {actionNotice && (
            <div className="p-3 rounded-lg bg-[#0b1328] border border-cyan-500/40 text-cyan-200">
              {actionNotice}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Branch indicator */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#060b17] border border-slate-800">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <GitBranch size={16} />
                  <span>Current Branch:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/30">
                    {status?.branch || 'main'}
                  </span>
                </div>
                <button
                  onClick={loadGitData}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Branch Creation */}
              <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Plus size={14} className="text-cyan-400" />
                  <span>Create / Switch Branch</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. feat/auth-middleware"
                    className="flex-1 p-2 rounded bg-[#03060d] border border-slate-800 focus:border-cyan-500 text-slate-100 outline-none text-xs"
                  />
                  <button
                    onClick={handleCreateBranch}
                    disabled={isLoading || !branchName.trim()}
                    className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    Switch Branch
                  </button>
                </div>
              </div>

              {/* Commit box */}
              <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <GitCommit size={14} className="text-cyan-400" />
                  <span>Commit Workspace Changes</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="flex-1 p-2 rounded bg-[#03060d] border border-slate-800 focus:border-cyan-500 text-slate-100 outline-none text-xs"
                  />
                  <button
                    onClick={handleCommit}
                    disabled={isLoading || !commitMessage.trim()}
                    className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    Stage & Commit
                  </button>
                </div>
              </div>

              {/* Changes lists */}
              <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 space-y-3">
                <div className="font-bold text-slate-300">File State Overview</div>
                {status?.isClean ? (
                  <div className="text-green-400 flex items-center gap-2 p-2 rounded bg-green-950/20 border border-green-800/40">
                    <CheckCircle size={14} />
                    <span>Working tree clean — No uncommitted changes.</span>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    {status?.modified && status.modified.length > 0 && (
                      <div>
                        <div className="text-amber-300 font-bold mb-1">Modified:</div>
                        {status.modified.map((f, i) => (
                          <div key={i} className="pl-3 text-slate-300">
                            📝 {f}
                          </div>
                        ))}
                      </div>
                    )}
                    {status?.added && status.added.length > 0 && (
                      <div>
                        <div className="text-green-300 font-bold mb-1">Added:</div>
                        {status.added.map((f, i) => (
                          <div key={i} className="pl-3 text-slate-300">
                            ➕ {f}
                          </div>
                        ))}
                      </div>
                    )}
                    {status?.untracked && status.untracked.length > 0 && (
                      <div>
                        <div className="text-cyan-300 font-bold mb-1">Untracked:</div>
                        {status.untracked.map((f, i) => (
                          <div key={i} className="pl-3 text-slate-300">
                            ❓ {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-3">
              {diffs.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 text-slate-400">
                  No diffs found in working tree.
                </div>
              ) : (
                diffs.map((d, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-[#060a14] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/70 pb-1.5">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <FileCode size={13} />
                        <span>{d.file}</span>
                      </div>
                      <div className="text-[11px]">
                        <span className="text-green-400 font-bold">+{d.additions}</span>{' '}
                        <span className="text-red-400 font-bold">-{d.deletions}</span>
                      </div>
                    </div>
                    {d.patch && (
                      <pre className="p-2.5 rounded bg-[#03050a] text-slate-300 overflow-x-auto text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                        {d.patch}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'pr' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <GitPullRequest size={14} className="text-indigo-400" />
                  <span>Generate AI Pull Request Description</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prSummary}
                    onChange={(e) => setPrSummary(e.target.value)}
                    placeholder="Optional PR focus/summary hint..."
                    className="flex-1 p-2 rounded bg-[#03060d] border border-slate-800 focus:border-indigo-500 text-slate-100 outline-none text-xs"
                  />
                  <button
                    onClick={handleGeneratePR}
                    disabled={isLoading}
                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    Generate PR
                  </button>
                </div>
              </div>

              {prData && (
                <div className="p-4 rounded-lg bg-[#060b17] border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="font-bold text-white text-sm">{prData.pr.title}</div>
                    <button
                      onClick={copyMarkdown}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#0b1328] hover:bg-[#121f3d] text-cyan-300 text-[11px]"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                    </button>
                  </div>

                  <div className="text-slate-300 text-xs">{prData.pr.summary}</div>

                  <div className="space-y-1">
                    <div className="text-indigo-300 font-bold text-[11px]">Changes:</div>
                    {prData.pr.changes.map((c, i) => (
                      <div key={i} className="pl-3 text-slate-300 text-[11px]">
                        • {c}
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    Files modified: {prData.pr.filesModified.length} • Lines added:{' '}
                    <span className="text-green-400">+{prData.pr.additions}</span> • Lines deleted:{' '}
                    <span className="text-red-400">-{prData.pr.deletions}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#080d19] text-slate-500 text-[11px]">
          <span>⚡ ALTREX CODE Git Automation Engine</span>
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
