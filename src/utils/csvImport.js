// src/utils/csvImport.js
// CSV Import Engine v4.0
// ─────────────────────────────────────────────────────────────
// Supports : Indian brokers (Zerodha, Upstox, Angel, Groww, Fyers, IIFL, Dhan)
//            Global brokers (IBKR, TDA/Schwab, Robinhood, Webull, eToro, MT4/MT5)
//            Crypto (Binance, Bybit)
// New in v4: Strategy Engine, Mistake Engine, Performance Tagging
// ─────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════
// SECTION 1 — BROKER PROFILES
// ════════════════════════════════════════════════════════════

const BROKER_PROFILES = {

  // ── Indian Brokers ────────────────────────────────────────

  zerodha: {
    name: 'Zerodha', market: 'indian',
    identifiers: ['tradingsymbol', 'series', 'trade no', 'tradeno', 'exchange'],
    columns: {
      script:     ['tradingsymbol', 'symbol'],
      leg:        ['trade type', 'tradetype', 'buysell'],
      quantity:   ['quantity', 'qty'],
      price:      ['price', 'averageprice', 'tradeprice'],
      date:       ['trade date', 'tradedate', 'date'],
      time:       ['trade time', 'tradetime', 'time'],
      pnl:        ['pnl', 'profit and loss', 'realizedpnl'],
      status:     ['status', 'orderstatus'],
    },
  },

  upstox: {
    name: 'Upstox', market: 'indian',
    identifiers: ['instrument name', 'instrumentname', 'order id', 'orderid', 'isin'],
    columns: {
      script:     ['instrument name', 'instrumentname', 'symbol', 'tradingsymbol'],
      leg:        ['transaction type', 'transactiontype', 'order side', 'orderside'],
      quantity:   ['quantity', 'qty', 'filledqty', 'filled qty'],
      price:      ['average price', 'averageprice', 'price', 'last traded price'],
      date:       ['order date', 'orderdate', 'trade date', 'tradedate'],
      time:       ['order time', 'ordertime', 'trade time', 'tradetime'],
      pnl:        ['pnl', 'net pnl', 'netpnl'],
      status:     ['status', 'order status', 'orderstatus'],
    },
  },

  angel: {
    name: 'Angel One', market: 'indian',
    identifiers: ['scrip name', 'scripname', 'net qty', 'netqty', 'client code'],
    columns: {
      script:     ['scrip name', 'scripname', 'symbol'],
      leg:        ['buy / sell', 'buysell', 'side', 'transaction type'],
      quantity:   ['net qty', 'netqty', 'quantity', 'qty'],
      price:      ['net rate', 'netrate', 'average price', 'price'],
      date:       ['trade date', 'tradedate', 'date'],
      time:       ['trade time', 'tradetime', 'time'],
      pnl:        ['realized p&l', 'realizedpnl', 'pnl', 'net p&l'],
      status:     ['status'],
    },
  },

  groww: {
    name: 'Groww', market: 'indian',
    identifiers: ['stock name', 'stockname', 'order no', 'validity'],
    columns: {
      script:     ['stock name', 'stockname', 'symbol', 'name'],
      leg:        ['order type', 'ordertype', 'transaction type', 'side'],
      quantity:   ['qty', 'quantity'],
      price:      ['price', 'avg price', 'avgprice'],
      date:       ['date', 'order date', 'orderdate'],
      time:       ['time', 'order time', 'ordertime'],
      pnl:        ['p&l', 'pnl', 'profit/loss'],
      status:     ['status'],
    },
  },

  fyers: {
    name: 'Fyers', market: 'indian',
    identifiers: ['fytoken', 'product type', 'producttype'],
    columns: {
      script:     ['symbol', 'tradingsymbol'],
      leg:        ['side', 'transaction type', 'buysell'],
      quantity:   ['qty', 'quantity', 'lot size'],
      price:      ['trade price', 'tradeprice', 'avg price'],
      date:       ['trade date', 'tradedate'],
      time:       ['trade time', 'tradetime'],
      pnl:        ['pnl', 'realized pnl'],
      status:     ['status'],
    },
  },

  dhan: {
    name: 'Dhan', market: 'indian',
    identifiers: ['dhan client id', 'dhanclientid', 'segment'],
    columns: {
      script:     ['trading symbol', 'tradingsymbol', 'security name'],
      leg:        ['transaction type', 'transactiontype', 'order side'],
      quantity:   ['traded qty', 'tradedqty', 'quantity'],
      price:      ['average price', 'averageprice', 'traded price'],
      date:       ['trade date', 'tradedate'],
      time:       ['trade time', 'tradetime'],
      pnl:        ['realized pnl', 'realizedpnl', 'pnl'],
      status:     ['order status', 'orderstatus'],
    },
  },

  iifl: {
    name: 'IIFL / 5Paisa', market: 'indian',
    identifiers: ['scripcode', 'market type', 'markettype', 'settlement no'],
    columns: {
      script:     ['company name', 'companyname', 'scrip name', 'scripname'],
      leg:        ['buy / sell', 'buysell', 'transaction type'],
      quantity:   ['quantity', 'qty'],
      price:      ['rate', 'price', 'trade price'],
      date:       ['trade date', 'tradedate', 'date'],
      time:       ['time', 'trade time'],
      pnl:        ['pnl', 'realized pnl'],
      status:     ['status'],
    },
  },

  // ── Global Brokers ────────────────────────────────────────

  interactive_brokers: {
    name: 'Interactive Brokers', market: 'global', currency: 'USD',
    identifiers: ['conid', 'underlying', 'fifopnlrealized', 'ibcommission'],
    columns: {
      script:     ['symbol', 'description'],
      leg:        ['buysell', 'buy/sell', 'side'],
      quantity:   ['quantity', 'shares'],
      price:      ['tradeprice', 'price'],
      date:       ['datetime', 'tradedate', 'date/time', 'date'],
      time:       ['datetime', 'time'],
      pnl:        ['fifopnlrealized', 'realizedpnl', 'pnl'],
      currency:   ['currency', 'curr'],
      commission: ['ibcommission', 'commission'],
      status:     ['code'],
    },
  },

  td_ameritrade: {
    name: 'TD Ameritrade / Schwab', market: 'global', currency: 'USD',
    identifiers: ['reg fee', 'regfee', 'net amount', 'netamount', 'tdam'],
    columns: {
      script:     ['symbol', 'security type'],
      leg:        ['action', 'side'],
      quantity:   ['quantity', 'qty', 'shares'],
      price:      ['price', 'avg price'],
      date:       ['date', 'settlement date'],
      time:       ['time'],
      pnl:        ['pnl', 'gain/loss $'],
      commission: ['commission', 'fees & comm'],
      status:     ['status'],
    },
  },

  robinhood: {
    name: 'Robinhood', market: 'global', currency: 'USD',
    identifiers: ['instrument url', 'instrumenturl', 'activity date'],
    columns: {
      script:     ['instrument', 'symbol', 'description'],
      leg:        ['side', 'trans code', 'transcode', 'type'],
      quantity:   ['quantity', 'shares'],
      price:      ['price', 'average price'],
      date:       ['activity date', 'activitydate', 'date'],
      time:       ['time'],
      pnl:        ['gain loss', 'gainloss', 'pnl'],
      commission: ['fees', 'commission'],
    },
  },

  webull: {
    name: 'Webull', market: 'global', currency: 'USD',
    identifiers: ['acc type', 'acctype', 'filled time', 'filledtime'],
    columns: {
      script:     ['symbol', 'ticker'],
      leg:        ['side', 'action'],
      quantity:   ['filled qty', 'filledqty', 'quantity'],
      price:      ['avg price', 'avgprice', 'price'],
      date:       ['filled time', 'filledtime', 'date'],
      time:       ['filled time', 'filledtime', 'time'],
      pnl:        ['pnl', 'realized p&l'],
      commission: ['commission', 'fees'],
      status:     ['status'],
    },
  },

  etoro: {
    name: 'eToro', market: 'global', currency: 'USD',
    identifiers: ['position id', 'positionid', 'units', 'leverage'],
    columns: {
      script:     ['action', 'details', 'symbol', 'asset'],
      leg:        ['type', 'direction', 'side'],
      quantity:   ['units', 'amount', 'quantity'],
      price:      ['open rate', 'openrate', 'close rate', 'closerate', 'price'],
      date:       ['date', 'open date', 'close date'],
      time:       ['time'],
      pnl:        ['profit', 'pnl', 'net profit'],
      commission: ['rollover fees', 'fees'],
    },
  },

  mt4_mt5: {
    name: 'MetaTrader 4/5', market: 'global', currency: 'USD',
    identifiers: ['ticket', 'magic', 'swap', 'commission'],
    columns: {
      script:     ['symbol', 'item'],
      leg:        ['type', 'direction', 'action'],
      quantity:   ['volume', 'lots', 'size'],
      price:      ['price', 'open price', 'close price'],
      date:       ['open time', 'close time', 'time', 'date'],
      time:       ['open time', 'close time', 'time'],
      pnl:        ['profit', 'pnl'],
      commission: ['commission'],
      swap:       ['swap'],
      status:     [],
    },
  },

  binance: {
    name: 'Binance', market: 'crypto', currency: 'USDT',
    identifiers: ['baseasset', 'quoteasset', 'realizedprofit', 'commissionasset'],
    columns: {
      script:     ['symbol', 'pair', 'baseasset'],
      leg:        ['side', 'type', 'isbuyermaker'],
      quantity:   ['qty', 'quantity', 'executedqty', 'amount'],
      price:      ['price', 'avgprice', 'executedprice'],
      date:       ['time', 'date', 'tradetime', 'updatetime'],
      time:       ['time', 'tradetime'],
      pnl:        ['realizedprofit', 'pnl', 'profit'],
      commission: ['commission', 'fee'],
      currency:   ['quoteasset', 'commissionasset'],
    },
  },

  bybit: {
    name: 'Bybit', market: 'crypto', currency: 'USDT',
    identifiers: ['orderlinked id', 'closedsize', 'cumexecvalue', 'leavesvalue'],
    columns: {
      script:     ['symbol', 'contract'],
      leg:        ['side', 'direction'],
      quantity:   ['qty', 'closedsize', 'cumexecqty'],
      price:      ['avg entry price', 'avgentryprice', 'avg exit price', 'avgexitprice', 'price'],
      date:       ['created time', 'createdtime', 'updated time', 'date'],
      time:       ['created time', 'createdtime', 'time'],
      pnl:        ['closed pnl', 'closedpnl', 'realizedpnl'],
      commission: ['cum exec fee', 'cumexecfee', 'fee'],
      currency:   ['settle coin', 'settlecoin'],
    },
  },
};

