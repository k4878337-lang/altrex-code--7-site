import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import ignore from 'ignore';
import { CodeChunk, IndexStats } from '../../types.js';

const SUPPORTED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
  '.kt', '.scala', '.vue', '.svelte', '.html', '.css', '.scss',
  '.json', '.yaml', '.yml', '.toml', '.md', '.sql', '.sh',
];

const MAX_FILE_SIZE = 150_000; // 150KB max per file
const CHUNK_SIZE_LINES = 50;   // Lines per chunk for non-function code

export class ProjectIndexer {
  private ig: ReturnType<typeof ignore>;
  private rootDir: string;
  private chunks: CodeChunk[] = [];
  private stats: IndexStats;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.ig = ignore();
    this.stats = {
      totalFiles: 0,
      totalChunks: 0,
      totalTokens: 0,
      languages: {},
      lastIndexed: 0,
      durationMs: 0,
    };

    // Default ignore list
    this.ig.add([
      'node_modules', '.git', 'dist', 'build', '.next',
      'coverage', '__pycache__', '.venv', 'venv',
      '*.min.js', '*.min.css', '*.map', '.altrex',
    ]);

    this.loadGitignore();
  }

  private loadGitignore() {
    try {
      const gitignorePath = path.join(this.rootDir, '.gitignore');
      if (fsSync.existsSync(gitignorePath)) {
        const content = fsSync.readFileSync(gitignorePath, 'utf-8');
        this.ig.add(content.split('\n').filter((l) => l.trim() && !l.startsWith('#')));
      }
    } catch {}

    try {
      const altrexIgnorePath = path.join(this.rootDir, '.altrexignore');
      if (fsSync.existsSync(altrexIgnorePath)) {
        const content = fsSync.readFileSync(altrexIgnorePath, 'utf-8');
        this.ig.add(content.split('\n').filter((l) => l.trim() && !l.startsWith('#')));
      }
    } catch {}
  }

  /**
   * Index the entire project
   */
  async indexAll(onProgress?: (file: string, pct: number) => void): Promise<IndexStats> {
    const start = Date.now();
    this.chunks = [];
    const languageCounts: Record<string, number> = {};

    // Collect all files
    const files = await this.walkDirectory(this.rootDir);
    this.stats.totalFiles = files.length;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');

      if (onProgress) {
        onProgress(relativePath, Math.round(((i + 1) / files.length) * 100));
      }

      try {
        const fileChunks = await this.indexFile(filePath, relativePath);
        this.chunks.push(...fileChunks);

        const ext = path.extname(filePath).toLowerCase();
        const lang = this.getLanguage(ext);
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      } catch {}
    }

    this.stats.totalChunks = this.chunks.length;
    this.stats.totalTokens = this.chunks.reduce((sum, c) => sum + this.estimateTokens(c.content), 0);
    this.stats.languages = languageCounts;
    this.stats.lastIndexed = Date.now();
    this.stats.durationMs = Date.now() - start;

    return this.stats;
  }

  /**
   * Recursively walk directory respecting ignores
   */
  private async walkDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');

        if (this.ig.ignores(relativePath)) continue;

        if (entry.isDirectory()) {
          const subFiles = await this.walkDirectory(fullPath);
          results.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

          try {
            const stat = await fs.stat(fullPath);
            if (stat.size > MAX_FILE_SIZE) continue;
          } catch {
            continue;
          }

          results.push(fullPath);
        }
      }
    } catch {}

    return results;
  }

  /**
   * Index a single file into chunks
   */
  private async indexFile(filePath: string, relativePath: string): Promise<CodeChunk[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const language = this.getLanguage(ext);
    const lines = content.split('\n');

    // Try function/class-aware chunking first
    const smartChunks = this.smartChunk(content, lines, relativePath, language);

    if (smartChunks.length > 0) {
      return smartChunks;
    }

    // Fallback: line-based chunking
    const chunks: CodeChunk[] = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE_LINES) {
      const chunkLines = lines.slice(i, i + CHUNK_SIZE_LINES);
      const chunkContent = chunkLines.join('\n');

      if (chunkContent.trim().length === 0) continue;

      chunks.push({
        id: `${relativePath}:${i + 1}-${Math.min(i + CHUNK_SIZE_LINES, lines.length)}`,
        filePath: relativePath,
        startLine: i + 1,
        endLine: Math.min(i + CHUNK_SIZE_LINES, lines.length),
        content: chunkContent,
        type: 'block',
        language,
        imports: this.extractImports(content, language),
      });
    }

    return chunks;
  }

  /**
   * Smart chunking: split by functions, classes, methods, and interfaces
   */
  private smartChunk(
    content: string,
    lines: string[],
    filePath: string,
    language: string
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const imports = this.extractImports(content, language);

    // Regex patterns for function/class/interface detection
    const patterns: { regex: RegExp; type: CodeChunk['type'] }[] = [
      { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/, type: 'function' },
      { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, type: 'class' },
      { regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^\{]+)?\{/, type: 'method' },
      { regex: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/, type: 'function' },
      { regex: /^(?:export\s+)?interface\s+(\w+)/, type: 'class' },
      { regex: /^(?:export\s+)?type\s+(\w+)\s*=/, type: 'class' },
      { regex: /^(?:export\s+)?enum\s+(\w+)/, type: 'class' },
      // Python
      { regex: /^(?:async\s+)?def\s+(\w+)/, type: 'function' },
      { regex: /^class\s+(\w+)/, type: 'class' },
    ];

    let currentChunk: { start: number; name: string; type: CodeChunk['type'] } | null = null;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for new function/class start
      let matched = false;
      for (const { regex, type } of patterns) {
        const match = trimmed.match(regex);
        if (match && braceDepth === 0) {
          // Save previous chunk if exists
          if (currentChunk) {
            const chunkContent = lines.slice(currentChunk.start, i).join('\n');
            if (chunkContent.trim().length > 20) {
              chunks.push({
                id: `${filePath}:${currentChunk.start + 1}-${i}`,
                filePath,
                startLine: currentChunk.start + 1,
                endLine: i,
                content: chunkContent,
                type: currentChunk.type,
                name: currentChunk.name,
                language,
                imports,
              });
            }
          }

          currentChunk = { start: i, name: match[1], type };
          matched = true;
          break;
        }
      }

      // Track brace depth
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      braceDepth += opens - closes;

      // Close chunk when braces balance out
      if (currentChunk && braceDepth <= 0 && !matched && i > currentChunk.start) {
        const chunkContent = lines.slice(currentChunk.start, i + 1).join('\n');
        if (chunkContent.trim().length > 20) {
          chunks.push({
            id: `${filePath}:${currentChunk.start + 1}-${i + 1}`,
            filePath,
            startLine: currentChunk.start + 1,
            endLine: i + 1,
            content: chunkContent,
            type: currentChunk.type,
            name: currentChunk.name,
            language,
            imports,
          });
        }
        currentChunk = null;
      }
    }

    // Capture remaining lines
    if (currentChunk) {
      const chunkContent = lines.slice(currentChunk.start).join('\n');
      if (chunkContent.trim().length > 20) {
        chunks.push({
          id: `${filePath}:${currentChunk.start + 1}-${lines.length}`,
          filePath,
          startLine: currentChunk.start + 1,
          endLine: lines.length,
          content: chunkContent,
          type: currentChunk.type,
          name: currentChunk.name,
          language,
          imports,
        });
      }
    }

    return chunks;
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];

    if (['typescript', 'javascript'].includes(language)) {
      const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'python') {
      const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }

    return imports;
  }

  private getLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript', '.tsx': 'typescript',
      '.js': 'javascript', '.jsx': 'javascript',
      '.py': 'python', '.go': 'go', '.rs': 'rust',
      '.java': 'java', '.c': 'c', '.cpp': 'cpp',
      '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp',
      '.rb': 'ruby', '.php': 'php', '.swift': 'swift',
      '.kt': 'kotlin', '.scala': 'scala', '.vue': 'vue',
      '.svelte': 'svelte', '.html': 'html', '.css': 'css',
      '.scss': 'scss', '.json': 'json', '.yaml': 'yaml',
      '.yml': 'yaml', '.toml': 'toml', '.md': 'markdown',
      '.sql': 'sql', '.sh': 'shell',
    };
    return map[ext] || 'text';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getChunks(): CodeChunk[] {
    return this.chunks;
  }

  getStats(): IndexStats {
    return this.stats;
  }

  getChunksForFile(filePath: string): CodeChunk[] {
    return this.chunks.filter((c) => c.filePath === filePath);
  }
}
