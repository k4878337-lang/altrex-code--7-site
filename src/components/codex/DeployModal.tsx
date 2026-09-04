import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Key,
  Download,
  AlertTriangle,
  QrCode,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DeployPlatformType, DeployResultData, PlatformTokens } from '../../types.js';
import { getStoredTokens, hasAnyToken, isSandboxEnvironment } from '../../lib/tokens.js';
import { ConnectPlatformsModal } from './ConnectPlatformsModal.js';
import { CustomZipDeploy } from './CustomZipDeploy.js';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  initialTab?: 'workspace' | 'custom-zip';
}

interface PlatformOption {
  id: DeployPlatformType;
  name: string;
  badge: string;
  freeTier: string;
  bestFor: string;
  borderClass: string;
  textClass: string;
  needsTokenKey?: keyof PlatformTokens;
}

const PLATFORMS: PlatformOption[] = [
  {
    id: 'auto-fallback',
    name: 'Auto-Fallback Chain',
    badge: 'RECOMMENDED',
    freeTier: 'Tries Vercel → Netlify → GitHub Pages',
    bestFor: 'Maximum reliability: First successful API deploy wins',
    borderClass: 'border-cyan-500/40 bg-cyan-950/20',
    textClass: 'text-cyan-400',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    badge: 'REST API v13',
    freeTier: '100GB bandwidth • Instant Edge Deploy',
    bestFor: 'Zero CLI required • Verified ready state',
    borderClass: 'border-slate-300/40 bg-slate-800/30',
    textClass: 'text-slate-200',
    needsTokenKey: 'vercel',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    badge: 'ZIP REST API',
    freeTier: '100GB bandwidth • 300 build minutes',
    bestFor: 'In-memory ZIP upload to Netlify Sites API',
    borderClass: 'border-teal-500/40 bg-teal-950/20',
    textClass: 'text-teal-400',
    needsTokenKey: 'netlify',
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    badge: 'PAGES REST API',
    freeTier: '100GB/mo • Unlimited repos',
    bestFor: 'Automated repo creation & GitHub Pages publishing',
    borderClass: 'border-purple-500/40 bg-purple-950/20',
    textClass: 'text-purple-300',
    needsTokenKey: 'github',
  },
  {
    id: 'neocities',
    name: 'Neocities',
    badge: 'REST API',
    freeTier: '1GB storage • 200GB bandwidth',
    bestFor: 'Instant retro static web hosting',
    borderClass: 'border-emerald-500/40 bg-emerald-950/20',
    textClass: 'text-emerald-400',
    needsTokenKey: 'neocitiesPass',
  },
];

