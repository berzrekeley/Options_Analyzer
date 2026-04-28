import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils.js';
import { fmt } from '../lib/format.js';

// ── Intraday sparkline ────────────────────────────────────

const IntradaySparkline = ({ closes, open, isUp }) => {
  if (!closes || closes.length < 2) return null;

  const W = 120, H = 36;
  const all  = open != null ? [open, ...closes] : closes;
  const lo   = Math.min(...all);
  const hi   = Math.max(...all);
  const span = hi - lo || 1;

  const toX = (i) => ((i) / (closes.length)) * W;
  const toY = (v) => H - ((v - lo) / span) * H;

  const pts = closes.map((v, i) => `${toX(i + 1).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const openY = open != null ? toY(open) : toY(closes[0]);

  const color = isUp ? '#34d399' : '#fb7185';
  const fill  = isUp ? 'rgba(52,211,153,0.08)' : 'rgba(251,113,133,0.08)';

  // Area fill path: trace the line then close down to baseline
  const areaPath =
    `M ${toX(1).toFixed(1)},${toY(closes[0]).toFixed(1)} ` +
    closes.slice(1).map((v, i) => `L ${toX(i + 2).toFixed(1)},${toY(v).toFixed(1)}`).join(' ') +
    ` L ${toX(closes.length).toFixed(1)},${H} L ${toX(1).toFixed(1)},${H} Z`;

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      {/* Previous close reference line */}
      {open != null && (
        <line x1={0} y1={openY} x2={W} y2={openY}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
      )}
      {/* Area fill */}
      <path d={areaPath} fill={fill} />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Current price dot */}
      <circle
        cx={toX(closes.length)}
        cy={toY(closes[closes.length - 1])}
        r="2.5" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
};

// ── Animated digit flip ───────────────────────────────────

const FlipDigit = ({ char }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={char}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      exit={{    y:  10, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{ display: 'inline-block' }}
    >
      {char}
    </motion.span>
  </AnimatePresence>
);

const AnimatedPrice = ({ price }) => {
  const str = fmt.price(price);
  return (
    <span className="mono text-4xl font-black text-slate-50 tracking-tight"
      style={{ fontVariantNumeric: 'tabular-nums' }}>
      {str.split('').map((c, i) => <FlipDigit key={i} char={c} />)}
    </span>
  );
};

// ── Vol metric tile ───────────────────────────────────────

const VolMetric = ({ icon: Icon, label, value, isLoading }) => (
  <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-white/5 rounded-lg">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    {isLoading
      ? <div className="skeleton h-6 w-14 rounded" />
      : <span className="mono text-lg font-bold text-slate-100">{value}</span>
    }
  </div>
);

// ── Component ─────────────────────────────────────────────

export const MarketSummary = ({ quote, iv, hv30, ivRank, intraday, isLoading, onRefresh }) => {
  const price     = quote?.price              ?? 185.92;
  const change    = quote?.priceChange        ?? 0;
  const changePct = quote?.priceChangePercent ?? 0;
  const isUp      = change >= 0;

  const prevPrice = useRef(price);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (prevPrice.current !== price) {
      setFlash(price > prevPrice.current ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 600);
      prevPrice.current = price;
      return () => clearTimeout(t);
    }
  }, [price]);

  return (
    <div className="space-y-2">
      {/* Spot price hero row */}
      <div className={cn(
        'hero-border card p-4 flex flex-wrap items-center gap-5 transition-all duration-300',
        flash === 'up'   && 'shadow-[0_0_30px_rgba(52,211,153,0.15)]',
        flash === 'down' && 'shadow-[0_0_30px_rgba(251,113,133,0.15)]',
      )}>
        {/* Price + change */}
        <div className="space-y-1">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">Current Spot</div>
          {isLoading && !quote
            ? <div className="skeleton h-10 w-36 rounded-lg" />
            : <AnimatedPrice price={price} />
          }
          {(!isLoading || quote) && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-sm',
              isUp
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            )}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span className="mono">{fmt.change(change)}</span>
              <span className="mono text-xs opacity-70">({fmt.change(changePct)}%)</span>
            </div>
          )}
        </div>

        {/* Intraday sparkline */}
        <div className="flex flex-col items-end gap-1">
          {intraday?.closes?.length > 1
            ? <IntradaySparkline closes={intraday.closes} open={intraday.open} isUp={isUp} />
            : isLoading ? <div className="skeleton rounded" style={{ width: 120, height: 36 }} /> : null
          }
          <span className="text-[9px] mono text-slate-700">1D · 5m bars</span>
        </div>

        <button
          onClick={onRefresh}
          className="ml-auto self-start p-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all"
          title="Refresh market data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Volatility metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <VolMetric icon={Zap}        label="IV Rank"     value={ivRank != null ? fmt.percent(ivRank)     : '—'} isLoading={isLoading && !iv} />
        <VolMetric icon={TrendingUp} label="Implied Vol"  value={iv    != null ? fmt.percent(iv * 100)   : '—'} isLoading={isLoading && !iv} />
        <VolMetric icon={Activity}   label="30D Hist Vol" value={hv30  != null ? fmt.percent(hv30 * 100) : '—'} isLoading={isLoading && !hv30} />
      </div>
    </div>
  );
};
