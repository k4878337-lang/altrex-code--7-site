import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  createProvider,
  XkiroProvider,
  GroqProvider,
  OllamaProvider,
  GeminiProvider,
} from './src/server/providers.js';
import { AltrexAgent } from './src/server/agent.js';
import { AltrexAgentV2, AgentMode } from './src/server/agent-v2.js';
import { AltrexAgentV3 } from './src/server/agent-v3.js';
import { CodebaseIntelligence } from './src/server/context/index.js';
import { ProviderRegistry } from './src/server/orchestrator/registry.js';
import { WORKSPACE_DIR, getWorkspaceTree, executeTool, gitEngine, dockerSandbox, universalPreview, deployEngine, apkBuilder } from './src/server/tools.js';
import { BenchmarkEngine } from './src/server/benchmark/index.js';
import { PluginLoader } from './src/server/plugins/index.js';
import { LANGUAGE_REGISTRY, LanguageDetector } from './src/server/languages/index.js';

dotenv.config();

// Unified Multi-Model Provider Registry
const globalRegistry = new ProviderRegistry();

// Plugin Loader (Phase 5)
const pluginLoader = new PluginLoader();

// Benchmark Engine (Phase 5)
const benchmarkEngine = new BenchmarkEngine(globalRegistry);

// Codebase Intelligence Engine (Phase 4)
const codebaseIntelligence = new CodebaseIntelligence(WORKSPACE_DIR, {
  jinaApiKey: process.env.JINA_API_KEY,
  maxContextTokens: 50000,
});

// Initialize Codebase Intelligence asynchronously
codebaseIntelligence
  .initialize()
  .then((stats) => {
    console.log(
      `[CodebaseIntelligence] Initialized: ${stats.totalFiles} files, ${stats.totalChunks} chunks, ~${stats.totalTokens} tokens (${stats.durationMs}ms)`
    );
  })
  .catch((err) => {
    console.warn('[CodebaseIntelligence] Init deferred:', err.message);
  });

function initRegistry() {
  const xkiroKey = process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d';
  const groqKey = process.env.GROQ_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';

  globalRegistry.register(new XkiroProvider({ apiKey: xkiroKey }));
  if (groqKey) {
    globalRegistry.register(new GroqProvider({ apiKey: groqKey }));
  } else {
    globalRegistry.register(new GroqProvider({}));
  }
  globalRegistry.register(new OllamaProvider({}));
  if (geminiKey) {
    globalRegistry.register(new GeminiProvider({ apiKey: geminiKey }));
  } else {
    globalRegistry.register(new GeminiProvider({}));
  }

  // Discover and hot-load provider plugins
  pluginLoader
    .loadAllProviders(globalRegistry)
    .then((count) => {
      if (count > 0) {
        console.log(`[PluginLoader] Successfully loaded ${count} external provider plugin(s).`);
      }
    })
    .catch((err) => {
      console.warn('[PluginLoader] Plugin load notice:', err.message);
    });
}

initRegistry();

