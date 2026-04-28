// Alpha Vantage REALTIME_OPTIONS
// Returns all expirations in one call with real bid/ask/IV/delta/greeks.
// Set ALPHAVANTAGE_API_KEY in .env (local) or Vercel env vars (production).

const AV_BASE = 'https://www.alphavantage.co/query';

const num = (v) => parseFloat(v) || 0;
const int = (v) => parseInt(v)   || 0;

export default async function handler(req, res) {
  const { ticker, date } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ALPHAVANTAGE_API_KEY not configured — add it to .env' });
  }

  try {
    // Build URL — optionally filter to a specific expiry date (YYYY-MM-DD)
    let requireDate = null;
    if (date) {
      requireDate = new Date(parseInt(date) * 1000).toISOString().split('T')[0];
    }

    const url = new URL(AV_BASE);
    url.searchParams.set('function', 'REALTIME_OPTIONS');
    url.searchParams.set('symbol',   ticker.toUpperCase());
    url.searchParams.set('apikey',   apiKey);
    if (requireDate) url.searchParams.set('require_date', requireDate);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Alpha Vantage returned ${response.status}`);

    const json = await response.json();

    // Rate limit / API key issues
    if (json.Information || json.Note) {
      throw new Error((json.Information || json.Note).slice(0, 120));
    }

    const contracts = json.data ?? [];
    if (contracts.length === 0) {
      return res.status(404).json({ error: `No options data for ${ticker}` });
    }

    // ── Group contracts by expiry date ──────────────────────
    // AV returns { expiration: "2025-05-02", strike: "270.00", type: "call", ... }
    const expiryMap = new Map(); // "YYYY-MM-DD" → { calls: [], puts: [] }

    for (const c of contracts) {
      const exp = c.expiration;
      if (!exp) continue;
      if (!expiryMap.has(exp)) expiryMap.set(exp, { calls: [], puts: [] });

      const normalized = {
        strike:       num(c.strike),
        bid:          num(c.bid),
        ask:          num(c.ask),
        lastPrice:    num(c.last),
        mark:         num(c.mark),
        iv:           num(c.implied_volatility),  // already decimal (e.g. 0.35 = 35%)
        volume:       int(c.volume),
        openInterest: int(c.open_interest),
        delta:        num(c.delta),
        gamma:        num(c.gamma),
        theta:        num(c.theta),
        vega:         num(c.vega),
        rho:          num(c.rho),
        inTheMoney:   c.type === 'call' ? num(c.delta) > 0.5 : num(c.delta) < -0.5,
      };

      if (c.type === 'call') expiryMap.get(exp).calls.push(normalized);
      else if (c.type === 'put') expiryMap.get(exp).puts.push(normalized);
    }

    // ── Sort expiry dates ────────────────────────────────────
    const sortedDates = Array.from(expiryMap.keys()).sort();

    // Convert YYYY-MM-DD → unix timestamps (midnight UTC)
    const expirationDates = sortedDates.map(d =>
      Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
    );

    // ── Build options array (all expirations) ────────────────
    const options = sortedDates.map((d, i) => {
      const { calls, puts } = expiryMap.get(d);
      calls.sort((a, b) => a.strike - b.strike);
      puts.sort((a, b) => a.strike - b.strike);
      return {
        expirationDate: expirationDates[i],
        calls,
        puts,
      };
    });

    // ── ATM IV ───────────────────────────────────────────────
    // Spot price comes from the quote API (separate call in the client).
    // Derive ATM IV from the nearest-to-money contracts in the first expiry
    // using the mid-strike as a proxy for ATM.
    let spotPrice = 0;
    let atmIV = null;

    if (options[0]) {
      const allFirst = [...options[0].calls, ...options[0].puts];
      if (allFirst.length > 0) {
        const strikes = allFirst.map(c => c.strike);
        const midStrike = strikes[Math.floor(strikes.length / 2)];
        spotPrice = midStrike; // rough proxy; client overrides with real quote
        const atm = allFirst
          .filter(c => c.iv > 0.005)
          .sort((a, b) => Math.abs(a.strike - midStrike) - Math.abs(b.strike - midStrike))[0];
        if (atm) atmIV = atm.iv;
      }
    }

    // All unique strikes across all expirations
    const strikeSet = new Set(contracts.map(c => num(c.strike)));
    const strikes   = Array.from(strikeSet).sort((a, b) => a - b);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json({ ticker: ticker.toUpperCase(), spotPrice, atmIV, expirationDates, strikes, options });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
