'use client';

import React from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { X, FileCode, Split, Save, Check } from 'lucide-react';

export function TabBar() {
  const { activeFile, diffView, setDiffView, isSaving } = useAppStore();
  const fileName = activeFile?.split('/').pop() || 'untitled.ts';

  return (
    <div className="h-10 bg-[#0d121d] border-b border-zinc-800 flex items-center justify-between px-2 shrink-0">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141b2a] rounded-t-lg text-xs text-cyan-300 border-t-2 border-t-cyan-400 font-mono shadow-sm">
          <FileCode size={13} className="text-blue-400" />
          <span className="font-semibold">{fileName}</span>
          <span className="text-[10px] text-zinc-500 hidden md:inline">({activeFile || 'altrex-workspace'})</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDiffView(!diffView)}
          title="Toggle Side-by-Side Diff View"
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            diffView
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Split size={12} />
          <span className="hidden sm:inline">Diff View</span>
        </button>

        {isSaving && (
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <Check size={11} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
