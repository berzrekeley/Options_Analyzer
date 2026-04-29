import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const num = (v) => parseFloat(v) || 0;
const int = (v) => parseInt(v)   || 0;

export default async function handler(req, res) {
  const { ticker, date } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    const symbol = ticker.toUpperCase();
    
    // 1. Get initial data to find all expiration dates
    const firstResult = await yf.options(symbol);

    if (!firstResult || !firstResult.expirationDates || firstResult.expirationDates.length === 0) {
      return res.status(404).json({ error: `No options data for ${symbol}` });
    }

    const allDates = firstResult.expirationDates;
    const expirationDates = allDates.map(d => Math.floor(new Date(d).getTime() / 1000));

    // 2. Mapping helper
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

    // 3. Determine which dates to fetch
    // If a specific date is requested, we MUST fetch it.
    // Otherwise, we pre-fetch the first 20 to be safe.
    let datesToFetch = allDates.slice(0, 20);
    if (date) {
      const requestedDate = new Date(parseInt(date) * 1000).toISOString().split('T')[0];
      if (!datesToFetch.some(d => new Date(d).toISOString().startsWith(requestedDate))) {
        // If not in the first 20, add it to the list
        const foundDate = allDates.find(d => new Date(d).toISOString().startsWith(requestedDate));
        if (foundDate) datesToFetch.push(foundDate);
      }
    }

    // 4. Fetch in parallel
    const results = await Promise.all(
      datesToFetch.map(d => yf.options(symbol, { date: d }).catch(err => {
        console.error(`[yahoo-options] Error fetching ${d}:`, err.message);
        return null;
      }))
    );

    const options = results
      .filter(res => res && res.options && res.options[0])
      .map(res => {
        const expDate = Math.floor(new Date(res.options[0].expiration).getTime() / 1000);
        return {
          expirationDate: expDate,
          calls: res.options[0].calls.map(c => mapContract(c, expDate)).sort((a, b) => a.strike - b.strike),
          puts:  res.options[0].puts.map(c => mapContract(c, expDate)).sort((a, b) => a.strike - b.strike),
        };
      });

    // 5. Global Metadata
    const spotPrice = firstResult.quote?.regularMarketPrice || 0;
    
    // Calculate ATM IV from the first available expiration
    let atmIV = null;
    if (options[0] && spotPrice > 0) {
      const allFirst = [...options[0].calls, ...options[0].puts];
      const atm = allFirst
        .filter(c => c.iv > 0.01)
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
      ticker: symbol, 
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
