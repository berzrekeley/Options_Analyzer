import React, { useMemo } from 'react';
import { Plus, Trash2, Layers, ChevronDown } from 'lucide-react';
import { makeLeg, classifyStrategy, computeStrategySummary } from '../lib/strategies.js';
import { calculateGreeks, getAvailableExpirations } from '../lib/blackScholes.js';
import { fmt } from '../lib/format.js';
import { cn } from '../lib/utils.js';

const DIRECTIONS = ['long', 'short'];
const TYPES      = ['call', 'put'];

// ── Leg row ───────────────────────────────────────────────

const LegRow = ({ leg, spotPrice, iv, riskFreeRate, availableExpirations, onChange, onRemove }) => {
  const T = leg.dte / 365;
  const greeks = useMemo(
    () => leg.strike > 0 ? calculateGreeks(spotPrice, leg.strike, T, riskFreeRate, iv, leg.type) : null,
    [spotPrice, leg.strike, T, riskFreeRate, iv, leg.type]
  );

  const handleStrikeChange = (e) => {
    const newStrike = parseFloat(e.target.value) || 0;
    const autoPrice = newStrike > 0
      ? calculateGreeks(spotPrice, newStrike, leg.dte / 365, riskFreeRate, iv, leg.type).price
      : 0;
    onChange({ ...leg, strike: newStrike, premium: +autoPrice.toFixed(2) });
  };

  const handleTypeChange = (type) => {
    const autoPrice = leg.strike > 0
      ? calculateGreeks(spotPrice, leg.strike, T, riskFreeRate, iv, type).price
      : 0;
    onChange({ ...leg, type, premium: +autoPrice.toFixed(2) });
  };

  const handleDteChange = (dte) => {
    const autoPrice = leg.strike > 0
      ? calculateGreeks(spotPrice, leg.strike, dte / 365, riskFreeRate, iv, leg.type).price
      : 0;
    onChange({ ...leg, dte, premium: +autoPrice.toFixed(2) });
  };

  return (
    <div className="p-3 bg-black/30 border border-white/6 rounded-xl space-y-2">
      {/* Row 1: direction + type + strike + premium */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Direction */}
        <div className="flex bg-black/40 border border-white/8 rounded-lg p-0.5">
          {DIRECTIONS.map(d => (
            <button key={d} onClick={() => onChange({ ...leg, direction: d })}
              className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all',
                leg.direction === d
                  ? d === 'long' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-600 hover:text-slate-400')}
            >{d}</button>
          ))}
        </div>

        {/* Type */}
        <div className="flex bg-black/40 border border-white/8 rounded-lg p-0.5">
          {TYPES.map(t => (
            <button key={t} onClick={() => handleTypeChange(t)}
              className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all',
                leg.type === t ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-600 hover:text-slate-400')}
            >{t}</button>
          ))}
        </div>

        {/* Strike */}
        <input
          type="number"
          placeholder="Strike"
          value={leg.strike || ''}
          onChange={handleStrikeChange}
          className="w-24 px-2.5 py-1.5 bg-black/40 border border-white/8 rounded-lg mono text-sm text-slate-200 focus:outline-none focus:border-indigo-500/40 transition-all"
        />

        {/* Premium */}
        <div className="flex items-center gap-1">
          <span className="text-slate-700 text-xs mono">@</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={leg.premium || ''}
            onChange={e => onChange({ ...leg, premium: parseFloat(e.target.value) || 0 })}
            className="w-20 px-2.5 py-1.5 bg-black/40 border border-white/8 rounded-lg mono text-sm text-slate-200 focus:outline-none focus:border-indigo-500/40 transition-all"
          />
          {greeks && leg.premium === 0 && (
            <button
              onClick={() => onChange({ ...leg, premium: +greeks.price.toFixed(2) })}
              className="text-[9px] text-indigo-500 hover:text-indigo-400 transition-colors whitespace-nowrap"
              title="Fill from Black-Scholes mid"
            >fill BS</button>
          )}
        </div>

        <button onClick={onRemove}
          className="ml-auto p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: per-leg expiry selector */}
      <div className="flex items-center gap-3">
        <label className="text-[9px] font-bold text-slate-700 uppercase tracking-widest whitespace-nowrap">Expiry</label>
        <div className="relative flex-1 max-w-[240px]">
          <select
            value={leg.dte}
            onChange={e => handleDteChange(parseInt(e.target.value))}
            className="w-full px-2.5 py-1 bg-black/40 border border-white/8 rounded-lg mono text-xs text-slate-400 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500/40 transition-all"
          >
            {availableExpirations.map(exp => (
              <option key={exp.dte} value={exp.dte} className="bg-[#0f0f17]">
                {exp.formatted} ({exp.dte}d)
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
        </div>

        {/* Live greeks preview */}
        {greeks && (
          <span className="mono text-[9px] text-slate-700 ml-auto">
            Δ {fmt.greek(greeks.delta)} · Θ −{fmt.price(Math.abs(greeks.theta * 100))} · IV {fmt.percent(iv * 100, 0)}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────

const StatCard = ({ label, value, color }) => (
  <div className="bg-black/30 border border-white/5 rounded-xl p-3">
    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</div>
    <div className={cn('mono text-lg font-black', color)}>{value}</div>
  </div>
);

// ── Component ─────────────────────────────────────────────

export const StrategyBuilder = ({ legs, setLegs, spotPrice, selectedDte, iv, riskFreeRate }) => {
  const S = spotPrice ?? 185.92;
  const availableExpirations = useMemo(() => getAvailableExpirations(7, 90), []);

  const addLeg = () => setLegs(prev => {
    const dte = selectedDte ?? availableExpirations[2]?.dte ?? 45;
    const strike = Math.round(S * 0.95);
    const premium = +calculateGreeks(S, strike, dte / 365, riskFreeRate ?? 0.045, iv ?? 0.22, 'put').price.toFixed(2);
    return [...prev, makeLeg({ strike, dte, premium })];
  });

  const updateLeg = (id, updated) => setLegs(prev => prev.map(l => l.id === id ? updated : l));
  const removeLeg = (id)          => setLegs(prev => prev.filter(l => l.id !== id));

  const summary = useMemo(
    () => legs.length > 0 && legs.every(l => l.strike > 0 && l.premium > 0)
      ? computeStrategySummary(legs, S, selectedDte, iv ?? 0.22, riskFreeRate ?? 0.045)
      : null,
    [legs, S, selectedDte, iv, riskFreeRate]
  );

  const strategyName = classifyStrategy(legs);
  const isCalendar   = legs.length >= 2 && new Set(legs.map(l => l.dte)).size > 1;

  return (
    <div className="space-y-4">
      {/* Builder card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategy Builder</h3>
          </div>
          {legs.length > 0 && (
            <div className="flex items-center gap-2">
              {isCalendar && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                  Multi-Expiry
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 font-bold text-xs">
                {strategyName}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {legs.map(leg => (
            <LegRow
              key={leg.id}
              leg={leg}
              spotPrice={S}
              iv={iv ?? 0.22}
              riskFreeRate={riskFreeRate ?? 0.045}
              availableExpirations={availableExpirations}
              onChange={updated => updateLeg(leg.id, updated)}
              onRemove={() => removeLeg(leg.id)}
            />
          ))}
        </div>

        <button
          onClick={addLeg}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/10 rounded-xl text-xs text-slate-600 hover:text-slate-400 hover:border-white/20 hover:bg-white/3 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Leg
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="card p-5 animate-fade-in">
          <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">
            Position Summary · {summary.name}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <StatCard
              label="Net Premium"
              value={fmt.price(Math.abs(summary.netPremium))}
              color={summary.netPremium >= 0 ? 'text-emerald-400' : 'text-rose-400'}
            />
            <StatCard
              label="Max Profit"
              value={typeof summary.maxProfit === 'number' ? fmt.price(summary.maxProfit) : '∞'}
              color="text-emerald-400"
            />
            <StatCard
              label="Max Loss"
              value={typeof summary.maxLoss === 'number' ? fmt.price(Math.abs(summary.maxLoss)) : '∞'}
              color="text-rose-400"
            />
            <StatCard
              label="Breakeven(s)"
              value={summary.breakevens.length > 0
                ? summary.breakevens.map(b => fmt.price(b)).join(' / ')
                : '—'}
              color="text-slate-200"
            />
          </div>
          <p className="text-[9px] text-slate-700">
            {summary.netPremium >= 0 ? 'Net credit' : 'Net debit'} of {fmt.price(Math.abs(summary.netPremium))} per contract ·
            Strikes {Math.min(...legs.map(l => l.strike))}–{Math.max(...legs.map(l => l.strike))} ·
            {isCalendar ? ` ${new Set(legs.map(l => l.dte)).size} expirations` : ` ${legs[0]?.dte}d`}
          </p>
        </div>
      )}

      {legs.length === 0 && (
        <div className="text-center py-10 text-slate-700">
          <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Add legs above to build a strategy</p>
          <p className="text-xs mt-1 text-slate-800">
            Mix expirations for Calendar Spreads and Diagonals
          </p>
        </div>
      )}
    </div>
  );
};
