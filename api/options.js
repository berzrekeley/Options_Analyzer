import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const num = (v) => parseFloat(v) || 0;
const int = (v) => parseInt(v)   || 0;

export default async function handler(req, res) {
  const { ticker, date } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    // Yahoo Finance returns options for a specific expiration or the nearest one
    // date should be a unix timestamp
    const optionsResult = await yf.options(ticker.toUpperCase(), {
      ...(date ? { date: new Date(parseInt(date) * 1000) } : {})
    });

    if (!optionsResult || !optionsResult.options || optionsResult.options.length === 0) {
      return res.status(404).json({ error: `No options data for ${ticker}` });
    }

    const expirationDates = optionsResult.expirationDates.map(d => 
      Math.floor(new Date(d).getTime() / 1000)
    );

    // Map Yahoo Finance contracts to our internal format
    const mapContract = (c) => ({
      strike:       num(c.strike),
      bid:          num(c.bid),
      ask:          num(c.ask),
      lastPrice:    num(c.lastPrice),
      mark:         num((num(c.bid) + num(c.ask)) / 2) || num(c.lastPrice),
      iv:           num(c.impliedVolatility),
      volume:       int(c.volume),
      openInterest: int(c.openInterest),
      // Yahoo does not provide greeks directly in the options call, 
      // the frontend (ChainMatrix) already calculates them using Black-Scholes 
      // when they are missing, which is perfect.
      delta:        0, 
      gamma:        0,
      theta:        0,
      vega:         0,
      rho:          0,
      inTheMoney:   !!c.inTheMoney,
    });

    // Yahoo returns one expiration's worth of options at a time in the .options array
    // but we need to return it in the format the frontend expects: [{ expirationDate, calls, puts }]
    const currentExpiryDate = Math.floor(new Date(optionsResult.options[0].expiration).getTime() / 1000);
    
    const options = [{
      expirationDate: currentExpiryDate,
      calls: optionsResult.options[0].calls.map(mapContract).sort((a, b) => a.strike - b.strike),
      puts:  optionsResult.options[0].puts.map(mapContract).sort((a, b) => a.strike - b.strike),
    }];

    // ATM IV calculation
    let atmIV = null;
    const spotPrice = optionsResult.quote?.regularMarketPrice || 0;
    const allFirst = [...options[0].calls, ...options[0].puts];
    if (allFirst.length > 0 && spotPrice > 0) {
      const atm = allFirst
        .filter(c => c.iv > 0.005)
        .sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice))[0];
      if (atm) atmIV = atm.iv;
    }

    const strikeSet = new Set([...options[0].calls.map(c => c.strike), ...options[0].puts.map(p => p.strike)]);
    const strikes   = Array.from(strikeSet).sort((a, b) => a - b);

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
