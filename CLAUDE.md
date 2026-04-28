# Institutional Options Terminal

Personal-use options analysis tool with Black-Scholes pricing, Greeks, volatility metrics, chain matrix, strategy builder, and P&L payoff diagrams.

## Stack

- **Framework**: Vite + React 18 (functional components + hooks)
- **Styling**: Tailwind CSS 3.4 + CSS variables (dark theme tokens)
- **Fonts**: Geist + Geist Mono (`geist` npm package) — Geist Mono for all numbers
- **Components**: shadcn/ui primitives (Tabs, Select, Dialog, Tooltip)
- **Animation**: Framer Motion (digit counters, tab transitions)
- **Charts**: Recharts (IV history) + custom SVG (bell curve, payoff diagram)
- **Icons**: Lucide React
- **Data**: Yahoo Finance via Vercel `/api/*` serverless proxies (no API key required)
- **Hosting**: Vercel free hobby tier

## Local Development

```bash
npm install
vercel dev        # runs Vite + serverless functions on localhost:3000
```

Requires [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

## Project Structure

```
├── api/                  Vercel serverless proxies (Yahoo Finance CORS bypass)
│   ├── quote.js          Stock quote + ^TNX risk-free rate
│   ├── options.js        Options chain with real IV
│   └── history.js        1y daily closes for HV calculation
├── src/
│   ├── components/       UI components (see list below)
│   ├── lib/
│   │   ├── blackScholes.js   Greeks engine (normalCDF, calculateGreeks)
│   │   ├── strategies.js     Multi-leg P&L + strategy auto-classifier
│   │   ├── volatility.js     30d HV (annualized stdev of log returns × √252)
│   │   ├── yahooClient.js    Fetch wrappers for /api/* routes
│   │   └── format.js         Currency, percent, date formatters
│   ├── hooks/
│   │   ├── useMarketData.js  SWR-style fetch with localStorage cache
│   │   ├── useKeyboard.js    Global shortcut handler
│   │   └── useLocalStorage.js
│   └── styles/globals.css    Tailwind base + CSS variables
├── Layout.html           Original single-file React mock (reference only)
├── PRD.md                Product requirements
└── Design.md             Design specification
```

## Key Components

| Component | Purpose |
|---|---|
| `Header.jsx` | Search, ticker badge, tab nav, Cmd-K palette |
| `MarketSummary.jsx` | Spot price (animated), sparkline, IV/IVR/HV row |
| `ContractConfig.jsx` | Strike, expiration, put/call toggle |
| `GreeksGrid.jsx` | Bid/Ask, Δ, Θ, V, Γ, 1SD with micro sparklines |
| `BellCurveChart.jsx` | Normal distribution 68%/95% expected move viz |
| `ChainMatrix.jsx` | Heatmap options chain table |
| `StrategyBuilder.jsx` | Multi-leg builder with auto-detect strategy name |
| `PayoffDiagram.jsx` | P&L at expiration + T+0 (SVG) |
| `IVHistoryChart.jsx` | 1y HV percentile band chart |
| `CommandPalette.jsx` | Cmd-K fuzzy ticker search (cmdk) |

## Math Engine

The Black-Scholes engine lives in `src/lib/blackScholes.js` (ported from `Layout.html:22-52`). Do not change the core math — it has parity with ThinkOrSwim within ±0.005 Delta / ±0.10 Theta.

Greeks: Delta, Gamma, Theta (per-day), Vega (per 1% IV move).  
Expected move: `S × IV × √(T)` where T = DTE/365.

## Design Tokens (Dark Bloomberg Terminal)

```
Background:   #08080c
Card bg:      #0f0f17
Card border:  rgba(99,102,241,0.12)
Card shadow:  0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.4)
Glow hover:   box-shadow: 0 0 20px rgba(99,102,241,0.25)

Bullish:      emerald-400  (#34d399)
Bearish:      rose-400     (#fb7185)
Primary:      indigo-500   (#6366f1)
Live pulse:   cyan-400     (#22d3ee)
Text:         slate-300 / slate-400 / slate-500
Gridlines:    rgba(255,255,255,0.04)
```

## Data Notes

- **Risk-free rate**: fetched live from Yahoo Finance `^TNX` (10y Treasury yield) via `/api/quote.js`
- **Historical IV**: approximated by 1y HV percentile — true historical IV requires a paid source. Flagged in the UI with an info tooltip.
- **Cache headers**: `s-maxage=60, stale-while-revalidate=300` on all `/api/*` routes
- **Yahoo endpoints** can change without notice. If they break, swap providers in `/api/*.js` only (e.g. Polygon free tier).

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `P` / `C` | Toggle Put / Call |
| `1` / `2` / `3` | Switch tabs (Dashboard / Chain Matrix / Strategy) |
| `/` or `Cmd+K` | Focus search / open command palette |
| `Esc` | Clear search |
| `?` | Open keyboard shortcuts cheatsheet |

## Deploy

Push to GitHub and connect to Vercel. Auto-deploys on every push to `main`.

```bash
git add .
git commit -m "your message"
git push origin main
```
