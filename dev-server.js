// Local dev API server — wraps the Vercel serverless handlers with Express
// Loads .env so ALPHAVANTAGE_API_KEY is available without installing vercel CLI

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Minimal .env loader (no external dep needed)
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

import express from 'express';
import quoteHandler    from './api/quote.js';
import optionsHandler  from './api/options.js';
import historyHandler  from './api/history.js';
import intradayHandler from './api/intraday.js';

const app  = express();
const PORT = 3001;

const route = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[dev-server]', err.message);
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/quote',    route(quoteHandler));
app.get('/api/options',  route(optionsHandler));
app.get('/api/history',  route(historyHandler));
app.get('/api/intraday', route(intradayHandler));

app.listen(PORT, () =>
  console.log(`[dev-server] API running on http://localhost:${PORT}`)
);
