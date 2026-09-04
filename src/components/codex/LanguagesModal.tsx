import React, { useState, useEffect } from 'react';
import {
  Search,
  Code2,
  X,
  Check,
  ExternalLink,
  Terminal,
  Globe,
  Sparkles,
  Smartphone,
  Database,
  Cpu,
  FileCode,
} from 'lucide-react';
import { LanguageInfo } from '../../types';

interface LanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLanguage?: (lang: LanguageInfo) => void;
}

export function LanguagesModal({ isOpen, onClose, onSelectLanguage }: LanguagesModalProps) {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/languages')
      .then((res) => res.json())
      .then((data) => {
        setLanguages(data.languages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = languages.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      l.extensions.some((ext) => ext.toLowerCase().includes(search.toLowerCase())) ||
      l.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || l.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'All (50+)' },
    { id: 'web', label: 'Web & UI' },
    { id: 'systems', label: 'Systems & Backend' },
    { id: 'scripting', label: 'Scripting' },
    { id: 'mobile', label: 'Mobile & APK' },
    { id: 'data', label: 'Data & SQL' },
    { id: 'ops', label: 'DevOps & Shell' },
    { id: 'markup', label: 'Markup & Docs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1120] border border-cyan-500/30 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0e172a]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Universal Language Registry <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">50+ Languages</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Full execution, compilation, preview, and deployment support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-800 bg-[#080d19] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by language name, file extension (.py, .cpp, .rs, .go), or keyword..."
              className="w-full bg-[#050914] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((lang) => (
            <div
              key={lang.id}
              className="p-3.5 rounded-lg border border-slate-800 bg-[#070c18] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lang.icon}</span>
                    <span className="text-sm font-bold text-white">{lang.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {lang.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                  {lang.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400">{lang.extensions.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{lang.preview}</span>
                  {onSelectLanguage && (
                    <button
                      onClick={() => {
                        onSelectLanguage(lang);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
              No languages matched your search "{search}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
