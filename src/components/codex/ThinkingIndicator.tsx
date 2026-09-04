import React from 'react';
import { Brain } from 'lucide-react';

interface ThinkingIndicatorProps {
  text?: string;
}

export function ThinkingIndicator({ text = 'ATX-1 Reasoning...' }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs w-fit animate-pulse font-mono my-2 shadow-sm">
      <Brain size={14} className="text-cyan-400 animate-spin" />
      <span>{text}</span>
      <span className="flex gap-1 items-center ml-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}
