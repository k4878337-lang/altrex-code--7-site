'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { FileNode } from '../../lib/types.js';
import {
  ChevronRight,
  ChevronDown,
  File,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
  RefreshCw,
  Plus,
} from 'lucide-react';

function getFileIcon(name: string) {
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx')) {
    return <FileCode size={14} className="text-blue-400 shrink-0" />;
  }
  if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400 shrink-0" />;
  if (name.endsWith('.md')) return <FileCode size={14} className="text-emerald-400 shrink-0" />;
  return <File size={14} className="text-zinc-400 shrink-0" />;
}

function TreeNode({
  node,
  depth,
  onSelectFile,
}: {
  node: FileNode;
  depth: number;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { activeFile } = useAppStore();
  const isActive = activeFile === node.path;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-zinc-300 hover:bg-[#121927] rounded transition-colors text-left font-mono"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
          {expanded ? (
            <FolderOpen size={14} className="text-amber-400 shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} onSelectFile={onSelectFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors text-left font-mono ${
        isActive
          ? 'bg-cyan-950/70 text-cyan-300 border-l-2 border-cyan-400 font-semibold'
          : 'text-zinc-400 hover:bg-[#121927] hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree() {
  const { fileTree, setFileTree, setActiveFile, setFileContent } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFiles = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        setFileTree(data.files);
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectFile = async (filePath: string) => {
    setActiveFile(filePath);
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <aside className="w-60 bg-[#0a0f1c] border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden select-none">
      <div className="px-3 py-2.5 border-b border-zinc-800/80 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
          WORKSPACE EXPLORER
        </span>
        <button
          onClick={fetchFiles}
          title="Refresh Workspace Files"
          className="p-1 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-xs font-mono">
            No files in workspace yet. Ask ALTREX to generate code!
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} onSelectFile={handleSelectFile} />
          ))
        )}
      </div>
    </aside>
  );
}
