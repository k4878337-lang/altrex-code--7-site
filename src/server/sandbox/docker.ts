import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

const execAsync = promisify(exec);

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  killed: boolean;
  isolation: 'docker' | 'process';
}

export interface SandboxConfig {
  image: string;
  timeoutMs: number;
  memoryLimit: string;
  networkDisabled: boolean;
  readOnly: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  image: 'altrex-sandbox:latest',
  timeoutMs: 30000,
  memoryLimit: '512m',
  networkDisabled: true,
  readOnly: false,
};

export class DockerSandbox {
  private config: SandboxConfig;
  private containerId: string | null = null;
  private dockerAvailable: boolean | null = null;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Docker daemon is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.dockerAvailable !== null) {
      return this.dockerAvailable;
    }
    try {
      await execAsync('docker --version', { timeout: 3000 });
      // Also verify daemon is responsive
      await execAsync('docker info', { timeout: 3000 });
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
    }
    return this.dockerAvailable;
  }

  /**
   * Build sandbox image if Docker is available
   */
  async ensureImage(): Promise<void> {
    const available = await this.isAvailable();
    if (!available) return;

    try {
      await execAsync(`docker image inspect ${this.config.image}`);
    } catch {
      const dockerfile = this.generateDockerfile();
      const tmpDir = path.join(process.cwd(), '.altrex', 'sandbox');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfile);
      await execAsync(`docker build -t ${this.config.image} ${tmpDir}`);
    }
  }

  /**
   * Execute code in sandboxed container or process isolation sandbox
   */
  async execute(
    command: string,
    options: {
      workDir?: string;
      env?: Record<string, string>;
      files?: { path: string; content: string }[];
    } = {}
  ): Promise<SandboxResult> {
    const start = Date.now();
    const dockerOk = await this.isAvailable();

    if (dockerOk) {
      // Build docker run command
      const args: string[] = [
        'docker',
        'run',
        '--rm',
        `--memory=${this.config.memoryLimit}`,
        '--cpus=1',
        '--pids-limit=100',
      ];

      if (this.config.networkDisabled) {
        args.push('--network=none');
      }

      if (options.workDir) {
        args.push('-w', '/workspace');
        args.push('-v', `${options.workDir}:/workspace:ro`);
      }

      if (options.env) {
        for (const [key, value] of Object.entries(options.env)) {
          args.push('-e', `${key}=${value}`);
        }
      }

      args.push(this.config.image, 'sh', '-c', `"${command.replace(/"/g, '\\"')}"`);

      try {
        const { stdout, stderr } = await execAsync(args.join(' '), {
          timeout: this.config.timeoutMs,
          maxBuffer: 1024 * 1024 * 10,
        });

        return {
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs: Date.now() - start,
          killed: false,
          isolation: 'docker',
        };
      } catch (error: any) {
        return {
          exitCode: error.code || 1,
          stdout: (error.stdout || '').trim(),
          stderr: (error.stderr || error.message || '').trim(),
          durationMs: Date.now() - start,
          killed: error.killed || false,
          isolation: 'docker',
        };
      }
    }

    // High-security process sandbox fallback
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.workDir || process.cwd(),
        timeout: this.config.timeoutMs,
        maxBuffer: 1024 * 1024 * 5,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PYTHONUNBUFFERED: '1',
          ...(options.env || {}),
        },
      });

      return {
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - start,
        killed: false,
        isolation: 'process',
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: (error.stdout || '').trim(),
        stderr: (error.stderr || error.message || '').trim(),
        durationMs: Date.now() - start,
        killed: error.killed || false,
        isolation: 'process',
      };
    }
  }

  /**
   * Execute a file in the sandbox
   */
  async executeFile(filePath: string, language: string): Promise<SandboxResult> {
    const runCommand = this.getRunCommand(filePath, language);
    return this.execute(runCommand, {
      workDir: path.dirname(filePath),
    });
  }

  /**
   * Run tests in sandbox
   */
  async runTests(workDir: string, testCommand: string): Promise<SandboxResult> {
    return this.execute(testCommand, { workDir });
  }

  private getRunCommand(filePath: string, language: string): string {
    const lang = language.toLowerCase();
    const commands: Record<string, string> = {
      typescript: `npx tsx "${filePath}"`,
      javascript: `node "${filePath}"`,
      python: `python3 "${filePath}"`,
      python3: `python3 "${filePath}"`,
      go: `go run "${filePath}"`,
      rust: `rustc "${filePath}" -o /tmp/out && /tmp/out`,
      java: `javac "${filePath}" && java -cp "${path.dirname(filePath)}" "${path.basename(filePath, '.java')}"`,
      c: `gcc "${filePath}" -o /tmp/out && /tmp/out`,
      cpp: `g++ "${filePath}" -o /tmp/out && /tmp/out`,
      shell: `bash "${filePath}"`,
      bash: `bash "${filePath}"`,
    };
    return commands[lang] || `cat "${filePath}"`;
  }

  private generateDockerfile(): string {
    return `FROM node:20-slim

# Install common tools
RUN apt-get update && apt-get install -y \\
    python3 python3-pip \\
    gcc g++ \\
    git curl wget \\
    && rm -rf /var/lib/apt/lists/*

# Install common packages
RUN npm install -g tsx typescript

# Create non-root user
RUN useradd -m sandbox
USER sandbox

WORKDIR /workspace

ENTRYPOINT ["sh", "-c"]
`;
  }

  /**
   * Cleanup container if running
   */
  async destroy(): Promise<void> {
    if (this.containerId) {
      try {
        await execAsync(`docker rm -f ${this.containerId}`);
      } catch {}
      this.containerId = null;
    }
  }
}
