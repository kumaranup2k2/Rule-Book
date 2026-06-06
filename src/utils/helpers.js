// src/utils/helpers.js
// Pure utility functions — no business logic lives in UI components

import { useState, useEffect } from 'react';

// Re-export everything from csvImport so callers only need to import from here
export {
  parseCSV,
  parseCSVSimple,
  formatImportSummary,
} from './csvImport';

/* ─────────────────────────────────────────────────────────────────────
   MARKET CONFIG
───────────────────────────────────────────────────────────────────── */
const INDIAN_MARKET_OPEN  = '09:15';
const INDIAN_MARKET_CLOSE = '15:30';
const GLOBAL_MARKET_OPEN  = '00:00'; // Forex/Crypto 24h

/* ─────────────────────────────────────────────────────────────────────
   TIME HELPERS
───────────────────────────────────────────────────────────────────── */
const timeToMin = (t) => {
  const p = String(t || '00:00').split(':').map(Number);
  return (p[0] || 0) * 60 + (p[1] || 0);
};

const minToTime = (m) => {
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${h}:${mm}`;
};

const isTimeBetween = (time, start, end) => {
  const t = timeToMin(time);
  const s = timeToMin(start);
  const e = timeToMin(end);
  return t >= s && t <= e;
};

/* ═══════════════════════════════════════════════════════════════════════
   ██████╗  ███████╗████████╗███████╗ ██████╗████████╗
   ██╔══██╗ ██╔════╝╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝
   ██║  ██║ █████╗     ██║   █████╗  ██║        ██║
   ██║  ██║ ██╔══╝     ██║   ██╔══╝  ██║        ██║
   ██████╔╝ ███████╗   ██║   ███████╗╚██████╗   ██║
   ╚═════╝  ╚══════╝   ╚═╝   ╚══════╝ ╚═════╝   ╚═╝
   MISTAKE DETECTION ENGINE
   ───────────────────────────────────────────────────
   detectMistakes(trade, context?) → string[]
   
   Supports Indian market (NSE/BSE/MCX) and Global market
   (Forex, Crypto, US Stocks).
   
   Context object (all optional):
     allTrades    - all trades in journal (for sequence analysis)
     tradeIndex   - index of current trade in allTrades
     avgLoss      - average loss amount (for large-loss detection)
     avgWin       - average win amount
     tradesOnDate - all trades on the same date (for overtrading)
═══════════════════════════════════════════════════════════════════════ */

export function detectMistakes(trade, context = {}) {
  const mistakes = [];
  const {
    allTrades    = [],
    tradeIndex   = -1,
    avgLoss      = 0,
    avgWin       = 0,
    tradesOnDate = [],
  } = context;

  const market      = trade.market || 'indian';
  const isIndian    = market === 'indian';
  const entryMin    = timeToMin(trade.entryTime  || trade.time || '00:00');
  const exitMin     = timeToMin(trade.exitTime   || '00:00');
  const pnl         = Number(trade.pnl ?? 0);
  const entryPrice  = Number(trade.entryPrice  ?? trade.entry   ?? 0);
  const exitPrice   = Number(trade.exitPrice   ?? trade.exit    ?? 0);
  const stopLoss    = Number(trade.stopLoss    ?? trade.sl      ?? 0);
  const target      = Number(trade.target      ?? trade.tp      ?? 0);
  const quantity    = Number(trade.quantity    ?? trade.qty     ?? trade.lots ?? 0);
  const direction   = (trade.direction || trade.side || '').toUpperCase();
  const isLong      = direction === 'LONG'  || direction === 'BUY';
  const isShort     = direction === 'SHORT' || direction === 'SELL';

  /* ── 1. NO STOP LOSS ─────────────────────────────────────────── */
  // If stop loss is missing or zero, it's a clear risk management failure
  if (!stopLoss || stopLoss === 0) {
    mistakes.push('No Stop Loss');
  }

  /* ── 2. STOP LOSS MOVED / WIDENED ───────────────────────────── */
  // If actual loss is > 2× (avgLoss or expected SL-based loss), SL was likely moved
  if (stopLoss && pnl < 0 && avgLoss > 0) {
    const expectedMaxLoss = Math.abs(
      isLong
        ? (entryPrice - stopLoss) * quantity
        : (stopLoss - entryPrice) * quantity
    );
    const actualLoss = Math.abs(pnl);
    // If actual loss is more than 1.8× expected max loss → SL was moved wider
    if (expectedMaxLoss > 0 && actualLoss > expectedMaxLoss * 1.8) {
      mistakes.push('Moved SL');
    }
  }

  /* ── 3. EARLY EXIT (Left money on the table) ─────────────────── */
  // Exited with profit but well before target was hit
  if (target && pnl > 0 && entryPrice && exitPrice) {
    const totalMove = isLong
      ? (target - entryPrice)
      : (entryPrice - target);
    const achievedMove = isLong
      ? (exitPrice - entryPrice)
      : (entryPrice - exitPrice);
    // If only captured < 40% of the target move → Early Exit
    if (totalMove > 0 && achievedMove / totalMove < 0.4) {
      mistakes.push('Early Exit');
    }
  }

  /* ── 4. LATE ENTRY ───────────────────────────────────────────── */
  // Indian: Entered after 14:30 (too close to close, low time for trade to work)
  // Global: Entry in last 10% of your preferred session
  if (isIndian && entryMin >= timeToMin('14:30') && entryMin < timeToMin('15:30')) {
    mistakes.push('Late Entry');
  }
  // Global: Entered during NY session close (21:30–22:00 IST / 16:00–16:30 EST)
  if (!isIndian && isTimeBetween(trade.entryTime, '21:30', '22:00')) {
    mistakes.push('Late Entry');
  }

  /* ── 5. REVENGE TRADE ────────────────────────────────────────── */
  // Current trade made within 15 min of a losing trade, AND this trade also lost
  if (tradeIndex > 0 && allTrades.length > 0) {
    const prevTrade = allTrades[tradeIndex - 1];
    if (prevTrade && prevTrade.pnl < 0 && prevTrade.date === trade.date) {
      const prevExitMin = timeToMin(prevTrade.exitTime || prevTrade.time || '00:00');
      const gap = entryMin - prevExitMin;
      if (gap >= 0 && gap <= 15) {
        mistakes.push('Revenge Trade');
      }
    }
  }
  // Also flag from emotion field
  if ((trade.emotion || '').toLowerCase() === 'revenge') {
    if (!mistakes.includes('Revenge Trade')) mistakes.push('Revenge Trade');
  }

  /* ── 6. OVERSIZE POSITION ────────────────────────────────────── */
  // If single trade loss > 3% of capital, or if loss > 3× avgLoss
  if (pnl < 0 && avgLoss > 0 && Math.abs(pnl) > avgLoss * 3) {
    mistakes.push('Oversize Position');
  }
  // Capital-based check if capital is available
  if (trade.capital && pnl < 0) {
    const lossPercent = (Math.abs(pnl) / trade.capital) * 100;
    if (lossPercent > 3) {
      if (!mistakes.includes('Oversize Position')) mistakes.push('Oversize Position');
    }
  }

  /* ── 7. IGNORED PLAN / BROKE RULES ──────────────────────────── */
  if (
    trade.ruleFollowed === 'Broke Rules' ||
    (trade.mistakes || []).includes('Ignored Plan')
  ) {
    mistakes.push('Ignored Plan');
  }

  /* ── 8. CHASED PRICE ─────────────────────────────────────────── */
  // Entry price significantly worse than expected (slippage > 0.5% for Indian, 0.2% for crypto)
  if (trade.plannedEntry && entryPrice) {
    const slippagePct = Math.abs((entryPrice - trade.plannedEntry) / trade.plannedEntry) * 100;
    const threshold = isIndian ? 0.5 : 0.3;
    if (slippagePct > threshold) {
      mistakes.push('Chased Price');
    }
  }
  // If direction is LONG and entry is significantly above open, likely chased
  if (isIndian && trade.open && isLong) {
    const gapFromOpen = ((entryPrice - trade.open) / trade.open) * 100;
    if (gapFromOpen > 1.5) mistakes.push('Chased Price');
  }

  /* ── 9. FOMO ENTRY ───────────────────────────────────────────── */
  // Emotion was FOMO, or entry was during high-velocity move (no setup)
  if ((trade.emotion || '').toLowerCase() === 'fomo') {
    mistakes.push('FOMO Entry');
  }
  // Indian: First 5 minutes of market open (9:15–9:20) without a gap strategy
  if (isIndian && isTimeBetween(trade.entryTime, '09:15', '09:20')) {
    const setup = (trade.setup || trade.strategy || '').toLowerCase();
    const isGapStrategy = setup.includes('gap') || setup.includes('9:20') || setup.includes('920');
    if (!isGapStrategy) {
      if (!mistakes.includes('FOMO Entry')) mistakes.push('FOMO Entry');
    }
  }

  /* ── 10. NO SETUP / RANDOM TRADE ────────────────────────────── */
  if (
    !trade.setup && !trade.strategy ||
    (trade.setup || '').toLowerCase() === 'none' ||
    (trade.setup || '').toLowerCase() === 'random' ||
    (trade.setup || '').toLowerCase() === 'no setup'
  ) {
    mistakes.push('No Setup');
  }

  /* ── 11. OVERTRADING ─────────────────────────────────────────── */
  // Indian: More than 5 trades on same day
  // Global (Forex/Crypto): More than 8 trades on same day
  const maxTradesPerDay = isIndian ? 5 : 8;
  if (tradesOnDate.length > maxTradesPerDay) {
    mistakes.push('Overtrading');
  }

  /* ── 12. TRADING DURING NEWS / HIGH-IMPACT EVENT ────────────── */
  // If user flagged it in notes or tags
  if (
    (trade.notes || '').toLowerCase().includes('news') &&
    !['news play', 'news trade'].includes((trade.setup || '').toLowerCase())
  ) {
    mistakes.push('Traded During News');
  }

  /* ── 13. HOLDING OVERNIGHT WITHOUT PLAN (Indian) ─────────────── */
  // Exit date != entry date but trade was tagged as Intraday
  if (
    isIndian &&
    trade.entryDate && trade.exitDate &&
    trade.entryDate !== trade.exitDate &&
    (trade.tradeType || '').toLowerCase() === 'intraday'
  ) {
    mistakes.push('Held Overnight');
  }

  /* ── 14. NO TARGET SET ───────────────────────────────────────── */
  if (!target || target === 0) {
    mistakes.push('No Target Set');
  }

  /* ── 15. POOR RISK-REWARD (< 1:1) ───────────────────────────── */
  if (stopLoss && target && entryPrice) {
    const risk   = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(target - entryPrice);
    if (risk > 0 && reward / risk < 1) {
      mistakes.push('Poor Risk-Reward');
    }
  }

  /* ── 16. AVERAGING DOWN ON A LOSER ──────────────────────────── */
  // Multiple entries on same script, same direction, price moving against
  if (tradeIndex > 0 && allTrades.length > 0) {
    const sameScriptPrevTrades = allTrades
      .slice(0, tradeIndex)
      .filter(t => t.script === trade.script && t.date === trade.date && t.direction === direction);
    if (sameScriptPrevTrades.length > 0) {
      const lastEntry = sameScriptPrevTrades[sameScriptPrevTrades.length - 1];
      const avgingDown =
        (isLong  && entryPrice < Number(lastEntry.entryPrice ?? lastEntry.entry ?? 0)) ||
        (isShort && entryPrice > Number(lastEntry.entryPrice ?? lastEntry.entry ?? 0));
      if (avgingDown) mistakes.push('Averaging Down');
    }
  }

  /* ── 17. MISSED EXIT AT TARGET (Let winner become loser) ─────── */
  if (target && pnl < 0 && trade.highPrice && isLong) {
    if (Number(trade.highPrice) >= target) {
      mistakes.push('Missed Exit at Target');
    }
  }
  if (target && pnl < 0 && trade.lowPrice && isShort) {
    if (Number(trade.lowPrice) <= target) {
      mistakes.push('Missed Exit at Target');
    }
  }

  /* ── 18. TRADED IN FIRST 5 MIN WITHOUT STRATEGY (Indian) ─────── */
  // Covered in FOMO check above for 9:15–9:20. Extra check for MCX opening (9:00–9:05)
  if (isIndian && isTimeBetween(trade.entryTime, '09:00', '09:05')) {
    const setup = (trade.setup || trade.strategy || '').toLowerCase();
    if (!setup.includes('opening') && !setup.includes('gap')) {
      if (!mistakes.includes('FOMO Entry')) mistakes.push('FOMO Entry');
    }
  }

  /* ── 19. GLOBAL: TRADING LOW-LIQUIDITY HOURS ─────────────────── */
  // Forex/Crypto: Trading between 00:00–05:00 IST (dead zone, high spread)
  if (!isIndian && isTimeBetween(trade.entryTime, '00:00', '05:00')) {
    mistakes.push('Low Liquidity Session');
  }

  /* ── 20. GLOBAL: OVERLEVERAGED (Crypto/Forex) ────────────────── */
  if (!isIndian && trade.leverage && Number(trade.leverage) > 10) {
    mistakes.push('Overleveraged');
  }

  /* ── Return unique mistakes, or ['None'] if clean ─────────────── */
  const unique = [...new Set(mistakes)];
  return unique.length ? unique : ['None'];
}

/* ═══════════════════════════════════════════════════════════════════════
   ███████╗████████╗██████╗  █████╗ ████████╗███████╗ ██████╗██╗   ██╗
   ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝╚██╗ ██╔╝
   ███████╗   ██║   ██████╔╝███████║   ██║   █████╗  ██║      ╚████╔╝
   ╚════██║   ██║   ██╔══██╗██╔══██║   ██║   ██╔══╝  ██║       ╚██╔╝
   ███████║   ██║   ██║  ██║██║  ██║   ██║   ███████╗╚██████╗   ██║
   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝   ╚═╝
   STRATEGY ASSIGNMENT ENGINE
   ───────────────────────────────────────────────────────────────────
   assignStrategy(trade) → string
   
   Priority order:
     1. Explicit strategy/setup field from user
     2. Time-based detection (Indian market sessions)
     3. Time-based detection (Global market sessions)
     4. Price-action pattern detection
     5. Fallback → 'Manual Trade'
═══════════════════════════════════════════════════════════════════════ */

/* ── All known strategy labels ──────────────────────────────────── */
export const STRATEGY_MAP = {
  // ── Indian Market Time-Based ──────────────────────────────────
  OPENING_RANGE_BREAKOUT : 'Opening Range Breakout (ORB)',
  NINE_TWENTY             : '9:20 Strategy',
  NINE_FIFTEEN_TRAP       : '9:15 Trap',
  VWAP_MORNING            : 'VWAP Morning Bounce',
  THREE_PM_REVERSAL       : '3 PM Reversal',
  POWER_HOUR              : 'Power Hour (2:30–3:30)',
  NOON_CONSOLIDATION      : 'Noon Consolidation Break',
  EXPIRY_DAY              : 'Expiry Day Strategy',
  GAP_UP_FADE             : 'Gap Up Fade',
  GAP_DOWN_FADE           : 'Gap Down Fade',
  GAP_AND_GO              : 'Gap and Go',
  BNF_SCALP               : 'BankNifty Scalp',
  NIFTY_SCALP             : 'Nifty Scalp',
  OPTION_BUYING           : 'Option Buying',
  OPTION_SELLING          : 'Option Selling',
  STRADDLE                : 'Straddle / Strangle',
  BTST                    : 'BTST (Buy Today Sell Tomorrow)',
  SWING_INDIAN            : 'Swing Trade',
  POSITIONAL              : 'Positional Trade',
  // ── Global Market (Forex / Crypto / US Stocks) ────────────────
  LONDON_BREAKOUT         : 'London Breakout',
  NY_OPEN                 : 'New York Open Strategy',
  ASIAN_RANGE             : 'Asian Session Range',
  KILL_ZONE_LONDON        : 'London Kill Zone',
  KILL_ZONE_NY            : 'New York Kill Zone',
  ICT_SMC                 : 'ICT / SMC Setup',
  ORDER_BLOCK             : 'Order Block Reversal',
  FAIR_VALUE_GAP          : 'Fair Value Gap (FVG)',
  LIQUIDITY_SWEEP         : 'Liquidity Sweep',
  CRYPTO_BREAKOUT         : 'Crypto Breakout',
  DCA                     : 'Dollar Cost Averaging',
  MEAN_REVERSION          : 'Mean Reversion',
  TREND_FOLLOW            : 'Trend Following',
  SCALP                   : 'Scalp Trade',
  // ── Universal / Price Action ──────────────────────────────────
  BREAKOUT                : 'Breakout',
  BREAKDOWN               : 'Breakdown',
  REVERSAL                : 'Reversal',
  SUPPORT_BOUNCE          : 'Support Bounce',
  RESISTANCE_REJECTION    : 'Resistance Rejection',
  RANGE_TRADE             : 'Range Trade',
  MOMENTUM                : 'Momentum Trade',
  NEWS_PLAY               : 'News Play',
  PULLBACK                : 'Pullback / Retracement',
  DOUBLE_BOTTOM           : 'Double Bottom',
  DOUBLE_TOP              : 'Double Top',
  HEAD_SHOULDERS          : 'Head & Shoulders',
  MANUAL                  : 'Manual Trade',
};

export function assignStrategy(trade) {
  const market  = trade.market || 'indian';
  const isIndian = market === 'indian';

  /* ── Step 1: Honour explicit user input ──────────────────────── */
  const explicit = (trade.strategy || trade.setup || '').trim();
  if (explicit && explicit.toLowerCase() !== 'manual' && explicit.toLowerCase() !== 'none') {
    return explicit; // Return as-is; user knows best
  }

  const entryMin = timeToMin(trade.entryTime || trade.time || '');
  const exitMin  = timeToMin(trade.exitTime || '');
  const script   = (trade.script || trade.symbol || '').toUpperCase();
  const notes    = (trade.notes  || '').toLowerCase();
  const direction = (trade.direction || trade.side || '').toUpperCase();
  const tradeType = (trade.tradeType || '').toLowerCase();

  /* ── Step 2: Expiry / derivative type detection ───────────────── */
  const isOption  = /\d{2}[A-Z]{3}\d{2,4}[CP]E?/.test(script) ||
                    (trade.instrumentType || '').toLowerCase().includes('option');
  const isFutures = (trade.instrumentType || '').toLowerCase().includes('future');

  /* ──────────────────────────────────────────────────────────────
     INDIAN MARKET STRATEGIES
  ────────────────────────────────────────────────────────────── */
  if (isIndian) {

    // ── Expiry day (Thursday for Nifty/BNF, Friday for Sensex) ──
    if (trade.date) {
      const dow = new Date(trade.date).getDay();
      if ((dow === 4 || dow === 5) && isOption) {
        // Straddle/Strangle pattern: both CE and PE in notes or tags
        if (notes.includes('straddle') || notes.includes('strangle') || notes.includes('iron condor')) {
          return STRATEGY_MAP.STRADDLE;
        }
        return STRATEGY_MAP.EXPIRY_DAY;
      }
    }

    // ── 9:15 Trap (First candle trap / false breakout) ───────────
    if (isTimeBetween(trade.entryTime, '09:15', '09:16')) {
      if (notes.includes('trap') || notes.includes('false')) return STRATEGY_MAP.NINE_FIFTEEN_TRAP;
    }

    // ── 9:20 Strategy (Wait for first 5-min candle to form) ──────
    if (isTimeBetween(trade.entryTime, '09:20', '09:22')) {
      return STRATEGY_MAP.NINE_TWENTY;
    }

    // ── Opening Range Breakout (first 15-min ORB: 9:15–9:30) ────
    if (isTimeBetween(trade.entryTime, '09:15', '09:32')) {
      if (notes.includes('orb') || notes.includes('opening range') || notes.includes('breakout')) {
        return STRATEGY_MAP.OPENING_RANGE_BREAKOUT;
      }
      // If gap detected: Gap and Go or Gap Fade
      if (trade.gapPercent) {
        const gap = Number(trade.gapPercent);
        if (gap > 0.5) {
          return direction === 'LONG' ? STRATEGY_MAP.GAP_AND_GO : STRATEGY_MAP.GAP_UP_FADE;
        }
        if (gap < -0.5) {
          return direction === 'SHORT' ? STRATEGY_MAP.GAP_AND_GO : STRATEGY_MAP.GAP_DOWN_FADE;
        }
      }
      return STRATEGY_MAP.OPENING_RANGE_BREAKOUT; // Default for early entries
    }

    // ── Gap Up Fade (Short a gap-up that fails to sustain) ───────
    if (
      trade.gapPercent && Number(trade.gapPercent) > 0.5 &&
      direction === 'SHORT' &&
      isTimeBetween(trade.entryTime, '09:15', '10:00')
    ) {
      return STRATEGY_MAP.GAP_UP_FADE;
    }

    // ── Gap Down Fade (Long a gap-down reversal) ──────────────────
    if (
      trade.gapPercent && Number(trade.gapPercent) < -0.5 &&
      direction === 'LONG' &&
      isTimeBetween(trade.entryTime, '09:15', '10:00')
    ) {
      return STRATEGY_MAP.GAP_DOWN_FADE;
    }

    // ── Gap and Go (Trade in direction of gap) ────────────────────
    if (
      trade.gapPercent && Math.abs(Number(trade.gapPercent)) > 0.5 &&
      isTimeBetween(trade.entryTime, '09:15', '10:00') &&
      (
        (Number(trade.gapPercent) > 0 && direction === 'LONG') ||
        (Number(trade.gapPercent) < 0 && direction === 'SHORT')
      )
    ) {
      return STRATEGY_MAP.GAP_AND_GO;
    }

    // ── VWAP Morning Bounce (09:30–11:00) ────────────────────────
    if (
      isTimeBetween(trade.entryTime, '09:30', '11:00') &&
      (notes.includes('vwap') || notes.includes('v-wap'))
    ) {
      return STRATEGY_MAP.VWAP_MORNING;
    }

    // ── Noon Consolidation Break (12:00–13:30) ───────────────────
    if (isTimeBetween(trade.entryTime, '12:00', '13:30')) {
      if (notes.includes('consolidat') || notes.includes('range') || notes.includes('squeeze')) {
        return STRATEGY_MAP.NOON_CONSOLIDATION;
      }
    }

    // ── 3 PM Reversal (14:45–15:15) ──────────────────────────────
    // Classic Indian market reversal / trend exhaustion at day end
    if (isTimeBetween(trade.entryTime, '14:45', '15:15')) {
      if (notes.includes('reversal') || notes.includes('3pm') || notes.includes('close')) {
        return STRATEGY_MAP.THREE_PM_REVERSAL;
      }
    }

    // ── Power Hour (14:30–15:30) ──────────────────────────────────
    if (isTimeBetween(trade.entryTime, '14:30', '15:30')) {
      return STRATEGY_MAP.POWER_HOUR;
    }

    // ── BankNifty Scalp ───────────────────────────────────────────
    if (
      (script.includes('BANKNIFTY') || script.includes('BNF') || script.includes('BANKNI')) &&
      tradeType === 'intraday'
    ) {
      return STRATEGY_MAP.BNF_SCALP;
    }

    // ── Nifty Scalp ───────────────────────────────────────────────
    if (
      (script.includes('NIFTY') && !script.includes('BANK') && !script.includes('MIDCAP')) &&
      tradeType === 'intraday'
    ) {
      return STRATEGY_MAP.NIFTY_SCALP;
    }

    // ── Option Strategies ─────────────────────────────────────────
    if (isOption) {
      if (notes.includes('straddle') || notes.includes('strangle') || notes.includes('iron condor')) {
        return STRATEGY_MAP.STRADDLE;
      }
      if (direction === 'SHORT' || notes.includes('sell') || notes.includes('write') || notes.includes('premium')) {
        return STRATEGY_MAP.OPTION_SELLING;
      }
      return STRATEGY_MAP.OPTION_BUYING;
    }

    // ── BTST ──────────────────────────────────────────────────────
    if (tradeType === 'btst' || notes.includes('btst') || notes.includes('buy today sell tomorrow')) {
      return STRATEGY_MAP.BTST;
    }

    // ── Swing ─────────────────────────────────────────────────────
    if (tradeType === 'swing' || tradeType === 'swing trade') {
      return STRATEGY_MAP.SWING_INDIAN;
    }

    // ── Positional ────────────────────────────────────────────────
    if (tradeType === 'positional' || tradeType === 'delivery') {
      return STRATEGY_MAP.POSITIONAL;
    }
  }

  /* ──────────────────────────────────────────────────────────────
     GLOBAL MARKET STRATEGIES (Forex / Crypto / US Stocks)
  ────────────────────────────────────────────────────────────── */
  if (!isIndian) {

    // ── Asian Session Range (02:30–08:30 IST) ────────────────────
    if (isTimeBetween(trade.entryTime, '02:30', '08:30')) {
      if (notes.includes('range') || notes.includes('asian')) {
        return STRATEGY_MAP.ASIAN_RANGE;
      }
    }

    // ── London Kill Zone / London Breakout (11:00–13:00 IST) ─────
    if (isTimeBetween(trade.entryTime, '11:00', '12:30')) {
      if (notes.includes('kill zone') || notes.includes('killzone')) {
        return STRATEGY_MAP.KILL_ZONE_LONDON;
      }
      if (notes.includes('breakout') || notes.includes('london')) {
        return STRATEGY_MAP.LONDON_BREAKOUT;
      }
      return STRATEGY_MAP.LONDON_BREAKOUT; // Default for London open entries
    }

    // ── New York Kill Zone (18:00–20:00 IST) ─────────────────────
    if (isTimeBetween(trade.entryTime, '18:00', '20:00')) {
      if (notes.includes('kill zone') || notes.includes('killzone')) {
        return STRATEGY_MAP.KILL_ZONE_NY;
      }
      if (notes.includes('new york') || notes.includes('ny open') || notes.includes('us open')) {
        return STRATEGY_MAP.NY_OPEN;
      }
      return STRATEGY_MAP.NY_OPEN;
    }

    // ── ICT / Smart Money Concepts ────────────────────────────────
    if (
      notes.includes('ict') || notes.includes('smc') ||
      notes.includes('smart money') || notes.includes('inducement') ||
      notes.includes('msb') || notes.includes('choch') || notes.includes('bos')
    ) {
      return STRATEGY_MAP.ICT_SMC;
    }

    // ── Order Block ───────────────────────────────────────────────
    if (notes.includes('order block') || notes.includes('ob') || notes.includes('breaker')) {
      return STRATEGY_MAP.ORDER_BLOCK;
    }

    // ── Fair Value Gap ────────────────────────────────────────────
    if (notes.includes('fvg') || notes.includes('fair value gap') || notes.includes('imbalance')) {
      return STRATEGY_MAP.FAIR_VALUE_GAP;
    }

    // ── Liquidity Sweep ───────────────────────────────────────────
    if (
      notes.includes('liquidity') || notes.includes('sweep') ||
      notes.includes('stop hunt') || notes.includes('raid')
    ) {
      return STRATEGY_MAP.LIQUIDITY_SWEEP;
    }

    // ── Crypto Breakout ───────────────────────────────────────────
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'MATIC', 'AVAX'];
    if (
      cryptoSymbols.some(s => script.includes(s)) &&
      notes.includes('breakout')
    ) {
      return STRATEGY_MAP.CRYPTO_BREAKOUT;
    }

    // ── DCA ───────────────────────────────────────────────────────
    if (notes.includes('dca') || notes.includes('dollar cost') || tradeType === 'dca') {
      return STRATEGY_MAP.DCA;
    }
  }

  /* ──────────────────────────────────────────────────────────────
     UNIVERSAL / PRICE ACTION STRATEGIES (Both Markets)
  ────────────────────────────────────────────────────────────── */

  // ── News Play ─────────────────────────────────────────────────
  if (
    notes.includes('news') || notes.includes('result') ||
    notes.includes('earnings') || notes.includes('event') ||
    notes.includes('rbi') || notes.includes('fed') || notes.includes('fomc')
  ) {
    return STRATEGY_MAP.NEWS_PLAY;
  }

  // ── Support Bounce ────────────────────────────────────────────
  if (
    (notes.includes('support') || notes.includes('demand')) &&
    direction === 'LONG'
  ) {
    return STRATEGY_MAP.SUPPORT_BOUNCE;
  }

  // ── Resistance Rejection ──────────────────────────────────────
  if (
    (notes.includes('resistance') || notes.includes('supply')) &&
    direction === 'SHORT'
  ) {
    return STRATEGY_MAP.RESISTANCE_REJECTION;
  }

  // ── Reversal ──────────────────────────────────────────────────
  if (
    notes.includes('reversal') || notes.includes('reverse') ||
    notes.includes('v-shape') || notes.includes('exhaustion')
  ) {
    return STRATEGY_MAP.REVERSAL;
  }

  // ── Breakout ──────────────────────────────────────────────────
  if (
    notes.includes('breakout') || notes.includes('break out') ||
    notes.includes('bo ') || notes.includes('neckline')
  ) {
    return STRATEGY_MAP.BREAKOUT;
  }

  // ── Breakdown ─────────────────────────────────────────────────
  if (notes.includes('breakdown') || notes.includes('break down')) {
    return STRATEGY_MAP.BREAKDOWN;
  }

  // ── Pullback / Retracement ────────────────────────────────────
  if (
    notes.includes('pullback') || notes.includes('retracem') ||
    notes.includes('fib') || notes.includes('fibonacci')
  ) {
    return STRATEGY_MAP.PULLBACK;
  }

  // ── Double Bottom / Top ───────────────────────────────────────
  if (notes.includes('double bottom') || notes.includes('w pattern')) {
    return STRATEGY_MAP.DOUBLE_BOTTOM;
  }
  if (notes.includes('double top') || notes.includes('m pattern')) {
    return STRATEGY_MAP.DOUBLE_TOP;
  }

  // ── Head & Shoulders ──────────────────────────────────────────
  if (notes.includes('head') && notes.includes('shoulder')) {
    return STRATEGY_MAP.HEAD_SHOULDERS;
  }

  // ── Mean Reversion ────────────────────────────────────────────
  if (
    notes.includes('mean reversion') || notes.includes('overbought') ||
    notes.includes('oversold') || notes.includes('rsi extreme')
  ) {
    return STRATEGY_MAP.MEAN_REVERSION;
  }

  // ── Trend Following ───────────────────────────────────────────
  if (
    notes.includes('trend') || notes.includes('with trend') ||
    notes.includes('momentum') || notes.includes('ema cross')
  ) {
    return STRATEGY_MAP.TREND_FOLLOW;
  }

  // ── Momentum ──────────────────────────────────────────────────
  if (notes.includes('momentum') || notes.includes('surge') || notes.includes('squeeze')) {
    return STRATEGY_MAP.MOMENTUM;
  }

  // ── Range Trade ───────────────────────────────────────────────
  if (notes.includes('range') || notes.includes('sideways') || notes.includes('consolidat')) {
    return STRATEGY_MAP.RANGE_TRADE;
  }

  // ── Scalp (short hold, small target) ─────────────────────────
  if (
    tradeType === 'scalp' ||
    notes.includes('scalp') ||
    (trade.entryTime && trade.exitTime && Math.abs(exitMin - entryMin) <= 15)
  ) {
    return STRATEGY_MAP.SCALP;
  }

  return STRATEGY_MAP.MANUAL;
}

/* ─────────────────────────────────────────────────────────────────────
   STRATEGY PERFORMANCE TAGGER
   Input : net PnL of a strategy group
   Output: { performance, label, recommendation }
───────────────────────────────────────────────────────────────────── */
export function getStrategyPerformanceTag(pnl) {
  if (pnl > 0)  return {
    performance: 'profitable',
    label:       'Profitable',
    recommendation: 'Keep using this strategy. Consider increasing position size gradually.',
  };
  if (pnl < 0)  return {
    performance: 'loss-making',
    label:       'Loss-Making',
    recommendation: 'Paper trade this strategy for 2 weeks before using real capital again.',
  };
  return {
    performance: 'breakeven',
    label:       'Breakeven',
    recommendation: 'Review entries & exits. Tighten stop-loss or improve target placement.',
  };
}

/* ─────────────────────────────────────────────────────────────────────
   INSTRUMENT TYPE DETECTOR
───────────────────────────────────────────────────────────────────── */
export function detectInstrumentType(trade) {
  const script = (trade.script || trade.symbol || '').toUpperCase();
  const market = (trade.market || 'indian').toLowerCase();

  // Indian market
  if (market === 'indian') {
    if (/\d{2}[A-Z]{3}\d{2,4}[CP]E?$/.test(script)) return 'Options';
    if (script.endsWith('FUT') || (trade.instrumentType || '').toLowerCase().includes('future')) return 'Futures';
    if (['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].some(i => script.startsWith(i))) return 'Index';
    if (/^[A-Z]{2,10}$/.test(script)) return 'Equity';
    if (['GOLD', 'SILVER', 'CRUDE', 'CRUDEOIL', 'NATURALGAS', 'COPPER', 'ALUMINIUM'].some(c => script.includes(c))) return 'Commodity';
    if (script.includes('USDINR') || script.includes('EURINR') || script.includes('GBPINR')) return 'Currency';
    return 'Equity';
  }

  // Global market
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'MATIC', 'AVAX', 'USDT', 'USDC'];
  if (cryptoSymbols.some(s => script.includes(s))) return 'Crypto';
  if (script.includes('USD') || script.includes('EUR') || script.includes('GBP') || script.includes('JPY') || script.includes('AUD')) return 'Forex';
  if (['AAPL', 'TSLA', 'NVDA', 'AMZN', 'GOOG', 'META', 'MSFT', 'SPY', 'QQQ'].some(s => script.includes(s))) return 'US Stock';
  return 'Unknown';
}

/* ═══════════════════════════════════════════════════════════════════════
   STATS ENGINE
   ───────────────────────────────────────────────────────────────────
   Input  : Trade[]
   Output : StatsObject with:
     - core metrics (winRate, netPnl, PF, drawdown, etc.)
     - strategyBreakdown  — each strategy tagged profitable / loss-making
     - mistakeFrequency   — sorted mistake counts
     - dayPerformance     — Mon–Sun pnl/count
     - monthlyPnl         — YYYY-MM sorted
     - equityCurve        — running equity array
     - activeTradingDays / noTradingDays
═══════════════════════════════════════════════════════════════════════ */

export function calcStats(rawTrades = []) {
  if (!rawTrades.length) return emptyStats();

  // ── Step 1: Ensure every trade has strategy + mistakes ───────
  const trades = rawTrades.map((t, idx) => ({
    ...t,
    strategy: assignStrategy(t),
    setup:    assignStrategy(t),
  }));

  // ── Step 2: Core buckets ──────────────────────────────────────
  const wins   = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const bes    = trades.filter(t => t.pnl === 0);

  const netPnl      = trades.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const avgWin  = wins.length   ? grossProfit / wins.length   : 0;
  const avgLoss = losses.length ? grossLoss   / losses.length : 0;

  const winRate      = (wins.length / trades.length) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const expectancy   = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  const largestWin  = wins.length   ? Math.max(...wins.map(t => t.pnl))   : 0;
  const largestLoss = losses.length ? Math.min(...losses.map(t => t.pnl)) : 0;

  // ── Step 3: Drawdown ──────────────────────────────────────────
  let peak = 0, runEq = 0, maxDD = 0;
  for (const t of trades) {
    runEq += t.pnl;
    if (runEq > peak) peak = runEq;
    const dd = peak - runEq;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDrawdownPct = peak > 0 ? (maxDD / peak) * 100 : 0;

  // ── Step 4: Consecutive wins / losses ─────────────────────────
  let maxCW = 0, maxCL = 0, cw = 0, cl = 0;
  for (const t of trades) {
    if      (t.pnl > 0) { cw++; cl = 0; if (cw > maxCW) maxCW = cw; }
    else if (t.pnl < 0) { cl++; cw = 0; if (cl > maxCL) maxCL = cl; }
    else                 { cw = 0; cl = 0; }
  }

  // ── Step 5: Equity curve ──────────────────────────────────────
  let eq = 0;
  const equityCurve = trades.map(t => { eq += t.pnl; return +eq.toFixed(2); });

  // ── Step 6: Strategy breakdown ────────────────────────────────
  const strategyMap = {};
  trades.forEach(t => {
    const s = t.strategy || 'Unknown';
    if (!strategyMap[s]) strategyMap[s] = { wins: 0, losses: 0, bes: 0, pnl: 0, count: 0 };
    strategyMap[s].count++;
    strategyMap[s].pnl += t.pnl;
    if      (t.pnl > 0) strategyMap[s].wins++;
    else if (t.pnl < 0) strategyMap[s].losses++;
    else                 strategyMap[s].bes++;
  });

  const strategyBreakdown = Object.entries(strategyMap)
    .map(([name, d]) => {
      const tag = getStrategyPerformanceTag(d.pnl);
      return {
        name,
        count:            d.count,
        wins:             d.wins,
        losses:           d.losses,
        bes:              d.bes,
        pnl:              +d.pnl.toFixed(2),
        avgPnl:           d.count ? +(d.pnl / d.count).toFixed(2) : 0,
        winRate:          d.count ? +((d.wins / d.count) * 100).toFixed(1) : 0,
        profitFactor:     d.losses > 0
          ? +(d.wins * (d.pnl / d.count) / Math.abs(d.losses * (d.pnl / d.count) || 1)).toFixed(2)
          : d.pnl > 0 ? Infinity : 0,
        performance:      tag.performance,
        performanceLabel: tag.label,
        recommendation:   tag.recommendation,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);

  const profitableStrategies = strategyBreakdown.filter(s => s.performance === 'profitable');
  const lossStrategies       = strategyBreakdown.filter(s => s.performance === 'loss-making');
  const breakevenStrategies  = strategyBreakdown.filter(s => s.performance === 'breakeven');

  // ── Step 7: Mistake frequency (context-aware) ─────────────────
  const dateMap = {};
  trades.forEach(t => {
    if (!dateMap[t.date]) dateMap[t.date] = [];
    dateMap[t.date].push(t);
  });

  const mistakeMap = {};
  trades.forEach((t, idx) => {
    const contextMistakes = detectMistakes(t, {
      allTrades:    trades,
      tradeIndex:   idx,
      avgLoss,
      avgWin,
      tradesOnDate: dateMap[t.date] || [],
    });
    contextMistakes.forEach(m => {
      if (m === 'None') return;
      mistakeMap[m] = (mistakeMap[m] || 0) + 1;
    });
  });

  const mistakeFrequency = Object.entries(mistakeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Step 8: Day-of-week performance ───────────────────────────
  const DAY_KEYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayPnlMap = Object.fromEntries(DAY_KEYS.map(d => [d, 0]));
  const dayCntMap = Object.fromEntries(DAY_KEYS.map(d => [d, 0]));
  const dayWinMap = Object.fromEntries(DAY_KEYS.map(d => [d, 0]));

  trades.forEach(t => {
    if (!t.date) return;
    const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
    if (dayPnlMap[day] !== undefined) {
      dayPnlMap[day] += t.pnl;
      dayCntMap[day]++;
      if (t.pnl > 0) dayWinMap[day]++;
    }
  });

  const dayPerformance = DAY_KEYS
    .filter(day => dayCntMap[day] > 0)
    .map(day => ({
      day,
      pnl:     +dayPnlMap[day].toFixed(2),
      count:   dayCntMap[day],
      winRate: dayCntMap[day] ? +((dayWinMap[day] / dayCntMap[day]) * 100).toFixed(1) : 0,
    }));

  // ── Step 9: Monthly PnL ───────────────────────────────────────
  const monthMap = {};
  trades.forEach(t => {
    if (!t.date) return;
    const key = t.date.slice(0, 7);
    if (!monthMap[key]) monthMap[key] = { pnl: 0, trades: 0, wins: 0 };
    monthMap[key].pnl    += t.pnl;
    monthMap[key].trades++;
    if (t.pnl > 0) monthMap[key].wins++;
  });

  const monthlyPnl = Object.entries(monthMap)
    .map(([month, d]) => ({
      month,
      pnl:     +d.pnl.toFixed(2),
      trades:  d.trades,
      winRate: d.trades ? +((d.wins / d.trades) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── Step 10: Trading-day coverage ─────────────────────────────
  const uniqueDates       = [...new Set(trades.map(t => t.date))].sort();
  const activeTradingDays = uniqueDates.length;
  let   noTradingDays     = 0;

  if (uniqueDates.length > 1) {
    const start     = new Date(uniqueDates[0]);
    const end       = new Date(uniqueDates[uniqueDates.length - 1]);
    const marketEnv = trades[0]?.market || 'indian';

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow       = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      if (isWeekend && (marketEnv === 'indian' || marketEnv === 'global')) continue;
      const dStr = d.toISOString().split('T')[0];
      if (!uniqueDates.includes(dStr)) noTradingDays++;
    }
  }

  // ── Step 11: Instrument-type breakdown ────────────────────────
  const instrumentMap = {};
  trades.forEach(t => {
    const inst = t.instrumentType || detectInstrumentType(t) || 'Unknown';
    if (!instrumentMap[inst]) instrumentMap[inst] = { count: 0, pnl: 0, wins: 0 };
    instrumentMap[inst].count++;
    instrumentMap[inst].pnl += t.pnl;
    if (t.pnl > 0) instrumentMap[inst].wins++;
  });

  const instrumentBreakdown = Object.entries(instrumentMap)
    .map(([name, d]) => ({
      name,
      count:   d.count,
      pnl:     +d.pnl.toFixed(2),
      winRate: d.count ? +((d.wins / d.count) * 100).toFixed(1) : 0,
      ...getStrategyPerformanceTag(d.pnl),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // ── Final assembly ────────────────────────────────────────────
  return {
    totalTrades:       trades.length,
    winTrades:         wins.length,
    lossTrades:        losses.length,
    beTrades:          bes.length,
    netPnl:            +netPnl.toFixed(2),
    grossProfit:       +grossProfit.toFixed(2),
    grossLoss:         +grossLoss.toFixed(2),
    winRate:           +winRate.toFixed(1),
    profitFactor:      isFinite(profitFactor) ? +profitFactor.toFixed(2) : '∞',
    expectancy:        +expectancy.toFixed(2),
    avgWin:            +avgWin.toFixed(2),
    avgLoss:           +avgLoss.toFixed(2),
    largestWin:        +largestWin.toFixed(2),
    largestLoss:       +largestLoss.toFixed(2),
    maxDrawdown:       +maxDD.toFixed(2),
    maxDrawdownPct:    +maxDrawdownPct.toFixed(1),
    consecutiveWins:   maxCW,
    consecutiveLosses: maxCL,
    activeTradingDays,
    noTradingDays,
    equityCurve,
    monthlyPnl,
    dayPerformance,
    strategyBreakdown,
    profitableStrategies,
    lossStrategies,
    breakevenStrategies,
    instrumentBreakdown,
    mistakeFrequency,
  };
}

/* ─────────────────────────────────────────────────────────────────────
   EMPTY STATS
───────────────────────────────────────────────────────────────────── */
function emptyStats() {
  return {
    totalTrades: 0, winTrades: 0, lossTrades: 0, beTrades: 0,
    netPnl: 0, grossProfit: 0, grossLoss: 0,
    winRate: 0, profitFactor: 0, expectancy: 0,
    avgWin: 0, avgLoss: 0,
    largestWin: 0, largestLoss: 0,
    maxDrawdown: 0, maxDrawdownPct: 0,
    consecutiveWins: 0, consecutiveLosses: 0,
    activeTradingDays: 0, noTradingDays: 0,
    equityCurve: [],
    monthlyPnl: [],
    dayPerformance: [],
    strategyBreakdown: [],
    profitableStrategies: [],
    lossStrategies: [],
    breakevenStrategies: [],
    instrumentBreakdown: [],
    mistakeFrequency: [],
  };
}

/* ─────────────────────────────────────────────────────────────────────
   POSITION SIZE CALCULATOR
   Works for Indian (lots) and Global/Crypto (units)
───────────────────────────────────────────────────────────────────── */
export function calcPositionSize({ market, capital, riskPercent, entryPrice, stopLoss, lotSize = 1 }) {
  const riskAmount = (capital * riskPercent) / 100;
  const slPoints   = Math.abs(Number(entryPrice) - Number(stopLoss));

  if (!entryPrice || !stopLoss || slPoints <= 0)
    return { riskAmount, slPoints: 0, recommendedSize: 0, warning: false, riskPerUnit: 0 };

  let recommendedSize = 0, warning = false;
  const riskPerUnit = slPoints * (market === 'indian' ? lotSize : 1);

  if (market === 'indian') {
    const lots = riskAmount / (slPoints * lotSize);
    recommendedSize = Math.floor(lots);
    if (recommendedSize < 1) { recommendedSize = 0; warning = true; }
  } else {
    recommendedSize = +(riskAmount / slPoints).toFixed(4);
    warning = recommendedSize < 0.0001;
  }

  return { riskAmount, slPoints, recommendedSize, warning, riskPerUnit };
}

/* ─────────────────────────────────────────────────────────────────────
   TRADE TYPE HELPERS
───────────────────────────────────────────────────────────────────── */
export function classifyTradeType(entryDate, exitDate) {
  if (!entryDate || !exitDate || entryDate === exitDate) return 'Intraday';
  const diff = (new Date(exitDate) - new Date(entryDate)) / 86400000;
  if (diff <= 1)  return 'BTST';
  if (diff <= 5)  return 'Swing';
  return 'Positional';
}

export function holdDurationLabel(entryDate, exitDate, entryTime, exitTime) {
  if (!entryDate) return '—';
  if (entryDate === exitDate) {
    const startMin = timeToMin(entryTime);
    const endMin   = timeToMin(exitTime);
    const diff     = Math.abs(endMin - startMin);
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  }
  const days = Math.round((new Date(exitDate) - new Date(entryDate)) / 86400000);
  return days === 1 ? '1 day' : `${days} days`;
}

/* ─────────────────────────────────────────────────────────────────────
   MISC HELPERS
───────────────────────────────────────────────────────────────────── */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

export const genId      = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const formatPnl  = (amount, currency = '₹') => {
  const abs  = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${currency}${abs}`;
};
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
export const round = (val, n = 2)   => +Number(val).toFixed(n);
