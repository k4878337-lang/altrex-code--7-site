import React, { useState, useEffect } from 'react';
import { WorkspaceFile } from '../types';
import {
  Folder,
  FileCode,
  FileText,
  Play,
  RotateCcw,
  RefreshCw,
  Plus,
  Save,
  Check,
  AlertCircle,
  X,
  FileTerminal,
} from 'lucide-react';

interface WorkspaceExplorerProps {
  onRunScript?: (command: string) => void;
  onRefreshLogs?: () => void;
}

export function WorkspaceExplorer({ onRunScript }: WorkspaceExplorerProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>('hello.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewFileDialog, setShowNewFileDialog] = useState<boolean>(false);
  const [manualOutput, setManualOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/workspace/files');
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        // If nothing selected or selected doesn't exist, select first file
        if (!selectedFilePath && data.files.length > 0) {
          const firstNonDir = data.files.find((f: WorkspaceFile) => !f.isDirectory) || data.files[0];
          setSelectedFilePath(firstNonDir.path);
        }
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      setSelectedFilePath(path);
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
      }
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (selectedFilePath) {
      loadFileContent(selectedFilePath);
    }
  }, [selectedFilePath]);

  const handleSave = async () => {
    if (!selectedFilePath) return;
    try {
      setIsSaving(true);
      const res = await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFilePath, content: fileContent }),
      });
      if (res.ok) {
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
        fetchFiles();
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      setSaveStatus('Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      const res = await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newFileName.trim(), content: '# Created via ALTREX Workspace\n' }),
      });
      if (res.ok) {
        const path = newFileName.trim();
        setNewFileName('');
        setShowNewFileDialog(false);
        await fetchFiles();
        setSelectedFilePath(path);
      }
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleResetWorkspace = async () => {
    if (!confirm('Are you sure you want to reset the workspace to initial default state?')) return;
    try {
      await fetch('/api/workspace/reset', { method: 'POST' });
      await fetchFiles();
      setSelectedFilePath('README.md');
    } catch (err) {
      console.error('Failed to reset workspace:', err);
    }
  };

  const handleRunCurrentFile = async () => {
    if (!selectedFilePath) return;
    const isPython = selectedFilePath.endsWith('.py');
    const isNode = selectedFilePath.endsWith('.js') || selectedFilePath.endsWith('.ts');
    let cmd = '';
    if (isPython) cmd = `python3 ${selectedFilePath}`;
    else if (isNode) cmd = `node ${selectedFilePath}`;
    else cmd = `cat ${selectedFilePath}`;

    if (onRunScript) {
      onRunScript(cmd);
      return;
    }

    try {
      setIsExecuting(true);
      setManualOutput(`Executing: ${cmd}...`);
      const res = await fetch('/api/workspace/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setManualOutput(data.result || '(No output)');
    } catch (err: any) {
      setManualOutput(`Execution error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getFileIcon = (file: WorkspaceFile) => {
    if (file.isDirectory) return <Folder className="w-4 h-4 text-cyan-400" />;
    if (file.name.endsWith('.py')) return <FileCode className="w-4 h-4 text-yellow-400" />;
    if (file.name.endsWith('.ts') || file.name.endsWith('.js')) return <FileCode className="w-4 h-4 text-blue-400" />;
    if (file.name.endsWith('.json')) return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-200 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1628] border-b border-cyan-500/20 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-cyan-400 flex items-center gap-1.5">
            <Folder className="w-4 h-4" /> Workspace Sandbox
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-[11px]">./altrex-workspace</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            id="refresh-files-btn"
            onClick={fetchFiles}
            title="Refresh Files"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="new-file-btn"
            onClick={() => setShowNewFileDialog(true)}
            title="New File"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            id="reset-workspace-btn"
            onClick={handleResetWorkspace}
            title="Reset Workspace"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New File Input Overlay */}
      {showNewFileDialog && (
        <form onSubmit={handleCreateFile} className="px-3 py-2 bg-slate-900/90 border-b border-cyan-500/30 flex items-center gap-2">
          <span className="text-xs text-cyan-400 font-mono">New file:</span>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="e.g. script.py, data.json"
            autoFocus
            className="flex-1 bg-black/60 border border-slate-700 px-2.5 py-1 text-xs text-white rounded font-mono focus:border-cyan-400 focus:outline-none"
          />
          <button type="submit" className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-semibold rounded">
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowNewFileDialog(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Main split: File List & File Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-56 border-r border-slate-800 bg-[#070b14] flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800/80">
            Files ({files.length})
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {files.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center italic">
                Workspace empty. Ask ALTREX to write files!
              </div>
            ) : (
              files.map((file) => {
                const isSelected = selectedFilePath === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => !file.isDirectory && loadFileContent(file.path)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs font-mono transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {getFileIcon(file)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    {!file.isDirectory && (
                      <span className="text-[10px] text-slate-600 ml-1">
                        {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}k` : `${file.size}b`}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#050811] overflow-hidden">
          {selectedFilePath ? (
            <>
              {/* File tab header */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#0a1020] border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono text-cyan-200 font-semibold">{selectedFilePath}</span>
                  {saveStatus && (
                    <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> {saveStatus}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRunCurrentFile}
                    disabled={isExecuting}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-mono transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 text-xs font-mono transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Code editor textarea with line numbers styling */}
              <div className="flex-1 relative overflow-hidden flex">
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full p-4 bg-transparent font-mono text-xs text-emerald-300 leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-cyan-900/60"
                  placeholder="Empty file..."
                />
              </div>

              {/* Terminal output drawer if executed manually */}
              {manualOutput && (
                <div className="border-t border-slate-800 bg-black/90 p-3 max-h-36 overflow-y-auto">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="flex items-center gap-1.5 font-mono text-cyan-400">
                      <FileTerminal className="w-3.5 h-3.5" /> Output:
                    </span>
                    <button
                      onClick={() => setManualOutput(null)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap">{manualOutput}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs font-mono">
              <FileCode className="w-8 h-8 mb-2 text-slate-700" />
              <span>Select a file from the workspace tree to view or edit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
