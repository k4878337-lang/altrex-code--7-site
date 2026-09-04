import React, { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface ToolCallCardProps {
  toolName?: string;
  content: string;
  timestamp?: number;
}

export function ToolCallCard({ toolName, content, timestamp }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex gap-2 animate-slide-in">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/40">
        <Wrench size={12} className="text-amber-400" />
      </div>
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg overflow-hidden text-xs max-w-[90%] w-full">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3 py-2 bg-amber-950/30 hover:bg-amber-900/30 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300 font-mono text-[11px] flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Tool: {toolName || 'system_call'}
            </span>
            {timestamp && (
              <span className="text-[10px] text-amber-500/70 font-mono flex items-center gap-0.5">
                <Clock size={10} />
                {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center text-amber-400/80 text-[10px] gap-1">
            <span>{isOpen ? 'Collapse' : 'Expand'}</span>
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        </div>

        {isOpen ? (
          <div className="p-3 bg-black/60 border-t border-amber-500/20 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-60">
            {content}
          </div>
        ) : (
          <div className="px-3 py-1.5 text-zinc-400 font-mono text-[11px] truncate">
            {content.split('\n')[0] || 'Tool executed successfully'}
          </div>
        )}
      </div>
    </div>
  );
}
