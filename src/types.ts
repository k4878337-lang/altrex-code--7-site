export type AgentMode = 'speed' | 'balanced' | 'deep';
export type AppTheme = 'neon-cyber' | 'altrex-cyber' | 'altrex-midnight' | 'altrex-ocean' | 'altrex-sunset' | 'altrex-matrix';
export type EditorPreviewMode = 'code' | 'split' | 'preview';
export type MobileTab = 'files' | 'code' | 'preview' | 'chat';

export interface ConversationItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: any[];
}

export interface ProviderStatus {
  name: string;
  providerId: string;
  online: boolean;
  latencyMs: number;
  lastChecked: number;
  model?: string;
  error?: string;
}

export interface EnsembleData {
  agreementScore: number;
  individualResponses: { provider: string; response: string }[];
}

export interface LogItem {
  id: string;
  type:
    | 'user'
    | 'assistant'
    | 'tool_started'
    | 'tool_completed'
    | 'ensemble_info'
    | 'ensemble_data'
    | 'context_info'
    | 'system'
    | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: string;
  ensembleData?: EnsembleData;
  iteration?: number;
  timestamp: string;
}

// === Phase 4: Context Intelligence Types ===

export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'function' | 'class' | 'method' | 'module' | 'block';
  name?: string;
  language: string;
  imports: string[];
  embedding?: number[];
}

export interface VectorSearchResult {
  chunk: CodeChunk;
  score: number;
  metadata: {
    filePath: string;
    relevance: number;
  };
}

export interface ContextSelection {
  files: { path: string; content: string; relevance: number }[];
  totalTokens: number;
  budget: number;
  strategy: string;
}

export interface LSPDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
}

export interface IndexStats {
  totalFiles: number;
  totalChunks: number;
  totalTokens: number;
  languages: Record<string, number>;
  lastIndexed: number;
  durationMs: number;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  updatedAt: string;
}

export interface ProviderOption {
  id: string;
  name: string;
  model: string;
  configured: boolean;
  description: string;
}

export interface AppConfig {
  providers: ProviderOption[];
  defaultProvider: string;
  workspacePath: string;
}

// === Phase 5: Complete Suite Types ===

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  isClean: boolean;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface PRDescription {
  title: string;
  summary: string;
  changes: string[];
  filesModified: string[];
  additions: number;
  deletions: number;
}

export interface BenchmarkResult {
  provider: string;
  model: string;
  response: string;
  latencyMs: number;
  tokenCount: number;
  tokensPerSecond: number;
  success: boolean;
  error?: string;
}

export interface BenchmarkReport {
  prompt: string;
  results: BenchmarkResult[];
  bestLatency?: BenchmarkResult;
  bestQuality?: BenchmarkResult;
  timestamp: number;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'provider' | 'tool' | 'ui';
  entry: string;
  config?: Record<string, any>;
}

export interface SandboxStatus {
  dockerAvailable: boolean;
  isolationMode: 'docker' | 'process-isolated';
  memoryLimit: string;
  timeoutMs: number;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  killed: boolean;
  isolation: 'docker' | 'process';
}

// Phase 6: Universal Language, Deploy & APK Types
export interface LanguageInfo {
  id: string;
  name: string;
  category: 'web' | 'systems' | 'scripting' | 'mobile' | 'data' | 'markup' | 'ops';
  extensions: string[];
  monacoId: string;
  preview: 'web' | 'run-output' | 'compile-run' | 'server' | 'image' | 'canvas' | 'notebook' | 'mobile' | 'none';
  icon: string;
  description: string;
  template?: string;
  templateFileName?: string;
}

export type DeployPlatformType = 'auto-fallback' | 'vercel' | 'netlify' | 'github-pages' | 'neocities' | 'cloudflare-pages' | 'surge';

export interface PlatformTokens {
  vercel?: string;
  netlify?: string;
  github?: string;
  cloudflareToken?: string;
  cloudflareAccountId?: string;
  neocitiesUser?: string;
  neocitiesPass?: string;
}

export interface TokenTestResult {
  platform: string;
  valid: boolean;
  username?: string;
  error?: string;
}

export interface DeployResultData {
  success: boolean;
  url?: string;
  platform: string;
  message: string;
  is247: boolean;
  deployedAt: string;
  logs?: string[];
  verifiedReady?: boolean;
  errorDetails?: {
    code?: string | number;
    reason: string;
    fixSuggestion: string;
  };
}

export interface APKResultData {
  success: boolean;
  appName: string;
  appId: string;
  versionName: string;
  apkPath?: string;
  fileName?: string;
  downloadUrl?: string;
  qrCodeData?: string;
  message: string;
  sizeBytes?: number;
  buildLogs: string[];
  workflowUrl?: string;
  repoUrl?: string;
  stage?: 'idle' | 'generating' | 'uploading' | 'dispatching' | 'building' | 'ready' | 'failed';
  errorDetails?: {
    reason: string;
    fixSuggestion: string;
  };
}

export interface CloudAPKJob {
  id: string;
  appName: string;
  appId: string;
  versionName: string;
  stage: 'idle' | 'generating' | 'uploading' | 'dispatching' | 'building' | 'ready' | 'failed';
  progressMsg: string;
  repoUrl?: string;
  workflowUrl?: string;
  downloadUrl?: string;
  qrCodeData?: string;
  fileName?: string;
  sizeBytes?: number;
  error?: string;
  errorReason?: string;
  errorFix?: string;
  logs: string[];
}

export interface UniversalPreviewData {
  type: 'web' | 'output' | 'apk' | 'none';
  htmlContent?: string;
  output?: string;
  exitCode?: number;
  durationMs?: number;
  language: string;
  error?: string;
}

