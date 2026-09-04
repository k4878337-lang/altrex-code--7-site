import fs from 'fs';
import path from 'path';
import { ProjectIndexer } from './indexer.js';
import { VectorStore } from './vector-store.js';
import { EmbeddingEngine } from './embeddings.js';

export class FileWatcher {
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs = 1500;
  private isReindexing = false;

  constructor(
    private rootDir: string,
    private indexer: ProjectIndexer,
    private vectorStore: VectorStore,
    private embeddingEngine: EmbeddingEngine,
    private onChange?: (event: string, file: string) => void
  ) {}

  start() {
    try {
      if (!fs.existsSync(this.rootDir)) return;

      this.watcher = fs.watch(
        this.rootDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;
          const normalized = filename.replace(/\\/g, '/');

          // Ignore noise
          if (
            normalized.includes('node_modules') ||
            normalized.includes('.git') ||
            normalized.includes('dist') ||
            normalized.includes('.altrex') ||
            normalized.endsWith('~')
          ) {
            return;
          }

          this.handleChange(eventType, normalized);
        }
      );
    } catch {
      // If recursive fs.watch is not supported on certain platforms, handle gracefully
    }
  }

  private handleChange(event: string, file: string) {
    if (this.onChange) {
      this.onChange(event, file);
    }

    // Debounce re-indexing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.reindex();
    }, this.debounceMs);
  }

  private async reindex() {
    if (this.isReindexing) return;
    this.isReindexing = true;

    try {
      const stats = await this.indexer.indexAll();
      const chunks = this.indexer.getChunks();

      // Re-embed chunks
      await this.embeddingEngine.embedChunks(chunks);

      // Update vector store
      this.vectorStore.setChunks(chunks);

      // Save to disk
      await this.vectorStore.save();
    } catch (error) {
      // ignore
    } finally {
      this.isReindexing = false;
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
