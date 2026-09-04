'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../../stores/appStore.js';
import { TabBar } from '../editor/TabBar.js';
import { DiffViewer } from '../editor/DiffViewer.js';

const defaultWelcomeCode = `// ⚡ ALTREX CODE - Autonomous ReAct Agent & Multi-Model Engine
// Select a file from the workspace explorer or ask the AI in the chat panel.

interface TaskResult {
  status: 'optimal' | 'executing' | 'synthesized';
  consensusScore: number;
  modelsActive: string[];
}

export function evaluateArchitecture(): TaskResult {
  console.log("ALTREX Engine initialized across Phase 1, 2, and 3.");
  return {
    status: 'optimal',
    consensusScore: 0.95,
    modelsActive: ['qwen3.8-max', 'llama-3.3-70b', 'gemini-3.8-flash']
  };
}

// Example usage:
const result = evaluateArchitecture();
console.log(result);
`;

export function CodeEditor() {
  const {
    activeFile,
    fileContent,
    setFileContent,
    diffView,
    setIsSaving,
  } = useAppStore();

  const [originalContent, setOriginalContent] = useState<string>('');

  useEffect(() => {
    if (fileContent && !originalContent) {
      setOriginalContent(fileContent);
    }
  }, [fileContent]);

  // Determine editor language
  const getLanguage = (path: string | null) => {
    if (!path) return 'typescript';
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
    if (path.endsWith('.ts') || path.endsWith('.js')) return 'typescript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.sh')) return 'shell';
    return 'typescript';
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: fileContent }),
      });
      setOriginalContent(fileContent);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsSaving(false), 1200);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-[#080c16] overflow-hidden min-w-0">
      <TabBar />

      <div className="flex-1 relative">
        {diffView ? (
          <DiffViewer
            originalCode={originalContent || defaultWelcomeCode}
            modifiedCode={fileContent || defaultWelcomeCode}
            language={getLanguage(activeFile)}
          />
        ) : (
          <Editor
            height="100%"
            theme="vs-dark"
            language={getLanguage(activeFile)}
            value={fileContent || defaultWelcomeCode}
            onChange={(val) => setFileContent(val || '')}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              padding: { top: 14, bottom: 14 },
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              tabSize: 2,
              wordWrap: 'on',
            }}
            loading={
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-xs">
                Loading Monaco IDE...
              </div>
            }
          />
        )}
      </div>
    </main>
  );
}
