import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { CodeChunk, VectorSearchResult } from '../../types.js';

export class VectorStore {
  private chunks: CodeChunk[] = [];
  private indexPath: string;

  constructor(storageDir: string) {
    this.indexPath = path.join(storageDir, '.altrex-index.json');
  }

  /**
   * Add chunks to the store
   */
  addChunks(chunks: CodeChunk[]) {
    this.chunks.push(...chunks);
  }

  /**
   * Replace all chunks (for re-indexing)
   */
  setChunks(chunks: CodeChunk[]) {
    this.chunks = chunks;
  }

  /**
   * Semantic search using cosine similarity
   */
  search(queryEmbedding: number[], topK = 10, threshold = 0.1): VectorSearchResult[] {
    if (!queryEmbedding || queryEmbedding.length === 0) return [];

    const results: VectorSearchResult[] = [];

    for (const chunk of this.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);

      if (score >= threshold) {
        results.push({
          chunk,
          score,
          metadata: {
            filePath: chunk.filePath,
            relevance: score,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Keyword-based fallback search (when embeddings unavailable or for hybrid ranking)
   */
  keywordSearch(query: string, topK = 10): VectorSearchResult[] {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const results: VectorSearchResult[] = [];

    for (const chunk of this.chunks) {
      const textToSearch = `${chunk.filePath} ${chunk.name || ''} ${chunk.content} ${chunk.imports.join(' ')}`;
      const chunkTerms = this.tokenize(textToSearch);
      
      const overlap = queryTerms.filter((t) => chunkTerms.includes(t)).length;
      let score = overlap / queryTerms.length;

      // Boost if exact file name or chunk name matched
      if (chunk.name && query.toLowerCase().includes(chunk.name.toLowerCase())) {
        score += 0.3;
      }
      if (query.toLowerCase().includes(path.basename(chunk.filePath).toLowerCase())) {
        score += 0.4;
      }

      if (score > 0.05) {
        results.push({
          chunk,
          score: Math.min(1.0, score),
          metadata: {
            filePath: chunk.filePath,
            relevance: Math.min(1.0, score),
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Get all chunks for a specific file
   */
  getFileChunks(filePath: string): CodeChunk[] {
    const normalized = filePath.replace(/\\/g, '/');
    return this.chunks.filter((c) => c.filePath.replace(/\\/g, '/') === normalized);
  }

  /**
   * Get all unique file paths in the store
   */
  getAllFiles(): string[] {
    return [...new Set(this.chunks.map((c) => c.filePath))];
  }

  /**
   * Get import graph: which files import which
   */
  getImportGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const chunk of this.chunks) {
      if (!graph.has(chunk.filePath)) {
        graph.set(chunk.filePath, []);
      }
      const existing = graph.get(chunk.filePath)!;
      for (const imp of chunk.imports) {
        if (!existing.includes(imp)) {
          existing.push(imp);
        }
      }
    }

    return graph;
  }

  /**
   * Persist index to disk
   */
  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.indexPath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }

      const data = {
        version: 1,
        timestamp: Date.now(),
        chunks: this.chunks.map((c) => ({
          ...c,
          // Exclude raw numerical embeddings in JSON to save disk space
          embedding: undefined,
        })),
      };

      await fs.writeFile(this.indexPath, JSON.stringify(data, null, 2));
    } catch {}
  }

  /**
   * Load index from disk
   */
  async load(): Promise<boolean> {
    try {
      if (!fsSync.existsSync(this.indexPath)) return false;
      const raw = await fs.readFile(this.indexPath, 'utf-8');
      const data = JSON.parse(raw);
      this.chunks = data.chunks || [];
      return this.chunks.length > 0;
    } catch {
      return false;
    }
  }

  get size(): number {
    return this.chunks.length;
  }

  getAllChunks(): CodeChunk[] {
    return this.chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }
}
