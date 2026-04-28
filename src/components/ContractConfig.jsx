import React from 'react';
import { Hash, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils.js';

export const ContractConfig = ({
  optionType, setOptionType,
  strikePrice, setStrikePrice,
  selectedDte, setSelectedDte,
  availableExpirations,
  spotPrice,
}) => {
  const autoStrike = Math.round(spotPrice * (optionType === 'put' ? 0.95 : 1.05));
  const effectiveStrike = strikePrice ?? autoStrike;

  return (
    <div className="card p-5 space-y-4">
      {/* Header + Put/Call toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contract Config</h3>
        <div className="flex bg-black/40 border border-white/8 rounded-lg p-0.5 text-[10px] font-bold">
          {['put', 'call'].map(t => (
            <button
              key={t}
              onClick={() => setOptionType(t)}
              className={cn(
                'px-3 py-1 rounded-md transition-all uppercase tracking-wider',
                optionType === t
                  ? t === 'put'
                    ? 'bg-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                    : 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                  : 'text-slate-600 hover:text-slate-400'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Strike price */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <Hash className="w-3 h-3" /> Strike Price
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm mono">$</span>
          <input
            type="number"
            value={effectiveStrike}
            onChange={e => setStrikePrice(parseFloat(e.target.value) || null)}
            onBlur={e => { if (!e.target.value) setStrikePrice(null); }}
            placeholder={String(autoStrike)}
            className="w-full pl-7 pr-4 py-2.5 bg-black/40 border border-white/8 rounded-xl mono font-bold text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.3)] transition-all"
          />
        </div>
        <p className="text-[9px] text-slate-700">
          Auto: ${autoStrike} (5% OTM) · Spot: ${spotPrice.toFixed(2)}
        </p>
      </div>

      {/* Expiration */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Expiration</label>
        <div className="relative">
          <select
            value={selectedDte}
            onChange={e => setSelectedDte(parseInt(e.target.value))}
            className="w-full px-3 py-2.5 bg-black/40 border border-white/8 rounded-xl mono font-bold text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500/50 transition-all"
          >
            {availableExpirations.length > 0
              ? availableExpirations.map(exp => (
                  <option key={exp.dte} value={exp.dte} className="bg-[#0f0f17]">
                    {exp.formatted} ({exp.dte}d)
                  </option>
                ))
              : <option value={45}>~45 days</option>
            }
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
