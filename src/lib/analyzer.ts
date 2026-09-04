import JSZip from 'jszip';

export interface AnalyzedFile {
  path: string;
  size: number;
  isBinary: boolean;
  text?: string;
  base64?: string;
  blob?: Blob;
}

export interface LanguageStat {
  extension: string;
  name: string;
  count: number;
  color: string;
  icon: string;
}

export interface AIAnalysisResult {
  projectType: string;
  framework: string;
  entryFile: string;
  needsBuild: boolean;
  buildCommand: string;
  recommendedPlatform: string;
  confidence: number;
  summary: string;
  languages: string[];
}

export interface AnalysisReport {
  projectType: string;
  framework: string;
  entryFile: string;
  needsBuild: boolean;
  buildCommand: string;
  recommendedPlatform: string;
  confidence: number;
  summary: string;
  languages: string[];
  totalFiles: number;
  totalSize: number;
  languageStats: LanguageStat[];
  prebuilt: boolean;
  prebuiltDir?: string;
  isStatic: boolean;
  hasRootIndexHtml: boolean;
  hasDistIndexHtml: boolean;
  files: Map<string, AnalyzedFile>;
}

// Known text file extensions
const TEXT_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
  'mjs', 'cjs', 'json', 'md', 'markdown', 'txt', 'svg', 'xml', 'yaml', 'yml',
  'toml', 'env', 'example', 'sh', 'bash', 'py', 'rb', 'php', 'java', 'c',
  'cpp', 'h', 'cs', 'go', 'rs', 'sql', 'vue', 'svelte', 'astro', 'graphql',
  'prisma', 'ini', 'conf', 'dockerfile', 'gitignore', 'editorconfig'
]);

function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length < 2) return '';
  return parts.pop()!.toLowerCase();
}

