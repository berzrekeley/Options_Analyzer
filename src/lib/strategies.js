import { calculateGreeks } from './blackScholes.js';

// ── Strategy classifier ───────────────────────────────────

export const classifyStrategy = (legs) => {
  if (!legs || legs.length === 0) return 'None';
  if (legs.length === 1) {
    const l = legs[0];
    return `${l.direction === 'long' ? 'Long' : 'Short'} ${l.type === 'call' ? 'Call' : 'Put'}`;
  }

  const calls  = legs.filter(l => l.type === 'call');
  const puts   = legs.filter(l => l.type === 'put');
  const longs  = legs.filter(l => l.direction === 'long');
  const shorts = legs.filter(l => l.direction === 'short');

  if (legs.length === 2) {
    if (calls.length === 1 && puts.length === 1) {
      const sameStrike = calls[0].strike === puts[0].strike;
      if (longs.length === 2)  return sameStrike ? 'Long Straddle'  : 'Long Strangle';
      if (shorts.length === 2) return sameStrike ? 'Short Straddle' : 'Short Strangle';
    }
    if (calls.length === 2) {
      const [lo, hi] = [...calls].sort((a, b) => a.strike - b.strike);
      if (lo.direction === 'long'  && hi.direction === 'short') return 'Bull Call Spread';
      if (lo.direction === 'short' && hi.direction === 'long')  return 'Bear Call Spread';
    }
    if (puts.length === 2) {
      const [lo, hi] = [...puts].sort((a, b) => a.strike - b.strike);
      if (lo.direction === 'long'  && hi.direction === 'short') return 'Bear Put Spread';
      if (lo.direction === 'short' && hi.direction === 'long')  return 'Bull Put Spread';
    }
  }

  if (legs.length === 4 && calls.length === 2 && puts.length === 2) {
    const callLongs  = calls.filter(l => l.direction === 'long');
    const callShorts = calls.filter(l => l.direction === 'short');
    const putLongs   = puts.filter(l => l.direction === 'long');
    const putShorts  = puts.filter(l => l.direction === 'short');
    if (callLongs.length === 1 && callShorts.length === 1 &&
        putLongs.length === 1  && putShorts.length === 1) return 'Iron Condor';
    if (callLongs.length === 2 && putLongs.length === 2)   return 'Long Iron Butterfly';
  }

  return `${legs.length}-Leg Custom`;
};

// ── P&L calculators ───────────────────────────────────────

/** P&L per contract (×100 shares) at expiration for a given underlying price. */
export const payoffAtExpiry = (legs, underlyingPrice) =>
  legs.reduce((total, leg) => {
    const intrinsic = leg.type === 'call'
      ? Math.max(0, underlyingPrice - leg.strike)
      : Math.max(0, leg.strike - underlyingPrice);
    return total + (leg.direction === 'long' ? 1 : -1) * (intrinsic - leg.premium) * 100;
  }, 0);

/** P&L per contract at T+0 (current moment) using live Black-Scholes values. */
export const payoffT0 = (legs, underlyingPrice, dte, iv, r) =>
  legs.reduce((total, leg) => {
    const T = dte / 365;
    const { price } = calculateGreeks(underlyingPrice, leg.strike, T, r, iv, leg.type);
    return total + (leg.direction === 'long' ? 1 : -1) * (price - leg.premium) * 100;
  }, 0);

// ── Strategy summary ──────────────────────────────────────

/**
 * Returns name, net premium, max profit/loss, breakevens, and payoff series.
 * payoffSeries is an array of { price, expiry, t0 } for charting.
 */
export const computeStrategySummary = (legs, S, dte, iv, r) => {
  if (!legs || legs.length === 0) return null;

  const name = classifyStrategy(legs);
  const netPremium = legs.reduce(
    (sum, l) => sum + (l.direction === 'long' ? -l.premium : l.premium), 0
  );

  const range  = Math.max(S * 0.25, 20);
  const count  = 300;
  const prices = Array.from({ length: count }, (_, i) => S - range + (2 * range * i) / (count - 1));

  const expiryPnl = prices.map(p => payoffAtExpiry(legs, p));
  const t0Pnl     = prices.map(p => payoffT0(legs, p, dte, iv, r));

  const maxProfit = Math.max(...expiryPnl);
  const maxLoss   = Math.min(...expiryPnl);

  const breakevens = [];
  for (let i = 1; i < expiryPnl.length; i++) {
    if ((expiryPnl[i - 1] < 0 && expiryPnl[i] >= 0) ||
        (expiryPnl[i - 1] >= 0 && expiryPnl[i] < 0)) {
      breakevens.push(+(((prices[i - 1] + prices[i]) / 2).toFixed(2)));
    }
  }

  const payoffSeries = prices.map((price, i) => ({
    price:  +price.toFixed(2),
    expiry: +expiryPnl[i].toFixed(2),
    t0:     +t0Pnl[i].toFixed(2),
  }));

  return { name, netPremium, maxProfit, maxLoss, breakevens, payoffSeries };
};

// ── Default leg factory ───────────────────────────────────

let _legId = 0;
export const makeLeg = (overrides = {}) => ({
  id:        ++_legId,
  type:      'put',
  direction: 'long',
  strike:    0,
  expiry:    null,
  dte:       45,
  premium:   0,
  ...overrides,
});
