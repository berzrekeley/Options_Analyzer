import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { calculateGreeks, getAvailableExpirations } from '../lib/blackScholes.js';
import { fmt } from '../lib/format.js';
import { cn } from '../lib/utils.js';

const isATM = (strike, spot) => Math.abs(strike - spot) / spot < 0.015;

const calcMoneyness = (strike, spot, type) =>
  type === 'call' ? ((spot - strike) / spot) * 100 : ((strike - spot) / spot) * 100;

const deltaRowBg = (absDelta) => {
  if (absDelta >= 0.32) return 'bg-indigo-500/8';
  if (absDelta >= 0.22) return 'bg-indigo-500/4';
  return '';
};

const ColHeader = ({ children, right }) => (
  <th className={cn(
    'px-4 py-3 text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap select-none',
    right ? 'text-right' : 'text-left'
  )}>
    {children}
  </th>
);

// ── Component ─────────────────────────────────────────────

export const ChainMatrix = ({
  ticker, spotPrice, iv, riskFreeRate,
  matrixType, onMatrixTypeChange,
  isLoading, optionsData,
}) => {
  const S  = spotPrice    ?? 185.92;
  const IV = iv           ?? 0.22;
  const r  = riskFreeRate ?? 0.045;

  // ── Expirations list ─────────────────────────────────────
  const expirations = useMemo(() => {
    if (optionsData?.expirationDates?.length > 0) {
      return optionsData.expirationDates
        .map(unix => {
          const d   = new Date(unix * 1000);
          const dte = Math.round((d - new Date()) / 86_400_000);
          return {
            dte,
            unix,
            formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          };
        })
        .filter(e => e.dte >= 0);
    }
    return getAvailableExpirations(7, 90);
  }, [optionsData]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedExp = expirations[Math.min(selectedIdx, expirations.length - 1)] ?? expirations[0];
  const T = (selectedExp?.dte ?? 45) / 365;

  // Reset to first expiry when ticker changes
  useEffect(() => { setSelectedIdx(0); }, [ticker]);

  // ── ATM Straddle Calculation ──────────────────────────
  const straddle = useMemo(() => {
    const expData = optionsData?.options?.find(o => o.expirationDate === selectedExp?.unix);
    
    // Find ATM strike (closest to S)
    let atmK;
    if (expData) {
      const allStrikes = [...new Set([...expData.calls.map(c => c.strike), ...expData.puts.map(p => p.strike)])];
      atmK = allStrikes.reduce((prev, curr) => Math.abs(curr - S) < Math.abs(prev - S) ? curr : prev, allStrikes[0]);
    } else {
      atmK = Math.round(S);
    }

    let callPrice, putPrice;
    if (expData) {
      const call = expData.calls.find(c => c.strike === atmK);
      const put  = expData.puts.find(p => p.strike === atmK);
      callPrice = call ? (call.bid + call.ask) / 2 : calculateGreeks(S, atmK, T, r, IV, 'call').price;
      putPrice  = put  ? (put.bid + put.ask) / 2  : calculateGreeks(S, atmK, T, r, IV, 'put').price;
    } else {
      callPrice = calculateGreeks(S, atmK, T, r, IV, 'call').price;
      putPrice  = calculateGreeks(S, atmK, T, r, IV, 'put').price;
    }

    const price = callPrice + putPrice;
    return {
      strike: atmK,
      price,
      pct: (price / S) * 100,
      upper: atmK + price,
      lower: atmK - price,
    };
  }, [optionsData, selectedExp, S, T, r, IV]);

  // ── Real contracts for selected expiry/type ──────────────
  const realContracts = useMemo(() => {
    if (!optionsData?.options || !selectedExp?.unix) return null;
    const expData = optionsData.options.find(o => o.expirationDate === selectedExp.unix);
    if (!expData) return null;
    return matrixType === 'call' ? expData.calls : expData.puts;
  }, [optionsData, selectedExp?.unix, matrixType]);

  // ── Build filtered rows (delta 0.10–0.40) ────────────────
  const rows = useMemo(() => {
    let strikes;
    if (realContracts?.length > 0) {
      strikes = realContracts.map(c => c.strike).sort((a, b) => a - b);
    } else {
      const lo = Math.round((S * 0.72) / 5) * 5;
      const hi = Math.round((S * 1.28) / 5) * 5;
      strikes  = [];
      for (let k = lo; k <= hi; k += 5) strikes.push(k);
    }

    const result = strikes.flatMap(K => {
      const contract = realContracts?.find(c => c.strike === K);
      const sigma    = (contract?.iv != null && contract.iv > 0.005) ? contract.iv : IV;

      // Prefer real delta from Alpha Vantage; fall back to Black-Scholes
      const hasRealDelta = contract?.delta != null && contract.delta !== 0;
      const delta    = hasRealDelta ? contract.delta : calculateGreeks(S, K, T, r, sigma, matrixType).delta;
      const absDelta = Math.abs(delta);

      if (absDelta < 0.10 || absDelta > 0.40) return [];

      const g   = !hasRealDelta ? calculateGreeks(S, K, T, r, sigma, matrixType) : null;
      const bid = (contract?.bid ?? 0) > 0 ? contract.bid : Math.max(0, +((g?.price ?? 0) - 0.05).toFixed(2));
      const ask = (contract?.ask ?? 0) > 0 ? contract.ask : Math.max(0, +((g?.price ?? 0) + 0.05).toFixed(2));
      const mid = +((bid + ask) / 2).toFixed(2);

      // ── Straddle calculation for THIS strike ─────────────
      const otherType = matrixType === 'call' ? 'puts' : 'calls';
      const expData   = optionsData?.options?.find(o => o.expirationDate === selectedExp?.unix);
      const otherSide = expData?.[otherType]?.find(c => c.strike === K);
      
      let otherMid;
      if (otherSide) {
        otherMid = (otherSide.bid + otherSide.ask) / 2;
      } else {
        const otherG = calculateGreeks(S, K, T, r, sigma, matrixType === 'call' ? 'put' : 'call');
        otherMid = otherG.price;
      }

      const straddlePrice = mid + otherMid;
      const straddlePct   = (straddlePrice / S) * 100;

      const expMove1   = S * sigma * Math.sqrt(T);
      const expMove1_5 = 1.5 * expMove1;

      return [{
        strike:       K,
        atm:          isATM(K, S),
        bid, mid, ask,
        volume:       contract?.volume       ?? 0,
        openInterest: contract?.openInterest ?? 0,
        iv:           sigma,
        delta,
        absDelta,
        moneyness:    calcMoneyness(K, S, matrixType),
        expMove1,
        expMove1_5,
        straddlePrice,
        straddlePct,
      }];
    });

    return matrixType === 'call'
      ? result.sort((a, b) => a.strike - b.strike)
      : result.sort((a, b) => b.strike - a.strike);
  }, [S, IV, r, T, matrixType, realContracts, optionsData, selectedExp]);

  const isReal    = realContracts != null;
  const atmStrike = rows.reduce((best, row) =>
    Math.abs(row.strike - S) < Math.abs((best?.strike ?? Infinity) - S) ? row : best, null)?.strike;

  return (
    <div className="card overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-black/20 flex-wrap">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Options Chain</h3>

        {/* Expiration dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Expiration</span>
          <div className="relative">
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(Number(e.target.value))}
              className="pl-3 pr-8 py-1.5 bg-black/40 border border-white/10 rounded-lg mono text-xs text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500/50 transition-all"
            >
              {expirations.map((exp, i) => (
                <option key={i} value={i} className="bg-[#0f0f17]">
                  {exp.formatted} ({exp.dte}d)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* DTE pill */}
        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/8 mono text-[10px] text-slate-500">
          {selectedExp?.dte}d
        </span>

        {!isReal && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold uppercase tracking-wider">
            Synthetic BS
          </span>
        )}

        {/* Call / Put toggle */}
        <div className="ml-auto flex bg-black/40 border border-white/8 rounded-lg p-0.5 text-[10px] font-bold">
          {['call', 'put'].map(t => (
            <button
              key={t}
              onClick={() => onMatrixTypeChange(t)}
              className={cn(
                'px-4 py-1.5 rounded-md uppercase tracking-wider transition-all',
                matrixType === t
                  ? t === 'call' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-600 hover:text-slate-400'
              )}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-header ──────────────────────────────────── */}
      <div className="px-5 py-2.5 border-b border-white/5 bg-black/10 flex flex-wrap items-center gap-5 text-[9px] mono text-slate-600">
        <span>Spot: <span className="text-slate-400">{fmt.price(S)}</span></span>
        <span>IV (ATM): <span className="text-slate-400">{fmt.percent(IV * 100)}</span></span>
        <span className="ml-auto">δ 0.10 – 0.40 · {rows.length} contract{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-8 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-16 text-center">
          <p className="text-slate-700 text-sm">No contracts in δ 0.10–0.40 range</p>
          <p className="text-slate-800 text-xs mt-1">Try a different expiration or option type</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/5 bg-black/20 sticky top-0 z-10">
              <tr>
                <ColHeader>Strike</ColHeader>
                <ColHeader right>Moneyness</ColHeader>
                <ColHeader right>Bid</ColHeader>
                <ColHeader right>Mid</ColHeader>
                <ColHeader right>Ask</ColHeader>
                <ColHeader right>Straddle (±%)</ColHeader>
                <ColHeader right>Exp Move (1σ/1.5σ)</ColHeader>
                <ColHeader right>Volume</ColHeader>
                <ColHeader right>Open Int</ColHeader>
                <ColHeader right>IV</ColHeader>
                <ColHeader right>Delta</ColHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {rows.map(row => {
                const isClosestATM = row.strike === atmStrike;
                return (
                  <tr
                    key={row.strike}
                    className={cn(
                      'transition-colors hover:bg-white/[0.03]',
                      deltaRowBg(row.absDelta),
                      isClosestATM && 'border-l-2 border-l-indigo-500/70 !bg-indigo-500/[0.07]'
                    )}
                  >
                    {/* Strike */}
                    <td className={cn('px-4 py-3 mono font-black text-sm', isClosestATM ? 'text-indigo-300' : 'text-slate-200')}>
                      {row.strike.toFixed(2)}
                      {isClosestATM && (
                        <span className="ml-2 text-[8px] font-bold text-indigo-500 uppercase tracking-wider">ATM</span>
                      )}
                    </td>

                    {/* Moneyness */}
                    <td className={cn('px-4 py-3 mono text-right text-[11px] font-semibold',
                      row.moneyness >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {row.moneyness >= 0 ? '+' : ''}{row.moneyness.toFixed(2)}%
                    </td>

                    {/* Bid */}
                    <td className="px-4 py-3 mono text-right text-slate-500 tabular-nums">
                      {row.bid > 0 ? row.bid.toFixed(2) : <span className="text-slate-800">—</span>}
                    </td>

                    {/* Mid */}
                    <td className="px-4 py-3 mono text-right text-slate-100 font-bold tabular-nums">
                      {row.mid.toFixed(2)}
                    </td>

                    {/* Ask */}
                    <td className="px-4 py-3 mono text-right text-slate-500 tabular-nums">
                      {row.ask > 0 ? row.ask.toFixed(2) : <span className="text-slate-800">—</span>}
                    </td>

                    {/* Straddle */}
                    <td className="px-4 py-3 mono text-right tabular-nums">
                      <div className="text-indigo-300 font-bold">{fmt.price(row.straddlePrice)}</div>
                      <div className="text-slate-500 text-[9px]">±{row.straddlePct.toFixed(2)}%</div>
                    </td>

                    {/* Expected Move */}
                    <td className="px-4 py-3 mono text-right text-[10px] tabular-nums">
                      <div className="text-slate-300 font-bold">±{row.expMove1.toFixed(2)}</div>
                      <div className="text-slate-500 text-[9px]">±{row.expMove1_5.toFixed(2)}</div>
                    </td>

                    {/* Volume */}
                    <td className="px-4 py-3 mono text-right tabular-nums">
                      {row.volume > 0
                        ? <span className={row.volume >= 500 ? 'text-slate-300' : 'text-slate-500'}>{row.volume.toLocaleString()}</span>
                        : <span className="text-slate-800">—</span>
                      }
                    </td>

                    {/* Open Interest */}
                    <td className="px-4 py-3 mono text-right text-slate-500 tabular-nums">
                      {row.openInterest > 0
                        ? row.openInterest.toLocaleString()
                        : <span className="text-slate-800">—</span>
                      }
                    </td>

                    {/* IV */}
                    <td className="px-4 py-3 mono text-right text-slate-400 tabular-nums">
                      {(row.iv * 100).toFixed(1)}%
                    </td>

                    {/* Delta */}
                    <td className={cn('px-4 py-3 mono text-right font-bold tabular-nums',
                      matrixType === 'call' ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {row.delta.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-white/5 bg-black/20 flex items-center gap-4">
        <div className="flex items-center gap-3 text-[9px] text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500/8 border border-white/5" />
            Near ATM (δ ≥ 0.32)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500/4 border border-white/5" />
            Mid (δ 0.22–0.32)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border border-white/5" />
            OTM (δ 0.10–0.22)
          </span>
        </div>
        <span className="mono text-[9px] text-slate-800 ml-auto">
          {isReal ? 'Yahoo Finance live' : 'Black-Scholes synthetic'} · r {fmt.percent(r * 100)}
        </span>
      </div>
    </div>
  );
};
