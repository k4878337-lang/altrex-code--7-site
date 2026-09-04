import { Message, StreamChunk, ToolDefinition, ProviderConfig } from './types.js';
import { GoogleGenAI } from '@google/genai';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  abstract name: string;
  abstract providerId: string;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
  }

  abstract chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk>;
}

export abstract class OpenAICompatibleProvider extends BaseProvider {
  protected abstract apiUrl: string;
  protected abstract defaultModel: string;

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const model = this.config.model || this.defaultModel;
    const body: any = {
      model,
      messages: messages.map((m) => {
        const cleaned: any = { role: m.role, content: m.content ?? '' };
        if (m.tool_calls && m.tool_calls.length > 0) {
          cleaned.tool_calls = m.tool_calls;
        }
        if (m.tool_call_id) {
          cleaned.tool_call_id = m.tool_call_id;
        }
        if (m.name) {
          cleaned.name = m.name;
        }
        return cleaned;
      }),
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      yield { type: 'error', error: `Network error connecting to ${this.name} (${this.apiUrl}): ${err.message}` };
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      yield { type: 'error', error: `${this.name} API Error (${response.status}): ${errText}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body received from provider.' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          const delta = choice?.delta;

          if (delta?.content) {
            yield { type: 'text', content: delta.content };
          }

          if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              yield {
                type: 'tool_call',
                toolCall: {
                  index: tc.index ?? 0,
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  },
                },
              };
            }
          }
        } catch {
          // ignore incomplete json chunks
        }
      }
    }
    yield { type: 'done' };
  }
}

export class XkiroProvider extends OpenAICompatibleProvider {
  name = 'xKiro (Qwen 3.8 Max)';
  providerId = 'xkiro';
  protected apiUrl = 'https://api.xkiro.com/v1/chat/completions';
  protected defaultModel = 'qwen/qwen3.8-max:free';

  constructor(config: ProviderConfig = {}) {
    super({
      apiKey: config.apiKey || process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d',
      baseUrl: config.baseUrl || 'https://api.xkiro.com/v1',
      model: config.model || 'qwen/qwen3.8-max:free',
    });
  }
}

export class GroqProvider extends OpenAICompatibleProvider {
  name = 'Groq (Llama 3.3 70B)';
  providerId = 'groq';
  protected apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  protected defaultModel = 'llama-3.3-70b-versatile';

  constructor(config: ProviderConfig = {}) {
    super({
      apiKey: config.apiKey || process.env.GROQ_API_KEY || '',
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      model: config.model || 'llama-3.3-70b-versatile',
    });
  }
}

export class OllamaProvider extends OpenAICompatibleProvider {
  name = 'Ollama (Local)';
  providerId = 'ollama';
  protected apiUrl = 'http://localhost:11434/v1/chat/completions';
  protected defaultModel = 'llama3.1:8b';

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: config.baseUrl || 'http://localhost:11434/v1',
      model: config.model || 'llama3.1:8b',
    });
  }
}

export class GeminiProvider extends BaseProvider {
  name = 'Google Gemini (3.8 Flash)';
  providerId = 'gemini';

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      yield { type: 'error', error: 'GEMINI_API_KEY is not configured.' };
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversation = messages.filter((m) => m.role !== 'system');

      // Convert tool definitions to Gemini functionDeclarations format
      const functionDeclarations = tools?.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      }));

      const contents = conversation.map((m) => {
        if (m.role === 'assistant') {
          const parts: any[] = [];
          if (m.content) parts.push({ text: m.content });
          if (m.tool_calls) {
            for (const tc of m.tool_calls) {
              let args = {};
              try {
                args = JSON.parse(tc.function.arguments || '{}');
              } catch {}
              parts.push({
                functionCall: {
                  name: tc.function.name,
                  args,
                },
              });
            }
          }
          return { role: 'model', parts };
        } else if (m.role === 'tool') {
          return {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: m.name || 'tool_response',
                  response: { result: m.content },
                },
              },
            ],
          };
        } else {
          return {
            role: 'user',
            parts: [{ text: m.content || '' }],
          };
        }
      });

      const responseStream = await ai.models.generateContentStream({
        model: this.config.model || 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemMessage?.content,
          tools: functionDeclarations ? [{ functionDeclarations }] : undefined,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield { type: 'text', content: chunk.text };
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (let i = 0; i < chunk.functionCalls.length; i++) {
            const fc = chunk.functionCalls[i];
            yield {
              type: 'tool_call',
              toolCall: {
                index: i,
                id: `call_${Date.now()}_${i}`,
                type: 'function',
                function: {
                  name: fc.name,
                  arguments: JSON.stringify(fc.args || {}),
                },
              },
            };
          }
        }
      }
      yield { type: 'done' };
    } catch (err: any) {
      yield { type: 'error', error: `Gemini API Error: ${err.message}` };
    }
  }
}

export function createProvider(type: string, config: ProviderConfig = {}): BaseProvider {
  switch (type.toLowerCase()) {
    case 'xkiro':
      return new XkiroProvider(config);
    case 'groq':
      return new GroqProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    default:
      return new XkiroProvider(config);
  }
}
