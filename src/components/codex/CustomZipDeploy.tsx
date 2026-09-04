import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  QrCode,
  FolderDown,
  Rocket,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Cpu,
  Layers,
  Wrench,
  ShieldAlert,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  unzipProject,
  computeProjectStats,
  runHeuristics,
  analyzeProjectWithAI,
  AnalysisReport,
  AnalyzedFile,
} from '../../lib/analyzer.js';
import { DeployResultData, PlatformTokens } from '../../types.js';
import { memory } from '../../lib/memory.js';

interface CustomZipDeployProps {
  tokens: PlatformTokens;
  onConnectPlatforms: () => void;
  onLoadedIntoWorkspace?: (count: number, entryPath?: string) => void;
  initialZipFile?: File | null;
  onCloseModal?: () => void;
}

export function CustomZipDeploy({
  tokens,
  onConnectPlatforms,
  onLoadedIntoWorkspace,
  initialZipFile,
  onCloseModal,
}: CustomZipDeployProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [streamedSummary, setStreamedSummary] = useState('');
  const [targetDir, setTargetDir] = useState<'prebuilt' | 'root'>('prebuilt');
  const [customProjectName, setCustomProjectName] = useState('custom-app');

  // Honest choice card state
  const [showBuildChoice, setShowBuildChoice] = useState(false);
  const [isBuildingServer, setIsBuildingServer] = useState(false);
  const [serverBuildError, setServerBuildError] = useState<string | null>(null);
  const [serverBuildLogs, setServerBuildLogs] = useState<string | null>(null);

  // Load into workspace state
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceLoadedCount, setWorkspaceLoadedCount] = useState<number | null>(null);

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResultData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typewriterTimerRef = useRef<any>(null);

  // Handle initial zip file if provided from outside
  useEffect(() => {
    if (initialZipFile) {
      handleZipFile(initialZipFile);
    }
  }, [initialZipFile]);

  // Stream AI summary with typewriter effect
  useEffect(() => {
    if (report?.summary) {
      setStreamedSummary('');
      let idx = 0;
      const fullText = report.summary;
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

      typewriterTimerRef.current = setInterval(() => {
        idx++;
        setStreamedSummary(fullText.slice(0, idx));
        if (idx >= fullText.length) {
          clearInterval(typewriterTimerRef.current);
        }
      }, 18);

      return () => {
        if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
      };
    }
  }, [report?.summary]);

  const resetState = () => {
    setReport(null);
    setStreamedSummary('');
    setErrorMessage(null);
    setShowBuildChoice(false);
    setServerBuildError(null);
    setServerBuildLogs(null);
    setDeployResult(null);
    setWorkspaceLoadedCount(null);
    setShowQrCode(false);
  };

  const handleZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please upload a valid .zip archive file.');
      return;
    }

    resetState();
    setIsProcessing(true);
    setProgressMsg('Unpacking ZIP file…');
    setProgressPercent(10);

    // Set default project name from file name
    const rawName = file.name.replace(/\.zip$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    setCustomProjectName(rawName || 'custom-app');

    try {
      // Step 2: Client-side UNZIP
      const { files, rootFolder } = await unzipProject(file, (msg, curr, tot) => {
        setProgressMsg(msg);
        setProgressPercent(Math.round((curr / tot) * 60) + 10);
      });

      // Step 3.a & 3.b: Stats & Heuristics
      setProgressMsg('🧠 Computing project heuristics & stats…');
      setProgressPercent(75);
      const stats = computeProjectStats(files);

      // Step 3.c: AI Deep Analysis
      setProgressMsg('✨ AI deep analyzing project architecture…');
      setProgressPercent(90);
      const fullReport = await analyzeProjectWithAI(files, stats);

      setReport(fullReport);
      setTargetDir(fullReport.prebuilt ? 'prebuilt' : 'root');
      setProgressPercent(100);
      setProgressMsg(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process ZIP file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleZipFile(e.dataTransfer.files[0]);
    }
  };

  // Step 5: Load into Workspace
  const handleLoadIntoWorkspace = async () => {
    if (!report) return;
    setIsLoadingWorkspace(true);
    setErrorMessage(null);

    try {
      const filesPayload: Array<{ path: string; content: string; isBinary?: boolean }> = [];

      for (const [path, f] of report.files.entries()) {
        if (f.isBinary && f.base64) {
          filesPayload.push({ path, content: f.base64, isBinary: true });
        } else {
          filesPayload.push({ path, content: f.text || '', isBinary: false });
          // Store text file in persistent RAM memory
          memory.rememberFile(path, f.text || '');
        }
      }

      const res = await fetch('/api/workspace/batch-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          clearExisting: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load files into workspace');
      }

      setWorkspaceLoadedCount(data.count);

      // Notify parent & dispatch event so sidebar file tree updates
      window.dispatchEvent(
        new CustomEvent('workspace_files_reloaded', {
          detail: { count: data.count, entryFile: report.entryFile },
        })
      );
      onLoadedIntoWorkspace?.(data.count, report.entryFile);
    } catch (err: any) {
      setErrorMessage(`Workspace load error: ${err.message}`);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  // Step 6: Server Build Attempt
  const handleTryServerBuild = async () => {
    if (!report) return;
    setIsBuildingServer(true);
    setServerBuildError(null);
    setServerBuildLogs(null);

    try {
      const filesPayload: Array<{ path: string; content: string; isBinary?: boolean }> = [];
      for (const [path, f] of report.files.entries()) {
        if (f.isBinary && f.base64) {
          filesPayload.push({ path, content: f.base64, isBinary: true });
        } else {
          filesPayload.push({ path, content: f.text || '', isBinary: false });
        }
      }

      const res = await fetch('/api/custom-deploy/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload }),
      });

      const data = await res.json();

      if (!data.success) {
        setServerBuildError(data.error || 'Server build failed.');
        return;
      }

      setServerBuildLogs(data.buildLogs || 'Build completed successfully.');

      // If build produced new files, add them
      if (data.files && data.files.length > 0) {
        const updatedFiles = new Map(report.files);
        for (const bf of data.files) {
          const fullPath = `${data.buildDir || 'dist'}/${bf.path}`;
          updatedFiles.set(fullPath, {
            path: fullPath,
            size: bf.content.length,
            isBinary: bf.isBinary,
            text: !bf.isBinary ? bf.content : undefined,
            base64: bf.isBinary ? bf.content : undefined,
          });
        }

        setReport({
          ...report,
          prebuilt: true,
          prebuiltDir: data.buildDir || 'dist',
          needsBuild: false,
          summary: `Server build succeeded! Generated ${data.files.length} production files in ${data.buildDir}/.`,
          files: updatedFiles,
        });
        setTargetDir('prebuilt');
        setShowBuildChoice(false);
      }
    } catch (err: any) {
      setServerBuildError(err.message || 'Build request failed');
    } finally {
      setIsBuildingServer(false);
    }
  };

  // Step 6: Deploy Now Trigger
  const handleDeployClick = () => {
    if (!report) return;

    // If project requires build and is not prebuilt, show honest choice card
    if (report.needsBuild && !report.prebuilt) {
      setShowBuildChoice(true);
      return;
    }

    executeDeployment();
  };

  const executeDeployment = async () => {
    if (!report) return;

    setIsDeploying(true);
    setDeployResult(null);
    setShowBuildChoice(false);
    setShowQrCode(false);
    setQrCodeUrl(null);

    try {
      // Filter files according to prebuilt or root choice
      const deployableFiles: Array<{ path: string; content: string; isBinary?: boolean }> = [];
      const isPrebuiltTarget = targetDir === 'prebuilt' && report.prebuilt && report.prebuiltDir;
      const prefix = isPrebuiltTarget ? `${report.prebuiltDir}/` : '';

      for (const [path, f] of report.files.entries()) {
        if (isPrebuiltTarget) {
          if (path.startsWith(prefix)) {
            const rel = path.slice(prefix.length);
            if (!rel) continue;
            deployableFiles.push({
              path: rel,
              content: f.isBinary ? f.base64 || '' : f.text || '',
              isBinary: f.isBinary,
            });
          }
        } else {
          deployableFiles.push({
            path,
            content: f.isBinary ? f.base64 || '' : f.text || '',
            isBinary: f.isBinary,
          });
        }
      }

      // Ensure index.html fallback if missing
      if (!deployableFiles.some((f) => f.path === 'index.html')) {
        deployableFiles.push({
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${customProjectName}</title>
  <style>body { font-family: system-ui; background: #05070f; color: #00f0ff; text-align: center; padding: 4rem 1rem; }</style>
</head>
<body>
  <h1>${customProjectName} is Live</h1>
  <p>Deployed via ALTREX Custom Deploy Pipeline</p>
</body>
</html>`,
          isBinary: false,
        });
      }

      // Call deployment endpoint with binary-safe chain order (Netlify first)
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'auto-fallback',
          projectName: customProjectName || 'custom-project',
          tokens,
          customFiles: deployableFiles,
          chainOrder: 'custom-zip', // Netlify -> Vercel -> GitHub Pages -> Neocities
        }),
      });

      const data: DeployResultData = await res.json();
      setDeployResult(data);

      if (data.success && data.url) {
        try {
          const qr = await QRCode.toDataURL(data.url, {
            color: { dark: '#00f0ff', light: '#05070f' },
            margin: 1,
          });
          setQrCodeUrl(qr);
        } catch (e) {
          console.warn('QR code generation failed:', e);
        }
      }
    } catch (err: any) {
      setDeployResult({
        success: false,
        platform: 'custom-zip',
        message: err.message || 'Deployment request failed',
        is247: true,
        deployedAt: new Date().toISOString(),
        errorDetails: {
          reason: err.message || 'Network failure',
          fixSuggestion: 'Check platform tokens or try loading into workspace to edit files.',
        },
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* STEP 1: UPLOAD ZONE */}
      {!report && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragOver
              ? 'border-[#ff00e5] bg-[#ff00e5]/10 ring-4 ring-[#ff00e5]/30 shadow-[0_0_35px_rgba(255,0,229,0.35)] scale-[1.01]'
              : 'border-cyan-500/40 bg-[#060b17] hover:border-cyan-400/80 hover:bg-[#081022]'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleZipFile(e.target.files[0]);
              }
            }}
          />

          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] mb-3">
            <UploadCloud className="w-8 h-8 animate-pulse text-cyan-400" />
          </div>

          <h3 className="text-base font-rajdhani font-bold text-white tracking-wide uppercase flex items-center gap-2">
            Upload Any Project ZIP <span className="text-[10px] px-2 py-0.5 rounded bg-magenta/20 text-[#ff8df7] border border-magenta/40 font-mono">CLIENT-SIDE UNZIP</span>
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
            Drag & drop your .zip file anywhere, or click Browse. AI analyzes every file, detects frameworks & prepares verified deployment.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-rajdhani font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Browse .zip File
            </button>
            <span className="text-[11px] text-slate-500 font-mono">Max 50MB</span>
          </div>

          {isProcessing && (
            <div className="mt-4 w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>{progressMsg || 'Processing…'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-[#ff00e5] transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs font-mono flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">ZIP Processing Notice</p>
            <p className="text-slate-300 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* STEP 4: ANALYSIS CARD (NEON HUD-PANEL) */}
      {report && (
        <div className="p-5 rounded-xl bg-[#060c1c] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,240,255,0.15)] space-y-4 text-slate-200">
          {/* Header with Framework & Confidence */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-400/40 text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-rajdhani text-white tracking-wide">
                    {report.framework} • {report.projectType}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                    confidence {report.confidence}%
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                  <FileArchive className="w-3 h-3 text-cyan-400" />
                  <span>
                    {report.totalFiles} files • {(report.totalSize / 1024).toFixed(1)} KB • entry:{' '}
                    <strong className="text-cyan-300">{report.entryFile}</strong>
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={resetState}
              className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Upload Different ZIP</span>
            </button>
          </div>

          {/* AI Streamed Summary Line */}
          <div className="p-3 rounded-lg bg-[#040814] border border-cyan-500/30 text-xs font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <Cpu className="w-3.5 h-3.5" />
              <span>ALTREX AI PROJECT INTELLIGENCE</span>
            </div>
            <p className="text-slate-300 leading-relaxed min-h-[2.5rem]">
              🧠 {streamedSummary || 'Analyzing project structure…'}
              {streamedSummary.length < report.summary.length && (
                <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-1 animate-pulse" />
              )}
            </p>
          </div>

          {/* Mini Bar Chart Chips: Language Breakdown */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400">Language & Asset Breakdown:</span>
            <div className="flex items-center flex-wrap gap-1.5">
              {report.languageStats.map((l, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 bg-black/40"
                  style={{ borderColor: `${l.color}40`, color: l.color }}
                >
                  <span>{l.icon}</span>
                  <span className="font-bold">{l.name}</span>
                  <span className="opacity-70">{l.count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Smart Status Chips */}
          <div className="flex items-center flex-wrap gap-2 pt-1">
            {report.isStatic ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" /> static-ready
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Not a static site — deploying best-effort
              </span>
            )}

            {report.prebuilt ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/40 font-mono">
                ⚡ prebuilt: {report.prebuiltDir}/
              </span>
            ) : report.needsBuild ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono">
                ⚙️ build required ({report.buildCommand})
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                ⚡ no build needed
              </span>
            )}

            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono">
              Target: {report.recommendedPlatform}
            </span>
          </div>

          {/* Subdomain / Project Name Input */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-mono text-slate-400">Deploy Subdomain / Project Name</label>
            <input
              type="text"
              value={customProjectName}
              onChange={(e) => setCustomProjectName(e.target.value)}
              className="w-full bg-[#040712] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
              placeholder="e.g. my-custom-app"
            />
          </div>

          {/* Prebuilt Directory Target Selection (if prebuilt available) */}
          {report.prebuilt && (
            <div className="p-2.5 rounded-lg bg-[#050917] border border-teal-500/30 flex items-center justify-between text-xs font-mono">
              <span className="text-teal-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Deploy from <strong className="text-white">{report.prebuiltDir}/</strong> export directory
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDir(targetDir === 'prebuilt' ? 'root' : 'prebuilt')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    targetDir === 'prebuilt'
                      ? 'bg-teal-500/30 text-teal-200 border border-teal-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {targetDir === 'prebuilt' ? '✓ Deploy dist/ folder' : 'Deploy source root'}
                </button>
              </div>
            </div>
          )}

          {/* HONEST CHOICE CARD (when build required & not prebuilt) */}
          {showBuildChoice && (
            <div className="p-4 rounded-xl bg-[#140b12] border border-[#ff00e5]/40 shadow-[0_0_20px_rgba(255,0,229,0.2)] space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-bold font-rajdhani text-sm">
                <ShieldAlert className="w-4 h-4 text-[#ff00e5]" />
                <span>BUILD STEP REQUIRED NOTICE</span>
              </div>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                This project appears to require a build compilation step (<code>{report.buildCommand}</code>). In browser sandboxes, CLI tools are restricted. You have two options:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleTryServerBuild}
                  disabled={isBuildingServer}
                  className="p-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 text-xs font-mono text-left flex items-start gap-2 cursor-pointer transition-all"
                >
                  {isBuildingServer ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0 mt-0.5" />
                  ) : (
                    <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-white">⚙️ Try Server Build</div>
                    <div className="text-[10px] text-slate-400">npm ci & build in sandbox (300s timeout)</div>
                  </div>
                </button>

                <button
                  onClick={executeDeployment}
                  disabled={isBuildingServer}
                  className="p-2.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-400 text-teal-200 text-xs font-mono text-left flex items-start gap-2 cursor-pointer transition-all"
                >
                  <Rocket className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">📦 Deploy Source Anyway</div>
                    <div className="text-[10px] text-slate-400">Best-effort static deployment</div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowBuildChoice(false)}
                  className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>

              {serverBuildError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 space-y-1 text-xs font-mono text-rose-200">
                  <div className="font-bold text-rose-400">❌ Server Build Output:</div>
                  <pre className="text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-tight text-slate-300">
                    {serverBuildError}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: [📂 Load into Workspace] & [🚀 Deploy Now] */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleLoadIntoWorkspace}
              disabled={isLoadingWorkspace || isDeploying}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0a152d] hover:bg-[#102246] border border-cyan-500/50 text-cyan-300 font-rajdhani font-bold text-xs tracking-wider rounded-lg transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.2)] disabled:opacity-50"
            >
              {isLoadingWorkspace ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>LOADING INTO WORKSPACE…</span>
                </>
              ) : (
                <>
                  <FolderDown className="w-4 h-4 text-cyan-400" />
                  <span>LOAD INTO WORKSPACE ({report.totalFiles} FILES)</span>
                </>
              )}
            </button>

            <button
              onClick={handleDeployClick}
              disabled={isDeploying || isLoadingWorkspace}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-rajdhani font-bold text-xs tracking-wider rounded-lg transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>DEPLOYING VERIFIED PIPELINE…</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 text-black" />
                  <span>DEPLOY NOW (VERIFIED PIPELINE)</span>
                </>
              )}
            </button>
          </div>

          {/* Workspace loaded notification */}
          {workspaceLoadedCount !== null && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>📂 {workspaceLoadedCount} files loaded into workspace — edit & redeploy anytime!</span>
              </span>
              <button
                onClick={onCloseModal}
                className="text-cyan-300 underline font-bold cursor-pointer hover:text-white"
              >
                Go to Editor ↗
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: VERIFIED DEPLOY RESULT CARD */}
      {deployResult && (
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            deployResult.success
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-sm font-rajdhani tracking-wide">
              {deployResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">DEPLOYMENT CONFIRMED READY ✅</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-white">DEPLOYMENT NOTICE</span>
                </>
              )}
            </div>
            {deployResult.platform && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-cyan-300">
                Target: {deployResult.platform}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 font-mono">{deployResult.message}</p>

          {/* Verified Ready Live URL */}
          {deployResult.success && deployResult.url && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#040711] border border-emerald-500/40 rounded-lg p-2.5">
                <span className="text-xs font-mono text-cyan-300 truncate mr-2 font-bold">
                  {deployResult.url}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyUrl(deployResult.url!)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  </button>
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Show QR Code for Mobile"
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                  </button>
                  <a
                    href={deployResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer font-bold flex items-center gap-1 text-xs px-2.5"
                    title="Open in new tab"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {showQrCode && qrCodeUrl && (
                <div className="p-3 bg-[#050811] border border-cyan-500/30 rounded-lg flex flex-col items-center gap-2 animate-in fade-in">
                  <img src={qrCodeUrl} alt="Mobile QR Code" className="w-40 h-40 rounded border border-cyan-500/40" />
                  <span className="text-[11px] text-cyan-300 font-mono">Scan with your mobile camera to open site</span>
                </div>
              )}
            </div>
          )}

          {/* Error Remediation */}
          {!deployResult.success && deployResult.errorDetails && (
            <div className="p-3 rounded-lg bg-[#14080a] border border-rose-500/40 space-y-2 text-xs font-mono text-rose-200">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <span>💡 Error Intelligence:</span>
              </div>
              <div>{deployResult.errorDetails.reason}</div>
              <div className="text-cyan-300 pt-1 border-t border-rose-950/60 flex items-center justify-between flex-wrap gap-2">
                <span>{deployResult.errorDetails.fixSuggestion}</span>
                <button
                  onClick={onConnectPlatforms}
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  <span>Connect Token</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Platform Logs Stream */}
          {deployResult.logs && deployResult.logs.length > 0 && (
            <div className="bg-[#04060f] p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 max-h-36 overflow-y-auto space-y-0.5">
              {deployResult.logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
