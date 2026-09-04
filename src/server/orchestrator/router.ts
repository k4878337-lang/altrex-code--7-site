import { Message, ToolDefinition } from '../types.js';
import { BaseProvider } from '../providers.js';
import { ProviderRegistry } from './registry.js';

export type TaskType = 
  | 'code_generation' 
  | 'code_review' 
  | 'planning' 
  | 'refactoring' 
  | 'documentation' 
  | 'shell' 
  | 'general';

const ROUTING_TABLE: Record<TaskType, string[]> = {
  code_generation: ['xkiro', 'groq', 'gemini', 'ollama'],
  code_review: ['gemini', 'groq', 'xkiro'],
  planning: ['gemini', 'xkiro', 'groq'],
  refactoring: ['xkiro', 'groq', 'gemini'],
  documentation: ['gemini', 'groq', 'xkiro'],
  shell: ['xkiro', 'groq', 'ollama', 'gemini'],
  general: ['xkiro', 'gemini', 'groq'],
};

export class SmartRouter {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Returns the best available provider for a given task type
   */
  async route(taskType: TaskType): Promise<BaseProvider> {
    const preferred = ROUTING_TABLE[taskType] || ROUTING_TABLE.general;

    for (const name of preferred) {
      const status = this.registry.getStatus(name);
      const provider = this.registry.get(name);
      // If status exists and is online, or if not yet probed but provider exists
      if (provider && (status ? status.online : true)) {
        return provider;
      }
    }

    // Fallback 1: Return ANY registered online provider
    for (const provider of this.registry.getAll()) {
      const status = this.registry.getStatus(provider.name);
      if (status?.online) return provider;
    }

    // Fallback 2: Return first registered provider (e.g. xKiro)
    const all = this.registry.getAll();
    if (all.length > 0) return all[0];

    throw new Error('No providers are currently registered in the ProviderRegistry.');
  }

  /**
   * Classify a user prompt into a task type using keyword heuristics
   */
  classifyTask(prompt: string): TaskType {
    const lower = prompt.toLowerCase();
    if (/create|build|write|generate|implement|script|code|function|class/.test(lower)) return 'code_generation';
    if (/review|check|audit|find bug|security|vulnerability|inspect/.test(lower)) return 'code_review';
    if (/plan|architect|design|structure|approach|consensus|strategy/.test(lower)) return 'planning';
    if (/refactor|clean|optimize|improve|simplify|modernize/.test(lower)) return 'refactoring';
    if (/document|comment|explain|readme|tutorial|guide/.test(lower)) return 'documentation';
    if (/run|execute|install|npm|pip|shell|bash|terminal|command/.test(lower)) return 'shell';
    return 'general';
  }
}
