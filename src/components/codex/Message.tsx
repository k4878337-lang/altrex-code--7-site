import React from 'react';
import { User, Bot, Sparkles, Brain, BookOpen, Clock } from 'lucide-react';
import { ToolCallCard } from './ToolCallCard.js';
import { EnsembleBadge } from './EnsembleBadge.js';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'ensemble' | 'context' | 'memory';
  content: string;
  timestamp: number | string;
  toolName?: string;
  isStreaming?: boolean;
  ensembleData?: {
    agreementScore: number;
    individualResponses: { provider: string; response: string }[];
  };
}

export interface MessageProps {
  message: ChatMessageItem;
  key?: React.Key;
}

export function Message({ message }: MessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-2.5 animate-slide-in justify-end group">
        <div className="chat-bubble-user px-4 py-2.5 text-xs max-w-[85%] leading-relaxed font-sans">
          {message.content}
        </div>
        <div className="w-7 h-7 rounded-xl bg-magenta/20 flex items-center justify-center shrink-0 mt-0.5 border border-magenta shadow-[0_0_10px_rgba(255,0,229,0.3)]">
          <User size={13} className="text-[#ff8df7]" />
        </div>
      </div>
    );
  }

  if (message.role === 'tool') {
    return (
      <ToolCallCard
        toolName={message.toolName}
        content={message.content}
        timestamp={message.timestamp}
      />
    );
  }

  if (message.role === 'ensemble') {
    return (
      <EnsembleBadge
        content={message.content}
        data={message.ensembleData}
      />
    );
  }

  if (message.role === 'context') {
    return (
      <div className="animate-slide-in my-1">
        <div className="px-3.5 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] flex items-center gap-2.5 shadow-sm">
          <div className="p-1 rounded-lg bg-indigo-900/60 text-indigo-300 shrink-0">
            <Brain size={13} />
          </div>
          <span className="leading-snug">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.role === 'memory') {
    return (
      <div className="animate-slide-in my-1.5">
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] space-y-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <Brain size={13} />
            <span>ALTREX Memory Engine</span>
          </div>
          <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex gap-2.5 animate-slide-in group">
      <div className="w-7 h-7 rounded-xl bg-cyan-950/60 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/60 shadow-[0_0_12px_rgba(0,240,255,0.35)]">
        <Bot size={13} className="text-cyan-400" />
      </div>
      <div className="chat-bubble-ai px-4 py-2.5 text-xs max-w-[88%] whitespace-pre-wrap leading-relaxed font-sans">
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        )}
      </div>
    </div>
  );
}
