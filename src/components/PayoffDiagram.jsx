import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts';
import { computeStrategySummary } from '../lib/strategies.js';
import { fmt } from '../lib/format.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f17] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-500 mono mb-1">{fmt.price(label)}</p>
      {payload.map(p => (
        <p key={p.name} className="mono font-bold" style={{ color: p.color }}>
          {p.name === 'expiry' ? 'Expiry' : 'T+0 '}: {p.value >= 0 ? '+' : ''}{fmt.price(p.value)}
        </p>
      ))}
    </div>
  );
};

export const PayoffDiagram = ({ legs, spotPrice, selectedDte, iv, riskFreeRate }) => {
  const S = spotPrice ?? 185.92;
  const summary = legs?.length > 0 && legs.every(l => l.strike > 0 && l.premium > 0)
    ? computeStrategySummary(legs, S, selectedDte, iv ?? 0.22, riskFreeRate ?? 0.045)
    : null;

  if (!summary) {
    return (
      <div className="card p-6 flex items-center justify-center h-48 text-slate-700 text-sm">
        Add legs with premiums to see payoff diagram
      </div>
    );
  }

  // Thin data to ~80 points for performance
  const step  = Math.max(1, Math.floor(summary.payoffSeries.length / 80));
  const data  = summary.payoffSeries.filter((_, i) => i % step === 0);
  const maxAbs = Math.max(...data.flatMap(d => [Math.abs(d.expiry), Math.abs(d.t0)]));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">P&L Payoff — {summary.name}</h3>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-5 border-t border-indigo-400" /> Expiry</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t border-cyan-400 border-dashed" /> T+0</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          {/* Profit zone */}
          <ReferenceArea y1={0} y2={maxAbs * 1.1} fill="rgba(52,211,153,0.04)" />
          {/* Loss zone */}
          <ReferenceArea y1={-maxAbs * 1.1} y2={0} fill="rgba(251,113,133,0.04)" />

          <XAxis
            dataKey="price"
            tickFormatter={v => `$${v.toFixed(0)}`}
            tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${v.toFixed(0)}`}
            tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          {/* Spot price */}
          <ReferenceLine x={S} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'Spot', position: 'top', fontSize: 9, fill: '#475569' }} />

          {/* Breakeven markers */}
          {summary.breakevens.map((be, i) => (
            <ReferenceLine key={i} x={be} stroke="rgba(251,191,36,0.4)" strokeWidth={1} strokeDasharray="2 4" />
          ))}

          <Line dataKey="expiry" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#6366f1' }} />
          <Line dataKey="t0"     stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeDasharray="5 5" activeDot={{ r: 3, fill: '#22d3ee' }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 flex gap-4 text-[9px] mono text-slate-700">
        {summary.breakevens.length > 0 && (
          <span>BE: {summary.breakevens.map(b => fmt.price(b)).join(' / ')}</span>
        )}
        <span className="text-emerald-600">Max profit: {typeof summary.maxProfit === 'number' ? fmt.price(summary.maxProfit) : '∞'}</span>
        <span className="text-rose-600">Max loss: {typeof summary.maxLoss === 'number' ? fmt.price(Math.abs(summary.maxLoss)) : '∞'}</span>
      </div>
    </div>
  );
};