// ════════════════════════════════════════════════════════════
// SECTION 2 — INSTRUMENT TYPE DETECTION
// ════════════════════════════════════════════════════════════

export function detectInstrumentType(script, market) {
  const s = String(script).toUpperCase();

  if (market === 'crypto') return { type: 'Crypto', setup: 'Crypto Spot/Futures' };

  if (market === 'global' || market === 'foreign') {
    if (/^(EUR|GBP|AUD|NZD|USD|JPY|CHF|CAD)(\/|_)?(EUR|GBP|AUD|NZD|USD|JPY|CHF|CAD)$/.test(s))
      return { type: 'Forex', setup: 'Forex Day Trading' };
    if (/^[A-Z]{1,5}\s?\d{6}[CP]\d{8}$/.test(s))
      return { type: 'US Options', setup: 'US Options Intraday' };
    if (/^(ES|NQ|YM|RTY|CL|GC|SI|NG|ZB|ZN|ZC|ZS|ZW)[A-Z]\d{2}$/.test(s))
      return { type: 'US Futures', setup: 'US Futures Day Trading' };
    return { type: 'Global Equity', setup: 'Global Equity Intraday' };
  }

  // Indian instruments
  if (/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\d{2}/.test(s) && /(CE|PE)$/.test(s))
    return { type: 'Index Options', setup: 'Index Options Scalping' };
  if (/[A-Z]+\d{2}[A-Z]{3}\d+(CE|PE)$/.test(s))
    return { type: 'Stock Options', setup: 'Stock Options Intraday' };
  if (/(NIFTY|BANKNIFTY|FINNIFTY|SENSEX|BANKEX).*(FUT)$/.test(s) || /^(NIFTY|BANKNIFTY)FUT/.test(s))
    return { type: 'Index Futures', setup: 'Index Futures Intraday' };
  if (/FUT$/.test(s))
    return { type: 'Stock Futures', setup: 'Stock Futures Intraday' };
  if (/^(GOLD|SILVER|CRUDEOIL|NATURALGAS|COPPER|ZINC|LEAD|NICKEL|ALUMINIUM)/.test(s))
    return { type: 'Commodity', setup: 'MCX Commodity Intraday' };
  if (/^(USDINR|EURINR|GBPINR|JPYINR|EURUSD|GBPUSD)/.test(s))
    return { type: 'Currency', setup: 'Currency Derivatives Intraday' };

  return { type: 'Equity', setup: 'Equity Momentum Intraday' };
}