// Background initial probe
globalRegistry.probeAll().then((statuses) => {
  const online = statuses.filter((s) => s.online).length;
  console.log(`[ProviderRegistry] Initialized & probed: ${online}/${statuses.length} providers online.`);
}).catch(() => {});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Ensure workspace exists without pre-created demo files
  if (!fsSync.existsSync(WORKSPACE_DIR)) {
    fsSync.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Config route
  app.get('/api/config', (req, res) => {
    const xkiroKey = process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d';
    const groqKey = process.env.GROQ_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    res.json({
      providers: [
        {
          id: 'xkiro',
          name: 'xKiro Gateway',
          model: 'qwen/qwen3.8-max:free',
          configured: !!xkiroKey,
          description: 'Qwen 3.8 Max Free via xKiro API Gateway',
        },
        {
          id: 'groq',
          name: 'Groq Cloud',
          model: 'llama-3.3-70b-versatile',
          configured: !!groqKey,
          description: 'Ultra-fast inference with Llama 3.3 70B',
        },
        {
          id: 'ollama',
          name: 'Ollama (Local)',
          model: 'llama3.1:8b',
          configured: true,
          description: 'Local private inference on port 11434',
        },
        {
          id: 'gemini',
          name: 'Google Gemini',
          model: 'gemini-3.8-flash',
          configured: !!geminiKey,
          description: 'Multimodal Gemini 3.8 Flash via @google/genai',
        },
      ],
      defaultProvider: 'xkiro',
      workspacePath: WORKSPACE_DIR,
    });
  });

  // Workspace file tree
  app.get('/api/workspace/files', async (req, res) => {
    try {
      const tree = await getWorkspaceTree();
      res.json({ files: tree });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Read workspace file
  app.get('/api/workspace/file', async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ error: 'Missing path parameter' });
      const target = path.resolve(WORKSPACE_DIR, filePath.replace(/^altrex-workspace\//, ''));
      if (!target.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied outside workspace' });
      }
      const content = await fs.readFile(target, 'utf-8');
      res.json({ path: filePath, content });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // Write/edit workspace file manually
  app.post('/api/workspace/file', async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) return res.status(400).json({ error: 'Missing path parameter' });
      const target = path.resolve(WORKSPACE_DIR, filePath.replace(/^altrex-workspace\//, ''));
      if (!target.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied outside workspace' });
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content || '', 'utf-8');
      res.json({ success: true, path: filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset workspace
  app.post('/api/workspace/reset', async (req, res) => {
    try {
      const entries = await fs.readdir(WORKSPACE_DIR);
      for (const e of entries) {
        await fs.rm(path.join(WORKSPACE_DIR, e), { recursive: true, force: true });
      }
      res.json({ success: true, message: 'Workspace cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Execute manual tool or command
  app.post('/api/workspace/execute', async (req, res) => {
    try {
      const { tool, command, args } = req.body;
      const toolName = tool || 'execute_command';
      const toolArgs = args || { command };
      const result = await executeTool(toolName, toolArgs);
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Orchestrator probe endpoint
  app.get('/api/orchestrator/probe', async (req, res) => {
    try {
      const statuses = await globalRegistry.probeAll();
      res.json({ statuses, onlineCount: statuses.filter((s) => s.online).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orchestrator/probe', async (req, res) => {
    try {
      const statuses = await globalRegistry.probeAll();
      res.json({ statuses, onlineCount: statuses.filter((s) => s.online).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Orchestrator status endpoint
  app.get('/api/orchestrator/status', (req, res) => {
    const statuses = globalRegistry.getAllStatuses();
    res.json({ statuses, onlineCount: statuses.filter((s) => s.online).length });
  });

  // Files alias endpoint for Phase 3
  app.get('/api/files', async (req, res) => {
    try {
      const tree = await getWorkspaceTree();
      res.json({ files: tree });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Models alias endpoint for Phase 3
  app.get('/api/models', async (req, res) => {
    try {
      const statuses = await globalRegistry.probeAll();
      res.json({
        models: statuses,
        onlineCount: statuses.filter((s) => s.online).length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 4: Codebase Intelligence Endpoints
  app.get('/api/context/stats', (req, res) => {
    try {
      const stats = codebaseIntelligence.getStats();
      res.json({
        stats,
        files: codebaseIntelligence.getAllFiles(),
        ready: codebaseIntelligence.isReady(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/context/reindex', async (req, res) => {
    try {
      const stats = await codebaseIntelligence.reindex();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/context/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    try {
      const results = await codebaseIntelligence.search(q, 10);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/context/graph', (req, res) => {
    try {
      const graph = codebaseIntelligence.getImportGraph();
      res.json({ graph });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 5: Git & PR Endpoints
  // ==========================================
  app.get('/api/git/status', async (req, res) => {
    try {
      const status = await gitEngine.status();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/git/diff', async (req, res) => {
    try {
      const staged = req.query.staged === 'true';
      const diffs = await gitEngine.diff(staged);
      res.json({ diffs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/git/stage', async (req, res) => {
    try {
      const { files } = req.body;
      const result = await gitEngine.stage(files);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/git/commit', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Commit message is required' });
      await gitEngine.stage();
      const result = await gitEngine.commit(message);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/git/branch', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Branch name is required' });
      const result = await gitEngine.createBranch(name);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.all('/api/git/pr', async (req, res) => {
    try {
      const summary = req.method === 'POST' ? req.body.summary : (req.query.summary as string);
      const pr = await gitEngine.generatePRDescription(summary);
      const markdown = gitEngine.formatPRMarkdown(pr);
      res.json({ pr, markdown });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 5: Benchmark Mode Endpoints
  // ==========================================
  app.all('/api/benchmark/run', async (req, res) => {
    try {
      const prompt =
        (req.method === 'POST' ? req.body.prompt : req.query.prompt) ||
        'Write a function to reverse a linked list in Python with unit tests.';
      const maxProviders = parseInt(
        (req.method === 'POST' ? req.body.maxProviders : req.query.maxProviders) || '5'
      );
      const timeout = parseInt(
        (req.method === 'POST' ? req.body.timeout : req.query.timeout) || '25000'
      );

      const report = await benchmarkEngine.runBenchmark(prompt, { maxProviders, timeout });
      const formattedTable = benchmarkEngine.formatReport(report);

      res.json({ report, formattedTable });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 5: Plugin Architecture Endpoints
  // ==========================================
  app.get('/api/plugins', async (req, res) => {
    try {
      const manifests = await pluginLoader.discover();
      const loaded = pluginLoader.getLoadedPlugins();
      res.json({ manifests, loaded });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 5: Docker & Process Sandbox Endpoints
  // ==========================================
  app.get('/api/sandbox/status', async (req, res) => {
    try {
      const dockerAvailable = await dockerSandbox.isAvailable();
      res.json({
        dockerAvailable,
        isolationMode: dockerAvailable ? 'docker' : 'process-isolated',
        memoryLimit: '512m',
        timeoutMs: 30000,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sandbox/execute', async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: 'Command is required' });
      const result = await dockerSandbox.execute(command, { workDir: WORKSPACE_DIR });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sandbox/test', async (req, res) => {
    try {
      const { testCommand = 'npm test' } = req.body;
      const result = await dockerSandbox.runTests(WORKSPACE_DIR, testCommand);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 6: Universal Language Engine
  // ==========================================
  app.get('/api/languages', (req, res) => {
    try {
      const languages = Object.values(LANGUAGE_REGISTRY);
      res.json({
        total: languages.length,
        languages,
        categories: ['web', 'systems', 'scripting', 'mobile', 'data', 'markup', 'ops'],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 6: Universal Preview Engine v2
  // ==========================================
  app.post('/api/preview/file', async (req, res) => {
    try {
      const { path: filePath } = req.body;
      if (!filePath) return res.status(400).json({ error: 'File path is required' });
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_DIR, filePath);
      const result = await universalPreview.previewFile(fullPath, WORKSPACE_DIR);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/preview/code', async (req, res) => {
    try {
      const { code, language = 'javascript' } = req.body;
      if (code === undefined) return res.status(400).json({ error: 'Code is required' });
      const result = await universalPreview.previewCode(code, language, WORKSPACE_DIR);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 6: FREE 24/7 Deploy Engine
  // ==========================================
  app.get('/api/deploy/platforms', (req, res) => {
    try {
      const platforms = deployEngine.getPlatformInfo();
      res.json({ platforms });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/platform-tokens/test', async (req, res) => {
    try {
      const { platform, token, accountId, username } = req.body;
      const result = await deployEngine.testToken(platform, token, accountId, username);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  app.get('/api/deploy/platforms', async (req, res) => {
    try {
      const platforms = deployEngine.getPlatformInfo();
      res.json({ platforms });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/deploy', async (req, res) => {
    try {
      const { platform = 'auto-fallback', projectName = 'altrex-app', tokens = {}, customFiles, chainOrder } = req.body;
      const result = await deployEngine.deploy({
        platform,
        buildDir: WORKSPACE_DIR,
        projectName,
        tokens,
        customFiles,
        chainOrder,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7.5: AI Project Deep Analysis
  app.post('/api/analyze-project', async (req, res) => {
    try {
      const { fileTree = [], packageJson = '', entrySnippet = '', readmeExcerpt = '', heuristicGuess = {} } = req.body;

      // Select active AI provider
      const provider = globalRegistry.get('gemini') || globalRegistry.get('xkiro') || globalRegistry.getAll()[0];
      if (!provider) {
        return res.json(heuristicGuess);
      }

      const systemPrompt = `You are ALTREX Project Analyzer. Analyze the provided project files and reply ONLY with a single valid JSON object (no markdown, no backticks, no other text):
{
  "projectType": "string (e.g. React SPA, Next.js App, Static Website, Node.js API, Python Tool)",
  "framework": "string (e.g. React (Vite), Next.js, Vue, Svelte, Static HTML, Python)",
  "entryFile": "string (e.g. index.html, src/App.tsx, main.py)",
  "needsBuild": boolean,
  "buildCommand": "string (e.g. npm run build, vite build, or none)",
  "recommendedPlatform": "string (e.g. Netlify, Vercel, GitHub Pages)",
  "confidence": number,
  "summary": "string (one concise human-readable summary sentence)",
  "languages": ["string array"]
}`;

      const userPrompt = `PROJECT FILES (${fileTree.length} files):
${fileTree.slice(0, 100).join('\n')}

PACKAGE.JSON:
${packageJson ? packageJson.slice(0, 2000) : 'None'}

ENTRY SNIPPET:
${entrySnippet ? entrySnippet.slice(0, 1000) : 'None'}

README EXCERPT:
${readmeExcerpt ? readmeExcerpt.slice(0, 500) : 'None'}

HEURISTIC GUESS:
${JSON.stringify(heuristicGuess)}`;

      let responseText = '';
      try {
        const stream = provider.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);

        for await (const chunk of stream) {
          if (chunk.type === 'text' && chunk.content) {
            responseText += chunk.content;
          }
        }

        // Clean any code blocks
        let cleaned = responseText.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(cleaned);
        return res.json(parsed);
      } catch (aiErr) {
        console.warn('[AnalyzeProject] Model inference fallback to heuristics:', aiErr);
        return res.json(heuristicGuess);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7.5: Batch write files to workspace (Load into Workspace)
  app.post('/api/workspace/batch-files', async (req, res) => {
    try {
      const { files = [], clearExisting = false } = req.body;
      if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
      }

      if (clearExisting) {
        try {
          const entries = await fs.readdir(WORKSPACE_DIR);
          for (const e of entries) {
            await fs.rm(path.join(WORKSPACE_DIR, e), { recursive: true, force: true });
          }
        } catch {}
      }

      let written = 0;
      for (const f of files) {
        if (!f.path) continue;
        const cleanPath = f.path.replace(/^[/\\]+/, '');
        const target = path.resolve(WORKSPACE_DIR, cleanPath);
        if (!target.startsWith(WORKSPACE_DIR)) continue;

        await fs.mkdir(path.dirname(target), { recursive: true });
        if (f.isBinary && f.content) {
          await fs.writeFile(target, Buffer.from(f.content, 'base64'));
        } else {
          await fs.writeFile(target, f.content || '', 'utf-8');
        }
        written++;
      }

      // Reindex context if possible
      codebaseIntelligence.reindex().catch(() => {});

      res.json({ success: true, count: written });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7.5: Try Server Build (npm ci && npm run build with 300s timeout)
  app.post('/api/custom-deploy/build', async (req, res) => {
    const { files = [] } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided to build' });
    }

    const tempDir = path.join(os.tmpdir(), `altrex-build-${Date.now()}`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Write all files into tempDir
      for (const f of files) {
        if (!f.path) continue;
        const target = path.resolve(tempDir, f.path.replace(/^[/\\]+/, ''));
        if (!target.startsWith(tempDir)) continue;

        await fs.mkdir(path.dirname(target), { recursive: true });
        if (f.isBinary && f.content) {
          await fs.writeFile(target, Buffer.from(f.content, 'base64'));
        } else {
          await fs.writeFile(target, f.content || '', 'utf-8');
        }
      }

      // Determine package manager command: prefer npm ci if package-lock exists, else npm install
      const hasLock = fsSync.existsSync(path.join(tempDir, 'package-lock.json'));
      const installCmd = hasLock ? 'npm ci' : 'npm install --prefer-offline --no-audit';
      const fullCmd = `${installCmd} && npm run build`;

      // Run with 300s timeout (300000ms)
      const buildOutput: string = await new Promise((resolve, reject) => {
        exec(fullCmd, { cwd: tempDir, timeout: 300000 }, (error, stdout, stderr) => {
          const combined = `${stdout || ''}\n${stderr || ''}`.trim();
          if (error) {
            reject(new Error(combined || error.message));
          } else {
            resolve(combined);
          }
        });
      });

      // Look for output directory (dist, build, or out)
      let outDir = '';
      for (const candidate of ['dist', 'build', 'out', 'public']) {
        if (fsSync.existsSync(path.join(tempDir, candidate))) {
          outDir = candidate;
          break;
        }
      }

      if (!outDir) {
        return res.json({
          success: true,
          buildLogs: buildOutput,
          message: 'Build completed successfully (root project updated).',
        });
      }

      // Collect built files from outDir
      const builtFiles: Array<{ path: string; content: string; isBinary: boolean }> = [];
      async function walkBuild(current: string, rel = '') {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const e of entries) {
          const p = path.join(current, e.name);
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) {
            await walkBuild(p, r);
          } else {
            const buf = await fs.readFile(p);
            const isText = !buf.slice(0, 512).includes(0);
            builtFiles.push({
              path: r,
              content: isText ? buf.toString('utf-8') : buf.toString('base64'),
              isBinary: !isText,
            });
          }
        }
      }

      await walkBuild(path.join(tempDir, outDir));

      res.json({
        success: true,
        buildDir: outDir,
        buildLogs: buildOutput,
        files: builtFiles,
      });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.message,
      });
    } finally {
      // Cleanup tempDir
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  // ==========================================
  // Phase 7.3: Cloud APK & Android Project Generator
  // ==========================================
  app.post('/api/build-apk', async (req, res) => {
    try {
      const { appName = 'ALTREX App', appId, versionName, githubToken } = req.body;
      const result = await apkBuilder.buildAPK(WORKSPACE_DIR, {
        appName,
        appId,
        versionName,
        githubToken,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/build-cloud-apk', async (req, res) => {
    try {
      const { appName = 'ALTREX App', appId, versionName, githubToken } = req.body;
      const result = await apkBuilder.buildInCloud(WORKSPACE_DIR, {
        appName,
        appId,
        versionName,
        githubToken,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/export-android-zip', async (req, res) => {
    try {
      const { appName = 'ALTREX App', appId, versionName } = req.body;
      const zipBuffer = await apkBuilder.generateAndroidProjectZip(WORKSPACE_DIR, {
        appName,
        appId,
        versionName,
      });
      const cleanName = (appName || 'altrex-app').toLowerCase().replace(/[^a-z0-9]/g, '-');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanName}-android-project.zip"`);
      res.send(zipBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Zero-Token 1-Click Workspace ZIP for Netlify Drop
  // ==========================================
  app.get('/api/workspace/zip', async (req, res) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      async function addDirToZip(currentDir: string, rel = '') {
        if (!fsSync.existsSync(currentDir)) return;
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const e of entries) {
          if (
            e.name === 'node_modules' ||
            e.name === '.git' ||
            e.name === '.altrex' ||
            e.name === '.DS_Store' ||
            e.name.endsWith('.apk')
          ) {
            continue;
          }
          const full = path.join(currentDir, e.name);
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) {
            await addDirToZip(full, r);
          } else {
            const buf = await fs.readFile(full);
            zip.file(r, buf);
          }
        }
      }

      await addDirToZip(WORKSPACE_DIR);

      if (!zip.file('index.html')) {
        zip.file(
          'index.html',
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ALTREX Project</title>
</head>
<body style="background:#05070f;color:#00f0ff;font-family:sans-serif;text-align:center;padding:4rem;">
  <h1>ALTREX Project Live</h1>
  <p>Ready for Netlify Drop</p>
</body>
</html>`
        );
      }

      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="altrex-build.zip"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Phase 6: One-Click Download Endpoint
  // ==========================================
  app.get('/api/download', async (req, res) => {
    try {
      const queryPath = req.query.path as string;
      if (!queryPath) return res.status(400).json({ error: 'Query parameter `path` is required' });

      // Resolve safe path
      const resolved = path.isAbsolute(queryPath) ? queryPath : path.join(WORKSPACE_DIR, queryPath);
      if (!fsSync.existsSync(resolved)) {
        return res.status(404).json({ error: `File not found: ${path.basename(resolved)}` });
      }

      const fileName = path.basename(resolved);
      if (fileName.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const stream = fsSync.createReadStream(resolved);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chat endpoint with Server-Sent Events (SSE) streaming powered by AltrexAgentV3 with Codebase Intelligence
  app.post('/api/chat', async (req, res) => {
    const {
      prompt: inputPrompt,
      message,
      provider: providerType,
      apiKey,
      model,
      mode = 'balanced',
      history = [],
      memoryContext,
    } = req.body;

    const userPrompt = inputPrompt || message;

    if (!userPrompt) {
      return res.status(400).json({ error: 'Prompt or message is required' });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // If user supplied a specific provider/key override, update or register it
      if (providerType && (apiKey || model)) {
        const custom = createProvider(providerType, { apiKey, model });
        globalRegistry.register(custom);
      }

      const agentMode: AgentMode = (['speed', 'balanced', 'deep'].includes(mode) ? mode : 'balanced') as AgentMode;
      const agent = new AltrexAgentV3(globalRegistry, codebaseIntelligence, agentMode, history, memoryContext);

      sendEvent({
        type: 'system',
        content: `ALTREX Engine v3.0 initialized [Mode: ${agentMode.toUpperCase()}] • Codebase Intelligence Active`,
        mode: agentMode,
      });

      for await (const event of agent.run(userPrompt)) {
        sendEvent(event);
      }

      sendEvent({ type: 'stream_end', messages: agent.getMessages() });
    } catch (err: any) {
      sendEvent({ type: 'error', content: err.message });
    } finally {
      res.end();
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ALTREX CODE Server running on http://0.0.0.0:${PORT}`);
    console.log(`Workspace directory mounted at: ${WORKSPACE_DIR}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
