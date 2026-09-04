import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDefinition, WorkspaceFile } from './types.js';
import { DockerSandbox } from './sandbox/index.js';
import { GitEngine } from './git/index.js';
import { UniversalPreview } from './preview/index.js';
import { DeployEngine } from './deploy/index.js';
import { APKBuilder } from './build/index.js';
import { LANGUAGE_REGISTRY, LanguageDetector } from './languages/index.js';

const execAsync = promisify(exec);

export const WORKSPACE_DIR = path.resolve(process.cwd(), 'altrex-workspace');

// Ensure workspace directory exists without pre-created demo files
if (!fsSync.existsSync(WORKSPACE_DIR)) {
  fsSync.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export const dockerSandbox = new DockerSandbox();
export const gitEngine = new GitEngine(WORKSPACE_DIR);
export const universalPreview = new UniversalPreview();
export const deployEngine = new DeployEngine();
export const apkBuilder = new APKBuilder();

function resolveWorkspacePath(targetPath: string): string {
  let cleaned = targetPath.trim();
  if (cleaned.startsWith('altrex-workspace/')) {
    cleaned = cleaned.replace(/^altrex-workspace\//, '');
  }
  const resolved = path.resolve(WORKSPACE_DIR, cleaned);
  return resolved;
}

export const toolDefinitions: ToolDefinition[] = [
  // Core workspace tools
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Create a new file in the workspace live. Automatically creates parent folders if needed and streams content to the user editor.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace (e.g. index.html, src/App.tsx, main.py)' },
          content: { type: 'string', description: 'The complete code or text content for the file' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Create a new directory or nested directory in the workspace live.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Folder path relative to workspace (e.g. src, components, assets/css)' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_to_file',
      description: 'Write or update content to a file in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace' },
          content: { type: 'string', description: 'The exact content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file or directory from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File or folder path relative to workspace' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_workspace',
      description: 'Clear all files and folders in the workspace to start completely empty and fresh.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path relative to workspace (e.g., hello.py, src/app.ts)' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file in the workspace (creates directories if needed or overwrites)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace' },
          content: { type: 'string', description: 'The exact content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and directories in a workspace directory',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path relative to workspace (default: "." or "")' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for files matching a pattern or extension in the workspace',
      parameters: {
        type: 'object',
        properties: { pattern: { type: 'string', description: 'File pattern or extension (e.g. *.py, *.ts, or keyword)' } },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Execute a shell command inside the workspace directory (e.g., python3 hello.py, node script.js, ls -la)',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command'],
      },
    },
  },

  // Phase 5: Sandbox Tools
  {
    type: 'function',
    function: {
      name: 'sandbox_execute',
      description: 'Execute code safely inside the Docker or process-isolated sandbox container',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run in sandbox' },
          language: { type: 'string', description: 'Programming language (typescript, python, rust, etc.)' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_tests',
      description: 'Run project tests in sandboxed environment with strict boundaries',
      parameters: {
        type: 'object',
        properties: {
          testCommand: { type: 'string', description: 'Test command (e.g., npm test, pytest, cargo test)' },
        },
        required: ['testCommand'],
      },
    },
  },

  // Phase 5: Git & PR Tools
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Get current git repository status (branch, modified, added, untracked)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Show git diff of workspace changes (staged or unstaged)',
      parameters: {
        type: 'object',
        properties: { staged: { type: 'boolean', description: 'Whether to check staged changes' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Stage all workspace changes and commit with descriptive message',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string', description: 'Commit message' } },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_create_branch',
      description: 'Create and switch to a new git branch',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'New branch name' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_pr',
      description: 'Generate a comprehensive pull request description with Markdown formatting',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Optional high-level overview to include in PR' },
        },
      },
    },
  },

  // Phase 6: Universal Language, Deploy & APK Tools
  {
    type: 'function',
    function: {
      name: 'universal_preview',
      description: 'Preview any file in any programming language (Python, C++, Java, JS, Rust, Go, HTML, Markdown) or run raw code with stdout feedback',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace file path to preview or run' },
          code: { type: 'string', description: 'Optional raw code to preview directly' },
          language: { type: 'string', description: 'Language identifier (e.g., python, cpp, go, rust, html, markdown)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deploy_app',
      description: 'Deploy workspace application to 24/7 FREE hosting platforms (Cloudflare Pages, Vercel, Netlify, GitHub Pages, Surge)',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['cloudflare-pages', 'vercel', 'netlify', 'github-pages', 'surge'],
            description: 'Target deployment platform',
          },
          projectName: { type: 'string', description: 'Name of the project for the deployment URL' },
        },
        required: ['platform'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_apk',
      description: 'Convert workspace web application into an installable Android APK with Capacitor configuration and mobile install QR Code',
      parameters: {
        type: 'object',
        properties: {
          appName: { type: 'string', description: 'Application display name (e.g., My Portfolio App)' },
          appId: { type: 'string', description: 'Unique Android Package ID (e.g., com.altrex.portfolio)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_supported_languages',
      description: 'List supported programming languages, preview capabilities, extensions, and templates',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['all', 'web', 'systems', 'scripting', 'mobile', 'data', 'markup', 'ops'],
            description: 'Category filter',
          },
        },
      },
    },
  },
];