// ════════════════════════════════════════════════════════════
// SECTION 3 — STRATEGY ENGINE
// ════════════════════════════════════════════════════════════

// Complete strategy map: market → instrumentType → tradeType → strategy name
export const STRATEGY_MAP = {
  indian: {
    'Index Options':  { Intraday: 'Index Options Scalping',        Swing: 'Index Options Swing'           },
    'Stock Options':  { Intraday: 'Stock Options Intraday',        Swing: 'Stock Options Positional'      },
    'Index Futures':  { Intraday: 'Index Futures Intraday',        Swing: 'Index Futures Positional'      },
    'Stock Futures':  { Intraday: 'Stock Futures Intraday',        Swing: 'Stock Futures Swing'           },
    'Commodity':      { Intraday: 'MCX Commodity Intraday',        Swing: 'MCX Commodity Positional'      },
    'Currency':       { Intraday: 'Currency Derivatives Intraday', Swing: 'Currency Derivatives Swing'    },
    'Equity':         { Intraday: 'Equity Momentum Intraday',      Swing: 'Equity Positional Swing'       },
  },
  global: {
    'Global Equity':  { Intraday: 'Global Equity Intraday',        Swing: 'Global Equity Swing'           },
    'Equity':         { Intraday: 'Global Equity Intraday',        Swing: 'Global Equity Swing'           },
    'US Options':     { Intraday: 'US Options Intraday',           Swing: 'US Options Swing'              },
    'Options':        { Intraday: 'US Options Intraday',           Swing: 'US Options Swing'              },
    'US Futures':     { Intraday: 'US Futures Day Trading',        Swing: 'US Futures Swing'              },
    'Futures':        { Intraday: 'US Futures Day Trading',        Swing: 'US Futures Swing'              },
    'Forex':          { Intraday: 'Forex Day Trading',             Swing: 'Forex Swing Trading'           },
  },
  foreign: {
    'Forex':          { Intraday: 'Forex Day Trading',             Swing: 'Forex Swing Trading'           },
    'US Options':     { Intraday: 'US Options Intraday',           Swing: 'US Options Swing'              },
    'Options':        { Intraday: 'US Options Intraday',           Swing: 'US Options Swing'              },
    'US Futures':     { Intraday: 'US Futures Day Trading',        Swing: 'US Futures Swing'              },
    'Futures':        { Intraday: 'US Futures Day Trading',        Swing: 'US Futures Swing'              },
    'Equity':         { Intraday: 'Global Equity Intraday',        Swing: 'Global Equity Swing'           },
    'Global Equity':  { Intraday: 'Global Equity Intraday',        Swing: 'Global Equity Swing'           },
  },
  crypto: {
    'Crypto':              { Intraday: 'Crypto Day Trading',       Swing: 'Crypto Swing Trading'          },
    'Crypto Spot/Futures': { Intraday: 'Crypto Day Trading',       Swing: 'Crypto Swing Trading'          },
  },
};

// Labels that are considered "auto/generic" — can be replaced by assignStrategy()
const GENERIC_STRATEGY_LABELS = new Set([
  '', null, undefined,
  'Intraday', 'Swing', 'Unknown', 'None',
  // Old setup labels from detectInstrumentType (now properly replaced)
  'Index Options', 'Stock Options', 'Index Futures', 'Stock Futures',
  'Commodity', 'Currency', 'Equity', 'Equity Intraday',
  'Global Equity', 'Forex', 'US Options', 'US Futures',
  'Crypto', 'Crypto Spot/Futures',
]);

/**
 * assignStrategy(trade)
 * ─────────────────────
 * Returns the correct strategy name for a trade.
 * - If the user manually set a real strategy → keep it (not overridden)
 * - If it's a generic/auto label → compute proper strategy from instrument + type + market
 */
export function assignStrategy(trade) {
  const { strategy, instrumentType, type: tradeType, market } = trade;

  // Keep user-defined (non-generic) strategies
  if (strategy && !GENERIC_STRATEGY_LABELS.has(strategy)) return strategy;

  const mkt  = String(market       || 'indian').toLowerCase().trim();
  const inst = String(instrumentType || '').trim();
  const tt   = String(tradeType    || 'Intraday').trim();

  const marketMap = STRATEGY_MAP[mkt] || STRATEGY_MAP['indian'];

  // 1. Exact key match
  if (marketMap[inst]?.[tt]) return marketMap[inst][tt];

  // 2. Partial key match (instrument type contains key or vice versa)
  for (const [key, val] of Object.entries(marketMap)) {
    if (
      inst.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(inst.toLowerCase())
    ) {
      return val[tt] ?? val['Intraday'];
    }
  }

  // 3. Market-level fallback
  switch (mkt) {
    case 'crypto':  return tt === 'Intraday' ? 'Crypto Day Trading'       : 'Crypto Swing Trading';
    case 'foreign':
    case 'global':  return tt === 'Intraday' ? 'Global Equity Intraday'   : 'Global Equity Swing';
    default:        return tt === 'Intraday' ? 'Equity Momentum Intraday' : 'Equity Positional Swing';
  }
}