export function DeployModal({ isOpen, onClose, projectName = 'altrex-project', initialTab = 'workspace' }: DeployModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<DeployPlatformType>('auto-fallback');
  const [customName, setCustomName] = useState(projectName);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResultData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [tokens, setTokens] = useState<PlatformTokens>(() => getStoredTokens());
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'custom-zip'>(initialTab);
  const [modalDragOver, setModalDragOver] = useState(false);
  const [droppedZip, setDroppedZip] = useState<File | null>(null);

  useEffect(() => {
    setCustomName(projectName);
    setTokens(getStoredTokens());
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [projectName, isOpen, initialTab]);

  if (!isOpen) return null;

  const hasTokens = hasAnyToken(tokens);
  const isSandbox = isSandboxEnvironment();

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalDragOver(true);
  };

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalDragOver(false);
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setDroppedZip(file);
        setActiveTab('custom-zip');
      }
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);
    setShowQrCode(false);
    setQrCodeUrl(null);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          projectName: customName || 'altrex-app',
          tokens,
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
        platform: selectedPlatform,
        message: err.message || 'Deployment request failed',
        is247: true,
        deployedAt: new Date().toISOString(),
        errorDetails: {
          reason: err.message || 'Network failure',
          fixSuggestion: 'Check your internet connection or use the Zero-Token Netlify Drop path.',
        },
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const link = document.createElement('a');
      link.href = '/api/workspace/zip';
      link.download = `${customName || 'altrex-project'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      console.error('ZIP download error:', e);
    } finally {
      setTimeout(() => setIsDownloadingZip(false), 1000);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        onDragOver={handleModalDragOver}
        onDragLeave={handleModalDragLeave}
        onDrop={handleModalDrop}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      >
        <div
          className={`bg-[#070b14] rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 transition-all ${
            modalDragOver
              ? 'border-2 border-[#ff00e5] shadow-[0_0_60px_rgba(255,0,229,0.4)] scale-[1.005]'
              : 'border border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.15)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0a101f]">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <Rocket className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-rajdhani font-bold text-white flex items-center gap-2 tracking-wide">
                  SANDBOX-SAFE DEPLOY ENGINE <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">REST API • 24/7 FREE</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">Zero CLI logins • Verified ready state • 100% Free edge hosting</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#121c33] hover:bg-[#1a2847] border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasTokens ? 'Manage Tokens' : 'Connect Platforms'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center border-b border-cyan-500/20 bg-[#060b17] px-6">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-rajdhani font-bold tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'workspace'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              <span>⚡ WORKSPACE PROJECT</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom-zip')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-rajdhani font-bold tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'custom-zip'
                  ? 'border-[#ff00e5] text-[#ff8df7] bg-[#ff00e5]/10 shadow-[0_0_15px_rgba(255,0,229,0.2)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📦</span>
              <span>CUSTOM DEPLOY</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-magenta/20 text-[#ff8df7] border border-magenta/40 font-mono">
                UPLOAD ANY ZIP
              </span>
            </button>
          </div>

          {/* Honest Notice / Zero-Token Banner */}
          {!hasTokens && activeTab === 'workspace' && (
            <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs font-mono text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No platform tokens connected yet. You can use <strong>Download ZIP + Netlify Drop</strong> (zero login) or connect free tokens.</span>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="text-cyan-300 hover:text-white underline cursor-pointer shrink-0 font-bold"
              >
                Connect Free Token ↗
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeTab === 'custom-zip' ? (
              <CustomZipDeploy
                tokens={tokens}
                onConnectPlatforms={() => setIsConnectModalOpen(true)}
                initialZipFile={droppedZip}
                onCloseModal={onClose}
              />
            ) : (
              <>
                {/* Project Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Project / Subdomain Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                    placeholder="e.g. my-awesome-app"
                  />
                </div>

            {/* Platform Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Select REST Deployment Target</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> No CLI • Sandbox Safe
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {PLATFORMS.map((p) => {
                  const isSelected = selectedPlatform === p.id;
                  const hasTokenForThis = !p.needsTokenKey || Boolean(tokens[p.needsTokenKey]);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`text-left p-3 rounded-lg border transition-all flex items-start justify-between cursor-pointer ${
                        isSelected
                          ? `${p.borderClass} ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]`
                          : 'border-slate-800/80 bg-[#070c18] hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Globe className={`w-4 h-4 ${p.textClass}`} />
                          <span className="text-sm font-bold text-white font-rajdhani tracking-wide">{p.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                            {p.badge}
                          </span>
                          {p.needsTokenKey && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                hasTokenForThis
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}
                            >
                              {hasTokenForThis ? '● Connected' : '○ Needs Token'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{p.bestFor}</p>
                        <p className="text-[11px] font-mono text-slate-500">{p.freeTier}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zero-Token Path Card: Download ZIP + Netlify Drop */}
            <div className="p-4 rounded-xl bg-[#091122] border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-950 border border-teal-500/40 text-teal-300">
                    <Download className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white font-rajdhani tracking-wide uppercase">
                      Zero-Token Instant Path — Netlify Drop
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">No API tokens or account login required</p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloadingZip}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-300 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(20,184,166,0.2)]"
                >
                  {isDownloadingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>Download Build ZIP</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-400">
                <div className="p-2 rounded bg-[#060a16] border border-slate-800/80 flex items-start gap-2">
                  <span className="text-teal-400 font-bold">1.</span>
                  <span>Click "Download Build ZIP"</span>
                </div>
                <div className="p-2 rounded bg-[#060a16] border border-slate-800/80 flex items-start gap-2">
                  <span className="text-teal-400 font-bold">2.</span>
                  <span>
                    Open{' '}
                    <a
                      href="https://app.netlify.com/drop"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 underline hover:text-cyan-300 inline-flex items-center gap-0.5"
                    >
                      netlify.com/drop <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </span>
                </div>
                <div className="p-2 rounded bg-[#060a16] border border-slate-800/80 flex items-start gap-2">
                  <span className="text-teal-400 font-bold">3.</span>
                  <span>Drag & drop ZIP — Live in 5s!</span>
                </div>
              </div>
            </div>

            {/* Deploy Action Button */}
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-rajdhani font-bold text-sm tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>EXECUTING REST API DEPLOYMENT...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 text-black" />
                  <span>START AUTOMATED DEPLOY ({selectedPlatform.toUpperCase()})</span>
                </>
              )}
            </button>

            {/* Deploy Result Card */}
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
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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

                {/* Error Intelligence & Remediation */}
                {!deployResult.success && deployResult.errorDetails && (
                  <div className="p-3 rounded-lg bg-[#14080a] border border-rose-500/40 space-y-2 text-xs font-mono text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <span>💡 Error Intelligence:</span>
                    </div>
                    <div>{deployResult.errorDetails.reason}</div>
                    <div className="text-cyan-300 pt-1 border-t border-rose-950/60 flex items-center justify-between flex-wrap gap-2">
                      <span>{deployResult.errorDetails.fixSuggestion}</span>
                      <button
                        onClick={() => setIsConnectModalOpen(true)}
                        className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>Connect Token</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Log Stream */}
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
          </>
        )}
          </div>
        </div>
      </div>

      <ConnectPlatformsModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onTokensUpdated={(t) => setTokens(t)}
      />
    </>
  );
}
