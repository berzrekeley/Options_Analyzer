import React, { useState, useRef } from 'react';
import { Search, Loader2, Command, LayoutDashboard, BarChart3, Layers } from 'lucide-react';
import { cn } from '../lib/utils.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard, key: '1' },
  { id: 'matrix',   label: 'Chain Matrix', icon: BarChart3,        key: '2' },
  { id: 'strategy', label: 'Strategy',     icon: Layers,           key: '3' },
];

export const Header = ({ ticker, quote, isLoading, isStale, isDemo, onSearch, onCommandOpen, activeTab, onTabChange }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = query.trim().toUpperCase();
    if (t) { onSearch(t); setQuery(''); }
  };

  const isPositive = (quote?.priceChange ?? 0) >= 0;

  return (
    <header className="card p-3 flex flex-col md:flex-row items-center gap-3">
      {/* Logo + ticker badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <span className="text-indigo-400 font-mono font-bold text-sm">$</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-base tracking-tight">{ticker}</span>
          {quote && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">{quote.name}</span>
          )}
          {isStale && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider">
              Stale
            </span>
          )}
          {isDemo && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400 uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="relative w-full md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ticker…"
          className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/8 rounded-xl text-sm font-medium text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.3)] transition-all"
          value={query}
          onChange={e => setQuery(e.target.value.toUpperCase())}
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 animate-spin" />}
      </form>

      {/* Cmd-K button */}
      <button
        onClick={onCommandOpen}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-black/30 text-slate-600 hover:text-slate-400 hover:border-white/15 transition-all text-xs font-mono shrink-0"
        title="Open command palette (⌘K)"
      >
        <Command className="w-3 h-3" />
        <span>K</span>
      </button>

      {/* Live indicator */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <div className={cn('w-1.5 h-1.5 rounded-full', isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} style={isLoading ? {} : { boxShadow: '0 0 6px #34d399' }} />
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          {isLoading ? 'Updating' : 'Live'}
        </span>
      </div>

      {/* Tab nav */}
      <nav className="ml-auto flex gap-0.5 p-1 bg-black/40 rounded-xl border border-white/5 shrink-0">
        {TABS.map(({ id, label, icon: Icon, key }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150',
              activeTab === id
                ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="text-[9px] font-mono text-slate-700 hidden lg:inline">{key}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
