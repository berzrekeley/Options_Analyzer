import React, { useMemo } from 'react';
import { fmt } from '../lib/format.js';
import { normalPDF } from '../lib/blackScholes.js';

const W = 600, H = 210, PX = 44, PY = 24;

const toPct = (x, lo, hi) => (x - lo) / (hi - lo);

// Build an SVG path for a filled area under the bell curve between x1 and x2
const buildShade = (xs, S, EM, lo, hi, maxY, xLo, xHi) => {
  const inner_W = W - 2 * PX;
  const inner_H = H - 2 * PY;
  const toSVG = (x, y) => ({
    sx: PX + toPct(x, lo, hi) * inner_W,
    sy: PY + inner_H - (y / maxY) * inner_H,
  });
  const baseY = PY + inner_H;
  const band = xs.filter(x => x >= xLo && x <= xHi);
  if (band.length < 2) return '';
  const pts = band.map(x => toSVG(x, normalPDF((x - S) / EM) / EM));
  return (
    `M ${toSVG(xLo, 0).sx.toFixed(2)},${baseY} ` +
    pts.map(p => `L ${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(' ') +
    ` L ${toSVG(xHi, 0).sx.toFixed(2)},${baseY} Z`
  );
};

export const BellCurveChart = ({ spotPrice, expectedMove, expectedMove15, strikePrice, expirationLabel, optionType }) => {
  const S    = spotPrice    ?? 185.92;
  const EM   = expectedMove ?? S * 0.05;
  const EM15 = expectedMove15 ?? EM * 1.5;
  const K    = strikePrice  ?? S * 0.95;

  const calc = useMemo(() => {
    const lo = S - 3.5 * EM;
    const hi = S + 3.5 * EM;
    const steps = 300;
    const inner_W = W - 2 * PX;
    const inner_H = H - 2 * PY;

    const toSVG = (x, y, maxY) => ({
      sx: PX + toPct(x, lo, hi) * inner_W,
      sy: PY + inner_H - (y / maxY) * inner_H,
    });

    const xs   = Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
    const maxY = normalPDF(0) / EM;

    const pts  = xs.map(x => toSVG(x, normalPDF((x - S) / EM) / EM, maxY));
    const pathD = `M ${pts.map(p => `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(' L ')}`;

    // Shaded zones (stacked for progressive darkening toward center)
    const shade2s  = buildShade(xs, S, EM, lo, hi, maxY, S - 2 * EM,  S + 2 * EM);
    const shade15s = buildShade(xs, S, EM, lo, hi, maxY, S - EM15,    S + EM15);
    const shade1s  = buildShade(xs, S, EM, lo, hi, maxY, S - EM,      S + EM);

    const svgX = (x) => PX + toPct(x, lo, hi) * inner_W;

    return {
      pathD, shade2s, shade15s, shade1s, lo, hi, maxY,
      peakY: PY,
      baseY: PY + inner_H,
      xs1Lo:  svgX(S - EM),
      xs1Hi:  svgX(S + EM),
      xs15Lo: svgX(S - EM15),
      xs15Hi: svgX(S + EM15),
      xs2Lo:  svgX(S - 2 * EM),
      xs2Hi:  svgX(S + 2 * EM),
      spotX:  svgX(S),
    };
  }, [S, EM, EM15]);

  const { pathD, shade2s, shade15s, shade1s, lo, hi, peakY, baseY,
          xs1Lo, xs1Hi, xs15Lo, xs15Hi, xs2Lo, xs2Hi, spotX } = calc;

  const strikeSVGX  = PX + toPct(K, lo, hi) * (W - 2 * PX);
  const strikeInRange = K >= lo && K <= hi;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Probable Range</h3>
        {expirationLabel && (
          <span className="mono text-[10px] bg-black/40 border border-white/8 px-2 py-0.5 rounded text-slate-600 uppercase tracking-widest">
            {expirationLabel}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }}>
        {/* Shaded bands — stacked so center is darkest */}
        {shade2s  && <path d={shade2s}  fill="rgba(99,102,241,0.05)" />}
        {shade15s && <path d={shade15s} fill="rgba(34,211,238,0.07)" />}
        {shade1s  && <path d={shade1s}  fill="rgba(99,102,241,0.18)" />}

        {/* Bell curve line */}
        <path d={pathD} fill="none" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" />

        {/* Baseline */}
        <line x1={PX} y1={baseY} x2={W - PX} y2={baseY} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* ±2σ tick marks */}
        {[xs2Lo, xs2Hi].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={baseY - 8} x2={x} y2={baseY} stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
            <text x={x} y={baseY + 13} textAnchor="middle" fontSize="8" fill="rgba(99,102,241,0.3)" fontFamily="monospace">
              {fmt.price(i === 0 ? S - 2 * EM : S + 2 * EM)}
            </text>
          </g>
        ))}

        {/* ±1.5σ dashed markers (cyan) */}
        {[xs15Lo, xs15Hi].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={peakY + 20} x2={x} y2={baseY}
              stroke="rgba(34,211,238,0.5)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={x} y={baseY + 13} textAnchor="middle" fontSize="8" fill="rgba(34,211,238,0.7)" fontFamily="monospace">
              {fmt.price(i === 0 ? S - EM15 : S + EM15)}
            </text>
          </g>
        ))}

        {/* ±1σ dashed markers (indigo) */}
        {[xs1Lo, xs1Hi].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={peakY + 10} x2={x} y2={baseY}
              stroke="rgba(99,102,241,0.55)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={x} y={baseY + 13} textAnchor="middle" fontSize="8" fill="rgba(99,102,241,0.85)" fontFamily="monospace">
              {fmt.price(i === 0 ? S - EM : S + EM)}
            </text>
          </g>
        ))}

        {/* Spot centre marker */}
        <line x1={spotX} y1={peakY} x2={spotX} y2={baseY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <text x={spotX} y={baseY + 13} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="monospace">
          {fmt.price(S)}
        </text>

        {/* Strike marker */}
        {strikeInRange && (
          <g>
            <line x1={strikeSVGX} y1={peakY + 8} x2={strikeSVGX} y2={baseY}
              stroke={optionType === 'put' ? 'rgba(251,113,133,0.8)' : 'rgba(52,211,153,0.8)'}
              strokeWidth="1.5" />
            <circle cx={strikeSVGX} cy={peakY + 8} r="4"
              fill={optionType === 'put' ? '#fb7185' : '#34d399'}
              stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
            <rect x={strikeSVGX - 22} y={peakY - 14} width="44" height="14" rx="3"
              fill="rgba(15,15,23,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <text x={strikeSVGX} y={peakY - 3} textAnchor="middle" fontSize="9"
              fill="rgba(255,255,255,0.85)" fontFamily="monospace">
              {fmt.price(K)}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between text-[9px] mono mt-2 px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(99,102,241,0.4)' }} />
            <span className="text-indigo-400/70">1σ ±{expectedMove != null ? fmt.price(EM) : '—'}</span>
            <span className="text-slate-700">(68%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(34,211,238,0.35)' }} />
            <span className="text-cyan-400/70">1.5σ ±{EM15 != null ? fmt.price(EM15) : '—'}</span>
            <span className="text-slate-700">(87%)</span>
          </span>
        </div>
        <span className="text-slate-700">2σ ±{fmt.price(2 * EM)} (95%)</span>
      </div>
    </div>
  );
};
