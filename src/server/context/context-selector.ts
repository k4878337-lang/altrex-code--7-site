import { CodeChunk, ContextSelection, VectorSearchResult } from '../../types.js';
import { VectorStore } from './vector-store.js';
import { EmbeddingEngine } from './embeddings.js';

export class ContextSelector {
  private maxTokenBudget: number;

  constructor(
    private vectorStore: VectorStore,
    private embeddingEngine: EmbeddingEngine,
    maxTokens = 60000
  ) {
    this.maxTokenBudget = maxTokens;
  }

  /**
   * Select the best context for a user query
   */
  async selectContext(
    query: string,
    options: {
      maxTokens?: number;
      includeImports?: boolean;
      includeRelated?: boolean;
    } = {}
  ): Promise<ContextSelection> {
    const budget = options.maxTokens || this.maxTokenBudget;
    const includeImports = options.includeImports ?? true;

    let usedTokens = 0;
    const selectedFiles: Map<string, { content: string; relevance: number }> = new Map();

    // Step 1: Semantic & keyword search for directly relevant chunks
    const semanticResults = await this.semanticSearch(query, 15);

    for (const result of semanticResults) {
      const tokens = this.estimateTokens(result.chunk.content);
      if (usedTokens + tokens > budget) break;

      const existing = selectedFiles.get(result.chunk.filePath);
      if (existing) {
        existing.content += '\n\n' + result.chunk.content;
        existing.relevance = Math.max(existing.relevance, result.score);
      } else {
        selectedFiles.set(result.chunk.filePath, {
          content: result.chunk.content,
          relevance: result.score,
        });
      }
      usedTokens += tokens;
    }

    // Step 2: Include imported files (dependency graph)
    if (includeImports && usedTokens < budget * 0.8) {
      const importGraph = this.vectorStore.getImportGraph();
      const directFiles = Array.from(selectedFiles.keys());

      for (const file of directFiles) {
        const imports = importGraph.get(file) || [];
        for (const imp of imports) {
          if (usedTokens >= budget * 0.9) break;

          const resolvedPath = this.resolveImport(imp, file);
          if (resolvedPath && !selectedFiles.has(resolvedPath)) {
            const chunks = this.vectorStore.getFileChunks(resolvedPath);
            if (chunks.length > 0) {
              const content = chunks.map((c) => c.content).join('\n\n');
              const tokens = this.estimateTokens(content);
              if (usedTokens + tokens <= budget) {
                selectedFiles.set(resolvedPath, { content, relevance: 0.5 });
                usedTokens += tokens;
              }
            }
          }
        }
      }
    }

    // Step 3: Include project configuration & root files
    if (usedTokens < budget * 0.9) {
      const configFiles = ['README.md', 'package.json', 'tsconfig.json'];
      for (const config of configFiles) {
        if (usedTokens >= budget) break;
        const chunks = this.vectorStore.getFileChunks(config);
        if (chunks.length > 0 && !selectedFiles.has(config)) {
          const content = chunks.map((c) => c.content).join('\n');
          const tokens = this.estimateTokens(content);
          if (usedTokens + tokens <= budget) {
            selectedFiles.set(config, { content, relevance: 0.3 });
            usedTokens += tokens;
          }
        }
      }
    }

    // Build final selection
    const files = Array.from(selectedFiles.entries())
      .map(([path, data]) => ({ path, content: data.content, relevance: data.relevance }))
      .sort((a, b) => b.relevance - a.relevance);

    return {
      files,
      totalTokens: usedTokens,
      budget,
      strategy: `semantic(${semanticResults.length}) + imports(${includeImports}) + config`,
    };
  }

  /**
   * Format context for injection into LLM prompt
   */
  formatContextForPrompt(selection: ContextSelection): string {
    if (selection.files.length === 0) return '';

    const parts: string[] = [
      '=== PROJECT CONTEXT (CODEBASE INTELLIGENCE) ===',
      `(${selection.files.length} relevant files, ~${selection.totalTokens} tokens estimated)`,
      '',
    ];

    for (const file of selection.files) {
      parts.push(`--- FILE: ${file.path} (Relevance: ${(file.relevance * 100).toFixed(0)}%) ---`);
      parts.push(file.content);
      parts.push('');
    }

    parts.push('=== END PROJECT CONTEXT ===');
    return parts.join('\n');
  }

  private async semanticSearch(query: string, topK: number): Promise<VectorSearchResult[]> {
    // Try embedding-based search first if available
    try {
      const provider = await this.embeddingEngine.getAvailableProvider();
      if (provider) {
        const queryEmbeddings = await provider.embed([query]);
        if (queryEmbeddings && queryEmbeddings[0] && queryEmbeddings[0].length > 0) {
          const results = this.vectorStore.search(queryEmbeddings[0], topK);
          if (results.length > 0) return results;
        }
      }
    } catch {}

    // Fallback to keyword search
    return this.vectorStore.keywordSearch(query, topK);
  }

  private resolveImport(importPath: string, fromFile: string): string | null {
    if (importPath.startsWith('.')) {
      const dir = fromFile.includes('/') ? fromFile.substring(0, fromFile.lastIndexOf('/')) : '';
      let resolved = dir ? `${dir}/${importPath}` : importPath.replace(/^\.\//, '');
      resolved = resolved.replace(/\/\.\//g, '/').replace(/^\.\//, '');

      const allFiles = this.vectorStore.getAllFiles();
      const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];

      for (const ext of extensions) {
        const candidate = resolved + ext;
        if (allFiles.includes(candidate)) {
          return candidate;
        }
      }

      for (const ext of extensions) {
        const candidate = `${resolved}/index${ext}`;
        if (allFiles.includes(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
