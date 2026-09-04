import { AppTheme, AgentMode, WorkspaceFile, ConversationItem } from '../types.js';
import { ChatMessageItem } from '../components/codex/Message.js';

export interface PersistentMemorySchema {
  version: number;
  preferences: {
    theme: AppTheme;
    mode: AgentMode;
    activeView: 'codex' | 'terminal' | 'workspace';
    editorFontSize: number;
    provider: string;
    apiKeys: {
      xkiroKey?: string;
      groqKey?: string;
      ollamaUrl?: string;
    };
  };
  projectState: {
    savedFiles: {
      path: string;
      content: string;
      language?: string;
      updatedAt: string;
      size: number;
    }[];
    activeFile: string | null;
  };
  conversations: ChatMessageItem[];
  totalMessages: number;
  lastActivity: number;
  aiBrain: {
    facts: string[];
    userPreferences: Record<string, any>;
    projectContextSummary: string;
  };
}

class AltrexMemory {
  private readonly storageKey = 'altrex_memory_v1';
  private readonly convStorageKey = 'altrex_conversations_v1';
  private readonly activeConvIdKey = 'altrex_active_conv_id';
  private persistentData: PersistentMemorySchema;
  private conversationsList: ConversationItem[] = [];
  private activeConversationId: string = '';
  private saveTimeout: any = null;

  constructor() {
    this.persistentData = this.loadFromStorage();
    this.initConversations();
  }

  private initConversations() {
    if (typeof window === 'undefined' || !window.localStorage) {
      this.conversationsList = [
        {
          id: 'conv_default',
          title: 'Workspace Session',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [...(this.persistentData.conversations || [])],
        },
      ];
      this.activeConversationId = 'conv_default';
      return;
    }

    try {
      const raw = localStorage.getItem(this.convStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.conversationsList = parsed;
        }
      }
    } catch {}

    if (this.conversationsList.length === 0) {
      const initConv: ConversationItem = {
        id: `conv_${Date.now()}`,
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [...(this.persistentData.conversations || [])],
      };
      this.conversationsList = [initConv];
    }

