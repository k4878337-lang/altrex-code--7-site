import { Message, ToolCall, StreamChunk } from './types.js';
import { ProviderRegistry } from './orchestrator/registry.js';
import { SmartRouter, TaskType } from './orchestrator/router.js';
import { EnsembleEngine, EnsembleResult } from './orchestrator/ensemble.js';
import { CodebaseIntelligence } from './context/index.js';
import { toolDefinitions, executeTool } from './tools.js';

export type AgentMode = 'speed' | 'balanced' | 'deep';

export type AgentV3Event =
  | { type: 'text'; content: string; iteration?: number }
  | {
      type: 'tool_execution';
      name: string;
      args?: any;
      result: string;
      status?: 'started' | 'completed';
      iteration?: number;
    }
  | { type: 'file_created'; path: string; content: string; message: string }
  | { type: 'folder_created'; path: string; message: string }
  | { type: 'file_updated'; path: string; content: string; message: string }
  | { type: 'file_deleted'; path: string; message: string }
  | { type: 'activity_log'; icon?: string; message: string }
  | { type: 'ensemble_info'; info: string }
  | {
      type: 'ensemble_data';
      data: {
        agreementScore: number;
        individualResponses: { provider: string; response: string }[];
      };
    }
  | { type: 'context_info'; info: string }
  | { type: 'done'; content?: string }
  | { type: 'error'; content: string }
  | { type: 'system'; content: string };

export class AltrexAgentV3 {
  private messages: Message[] = [];
  private registry: ProviderRegistry;
  private router: SmartRouter;
  private ensemble: EnsembleEngine;
  private intelligence: CodebaseIntelligence;
  private mode: AgentMode;

  constructor(
    registry: ProviderRegistry,
    intelligence: CodebaseIntelligence,
    mode: AgentMode = 'balanced',
    initialHistory: Message[] = [],
    memoryContext?: string
  ) {
    this.registry = registry;
    this.intelligence = intelligence;
    this.router = new SmartRouter(registry);
    this.ensemble = new EnsembleEngine(registry);
    this.mode = mode;

    this.messages.push({
      role: 'system',
      content: this.buildSystemPrompt(memoryContext),
    });

    if (initialHistory.length > 0) {
      this.messages.push(...initialHistory);
    }
  }

  private buildSystemPrompt(memoryContext?: string): string {
    let prompt = `You are ALTREX CODE v3, an elite AI coding assistant powering a real-time live workspace.

CRITICAL DIRECTIVE — LIVE FILE GENERATION:
- When the user asks you to build, create, or modify an application, website, component, script, or feature:
  You MUST CREATE files and folders LIVE using tool calls:
  • create_folder(path): Create directory structures (e.g. src, components, assets)
  • create_file(path, content): Create files live (e.g. index.html, styles.css, app.js, main.py)
  • write_to_file(path, content): Update or overwrite file code
- Do NOT just explain code or print blocks in chat text without creating the actual files.
- The user is watching the File Explorer and Code Editor live in real-time. Every tool call immediately renders folders, auto-opens files, and streams code character-by-character before their eyes.
- Always provide complete, working, production-quality code in the content parameter (no placeholders or stubs).

ADDITIONAL CAPABILITIES:
- Tools: create_file, create_folder, write_to_file, read_file, delete_file, list_directory, search_files, execute_command, universal_preview, deploy_app, build_apk
- Think step-by-step and create files in logical order (e.g. HTML/core files first, then styles/logic, then run/test).`;

    if (memoryContext) {
      prompt += `\n\n=== PERSISTENT MEMORY & AI BRAIN CONTEXT ===\n${memoryContext}\nRespect all remembered user preferences and workspace facts throughout your responses.`;
    }

    return prompt;
  }

  setMode(mode: AgentMode) {
    this.mode = mode;
  }

  getMode(): AgentMode {
    return this.mode;
  }

  getMessages(): Message[] {
    return this.messages;
  }

