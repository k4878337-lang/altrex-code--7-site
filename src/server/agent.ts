import { Message, ToolCall, StreamChunk } from './types.js';
import { BaseProvider } from './providers.js';
import { toolDefinitions, executeTool } from './tools.js';

export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_execution' | 'done' | 'error' | 'system';
  content?: string;
  name?: string;
  args?: any;
  result?: string;
  status?: 'started' | 'completed' | 'error';
  iteration?: number;
}

export class AltrexAgent {
  private messages: Message[] = [];
  private provider: BaseProvider;

  constructor(provider: BaseProvider, initialHistory: Message[] = []) {
    this.provider = provider;
    if (initialHistory.length > 0) {
      this.messages = [...initialHistory];
    } else {
      this.messages.push({
        role: 'system',
        content: `You are ATX-1, the hyper-intelligent coding agent powering ALTREX CODE.
You operate with elite engineering precision: think first, verify edge cases, and execute with production-grade craftsmanship.

You have access to 5 workspace tools:
- read_file(path): Read file contents from the workspace.
- write_file(path, content): Create or overwrite a file in the workspace.
- list_directory(path): List files and directories in the workspace.
- search_files(pattern): Search for files matching a pattern (e.g. *.py, *.ts).
- execute_command(command): Run shell commands in the workspace (e.g. python3 hello.py, node test.js, ls -la).

IMPORTANT OPERATIONAL RULES:
1. When asked to create and run code, first call write_file to save the file, then in the next step call execute_command to run it.
2. If python is required, use "python3 <filename>".
3. After tool execution finishes, explain the outcome cleanly and concisely to the user.
4. Maintain clean, reliable, executable code without placeholders.`,
      });
    }
  }

  getMessages(): Message[] {
    return this.messages;
  }

  async *run(userInput: string): AsyncGenerator<AgentEvent> {
    this.messages.push({ role: 'user', content: userInput });

    let maxIterations = 8;
    let currentIteration = 0;

    while (maxIterations > 0) {
      maxIterations--;
      currentIteration++;

      let fullText = '';
      const toolCallsMap = new Map<number, { id: string; name: string; argsStr: string }>();

      // Stream from the chosen LLM provider
      for await (const chunk of this.provider.chat(this.messages, toolDefinitions)) {
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
          yield { type: 'error', content: chunk.error || 'Unknown provider error' };
          return;
        }
      }

      const toolCalls: ToolCall[] = [];
      for (const [_, val] of toolCallsMap.entries()) {
        if (val.name) {
          toolCalls.push({
            id: val.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'function',
            function: {
              name: val.name,
              arguments: val.argsStr || '{}',
            },
          });
        }
      }

      // If no tool calls were made in this iteration, the agent has finished thinking/responding
      if (toolCalls.length === 0) {
        this.messages.push({ role: 'assistant', content: fullText || '(Done)' });
        yield { type: 'done', content: fullText };
        return;
      }

      // Record assistant's response with tool_calls in message history
      this.messages.push({
        role: 'assistant',
        content: fullText || null,
        tool_calls: toolCalls,
      });

      // Execute each tool call
      for (const tc of toolCalls) {
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || '{}');
        } catch {
          parsedArgs = { raw: tc.function.arguments };
        }

        // Notify client tool started
        yield {
          type: 'tool_execution',
          name: tc.function.name,
          args: parsedArgs,
          status: 'started',
          iteration: currentIteration,
        };

        const result = await executeTool(tc.function.name, parsedArgs);

        // Notify client tool finished
        yield {
          type: 'tool_execution',
          name: tc.function.name,
          args: parsedArgs,
          result,
          status: 'completed',
          iteration: currentIteration,
        };

        // Append tool result into context for next loop
        this.messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: result,
        });
      }

      // Continue loop so LLM can inspect tool outputs and formulate the next action or final response!
    }

    yield { type: 'done', content: 'Maximum iterations reached.' };
  }
}
