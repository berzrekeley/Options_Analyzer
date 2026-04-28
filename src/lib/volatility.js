/**
 * Compute annualized Historical Volatility from an array of closing prices.
 * Uses log returns, annualized by √252 (trading days).
 */
export const computeHV = (closes, period = 30) => {
  if (!closes || closes.length < period + 1) return null;
  const window = closes.slice(-period - 1);
  const logReturns = [];
  for (let i = 1; i < window.length; i++) {
    if (window[i - 1] > 0 && window[i] > 0) {
      logReturns.push(Math.log(window[i] / window[i - 1]));
    }
  }
  if (logReturns.length < 2) return null;
  const mean     = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (logReturns.length - 1);
  return Math.sqrt(variance * 252);
};

/**
 * Compute rolling 30d HV windows (sampled weekly) from a 1y close series.
 * Returns an array of { index, hv } objects for charting.
 */
export const computeHVHistory = (closes, period = 30) => {
  const result = [];
  if (!closes || closes.length < period + 1) return result;
  for (let i = period; i < closes.length; i += 5) {
    const hv = computeHV(closes.slice(0, i + 1), period);
    if (hv !== null) result.push({ index: i, hv });
  }
  return result;
};

/**
 * Compute IV Rank: where current IV sits in the 1y HV range.
 * Returns 0–100. Falls back to the simple ivLow/ivHigh formula if history is short.
 */
export const computeIVRank = (currentIV, hvValues, ivLowFallback, ivHighFallback) => {
  const values = hvValues && hvValues.length > 0 ? hvValues : null;
  const lo = values ? Math.min(...values) : (ivLowFallback ?? 0.10);
  const hi = values ? Math.max(...values) : (ivHighFallback ?? 0.50);
  if (hi === lo) return 50;
  return Math.max(0, Math.min(100, ((currentIV - lo) / (hi - lo)) * 100));
};

/**
 * Compute IV Percentile: % of days in the past year where IV was lower than today.
 */
export const computeIVPercentile = (currentIV, hvValues) => {
  if (!hvValues || hvValues.length === 0) return null;
  const below = hvValues.filter(v => v < currentIV).length;
  return (below / hvValues.length) * 100;
};
