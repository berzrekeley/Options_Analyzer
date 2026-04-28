import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils.js';

const Rule = ({ pass, text }) => (
  <div className={cn(
    'p-2.5 rounded-lg text-xs border',
    pass
      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
      : 'bg-white/3 border-white/8 text-slate-500'
  )}>
    <span className="mr-1.5">{pass ? '✓' : '○'}</span>
    {text}
  </div>
);

export const StrategyOutlook = ({ ivRank, dte }) => {
  const highIV  = ivRank != null && ivRank > 50;
  const goodDTE = dte >= 30 && dte <= 50;
  const score   = [highIV, goodDTE].filter(Boolean).length;

  const headline = score === 2
    ? 'Sell Premium'
    : score === 1
    ? 'Mixed Signal'
    : 'Buy Premium';

  const headlineColor = score === 2
    ? 'text-emerald-300'
    : score === 1
    ? 'text-amber-300'
    : 'text-rose-300';

  return (
    <div className="bg-indigo-950/60 border border-indigo-500/15 p-5 rounded-2xl relative overflow-hidden" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.08)' }}>
      <ShieldAlert className="absolute -right-3 -bottom-3 w-20 h-20 text-indigo-500/8 rotate-12" />

      <div className="relative z-10">
        <h3 className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-[0.15em] mb-3">
          <Target className="w-3.5 h-3.5" /> Strategy Outlook
        </h3>

        <p className={cn('text-xl font-black mb-4 tracking-tight', headlineColor)}>
          {headline}
        </p>

        <div className="space-y-2">
          <Rule
            pass={highIV}
            text={ivRank != null
              ? `IV Rank ${ivRank.toFixed(1)}% — ${highIV ? 'Premium rich, sell strategies favored' : 'Premium cheap, buying preferred'}`
              : 'IV Rank unavailable'}
          />
          <Rule
            pass={goodDTE}
            text={`${dte}d to expiry — ${goodDTE ? 'Institutional 30–50d sweet spot' : 'Outside optimal theta decay window'}`}
          />
        </div>
      </div>
    </div>
  );
};
