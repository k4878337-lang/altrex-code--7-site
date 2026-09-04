import React, { useState, useEffect, useRef } from 'react';
import { LogItem, AppConfig, WorkspaceFile, AgentMode, AppTheme, EditorPreviewMode, MobileTab, ConversationItem } from './types';
import { Terminal } from './components/Terminal';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';
import { ArchitectureModal } from './components/ArchitectureModal';
import { SettingsModal } from './components/SettingsModal';
import { OrchestratorModal } from './components/OrchestratorModal';
import { ContextModal } from './components/codex/ContextModal';
import { BenchmarkModal } from './components/codex/BenchmarkModal';
import { GitModal } from './components/codex/GitModal';
import { DeployModal } from './components/codex/DeployModal';
import { APKModal } from './components/codex/APKModal';
import { LanguagesModal } from './components/codex/LanguagesModal';
import { MemoryModal } from './components/codex/MemoryModal';
import { memory } from './lib/memory';

// Phase 3 Codex 3-Panel Studio Components
import { TopBar } from './components/codex/TopBar';
import { FileTree } from './components/codex/FileTree';
import { CodeEditor } from './components/codex/CodeEditor';
import { ChatPanel } from './components/codex/ChatPanel';
import { ModelDashboard } from './components/codex/ModelDashboard';
import { ChatMessageItem } from './components/codex/Message';

// Phase 7.2 Preview & Conversation Components
import { LivePreviewPanel } from './components/codex/LivePreviewPanel';
import { ConversationDrawer } from './components/codex/ConversationDrawer';
import { MobileTabBar } from './components/codex/MobileTabBar';

