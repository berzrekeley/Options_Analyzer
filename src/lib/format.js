export const fmt = {
  currency: (val, decimals = 2) => {
    if (val == null || isNaN(val)) return '—';
    return `$${Math.abs(val).toFixed(decimals)}`;
  },

  percent: (val, decimals = 1) => {
    if (val == null || isNaN(val)) return '—';
    return `${val.toFixed(decimals)}%`;
  },

  change: (val, decimals = 2) => {
    if (val == null || isNaN(val)) return '—';
    return `${val >= 0 ? '+' : ''}${val.toFixed(decimals)}`;
  },

  greek: (val, decimals = 3) => {
    if (val == null || isNaN(val)) return '—';
    return val.toFixed(decimals);
  },

  price: (val) => {
    if (val == null || isNaN(val)) return '—';
    return `$${val.toFixed(2)}`;
  },

  bidAsk: (bid, ask) => {
    if (bid == null || ask == null) return '—';
    return `$${bid.toFixed(2)} / $${ask.toFixed(2)}`;
  },

  date: (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  },

  /** "Jun 20, 2025 (45d)" */
  expiryLabel: (formatted, dte) => {
    if (!formatted) return '—';
    return `${formatted} (${dte}d)`;
  },

  compact: (val) => {
    if (val == null || isNaN(val)) return '—';
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
    return val.toFixed(0);
  },
};