/**
 * getStrategyPerformanceTag(pnl)
 * ─────────────────────────────────────────────────────────────
 * Tags an overall strategy (by its cumulative PnL) as:
 *   'profitable'   → pnl > 0
 *   'loss-making'  → pnl < 0
 *   'breakeven'    → pnl = 0
 */
export function getStrategyPerformanceTag(pnl) {
  if (pnl > 0) return { performance: 'profitable',  label: 'Profitable',  recommendation: 'Continue — manage risk & position size.' };
  if (pnl < 0) return { performance: 'loss-making', label: 'Loss-Making', recommendation: 'Review or pause this strategy. Find the edge.' };
  return           { performance: 'breakeven',   label: 'Breakeven',   recommendation: 'Improve entry/exit rules or risk:reward ratio.' };
}

// ════════════════════════════════════════════════════════════
// SECTION 4 — MISTAKE ENGINE
// ════════════════════════════════════════════════════════════

// Time string → total minutes (for intraday gap calculation)
const timeToMin = (t) => {
  const p = String(t || '00:00').split(':').map(Number);
  return (p[0] || 0) * 60 + (p[1] || 0);
};

/**
 * detectMistakes(trade, context?)
 * ─────────────────────────────────────────────────────────────
 * Full context-aware mistake detection.
 * Used in calcStats (helpers.js) where we have full trade history.
 *
 * context = {
 *   allTrades      : Trade[],   // full sorted list (same day or all)
 *   tradeIndex     : number,    // index of this trade in allTrades
 *   avgLoss        : number,    // overall average loss amount (positive)
 *   avgWin         : number,    // overall average win amount
 *   tradesOnDate   : Trade[],   // all trades on this trade's date
 *   maxDailyTrades : number,    // threshold for overtrading flag (default 10)
 * }
 */
export function detectMistakes(trade, context = {}) {
  const {
    allTrades      = [],
    tradeIndex     = -1,
    avgLoss        = 0,
    avgWin         = 0,
    tradesOnDate   = [],
    maxDailyTrades = 10,
  } = context;

  const mistakes = [];
  const { pnl = 0, tradeTime = '00:00', date, strategy, type: tradeType, direction } = trade;

  // ── Loss / Breakeven ──────────────────────────────────────
  if (pnl < 0)  mistakes.push('Loss Trade');
  if (pnl === 0 && tradeType === 'Intraday') mistakes.push('Breakeven');

  // ── Large Loss (> 2× average loss) ───────────────────────
  if (pnl < 0 && avgLoss > 0 && Math.abs(pnl) > avgLoss * 2) {
    mistakes.push('Large Loss (>2× Avg)');
  }

  // ── Small win against large average loss (poor R:R) ──────
  if (pnl > 0 && avgLoss > 0 && pnl < avgLoss * 0.5) {
    mistakes.push('Poor Risk:Reward');
  }

  // ── Revenge Trade (entered within 15 min of a prior loss) ─
  if (tradeIndex > 0 && allTrades.length > 0) {
    const prev = allTrades[tradeIndex - 1];
    if (prev && prev.pnl < 0 && prev.date === date) {
      const gapMin = timeToMin(tradeTime) - timeToMin(prev.tradeTime || '00:00');
      if (gapMin >= 0 && gapMin <= 15) mistakes.push('Possible Revenge Trade');
    }
  }

  // ── Overtrading (too many trades in a day) ────────────────
  if (tradesOnDate.length > maxDailyTrades) mistakes.push('Overtrading');

  // ── Consecutive Losses (3 or more in a row) ──────────────
  if (tradeIndex >= 2 && allTrades.length > 2) {
    const last3 = allTrades.slice(Math.max(0, tradeIndex - 2), tradeIndex + 1);
    if (last3.length === 3 && last3.every(t => t.pnl < 0)) {
      mistakes.push('3 Consecutive Losses');
    }
  }

  // ── No / Generic Strategy ─────────────────────────────────
  if (!strategy || GENERIC_STRATEGY_LABELS.has(strategy)) {
    mistakes.push('No Strategy Defined');
  }

  // ── Profitable, clean trade ───────────────────────────────
  if (pnl > 0 && mistakes.length === 0) mistakes.push('None');

  return [...new Set(mistakes)];
}

/**
 * basicMistakes(trade)
 * ─────────────────────
 * Lightweight version — used during CSV import (no context available yet).
 * Full mistake detection runs later in calcStats.
 */
function basicMistakes(trade) {
  const m = [];
  if (trade.pnl < 0)  m.push('Loss Trade');
  if (trade.pnl === 0) m.push('Breakeven');
  if (trade.pnl > 0 && m.length === 0) m.push('None');
  return m;
}

// ════════════════════════════════════════════════════════════
// SECTION 5 — CHARGE ESTIMATOR (per market / instrument)
// ════════════════════════════════════════════════════════════

function estimateCharges(buyPrice, sellPrice, qty, market, instrumentType, commission) {
  if (commission > 0) return +commission.toFixed(2);

  const turnover = (buyPrice + sellPrice) * qty;

  switch (market) {
    case 'crypto':
      return +(turnover * 0.001).toFixed(2); // 0.1% per side

    case 'global':
    case 'foreign': {
      const t = String(instrumentType).toLowerCase();
      if (t.includes('option'))  return +(qty * 0.65 * 2).toFixed(2);     // $0.65/contract/side
      if (t.includes('forex'))   return +(turnover * 0.00002).toFixed(2);  // ~2 pip spread
      if (t.includes('futures')) return +(qty * 2.25 * 2).toFixed(2);     // $2.25/contract/side
      return +(qty * 0.005 * 2).toFixed(2);                                // $0.005/share/side
    }

    case 'indian':
    default: {
      const t = String(instrumentType).toLowerCase();
      if (t.includes('option')) {
        const brokerage = 40;
        const stt       = +(sellPrice * qty * 0.000625).toFixed(2);
        const other     = +(turnover * 0.0001).toFixed(2);
        return +(brokerage + stt + other).toFixed(2);
      }
      return +(turnover * 0.0003).toFixed(2); // futures, equity, commodity
    }
  }
}

