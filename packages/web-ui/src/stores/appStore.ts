import { create } from 'zustand';
import { AgentMode, ChatMessage, ModelInfo, FileNode } from '../lib/types.js';

interface AppState {
  // Mode
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (content: string) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;

  // Models
  models: ModelInfo[];
  setModels: (models: ModelInfo[]) => void;
  onlineCount: number;

  // Files
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  activeFile: string | null;
  setActiveFile: (path: string | null) => void;
  fileContent: string;
  setFileContent: (content: string) => void;

  // Editor
  diffView: boolean;
  setDiffView: (v: boolean) => void;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Mode
  mode: 'balanced',
  setMode: (mode) => set({ mode }),

  // Chat
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistant: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = [...msgs].reverse().findIndex((m) => m.role === 'assistant');
      const actualIdx = lastIdx >= 0 ? msgs.length - 1 - lastIdx : -1;
      if (actualIdx >= 0) {
        msgs[actualIdx] = { ...msgs[actualIdx], content };
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),
  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),

  // Models
  models: [],
  setModels: (models) =>
    set({ models, onlineCount: models.filter((m) => m.online).length }),
  onlineCount: 0,

  // Files
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  activeFile: null,
  setActiveFile: (path) => set({ activeFile: path }),
  fileContent: '',
  setFileContent: (content) => set({ fileContent: content }),

  // Editor
  diffView: false,
  setDiffView: (v) => set({ diffView: v }),
  isSaving: false,
  setIsSaving: (v) => set({ isSaving: v }),
}));
