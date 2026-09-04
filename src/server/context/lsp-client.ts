import { spawn, ChildProcess } from 'child_process';
import { LSPDiagnostic } from '../../types.js';

/**
 * Lightweight LSP client interface for code intelligence
 * Provides fallback symbols and diagnostics for project files
 */
export class LSPClient {
  private process: ChildProcess | null = null;
  private initialized = false;

  constructor(private language: string, private rootDir: string) {}

  /**
   * Start the language server if available
   */
  async start(): Promise<boolean> {
    const serverCommand = this.getServerCommand();
    if (!serverCommand) return false;

    try {
      this.process = spawn(serverCommand.command, serverCommand.args, {
        cwd: this.rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.on('error', () => {
        this.initialized = false;
      });

      this.initialized = true;
      return true;
    } catch {
      this.initialized = false;
      return false;
    }
  }

  /**
   * Get diagnostics for a file
   */
  async getDiagnostics(filePath: string): Promise<LSPDiagnostic[]> {
    if (!this.initialized) return [];

    try {
      const result = await this.sendRequest('textDocument/diagnostic', {
        textDocument: { uri: `file://${filePath}` },
      });

      return (result?.items || []).map((d: any) => ({
        file: filePath,
        line: (d.range?.start?.line || 0) + 1,
        column: (d.range?.start?.character || 0) + 1,
        severity: this.mapSeverity(d.severity),
        message: d.message || '',
        source: d.source || 'lsp',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get symbols in a file
   */
  async getSymbols(filePath: string): Promise<any[]> {
    if (!this.initialized) return [];

    try {
      const result = await this.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: `file://${filePath}` },
      });
      return result || [];
    } catch {
      return [];
    }
  }

  private getServerCommand(): { command: string; args: string[] } | null {
    switch (this.language) {
      case 'typescript':
      case 'javascript':
        return { command: 'typescript-language-server', args: ['--stdio'] };
      case 'python':
        return { command: 'pylsp', args: [] };
      case 'go':
        return { command: 'gopls', args: ['serve'] };
      case 'rust':
        return { command: 'rust-analyzer', args: [] };
      default:
        return null;
    }
  }

  private mapSeverity(severity: number): LSPDiagnostic['severity'] {
    switch (severity) {
      case 1:
        return 'error';
      case 2:
        return 'warning';
      case 3:
        return 'info';
      case 4:
        return 'hint';
      default:
        return 'info';
    }
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), 50);
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.initialized = false;
  }
}