  async *run(userInput: string): AsyncGenerator<AgentV3Event> {
    // Step 1: Codebase Context Retrieval
    yield { type: 'context_info', info: '🔍 Analyzing codebase context & semantic dependencies...' };

    let contextPrompt = '';
    try {
      const selection = await this.intelligence.getContext(userInput, 40000);
      if (selection.files.length > 0) {
        contextPrompt = this.intelligence.getContextPrompt(userInput, 40000) as any;
        if (typeof (contextPrompt as any)?.then === 'function') {
          contextPrompt = await contextPrompt;
        }

        const fileNames = selection.files.slice(0, 3).map((f) => f.path.split('/').pop()).join(', ');
        const more = selection.files.length > 3 ? ` +${selection.files.length - 3} more` : '';
        yield {
          type: 'context_info',
          info: `📚 Context loaded: ${selection.files.length} files (~${selection.totalTokens} tokens) [${fileNames}${more}]`,
        };
      } else {
        yield {
          type: 'context_info',
          info: 'ℹ️ No specific code dependencies detected in context search, proceeding with global workspace index.',
        };
      }
    } catch (err: any) {
      yield { type: 'context_info', info: '⚠️ Context retrieval skipped: proceeding with direct workspace tools.' };
    }

    // Step 2: Inject context into conversation
    if (contextPrompt) {
      this.messages.push({
        role: 'system',
        content: contextPrompt,
      });
    }

    this.messages.push({ role: 'user', content: userInput });

    // Step 3: Route and execute
    const taskType = this.router.classifyTask(userInput);
    let maxIterations = 6;
    let currentIteration = 0;

    yield {
      type: 'system',
      content: `Mode: ${this.mode.toUpperCase()} | Classified Task: ${taskType.toUpperCase()}`,
    };

    while (maxIterations > 0) {
      maxIterations--;
      currentIteration++;

      // === DEEP MODE: Multi-Model Ensemble Consensus on primary pass ===
      if (this.mode === 'deep' && currentIteration === 1) {
        yield {
          type: 'ensemble_info',
          info: `🧠 Deep Mode active: Dispatching parallel consensus across available models for ${taskType.toUpperCase()}...`,
        };

        try {
          const ensembleResult: EnsembleResult = await this.ensemble.runEnsemble(
            this.messages,
            {
              modelCount: 3,
              taskType,
              tools: toolDefinitions,
            }
          );

          yield {
            type: 'ensemble_data',
            data: {
              agreementScore: ensembleResult.agreementScore,
              individualResponses: ensembleResult.individualResponses,
            },
          };

          yield {
            type: 'ensemble_info',
            info: `Consensus reached (${(ensembleResult.agreementScore * 100).toFixed(0)}% agreement across ${ensembleResult.individualResponses.length} models)`,
          };

          yield {
            type: 'text',
            content: ensembleResult.finalResponse,
            iteration: currentIteration,
          };

          this.messages.push({
            role: 'assistant',
            content: ensembleResult.finalResponse,
          });

          yield { type: 'done', content: ensembleResult.finalResponse };
          return;
        } catch (err: any) {
          yield {
            type: 'ensemble_info',
            info: `Ensemble warning: Falling back to primary router (${err.message})`,
          };
        }
      }

      // === SPEED / BALANCED MODE: Smart Routing ===
      const provider = await this.router.route(taskType);
      let fullText = '';
      const toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;

      try {
        for await (const chunk of provider.chat(this.messages, toolDefinitions)) {
          if (chunk.type === 'text') {
            fullText += chunk.content;
            yield {
              type: 'text',
              content: chunk.content,
              iteration: currentIteration,
            };
          } else if (chunk.type === 'tool_call') {
            if (chunk.toolCall?.id) {
              currentToolCall = {
                id: chunk.toolCall.id,
                type: 'function',
                function: {
                  name: chunk.toolCall.function?.name || '',
                  arguments: chunk.toolCall.function?.arguments || '',
                },
              };
              toolCalls.push(currentToolCall as ToolCall);
            } else if (currentToolCall && chunk.toolCall?.function?.arguments) {
              currentToolCall.function!.arguments += chunk.toolCall.function.arguments;
            }
          } else if (chunk.type === 'error') {
            yield { type: 'error', content: chunk.error || 'Provider execution error' };
            return;
          }
        }
      } catch (err: any) {
        yield { type: 'error', content: `Execution failed: ${err.message}` };
        return;
      }

      // If no tool calls, completion is reached
      if (toolCalls.length === 0) {
        this.messages.push({
          role: 'assistant',
          content: fullText || '(Done)',
        });
        yield { type: 'done', content: fullText };
        return;
      }

      // Execute tool calls
      this.messages.push({
        role: 'assistant',
        content: fullText || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        let args: any = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {
          args = {};
        }

        yield {
          type: 'tool_execution',
          name: tc.function.name,
          args,
          result: '',
          status: 'started',
          iteration: currentIteration,
        };

        const result = await executeTool(tc.function.name, args);

        yield {
          type: 'tool_execution',
          name: tc.function.name,
          args,
          result,
          status: 'completed',
          iteration: currentIteration,
        };

        // Live file event emissions for instant UI updates
        if (tc.function.name === 'create_file') {
          yield {
            type: 'file_created',
            path: args.path,
            content: args.content || '',
            message: `📄 Creating file: ${args.path}`,
          };
        } else if (tc.function.name === 'create_folder') {
          yield {
            type: 'folder_created',
            path: args.path,
            message: `📁 Creating folder: ${args.path}`,
          };
        } else if (tc.function.name === 'write_file' || tc.function.name === 'write_to_file') {
          yield {
            type: 'file_updated',
            path: args.path,
            content: args.content || '',
            message: `✍️ Writing code: ${args.path}`,
          };
        } else if (tc.function.name === 'delete_file') {
          yield {
            type: 'file_deleted',
            path: args.path,
            message: `🗑️ Deleted: ${args.path}`,
          };
        } else if (tc.function.name === 'clear_workspace') {
          yield {
            type: 'activity_log',
            icon: '🧹',
            message: 'Workspace cleared to clean state.',
          };
        }

        this.messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    yield { type: 'done', content: 'Completed maximum ReAct iterations' };
  }
}
