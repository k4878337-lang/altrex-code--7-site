import React, { useState } from 'react';
import { X, Key, Sliders, Check, ShieldCheck } from 'lucide-react';
import { ConnectPlatformsModal } from './codex/ConnectPlatformsModal.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvider: string;
  onSelectProvider: (provider: string) => void;
  xkiroKey: string;
  setXkiroKey: (k: string) => void;
  groqKey: string;
  setGroqKey: (k: string) => void;
  ollamaUrl: string;
  setOllamaUrl: (u: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentProvider,
  onSelectProvider,
  xkiroKey,
  setXkiroKey,
  groqKey,
  setGroqKey,
  ollamaUrl,
  setOllamaUrl,
}: SettingsModalProps) {
  const [savedMessage, setSavedMessage] = useState(false);
  const [showPlatformsModal, setShowPlatformsModal] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b101d] border border-cyan-500/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0e1628]">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono">Provider & Model Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs font-mono">
          {/* Active Provider selector */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Active Provider:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'xkiro', name: 'xKiro (Qwen 3.8 Max)', tag: 'Recommended' },
                { id: 'groq', name: 'Groq (Llama 3.3)', tag: 'Fast' },
                { id: 'ollama', name: 'Ollama (Local 8B)', tag: 'Local' },
                { id: 'gemini', name: 'Gemini (3.8 Flash)', tag: 'Multimodal' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProvider(p.id)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    currentProvider === p.id
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                      : 'border-slate-800 bg-[#070b14] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs">{p.name}</span>
                  <span className="text-[10px] text-slate-500 mt-1">{p.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* xKiro API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" /> xKiro API Key:
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Ready
              </span>
            </div>
            <input
              type="password"
              value={xkiroKey}
              onChange={(e) => setXkiroKey(e.target.value)}
              placeholder="sk-xt-..."
              className="w-full bg-[#070b14] border border-slate-700 focus:border-cyan-400 rounded px-3 py-2 text-xs text-cyan-200 font-mono focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Default model: qwen/qwen3.8-max:free</p>
          </div>

          {/* Groq API Key */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Groq API Key (Optional):
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-[#070b14] border border-slate-700 focus:border-cyan-400 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Get free key from console.groq.com (Model: llama-3.3-70b-versatile)</p>
          </div>

          {/* Ollama Base URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-yellow-400" /> Ollama Base URL:
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-[#070b14] border border-slate-700 focus:border-cyan-400 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Make sure `ollama serve` is running locally if switching to Ollama.</p>
          </div>

          {/* Connected Deploy & Build Platforms */}
          <div className="pt-2 border-t border-slate-800">
            <div className="p-3 bg-[#070c18] border border-cyan-500/30 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">Deploy & Mobile Platforms</span>
                <span className="text-[10px] text-slate-400">Vercel, Netlify, GitHub Pages, Cloud APK</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPlatformsModal(true)}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Manage Tokens</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#080d19] flex items-center justify-between">
          <div>
            {savedMessage && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved changes
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold font-mono transition-colors cursor-pointer"
          >
            Apply & Save
          </button>
        </div>
      </div>

      <ConnectPlatformsModal
        isOpen={showPlatformsModal}
        onClose={() => setShowPlatformsModal(false)}
      />
    </div>
  );
}
