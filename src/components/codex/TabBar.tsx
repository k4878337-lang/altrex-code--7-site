import React from 'react';
import { FileCode, Split, Save, Check, Code2, Eye, Layout } from 'lucide-react';
import { EditorPreviewMode } from '../../types.js';

interface TabBarProps {
  activeFile: string | null;
  diffView: boolean;
  onToggleDiff: () => void;
  isSaving?: boolean;
  onSave?: () => void;
  previewMode?: EditorPreviewMode;
  onChangePreviewMode?: (mode: EditorPreviewMode) => void;
}

export function TabBar({
  activeFile,
  diffView,
  onToggleDiff,
  isSaving,
  onSave,
  previewMode = 'code',
  onChangePreviewMode,
}: TabBarProps) {
  const fileName = activeFile ? (activeFile.split('/').pop() || activeFile) : null;

  return (
    <div className="h-9 bg-black/85 backdrop-blur-md border-b border-cyan-500/30 flex items-center justify-between px-2 shrink-0 select-none overflow-x-auto gap-2">
      {/* Active File Tab */}
      <div className="flex items-center gap-1 shrink-0">
        {fileName ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/40 rounded-t-lg text-xs text-cyan-300 border-t-2 border-t-cyan-400 font-mono shadow-[0_-4px_12px_rgba(0,240,255,0.25)] border-x border-cyan-500/20 whitespace-nowrap">
            <FileCode size={13} className="text-cyan-400 shrink-0" />
            <span className="font-semibold">{fileName}</span>
            <span className="text-[10px] text-zinc-400 hidden lg:inline">({activeFile})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-zinc-500 font-mono whitespace-nowrap">
            <Code2 size={13} className="text-zinc-600 shrink-0" />
            <span>Workspace Editor</span>
          </div>
        )}
      </div>

      {/* Center/Right: [ CODE | SPLIT | PREVIEW ] & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Editor Toolbar Segmented Control */}
        {onChangePreviewMode && (
          <div className="flex items-center bg-black/70 border border-cyan-500/40 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => onChangePreviewMode('code')}
              title="View Code Editor only"
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all font-rajdhani font-semibold cursor-pointer ${
                previewMode === 'code'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 size={11} />
              <span>CODE</span>
            </button>

            <button
              onClick={() => onChangePreviewMode('split')}
              title="Split View: Editor left + Preview right"
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all font-rajdhani font-semibold cursor-pointer ${
                previewMode === 'split'
                  ? 'bg-magenta/30 text-[#ff8df7] border border-magenta/60 shadow-[0_0_8px_rgba(255,0,229,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Split size={11} />
              <span>SPLIT</span>
            </button>

            <button
              onClick={() => onChangePreviewMode('preview')}
              title="Full Preview Window"
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all font-rajdhani font-semibold cursor-pointer ${
                previewMode === 'preview'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye size={11} />
              <span>PREVIEW</span>
            </button>
          </div>
        )}

        {/* Save File Button */}
        {activeFile && onSave && (
          <button
            onClick={onSave}
            title="Save file (Ctrl+S)"
            className="neon-btn text-[11px] py-0.5 px-2 text-emerald-300 border-emerald-500/50 hover:bg-emerald-950/30 whitespace-nowrap cursor-pointer"
          >
            {isSaving ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
            <span className="hidden sm:inline">{isSaving ? 'SAVED' : 'SAVE'}</span>
          </button>
        )}

        {/* Side-by-side Diff View Toggle */}
        {activeFile && (
          <button
            onClick={onToggleDiff}
            title="Toggle Side-by-Side Diff View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
              diffView
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                : 'text-zinc-400 hover:text-cyan-200 hover:bg-cyan-950/30'
            }`}
          >
            <Layout size={12} />
            <span className="hidden sm:inline">Diff</span>
          </button>
        )}
      </div>
    </div>
  );
}
