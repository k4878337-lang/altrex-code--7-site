import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  X,
  Sparkles,
  Layers,
  Code2,
  Split,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { WorkspaceFile, EditorPreviewMode } from '../../types.js';
import { memory } from '../../lib/memory.js';

interface LivePreviewPanelProps {
  files: WorkspaceFile[];
  activeFile: string | null;
  fileContent: string;
  previewMode: EditorPreviewMode;
  onClose: () => void;
  onChangeMode?: (mode: EditorPreviewMode) => void;
  isMobileFullscreen?: boolean;
}

type DeviceWidth = '375px' | '768px' | '100%';

export function LivePreviewPanel({
  files,
  activeFile,
  fileContent,
  previewMode,
  onClose,
  onChangeMode,
  isMobileFullscreen = false,
}: LivePreviewPanelProps) {
  const [deviceWidth, setDeviceWidth] = useState<DeviceWidth>('100%');
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<any>(null);

  // Helper to compile HTML document on the fly
  const compileProjectToHtml = () => {
    // 1. Retrieve all saved files from memory and active editor buffer
    const savedFiles = memory.getSavedFiles();
    const fileMap = new Map<string, string>();

    for (const f of savedFiles) {
      fileMap.set(f.path, f.content);
    }

    // Apply live unsaved editor content if active
    if (activeFile) {
      fileMap.set(activeFile, fileContent);
    }

    // Also check files prop
    for (const f of files) {
      if (!fileMap.has(f.path) && (f as any).content) {
        fileMap.set(f.path, (f as any).content);
      }
    }

    // 2. Find index.html or any HTML file
    let htmlPath: string | null = null;
    for (const path of fileMap.keys()) {
      if (path.endsWith('index.html')) {
        htmlPath = path;
        break;
      }
    }
    if (!htmlPath) {
      for (const path of fileMap.keys()) {
        if (path.endsWith('.html')) {
          htmlPath = path;
          break;
        }
      }
    }

    let baseHtml = htmlPath ? fileMap.get(htmlPath) || '' : '';

    if (!baseHtml.trim()) {
      // Return beautiful HUD placeholder if no HTML file exists
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ALTREX LIVE PREVIEW</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #020409;
      color: #e8fbff;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      box-sizing: border-box;
      padding: 2rem;
    }
    .hud-box {
      border: 1px solid rgba(0, 240, 255, 0.4);
      background: rgba(2, 4, 10, 0.9);
      padding: 2.5rem;
      border-radius: 12px;
      max-width: 480px;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.15);
      position: relative;
    }
    .hud-box::before {
      content: '';
      position: absolute;
      top: -2px; left: -2px;
      width: 14px; height: 14px;
      border-top: 2px solid #00f0ff;
      border-left: 2px solid #00f0ff;
    }
    .hud-box::after {
      content: '';
      position: absolute;
      bottom: -2px; right: -2px;
      width: 14px; height: 14px;
      border-bottom: 2px solid #00f0ff;
      border-right: 2px solid #00f0ff;
    }
    h2 {
      margin: 0 0 0.8rem 0;
      color: #00f0ff;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      font-size: 1.25rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .pulse-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00f0ff;
      margin-right: 6px;
      box-shadow: 0 0 8px #00f0ff;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }
  </style>
</head>
<body>
  <div class="hud-box">
    <h2><span class="pulse-dot"></span>ALTREX // LIVE PREVIEW</h2>
    <p>Awaiting <code>index.html</code>. Ask ATX-1 in the chat to generate a web app, portfolio, or landing page, and it will render live automatically.</p>
  </div>
</body>
</html>`;
    }

    // 3. Inline all CSS files
    const cssBlocks: string[] = [];
    for (const [path, content] of fileMap.entries()) {
      if (path.endsWith('.css') && content.trim()) {
        cssBlocks.push(`/* ${path} */\n${content}`);
      }
    }

    // 4. Inline all JS files
    const jsBlocks: string[] = [];
    for (const [path, content] of fileMap.entries()) {
      if (
        (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts')) &&
        !path.endsWith('.config.js') &&
        !path.endsWith('.config.ts') &&
        content.trim()
      ) {
        // Strip out simple TS type declarations or import statements if needed for raw browser execution
        const cleanContent = content
          .replace(/import\s+.*?\s+from\s+['"][^'"]+['"];?/g, '// [inlined import]')
          .replace(/export\s+default\s+/g, '')
          .replace(/export\s+/g, '');
        jsBlocks.push(`// Inlined from: ${path}\n${cleanContent}`);
      }
    }

    // 5. Assemble HTML document
    let compiled = baseHtml;

    if (cssBlocks.length > 0) {
      const styleTag = `<style>\n${cssBlocks.join('\n\n')}\n</style>`;
      if (compiled.includes('</head>')) {
        compiled = compiled.replace('</head>', `${styleTag}\n</head>`);
      } else {
        compiled = `${styleTag}\n${compiled}`;
      }
    }

    if (jsBlocks.length > 0) {
      const scriptTag = `<script>\ntry {\n${jsBlocks.join('\n\n')}\n} catch(err) {\n  console.error('[ALTREX Preview Runtime Error]:', err);\n}\n</script>`;
      if (compiled.includes('</body>')) {
        compiled = compiled.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        compiled = `${compiled}\n${scriptTag}`;
      }
    }

    return compiled;
  };

  // Rebuild Blob URL whenever files or active content changes
  const buildAndReloadPreview = () => {
    setIsRefreshing(true);
    setJustUpdated(true);

    try {
      const html = compileProjectToHtml();
      const newBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const newUrl = URL.createObjectURL(newBlob);

      // Revoke old URL to prevent memory leaks
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      prevBlobUrlRef.current = newUrl;
      setBlobUrl(newUrl);
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to compile preview blob', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
      setTimeout(() => {
        setJustUpdated(false);
      }, 1200);
    }
  };

  // Auto-refresh debounced on file edits (800ms)
  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      buildAndReloadPreview();
    }, 400);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [files, activeFile, fileContent]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

  const handleOpenExternal = () => {
    if (!blobUrl) return;
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // Fallback
      window.location.href = blobUrl;
    }
  };

  const hasIndexHtml = useMemo(() => {
    const saved = memory.getSavedFiles();
    return (
      saved.some((f) => f.path.endsWith('.html')) ||
      files.some((f) => f.path.endsWith('.html')) ||
      (activeFile && activeFile.endsWith('.html'))
    );
  }, [files, activeFile]);

  return (
    <div
      className={`flex flex-col h-full bg-[#020409] font-mono relative overflow-hidden transition-all duration-300 ${
        previewMode === 'split' ? 'border-l border-magenta/40' : ''
      } ${isMobileFullscreen ? 'fixed inset-0 z-50' : 'flex-1'}`}
    >
      {/* HUD Corner Brackets for Neon Cyber */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-magenta pointer-events-none z-30" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-magenta pointer-events-none z-30" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-magenta pointer-events-none z-30" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-magenta pointer-events-none z-30" />

      {/* Top Preview Toolbar */}
      <div
        className={`h-9 border-b border-magenta/30 bg-black/85 backdrop-blur-md flex items-center justify-between px-2.5 shrink-0 select-none z-20 transition-all duration-300 ${
          justUpdated ? 'shadow-[0_0_15px_rgba(0,240,255,0.4)] border-cyan-400/80' : ''
        }`}
      >
        {/* Left: Status Indicator & Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-magenta/10 border border-magenta/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_#10B981]" />
            </span>
            <span className="text-[10px] font-bold text-emerald-300 tracking-wider font-rajdhani">
              LIVE PREVIEW
            </span>
            <span className="text-[9px] text-zinc-500 hidden sm:inline">
              ({hasIndexHtml ? 'index.html' : 'Awaiting HTML'})
            </span>
          </div>

          {/* Segmented Mode Selector [CODE | SPLIT | PREVIEW] */}
          {onChangeMode && (
            <div className="hidden sm:flex items-center bg-black/60 border border-cyan-500/40 rounded p-0.5 text-[10px]">
              <button
                onClick={() => onChangeMode('code')}
                className={`px-1.5 py-0.5 rounded transition-all font-rajdhani font-semibold ${
                  previewMode === 'code'
                    ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Code Editor Only"
              >
                CODE
              </button>
              <button
                onClick={() => onChangeMode('split')}
                className={`px-1.5 py-0.5 rounded transition-all font-rajdhani font-semibold ${
                  previewMode === 'split'
                    ? 'bg-magenta/30 text-[#ff8df7] border border-magenta/60 shadow-[0_0_8px_rgba(255,0,229,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Split 50/50: Code Left + Preview Right"
              >
                SPLIT
              </button>
              <button
                onClick={() => onChangeMode('preview')}
                className={`px-1.5 py-0.5 rounded transition-all font-rajdhani font-semibold ${
                  previewMode === 'preview'
                    ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Full Canvas Preview"
              >
                PREVIEW
              </button>
            </div>
          )}
        </div>

        {/* Center: Device Width Resizer */}
        <div className="flex items-center gap-1 bg-black/60 border border-magenta/30 rounded p-0.5 text-[10px]">
          <button
            onClick={() => setDeviceWidth('375px')}
            title="Mobile Portrait (375px)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              deviceWidth === '375px'
                ? 'bg-magenta/30 text-[#ff8df7] border border-magenta/50 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={11} />
            <span className="hidden md:inline">375px</span>
          </button>
          <button
            onClick={() => setDeviceWidth('768px')}
            title="Tablet View (768px)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              deviceWidth === '768px'
                ? 'bg-magenta/30 text-[#ff8df7] border border-magenta/50 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tablet size={11} />
            <span className="hidden md:inline">768px</span>
          </button>
          <button
            onClick={() => setDeviceWidth('100%')}
            title="Full Width (100%)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              deviceWidth === '100%'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor size={11} />
            <span className="hidden md:inline">FULL</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={buildAndReloadPreview}
            title="Reload Preview Frame"
            className="p-1 rounded text-zinc-400 hover:text-cyan-400 hover:bg-cyan-950/30 transition-colors cursor-pointer"
          >
            <RotateCw size={12} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>

          <button
            onClick={handleOpenExternal}
            title="Open In New Window / Browser Tab"
            className="p-1 rounded text-zinc-400 hover:text-magenta hover:bg-magenta/10 transition-colors cursor-pointer"
          >
            <ExternalLink size={12} />
          </button>

          <button
            onClick={onClose}
            title="Close Preview (Switch to Code Editor)"
            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Iframe Viewport Area */}
      <div className="flex-1 bg-[#010206] flex items-center justify-center overflow-auto p-0 relative">
        <div
          className="h-full transition-all duration-300 flex flex-col bg-white relative shadow-2xl"
          style={{
            width: deviceWidth,
            maxWidth: '100%',
            boxShadow: deviceWidth !== '100%' ? '0 0 40px rgba(255, 0, 229, 0.25)' : 'none',
            borderLeft: deviceWidth !== '100%' ? '2px solid rgba(255, 0, 229, 0.4)' : 'none',
            borderRight: deviceWidth !== '100%' ? '2px solid rgba(255, 0, 229, 0.4)' : 'none',
          }}
        >
          {blobUrl ? (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="ALTREX Live App Preview"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-cyan-400 space-y-2">
              <RotateCw className="animate-spin text-cyan-400" size={20} />
              <span className="text-xs font-mono">Compiling in-memory HTML...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
