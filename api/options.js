import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const num = (v) => parseFloat(v) || 0;
const int = (v) => parseInt(v)   || 0;

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    // 1. Get the list of expiration dates and the first set of options
    const firstResult = await yf.options(ticker.toUpperCase());

    if (!firstResult || !firstResult.expirationDates || firstResult.expirationDates.length === 0) {
      return res.status(404).json({ error: `No options data for ${ticker}` });
    }

    const allDates = firstResult.expirationDates;
    const expirationDates = allDates.map(d => Math.floor(new Date(d).getTime() / 1000));

    // 2. Map Yahoo Finance contracts to our internal format
    const mapContract = (c, expiryDate) => ({
      strike:       num(c.strike),
      bid:          num(c.bid),
      ask:          num(c.ask),
      lastPrice:    num(c.lastPrice),
      mark:         num((num(c.bid) + num(c.ask)) / 2) || num(c.lastPrice),
      iv:           num(c.impliedVolatility),
      volume:       int(c.volume),
      openInterest: int(c.openInterest),
      expirationDate: expiryDate,
      delta:        0, 
      gamma:        0,
      theta:        0,
      vega:         0,
      rho:          0,
      inTheMoney:   !!c.inTheMoney,
    });

    // 3. Fetch the first 10 expirations in parallel to provide a rich initial experience
    // (Yahoo Finance API is fast enough for ~10 concurrent requests)
    const datesToFetch = allDates.slice(0, 10);
    const results = await Promise.all(
      datesToFetch.map(d => yf.options(ticker.toUpperCase(), { date: d }))
    );

    const options = results.map(res => {
      const expDate = Math.floor(new Date(res.options[0].expiration).getTime() / 1000);
      return {
        expirationDate: expDate,
        calls: res.options[0].calls.map(c => mapContract(c, expDate)).sort((a, b) => a.strike - b.strike),
        puts:  res.options[0].puts.map(c => mapContract(c, expDate)).sort((a, b) => a.strike - b.strike),
      };
    });

    // 4. ATM IV calculation based on the first expiration
    const spotPrice = firstResult.quote?.regularMarketPrice || 0;
    let atmIV = null;
    if (options[0] && spotPrice > 0) {
      const allFirst = [...options[0].calls, ...options[0].puts];
      const atm = allFirst
        .filter(c => c.iv > 0.005)
        .sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice))[0];
      if (atm) atmIV = atm.iv;
    }

    const strikeSet = new Set();
    options.forEach(o => {
      o.calls.forEach(c => strikeSet.add(c.strike));
      o.puts.forEach(p => strikeSet.add(p.strike));
    });
    const strikes = Array.from(strikeSet).sort((a, b) => a - b);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json({ 
      ticker: ticker.toUpperCase(), 
      spotPrice, 
      atmIV, 
      expirationDates, 
      strikes, 
      options 
    });

  } catch (err) {
    console.error('[yahoo-options]', err.message);
    res.status(500).json({ error: err.message });
  }
}
