import React, { useState } from 'react';
import { WorkspaceFile } from '../../types.js';
import {
  ChevronRight,
  ChevronDown,
  File,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface FileTreeProps {
  files: WorkspaceFile[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onClearWorkspace?: () => void;
  onPromptClick?: (prompt: string) => void;
}

function getFileIcon(name: string) {
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx')) {
    return <FileCode size={13} className="text-cyan-400 shrink-0" />;
  }
  if (name.endsWith('.json')) return <FileJson size={13} className="text-amber-400 shrink-0" />;
  if (name.endsWith('.md')) return <FileCode size={13} className="text-emerald-400 shrink-0" />;
  if (name.endsWith('.css') || name.endsWith('.scss')) return <FileCode size={13} className="text-pink-400 shrink-0" />;
  if (name.endsWith('.html')) return <FileCode size={13} className="text-orange-400 shrink-0" />;
  if (name.endsWith('.py')) return <FileCode size={13} className="text-yellow-400 shrink-0" />;
  return <File size={13} className="text-zinc-400 shrink-0" />;
}

interface TreeNodeItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNodeItem[];
}

function buildTree(files: WorkspaceFile[]): TreeNodeItem[] {
  const root: TreeNodeItem[] = [];
  const map: Record<string, TreeNodeItem> = {};

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const f of sorted) {
    const isDir = f.isDirectory || (f as any).type === 'directory';
    const item: TreeNodeItem = {
      name: f.name,
      path: f.path,
      isDirectory: isDir,
      children: isDir ? [] : undefined,
    };
    map[f.path] = item;

    const parts = f.path.split('/');
    if (parts.length === 1) {
      root.push(item);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      if (map[parentPath] && map[parentPath].children) {
        map[parentPath].children!.push(item);
      } else {
        root.push(item);
      }
    }
  }

  return root;
}

interface TreeNodeProps {
  key?: React.Key;
  node: TreeNodeItem;
  depth: number;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

function TreeNode({
  node,
  depth,
  activeFile,
  onSelectFile,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isActive = activeFile === node.path;

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-zinc-300 hover:bg-white/[0.05] rounded transition-colors text-left font-mono cursor-pointer"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
          {expanded ? (
            <FolderOpen size={13} className="text-amber-400 shrink-0" />
          ) : (
            <Folder size={13} className="text-amber-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-all text-left font-mono cursor-pointer ${
        isActive
          ? 'filetree-item-active font-semibold'
          : 'text-zinc-400 hover:bg-cyan-950/30 hover:text-cyan-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 18}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({
  files,
  activeFile,
  onSelectFile,
  onRefresh,
  isRefreshing = false,
  onClearWorkspace,
  onPromptClick,
}: FileTreeProps) {
  const treeItems = buildTree(files);

  return (
    <aside className="w-60 bg-black/80 backdrop-blur-xl border-r border-cyan-500/30 flex flex-col shrink-0 overflow-hidden select-none font-mono">
      <div className="px-3 py-2.5 border-b border-cyan-500/30 flex items-center justify-between bg-cyan-950/20">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold font-rajdhani">
            EXPLORER // HUD
          </span>
          {files.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(0,240,255,0.4)]">
              {files.filter(f => !f.isDirectory).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {files.length > 0 && onClearWorkspace && (
            <button
              onClick={onClearWorkspace}
              title="Clear Workspace (Start Fresh)"
              className="px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
          <button
            onClick={onRefresh}
            title="Refresh Workspace Files"
            className="p-1 rounded text-zinc-400 hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-dashed border-white/20 flex items-center justify-center text-zinc-500 shadow-inner">
              <Folder size={18} className="text-zinc-500" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-300">Clean Workspace</div>
              <div className="text-[11px] text-zinc-500 leading-tight">
                Ask ALTREX to generate code or a project structure.
              </div>
            </div>

            {onPromptClick && (
              <div className="w-full pt-2 space-y-1.5 text-[10px] text-left">
                <span className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider px-1">Quick Starters:</span>
                <button
                  onClick={() => onPromptClick("Create a modern portfolio website with HTML, CSS, and JS")}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-cyan-950/50 hover:text-cyan-300 text-zinc-400 border border-white/10 transition-colors truncate"
                >
                  🌐 Portfolio website
                </button>
                <button
                  onClick={() => onPromptClick("Build a reactive Todo application with categories and local storage")}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-cyan-950/50 hover:text-cyan-300 text-zinc-400 border border-white/10 transition-colors truncate"
                >
                  📋 Todo application
                </button>
                <button
                  onClick={() => onPromptClick("Build a Python financial calculator with unit tests")}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-cyan-950/50 hover:text-cyan-300 text-zinc-400 border border-white/10 transition-colors truncate"
                >
                  🐍 Python calculator
                </button>
              </div>
            )}
          </div>
        ) : (
          treeItems.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </aside>
  );
}
