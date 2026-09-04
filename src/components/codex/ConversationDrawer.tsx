import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ConversationItem } from '../../types.js';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationItem[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationDrawer({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        (c.messages && c.messages.some((m) => m.content?.toLowerCase().includes(query)))
    );
  }, [conversations, searchQuery]);

  if (!isOpen) return null;

  const handleStartRename = (e: React.MouseEvent, c: ConversationItem) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-black/95 border-l border-cyan-500/50 shadow-[-10px_0_30px_rgba(0,240,255,0.2)] z-50 flex flex-col font-mono text-xs select-none">
        {/* Neon Cyber HUD Corner Brackets */}
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />

        {/* Drawer Header */}
        <div className="h-12 border-b border-cyan-500/30 px-3.5 flex items-center justify-between shrink-0 bg-black/60">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-cyan-400" />
            <span className="font-bold text-sm font-rajdhani tracking-wider text-cyan-300">
              CHAT SESSIONS
            </span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 text-[10px]">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Bar: Pinned New Conversation */}
        <div className="p-3 border-b border-cyan-500/20 space-y-2 bg-black/40">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 text-cyan-200 font-bold font-rajdhani tracking-wider transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer"
          >
            <Plus size={14} className="text-cyan-400" />
            <span>＋ NEW CONVERSATION</span>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-black/80 border border-cyan-500/30 focus:border-cyan-400 text-cyan-200 placeholder-zinc-500 outline-none text-[11px] transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs italic">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeId;
              const isEditing = editingId === c.id;
              const isConfirming = confirmDeleteId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (!isEditing && !isConfirming) {
                      onSelectConversation(c.id);
                      onClose();
                    }
                  }}
                  className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-magenta/15 border-magenta text-white shadow-[0_0_12px_rgba(255,0,229,0.3)]'
                      : 'bg-black/50 border-cyan-500/20 text-zinc-300 hover:border-cyan-500/50 hover:bg-cyan-950/20'
                  }`}
                >
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e, c.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-black/90 border border-cyan-400 px-2 py-1 rounded text-cyan-200 text-xs outline-none"
                      />
                      <button
                        onClick={(e) => handleSaveRename(e, c.id)}
                        className="p-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300"
                        title="Save title"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : isConfirming ? (
                    <div
                      className="flex items-center justify-between gap-1 text-red-300 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="flex items-center gap-1 text-[11px] font-bold">
                        <AlertTriangle size={12} className="text-red-400" />
                        Delete chat?
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onDeleteConversation(c.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white text-[10px] font-bold"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-bold text-xs truncate max-w-[190px] font-rajdhani tracking-wide ${
                            isActive ? 'text-magenta' : 'text-cyan-300 group-hover:text-cyan-200'
                          }`}
                        >
                          {c.title}
                        </span>

                        {/* Actions on hover or active */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(e, c)}
                            title="Rename"
                            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-cyan-300 transition-colors"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(c.id);
                            }}
                            title="Delete"
                            className="p-1 rounded hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(c.updatedAt || c.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={10} />
                          {c.messages?.length || 0} msgs
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Status */}
        <div className="p-2.5 border-t border-cyan-500/20 bg-black/60 text-center text-[10px] text-zinc-500">
          ALTREX Persistence // altrex_conversations_v1
        </div>
      </aside>
    </>
  );
}