    const savedActiveId = localStorage.getItem(this.activeConvIdKey);
    if (savedActiveId && this.conversationsList.some((c) => c.id === savedActiveId)) {
      this.activeConversationId = savedActiveId;
      const found = this.conversationsList.find((c) => c.id === savedActiveId);
      if (found && found.messages) {
        this.persistentData.conversations = [...found.messages];
      }
    } else {
      this.activeConversationId = this.conversationsList[0].id;
      this.persistentData.conversations = [...this.conversationsList[0].messages];
    }
  }

  private saveConversationsList() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.convStorageKey, JSON.stringify(this.conversationsList));
      localStorage.setItem(this.activeConvIdKey, this.activeConversationId);
    } catch (err) {
      console.warn('Failed to save conversations list', err);
    }
  }

  private getDefaultMemory(): PersistentMemorySchema {
    return {
      version: 1,
      preferences: {
        theme: 'neon-cyber',
        mode: 'balanced',
        activeView: 'codex',
        editorFontSize: 13,
        provider: 'xkiro',
        apiKeys: {
          xkiroKey: 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d',
          ollamaUrl: 'http://localhost:11434/v1',
        },
      },
      projectState: {
        savedFiles: [],
        activeFile: null,
      },
      conversations: [],
      totalMessages: 0,
      lastActivity: Date.now(),
      aiBrain: {
        facts: [
          'User is developing in ALTREX CODE Phase 6 IDE with Universal Language & Edge Deployment support.',
        ],
        userPreferences: {
          autoFormat: true,
          showLineNumbers: true,
        },
        projectContextSummary: 'Initial empty workspace ready for on-demand live generation.',
      },
    };
  }

  private loadFromStorage(): PersistentMemorySchema {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.getDefaultMemory();
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.getDefaultMemory();
      const parsed = JSON.parse(raw);
      const loadedTheme = parsed.preferences?.theme;
      const themeToUse = (!loadedTheme || loadedTheme === 'altrex-cyber') ? 'neon-cyber' : loadedTheme;
      return {
        ...this.getDefaultMemory(),
        ...parsed,
        preferences: {
          ...this.getDefaultMemory().preferences,
          ...(parsed.preferences || {}),
          theme: themeToUse,
        },
        projectState: {
          ...this.getDefaultMemory().projectState,
          ...(parsed.projectState || {}),
        },
        aiBrain: {
          ...this.getDefaultMemory().aiBrain,
          ...(parsed.aiBrain || {}),
        },
      };
    } catch {
      return this.getDefaultMemory();
    }
  }

  // Save to localStorage with debounce
  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.forceSave();
    }, 400);
  }

  public forceSave() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      this.persistentData.lastActivity = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.persistentData));
    } catch (err) {
      console.warn('AltrexMemory: Failed to persist to localStorage (quota or disabled)', err);
    }
  }

  // --- Conversations ---
  public getConversationsList(): ConversationItem[] {
    return [...this.conversationsList];
  }

  public getActiveConversationId(): string {
    return this.activeConversationId;
  }

  public getActiveConversation(): ConversationItem {
    let conv = this.conversationsList.find((c) => c.id === this.activeConversationId);
    if (!conv) {
      if (this.conversationsList.length > 0) {
        conv = this.conversationsList[0];
        this.activeConversationId = conv.id;
      } else {
        conv = this.createNewConversation('New Conversation');
      }
    }
    return conv;
  }

  public setActiveConversationId(id: string): ConversationItem | null {
    const conv = this.conversationsList.find((c) => c.id === id);
    if (conv) {
      this.activeConversationId = id;
      this.persistentData.conversations = [...conv.messages];
      this.saveConversationsList();
      this.scheduleSave();
      return conv;
    }
    return null;
  }

  public createNewConversation(title: string = 'New Conversation'): ConversationItem {
    const newConv: ConversationItem = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    this.conversationsList.unshift(newConv);
    this.activeConversationId = newConv.id;
    this.persistentData.conversations = [];
    this.saveConversationsList();
    this.scheduleSave();
    return newConv;
  }

  public renameConversation(id: string, newTitle: string): void {
    const conv = this.conversationsList.find((c) => c.id === id);
    if (conv && newTitle.trim()) {
      conv.title = newTitle.trim();
      conv.updatedAt = Date.now();
      this.saveConversationsList();
    }
  }

  public deleteConversation(id: string): void {
    this.conversationsList = this.conversationsList.filter((c) => c.id !== id);
    if (this.conversationsList.length === 0) {
      this.createNewConversation('New Conversation');
    } else if (this.activeConversationId === id) {
      this.activeConversationId = this.conversationsList[0].id;
      this.persistentData.conversations = [...this.conversationsList[0].messages];
    }
    this.saveConversationsList();
    this.scheduleSave();
  }

  private syncActiveConv(messages: ChatMessageItem[]) {
    const conv = this.conversationsList.find((c) => c.id === this.activeConversationId);
    if (conv) {
      conv.messages = [...messages];
      conv.updatedAt = Date.now();
      // Auto-title if it's default title and user has asked something
      if (conv.title === 'New Conversation' || conv.title === 'Initial Session' || conv.title === 'Workspace Session') {
        const firstUser = messages.find((m) => m.role === 'user');
        if (firstUser && firstUser.content) {
          const clean = firstUser.content.trim().replace(/^[\n\r]+/, '');
          conv.title = clean.slice(0, 32) + (clean.length > 32 ? '...' : '');
        }
      }
    }
    this.saveConversationsList();
  }

  public rememberUserMessage(message: string, timestamp: number = Date.now()): ChatMessageItem {
    const item: ChatMessageItem = {
      id: `msg_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: message,
      timestamp,
    };
    this.persistentData.conversations.push(item);
    this.persistentData.totalMessages++;
    this.persistentData.lastActivity = timestamp;
    this.syncActiveConv(this.persistentData.conversations);
    this.scheduleSave();
    return item;
  }

  public rememberAIResponse(
    response: string,
    timestamp: number = Date.now(),
    toolName?: string,
    ensembleData?: any
  ): ChatMessageItem {
    const item: ChatMessageItem = {
      id: `msg_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: toolName ? 'tool' : 'assistant',
      content: response,
      timestamp,
      toolName,
      ensembleData,
    };
    this.persistentData.conversations.push(item);
    this.persistentData.totalMessages++;
    this.persistentData.lastActivity = timestamp;
    this.syncActiveConv(this.persistentData.conversations);
    this.scheduleSave();
    return item;
  }

  public setConversations(messages: ChatMessageItem[]) {
    this.persistentData.conversations = [...messages];
    this.persistentData.totalMessages = messages.length;
    this.syncActiveConv(messages);
    this.scheduleSave();
  }

  public getConversations(): ChatMessageItem[] {
    return [...this.persistentData.conversations];
  }

  public clearConversations() {
    this.persistentData.conversations = [];
    this.syncActiveConv([]);
    this.scheduleSave();
  }

  // --- Files & Workspace ---
  public rememberFile(path: string, content: string, language?: string) {
    const existingIdx = this.persistentData.projectState.savedFiles.findIndex((f) => f.path === path);
    const fileObj = {
      path,
      content,
      language,
      updatedAt: new Date().toISOString(),
      size: content.length,
    };

    if (existingIdx >= 0) {
      this.persistentData.projectState.savedFiles[existingIdx] = fileObj;
    } else {
      this.persistentData.projectState.savedFiles.push(fileObj);
    }

    this.persistentData.projectState.activeFile = path;
    this.scheduleSave();
  }

  public removeFile(path: string) {
    this.persistentData.projectState.savedFiles = this.persistentData.projectState.savedFiles.filter(
      (f) => f.path !== path
    );
    if (this.persistentData.projectState.activeFile === path) {
      this.persistentData.projectState.activeFile = null;
    }
    this.scheduleSave();
  }

  public getSavedFiles(): { path: string; content: string; language?: string; updatedAt: string; size: number }[] {
    return [...this.persistentData.projectState.savedFiles];
  }

  public getActiveFile(): string | null {
    return this.persistentData.projectState.activeFile;
  }

  public setActiveFile(path: string | null) {
    this.persistentData.projectState.activeFile = path;
    this.scheduleSave();
  }

  public clearWorkspaceFiles() {
    this.persistentData.projectState.savedFiles = [];
    this.persistentData.projectState.activeFile = null;
    this.scheduleSave();
  }

  // --- User Preferences ---
  public rememberPreference<K extends keyof PersistentMemorySchema['preferences']>(
    key: K,
    value: PersistentMemorySchema['preferences'][K]
  ) {
    this.persistentData.preferences[key] = value;
    this.scheduleSave();
  }

  public getPreference<K extends keyof PersistentMemorySchema['preferences']>(
    key: K,
    defaultValue?: PersistentMemorySchema['preferences'][K]
  ): PersistentMemorySchema['preferences'][K] {
    const val = this.persistentData.preferences[key];
    return val !== undefined ? val : (defaultValue as any);
  }

  // --- AI Brain & Facts ---
  public rememberFact(fact: string): boolean {
    if (!fact || !fact.trim()) return false;
    const clean = fact.trim();
    if (!this.persistentData.aiBrain.facts.includes(clean)) {
      this.persistentData.aiBrain.facts.push(clean);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public removeFact(index: number): boolean {
    if (index >= 0 && index < this.persistentData.aiBrain.facts.length) {
      this.persistentData.aiBrain.facts.splice(index, 1);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public getFacts(): string[] {
    return [...this.persistentData.aiBrain.facts];
  }

  // Build context summary to inject into server LLM prompt
  public getAIBrainSummary(): string {
    const files = this.persistentData.projectState.savedFiles.map((f) => f.path);
    const facts = this.persistentData.aiBrain.facts;
    const recent = this.persistentData.conversations.slice(-8);

    return `
PERSISTENT MEMORY & PROJECT CONTEXT:
- Active Theme: ${this.persistentData.preferences.theme}
- Active Mode: ${this.persistentData.preferences.mode}
- Files in workspace (${files.length}): ${files.length > 0 ? files.join(', ') : 'None (clean workspace)'}
- Stored AI Brain Facts (${facts.length}):
${facts.map((f) => `  • ${f}`).join('\n')}
- Total Session Turns: ${this.persistentData.totalMessages}
- Last Active: ${new Date(this.persistentData.lastActivity).toLocaleString()}
RECENT HISTORY SUMMARY:
${recent.map((m) => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 150)}`).join('\n')}
`.trim();
  }

  // Formats last N messages for context injection
  public getConversationContext(maxMessages = 20): { role: string; content: string }[] {
    return this.persistentData.conversations
      .slice(-maxMessages)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'tool' ? 'tool' : 'user',
        content: m.content,
      }));
  }

  // Export / Import
  public exportMemory(): string {
    return JSON.stringify(this.persistentData, null, 2);
  }

  public importMemory(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Invalid JSON format' };
      }
      this.persistentData = {
        ...this.getDefaultMemory(),
        ...parsed,
        preferences: {
          ...this.getDefaultMemory().preferences,
          ...(parsed.preferences || {}),
        },
        projectState: {
          ...this.getDefaultMemory().projectState,
          ...(parsed.projectState || {}),
        },
        aiBrain: {
          ...this.getDefaultMemory().aiBrain,
          ...(parsed.aiBrain || {}),
        },
      };
      this.forceSave();
      return { success: true, message: 'Memory successfully restored from backup!' };
    } catch (err: any) {
      return { success: false, message: `Failed to import memory: ${err.message}` };
    }
  }

  public clearAllMemory() {
    this.persistentData = this.getDefaultMemory();
    this.forceSave();
  }

  public getStats() {
    return {
      totalFiles: this.persistentData.projectState.savedFiles.length,
      totalMessages: this.persistentData.conversations.length,
      lastActivity: this.persistentData.lastActivity,
      factsCount: this.persistentData.aiBrain.facts.length,
      theme: this.persistentData.preferences.theme,
      mode: this.persistentData.preferences.mode,
    };
  }
}

// Global Singleton Instance
export const memory = new AltrexMemory();
