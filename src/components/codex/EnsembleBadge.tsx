import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, Layers } from 'lucide-react';

interface EnsembleBadgeProps {
  content: string;
  data?: {
    agreementScore: number;
    individualResponses: { provider: string; response: string }[];
  };
}

export function EnsembleBadge({ content, data }: EnsembleBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-2 animate-slide-in my-1">
      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/40">
        <Sparkles size={12} className="text-purple-400" />
      </div>
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg overflow-hidden text-xs max-w-[92%] w-full">
        <div
          onClick={() => data && setExpanded(!expanded)}
          className={`flex items-center justify-between px-3 py-2 bg-purple-950/30 ${
            data ? 'cursor-pointer hover:bg-purple-900/30' : ''
          } transition-colors`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-purple-300 font-mono text-[11px] flex items-center gap-1.5">
              <Layers size={12} className="text-purple-400" />
              {content}
            </span>
            {data && (
              <span className="px-1.5 py-0.2 rounded bg-purple-900 text-purple-200 border border-purple-400/40 text-[10px] font-mono font-bold">
                {Math.round(data.agreementScore * 100)}% Consensus
              </span>
            )}
          </div>
          {data && (
            <div className="flex items-center text-purple-400 text-[10px] gap-1">
              <span>{data.individualResponses.length} Models</span>
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          )}
        </div>

        {expanded && data && (
          <div className="p-3 bg-black/70 border-t border-purple-500/20 space-y-2">
            <div className="text-[10px] text-purple-300/80 uppercase font-mono font-semibold">
              Individual Model Responses Before Synthesis:
            </div>
            <div className="space-y-2">
              {data.individualResponses.map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-purple-950/30 border border-purple-900/50 font-mono text-[11px]">
                  <div className="text-cyan-300 font-bold mb-1">{item.provider}</div>
                  <pre className="text-zinc-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">{item.response}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
