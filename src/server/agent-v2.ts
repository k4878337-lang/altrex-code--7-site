import { Message, ToolCall, StreamChunk } from './types.js';
import { ProviderRegistry } from './orchestrator/registry.js';
import { SmartRouter, TaskType } from './orchestrator/router.js';
import { EnsembleEngine, EnsembleResult } from './orchestrator/ensemble.js';
import { toolDefinitions, executeTool } from './tools.js';

export type AgentMode = 'speed' | 'balanced' | 'deep';

export type AgentV2Event =
  | { type: 'text'; content: string; iteration?: number }
  | { type: 'tool_execution'; name: string; args?: any; result: string; status?: 'started' | 'completed'; iteration?: number }
  | { type: 'ensemble_info'; info: string }
  | { type: 'ensemble_data'; data: { agreementScore: number; individualResponses: { provider: string; response: string }[] } }
  | { type: 'done'; content?: string }
  | { type: 'error'; content: string }
  | { type: 'system'; content: string };

export class AltrexAgentV2 {
  private messages: Message[] = [];
  private registry: ProviderRegistry;
  private router: SmartRouter;
  private ensemble: EnsembleEngine;
  private mode: AgentMode;

  constructor(registry: ProviderRegistry, mode: AgentMode = 'balanced', initialHistory: Message[] = []) {
    this.registry = registry;
    this.router = new SmartRouter(registry);
    this.ensemble = new EnsembleEngine(registry);
    this.mode = mode;

    if (initialHistory.length > 0) {
      this.messages = [...initialHistory];
    } else {
      this.messages.push({
        role: 'system',
        content: `You are ALTREX CODE v2, an elite multi-model AI coding assistant.
You have access to 5 workspace tools: read_file, write_file, list_directory, search_files, and execute_command.
Think step-by-step. Use tools when interacting with the file system or executing code.
Verify edge cases and ensure production-grade quality.`,
      });
    }
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

  async *run(userInput: string): AsyncGenerator<AgentV2Event> {
    this.messages.push({ role: 'user', content: userInput });

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

      // === DEEP MODE: Use ensemble consensus for the primary iteration ===
      if (this.mode === 'deep' && currentIteration === 1) {
        yield {
          type: 'ensemble_info',
          info: `🧠 Deep Mode: Querying multiple models simultaneously for task '${taskType}'...`,
        };

        try {
          const result = await this.ensemble.runEnsemble(this.messages, {
            modelCount: 3,
            taskType,
            tools: toolDefinitions,
          });

          yield {
            type: 'ensemble_info',
            info: `✅ ${result.individualResponses.length} models responded in parallel | Consensus Agreement: ${(result.agreementScore * 100).toFixed(0)}%`,
          };

          yield {
            type: 'ensemble_data',
            data: {
              agreementScore: result.agreementScore,
              individualResponses: result.individualResponses,
            },
          };

          // Check if synthesized response contains tool calls in json code blocks
          const toolCallMatch = result.finalResponse.match(/```(?:json)?\s*(\{[\s\S]*?"name"[\s\S]*?\})\s*```/);
          if (toolCallMatch) {
            try {
              const parsed = JSON.parse(toolCallMatch[1]);
              if (parsed.name && (parsed.arguments || parsed.args)) {
                const args = parsed.arguments || parsed.args;
                const tcId = `ensemble_${Date.now()}`;
                this.messages.push({
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: tcId,
                      type: 'function',
                      function: { name: parsed.name, arguments: JSON.stringify(args) },
                    },
                  ],
                });

                yield {
                  type: 'tool_execution',
                  name: parsed.name,
                  args,
                  result: 'Executing tool from ensemble consensus...',
                  status: 'started',
                  iteration: currentIteration,
                };

                const toolResult = await executeTool(parsed.name, args);
                yield {
                  type: 'tool_execution',
                  name: parsed.name,
                  args,
                  result: toolResult,
                  status: 'completed',
                  iteration: currentIteration,
                };

                this.messages.push({ role: 'tool', tool_call_id: tcId, name: parsed.name, content: toolResult });
                continue; // Loop back so LLM processes the tool result
              }
            } catch {
              // ignore json parse error, fall through to text output
            }
          }

          // No executable tool call detected; yield the synthesized text and finish
          yield { type: 'text', content: result.finalResponse, iteration: currentIteration };
          this.messages.push({ role: 'assistant', content: result.finalResponse });
          yield { type: 'done', content: result.finalResponse };
          return;
        } catch (err: any) {
          yield {
            type: 'ensemble_info',
            info: `⚠️ Ensemble note: ${err.message}. Seamlessly continuing with smart router.`,
          };
        }
      }

      // === SPEED / BALANCED MODE: Single smart-routed model ===
      let provider;
      if (this.mode === 'speed') {
        // Pick the lowest latency available provider
        const statuses = this.registry.getAllStatuses().filter((s) => s.online);
        const fastest = statuses.sort((a, b) => a.latencyMs - b.latencyMs)[0];
        provider = fastest ? this.registry.get(fastest.name) : undefined;
      }

      if (!provider) {
        provider = await this.router.route(taskType);
      }

      let fullText = '';
      const toolCallsMap = new Map<number, { id: string; name: string; argsStr: string }>();

      for await (const chunk of provider.chat(this.messages, toolDefinitions)) {
        if (chunk.type === 'text' && chunk.content) {
          fullText += chunk.content;
          yield { type: 'text', content: chunk.content, iteration: currentIteration };
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          const tc = chunk.toolCall;
          const idx = tc.index ?? 0;
          const existing = toolCallsMap.get(idx) || { id: '', name: '', argsStr: '' };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name = tc.function.name;
          if (tc.function?.arguments) existing.argsStr += tc.function.arguments;
          toolCallsMap.set(idx, existing);
        } else if (chunk.type === 'error') {
          yield { type: 'error', content: chunk.error || 'Provider error' };
          return;
        }
      }

      const toolCalls: ToolCall[] = [];
      for (const [_, val] of toolCallsMap.entries()) {
        if (val.name) {
          toolCalls.push({
            id: val.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'function',
            function: {
              name: val.name,
              arguments: val.argsStr || '{}',
            },
          });
        }
      }

      if (toolCalls.length === 0) {
        this.messages.push({ role: 'assistant', content: fullText || '(Done)' });
        yield { type: 'done', content: fullText };
        return;
      }

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
          args = { raw: tc.function.arguments };
        }

        yield {
          type: 'tool_execution',
          name: tc.function.name,
          args,
          result: 'Executing...',
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

        this.messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: result,
        });
      }
    }

    yield { type: 'done', content: 'Maximum iterations reached.' };
  }
}