function getMimeType(filePath: string): string {
  const ext = getFileExtension(filePath);
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    case 'txt':
    case 'md':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Step 2: Client-side UNZIP using JSZip
 * - 50MB limit guard
 * - Root folder detection (strips common top directory)
 * - Sanitizes node_modules, .git, __MACOSX, *.DS_Store
 * - Extracts text and binary files
 */
export async function unzipProject(
  file: File,
  onProgress?: (message: string, current: number, total: number) => void
): Promise<{ files: Map<string, AnalyzedFile>; rootFolder?: string }> {
  // Max 50MB Guard
  const MAX_SIZE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a ZIP under 50MB.`
    );
  }

  onProgress?.('📦 Unpacking ZIP archive...', 0, 100);

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Collect and sanitize entry paths
  const allEntries = Object.keys(zip.files).filter((rawPath) => {
    const entry = zip.files[rawPath];
    if (entry.dir) return false;

    const normalized = rawPath.replace(/\\/g, '/');
    if (
      normalized.includes('node_modules/') ||
      normalized.includes('.git/') ||
      normalized.includes('__MACOSX/') ||
      normalized.endsWith('.DS_Store') ||
      normalized.endsWith('.apk')
    ) {
      return false;
    }
    return true;
  });

  if (allEntries.length === 0) {
    throw new Error('The ZIP archive is empty or contains only excluded files (like node_modules or .git).');
  }

  // Root folder detection: Check if all entries share a single root folder
  let rootFolder = '';
  const firstSlashIndices = allEntries.map((p) => p.indexOf('/'));
  if (firstSlashIndices.every((idx) => idx > 0)) {
    const topFolders = new Set(allEntries.map((p) => p.split('/')[0]));
    if (topFolders.size === 1) {
      rootFolder = Array.from(topFolders)[0];
    }
  }

  const prefixToStrip = rootFolder ? `${rootFolder}/` : '';
  const resultMap = new Map<string, AnalyzedFile>();
  const total = allEntries.length;

  for (let i = 0; i < total; i++) {
    const rawPath = allEntries[i];
    const cleanPath = prefixToStrip && rawPath.startsWith(prefixToStrip)
      ? rawPath.slice(prefixToStrip.length)
      : rawPath;

    if (!cleanPath) continue;

    onProgress?.(`📖 Reading ${i + 1}/${total} files… (${cleanPath})`, i + 1, total);

    const zipEntry = zip.files[rawPath];
    const ext = getFileExtension(cleanPath);
    const isKnownText = TEXT_EXTENSIONS.has(ext);

    if (isKnownText) {
      try {
        const text = await zipEntry.async('string');
        const blob = new Blob([text], { type: getMimeType(cleanPath) });
        resultMap.set(cleanPath, {
          path: cleanPath,
          size: text.length,
          isBinary: false,
          text,
          blob,
        });
      } catch {
        // fallback to binary if text decoding fails
        const uint8 = await zipEntry.async('uint8array');
        const base64 = await zipEntry.async('base64');
        const blob = new Blob([uint8], { type: getMimeType(cleanPath) });
        resultMap.set(cleanPath, {
          path: cleanPath,
          size: uint8.length,
          isBinary: true,
          base64,
          blob,
        });
      }
    } else {
      const uint8 = await zipEntry.async('uint8array');
      const base64 = await zipEntry.async('base64');
      const blob = new Blob([uint8], { type: getMimeType(cleanPath) });
      resultMap.set(cleanPath, {
        path: cleanPath,
        size: uint8.length,
        isBinary: true,
        base64,
        blob,
      });
    }
  }

  onProgress?.(`✅ Extracted ${resultMap.size} files ready for analysis`, total, total);

  return { files: resultMap, rootFolder: rootFolder || undefined };
}

/**
 * Step 3: Heuristics & Stats Analysis
 */
export function computeProjectStats(files: Map<string, AnalyzedFile>): {
  totalFiles: number;
  totalSize: number;
  languageStats: LanguageStat[];
  hasRootIndexHtml: boolean;
  hasDistIndexHtml: boolean;
  prebuilt: boolean;
  prebuiltDir?: string;
  isStatic: boolean;
  packageJson?: any;
} {
  const totalFiles = files.size;
  let totalSize = 0;
  const extCounts: Record<string, number> = {};

  for (const [path, file] of files.entries()) {
    totalSize += file.size;
    const ext = getFileExtension(path) || 'file';
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }

  const languageStats: LanguageStat[] = [];
  const colorMap: Record<string, { name: string; color: string; icon: string }> = {
    js: { name: 'JS', color: '#f7df1e', icon: '🟨' },
    mjs: { name: 'JS', color: '#f7df1e', icon: '🟨' },
    cjs: { name: 'JS', color: '#f7df1e', icon: '🟨' },
    ts: { name: 'TS', color: '#3178c6', icon: '🔷' },
    tsx: { name: 'TSX', color: '#00f0ff', icon: '⚛️' },
    jsx: { name: 'JSX', color: '#00f0ff', icon: '⚛️' },
    html: { name: 'HTML', color: '#e34f26', icon: '🌐' },
    htm: { name: 'HTML', color: '#e34f26', icon: '🌐' },
    css: { name: 'CSS', color: '#264de4', icon: '🎨' },
    scss: { name: 'SCSS', color: '#c6538c', icon: '🎨' },
    json: { name: 'JSON', color: '#4ade80', icon: '📋' },
    py: { name: 'Python', color: '#3776ab', icon: '🐍' },
    vue: { name: 'Vue', color: '#42b883', icon: '💚' },
    svelte: { name: 'Svelte', color: '#ff3e00', icon: '🧡' },
    md: { name: 'Docs', color: '#94a3b8', icon: '📄' },
    txt: { name: 'Docs', color: '#94a3b8', icon: '📄' },
    png: { name: 'Images', color: '#ec4899', icon: '🖼️' },
    jpg: { name: 'Images', color: '#ec4899', icon: '🖼️' },
    svg: { name: 'SVG', color: '#ffb300', icon: '✨' },
  };

  for (const [ext, count] of Object.entries(extCounts)) {
    const meta = colorMap[ext] || { name: ext.toUpperCase(), color: '#64748b', icon: '📦' };
    const existing = languageStats.find((l) => l.name === meta.name);
    if (existing) {
      existing.count += count;
    } else {
      languageStats.push({
        extension: ext,
        name: meta.name,
        count,
        color: meta.color,
        icon: meta.icon,
      });
    }
  }

  languageStats.sort((a, b) => b.count - a.count);

  const hasRootIndexHtml = files.has('index.html');
  const hasDistIndexHtml =
    files.has('dist/index.html') || files.has('build/index.html') || files.has('out/index.html');

  const prebuiltDir = files.has('dist/index.html')
    ? 'dist'
    : files.has('build/index.html')
    ? 'build'
    : files.has('out/index.html')
    ? 'out'
    : undefined;

  const prebuilt = Boolean(prebuiltDir);

  let packageJson: any = undefined;
  const pkgFile = files.get('package.json');
  if (pkgFile && pkgFile.text) {
    try {
      packageJson = JSON.parse(pkgFile.text);
    } catch {
      // ignore
    }
  }

  const isStatic = hasRootIndexHtml || hasDistIndexHtml;

  return {
    totalFiles,
    totalSize,
    languageStats,
    hasRootIndexHtml,
    hasDistIndexHtml,
    prebuilt,
    prebuiltDir,
    isStatic,
    packageJson,
  };
}

/**
 * Step 3 Heuristics engine: Infers framework, needsBuild, buildCommand
 */
export function runHeuristics(
  files: Map<string, AnalyzedFile>,
  stats: ReturnType<typeof computeProjectStats>
): {
  projectType: string;
  framework: string;
  entryFile: string;
  needsBuild: boolean;
  buildCommand: string;
  recommendedPlatform: string;
  confidence: number;
  summary: string;
  languages: string[];
} {
  const { packageJson, prebuilt, prebuiltDir, hasRootIndexHtml, totalFiles } = stats;

  let framework = 'Static HTML';
  let projectType = 'Web App';
  let needsBuild = false;
  let buildCommand = 'npm run build';
  let recommendedPlatform = 'Netlify';
  let confidence = 85;
  let summary = 'Standard web project detected.';

  const languages = stats.languageStats.slice(0, 5).map((l) => `${l.name} (${l.count})`);

  let entryFile = hasRootIndexHtml
    ? 'index.html'
    : prebuiltDir
    ? `${prebuiltDir}/index.html`
    : 'index.html';

  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const scripts = packageJson.scripts || {};

    if (deps['react']) {
      if (deps['vite']) {
        framework = 'React (Vite)';
        buildCommand = scripts.build ? 'npm run build' : 'vite build';
      } else if (deps['next']) {
        framework = 'Next.js';
        buildCommand = 'next build';
        recommendedPlatform = 'Vercel';
      } else {
        framework = 'React SPA';
      }
      entryFile = files.has('src/App.tsx')
        ? 'src/App.tsx'
        : files.has('src/App.jsx')
        ? 'src/App.jsx'
        : files.has('src/main.tsx')
        ? 'src/main.tsx'
        : entryFile;
    } else if (deps['vue']) {
      framework = 'Vue';
      buildCommand = scripts.build ? 'npm run build' : 'vite build';
    } else if (deps['svelte']) {
      framework = 'Svelte';
      buildCommand = scripts.build ? 'npm run build' : 'vite build';
    } else if (deps['astro']) {
      framework = 'Astro';
      buildCommand = 'astro build';
    } else if (deps['express'] || deps['fastify'] || deps['koa'] || deps['@nestjs/core']) {
      framework = 'Node.js Server API';
      projectType = 'Backend Service';
      recommendedPlatform = 'Vercel';
    }

    if (prebuilt) {
      needsBuild = false;
      confidence = 94;
      summary = `Prebuilt ${prebuiltDir}/ export found — ready to deploy directly with zero build required.`;
    } else if (scripts.build) {
      needsBuild = true;
      confidence = 90;
      summary = `${framework} source project detected. Requires building via "${buildCommand}".`;
    } else {
      needsBuild = false;
      confidence = 85;
      summary = `Node-based project detected. Ready for cloud deployment.`;
    }
  } else {
    // Non-node projects
    if (files.has('requirements.txt') || files.has('app.py') || files.has('manage.py')) {
      framework = 'Python';
      projectType = 'Python Application';
      entryFile = files.has('app.py') ? 'app.py' : 'manage.py';
      needsBuild = false;
      confidence = 88;
      summary = 'Python application structure identified.';
    } else if (hasRootIndexHtml) {
      framework = 'Static HTML / JS';
      projectType = 'Static Website';
      needsBuild = false;
      confidence = 96;
      summary = 'Pure static website ready for instant 24/7 edge CDN hosting.';
      recommendedPlatform = 'Netlify';
    } else {
      const docsOnly = Array.from(files.keys()).every((p) => p.endsWith('.md') || p.endsWith('.txt'));
      if (docsOnly) {
        framework = 'Documentation';
        projectType = 'Markdown Docs';
        summary = 'Markdown documentation repository.';
        confidence = 80;
      } else {
        framework = 'Generic Web Project';
        projectType = 'Web App';
        summary = 'Custom web files detected. Will deploy as static site.';
        confidence = 75;
      }
    }
  }

  return {
    projectType,
    framework,
    entryFile,
    needsBuild,
    buildCommand,
    recommendedPlatform,
    confidence,
    summary,
    languages,
  };
}

/**
 * Step 3.c: AI Deep Analysis
 * Sends file tree + package.json + entry snippet + README to /api/analyze-project
 */
export async function analyzeProjectWithAI(
  files: Map<string, AnalyzedFile>,
  stats: ReturnType<typeof computeProjectStats>
): Promise<AnalysisReport> {
  const heuristics = runHeuristics(files, stats);

  // Prepare payload for AI analysis
  const fileTree = Array.from(files.keys()).slice(0, 300);

  let packageJsonStr = '';
  const pkg = files.get('package.json');
  if (pkg && pkg.text && pkg.size < 50000) {
    packageJsonStr = pkg.text.slice(0, 4000);
  }

  // First 60 lines of entry file
  let entrySnippet = '';
  const candidateEntry =
    files.get(heuristics.entryFile) ||
    files.get('index.html') ||
    files.get('src/App.tsx') ||
    files.get('src/main.tsx') ||
    files.get('app.py');

  if (candidateEntry && candidateEntry.text && !candidateEntry.isBinary) {
    entrySnippet = candidateEntry.text.split('\n').slice(0, 60).join('\n');
  }

  // First 500 chars of README
  let readmeExcerpt = '';
  const readme = files.get('README.md') || files.get('readme.md');
  if (readme && readme.text) {
    readmeExcerpt = readme.text.slice(0, 500);
  }

  let aiResult: Partial<AIAnalysisResult> = {};

  try {
    const res = await fetch('/api/analyze-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileTree,
        packageJson: packageJsonStr,
        entrySnippet,
        readmeExcerpt,
        heuristicGuess: heuristics,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.projectType) {
        aiResult = data;
      }
    }
  } catch (e) {
    console.warn('AI analysis call failed, falling back to heuristics:', e);
  }

  return {
    projectType: aiResult.projectType || heuristics.projectType,
    framework: aiResult.framework || heuristics.framework,
    entryFile: aiResult.entryFile || heuristics.entryFile,
    needsBuild: aiResult.needsBuild !== undefined ? aiResult.needsBuild : heuristics.needsBuild,
    buildCommand: aiResult.buildCommand || heuristics.buildCommand,
    recommendedPlatform: aiResult.recommendedPlatform || heuristics.recommendedPlatform,
    confidence: aiResult.confidence || heuristics.confidence,
    summary: aiResult.summary || heuristics.summary,
    languages: aiResult.languages && aiResult.languages.length > 0 ? aiResult.languages : heuristics.languages,
    totalFiles: stats.totalFiles,
    totalSize: stats.totalSize,
    languageStats: stats.languageStats,
    prebuilt: stats.prebuilt,
    prebuiltDir: stats.prebuiltDir,
    isStatic: stats.isStatic,
    hasRootIndexHtml: stats.hasRootIndexHtml,
    hasDistIndexHtml: stats.hasDistIndexHtml,
    files,
  };
}
