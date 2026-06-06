// src/utils/brokerDataMapper.js
// ─────────────────────────────────────────────────────────────────────────────
// Broker Data Mapper
// Converts raw broker API responses → RuleBook's internal trade schema.
// Each broker returns wildly different field names and formats — this is the
// single place we normalize them all.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RuleBook Trade Schema (target shape):
 * {
 *   id:          string   — unique trade ID
 *   broker:      string   — broker name (e.g. "Dhan", "Angel One")
 *   brokerId:    string   — broker key (e.g. "dhan", "angel")
 *   symbol:      string   — trading symbol (e.g. "RELIANCE", "BTCUSDT")
 *   exchange:    string   — exchange (NSE / BSE / CRYPTO / FOREX / NYSE)
 *   side:        'buy' | 'sell'
 *   qty:         number   — quantity / lots
 *   price:       number   — average fill price
 *   amount:      number   — total value (qty × price)
 *   pnl:         number   — P&L if available, else 0
 *   date:        string   — ISO date string
 *   time:        string   — HH:MM:SS
 *   orderId:     string   — broker's order reference
 *   tradeId:     string   — broker's fill/trade reference
 *   productType: string   — CNC / MIS / NRML / DELIVERY etc
 *   market:      'indian' | 'foreign'
 *   source:      'broker-api'
 *   importedAt:  string   — ISO timestamp of import
 *   raw:         object   — original broker response (kept for debugging)
 * }
 */

const now = () => new Date().toISOString();

function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function normalizeSide(v = '') {
  const s = String(v).toUpperCase();
  if (s === 'BUY'  || s === 'B' || s === 'LONG')  return 'buy';
  if (s === 'SELL' || s === 'S' || s === 'SHORT') return 'sell';
  return s.toLowerCase();
}

function parseDate(v) {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseTime(v) {
  if (!v) return '00:00:00';
  // if it looks like HH:MM:SS already
  if (/^\d{2}:\d{2}:\d{2}/.test(v)) return v.slice(0, 8);
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toTimeString().slice(0, 8);
  }
  return '00:00:00';
}

