const BASE = `${import.meta.env.VITE_API_BASE ?? ''}/api`;

const safeFetch = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
};

/** Fetch real-time quote for a ticker. Returns { ticker, name, price, priceChange, priceChangePercent, marketState } */
export const fetchQuote = (ticker) =>
  safeFetch(`${BASE}/quote?ticker=${encodeURIComponent(ticker)}`);

/** Fetch options chain. Returns { expirations, calls, puts, underlyingPrice } */
export const fetchOptions = (ticker, dateUnix = null) => {
  const url = dateUnix
    ? `${BASE}/options?ticker=${encodeURIComponent(ticker)}&date=${dateUnix}`
    : `${BASE}/options?ticker=${encodeURIComponent(ticker)}`;
  return safeFetch(url);
};

/** Fetch 1y daily close history. Returns { closes: number[], dates: string[] } */
export const fetchHistory = (ticker) =>
  safeFetch(`${BASE}/history?ticker=${encodeURIComponent(ticker)}`);

/** Fetch US 10-year Treasury yield as decimal (e.g. 0.045 = 4.5%). */
/** Fetch 1-day 5-minute intraday closes. Returns { closes: number[], times: number[], open: number } */
export const fetchIntraday = (ticker) =>
  safeFetch(`${BASE}/intraday?ticker=${encodeURIComponent(ticker)}`);

export const fetchRiskFreeRate = async () => {
  try {
    const data = await safeFetch(`${BASE}/quote?ticker=%5ETNX`);
    return (data.price ?? 4.5) / 100;
  } catch {
    return 0.045; // sensible fallback
  }
};
