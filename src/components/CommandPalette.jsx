import React, { useState, useEffect } from 'react';
import { Search, Clock, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils.js';

const POPULAR = ['AAPL', 'SPY', 'QQQ', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD'];

const getRecent = () => {
  try { return JSON.parse(localStorage.getItem('ot:recent') ?? '[]'); } catch { return []; }
};
const saveRecent = (ticker) => {
  const prev = getRecent().filter(t => t !== ticker);
  try { localStorage.setItem('ot:recent', JSON.stringify([ticker, ...prev].slice(0, 5))); } catch {}
};

export const CommandPalette = ({ open, onClose, onSelect, currentTicker }) => {
  const [query, setQuery]   = useState('');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (open) { setQuery(''); setRecent(getRecent()); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toUpperCase();
  const candidates = q
    ? POPULAR.filter(t => t.startsWith(q) && t !== currentTicker)
    : [];
  const showRecent  = !q && recent.filter(t => t !== currentTicker);
  const showPopular = !q;

  const select = (ticker) => {
    saveRecent(ticker);
    onSelect(ticker);
    onClose();
  };

  const ItemRow = ({ ticker, icon: Icon, iconColor }) => (
    <button
      onClick={() => select(ticker)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-500/10 text-left transition-colors group"
    >
      <Icon className={cn('w-3.5 h-3.5', iconColor ?? 'text-slate-600')} />
      <span className="mono font-bold text-slate-300 group-hover:text-indigo-300 transition-colors">{ticker}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0d0d16] border border-indigo-500/20 rounded-2xl shadow-[0_0_60px_rgba(99,102,241,0.2),0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search ticker (e.g. AAPL)…"
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 text-sm font-medium focus:outline-none mono"
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const hit = candidates[0] ?? (q.length >= 1 ? q : null);
                if (hit) select(hit);
              }
            }}
          />
          <kbd className="text-[9px] text-slate-700 border border-white/8 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="p-2 max-h-64 overflow-y-auto">
          {q && (
            <div>
              {q.length >= 1 && (
                <ItemRow ticker={q} icon={Search} iconColor="text-indigo-400" />
              )}
              {candidates.map(t => <ItemRow key={t} ticker={t} icon={TrendingUp} />)}
            </div>
          )}

          {!q && showRecent?.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1 text-[9px] font-bold text-slate-700 uppercase tracking-widest">Recent</p>
              {showRecent.map(t => <ItemRow key={t} ticker={t} icon={Clock} iconColor="text-slate-600" />)}
            </div>
          )}

          {showPopular && (
            <div>
              <p className="px-3 py-1 text-[9px] font-bold text-slate-700 uppercase tracking-widest">Popular</p>
              {POPULAR.filter(t => t !== currentTicker).map(t => (
                <ItemRow key={t} ticker={t} icon={TrendingUp} iconColor="text-slate-600" />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 text-[9px] text-slate-700 flex gap-3">
          <span>↵ select</span><span>↑↓ navigate</span><span>ESC close</span>
        </div>
      </div>
    </div>
  );
};