export default function App() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>(() => memory.getConversations());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [provider, setProvider] = useState<'xkiro' | 'groq' | 'ollama' | 'gemini'>('xkiro');
  const [mode, setMode] = useState<AgentMode>(() => memory.getPreference('mode', 'balanced'));
  const [theme, setTheme] = useState<AppTheme>(() => memory.getPreference('theme', 'neon-cyber'));
  const [onlineCount, setOnlineCount] = useState<number>(4);
  const [activeView, setActiveView] = useState<'codex' | 'terminal' | 'workspace'>('codex');
  const [showArchModal, setShowArchModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showOrchestratorModal, setShowOrchestratorModal] = useState<boolean>(false);
  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);
  const [showGitModal, setShowGitModal] = useState<boolean>(false);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [deployModalTab, setDeployModalTab] = useState<'workspace' | 'custom-zip'>('workspace');
  const [showAPKModal, setShowAPKModal] = useState<boolean>(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState<boolean>(false);
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);
  const [memoryStats, setMemoryStats] = useState(() => memory.getStats());
  const [welcomeNotice, setWelcomeNotice] = useState<string | null>(null);

  // Phase 7.2: Preview & Conversation States
  const [previewMode, setPreviewMode] = useState<EditorPreviewMode>('code');
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [conversations, setConversations] = useState<ConversationItem[]>(() => memory.getConversationsList());
  const [activeConvId, setActiveConvId] = useState<string>(() => memory.getActiveConversationId());
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  } | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Codex Studio File & Editor State - Starts 100% EMPTY on load
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isRefreshingFiles, setIsRefreshingFiles] = useState<boolean>(false);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [isStreamingCode, setIsStreamingCode] = useState<boolean>(false);
  const [modelStatuses, setModelStatuses] = useState<{ name: string; online: boolean; latencyMs: number }[]>([]);

  // Config & API Keys state
  const [xkiroKey, setXkiroKey] = useState<string>('sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d');
  const [groqKey, setGroqKey] = useState<string>('');
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434/v1');

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTimerRef = useRef<any>(null);

  // Cycle orchestration mode (speed -> balanced -> deep)
  const cycleMode = () => {
    const modes: AgentMode[] = ['speed', 'balanced', 'deep'];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
  };

  const showToast = (message: string, actionText?: string, onAction?: () => void) => {
    const id = `toast_${Date.now()}`;
    setToastNotification({ id, message, actionText, onAction });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  };

  const handleNewConversation = () => {
    const newConv = memory.createNewConversation('New Conversation');
    setChatMessages([]);
    setConversations(memory.getConversationsList());
    setActiveConvId(newConv.id);
    showToast('🆕 New conversation started');
  };

  const handleSelectConversation = (id: string) => {
    const conv = memory.setActiveConversationId(id);
    if (conv) {
      setChatMessages([...conv.messages]);
      setActiveConvId(id);
      setConversations(memory.getConversationsList());
      setShowHistoryDrawer(false);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    memory.renameConversation(id, newTitle);
    setConversations(memory.getConversationsList());
  };

  const handleDeleteConversation = (id: string) => {
    memory.deleteConversation(id);
    const updated = memory.getConversationsList();
    setConversations(updated);
    const active = memory.getActiveConversation();
    setActiveConvId(active.id);
    setChatMessages([...active.messages]);
  };

  const handleTogglePreview = () => {
    if (previewMode === 'code') {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileTab('preview');
        setPreviewMode('preview');
      } else {
        setPreviewMode('split');
      }
    } else {
      setPreviewMode('code');
      if (mobileTab === 'preview') {
        setMobileTab('code');
      }
    }
  };

  const fetchWorkspaceFiles = async () => {
    setIsRefreshingFiles(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        setWorkspaceFiles(data.files);
        // If workspace is completely empty, ensure editor is also empty
        if (data.files.length === 0) {
          setActiveFile(null);
          setFileContent('');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshingFiles(false);
    }
  };

  // Real-time streaming / typing animation for code editor
  const streamCodeToEditor = (filePath: string, fullCode: string) => {
    setActiveFile(filePath);
    setIsStreamingCode(true);
    setActiveActivity(`✍️ Writing code: ${filePath} (streaming...)`);

    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
    }

    if (!fullCode) {
      setFileContent('');
      setIsStreamingCode(false);
      return;
    }

    let currentIndex = 0;
    const totalLength = fullCode.length;
    // Adapt step size to finish typing smoothly in 1 to 2 seconds
    const step = Math.max(16, Math.ceil(totalLength / 50));
    setFileContent('');

    streamingTimerRef.current = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= totalLength) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
        setFileContent(fullCode);
        setIsStreamingCode(false);
        setActiveActivity(`✅ File ready: ${filePath}`);
        setTimeout(() => {
          setActiveActivity(null);
        }, 2000);
      } else {
        setFileContent(fullCode.slice(0, currentIndex));
      }
    }, 25);
  };

  const loadFileContent = async (filePath: string) => {
    setActiveFile(filePath);
    memory.setActiveFile(filePath);
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        memory.rememberFile(filePath, data.content);
        setMemoryStats(memory.getStats());
      }
    } catch {
      // fallback to memory if available
      const saved = memory.getSavedFiles().find((f) => f.path === filePath);
      if (saved) {
        setFileContent(saved.content);
      }
    }
  };

  const handleClearWorkspace = async () => {
    try {
      await fetch('/api/workspace/reset', { method: 'POST' });
      setWorkspaceFiles([]);
      setActiveFile(null);
      setFileContent('');
      memory.clearWorkspaceFiles();
      setMemoryStats(memory.getStats());
      setActiveActivity('🧹 Workspace cleared');
      setTimeout(() => setActiveActivity(null), 2000);

      setLogs((prev) => [
        ...prev,
        {
          id: `clear_${Date.now()}`,
          type: 'system',
          content: '🧹 Workspace cleared. Starting fresh.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `clear_${Date.now()}`,
          role: 'assistant',
          content: 'Workspace is clean and empty. What would you like to build next?',
          timestamp: Date.now(),
        },
      ]);
    } catch {
      // ignore
    }
  };

  const handleSaveActiveFile = async () => {
    if (!activeFile) return;
    setIsSavingFile(true);
    try {
      await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: fileContent }),
      });
      memory.rememberFile(activeFile, fileContent);
      setMemoryStats(memory.getStats());
      fetchWorkspaceFiles();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsSavingFile(false), 1000);
    }
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    memory.rememberPreference('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const fetchModelStatuses = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models) {
        setModelStatuses(data.models);
        setOnlineCount(data.onlineCount || data.models.filter((m: any) => m.online).length);
      }
    } catch {
      // ignore
    }
  };

  const probeModels = async () => {
    try {
      const res = await fetch('/api/orchestrator/probe', { method: 'POST' });
      const data = await res.json();
      if (data.statuses) {
        setModelStatuses(data.statuses);
        setOnlineCount(data.onlineCount || data.statuses.filter((s: any) => s.online).length);
      }
    } catch {
      // ignore
    }
  };

  // Sync theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial load with persistent memory recovery
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    const savedFiles = memory.getSavedFiles();
    const savedConvs = memory.getConversations();

    if (savedFiles.length > 0) {
      setWorkspaceFiles(
        savedFiles.map((f) => ({
          name: f.path.split('/').pop() || f.path,
          path: f.path,
          size: f.size,
          isDirectory: false,
          updatedAt: new Date(f.updatedAt).toISOString(),
        }))
      );

      // Re-sync saved files to server workspace in background
      savedFiles.forEach(async (f) => {
        try {
          await fetch('/api/workspace/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: f.path, content: f.content }),
          });
        } catch {
          // ignore
        }
      });

      const active = memory.getActiveFile() || savedFiles[0].path;
      const target = savedFiles.find((f) => f.path === active) || savedFiles[0];
      setActiveFile(target.path);
      setFileContent(target.content);

      setWelcomeNotice(`🧠 Memory Active: Restored ${savedFiles.length} file(s) & ${savedConvs.length} message(s)`);
      setTimeout(() => setWelcomeNotice(null), 5000);
    } else {
      fetchWorkspaceFiles();
      loadFileContent('README.md');
    }

    fetchModelStatuses();
    setMemoryStats(memory.getStats());
  }, []);

  // Keyboard shortcut listener for Ctrl+M (toggle mode) and Ctrl+S (save file)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        cycleMode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFile();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mode, activeFile, fileContent]);

  const handleClearLogs = () => {
    setLogs([]);
    setChatMessages([]);
    memory.clearConversations();
    setMemoryStats(memory.getStats());
  };

  const handleCancelExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setLogs((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          type: 'error',
          content: 'Execution cancelled by user (Ctrl+C)',
          timestamp: new Date().toISOString(),
        },
      ]);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Execution stopped by user.',
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleSubmitPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const trimmed = promptText.trim().toLowerCase();
    if (trimmed === '/deploy') {
      setDeployModalTab('workspace');
      setShowDeployModal(true);
      return;
    }
    if (trimmed === '/zipdeploy' || trimmed === '/customdeploy' || trimmed === '/zip') {
      setDeployModalTab('custom-zip');
      setShowDeployModal(true);
      return;
    }
    if (trimmed === '/apk') {
      setShowAPKModal(true);
      return;
    }
    if (trimmed === '/languages' || trimmed === '/langs') {
      setShowLanguagesModal(true);
      return;
    }
    if (trimmed === '/git') {
      setShowGitModal(true);
      return;
    }
    if (trimmed === '/benchmark') {
      setShowBenchmarkModal(true);
      return;
    }
    if (trimmed === '/context') {
      setShowContextModal(true);
      return;
    }
    if (trimmed === '/memory' || trimmed === '/brain' || trimmed === '/remember') {
      setShowMemoryModal(true);
      return;
    }

    // Add user prompt to both terminal logs and Codex chat messages
    const now = Date.now();
    const userLogId = `user_${now}`;

    // Store in persistent memory
    memory.rememberUserMessage(promptText, now);
    setMemoryStats(memory.getStats());

    setLogs((prev) => [
      ...prev,
      {
        id: userLogId,
        type: 'user',
        content: promptText,
        timestamp: new Date(now).toISOString(),
      },
    ]);

    setChatMessages((prev) => [
      ...prev,
      {
        id: userLogId,
        role: 'user',
        content: promptText,
        timestamp: now,
      },
    ]);

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Create assistant message for streaming
    const assistantLogId = `asst_${now + 1}`;
    setChatMessages((prev) => [
      ...prev,
      {
        id: assistantLogId,
        role: 'assistant',
        content: '',
        timestamp: now + 1,
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          message: promptText,
          provider,
          apiKey: provider === 'xkiro' ? xkiroKey : provider === 'groq' ? groqKey : undefined,
          model: provider === 'xkiro' ? 'qwen/qwen3.8-max:free' : undefined,
          mode,
          memoryContext: memory.getAIBrainSummary(),
          history: memory.getConversationContext(12),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentAssistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'system') {
              setLogs((prev) => [
                ...prev,
                {
                  id: `sys_${Date.now()}_${Math.random()}`,
                  type: 'system',
                  content: event.content,
                  timestamp: new Date().toISOString(),
                },
              ]);
            } else if (event.type === 'ensemble_info') {
              setLogs((prev) => [
                ...prev,
                {
                  id: `ens_${Date.now()}_${Math.random()}`,
                  type: 'ensemble_info',
                  content: event.info || event.content,
                  timestamp: new Date().toISOString(),
                },
              ]);
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `ens_${Date.now()}_${Math.random()}`,
                  role: 'ensemble',
                  content: event.info || event.content,
                  timestamp: Date.now(),
                },
              ]);
            } else if (event.type === 'ensemble_data') {
              setLogs((prev) => [
                ...prev,
                {
                  id: `ens_data_${Date.now()}_${Math.random()}`,
                  type: 'ensemble_data',
                  ensembleData: event.data,
                  timestamp: new Date().toISOString(),
                },
              ]);
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `ens_data_${Date.now()}_${Math.random()}`,
                  role: 'ensemble',
                  content: `Multi-Model Agreement: ${Math.round(event.data.agreementScore * 100)}% Consensus`,
                  ensembleData: event.data,
                  timestamp: Date.now(),
                },
              ]);
            } else if (event.type === 'context_info') {
              setLogs((prev) => [
                ...prev,
                {
                  id: `ctx_${Date.now()}_${Math.random()}`,
                  type: 'context_info',
                  content: event.info || event.content,
                  timestamp: new Date().toISOString(),
                },
              ]);
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `ctx_${Date.now()}_${Math.random()}`,
                  role: 'context',
                  content: event.info || event.content,
                  timestamp: Date.now(),
                },
              ]);
            } else if (event.type === 'text') {
              currentAssistantText += event.content || '';

              // Update terminal logs
              setLogs((prev) => {
                const existing = prev.find((l) => l.id === assistantLogId);
                if (existing) {
                  return prev.map((l) =>
                    l.id === assistantLogId ? { ...l, content: currentAssistantText } : l
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: assistantLogId,
                      type: 'assistant',
                      content: currentAssistantText,
                      timestamp: new Date().toISOString(),
                    },
                  ];
                }
              });

              // Update Codex chat messages
              setChatMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantLogId);
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantLogId ? { ...m, content: currentAssistantText, isStreaming: true } : m
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: assistantLogId,
                      role: 'assistant',
                      content: currentAssistantText,
                      timestamp: Date.now(),
                      isStreaming: true,
                    },
                  ];
                }
              });
            } else if (event.type === 'file_created') {
              // Real-time file creation event
              setActiveActivity(`📄 Creating file: ${event.path}`);
              memory.rememberFile(event.path, event.content || '');
              setMemoryStats(memory.getStats());
              if (event.path.endsWith('.html') || event.path.endsWith('.css') || event.path.endsWith('.js') || event.path.endsWith('.jsx')) {
                showToast('👁️ Preview ready — web files generated', 'VIEW', () => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setMobileTab('preview');
                    setPreviewMode('preview');
                  } else {
                    setPreviewMode('split');
                  }
                });
              }
              setWorkspaceFiles((prev) => {
                if (prev.some((f) => f.path === event.path)) return prev;
                return [
                  ...prev,
                  {
                    name: event.path.split('/').pop() || event.path,
                    path: event.path,
                    size: (event.content || '').length,
                    isDirectory: false,
                    updatedAt: new Date().toISOString(),
                  },
                ];
              });
              streamCodeToEditor(event.path, event.content || '');
            } else if (event.type === 'folder_created') {
              // Real-time folder creation event
              setActiveActivity(`📁 Creating folder: ${event.path}`);
              setWorkspaceFiles((prev) => {
                if (prev.some((f) => f.path === event.path)) return prev;
                return [
                  ...prev,
                  {
                    name: event.path.split('/').pop() || event.path,
                    path: event.path,
                    size: 0,
                    isDirectory: true,
                    updatedAt: new Date().toISOString(),
                  },
                ];
              });
            } else if (event.type === 'file_updated') {
              setActiveActivity(`✍️ Writing code: ${event.path} (streaming...)`);
              memory.rememberFile(event.path, event.content || '');
              setMemoryStats(memory.getStats());
              if (event.path.endsWith('.html') || event.path.endsWith('.css') || event.path.endsWith('.js') || event.path.endsWith('.jsx')) {
                showToast('👁️ Preview ready — web files updated', 'VIEW', () => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setMobileTab('preview');
                    setPreviewMode('preview');
                  } else {
                    setPreviewMode('split');
                  }
                });
              }
              streamCodeToEditor(event.path, event.content || '');
            } else if (event.type === 'file_deleted') {
              memory.removeFile(event.path);
              setMemoryStats(memory.getStats());
              setWorkspaceFiles((prev) => prev.filter((f) => f.path !== event.path));
              if (activeFile === event.path) {
                setActiveFile(null);
                setFileContent('');
              }
            } else if (event.type === 'activity_log') {
              setActiveActivity(event.message);
            } else if (event.type === 'tool_execution') {
              const toolId = `tool_${event.name}_${event.iteration || 1}`;

              // Terminal logs
              setLogs((prev) => {
                const existing = prev.find((l) => l.id === toolId);
                if (event.status === 'started') {
                  if (existing) return prev;
                  return [
                    ...prev,
                    {
                      id: toolId,
                      type: 'tool_started',
                      toolName: event.name,
                      toolArgs: event.args,
                      iteration: event.iteration,
                      timestamp: new Date().toISOString(),
                    },
                  ];
                } else if (event.status === 'completed') {
                  if (existing) {
                    return prev.map((l) =>
                      l.id === toolId
                        ? {
                            ...l,
                            type: 'tool_completed',
                            toolResult: event.result,
                          }
                        : l
                    );
                  } else {
                    return [
                      ...prev,
                      {
                        id: toolId,
                        type: 'tool_completed',
                        toolName: event.name,
                        toolArgs: event.args,
                        toolResult: event.result,
                        iteration: event.iteration,
                        timestamp: new Date().toISOString(),
                      },
                    ];
                  }
                }
                return prev;
              });

              // Add to Codex chat when completed
              if (event.status === 'completed') {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    id: `tool_${Date.now()}_${Math.random()}`,
                    role: 'tool',
                    content: event.result || '(Executed successfully)',
                    toolName: event.name,
                    timestamp: Date.now(),
                  },
                ]);

                // Auto refresh files in workspace if file tool was used
                if (['create_file', 'create_folder', 'write_file', 'write_to_file', 'delete_file', 'clear_workspace', 'replace_in_file'].includes(event.name)) {
                  fetchWorkspaceFiles();
                  if (event.args?.path && activeFile === event.args.path) {
                    loadFileContent(event.args.path);
                  }
                }
              }
            } else if (event.type === 'error') {
              setLogs((prev) => [
                ...prev,
                {
                  id: `err_${Date.now()}`,
                  type: 'error',
                  content: event.content || 'Error during execution',
                  timestamp: new Date().toISOString(),
                },
              ]);
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `err_${Date.now()}`,
                  role: 'assistant',
                  content: `Error: ${event.content || 'Error during execution'}`,
                  timestamp: Date.now(),
                },
              ]);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Mark streaming complete
      setChatMessages((prev) =>
        prev.map((m) => (m.id === assistantLogId ? { ...m, isStreaming: false } : m))
      );
      if (currentAssistantText.trim()) {
        memory.rememberAIResponse(currentAssistantText, Date.now());
        setMemoryStats(memory.getStats());
        setConversations(memory.getConversationsList());
      }
      if (mobileTab !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
      fetchWorkspaceFiles();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLogs((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            type: 'error',
            content: err.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `Error: ${err.message}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div
      className="flex flex-col h-screen w-screen text-[#e8fbff] overflow-hidden font-rajdhani select-none transition-colors duration-300 relative"
      style={{ backgroundColor: 'var(--bg-primary, #000000)' }}
    >
      {/* 1. Perspective Grid Floor for Neon Cyber */}
      {theme === 'neon-cyber' && <div className="neon-grid" />}

      {/* 2. Fixed Corner HUD Brackets for Neon Cyber */}
      {theme === 'neon-cyber' && (
        <>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-tr" />
          <div className="hud-corner hud-corner-bl" />
          <div className="hud-corner hud-corner-br" />
        </>
      )}

      {/* Top Application Bar */}
      <TopBar
        mode={mode}
        onSelectMode={setMode}
        onlineCount={onlineCount}
        activeView={activeView}
        onChangeView={setActiveView}
        theme={theme}
        onChangeTheme={handleThemeChange}
        onOpenMemory={() => setShowMemoryModal(true)}
        memoryStats={memoryStats}
        onOpenOrchestrator={() => setShowOrchestratorModal(true)}
        onOpenArchitecture={() => setShowArchModal(true)}
        onOpenContext={() => setShowContextModal(true)}
        onOpenBenchmark={() => setShowBenchmarkModal(true)}
        onOpenGit={() => setShowGitModal(true)}
        onOpenDeploy={() => {
          setDeployModalTab('workspace');
          setShowDeployModal(true);
        }}
        onOpenCustomDeploy={() => {
          setDeployModalTab('custom-zip');
          setShowDeployModal(true);
        }}
        onOpenAPK={() => setShowAPKModal(true)}
        onOpenLanguages={() => setShowLanguagesModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        previewMode={previewMode}
        onTogglePreview={handleTogglePreview}
      />

      {/* Persistent Memory Recovery Banner */}
      {welcomeNotice && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-purple-950/80 border-b border-cyan-500/30 px-4 py-2 text-xs font-mono text-cyan-300 flex items-center justify-between shadow-lg backdrop-blur-md z-40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{welcomeNotice}</span>
          </div>
          <button
            onClick={() => setWelcomeNotice(null)}
            className="text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'codex' && (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Desktop Layout (md:flex) */}
            <div className="hidden md:flex flex-1 overflow-hidden">
              {/* Left: File Tree */}
              <FileTree
                files={workspaceFiles}
                activeFile={activeFile}
                onSelectFile={loadFileContent}
                onRefresh={fetchWorkspaceFiles}
                isRefreshing={isRefreshingFiles}
                onClearWorkspace={handleClearWorkspace}
                onPromptClick={handleSubmitPrompt}
              />

              {/* Center: Code Editor / Split Preview / Full Preview */}
              {previewMode === 'code' && (
                <CodeEditor
                  activeFile={activeFile}
                  fileContent={fileContent}
                  onChangeContent={setFileContent}
                  onSaveFile={handleSaveActiveFile}
                  isSaving={isSavingFile}
                  isStreaming={isStreamingCode}
                  activeActivity={activeActivity}
                  onPromptClick={handleSubmitPrompt}
                  theme={theme}
                  previewMode={previewMode}
                  onChangePreviewMode={setPreviewMode}
                />
              )}

              {previewMode === 'split' && (
                <div className="flex-1 flex overflow-hidden min-w-0">
                  <div className="w-1/2 flex flex-col min-w-0 border-r border-cyan-500/30">
                    <CodeEditor
                      activeFile={activeFile}
                      fileContent={fileContent}
                      onChangeContent={setFileContent}
                      onSaveFile={handleSaveActiveFile}
                      isSaving={isSavingFile}
                      isStreaming={isStreamingCode}
                      activeActivity={activeActivity}
                      onPromptClick={handleSubmitPrompt}
                      theme={theme}
                      previewMode={previewMode}
                      onChangePreviewMode={setPreviewMode}
                    />
                  </div>
                  <div className="w-1/2 flex flex-col min-w-0">
                    <LivePreviewPanel
                      files={workspaceFiles}
                      activeFile={activeFile}
                      fileContent={fileContent}
                      previewMode={previewMode}
                      onClose={() => setPreviewMode('code')}
                      onChangeMode={setPreviewMode}
                    />
                  </div>
                </div>
              )}

              {previewMode === 'preview' && (
                <div className="flex-1 flex flex-col min-w-0">
                  <LivePreviewPanel
                    files={workspaceFiles}
                    activeFile={activeFile}
                    fileContent={fileContent}
                    previewMode={previewMode}
                    onClose={() => setPreviewMode('code')}
                    onChangeMode={setPreviewMode}
                  />
                </div>
              )}

              {/* Right: Chat Panel (Streaming SSE) */}
              <ChatPanel
                messages={chatMessages}
                onSendMessage={handleSubmitPrompt}
                onClearMessages={handleClearLogs}
                onCancelExecution={handleCancelExecution}
                isLoading={isLoading}
                mode={mode}
                onOpenMemory={() => setShowMemoryModal(true)}
                onAddLocalSystemMessage={(msg) => setChatMessages((prev) => [...prev, msg])}
                onNewConversation={handleNewConversation}
                onOpenHistory={() => setShowHistoryDrawer(true)}
              />
            </div>

            {/* Mobile Layout (< md) */}
            <div className="flex-1 flex flex-col md:hidden overflow-hidden pb-14">
              {mobileTab === 'files' && (
                <FileTree
                  files={workspaceFiles}
                  activeFile={activeFile}
                  onSelectFile={(path) => {
                    loadFileContent(path);
                    setMobileTab('code');
                  }}
                  onRefresh={fetchWorkspaceFiles}
                  isRefreshing={isRefreshingFiles}
                  onClearWorkspace={handleClearWorkspace}
                  onPromptClick={handleSubmitPrompt}
                />
              )}

              {mobileTab === 'code' && (
                <CodeEditor
                  activeFile={activeFile}
                  fileContent={fileContent}
                  onChangeContent={setFileContent}
                  onSaveFile={handleSaveActiveFile}
                  isSaving={isSavingFile}
                  isStreaming={isStreamingCode}
                  activeActivity={activeActivity}
                  onPromptClick={handleSubmitPrompt}
                  theme={theme}
                  previewMode={previewMode}
                  onChangePreviewMode={(mode) => {
                    setPreviewMode(mode);
                    if (mode === 'preview') setMobileTab('preview');
                  }}
                />
              )}

              {mobileTab === 'preview' && (
                <LivePreviewPanel
                  files={workspaceFiles}
                  activeFile={activeFile}
                  fileContent={fileContent}
                  previewMode={previewMode}
                  onClose={() => setMobileTab('code')}
                  onChangeMode={(mode) => {
                    setPreviewMode(mode);
                    if (mode === 'code') setMobileTab('code');
                  }}
                  isMobileFullscreen={true}
                />
              )}

              {mobileTab === 'chat' && (
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={handleSubmitPrompt}
                  onClearMessages={handleClearLogs}
                  onCancelExecution={handleCancelExecution}
                  isLoading={isLoading}
                  mode={mode}
                  onOpenMemory={() => setShowMemoryModal(true)}
                  onAddLocalSystemMessage={(msg) => setChatMessages((prev) => [...prev, msg])}
                  onNewConversation={handleNewConversation}
                  onOpenHistory={() => setShowHistoryDrawer(true)}
                />
              )}
            </div>
          </div>
        )}

        {activeView === 'terminal' && (
          <div className="h-full p-3 max-w-6xl w-full mx-auto">
            <Terminal
              logs={logs}
              isLoading={isLoading}
              activeProvider={provider}
              mode={mode}
              onlineCount={onlineCount}
              onSwitchMode={cycleMode}
              onOpenOrchestrator={() => setShowOrchestratorModal(true)}
              onSubmitPrompt={handleSubmitPrompt}
              onClearLogs={handleClearLogs}
              onCancelExecution={handleCancelExecution}
            />
          </div>
        )}

        {activeView === 'workspace' && (
          <div className="h-full p-3 max-w-6xl w-full mx-auto">
            <WorkspaceExplorer
              onRunScript={(cmd) => {
                setActiveView('terminal');
                handleSubmitPrompt(`Execute command: ${cmd}`);
              }}
            />
          </div>
        )}
      </main>

      {/* Bottom: Live Model Dashboard (Phase 3) */}
      <ModelDashboard
        mode={mode}
        onlineCount={onlineCount}
        onOpenOrchestrator={() => setShowOrchestratorModal(true)}
        onProbe={probeModels}
        models={modelStatuses}
        theme={theme}
        memoryStats={memoryStats}
        onOpenMemory={() => setShowMemoryModal(true)}
      />

      {/* Modals */}
      <MemoryModal
        isOpen={showMemoryModal}
        onClose={() => {
          setShowMemoryModal(false);
          setMemoryStats(memory.getStats());
        }}
        onMemoryUpdated={() => {
          setMemoryStats(memory.getStats());
          setWorkspaceFiles(
            memory.getSavedFiles().map((f) => ({
              name: f.path.split('/').pop() || f.path,
              path: f.path,
              size: f.size,
              isDirectory: false,
              updatedAt: new Date(f.updatedAt).toISOString(),
            }))
          );
        }}
        onOpenFile={(path) => loadFileContent(path)}
      />

      <OrchestratorModal
        isOpen={showOrchestratorModal}
        onClose={() => setShowOrchestratorModal(false)}
        mode={mode}
        onSelectMode={(m) => {
          setMode(m);
          setLogs((prev) => [
            ...prev,
            {
              id: `sys_${Date.now()}`,
              type: 'system',
              content: `⚡ Mode set to: ${m.toUpperCase()}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }}
      />

      <ArchitectureModal
        isOpen={showArchModal}
        onClose={() => setShowArchModal(false)}
      />

      <ContextModal
        isOpen={showContextModal}
        onClose={() => setShowContextModal(false)}
        onSelectFile={(p) => loadFileContent(p)}
      />

      <BenchmarkModal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
      />

      <GitModal
        isOpen={showGitModal}
        onClose={() => setShowGitModal(false)}
      />

      <DeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        projectName="altrex-workspace"
        initialTab={deployModalTab}
      />

      <APKModal
        isOpen={showAPKModal}
        onClose={() => setShowAPKModal(false)}
        defaultAppName="ALTREX App"
      />

      <LanguagesModal
        isOpen={showLanguagesModal}
        onClose={() => setShowLanguagesModal(false)}
        onSelectLanguage={(lang) => {
          if (lang.template) {
            setFileContent(lang.template);
            setActiveFile(lang.templateFileName);
          }
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentProvider={provider}
        onSelectProvider={(p) => setProvider(p as any)}
        xkiroKey={xkiroKey}
        setXkiroKey={setXkiroKey}
        groqKey={groqKey}
        setGroqKey={setGroqKey}
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
      />

      {/* Phase 7.2: Fixed Mobile Bottom Tab Bar */}
      {activeView === 'codex' && (
        <MobileTabBar
          activeTab={mobileTab}
          onSelectTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'chat') {
              setUnreadChatCount(0);
            }
          }}
          unreadChatCount={unreadChatCount}
        />
      )}

      {/* Phase 7.2: Session History & Past Conversations Drawer */}
      <ConversationDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        conversations={conversations}
        activeId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Phase 7.2: Neon Notification Toast */}
      {toastNotification && (
        <div className="fixed top-14 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/95 border border-cyan-400 text-xs font-mono text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.4)] backdrop-blur-xl animate-bounce-short">
          <span className="font-rajdhani font-semibold text-white tracking-wide text-sm">
            {toastNotification.message}
          </span>
          {toastNotification.actionText && toastNotification.onAction && (
            <button
              onClick={() => {
                toastNotification.onAction?.();
                setToastNotification(null);
              }}
              className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 font-rajdhani font-bold cursor-pointer hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all"
            >
              [{toastNotification.actionText}]
            </button>
          )}
          <button
            onClick={() => setToastNotification(null)}
            className="text-zinc-500 hover:text-white ml-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
