// Realistic AAPL-like demo data used when Yahoo Finance API is unavailable
// (i.e. running `npm run dev` without `vercel dev`)

export const MOCK_QUOTE = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  price: 185.92,
  priceChange: 2.45,
  priceChangePercent: 1.34,
  previousClose: 183.47,
  marketState: 'REGULAR',
};

// Generate a realistic 1-year (252 trading day) synthetic close series for AAPL
const _seed = (() => {
  let s = 185.92;
  const closes = [];
  const today = new Date();
  const dates  = [];
  for (let i = 251; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - Math.ceil(i * 365 / 252));
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const noise = (Math.sin(i * 0.37) * 0.008) + (Math.cos(i * 0.71) * 0.006) + (Math.random() * 0.01 - 0.005);
    s = Math.max(140, s * (1 + noise));
    closes.push(+s.toFixed(2));
    dates.push(d.toISOString().split('T')[0]);
  }
  return { closes, dates };
})();

export const MOCK_HISTORY = {
  ticker: 'AAPL',
  closes: _seed.closes,
  dates:  _seed.dates,
};

// Expiration dates: next 6 Fridays
const _getNextFridays = () => {
  const dates = [];
  const today = new Date();
  for (let i = 7; i < 100; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    if (d.getDay() === 5) dates.push(Math.floor(d.getTime() / 1000));
    if (dates.length >= 6) break;
  }
  return dates;
};

const _expirationDates = _getNextFridays();
const _spot = 185.92;
const _strikes = [155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215];

// Synthetic intraday 5-min closes for demo (78 bars = 6.5 hrs)
export const MOCK_INTRADAY = (() => {
  const open = 183.47;
  const closes = [];
  const times  = [];
  const now    = Math.floor(Date.now() / 1000);
  let price    = open;
  for (let i = 0; i < 78; i++) {
    const noise = Math.sin(i * 0.4) * 0.6 + Math.cos(i * 0.9) * 0.3 + (Math.random() - 0.48) * 0.4;
    price = Math.max(open * 0.97, price + noise);
    closes.push(+price.toFixed(2));
    times.push(now - (78 - i) * 300);
  }
  return { ticker: 'AAPL', closes, times, open };
})();

export const MOCK_OPTIONS = {
  ticker: 'AAPL',
  spotPrice: _spot,
  atmIV: 0.22,
  expirationDates: _expirationDates,
  strikes: _strikes,
  options: [
    {
      expirationDate: _expirationDates[0],
      calls: _strikes.map(K => ({
        strike: K,
        bid:  Math.max(0, _spot - K + 1.2).toFixed(2) * 1,
        ask:  Math.max(0, _spot - K + 1.5).toFixed(2) * 1,
        lastPrice: Math.max(0, _spot - K + 1.3).toFixed(2) * 1,
        iv: 0.20 + Math.abs(K - _spot) / _spot * 0.5,
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 5000),
        inTheMoney: K < _spot,
      })),
      puts: _strikes.map(K => ({
        strike: K,
        bid:  Math.max(0, K - _spot + 1.2).toFixed(2) * 1,
        ask:  Math.max(0, K - _spot + 1.5).toFixed(2) * 1,
        lastPrice: Math.max(0, K - _spot + 1.3).toFixed(2) * 1,
        iv: 0.22 + Math.abs(K - _spot) / _spot * 0.5,
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 5000),
        inTheMoney: K > _spot,
      })),
    },
  ],
};
