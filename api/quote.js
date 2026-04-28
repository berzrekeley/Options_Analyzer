import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    const q = await yf.quote(ticker.toUpperCase(), {
      fields: [
        'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
        'regularMarketPreviousClose', 'shortName', 'longName', 'marketState',
      ],
    });

    if (!q || q.regularMarketPrice == null) {
      return res.status(404).json({ error: `No data for ${ticker}` });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json({
      ticker:             ticker.toUpperCase(),
      name:               q.shortName || q.longName || ticker.toUpperCase(),
      price:              q.regularMarketPrice,
      priceChange:        q.regularMarketChange        ?? 0,
      priceChangePercent: q.regularMarketChangePercent ?? 0,
      previousClose:      q.regularMarketPreviousClose ?? q.regularMarketPrice,
      marketState:        q.marketState                ?? 'REGULAR',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
