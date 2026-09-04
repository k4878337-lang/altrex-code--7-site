'use client';

import React from 'react';
import { ChatMessage } from '../../lib/types.js';
import { User, Bot } from 'lucide-react';
import { ToolCallCard } from './ToolCallCard.js';
import { EnsembleBadge } from './EnsembleBadge.js';

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-2 animate-slide-in justify-end">
        <div className="bg-[#16213e] border border-cyan-500/20 rounded-xl rounded-tr-none px-3.5 py-2.5 text-sm text-zinc-200 max-w-[85%] shadow-sm">
          {message.content}
        </div>
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/40">
          <User size={12} className="text-blue-400" />
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

  // Assistant
  return (
    <div className="flex gap-2 animate-slide-in">
      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
        <Bot size={12} className="text-cyan-400" />
      </div>
      <div className="bg-[#121624] border border-zinc-800 rounded-xl rounded-tl-none px-3.5 py-2.5 text-sm text-zinc-200 max-w-[88%] whitespace-pre-wrap leading-relaxed shadow-sm">
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
