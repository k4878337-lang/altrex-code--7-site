import path from 'path';
import { CodeChunk, ContextSelection, IndexStats, VectorSearchResult } from '../../types.js';
import { ProjectIndexer } from './indexer.js';
import { EmbeddingEngine, OllamaEmbedding, JinaEmbedding, EmbeddingProvider } from './embeddings.js';
import { VectorStore } from './vector-store.js';
import { ContextSelector } from './context-selector.js';
import { FileWatcher } from './watcher.js';

export class CodebaseIntelligence {
  private indexer: ProjectIndexer;
  private embeddingEngine: EmbeddingEngine;
  private vectorStore: VectorStore;
  private contextSelector: ContextSelector;
  private watcher: FileWatcher | null = null;
  private isInitialized = false;

  constructor(
    private rootDir: string,
    options: {
      jinaApiKey?: string;
      maxContextTokens?: number;
      enableWatcher?: boolean;
    } = {}
  ) {
    this.indexer = new ProjectIndexer(rootDir);

    // Setup embedding providers (Ollama primary, Jina fallback)
    const providers: EmbeddingProvider[] = [new OllamaEmbedding()];
    if (options.jinaApiKey) {
      providers.push(new JinaEmbedding(options.jinaApiKey));
    }
    this.embeddingEngine = new EmbeddingEngine(providers);

    // Setup vector store in .altrex
    const storageDir = path.join(rootDir, '.altrex');
    this.vectorStore = new VectorStore(storageDir);

    // Setup context selector
    this.contextSelector = new ContextSelector(
      this.vectorStore,
      this.embeddingEngine,
      options.maxContextTokens || 50000
    );

    // Setup file watcher
    if (options.enableWatcher !== false) {
      this.watcher = new FileWatcher(
        rootDir,
        this.indexer,
        this.vectorStore,
        this.embeddingEngine,
        (event, file) => {
          // Log or trigger reactive updates
        }
      );
    }
  }

  /**
   * Initialize the intelligence engine
   */
  async initialize(onProgress?: (file: string, pct: number) => void): Promise<IndexStats> {
    // Try to load existing index from disk
    const loaded = await this.vectorStore.load();
    if (loaded && this.vectorStore.size > 0) {
      this.isInitialized = true;
      if (this.watcher) {
        this.watcher.start();
      }
      return this.indexer.getStats();
    }

    // Full index from scratch
    const stats = await this.indexer.indexAll(onProgress);
    const chunks = this.indexer.getChunks();

    // Generate embeddings
    await this.embeddingEngine.embedChunks(chunks);

    // Store in vector DB & persist
    this.vectorStore.setChunks(chunks);
    await this.vectorStore.save();

    // Start file watcher
    if (this.watcher) {
      this.watcher.start();
    }

    this.isInitialized = true;
    return stats;
  }

  /**
   * Force re-index of the project
   */
  async reindex(onProgress?: (file: string, pct: number) => void): Promise<IndexStats> {
    const stats = await this.indexer.indexAll(onProgress);
    const chunks = this.indexer.getChunks();

    await this.embeddingEngine.embedChunks(chunks);
    this.vectorStore.setChunks(chunks);
    await this.vectorStore.save();

    this.isInitialized = true;
    return stats;
  }

  /**
   * Get relevant context for a query
   */
  async getContext(query: string, maxTokens?: number): Promise<ContextSelection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.contextSelector.selectContext(query, { maxTokens });
  }

  /**
   * Get formatted context string for LLM prompt injection
   */
  async getContextPrompt(query: string, maxTokens?: number): Promise<string> {
    const selection = await this.getContext(query, maxTokens);
    return this.contextSelector.formatContextForPrompt(selection);
  }

  /**
   * Search codebase semantically & by keywords
   */
  async search(query: string, topK = 10): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try embedding search first
    try {
      const provider = await this.embeddingEngine.getAvailableProvider();
      if (provider) {
        const queryEmbeddings = await provider.embed([query]);
        if (queryEmbeddings && queryEmbeddings[0] && queryEmbeddings[0].length > 0) {
          const res = this.vectorStore.search(queryEmbeddings[0], topK);
          if (res.length > 0) return res;
        }
      }
    } catch {}

    return this.vectorStore.keywordSearch(query, topK);
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    const baseStats = this.indexer.getStats();
    if (baseStats.totalChunks === 0 && this.vectorStore.size > 0) {
      return {
        totalFiles: this.vectorStore.getAllFiles().length,
        totalChunks: this.vectorStore.size,
        totalTokens: this.vectorStore.getAllChunks().reduce((acc, c) => acc + Math.ceil(c.content.length / 4), 0),
        languages: {},
        lastIndexed: Date.now(),
        durationMs: 0,
      };
    }
    return baseStats;
  }

  getAllFiles(): string[] {
    return this.vectorStore.getAllFiles();
  }

  getImportGraph(): Record<string, string[]> {
    const map = this.vectorStore.getImportGraph();
    const obj: Record<string, string[]> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean shutdown
   */
  shutdown() {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
  }
}
