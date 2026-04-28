import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine,
} from 'recharts';
import { fmt } from '../lib/format.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f17] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs mono">
      <p className="text-slate-500 mb-1">Week {label}</p>
      <p className="text-indigo-400 font-bold">{fmt.percent((payload[0]?.value ?? 0) * 100)}</p>
    </div>
  );
};

export const IVHistoryChart = ({ hvHistory, currentIV, isLoading }) => {
  const data = useMemo(() => {
    if (!hvHistory || hvHistory.length === 0) return [];
    return hvHistory.map((hv, i) => ({ week: i + 1, hv }));
  }, [hvHistory]);

  if (isLoading && data.length === 0) {
    return <div className="card p-5"><div className="skeleton h-40 rounded-xl" /></div>;
  }

  if (data.length === 0) {
    return (
      <div className="card p-6 flex items-center justify-center h-40 text-slate-700 text-sm">
        Historical data unavailable — search a ticker to load
      </div>
    );
  }

  const hvValues = data.map(d => d.hv);
  const lo  = Math.min(...hvValues);
  const hi  = Math.max(...hvValues);
  const mid = (lo + hi) / 2;
  const iv  = currentIV ?? mid;

  const pctBelow = hvValues.filter(v => v < iv).length / hvValues.length * 100;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">1-Year HV History</h3>
        <div className="text-right">
          <span className="mono text-xs text-indigo-300 font-bold">{fmt.percent(iv * 100)} IV</span>
          <span className="text-[9px] text-slate-600 ml-2">vs {pctBelow.toFixed(0)}th pct</span>
        </div>
      </div>
      <p className="text-[9px] text-slate-700 mb-4">
        Rolling 30d HV (weekly). Current IV shown as reference line. Higher = richer premium.
      </p>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="hvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
            </linearGradient>
          </defs>

          {/* Zone bands */}
          <ReferenceLine y={mid}    stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <ReferenceLine y={hi}     stroke="rgba(251,113,133,0.15)" />
          <ReferenceLine y={lo}     stroke="rgba(52,211,153,0.15)" />
          {/* Current IV */}
          <ReferenceLine
            y={iv}
            stroke="rgba(99,102,241,0.8)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            label={{ value: `IV ${fmt.percent(iv * 100)}`, position: 'right', fontSize: 9, fill: '#818cf8' }}
          />

          <XAxis dataKey="week" hide />
          <YAxis
            tickFormatter={v => fmt.percent(v * 100)}
            tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            axisLine={false} tickLine={false} width={44}
            domain={[lo * 0.9, hi * 1.1]}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area dataKey="hv" stroke="#6366f1" strokeWidth={1.5} fill="url(#hvGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-between text-[9px] mono text-slate-700 mt-2">
        <span className="text-emerald-600/70">Low {fmt.percent(lo * 100)}</span>
        <span>1-Year Range</span>
        <span className="text-rose-600/70">High {fmt.percent(hi * 100)}</span>
      </div>
    </div>
  );
};
