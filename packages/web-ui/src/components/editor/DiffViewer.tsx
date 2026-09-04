'use client';

import React from 'react';
import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
}

export function DiffViewer({
  originalCode,
  modifiedCode,
  language = 'typescript',
}: DiffViewerProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0f]">
      <DiffEditor
        height="100%"
        theme="vs-dark"
        language={language}
        original={originalCode}
        modified={modifiedCode}
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          renderSideBySide: true,
          readOnly: false,
          smoothScrolling: true,
          minimap: { enabled: false },
        }}
      />
    </div>
  );
}
