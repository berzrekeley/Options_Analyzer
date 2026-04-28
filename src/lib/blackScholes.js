// Abramowitz & Stegun approximation — error < 7.5e-8
export const normalCDF = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

export const normalPDF = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/**
 * @param {number} S  Spot price
 * @param {number} K  Strike price
 * @param {number} T  Time to expiry in years (DTE / 365)
 * @param {number} r  Risk-free rate (decimal, e.g. 0.045)
 * @param {number} sigma  Implied volatility (decimal, e.g. 0.22)
 * @param {'call'|'put'} type
 */
export const calculateGreeks = (S, K, T, r, sigma, type = 'put') => {
  if (T <= 0 || K <= 0 || sigma <= 0) {
    return {
      price: Math.max(0, type === 'call' ? S - K : K - S),
      delta: 0, theta: 0, gamma: 0, vega: 0,
      bid: 0, ask: 0, d1: 0, d2: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma ** 2) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const price = type === 'call'
    ? S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)
    : K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);

  const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  const vega  = (S * normalPDF(d1) * sqrtT) / 100;
  const theta = (-(S * normalPDF(d1) * sigma) / (2 * sqrtT)
    - r * K * Math.exp(-r * T) * normalCDF(type === 'call' ? d2 : -d2)) / 365;

  const spreadPct = price > 5 ? 0.01 : 0.03;
  return {
    price,
    delta,
    gamma,
    vega,
    theta,
    bid:  price * (1 - spreadPct),
    ask:  price * (1 + spreadPct),
    d1,
    d2,
  };
};

export const getExpectedMove = (S, iv, T) => S * iv * Math.sqrt(T);

/** Returns Friday expiration dates between minDays and maxDays from today. */
export const getAvailableExpirations = (minDays = 20, maxDays = 65) => {
  const dates = [];
  const today = new Date();
  for (let i = minDays; i <= maxDays; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    if (d.getDay() === 5) {
      dates.push({
        dte:       i,
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        iso:       d.toISOString().split('T')[0],
        unix:      Math.floor(d.getTime() / 1000),
      });
    }
  }
  return dates;
};

/** Generate sparkline data for a Greek across a ±pct spot range */
export const greekSparkline = (greek, S, K, T, r, sigma, type, pct = 0.05, steps = 20) => {
  return Array.from({ length: steps }, (_, i) => {
    const spot = S * (1 - pct + (2 * pct * i) / (steps - 1));
    return calculateGreeks(spot, K, T, r, sigma, type)[greek];
  });
};
