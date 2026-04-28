import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker param required' });

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rows = await yf.chart(ticker.toUpperCase(), {
      period1: oneYearAgo,
      interval: '1d',
    });

    const quotes = rows?.quotes ?? [];
    const closes = [];
    const dates  = [];

    for (const q of quotes) {
      if (q.close != null && !isNaN(q.close) && q.date) {
        closes.push(+q.close.toFixed(4));
        dates.push(new Date(q.date).toISOString().split('T')[0]);
      }
    }

    if (closes.length === 0) {
      return res.status(404).json({ error: `No history for ${ticker}` });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.json({ ticker: ticker.toUpperCase(), closes, dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
