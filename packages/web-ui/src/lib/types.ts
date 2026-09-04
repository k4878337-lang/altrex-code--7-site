export type AgentMode = 'speed' | 'balanced' | 'deep';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'ensemble';
  content: string;
  timestamp: number;
  toolName?: string;
  isStreaming?: boolean;
  toolResult?: string;
  ensembleData?: {
    agreementScore: number;
    individualResponses: { provider: string; response: string }[];
  };
}

export interface ModelInfo {
  name: string;
  provider: string;
  online: boolean;
  latencyMs: number;
  taskType?: string;
  lastChecked?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}
