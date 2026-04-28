// Shared Yahoo Finance session/crumb helper
// Yahoo's options endpoint requires a crumb + session cookie (anti-scrape).
// The crumb is obtained by hitting finance.yahoo.com first, then /v1/test/getcrumb.
// We cache both for 55 minutes (they expire at ~1 hr on Yahoo's side).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let _cache = null; // { cookies, crumb, expiry }

function extractCookies(res) {
  // Node 18+ fetch: headers.getSetCookie() returns string[]
  // Older: headers.get('set-cookie') returns a single concatenated string
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ?? '').split(/,(?=\s*\w+=)/).map(s => s.trim());

  return raw
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

export async function getYFSession() {
  if (_cache && Date.now() < _cache.expiry) return _cache;

  // Step 1 — seed a session cookie from the main site
  const initRes = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  const cookies = extractCookies(initRes);

  // Step 2 — exchange session cookie for a crumb
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith('<') || crumb.includes('error')) {
    throw new Error(`Failed to get Yahoo Finance crumb (got: ${crumb.slice(0, 50)})`);
  }

  _cache = { cookies, crumb, expiry: Date.now() + 55 * 60 * 1000 };
  return _cache;
}

export const YF_HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};
