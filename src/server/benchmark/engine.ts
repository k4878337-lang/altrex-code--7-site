import { Message } from '../types.js';
import { BaseProvider } from '../providers.js';
import { ProviderRegistry } from '../orchestrator/registry.js';

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

export class BenchmarkEngine {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Run the same prompt across all available models in parallel
   */
  async runBenchmark(
    prompt: string,
    options: {
      maxProviders?: number;
      timeout?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<BenchmarkReport> {
    const maxProviders = options.maxProviders || 10;
    const timeout = options.timeout || 30000;
    const systemPrompt = options.systemPrompt || 'You are ATX-1, an expert AI coding assistant. Answer concisely and write production-grade code.';

    const providers = this.registry.getAll().slice(0, maxProviders);
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    // Run all providers in parallel with timeout safeguards
    const results = await Promise.allSettled(
      providers.map((provider) => this.benchmarkProvider(provider, messages, timeout))
    );

    const benchmarkResults: BenchmarkResult[] = results
      .filter((r): r is PromiseFulfilledResult<BenchmarkResult> => r.status === 'fulfilled')
      .map((r) => r.value);

    // Find best by latency
    const successful = benchmarkResults.filter((r) => r.success);
    const bestLatency = successful.length > 0
      ? [...successful].sort((a, b) => a.latencyMs - b.latencyMs)[0]
      : undefined;

    // Best quality heuristic: highest token count with successful exit
    const bestQuality = successful.length > 0
      ? [...successful].sort((a, b) => b.tokenCount - a.tokenCount)[0]
      : undefined;

    return {
      prompt,
      results: benchmarkResults,
      bestLatency,
      bestQuality,
      timestamp: Date.now(),
    };
  }

  /**
   * Format benchmark results as a comparison table
   */
  formatReport(report: BenchmarkReport): string {
    const lines: string[] = [
      '╔══════════════════════════════════════════════════════════╗',
      '║          ALTREX CODE — MODEL BENCHMARK RESULTS          ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║ Prompt: "${report.prompt.substring(0, 48).padEnd(48)}..."`,
      '╠══════════════════════════════════════════════════════════╣',
      '║ Provider          │ Latency  │ Tokens │ Tok/s  │ Status  ║',
      '╟───────────────────┼──────────┼────────┼────────┼─────────╢',
    ];

    for (const result of report.results) {
      const status = (result.success ? '✅ OK' : '❌ ERR').padEnd(7);
      const latency = `${result.latencyMs}ms`.padEnd(8);
      const tokens = `${result.tokenCount}`.padEnd(6);
      const tps = `${result.tokensPerSecond.toFixed(1)}`.padEnd(6);
      const name = result.provider.substring(0, 17).padEnd(17);

      lines.push(`║ ${name} │ ${latency} │ ${tokens} │ ${tps} │ ${status} ║`);
    }

    lines.push('╠══════════════════════════════════════════════════════════╣');
    if (report.bestLatency) {
      const fastText = `🏆 Fastest: ${report.bestLatency.provider} (${report.bestLatency.latencyMs}ms)`;
      lines.push(`║ ${fastText.padEnd(56)} ║`);
    }
    if (report.bestQuality) {
      const qualText = `🧠 Most Detailed: ${report.bestQuality.provider} (${report.bestQuality.tokenCount} tokens)`;
      lines.push(`║ ${qualText.padEnd(56)} ║`);
    }
    lines.push('╚══════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  private async benchmarkProvider(
    provider: BaseProvider,
    messages: Message[],
    timeoutMs: number
  ): Promise<BenchmarkResult> {
    const start = Date.now();
    let response = '';
    let tokenCount = 0;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      const streamPromise = (async () => {
        let full = '';
        for await (const chunk of provider.chat(messages)) {
          if (chunk.type === 'text' && chunk.content) {
            full += chunk.content;
          }
        }
        return full;
      })();

      response = await Promise.race([streamPromise, timeoutPromise]);
      tokenCount = Math.ceil(response.length / 4);
      const latencyMs = Math.max(1, Date.now() - start);
      const tps = (tokenCount / (latencyMs / 1000));

      const modelName = (provider as any).config?.model || (provider as any).defaultModel || 'default';

      return {
        provider: provider.name,
        model: modelName,
        response,
        latencyMs,
        tokenCount,
        tokensPerSecond: Math.round(tps * 10) / 10,
        success: true,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - start;
      const modelName = (provider as any).config?.model || (provider as any).defaultModel || 'default';
      return {
        provider: provider.name,
        model: modelName,
        response: '',
        latencyMs,
        tokenCount: 0,
        tokensPerSecond: 0,
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
