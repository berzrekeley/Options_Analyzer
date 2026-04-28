import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    const rows = await yf.chart(ticker.toUpperCase(), {
      period1:  new Date(Date.now() - 2 * 86_400_000), // last 2 days to ensure today's bars
      interval: '5m',
    });

    const quotes = rows?.quotes ?? [];
    const open   = rows?.meta?.chartPreviousClose ?? rows?.meta?.regularMarketOpen ?? null;

    const closes = [];
    const times  = [];
    const today  = new Date().toDateString();

    for (const q of quotes) {
      if (q.close != null && !isNaN(q.close) && q.date) {
        // Only keep today's bars
        if (new Date(q.date).toDateString() !== today) continue;
        closes.push(+q.close.toFixed(4));
        times.push(Math.floor(new Date(q.date).getTime() / 1000));
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.json({ ticker: ticker.toUpperCase(), closes, times, open });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