// ════════════════════════════════════════════════════════════
// SECTION 6 — UTILITY HELPERS
// ════════════════════════════════════════════════════════════

const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return 0;
  const parsed = parseFloat(
    String(v).replace(/[₹$€£¥,\s]/g, '').replace(/\(([^)]+)\)/, '-$1')
  );
  return isNaN(parsed) ? 0 : parsed;
};

const parseDate = (dateRaw) => {
  if (!dateRaw) return null;
  const s = String(dateRaw).trim();

  // ISO datetime: "2024-01-15T09:30:00" or "2024-01-15 09:30:00"
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const normalized = s.replace(/\./g, '/').replace(/-/g, '/');
  const parts      = normalized.split('/');
  if (parts.length !== 3) return null;

  let [a, b, c] = parts.map(p => p.trim().split(' ')[0].split('T')[0]);
  let year, month, day;

  if (a.length === 4)      { year = a; month = b; day = c; }
  else if (c.length === 4) { day = a; month = b; year = c; }
  else if (c.length === 2) { day = a; month = b; year = '20' + c; }
  else return null;

  const d = parseInt(day, 10), m2 = parseInt(month, 10), y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m2) || isNaN(y)) return null;
  if (m2 < 1 || m2 > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;

  return `${year}-${String(m2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const buildTimestamp = (isoDate, timeRaw) => {
  if (!isoDate) return Date.now();
  const [yr, mo, dy] = isoDate.split('-').map(Number);
  const tStr   = String(timeRaw || '00:00:00').replace(/[^0-9:]/g, '');
  const tParts = tStr.split(':').map(Number);
  return new Date(yr, mo - 1, dy, tParts[0] || 0, tParts[1] || 0, tParts[2] || 0).getTime();
};

const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const cleanScript = (raw, market) => {
  if (!raw) return '';
  let s = String(raw).trim().toUpperCase();
  if (market === 'indian') {
    s = s.replace(/^(NSE:|BSE:|MCX:|NFO:|BFO:|CDS:)/, '');
    s = s.replace(/(-EQ|-BE|-BL|-N|-SM|-GB|-IL|-DR|-PP|-RL|-SG)$/, '');
  }
  if (market === 'global' || market === 'foreign') {
    s = s.replace(/^(NASDAQ:|NYSE:|AMEX:|ARCA:|BATS:|CBOE:)/, '');
  }
  return s.replace(/\s+/g, ' ').trim();
};

const detectMarket = (script, defaultMarket) => {
  const s = String(script).toUpperCase();
  if (/(BTC|ETH|SOL|DOGE|XRP|ADA|MATIC|AVAX|DOT|LINK)(USDT|USD|INR|PERP|BUSD)?$/.test(s)) return 'crypto';
  if (/^(EUR|GBP|AUD|NZD|CHF|CAD|JPY)(USD|EUR|GBP|JPY|INR|CHF)$/.test(s)) return 'foreign';
  return defaultMarket;
};

const tradeFingerprint = (t) =>
  `${t.date}|${t.script}|${t.direction}|${t.entryPrice}|${t.exitPrice}|${t.quantity}`;

// ════════════════════════════════════════════════════════════
// SECTION 7 — BROKER DETECTION
// ════════════════════════════════════════════════════════════

function detectBroker(headers) {
  const headerSet = new Set(headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const headerStr  = headers.join('|').toLowerCase();
  let bestBroker = null, bestScore = 0;

  for (const [key, profile] of Object.entries(BROKER_PROFILES)) {
    const score = profile.identifiers.reduce((s, id) => {
      const norm = id.replace(/[^a-z0-9]/g, '');
      return s + (headerSet.has(norm) || headerStr.includes(id.toLowerCase()) ? 1 : 0);
    }, 0);
    if (score > bestScore) { bestScore = score; bestBroker = key; }
  }

  return bestScore >= 1 ? bestBroker : null;
}

function pickColumn(row, fieldName, brokerKey, genericFallbacks) {
  const profile    = brokerKey ? BROKER_PROFILES[brokerKey] : null;
  const candidates = [...(profile?.columns[fieldName] || []), ...genericFallbacks];

  // Pass 1: exact normalized match
  for (const key of candidates) {
    const normKey = key.replace(/[^a-z0-9]/g, '');
    if (row[normKey] !== undefined && String(row[normKey]).trim() !== '')
      return String(row[normKey]).trim();
  }

  // Pass 2: prefix match (normKey >= 4 chars to avoid "qty" matching "netqty")
  for (const key of candidates) {
    const normKey = key.replace(/[^a-z0-9]/g, '');
    if (normKey.length < 4) continue;
    for (const rowKey of Object.keys(row)) {
      if (rowKey === normKey) continue;
      if (rowKey.startsWith(normKey) || normKey.startsWith(rowKey)) {
        if (row[rowKey] !== undefined && String(row[rowKey]).trim() !== '')
          return String(row[rowKey]).trim();
      }
    }
  }

  return '';
}

// ════════════════════════════════════════════════════════════
// SECTION 8 — CSV LINE SPLIT
// ════════════════════════════════════════════════════════════

function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
  const result = [];
  let inQuote = false, cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

// ════════════════════════════════════════════════════════════
// SECTION 9 — GLOBAL MARKET PNL LOGIC
// ════════════════════════════════════════════════════════════

function calcGlobalPnl(buyPrice, sellPrice, qty, instrumentType, symbol) {
  const type = String(instrumentType).toLowerCase();

  if (type.includes('forex')) {
    const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
    const pips     = (sellPrice - buyPrice) / pipValue;
    return +(pips * 10 * qty).toFixed(2); // $10/pip standard lot
  }

  if (type.includes('futures')) {
    const MULTIPLIERS = {
      ES: 50, NQ: 20, YM: 5, CL: 1000, GC: 100, SI: 5000,
      NG: 10000, RTY: 50, ZB: 1000, ZN: 1000, ZC: 50, ZS: 50, ZW: 50,
    };
    const sym  = symbol.replace(/[^A-Z]/g, '').slice(0, 2);
    const mult = MULTIPLIERS[sym] || 50;
    return +((sellPrice - buyPrice) * qty * mult).toFixed(2);
  }

  if (type.includes('option') && (type.includes('us') || type.includes('global'))) {
    return +((sellPrice - buyPrice) * qty * 100).toFixed(2); // 1 contract = 100 shares
  }

  return +((sellPrice - buyPrice) * qty).toFixed(2);
}

// ════════════════════════════════════════════════════════════
// SECTION 10 — MAIN EXPORT: parseCSV
// Returns { trades: [], summary: {} }
// ════════════════════════════════════════════════════════════

export function parseCSV(text, selectedMarket = 'indian', options = {}) {
  const {
    allowSwing      = true,  // multi-day pairing for swing trades
    inrRate         = 84,    // USD/USDT → INR conversion rate
    deduplicateKey  = null,  // existing Set of fingerprints to skip duplicates
    maxDailyTrades  = 10,    // overtrading threshold
  } = options;

  const summary = {
    broker: null,
    totalRows: 0,
    parsedExecutions: 0,
    pairedTrades: 0,
    skippedRows: 0,
    skippedReasons: [],
    duplicatesSkipped: 0,
    unpaired: 0,
    warnings: [],
  };

  // ── Step 1: Lines ────────────────────────────────────────
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) {
    summary.warnings.push('File too short or empty');
    return { trades: [], summary };
  }
  summary.totalRows = lines.length - 1;

  // ── Step 2: Delimiter ─────────────────────────────────────
  const sample    = lines.slice(0, 5).join('\n');
  const delimiter = (sample.match(/\t/g) || []).length > (sample.match(/,/g) || []).length ? '\t' : ',';

  // ── Step 3: Header detection ──────────────────────────────
  const normalizeH = h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const tokens = [
    'symbol','script','tradingsymbol','instrument','scripname','stockname','name','ticker',
    'buysell','side','action','transactiontype','type','direction',
    'price','tradeprice','averageprice','avgprice','rate','closerate','openrate',
    'quantity','qty','tradedqty','filledqty','volume','lots','units',
    'date','tradedate','time','tradetime','datetime','activitydate',
    'pnl','realizedpnl','netpnl','profit','closedpnl','fifopnlrealized',
    'commission','fee','ibcommission','swap','status','currency',
  ];

  const bestHeader = lines
    .map((line, index) => {
      const cols   = splitLine(line, delimiter).map(normalizeH);
      const joined = '|' + cols.join('|') + '|';
      const score  = tokens.reduce((s, t) => s + (joined.includes(t) ? 1 : 0), 0);
      return { index, cols, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestHeader || bestHeader.score < 2) {
    summary.warnings.push('Could not detect header row — check file format');
    return { trades: [], summary };
  }

  const headers   = bestHeader.cols;
  const dataLines = lines.slice(bestHeader.index + 1);

  // ── Step 4: Broker detection ──────────────────────────────
  const rawHeaders    = splitLine(lines[bestHeader.index], delimiter);
  const brokerKey     = detectBroker(rawHeaders);
  summary.broker      = brokerKey ? BROKER_PROFILES[brokerKey].name : 'Generic';
  const brokerMarket  = brokerKey ? BROKER_PROFILES[brokerKey].market : null;
  const effectiveMkt  = brokerMarket || selectedMarket;

  // ── Step 5: Parse executions ──────────────────────────────
  const isMT4         = brokerKey === 'mt4_mt5';
  const rawExecutions = [];
  const mt4Rows       = [];
  const seenFpMT4     = new Set();

  dataLines.forEach((line) => {
    const cols = splitLine(line, delimiter);
    if (cols.length < 2 || cols.every(c => !c)) return;

    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });

    const g = (field, fallbacks) => pickColumn(row, field, brokerKey, fallbacks);

    // Status check
    const status = g('status', ['status', 'orderstatus', 'tradestatus', 'code']).toLowerCase();
    if (status && /reject|cancel|fail|expired/.test(status)) {
      summary.skippedRows++;
      summary.skippedReasons.push(`Skipped [${status}]`);
      return;
    }

    // Script
    const rawScript = g('script', ['name','symbol','tradingsymbol','instrument','scripname','stockname','description','ticker','pair','item']);
    if (!rawScript) { summary.skippedRows++; return; }
    const market = detectMarket(rawScript, effectiveMkt);
    const script = cleanScript(rawScript, market);
    if (!script) { summary.skippedRows++; return; }

    // ── MT4/MT5: already-closed trade rows ────────────────
    if (isMT4) {
      const openPrice    = num(g('price', ['open price', 'openprice', 'price']));
      const closePrice   = num(g('price', ['close price', 'closeprice'])) || openPrice;
      const openDateRaw  = g('date', ['open time', 'opentime']);
      const closeDateRaw = g('date', ['close time', 'closetime']);
      const openISO      = parseDate(openDateRaw)  ?? todayISO();
      const closeISO     = parseDate(closeDateRaw) ?? openISO;
      const dirRaw       = g('leg', ['type', 'direction']).toUpperCase();
      const dir          = /BUY|LONG/.test(dirRaw) ? 'LONG' : 'SHORT';
      const qty          = num(g('quantity', ['volume', 'lots', 'size']));
      if (qty <= 0) { summary.skippedRows++; return; }

      const brokerProfit = num(g('pnl',  ['profit', 'pnl']));
      const swap         = num(g('swap', ['swap']));
      const comm         = num(g('commission', ['commission']));
      const { type: instrumentType } = detectInstrumentType(script, 'foreign');
      const tradeType    = openISO === closeISO ? 'Intraday' : 'Swing';
      const grossPnl     = +brokerProfit.toFixed(2);
      const charge       = +(Math.abs(comm) + Math.abs(swap)).toFixed(2);
      const netPnl       = +(grossPnl - charge).toFixed(2);

      const trade = {
        market: 'foreign', date: closeISO, tradeTime: closeDateRaw || '00:00:00',
        script, pnl: netPnl,
        metrics: { netPnl, grossPnl, charge, grossPnlRaw: grossPnl, currency: 'USD', currencyRate: inrRate, pnlSource: 'broker-provided' },
        instrumentType, direction: dir, type: tradeType,
        entryPrice: openPrice, exitPrice: closePrice, entryDate: openISO, exitDate: closeISO,
        quantity: qty, mistakes: [], notes: `MT4 | ${dir} | ${openISO}@${openPrice} → ${closeISO}@${closePrice}`,
        autoReview: '', source: 'csv-mt4_mt5',
      };
      // Strategy: assign properly
      trade.strategy = assignStrategy(trade);
      trade.setup    = trade.strategy;

      const fp = tradeFingerprint(trade);
      if (!seenFpMT4.has(fp)) { seenFpMT4.add(fp); mt4Rows.push(trade); }
      return;
    }

    // ── Standard execution row ─────────────────────────────
    const txnRaw = g('leg', ['buysell','transactiontype','side','action','type','direction','orderside']).toUpperCase().trim();
    let leg = '';
    if (/\bBUY\b|^B$|^LONG$|^BTO$|^BOT$|^1$/.test(txnRaw))           leg = 'BUY';
    else if (/\bSELL\b|^S$|^SHORT$|^STC$|^SLD$|^0$|^2$/.test(txnRaw)) leg = 'SELL';
    else if (txnRaw.startsWith('OPEN'))                                  leg = 'BUY';
    else if (txnRaw.startsWith('CLOSE'))                                 leg = 'SELL';
    else if (txnRaw === 'TRUE'  && g('leg', ['isbuyermaker']) !== '')    leg = 'SELL';
    else if (txnRaw === 'FALSE' && g('leg', ['isbuyermaker']) !== '')    leg = 'BUY';

    if (!leg) {
      summary.skippedRows++;
      summary.skippedReasons.push(`Unknown direction "${txnRaw}" for ${script}`);
      return;
    }

    const quantity    = num(g('quantity',  ['quantity','qty','tradedqty','filledqty','volume','lots','units','shares','executedqty','closedsize']));
    const tradedPrice = num(g('price',     ['tradeprice','price','averageprice','avgprice','rate','openrate','closerate','avgentryprice','avgexitprice']));
    if (quantity <= 0) { summary.skippedRows++; return; }

    const dateRaw   = g('date', ['date','tradedate','orderdate','activitydate','executiondate','datetime','filledtime','closedtime','opentime']);
    const timeRaw   = g('time', ['time','tradetime','ordertime','executiontime','exchangetime']);
    const isoDate   = parseDate(dateRaw) ?? todayISO();
    const timestamp = buildTimestamp(isoDate, timeRaw);

    const brokerPnlRaw = g('pnl', ['pnl','realizedpnl','netpnl','profit','closedpnl','fifopnlrealized','gainloss','realizedprofit','netpl']);
    const brokerPnl    = brokerPnlRaw ? num(brokerPnlRaw) : null;

    const commissionRaw = g('commission', ['commission','ibcommission','fee','fees','brokerage','rolloverfeesandswap']);
    const swapRaw       = g('swap',       ['swap']);
    const commission    = num(commissionRaw) + num(swapRaw);

    const currency = g('currency', ['currency','curr','quoteasset','settlecoin'])
      || (market === 'crypto' ? 'USDT' : market === 'global' ? 'USD' : 'INR');

    summary.parsedExecutions++;
    rawExecutions.push({ script, market, date: isoDate, tradeTime: timeRaw || '00:00:00', timestamp, leg, quantity, tradedPrice, brokerPnl, commission, currency });
  });

  // ── MT4 early return ──────────────────────────────────────
  if (isMT4 && mt4Rows.length > 0) {
    mt4Rows.forEach(t => { t.mistakes = basicMistakes(t); });
    summary.pairedTrades = mt4Rows.length;
    return { trades: mt4Rows, summary };
  }

  if (rawExecutions.length === 0) {
    summary.warnings.push('No valid executions found after parsing');
    return { trades: [], summary };
  }

  // ── Step 6: FIFO pairing ──────────────────────────────────
  const pairedRows        = [];
  const openLots          = {};
  const seenFingerprints  = deduplicateKey instanceof Set ? deduplicateKey : new Set();

  rawExecutions.sort((a, b) => a.timestamp - b.timestamp).forEach(row => {
    const key = allowSwing ? row.script : `${row.date}|${row.script}`;
    if (!openLots[key]) openLots[key] = { netQty: 0, lots: [] };
    const pos = openLots[key];

    const isOpening =
      pos.netQty === 0 ||
      (pos.netQty > 0 && row.leg === 'BUY') ||
      (pos.netQty < 0 && row.leg === 'SELL');

    if (isOpening) {
      pos.lots.push({ ...row });
      pos.netQty += row.leg === 'BUY' ? row.quantity : -row.quantity;
      return;
    }

    let remaining = row.quantity;

    while (remaining > 0 && pos.lots.length > 0) {
      const lot      = pos.lots[0];
      const matchQty = Math.min(remaining, lot.quantity);

      const isLong    = lot.leg === 'BUY';
      const buyPrice  = isLong ? lot.tradedPrice : row.tradedPrice;
      const sellPrice = isLong ? row.tradedPrice : lot.tradedPrice;
      const direction = isLong ? 'LONG' : 'SHORT';
      const tradeType = lot.date === row.date ? 'Intraday' : 'Swing';

      const { type: instrumentType } = detectInstrumentType(row.script, row.market);

      // PnL: broker-provided takes priority over calculated
      let grossPnl;
      if (row.brokerPnl !== null) {
        grossPnl = +row.brokerPnl.toFixed(2);
      } else {
        grossPnl = calcGlobalPnl(buyPrice, sellPrice, matchQty, instrumentType, row.script);
      }

      const toINR       = (row.currency !== 'INR' && row.market !== 'indian') ? inrRate : 1;
      const grossPnlINR = +(grossPnl * toINR).toFixed(2);
      const totalComm   = +((lot.commission || 0) + (row.commission || 0)).toFixed(2);
      const charge      = totalComm > 0
        ? +(totalComm * toINR).toFixed(2)
        : +(estimateCharges(buyPrice, sellPrice, matchQty, row.market, instrumentType, 0) * toINR).toFixed(2);
      const netPnl      = +(grossPnlINR - charge).toFixed(2);

      const trade = {
        market: row.market,
        date: row.date,
        tradeTime: lot.tradeTime,
        script: row.script,
        pnl: netPnl,
        metrics: {
          netPnl, grossPnl: grossPnlINR, charge,
          grossPnlRaw: grossPnl, currency: row.currency, currencyRate: toINR,
          pnlSource: row.brokerPnl !== null ? 'broker-provided' : 'auto-calculated',
        },
        instrumentType,
        direction,
        type: tradeType,
        entryPrice: lot.tradedPrice,
        exitPrice: row.tradedPrice,
        entryDate: lot.date,
        exitDate: row.date,
        quantity: matchQty,
        mistakes: [],
        notes: `${tradeType} | ${instrumentType} | Entry: ${lot.tradeTime}@${lot.tradedPrice} → Exit: ${row.tradeTime}@${row.tradedPrice}${row.currency !== 'INR' ? ` (${row.currency}×${toINR})` : ''}`,
        autoReview: '',
        source: brokerKey ? `csv-${brokerKey}` : 'csv-smart-parser',
      };

      // ── Assign strategy (proper name, not generic) ────────
      trade.strategy = assignStrategy(trade);
      trade.setup    = trade.strategy;

      const fp = tradeFingerprint(trade);
      if (seenFingerprints.has(fp)) {
        summary.duplicatesSkipped++;
      } else {
        seenFingerprints.add(fp);
        pairedRows.push(trade);
      }

      remaining      -= matchQty;
      lot.quantity   -= matchQty;
      if (lot.quantity <= 0) pos.lots.shift();
    }

    pos.netQty += row.leg === 'BUY' ? row.quantity : -row.quantity;

    if (remaining > 0) {
      pos.lots.push({ ...row, quantity: remaining });
      pos.netQty += row.leg === 'BUY' ? remaining : -remaining;
    }
  });

  // Unpaired open positions
  Object.values(openLots).forEach(pos =>
    pos.lots.forEach(l => { summary.unpaired += l.quantity || 0; })
  );

  // ── Step 7: Fallback (raw executions if pairing failed) ───
  if (pairedRows.length === 0 && rawExecutions.length > 0) {
    summary.warnings.push('Auto-pairing failed — imported as raw executions');
    rawExecutions.forEach(row => {
      const { type: instrumentType } = detectInstrumentType(row.script, row.market);
      const fallbackTrade = {
        market: row.market, date: row.date, tradeTime: row.tradeTime, script: row.script,
        pnl: row.brokerPnl ?? 0,
        metrics: { netPnl: row.brokerPnl ?? 0, grossPnl: row.brokerPnl ?? 0, charge: 0, pnlSource: 'raw-unpaired' },
        instrumentType,
        direction: row.leg === 'BUY' ? 'LONG' : 'SHORT',
        type: 'Intraday',
        entryPrice: row.tradedPrice, exitPrice: '', quantity: row.quantity,
        mistakes: ['Pairing Failed'],
        notes: 'Raw execution. Auto-pairing could not match buy and sell legs.',
        autoReview: '', source: 'csv-fallback',
      };
      fallbackTrade.strategy = assignStrategy(fallbackTrade);
      fallbackTrade.setup    = fallbackTrade.strategy;
      pairedRows.push(fallbackTrade);
    });
  }

  // ── Step 8: Post-process — mistakes (basic at import time) ─
  // Full context-aware mistakes run in calcStats (helpers.js)
  pairedRows.forEach(t => {
    if (!t.mistakes || t.mistakes.length === 0 || t.mistakes[0] === 'Pairing Failed') return;
    t.mistakes = basicMistakes(t);
  });

  summary.pairedTrades = pairedRows.length;
  if (summary.unpaired > 0)
    summary.warnings.push(`${summary.unpaired} units have no matching close — open positions or incomplete data`);

  return { trades: pairedRows, summary };
}

// ════════════════════════════════════════════════════════════
// SECTION 11 — CONVENIENCE WRAPPERS
// ════════════════════════════════════════════════════════════

/** Backward-compat: old callers that expect just an array */
export function parseCSVSimple(text, selectedMarket = 'indian') {
  return parseCSV(text, selectedMarket).trades;
}

/** Format import summary for summary/modal display */
export function formatImportSummary(summary) {
  const lines = [
    `Broker detected : ${summary.broker}`,
    `Trades imported : ${summary.pairedTrades}`,
    `Rows skipped    : ${summary.skippedRows}`,
  ];
  if (summary.duplicatesSkipped > 0) lines.push(`Duplicates skipped : ${summary.duplicatesSkipped}`);
  if (summary.unpaired > 0)          lines.push(`Open/unpaired qty  : ${summary.unpaired}`);
  if (summary.warnings.length > 0)   lines.push(`Warnings: ${summary.warnings.join('; ')}`);
  return lines.join('\n');
}