// ─── DHAN ────────────────────────────────────────────────────────────────────
// Fields: dhanClientId, orderId, exchangeOrderId, tradingSymbol, exchangeSegment,
//         transactionType, productType, orderType, tradedQuantity, tradedPrice,
//         createTime, updateTime
export function mapDhan(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.tradedQuantity);
    const price = toNum(t.tradedPrice);
    return {
      id:          `dhan_${t.orderId || t.exchangeOrderId || Math.random()}`,
      broker:      'Dhan',
      brokerId,
      symbol:      t.tradingSymbol || '',
      exchange:    t.exchangeSegment || 'NSE',
      side:        normalizeSide(t.transactionType),
      qty,
      price,
      amount:      qty * price,
      pnl:         0,
      date:        parseDate(t.createTime || t.updateTime),
      time:        parseTime(t.createTime || t.updateTime),
      orderId:     t.orderId || '',
      tradeId:     t.exchangeOrderId || '',
      productType: t.productType || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── ANGEL ONE (SmartAPI) ────────────────────────────────────────────────────
// Fields: orderid, tradeid, tradingsymbol, exchange, transactiontype, producttype,
//         fillsize, fillprice, filltime
export function mapAngel(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.fillsize || t.Qty);
    const price = toNum(t.fillprice || t.Price);
    return {
      id:          `angel_${t.tradeid || t.orderid || Math.random()}`,
      broker:      'Angel One',
      brokerId,
      symbol:      t.tradingsymbol || '',
      exchange:    t.exchange || 'NSE',
      side:        normalizeSide(t.transactiontype),
      qty,
      price,
      amount:      qty * price,
      pnl:         0,
      date:        parseDate(t.filltime),
      time:        parseTime(t.filltime),
      orderId:     t.orderid || '',
      tradeId:     t.tradeid || '',
      productType: t.producttype || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── FYERS ───────────────────────────────────────────────────────────────────
// Fields: symbol, exchange, side, qty, tradedPrice, orderDateTime, id, productType
export function mapFyers(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.qty);
    const price = toNum(t.tradedPrice);
    return {
      id:          `fyers_${t.id || Math.random()}`,
      broker:      'Fyers',
      brokerId,
      symbol:      (t.symbol || '').split(':').pop() || t.symbol || '',
      exchange:    t.exchange === 10 ? 'NSE' : t.exchange === 11 ? 'NSE FO' : 'BSE',
      side:        t.side === 1 ? 'buy' : 'sell',
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.pl),
      date:        parseDate(t.orderDateTime),
      time:        parseTime(t.orderDateTime),
      orderId:     t.orderNum || '',
      tradeId:     t.id || '',
      productType: t.productType === 1 ? 'CNC' : t.productType === 2 ? 'INTRADAY' : 'MARGIN',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── UPSTOX ──────────────────────────────────────────────────────────────────
// Fields: trade_id, order_id, instrument_token, trading_symbol, exchange,
//         transaction_type, quantity, average_price, trade_date, product
export function mapUpstox(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.quantity);
    const price = toNum(t.average_price);
    return {
      id:          `upstox_${t.trade_id || Math.random()}`,
      broker:      'Upstox',
      brokerId,
      symbol:      t.trading_symbol || t.tradingsymbol || '',
      exchange:    t.exchange || 'NSE',
      side:        normalizeSide(t.transaction_type),
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.pnl || t.p_and_l),
      date:        parseDate(t.trade_date),
      time:        parseTime(t.trade_date),
      orderId:     t.order_id || '',
      tradeId:     t.trade_id || '',
      productType: t.product || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── ZERODHA ─────────────────────────────────────────────────────────────────
// Fields: trade_id, order_id, tradingsymbol, exchange, transaction_type,
//         product, quantity, average_price, fill_timestamp
export function mapZerodha(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.quantity);
    const price = toNum(t.average_price);
    return {
      id:          `zerodha_${t.trade_id || Math.random()}`,
      broker:      'Zerodha (Kite)',
      brokerId,
      symbol:      t.tradingsymbol || '',
      exchange:    t.exchange || 'NSE',
      side:        normalizeSide(t.transaction_type),
      qty,
      price,
      amount:      qty * price,
      pnl:         0,
      date:        parseDate(t.fill_timestamp),
      time:        parseTime(t.fill_timestamp),
      orderId:     t.order_id || '',
      tradeId:     t.trade_id || '',
      productType: t.product || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── SHOONYA / FLATTRADE (same schema) ───────────────────────────────────────
// Fields: norenordno, tsym, exch, trantype, qty, flprc, fltime, prd
export function mapShoonya(raw, brokerId, brokerName) {
  return raw.map(t => {
    const qty   = toNum(t.qty || t.flqty);
    const price = toNum(t.flprc);
    return {
      id:          `${brokerId}_${t.norenordno || Math.random()}`,
      broker:      brokerName,
      brokerId,
      symbol:      t.tsym || '',
      exchange:    t.exch || 'NSE',
      side:        t.trantype === 'B' ? 'buy' : 'sell',
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.rpnl || t.pnl),
      date:        parseDate(t.exch_tm || t.fltime),
      time:        parseTime(t.exch_tm || t.fltime),
      orderId:     t.norenordno || '',
      tradeId:     t.fillid || '',
      productType: t.prd || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── ICICI BREEZE ────────────────────────────────────────────────────────────
// Fields: stock_code, exchange_code, action, quantity, price, trade_date, order_id
export function mapICICI(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.quantity);
    const price = toNum(t.price);
    return {
      id:          `icici_${t.order_id || Math.random()}`,
      broker:      'ICICI Direct (Breeze)',
      brokerId,
      symbol:      t.stock_code || '',
      exchange:    t.exchange_code || 'NSE',
      side:        normalizeSide(t.action),
      qty,
      price,
      amount:      qty * price,
      pnl:         0,
      date:        parseDate(t.trade_date),
      time:        parseTime(t.trade_date),
      orderId:     t.order_id || '',
      tradeId:     t.trade_id || t.order_id || '',
      productType: t.product_type || '',
      market:      'indian',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── BINANCE ─────────────────────────────────────────────────────────────────
// Fields: symbol, id, orderId, price, qty, isBuyer, time, commission
export function mapBinance(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.qty);
    const price = toNum(t.price);
    return {
      id:          `binance_${t.id || Math.random()}`,
      broker:      'Binance',
      brokerId,
      symbol:      t.symbol || '',
      exchange:    'CRYPTO',
      side:        t.isBuyer ? 'buy' : 'sell',
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.realizedPnl),
      date:        parseDate(t.time ? new Date(t.time).toISOString() : null),
      time:        parseTime(t.time ? new Date(t.time).toISOString() : null),
      orderId:     String(t.orderId || ''),
      tradeId:     String(t.id || ''),
      productType: 'SPOT',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── BYBIT ───────────────────────────────────────────────────────────────────
// Fields: symbol, side, execId, orderId, execPrice, execQty, execTime
export function mapBybit(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.execQty);
    const price = toNum(t.execPrice);
    return {
      id:          `bybit_${t.execId || Math.random()}`,
      broker:      'Bybit',
      brokerId,
      symbol:      t.symbol || '',
      exchange:    'CRYPTO',
      side:        normalizeSide(t.side),
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.closedPnl),
      date:        parseDate(t.execTime ? new Date(Number(t.execTime)).toISOString() : null),
      time:        parseTime(t.execTime ? new Date(Number(t.execTime)).toISOString() : null),
      orderId:     t.orderId || '',
      tradeId:     t.execId || '',
      productType: t.orderType || 'SPOT',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── ALPACA ──────────────────────────────────────────────────────────────────
// Fields: id, symbol, side, qty, price, transaction_time, order_id
export function mapAlpaca(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.qty || t.filled_qty);
    const price = toNum(t.price || t.filled_avg_price);
    return {
      id:          `alpaca_${t.id || Math.random()}`,
      broker:      'Alpaca',
      brokerId,
      symbol:      t.symbol || '',
      exchange:    'NYSE',
      side:        normalizeSide(t.side),
      qty,
      price,
      amount:      qty * price,
      pnl:         0,
      date:        parseDate(t.transaction_time),
      time:        parseTime(t.transaction_time),
      orderId:     t.order_id || '',
      tradeId:     t.id || '',
      productType: 'EQUITY',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── KUCOIN ──────────────────────────────────────────────────────────────────
// Fields: tradeId, orderId, symbol, side, price, size, funds, createdAt
export function mapKucoin(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.size);
    const price = toNum(t.price);
    return {
      id:          `kucoin_${t.tradeId || Math.random()}`,
      broker:      'KuCoin',
      brokerId,
      symbol:      t.symbol || '',
      exchange:    'CRYPTO',
      side:        normalizeSide(t.side),
      qty,
      price,
      amount:      toNum(t.funds) || qty * price,
      pnl:         0,
      date:        parseDate(t.createdAt ? new Date(t.createdAt).toISOString() : null),
      time:        parseTime(t.createdAt ? new Date(t.createdAt).toISOString() : null),
      orderId:     t.orderId || '',
      tradeId:     t.tradeId || '',
      productType: 'SPOT',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── OKX ─────────────────────────────────────────────────────────────────────
// Fields: billId, instId, side, sz, px, ts, ordId
export function mapOKX(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.sz || t.fillSz);
    const price = toNum(t.px || t.fillPx);
    return {
      id:          `okx_${t.billId || t.tradeId || Math.random()}`,
      broker:      'OKX',
      brokerId,
      symbol:      t.instId || '',
      exchange:    'CRYPTO',
      side:        normalizeSide(t.side),
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.pnl),
      date:        parseDate(t.ts ? new Date(Number(t.ts)).toISOString() : null),
      time:        parseTime(t.ts ? new Date(Number(t.ts)).toISOString() : null),
      orderId:     t.ordId || '',
      tradeId:     t.billId || t.tradeId || '',
      productType: t.instType || 'SPOT',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── EXNESS ──────────────────────────────────────────────────────────────────
// Fields: ticket, symbol, type, lots, open_price, close_price, profit, open_time
export function mapExness(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.lots || t.volume);
    const price = toNum(t.open_price);
    return {
      id:          `exness_${t.ticket || Math.random()}`,
      broker:      'Exness',
      brokerId,
      symbol:      t.symbol || '',
      exchange:    'FOREX',
      side:        t.type === 0 ? 'buy' : 'sell',
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.profit),
      date:        parseDate(t.open_time || t.close_time),
      time:        parseTime(t.open_time || t.close_time),
      orderId:     String(t.ticket || ''),
      tradeId:     String(t.ticket || ''),
      productType: 'FOREX',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── IBKR ────────────────────────────────────────────────────────────────────
// Fields: execution_id, symbol, side, size, price, time, order_ref
export function mapIBKR(raw, brokerId) {
  return raw.map(t => {
    const qty   = toNum(t.size || t.shares);
    const price = toNum(t.price);
    return {
      id:          `ibkr_${t.execution_id || Math.random()}`,
      broker:      'Interactive Brokers',
      brokerId,
      symbol:      t.symbol || t.contract?.symbol || '',
      exchange:    t.exchange || 'NYSE',
      side:        normalizeSide(t.side),
      qty,
      price,
      amount:      qty * price,
      pnl:         toNum(t.realized_pnl),
      date:        parseDate(t.time),
      time:        parseTime(t.time),
      orderId:     t.order_ref || '',
      tradeId:     t.execution_id || '',
      productType: 'EQUITY',
      market:      'foreign',
      source:      'broker-api',
      importedAt:  now(),
      raw:         t,
    };
  });
}

// ─── MASTER DISPATCHER ───────────────────────────────────────────────────────
/**
 * mapBrokerTrades(brokerId, rawTrades) → NormalizedTrade[]
 * Call this after fetchBrokerTrades() to get RuleBook-compatible trades.
 */
export function mapBrokerTrades(brokerId, rawTrades) {
  if (!Array.isArray(rawTrades) || rawTrades.length === 0) return [];

  switch (brokerId) {
    case 'dhan':      return mapDhan(rawTrades, brokerId);
    case 'angel':     return mapAngel(rawTrades, brokerId);
    case 'fyers':     return mapFyers(rawTrades, brokerId);
    case 'upstox':    return mapUpstox(rawTrades, brokerId);
    case 'zerodha':   return mapZerodha(rawTrades, brokerId);
    case 'shoonya':   return mapShoonya(rawTrades, brokerId, 'Shoonya');
    case 'flattrade': return mapShoonya(rawTrades, brokerId, 'Flattrade');
    case 'icici':     return mapICICI(rawTrades, brokerId);
    case 'binance':   return mapBinance(rawTrades, brokerId);
    case 'bybit':     return mapBybit(rawTrades, brokerId);
    case 'alpaca':    return mapAlpaca(rawTrades, brokerId);
    case 'kucoin':    return mapKucoin(rawTrades, brokerId);
    case 'okx':       return mapOKX(rawTrades, brokerId);
    case 'exness':    return mapExness(rawTrades, brokerId);
    case 'ibkr':      return mapIBKR(rawTrades, brokerId);
    default:          return rawTrades.map((t, i) => ({ id: `${brokerId}_${i}`, broker: brokerId, source: 'broker-api', importedAt: now(), ...t }));
  }
}

/**
 * deduplicateTrades(existing, incoming) → merged[]
 * Avoids re-importing trades that already exist (matched by tradeId or orderId).
 */
export function deduplicateTrades(existing = [], incoming = []) {
  const knownIds = new Set([
    ...existing.map(t => t.tradeId).filter(Boolean),
    ...existing.map(t => t.id).filter(Boolean),
  ]);
  return incoming.filter(t => !knownIds.has(t.tradeId) && !knownIds.has(t.id));
}