# Options Terminal

Personal institutional-grade options analysis tool. Dark Bloomberg Terminal aesthetic, Black-Scholes engine, real Yahoo Finance data, free to host on Vercel.

## Quick Start

```bash
npm install
npm run dev          # local Vite dev server (no API — demo data only)
```

To run with live Yahoo Finance data locally:

```bash
npm install -g vercel
vercel dev           # runs Vite + serverless API routes on localhost:3000
```

## Deploy to Vercel (Free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework: **Vite** (auto-detected)
4. Click **Deploy**

That's it. No environment variables needed. No API keys.

Your app will be live at `your-project.vercel.app`.

## API Keys Required

**None.** Yahoo Finance is accessed via free unofficial endpoints, proxied through Vercel serverless functions (`/api/*.js`) to bypass CORS.

> **If Yahoo Finance breaks** (endpoints change periodically), the app falls back to synthetic Black-Scholes data. To switch to a real provider, replace the fetch URLs in `/api/*.js` only — no frontend changes needed. Polygon.io offers a free tier at 5 calls/min.

## Features

| Sprint | Feature |
|---|---|
| Phase 1 | Black-Scholes calculator · Greeks (Δ Θ V Γ) · IV Rank · Expected move bell curve |
| Phase 1 | Chain matrix heatmap · Strategy outlook (IV Rank + DTE advisory) |
| Phase 2 | Multi-leg strategy builder · P&L payoff diagram (expiry + T+0) |
| Phase 2 | 1-year HV history band chart · IV percentile reading |
| Polish  | ⌘K command palette · Keyboard shortcuts · Skeleton loaders · localStorage persistence |

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `P` / `C` | Toggle Put / Call |
| `1` / `2` / `3` | Switch tabs |
| `⌘K` or `/` | Open ticker search |
| `?` | Keyboard shortcuts cheatsheet |

## Data Notes

- **Stock price**: Yahoo Finance real-time (60s cache)
- **Options chain**: Yahoo Finance (first expiration; full chain on demand)
- **Historical volatility**: 1y daily closes → rolling 30d HV
- **IV**: ATM option implied volatility from Yahoo chain
- **Risk-free rate**: US 10Y Treasury (^TNX via Yahoo)
- **Historical IV**: Proxied by 1y HV percentile (true historical IV requires paid data)
