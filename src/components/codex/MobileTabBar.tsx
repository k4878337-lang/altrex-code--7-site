import React from 'react';
import { FolderTree, Code2, Eye, MessageSquare } from 'lucide-react';
import { MobileTab } from '../../types.js';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  unreadChatCount?: number;
}

export function MobileTabBar({
  activeTab,
  onSelectTab,
  unreadChatCount = 0,
}: MobileTabBarProps) {
  const tabs: { id: MobileTab; label: string; icon: any }[] = [
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/90 backdrop-blur-xl border-t border-cyan-500/40 flex items-center justify-around px-2 z-50 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.9)] pb-safe">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-1 rounded-xl transition-all relative cursor-pointer ${
              isActive
                ? 'bg-magenta/20 text-[#ff8df7] border border-magenta/60 shadow-[0_0_14px_rgba(255,0,229,0.4)]'
                : 'text-zinc-400 hover:text-cyan-300'
            }`}
          >
            <div className="relative">
              <Icon size={18} className={isActive ? 'text-magenta' : 'text-zinc-400'} />
              {tab.id === 'chat' && unreadChatCount > 0 && !isActive && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-magenta text-black text-[9px] font-bold font-mono animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-rajdhani font-bold tracking-wider mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
