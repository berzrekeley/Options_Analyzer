import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchQuote, fetchOptions, fetchHistory, fetchIntraday, fetchRiskFreeRate } from '../lib/yahooClient.js';
import { computeHV, computeHVHistory, computeIVRank } from '../lib/volatility.js';
import { MOCK_QUOTE, MOCK_OPTIONS, MOCK_HISTORY, MOCK_INTRADAY } from '../lib/mockData.js';

const CACHE_TTL  = 60_000;
const HIST_TTL   = 3_600_000;
const INTRA_TTL  = 300_000;

const getCache = (key, ttl = CACHE_TTL) => {
  try {
    const raw = localStorage.getItem(`ot:${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts < ttl ? data : null;
  } catch { return null; }
};
const setCache = (key, data) => {
  try { localStorage.setItem(`ot:${key}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

const settle = (promise) => promise.then(v => ({ ok: true,  value: v }))
                                   .catch(e => ({ ok: false, error: e.message }));

const buildDerived = (quote, options, history, riskFreeRate) => {
  const closes    = history?.closes ?? [];
  const hv30      = computeHV(closes, 30);
  const hvHistory = computeHVHistory(closes, 30).map(d => d.hv);
  const iv        = options?.atmIV ?? (hv30 ? hv30 * 1.1 : 0.22);
  const ivRank    = hvHistory.length > 0 ? computeIVRank(iv, hvHistory) : null;
  return { hv30, hvHistory, iv, ivRank };
};

export const useMarketData = (ticker) => {
  const [state, setState] = useState(() => {
    const derived = buildDerived(MOCK_QUOTE, MOCK_OPTIONS, MOCK_HISTORY, 0.045);
    return {
      quote: MOCK_QUOTE, options: MOCK_OPTIONS, history: MOCK_HISTORY,
      intraday: MOCK_INTRADAY, riskFreeRate: 0.045, ...derived,
      isLoading: true, error: null, lastUpdated: null,
      isStale: false, isDemo: true,
    };
  });

  const abort = useRef(null);

  const load = useCallback(async (sym, force = false) => {
    if (!sym) return;
    if (abort.current) abort.current.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Each source is independent — one failing never blocks the others
    const cached = {
      quote:    !force && getCache(`quote:${sym}`),
      options:  !force && getCache(`options:${sym}`),
      history:  !force && getCache(`history:${sym}`, HIST_TTL),
      intraday: !force && getCache(`intraday:${sym}`, INTRA_TTL),
      rfr:      !force && getCache('rfr'),
    };

    const [quoteR, optionsR, historyR, intradayR, rfrR] = await Promise.all([
      settle(cached.quote    ? Promise.resolve(cached.quote)    : fetchQuote(sym)),
      settle(cached.options  ? Promise.resolve(cached.options)  : fetchOptions(sym)),
      settle(cached.history  ? Promise.resolve(cached.history)  : fetchHistory(sym)),
      settle(cached.intraday ? Promise.resolve(cached.intraday) : fetchIntraday(sym)),
      settle(cached.rfr      ? Promise.resolve(cached.rfr)      : fetchRiskFreeRate()),
    ]);

    if (ctrl.signal.aborted) return;

    // If quote itself failed, fall to demo mode for the whole ticker
    if (!quoteR.ok) {
      const isMock = sym.toUpperCase() === 'AAPL';
      const demoQuote    = isMock ? MOCK_QUOTE    : { ...MOCK_QUOTE,   ticker: sym, name: sym };
      const demoOptions  = isMock ? MOCK_OPTIONS  : { ...MOCK_OPTIONS, ticker: sym };
      const demoIntraday = isMock ? MOCK_INTRADAY : { ...MOCK_INTRADAY, ticker: sym };
      const derived = buildDerived(demoQuote, demoOptions, MOCK_HISTORY, 0.045);
      setState(prev => ({
        ...prev,
        quote: demoQuote, options: demoOptions, history: MOCK_HISTORY,
        intraday: demoIntraday, riskFreeRate: 0.045, ...derived,
        isLoading: false, error: null, isDemo: true,
        lastUpdated: Date.now(), isStale: false,
      }));
      return;
    }

    const quote    = quoteR.value;
    const options  = optionsR.ok  ? optionsR.value  : null;
    const history  = historyR.ok  ? historyR.value  : null;
    const intraday = intradayR.ok ? intradayR.value  : null;
    const rfr      = rfrR.ok      ? rfrR.value       : 0.045;

    // Log non-quote failures quietly
    if (!optionsR.ok)  console.warn(`[options]  ${sym}: ${optionsR.error}`);
    if (!historyR.ok)  console.warn(`[history]  ${sym}: ${historyR.error}`);
    if (!intradayR.ok) console.warn(`[intraday] ${sym}: ${intradayR.error}`);

    // Cache what succeeded
    if (quote    && !cached.quote)    setCache(`quote:${sym}`, quote);
    if (options  && !cached.options)  setCache(`options:${sym}`, options);
    if (history  && !cached.history)  setCache(`history:${sym}`, history);
    if (intraday && !cached.intraday) setCache(`intraday:${sym}`, intraday);
    if (rfr      && !cached.rfr)      setCache('rfr', rfr);

    const derived = buildDerived(quote, options, history, rfr);

    setState({
      quote, options, history, intraday, riskFreeRate: rfr, ...derived,
      isLoading: false,
      error: options == null && !cached.options
        ? `Options data unavailable — chain matrix will use Black-Scholes`
        : null,
      lastUpdated: Date.now(), isStale: false, isDemo: false,
    });
  }, []);

  useEffect(() => { load(ticker); }, [ticker, load]);

  const refresh = useCallback(() => {
    try {
      localStorage.removeItem(`ot:quote:${ticker}`);
      localStorage.removeItem(`ot:options:${ticker}`);
      localStorage.removeItem(`ot:intraday:${ticker}`);
    } catch {}
    load(ticker, true);
  }, [ticker, load]);

  return { ...state, refresh };
};
