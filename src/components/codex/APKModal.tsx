import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  FileCode2,
  Layers,
  Sparkles,
  Cloud,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Key,
  Check,
  Copy,
} from 'lucide-react';
import { APKResultData, PlatformTokens } from '../../types.js';
import { getStoredTokens, isSandboxEnvironment } from '../../lib/tokens.js';
import { promptPWAInstall, isPWAInstallAvailable, generatePWAManifest, generateServiceWorker } from '../../lib/pwa.js';
import { ConnectPlatformsModal } from './ConnectPlatformsModal.js';

interface APKModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAppName?: string;
}

type TabType = 'pwa' | 'cloud' | 'export';

export function APKModal({ isOpen, onClose, defaultAppName = 'ALTREX App' }: APKModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pwa');
  const [appName, setAppName] = useState(defaultAppName);
  const [appId, setAppId] = useState('com.altrex.app');
  const [versionName, setVersionName] = useState('1.0.0');

  // Cloud build state
  const [isBuildingCloud, setIsBuildingCloud] = useState(false);
  const [cloudResult, setCloudResult] = useState<APKResultData | null>(null);
  const [tokens, setTokens] = useState<PlatformTokens>(() => getStoredTokens());
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // PWA state
  const [pwaInstallStatus, setPwaInstallStatus] = useState<'idle' | 'installed' | 'unsupported'>('idle');
  const [pwaPromptReady, setPwaPromptReady] = useState(() => isPWAInstallAvailable());

  // Export ZIP state
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // QR Code
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    setAppName(defaultAppName);
    const clean = defaultAppName.toLowerCase().replace(/[^a-z0-9]/g, '');
    setAppId(`com.altrex.${clean || 'app'}`);
    setTokens(getStoredTokens());

    const handlePromptReady = () => setPwaPromptReady(true);
    const handleInstalled = () => setPwaInstallStatus('installed');

    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('pwa_installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('pwa_installed', handleInstalled);
    };
  }, [defaultAppName, isOpen]);

  if (!isOpen) return null;

  const hasGithubToken = Boolean(tokens.github);

  // Trigger PWA installation
  const handlePWAInstall = async () => {
    const res = await promptPWAInstall();
    if (res.outcome === 'accepted') {
      setPwaInstallStatus('installed');
    } else if (res.outcome === 'unsupported') {
      setPwaInstallStatus('unsupported');
    }
  };

  // Trigger Cloud APK Build via GitHub Actions
  const handleCloudBuild = async () => {
    setIsBuildingCloud(true);
    setCloudResult(null);
    setShowQR(false);

    try {
      const res = await fetch('/api/build-cloud-apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          appId,
          versionName,
          githubToken: tokens.github,
        }),
      });
      const data: APKResultData = await res.json();
      setCloudResult(data);
      if (data.success && data.qrCodeData) {
        setShowQR(true);
      }
    } catch (err: any) {
      setCloudResult({
        success: false,
        appName,
        appId,
        versionName,
        message: err.message || 'Cloud build request failed',
        buildLogs: [err.message],
        errorDetails: {
          reason: err.message,
          fixSuggestion: 'Check your internet connection and GitHub token scopes (`repo`, `workflow`).',
        },
      });
    } finally {
      setIsBuildingCloud(false);
    }
  };

  // Export full Android project zip
  const handleExportAndroidZip = async () => {
    setIsExportingZip(true);
    setExportSuccess(false);

    try {
      const res = await fetch('/api/export-android-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          appId,
          versionName,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate Android project zip');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-android-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExportSuccess(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-[#070b14] border border-emerald-500/40 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden text-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-[#0a141a]">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-rajdhani font-bold text-white flex items-center gap-2 tracking-wide">
                  SANDBOX-SAFE MOBILE PIPELINE <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">PWA • CLOUD APK • EXPORT</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">Direct phone install without local Gradle limitations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#0e1f1d] hover:bg-[#152e2a] border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasGithubToken ? 'GitHub Connected' : 'Connect GitHub'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Honest Sandbox Explainer Banner */}
          <div className="px-6 py-2.5 bg-emerald-950/20 border-b border-emerald-500/20 flex items-center gap-2.5 text-xs font-mono text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Browser sandboxes block local Android SDKs. Choose one of 3 real, verified paths below:</span>
          </div>

          {/* 3 Real Options Tabs */}
          <div className="flex border-b border-slate-800 bg-[#060c14] px-6 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`px-4 py-2.5 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'pwa'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>PATH A: 📲 Instant PWA (Recommended)</span>
            </button>

            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-4 py-2.5 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'cloud'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>PATH B: ☁️ Cloud APK (GitHub Actions)</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2.5 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'export'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>PATH C: 📦 Export Project ZIP</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Common Inputs: App Name & ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400">Mobile App Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => {
                    setAppName(e.target.value);
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setAppId(`com.altrex.${clean || 'app'}`);
                  }}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
                  placeholder="ALTREX App"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400">Package Identifier</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full bg-[#050811] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                  placeholder="com.altrex.app"
                />
              </div>
            </div>

            {/* TAB CONTENT: PATH A - PWA INSTALL */}
            {activeTab === 'pwa' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-[#09151e] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white font-rajdhani tracking-wide">
                        INSTANT PROGRESSIVE WEB APP (ZERO BUILD TIME)
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Installs instantly on Android & iOS home screen with native icon, offline support, and fullscreen launch.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#050b12] rounded-lg border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                    <div className="text-emerald-400 font-bold">✨ Why this is the best option:</div>
                    <div>• 0 seconds build time (no waiting for 5-minute Gradle compile)</div>
                    <div>• Looks and behaves exactly like a native app on your phone</div>
                    <div>• Full offline cache via Service Worker</div>
                  </div>

                  <button
                    onClick={handlePWAInstall}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-rajdhani font-bold text-sm tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-black" />
                    <span>INSTALL AS NATIVE APP NOW</span>
                  </button>

                  {pwaInstallStatus === 'installed' && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>App installed successfully on your device! Check your home screen or app drawer.</span>
                    </div>
                  )}

                  {/* Manual Phone Instructions */}
                  <div className="border-t border-emerald-500/20 pt-3 space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-300">📱 How to install directly on phone:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                      <div className="p-2.5 rounded bg-[#060c14] border border-slate-800 space-y-1">
                        <div className="text-emerald-300 font-bold">Android (Chrome):</div>
                        <div>1. Open this app in Chrome</div>
                        <div>2. Tap three dots menu (⋮)</div>
                        <div>3. Tap "Add to Home screen" or "Install App"</div>
                      </div>
                      <div className="p-2.5 rounded bg-[#060c14] border border-slate-800 space-y-1">
                        <div className="text-cyan-300 font-bold">iPhone (Safari):</div>
                        <div>1. Open this app in Safari</div>
                        <div>2. Tap the Share button (⎋)</div>
                        <div>3. Scroll down & tap "Add to Home Screen"</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PATH B - CLOUD APK BUILD */}
            {activeTab === 'cloud' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-[#09151e] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        <Cloud className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white font-rajdhani tracking-wide">
                          CLOUD APK BUILD VIA GITHUB ACTIONS
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">100% Free • Real .apk compilation on GitHub's Ubuntu runners</p>
                      </div>
                    </div>

                    {!hasGithubToken && (
                      <button
                        onClick={() => setIsConnectModalOpen(true)}
                        className="px-3 py-1.5 bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs font-mono rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Connect Token</span>
                      </button>
                    )}
                  </div>

                  {!hasGithubToken && (
                    <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg text-xs font-mono text-purple-200 flex items-center justify-between gap-2">
                      <span>Connect a free GitHub Classic Token with `repo` and `workflow` scopes to start cloud builds.</span>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline font-bold shrink-0 flex items-center gap-1"
                      >
                        <span>Get Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="p-2 bg-[#050b12] rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold">1. Package</span>
                      <p className="text-slate-400 mt-0.5">Capacitor native project generated in memory</p>
                    </div>
                    <div className="p-2 bg-[#050b12] rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold">2. GitHub Action</span>
                      <p className="text-slate-400 mt-0.5">Runs Java 17 + Gradle assembleDebug</p>
                    </div>
                    <div className="p-2 bg-[#050b12] rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold">3. Ready in ~3m</span>
                      <p className="text-slate-400 mt-0.5">Real .apk artifact download</p>
                    </div>
                  </div>

                  <button
                    onClick={handleCloudBuild}
                    disabled={isBuildingCloud || !hasGithubToken}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-rajdhani font-bold text-sm tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isBuildingCloud ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>DISPATCHING GITHUB CLOUD BUILD...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 text-black" />
                        <span>START 100% FREE CLOUD BUILD</span>
                      </>
                    )}
                  </button>

                  {cloudResult && (
                    <div
                      className={`p-4 rounded-xl border space-y-3 ${
                        cloudResult.success
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm font-rajdhani">
                          {cloudResult.success ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              <span className="text-white">WORKFLOW RUNNING IN CLOUD! 🚀</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-rose-400" />
                              <span className="text-white">CLOUD BUILD NOTICE</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-mono">{cloudResult.message}</p>

                      {cloudResult.workflowUrl && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-[#040711] border border-emerald-500/40 rounded-lg p-2.5">
                            <span className="text-xs font-mono text-cyan-300 truncate mr-2 font-bold">
                              {cloudResult.workflowUrl}
                            </span>
                            <a
                              href={cloudResult.workflowUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold rounded flex items-center gap-1"
                            >
                              <span>Track Live</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {cloudResult.qrCodeData && (
                            <div className="text-center space-y-2">
                              <button
                                onClick={() => setShowQR(!showQR)}
                                className="text-xs text-emerald-400 hover:underline flex items-center gap-1.5 mx-auto font-mono cursor-pointer"
                              >
                                <QrCode className="w-4 h-4" />
                                <span>{showQR ? 'Hide' : 'Show'} Mobile QR Code</span>
                              </button>

                              {showQR && (
                                <div className="p-3 bg-[#050811] border border-cyan-500/30 rounded-lg inline-block">
                                  <img
                                    src={cloudResult.qrCodeData}
                                    alt="Mobile tracking QR code"
                                    className="w-40 h-40 mx-auto rounded border border-cyan-500/40"
                                  />
                                  <p className="text-[10px] text-cyan-300 font-mono mt-1">
                                    Scan to view GitHub Action build on your phone
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error Intelligence */}
                      {!cloudResult.success && cloudResult.errorDetails && (
                        <div className="p-3 rounded-lg bg-[#14080a] border border-rose-500/40 space-y-2 text-xs font-mono text-rose-200">
                          <div>{cloudResult.errorDetails.reason}</div>
                          <div className="text-cyan-300 pt-1 border-t border-rose-950/60">
                            {cloudResult.errorDetails.fixSuggestion}
                          </div>
                        </div>
                      )}

                      {cloudResult.buildLogs && cloudResult.buildLogs.length > 0 && (
                        <div className="bg-[#04060f] p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 max-h-32 overflow-y-auto space-y-0.5">
                          {cloudResult.buildLogs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PATH C - EXPORT ZIP */}
            {activeTab === 'export' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-xl bg-[#09151e] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      <Download className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white font-rajdhani tracking-wide">
                        EXPORT FULL ANDROID STUDIO PROJECT ZIP
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Download ready-to-run Capacitor + Gradle project with pre-configured GitHub Actions workflow
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#050b12] rounded-lg border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                    <div className="text-emerald-400 font-bold">📦 Package Includes:</div>
                    <div>• Complete `android/` directory (`build.gradle`, `AndroidManifest.xml`, `MainActivity.java`)</div>
                    <div>• Bundled `www/` assets with offline WebView container</div>
                    <div>• `.github/workflows/apk.yml` (ready for free cloud building on any GitHub repo)</div>
                    <div>• `README.md` with step-by-step CLI & Android Studio instructions</div>
                  </div>

                  <button
                    onClick={handleExportAndroidZip}
                    disabled={isExportingZip}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-rajdhani font-bold text-sm tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExportingZip ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>PACKAGING ANDROID PROJECT...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-black" />
                        <span>DOWNLOAD COMPLETE ANDROID PROJECT ZIP</span>
                      </>
                    )}
                  </button>

                  {exportSuccess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Android project ZIP downloaded! Open it in Android Studio or push to GitHub to build the APK.</span>
                    </div>
                  )}
                </div>
              </div>
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
