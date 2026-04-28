import React, { useMemo } from 'react';
import { fmt } from '../lib/format.js';
import { cn } from '../lib/utils.js';
import { greekSparkline } from '../lib/blackScholes.js';

// ── Mini sparkline SVG ────────────────────────────────────

const MiniSparkline = ({ data, color, midIndex }) => {
  if (!data || data.length < 2) return null;
  const W = 52, H = 20;
  const lo   = Math.min(...data);
  const hi   = Math.max(...data);
  const span = hi - lo || 1;
  const toX  = (i) => (i / (data.length - 1)) * W;
  const toY  = (v) => H - ((v - lo) / span) * H;

  const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const midX = toX(midIndex ?? Math.floor(data.length / 2));
  const midY = toY(data[midIndex ?? Math.floor(data.length / 2)]);

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', opacity: 0.7 }}>
      {/* Current (mid) marker line */}
      <line x1={midX} y1={0} x2={midX} y2={H}
        stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 2" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Current value dot */}
      <circle cx={midX} cy={midY} r="2" fill={color} />
    </svg>
  );
};

// ── Greek card ────────────────────────────────────────────

const GREEK_META = {
  delta: { label: 'Delta (Δ)',     color: (v) => v >= 0 ? '#34d399' : '#fb7185', sub: (v) => `~${(Math.abs(v)*100).toFixed(0)} Δ pts` },
  theta: { label: 'Theta / Day (Θ)', color: () => '#fb7185',  sub: () => 'per contract' },
  vega:  { label: 'Vega (V)',       color: () => '#818cf8',  sub: () => 'per 1% IV move' },
  gamma: { label: 'Gamma (Γ)',      color: () => '#22d3ee',  sub: () => 'Δ change per $1' },
};

const GreekCard = ({ greek, value, sparkData, displayValue, isLoading }) => {
  const meta = GREEK_META[greek];
  if (!meta) return null;
  const color = meta.color(value ?? 0);

  return (
    <div className="card-hover card p-4">
      <div className="flex items-start justify-between">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">{meta.label}</p>
        {sparkData && <MiniSparkline data={sparkData} color={color} midIndex={Math.floor(sparkData.length / 2)} />}
      </div>
      {isLoading
        ? <div className="skeleton h-8 w-20 rounded mt-2" />
        : <p className="mono text-2xl font-black mt-1" style={{ color }}>{displayValue}</p>
      }
      {value != null && <p className="text-[9px] text-slate-700 mono mt-0.5">{meta.sub(value)}</p>}
    </div>
  );
};

// ── Component ─────────────────────────────────────────────

export const GreeksGrid = ({
  greeks, expectedMove, expectedMove15, spotPrice, isLoading,
  strikePrice, dte, iv, riskFreeRate, optionType,
}) => {
  const { bid, ask, delta, theta, vega, gamma } = greeks ?? {};
  const S     = spotPrice    ?? 185.92;
  const K     = strikePrice  ?? S * 0.95;
  const T     = (dte ?? 45) / 365;
  const sigma = iv           ?? 0.22;
  const r     = riskFreeRate ?? 0.045;
  const type  = optionType   ?? 'put';

  // Compute sparklines (spot ±5%, 21 steps)
  const sparks = useMemo(() => ({
    delta: greekSparkline('delta', S, K, T, r, sigma, type, 0.05, 21),
    theta: greekSparkline('theta', S, K, T, r, sigma, type, 0.05, 21).map(v => v * 100),
    vega:  greekSparkline('vega',  S, K, T, r, sigma, type, 0.05, 21),
    gamma: greekSparkline('gamma', S, K, T, r, sigma, type, 0.05, 21),
  }), [S, K, T, r, sigma, type]);

  return (
    <div className="space-y-2">
      {/* Bid / Ask */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-1.5">Mid / Bid — Ask</p>
          {isLoading
            ? <div className="skeleton h-6 w-40 rounded" />
            : <p className="mono text-lg font-bold text-slate-100">
                <span className="text-slate-400">{fmt.price(bid)}</span>
                <span className="text-slate-700 mx-2">/</span>
                <span className="text-slate-400">{fmt.price(ask)}</span>
              </p>
          }
        </div>
        <div className="text-right text-[9px] mono text-slate-700">
          <div>Mid: {bid != null && ask != null ? fmt.price((bid + ask) / 2) : '—'}</div>
          <div>Spread: {bid != null && ask != null ? fmt.price(ask - bid) : '—'}</div>
        </div>
      </div>

      {/* Greeks 2×2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <GreekCard
          greek="delta"
          value={delta}
          displayValue={fmt.greek(delta)}
          sparkData={sparks.delta}
          isLoading={isLoading}
        />
        <GreekCard
          greek="theta"
          value={theta}
          displayValue={theta != null ? fmt.price(Math.abs(theta * 100)) : '—'}
          sparkData={sparks.theta}
          isLoading={isLoading}
        />
        <GreekCard
          greek="vega"
          value={vega}
          displayValue={fmt.greek(vega)}
          sparkData={sparks.vega}
          isLoading={isLoading}
        />
        <GreekCard
          greek="gamma"
          value={gamma}
          displayValue={fmt.greek(gamma, 4)}
          sparkData={sparks.gamma}
          isLoading={isLoading}
        />
      </div>

      {/* Expected Move — 1σ and 1.5σ */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          {/* 1σ */}
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-1">
              1σ Expected Move <span className="text-slate-700 normal-case font-normal">(68%)</span>
            </p>
            {isLoading
              ? <div className="skeleton h-7 w-28 rounded" />
              : <p className="mono text-xl font-black text-indigo-300">
                  ±{expectedMove != null ? fmt.price(expectedMove) : '—'}
                </p>
            }
            {expectedMove != null && S > 0 && (
              <p className="mono text-[10px] text-slate-600 mt-0.5">
                {fmt.price(S - expectedMove)} – {fmt.price(S + expectedMove)}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-white/5" />

          {/* 1.5σ */}
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-1">
              1.5σ Expected Move <span className="text-slate-700 normal-case font-normal">(87%)</span>
            </p>
            {isLoading
              ? <div className="skeleton h-7 w-28 rounded" />
              : <p className="mono text-xl font-black text-cyan-400">
                  ±{expectedMove15 != null ? fmt.price(expectedMove15) : '—'}
                </p>
            }
            {expectedMove15 != null && S > 0 && (
              <p className="mono text-[10px] text-slate-600 mt-0.5">
                {fmt.price(S - expectedMove15)} – {fmt.price(S + expectedMove15)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
