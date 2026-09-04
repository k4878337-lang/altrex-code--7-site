import React, { useState, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { TabBar } from './TabBar.js';
import { DiffViewer } from './DiffViewer.js';
import { Sparkles, Terminal, Code2, Globe, Cpu, Smartphone, Zap } from 'lucide-react';
import { AppTheme, EditorPreviewMode } from '../../types.js';

interface CodeEditorProps {
  activeFile: string | null;
  fileContent: string;
  onChangeContent: (content: string) => void;
  onSaveFile?: () => void;
  isSaving?: boolean;
  isStreaming?: boolean;
  activeActivity?: string | null;
  onPromptClick?: (prompt: string) => void;
  theme?: AppTheme;
  previewMode?: EditorPreviewMode;
  onChangePreviewMode?: (mode: EditorPreviewMode) => void;
}

export function CodeEditor({
  activeFile,
  fileContent,
  onChangeContent,
  onSaveFile,
  isSaving = false,
  isStreaming = false,
  activeActivity = null,
  onPromptClick,
  theme = 'neon-cyber',
  previewMode = 'code',
  onChangePreviewMode,
}: CodeEditorProps) {
  const [diffView, setDiffView] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  useEffect(() => {
    if (fileContent && !originalContent) {
      setOriginalContent(fileContent);
    }
  }, [fileContent]);

  // Determine editor language
  const getLanguage = (path: string | null) => {
    if (!path) return 'typescript';
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
    if (path.endsWith('.ts') || path.endsWith('.js')) return 'typescript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.sh')) return 'shell';
    if (path.endsWith('.kt')) return 'kotlin';
    if (path.endsWith('.rs')) return 'rust';
    if (path.endsWith('.go')) return 'go';
    return 'typescript';
  };

  const getMonacoBg = (t: AppTheme) => {
    switch (t) {
      case 'neon-cyber':
        return '#020409';
      case 'altrex-midnight':
        return '#000000';
      case 'altrex-ocean':
        return '#050E1F';
      case 'altrex-sunset':
        return '#120914';
      case 'altrex-matrix':
        return '#040D07';
      case 'altrex-cyber':
      default:
        return '#0A0E1A';
    }
  };

  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('altrex-custom-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00F0FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'FF00E5' },
        { token: 'number', foreground: 'FFE600' },
        { token: 'type', foreground: '7DEAFF' },
        { token: 'identifier', foreground: 'E8FBFF' },
      ],
      colors: {
        'editor.background': getMonacoBg(theme),
        'editor.foreground': '#E8FBFF',
        'editorCursor.foreground': '#00F0FF',
        'editor.lineHighlightBackground': '#00F0FF0D',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#00F0FF',
        'editor.selectionBackground': '#FF00E540',
        'editor.inactiveSelectionBackground': '#00F0FF20',
      },
    });
  };

  return (
    <main
      className="flex-1 flex flex-col overflow-hidden min-w-0 relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <TabBar
        activeFile={activeFile}
        diffView={diffView}
        onToggleDiff={() => setDiffView(!diffView)}
        isSaving={isSaving}
        onSave={onSaveFile}
        previewMode={previewMode}
        onChangePreviewMode={onChangePreviewMode}
      />

      {/* Live Activity Banner */}
      {activeActivity && (
        <div className="absolute top-11 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono shadow-[0_0_20px_rgba(0,217,255,0.3)] backdrop-blur-md animate-pulse">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{activeActivity}</span>
        </div>
      )}

      <div className="flex-1 relative">
        {!activeFile ? (
          // Empty Workspace Screen
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-transparent to-black/40 overflow-y-auto font-sans">
            <div className="max-w-xl w-full space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono shadow-sm">
                <Sparkles size={12} className="text-cyan-400" />
                <span>Live File Generation Engine Ready</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  👋 Ask ALTREX to create something
                </h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Your workspace is clean. Type what you want to build in the chat below. ALTREX will create folders, files, and stream code live in real-time.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl glass-card space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold font-mono">
                    <Globe size={13} />
                    <span>Instant Web Apps</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    HTML5, Tailwind, React, Vue with live iframe preview
                  </div>
                </div>

                <div className="p-3.5 rounded-xl glass-card space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold font-mono">
                    <Cpu size={13} />
                    <span>Polyglot Backend</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Python, Node, Go, Rust with sandbox test runner
                  </div>
                </div>

                <div className="p-3.5 rounded-xl glass-card space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold font-mono">
                    <Smartphone size={13} />
                    <span>Android APK</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Full Kotlin/Compose mobile build and bundle download
                  </div>
                </div>
              </div>

              {/* Quick Prompt Starters */}
              {onPromptClick && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-zinc-500 uppercase font-mono tracking-wider">
                    Click to try a live build:
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => onPromptClick("Create a modern responsive portfolio website with an interactive dark mode and contact form")}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs text-zinc-300 hover:text-cyan-300 font-mono transition-all cursor-pointer shadow-sm"
                    >
                      🚀 "Create a modern portfolio website"
                    </button>
                    <button
                      onClick={() => onPromptClick("Build a fully functional Todo app with filter tabs and local storage")}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs text-zinc-300 hover:text-cyan-300 font-mono transition-all cursor-pointer shadow-sm"
                    >
                      📋 "Make a todo app"
                    </button>
                    <button
                      onClick={() => onPromptClick("Build a Python financial loan payment calculator with unit tests")}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs text-zinc-300 hover:text-cyan-300 font-mono transition-all cursor-pointer shadow-sm"
                    >
                      🐍 "Build a Python calculator"
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : diffView ? (
          <DiffViewer
            originalCode={originalContent || ''}
            modifiedCode={fileContent || ''}
            language={getLanguage(activeFile)}
          />
        ) : (
          <Editor
            height="100%"
            theme="altrex-custom-theme"
            beforeMount={handleEditorWillMount}
            language={getLanguage(activeFile)}
            value={fileContent}
            onChange={(val) => onChangeContent(val || '')}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              tabSize: 2,
              wordWrap: 'on',
              readOnly: isStreaming,
            }}
            loading={
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-xs">
                Loading Monaco IDE...
              </div>
            }
          />
        )}
      </div>
    </main>
  );
}
