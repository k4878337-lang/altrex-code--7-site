import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  X,
  Sparkles,
  Info,
  Zap,
} from 'lucide-react';
import { PlatformTokens } from '../../types.js';
import { getStoredTokens, saveStoredTokens } from '../../lib/tokens.js';

interface ConnectPlatformsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokensUpdated?: (tokens: PlatformTokens) => void;
}

interface PlatformConfigRow {
  id: keyof PlatformTokens | 'cloudflare';
  name: string;
  badge: string;
  badgeColor: string;
  tokenKey: keyof PlatformTokens;
  helperUrl: string;
  instructions: string;
  placeholder: string;
  scopeNeeded?: string;
}

const PLATFORMS_LIST: PlatformConfigRow[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    badge: 'FREE 100GB/MO',
    badgeColor: 'bg-white/10 text-white border-white/20',
    tokenKey: 'vercel',
    helperUrl: 'https://vercel.com/account/tokens',
    instructions: 'Create token at vercel.com/account/tokens (Full Access or Scope: Projects)',
    placeholder: 'e.g. vc_tok_...',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    badge: 'FREE 100GB/MO',
    badgeColor: 'bg-teal-950 text-teal-300 border-teal-500/30',
    tokenKey: 'netlify',
    helperUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    instructions: 'Generate Personal Access Token at app.netlify.com/user/applications',
    placeholder: 'e.g. nfp_...',
  },
  {
    id: 'github',
    name: 'GitHub',
    badge: 'PAGES + APK CLOUD BUILD',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-500/30',
    tokenKey: 'github',
    helperUrl: 'https://github.com/settings/tokens/new?scopes=repo,workflow',
    instructions: 'Create Classic Token with `repo` and `workflow` scopes for Pages & Cloud APK',
    placeholder: 'e.g. ghp_...',
    scopeNeeded: 'scopes: repo, workflow',
  },
  {
    id: 'cloudflareToken',
    name: 'Cloudflare',
    badge: 'FREE UNLIMITED EDGE',
    badgeColor: 'bg-orange-950 text-orange-300 border-orange-500/30',
    tokenKey: 'cloudflareToken',
    helperUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    instructions: 'Create Cloudflare Pages API Token with Edit permission',
    placeholder: 'e.g. cf_tok_...',
  },
  {
    id: 'neocitiesUser',
    name: 'Neocities',
    badge: 'FREE RETRO HOSTING',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
    tokenKey: 'neocitiesPass',
    helperUrl: 'https://neocities.org/settings',
    instructions: 'Use your Neocities password or API key to publish instant static sites',
    placeholder: 'Neocities API Key or Password',
  },
];

export function ConnectPlatformsModal({ isOpen, onClose, onTokensUpdated }: ConnectPlatformsModalProps) {
  const [tokens, setTokens] = useState<PlatformTokens>(() => getStoredTokens());
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean; valid?: boolean; username?: string; error?: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTokens(getStoredTokens());
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (key: keyof PlatformTokens, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
    // reset test status on edit
    if (testStatuses[key]) {
      setTestStatuses((prev) => ({ ...prev, [key]: { loading: false } }));
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const testToken = async (platformId: string, tokenKey: keyof PlatformTokens) => {
    const tokenVal = tokens[tokenKey];
    if (!tokenVal || !tokenVal.trim()) {
      setTestStatuses((prev) => ({
        ...prev,
        [tokenKey]: { loading: false, valid: false, error: 'Paste token before testing' },
      }));
      return;
    }

    setTestStatuses((prev) => ({
      ...prev,
      [tokenKey]: { loading: true },
    }));

    try {
      const res = await fetch('/api/platform-tokens/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          token: tokenVal.trim(),
          accountId: tokens.cloudflareAccountId,
          username: tokens.neocitiesUser,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setTestStatuses((prev) => ({
          ...prev,
          [tokenKey]: { loading: false, valid: true, username: data.username },
        }));
      } else {
        setTestStatuses((prev) => ({
          ...prev,
          [tokenKey]: { loading: false, valid: false, error: data.error || 'Invalid token' },
        }));
      }
    } catch (err: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [tokenKey]: { loading: false, valid: false, error: err.message || 'Network test failed' },
      }));
    }
  };

  const handleSave = () => {
    saveStoredTokens(tokens);
    onTokensUpdated?.(tokens);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#070b14] border border-cyan-500/40 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0a101f]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-rajdhani font-bold text-white flex items-center gap-2 tracking-wide">
                CONNECT PLATFORMS <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">100% Free Tokens</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Save platform API keys once — deploy and build without CLI logins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Honest Notice Banner */}
        <div className="px-6 py-2.5 bg-cyan-950/20 border-b border-cyan-500/20 flex items-center gap-3 text-xs font-mono text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Tokens are stored locally in your browser session & used exclusively for direct REST API calls.</span>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {PLATFORMS_LIST.map((p) => {
            const val = tokens[p.tokenKey] || '';
            const isVisible = !!visibleKeys[p.tokenKey];
            const testStatus = testStatuses[p.tokenKey];

            return (
              <div
                key={p.id}
                className="p-4 rounded-lg bg-[#0a0f1d] border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-rajdhani tracking-wide">{p.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <a
                    href={p.helperUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono hover:underline"
                  >
                    <span>Get Free Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {p.id === 'neocitiesUser' && (
                  <div className="mb-2">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Neocities Site Name / Username</label>
                    <input
                      type="text"
                      value={tokens.neocitiesUser || ''}
                      onChange={(e) => handleFieldChange('neocitiesUser', e.target.value)}
                      placeholder="e.g. my-cool-site"
                      className="w-full bg-[#050811] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {p.id === 'cloudflareToken' && (
                  <div className="mb-2">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Cloudflare Account ID (Optional)</label>
                    <input
                      type="text"
                      value={tokens.cloudflareAccountId || ''}
                      onChange={(e) => handleFieldChange('cloudflareAccountId', e.target.value)}
                      placeholder="Found in Cloudflare Dashboard URL"
                      className="w-full bg-[#050811] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={val}
                      onChange={(e) => handleFieldChange(p.tokenKey, e.target.value)}
                      placeholder={p.placeholder}
                      className="w-full bg-[#050811] border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(p.tokenKey)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title={isVisible ? 'Hide token' : 'Show token'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => testToken(p.id, p.tokenKey)}
                    disabled={testStatus?.loading || !val.trim()}
                    className="px-3 py-2 bg-[#121c33] hover:bg-[#1a2847] border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {testStatus?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Test</span>
                  </button>
                </div>

                {/* Test Result Feedback */}
                {testStatus && !testStatus.loading && (
                  <div className="flex items-center gap-2 pt-1 text-xs font-mono">
                    {testStatus.valid ? (
                      <div className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected & Verified {testStatus.username ? `(${testStatus.username})` : '✅'}</span>
                      </div>
                    ) : (
                      <div className="text-rose-400 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>{testStatus.error || 'Connection failed'}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-500 font-mono">
                  {p.instructions}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#0a101f] flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            {saveSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tokens saved successfully!
              </span>
            ) : (
              <span>Stored securely in your local browser storage</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-rajdhani font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>SAVE TOKENS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
