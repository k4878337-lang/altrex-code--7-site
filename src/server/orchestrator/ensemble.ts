import { Message, ToolDefinition } from '../types.js';
import { BaseProvider } from '../providers.js';
import { ProviderRegistry } from './registry.js';
import { SmartRouter } from './router.js';

export interface EnsembleResult {
  finalResponse: string;
  agreementScore: number;
  individualResponses: { provider: string; response: string }[];
}

export class EnsembleEngine {
  private router: SmartRouter;

  constructor(private registry: ProviderRegistry) {
    this.router = new SmartRouter(registry);
  }

  /**
   * Execute a prompt across multiple models in parallel, then synthesize
   */
  async runEnsemble(
    messages: Message[],
    options: {
      modelCount?: number;
      taskType?: string;
      tools?: ToolDefinition[];
    } = {}
  ): Promise<EnsembleResult> {
    const modelCount = options.modelCount || 3;
    
    // Select diverse set of available providers
    const selectedProviders = this.selectDiverseProviders(modelCount);
    
    if (selectedProviders.length === 0) {
      throw new Error('No providers available for ensemble execution');
    }

    // Run all models in parallel with timeout
    const results = await Promise.allSettled(
      selectedProviders.map((provider) => 
        this.collectFullResponse(provider, messages, options.tools, 30000)
      )
    );

    const validResponses: { provider: string; response: string }[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value.trim().length > 0) {
        validResponses.push({
          provider: selectedProviders[i].name,
          response: result.value,
        });
      }
    }

    if (validResponses.length === 0) {
      throw new Error('All ensemble models failed or returned empty responses');
    }

    // If only one succeeded, return it directly
    if (validResponses.length === 1) {
      return {
        finalResponse: validResponses[0].response,
        agreementScore: 1.0,
        individualResponses: validResponses,
      };
    }

    // Synthesize using the best planning model as judge
    const synthesis = await this.synthesize(messages, validResponses);
    const agreement = this.calculateAgreement(validResponses.map((r) => r.response));

    return {
      finalResponse: synthesis,
      agreementScore: agreement,
      individualResponses: validResponses,
    };
  }

  private selectDiverseProviders(count: number): BaseProvider[] {
    const all = this.registry.getAll();
    const statuses = this.registry.getAllStatuses();

    // Prefer online providers
    const onlineMap = new Map(statuses.map((s) => [s.name.toLowerCase(), s]));
    
    const sorted = [...all].sort((a, b) => {
      const statusA = onlineMap.get(a.name.toLowerCase());
      const statusB = onlineMap.get(b.name.toLowerCase());
      const latencyA = statusA?.latencyMs ?? 9999;
      const latencyB = statusB?.latencyMs ?? 9999;
      return latencyA - latencyB;
    });

    return sorted.slice(0, count);
  }

  private async collectFullResponse(
    provider: BaseProvider,
    messages: Message[],
    tools: ToolDefinition[] | undefined,
    timeoutMs: number
  ): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs)
    );

    const streamPromise = (async () => {
      let full = '';
      for await (const chunk of provider.chat(messages, tools)) {
        if (chunk.type === 'text' && chunk.content) {
          full += chunk.content;
        }
      }
      return full;
    })();

    return Promise.race([streamPromise, timeoutPromise]);
  }

  private async synthesize(
    originalMessages: Message[],
    responses: { provider: string; response: string }[]
  ): Promise<string> {
    let judge: BaseProvider;
    try {
      judge = await this.router.route('planning');
    } catch {
      judge = this.registry.getAll()[0];
    }
    
    const userPrompt = [...originalMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const responseBlock = responses
      .map((r, i) => `=== MODEL ${i + 1} (${r.provider}) ===\n${r.response}`)
      .join('\n\n');

    const synthMessages: Message[] = [
      {
        role: 'system',
        content: `You are an expert code synthesis engine. You receive multiple AI responses to the same prompt. Your job is to combine the BEST parts of each into one definitive, accurate answer. Remove contradictions, fix errors, and produce a single superior response. Do NOT mention that you are synthesizing. Just give the final best answer.`,
      },
      {
        role: 'user',
        content: `ORIGINAL PROMPT: ${userPrompt}\n\nRESPONSES:\n${responseBlock}\n\nSYNTHESIZED BEST ANSWER:`,
      },
    ];

    let result = '';
    try {
      for await (const chunk of judge.chat(synthMessages)) {
        if (chunk.type === 'text' && chunk.content) {
          result += chunk.content;
        }
      }
    } catch (err: any) {
      // Fallback to highest quality individual response
      result = responses[0].response;
    }
    return result || responses[0].response;
  }

  private calculateAgreement(responses: string[]): number {
    if (responses.length < 2) return 1.0;
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        totalSim += this.jaccardSimilarity(responses[i], responses[j]);
        pairs++;
      }
    }
    return pairs === 0 ? 1.0 : Math.round((totalSim / pairs) * 100) / 100;
  }

  private jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const setB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
