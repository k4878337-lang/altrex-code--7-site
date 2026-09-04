'use client';

import React from 'react';
import { TopBar } from '../components/layout/TopBar.js';
import { FileTree } from '../components/layout/FileTree.js';
import { CodeEditor } from '../components/layout/CodeEditor.js';
import { ChatPanel } from '../components/layout/ChatPanel.js';
import { ModelDashboard } from '../components/layout/ModelDashboard.js';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-[#e4e4e7] overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Tree */}
        <FileTree />

        {/* Center: Code Editor */}
        <CodeEditor />

        {/* Right: Chat Panel */}
        <ChatPanel />
      </div>

      {/* Bottom: Model Dashboard */}
      <ModelDashboard />
    </div>
  );
}
