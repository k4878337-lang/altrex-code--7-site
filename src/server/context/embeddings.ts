import { CodeChunk } from '../../types.js';

export interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

/**
 * Local embeddings via Ollama (nomic-embed-text)
 * FREE, unlimited, runs on local or container endpoint
 */
export class OllamaEmbedding implements EmbeddingProvider {
  name = 'ollama-nomic';
  dimensions = 768;
  private baseUrl: string;
  private model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'nomic-embed-text') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (const text of texts) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);

        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt: text,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`Ollama embed error: ${response.status}`);

        const data = (await response.json()) as any;
        results.push(data.embedding || new Array(this.dimensions).fill(0));
      } catch {
        // Return zero vector on failure/timeout
        results.push(new Array(this.dimensions).fill(0));
      }
    }

    return results;
  }
}

/**
 * Jina AI embeddings (free tier: 1M tokens/month)
 * Cloud-based fallback for code embeddings
 */
export class JinaEmbedding implements EmbeddingProvider {
  name = 'jina-embeddings';
  dimensions = 768;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'jina-embeddings-v2-base-code',
          input: texts,
        }),
      });

      if (!response.ok) throw new Error(`Jina error: ${response.status}`);

      const data = (await response.json()) as any;
      return data.data.map((item: any) => item.embedding);
    } catch {
      return texts.map(() => new Array(this.dimensions).fill(0));
    }
  }
}

/**
 * Embedding Engine - manages embedding generation with fallback
 */
export class EmbeddingEngine {
  private providers: EmbeddingProvider[];

  constructor(providers: EmbeddingProvider[]) {
    this.providers = providers;
  }

  async embedChunks(chunks: CodeChunk[], batchSize = 10): Promise<void> {
    const provider = await this.getAvailableProvider();
    if (!provider) {
      // Graceful fallback to keyword search without throwing
      return;
    }

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => this.prepareTextForEmbedding(c));

      try {
        const embeddings = await provider.embed(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
      } catch {
        // Continue without embeddings for this batch
      }
    }
  }

  private prepareTextForEmbedding(chunk: CodeChunk): string {
    const parts: string[] = [];

    if (chunk.name) parts.push(`${chunk.type}: ${chunk.name}`);
    parts.push(`File: ${chunk.filePath}`);
    parts.push(`Language: ${chunk.language}`);
    if (chunk.imports.length > 0) {
      parts.push(`Imports: ${chunk.imports.join(', ')}`);
    }
    parts.push(chunk.content);

    return parts.join('\n');
  }

  async getAvailableProvider(): Promise<EmbeddingProvider | null> {
    for (const provider of this.providers) {
      try {
        const testRes = await provider.embed(['test']);
        if (testRes.length > 0 && testRes[0].some((v) => v !== 0)) {
          return provider;
        }
      } catch {}
    }
    return null;
  }

  getPrimaryProvider(): EmbeddingProvider | null {
    return this.providers[0] || null;
  }
}
