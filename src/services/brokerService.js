// src/services/brokerService.js
// ─────────────────────────────────────────────────────────────────────────────
// Broker API Service
// Handles fetching trade data from each broker's API endpoint.
// Each broker has different auth schemes and response formats — all normalized
// here before being handed off to brokerDataMapper.js
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result shape returned by every fetchTrades* function:
 * { ok: boolean, trades: RawBrokerTrade[], error?: string }
 *
 * RawBrokerTrade is broker-specific raw JSON — the mapper handles normalization.
 */

// ─── DHAN ────────────────────────────────────────────────────────────────────
// Docs: https://dhanhq.co/docs/v2/
export async function fetchTradesDhan(token) {
  try {
    const res = await fetch(
      `https://api.dhan.co/v2/trades`,
      {
        headers: {
          'access-token': token,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) throw new Error(`Dhan API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data ?? data ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── ANGEL ONE (SmartAPI) ────────────────────────────────────────────────────
// Docs: https://smartapi.angelbroking.com/docs/TradeBook
export async function fetchTradesAngel(token) {
  try {
    const res = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getTradeBook', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':  'application/json',
        Accept: 'application/json',
        'X-UserType':   'USER',
        'X-SourceID':   'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': token, // SmartAPI uses JWT; same token for header + key
      },
    });
    if (!res.ok) throw new Error(`Angel API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── FYERS ───────────────────────────────────────────────────────────────────
// Docs: https://myapi.fyers.in/docs/#tag/TradersData/paths
export async function fetchTradesFyers(token) {
  try {
    const res = await fetch('https://api-t1.fyers.in/api/v3/tradebook', {
      headers: {
        Authorization: token, // format: "appId:accessToken"
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Fyers API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.tradeBook ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── UPSTOX ──────────────────────────────────────────────────────────────────
// Docs: https://upstox.com/developer/api-documentation/get-trade-history
export async function fetchTradesUpstox(token) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(
      `https://api.upstox.com/v2/charges/historical-trades?segment=EQ&start_date=${subDays(today, 30)}&end_date=${today}&page_number=1&page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) throw new Error(`Upstox API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data?.trades ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── ZERODHA (Kite) ──────────────────────────────────────────────────────────
// Docs: https://kite.trade/docs/connect/v3/
export async function fetchTradesZerodha(token) {
  try {
    const res = await fetch('https://api.kite.trade/trades', {
      headers: {
        Authorization: `token ${token}`, // format: "apiKey:accessToken"
        'X-Kite-Version': '3',
      },
    });
    if (!res.ok) throw new Error(`Zerodha API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── SHOONYA (Finvasia) ──────────────────────────────────────────────────────
// Docs: https://shoonya.com/api-documentation
export async function fetchTradesShoonya(token) {
  try {
    // Shoonya uses form-encoded POST
    const body = new URLSearchParams({ jKey: token, jData: JSON.stringify({ ordersource: 'API' }) });
    const res = await fetch('https://api.shoonya.com/NorenWClientTP/TradeBook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Shoonya API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── FLATTRADE ───────────────────────────────────────────────────────────────
// Docs: https://flattrade.in/api-documentation
export async function fetchTradesFlattrade(token) {
  try {
    const body = new URLSearchParams({ jKey: token, jData: JSON.stringify({}) });
    const res = await fetch('https://piconnect.flattrade.in/PiConnectTP/TradeBook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Flattrade API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── ICICI BREEZE ────────────────────────────────────────────────────────────
// Docs: https://api.icicidirect.com/apiuser/apidoc
export async function fetchTradesICICI(token) {
  try {
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 30);
    const res = await fetch(
      `https://api.icicidirect.com/breezeapi/api/v1/trades?from_date=${from.toISOString()}&to_date=${today.toISOString()}&exchange_code=NSE`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }
    );
    if (!res.ok) throw new Error(`ICICI API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.Success ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── BINANCE ─────────────────────────────────────────────────────────────────
// Docs: https://binance-docs.github.io/apidocs/spot/en/
export async function fetchTradesBinance(apiKey) {
  try {
    // Binance requires HMAC signature for /myTrades — we use /trades (public recent)
    // For private trades, the signature must be done server-side or via proxy.
    // Here we fetch recent spot trades for BTC/USDT as a demo — production needs server proxy.
    const res = await fetch(
      `https://api.binance.com/api/v3/myTrades?symbol=BTCUSDT&limit=100&timestamp=${Date.now()}`,
      { headers: { 'X-MBX-APIKEY': apiKey } }
    );
    if (!res.ok) throw new Error(`Binance API error ${res.status}: Signature required — use server proxy`);
    const data = await res.json();
    return { ok: true, trades: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── BYBIT ───────────────────────────────────────────────────────────────────
// Docs: https://bybit-exchange.github.io/docs/v5/order/execution
export async function fetchTradesBybit(apiKey) {
  try {
    // Bybit v5 also requires HMAC — needs server-side for production
    const ts = Date.now();
    const res = await fetch(
      `https://api.bybit.com/v5/execution/list?category=spot&limit=50`,
      {
        headers: {
          'X-BAPI-API-KEY':   apiKey,
          'X-BAPI-TIMESTAMP': String(ts),
          'X-BAPI-RECV-WINDOW': '5000',
          // X-BAPI-SIGN requires server-side HMAC
        },
      }
    );
    if (!res.ok) throw new Error(`Bybit API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.result?.list ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── ALPACA ──────────────────────────────────────────────────────────────────
// Docs: https://alpaca.markets/docs/api-references/trading-api/orders/
export async function fetchTradesAlpaca(apiKey) {
  try {
    // Alpaca uses "APCA-API-KEY-ID" + "APCA-API-SECRET-KEY" — we accept combined "id:secret"
    const [keyId, secretKey] = apiKey.includes(':') ? apiKey.split(':') : [apiKey, ''];
    const res = await fetch('https://paper-api.alpaca.markets/v2/account/activities/FILL?page_size=100', {
      headers: {
        'APCA-API-KEY-ID':     keyId,
        'APCA-API-SECRET-KEY': secretKey,
      },
    });
    if (!res.ok) throw new Error(`Alpaca API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── IBKR ────────────────────────────────────────────────────────────────────
// IBKR Client Portal API — requires local TWS or Gateway running on port 5000
export async function fetchTradesIBKR(token) {
  try {
    const res = await fetch('https://localhost:5000/v1/api/iserver/account/trades', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`IBKR API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── KUCOIN ──────────────────────────────────────────────────────────────────
export async function fetchTradesKucoin(apiKey) {
  try {
    const [key, secret, passphrase] = apiKey.split(':');
    const ts  = Date.now();
    const res = await fetch(`https://api.kucoin.com/api/v1/fills?pageSize=100`, {
      headers: {
        'KC-API-KEY':        key,
        'KC-API-TIMESTAMP':  String(ts),
        'KC-API-PASSPHRASE': passphrase,
        // KC-API-SIGN requires server-side HMAC
      },
    });
    if (!res.ok) throw new Error(`KuCoin API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data?.items ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── OKX ─────────────────────────────────────────────────────────────────────
export async function fetchTradesOKX(apiKey) {
  try {
    const [key, secret, passphrase] = apiKey.split(':');
    const ts = new Date().toISOString();
    const res = await fetch('https://www.okx.com/api/v5/trade/fills?instType=SPOT&limit=100', {
      headers: {
        'OK-ACCESS-KEY':        key,
        'OK-ACCESS-TIMESTAMP':  ts,
        'OK-ACCESS-PASSPHRASE': passphrase,
        // OK-ACCESS-SIGN requires server-side HMAC
      },
    });
    if (!res.ok) throw new Error(`OKX API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.data ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── EXNESS ──────────────────────────────────────────────────────────────────
export async function fetchTradesExness(token) {
  try {
    const res = await fetch('https://my.exness.com/api/v2/trading/deal/list/', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Exness API error ${res.status}`);
    const data = await res.json();
    return { ok: true, trades: data?.results ?? data?.data ?? [] };
  } catch (err) {
    return { ok: false, trades: [], error: err.message };
  }
}

// ─── DISPATCHER ──────────────────────────────────────────────────────────────
// Central function: given brokerId + token → fetch raw trades
export async function fetchBrokerTrades(brokerId, token) {
  const map = {
    dhan:      fetchTradesDhan,
    angel:     fetchTradesAngel,
    fyers:     fetchTradesFyers,
    upstox:    fetchTradesUpstox,
    zerodha:   fetchTradesZerodha,
    shoonya:   fetchTradesShoonya,
    flattrade: fetchTradesFlattrade,
    icici:     fetchTradesICICI,
    binance:   fetchTradesBinance,
    bybit:     fetchTradesBybit,
    alpaca:    fetchTradesAlpaca,
    ibkr:      fetchTradesIBKR,
    kucoin:    fetchTradesKucoin,
    okx:       fetchTradesOKX,
    exness:    fetchTradesExness,
  };

  const fn = map[brokerId];
  if (!fn) return { ok: false, trades: [], error: `Unknown broker: ${brokerId}` };
  return fn(token);
}

// ─── HELPER ──────────────────────────────────────────────────────────────────
function subDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}