async function walkDir(dir: string, pattern: string, baseDir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const regexPattern = new RegExp(
    pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.'),
    'i'
  );

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath, pattern, baseDir)));
    } else {
      if (regexPattern.test(entry.name) || regexPattern.test(relPath)) {
        results.push(relPath);
      }
    }
  }
  return results;
}

export async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'create_file': {
        const filePath = resolveWorkspacePath(args.path || '');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content ?? '', 'utf-8');
        return `✅ Successfully created file: ${args.path} (${(args.content || '').length} bytes)`;
      }
      case 'create_folder': {
        const folderPath = resolveWorkspacePath(args.path || '');
        await fs.mkdir(folderPath, { recursive: true });
        return `✅ Successfully created directory: ${args.path}`;
      }
      case 'write_to_file':
      case 'write_file': {
        const filePath = resolveWorkspacePath(args.path || '');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content ?? '', 'utf-8');
        return `✅ Successfully wrote to ${args.path} (${(args.content || '').length} bytes)`;
      }
      case 'delete_file': {
        const targetPath = resolveWorkspacePath(args.path || '');
        await fs.rm(targetPath, { recursive: true, force: true });
        return `✅ Successfully deleted ${args.path}`;
      }
      case 'clear_workspace': {
        const entries = await fs.readdir(WORKSPACE_DIR);
        for (const e of entries) {
          await fs.rm(path.join(WORKSPACE_DIR, e), { recursive: true, force: true });
        }
        return '✅ Workspace cleared completely. Ready for new project generation.';
      }
      case 'read_file': {
        const filePath = resolveWorkspacePath(args.path || '');
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      }
      case 'list_directory': {
        const targetDir = resolveWorkspacePath(args.path || '.');
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        if (entries.length === 0) {
          return '(Empty directory)';
        }
        const lines = entries.map((entry) => {
          const type = entry.isDirectory() ? '[DIR] ' : '[FILE]';
          return `${type} ${entry.name}`;
        });
        return lines.join('\n');
      }
      case 'search_files': {
        const pattern = args.pattern || '*';
        const matches = await walkDir(WORKSPACE_DIR, pattern, WORKSPACE_DIR);
        return matches.length ? matches.join('\n') : `No files found matching pattern: ${pattern}`;
      }
      case 'execute_command': {
        const cmd = args.command;
        if (!cmd) return 'Error: Empty command provided';
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: WORKSPACE_DIR,
          timeout: 20000,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        });
        const out = stdout.trim();
        const err = stderr.trim();
        if (out && err) return `${out}\n\n[stderr]:\n${err}`;
        if (out) return out;
        if (err) return `[stderr]:\n${err}`;
        return '(Command executed successfully with no output)';
      }
      // Phase 5: Sandbox
      case 'sandbox_execute': {
        const cmd = args.command;
        if (!cmd) return 'Error: Missing command for sandbox';
        const result = await dockerSandbox.execute(cmd, {
          workDir: WORKSPACE_DIR,
        });
        return JSON.stringify(result, null, 2);
      }
      case 'run_tests': {
        const testCmd = args.testCommand || 'npm test';
        const result = await dockerSandbox.runTests(WORKSPACE_DIR, testCmd);
        return `Exit Code: ${result.exitCode} (${result.isolation} isolation, ${result.durationMs}ms)\nStdout: ${result.stdout || '(none)'}\nStderr: ${result.stderr || '(none)'}`;
      }
      // Phase 5: Git & PR
      case 'git_status': {
        const status = await gitEngine.status();
        return JSON.stringify(status, null, 2);
      }
      case 'git_diff': {
        const diffs = await gitEngine.diff(!!args.staged);
        if (diffs.length === 0) return 'No uncommitted changes in git repository.';
        return diffs
          .map((d) => `📄 ${d.file}: +${d.additions} -${d.deletions}\n${d.patch.substring(0, 1000)}`)
          .join('\n\n');
      }
      case 'git_commit': {
        const msg = args.message || 'feat: automated commit by ALTREX CODE';
        await gitEngine.stage();
        const result = await gitEngine.commit(msg);
        return `✅ Committed successfully:\n${result}`;
      }
      case 'git_create_branch': {
        const name = args.name || 'feat/altrex-update';
        const result = await gitEngine.createBranch(name);
        return `✅ ${result}`;
      }
      case 'generate_pr': {
        const pr = await gitEngine.generatePRDescription(args.summary);
        return gitEngine.formatPRMarkdown(pr);
      }
      case 'universal_preview': {
        if (args.code) {
          const res = await universalPreview.previewCode(args.code, args.language || 'javascript', WORKSPACE_DIR);
          if (res.type === 'web') return `🌐 Web preview ready (${res.language}) [HTML rendered in browser]`;
          return `▶️ Execution Output (${res.language}):\n${res.output || '(No stdout)'}${res.error ? `\n❌ Error:\n${res.error}` : ''}`;
        }
        if (args.path) {
          const target = resolveWorkspacePath(args.path);
          const res = await universalPreview.previewFile(target, WORKSPACE_DIR);
          if (res.type === 'web') return `🌐 Web preview ready for ${args.path} (${res.language})`;
          return `▶️ Output for ${args.path} (${res.language}) [Exit: ${res.exitCode}, Duration: ${res.durationMs}ms]:\n${res.output || '(No stdout)'}${res.error ? `\n❌ Error:\n${res.error}` : ''}`;
        }
        return 'Please provide either `path` or `code` to preview.';
      }
      case 'deploy_app': {
        const platform = args.platform || 'cloudflare-pages';
        const result = await deployEngine.deploy({
          platform: platform as any,
          buildDir: WORKSPACE_DIR,
          projectName: args.projectName || 'altrex-app',
        });
        if (result.success) {
          return `🎉 DEPLOYED SUCCESSFULLY TO 24/7 FREE HOSTING!\nPlatform: ${result.platform}\nLive URL: ${result.url}\nTimestamp: ${result.deployedAt}\n\nLogs:\n${result.logs?.join('\n')}`;
        }
        return `❌ Deployment failed: ${result.message}\nLogs:\n${result.logs?.join('\n')}`;
      }
      case 'build_apk': {
        const result = await apkBuilder.buildAPK(WORKSPACE_DIR, {
          appName: args.appName || 'ALTREX App',
          appId: args.appId,
        });
        if (result.success) {
          return `📱 ANDROID APK BUILT SUCCESSFULLY!\nApp: ${result.appName} (${result.appId})\nFile: ${result.fileName}\nSize: ${result.sizeBytes ? (result.sizeBytes / 1024).toFixed(1) + ' KB' : 'Ready'}\nDownload Route: ${result.downloadUrl}\n\nBuild Log:\n${result.buildLogs.join('\n')}`;
        }
        return `❌ APK build failed: ${result.message}\n${result.buildLogs.join('\n')}`;
      }
      case 'list_supported_languages': {
        const allLangs = Object.values(LANGUAGE_REGISTRY);
        const filtered = args.category && args.category !== 'all'
          ? allLangs.filter((l) => l.category === args.category)
          : allLangs;
        return `🌍 Supported Universal Languages (${filtered.length} total):\n` +
          filtered.map((l) => `${l.icon} ${l.name} [${l.extensions.join(', ')}] — Preview: ${l.preview}, Deploy: ${l.deployTarget}`).join('\n');
      }
      default:
        return `Tool "${name}" not recognized.`;
    }
  } catch (error: any) {
    return `Error executing ${name}: ${error.message}`;
  }
}

export async function getWorkspaceTree(): Promise<WorkspaceFile[]> {
  async function scan(dir: string): Promise<WorkspaceFile[]> {
    const list: WorkspaceFile[] = [];
    if (!fsSync.existsSync(dir)) return list;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.altrex') || e.name === '.DS_Store') continue;
      const full = path.join(dir, e.name);
      const stat = await fs.stat(full);
      const rel = path.relative(WORKSPACE_DIR, full);
      list.push({
        name: e.name,
        path: rel,
        size: stat.size,
        isDirectory: e.isDirectory(),
        updatedAt: stat.mtime.toISOString(),
      });
      if (e.isDirectory()) {
        list.push(...(await scan(full)));
      }
    }
    return list;
  }
  return await scan(WORKSPACE_DIR);
}
