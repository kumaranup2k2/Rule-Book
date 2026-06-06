// src/utils/tradeConstants.js
// Market-specific configurations — Indian vs Foreign

export const MARKETS = {
  indian: {
    label: 'Indian',
    currency: 'INR',
    currencySymbol: '₹',
    unit: 'Lots',
    pnlUnit: 'Points',
    instruments: [
      'NIFTY 50', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY',
      'RELIANCE', 'TCS', 'HDFC BANK', 'INFOSYS', 'ICICI BANK',
      'SBIN', 'WIPRO', 'BAJFINANCE', 'AXISBANK', 'LT', 'MARUTI',
      'SUNPHARMA', 'TITAN', 'ADANIENT', 'ONGC', 'NTPC',
    ],
    strategies: [
      'Breakout', 'Reversal', 'Momentum', 'Expiry Play',
      'Trend Follow', 'Support/Resistance', 'Opening Range', 'Gap Fill',
      'Iron Condor', 'Bull Call Spread', 'Bear Put Spread', 'Straddle', 'Strangle',
    ],
    tradeTypes: [
      'Options Buy', 'Options Sell', 'Futures Long', 'Futures Short',
      'Equity CNC', 'Equity Intraday', 'Spread',
    ],
    mistakes: [
      'Revenge Trading', 'Overtrading', 'Early Exit', 'Late Entry',
      'No Stop Loss', 'Position Oversizing', 'FOMO', 'Averaging Down',
      'Ignoring Expiry Risk', 'News Event Gamble',
    ],
    lotSizes: [
      { label: 'Nifty 50',      value: 25  },
      { label: 'Bank Nifty',    value: 15  },
      { label: 'Fin Nifty',     value: 40  },
      { label: 'Midcap Nifty',  value: 50  },
      { label: 'Sensex',        value: 10  },
      { label: 'Equity (1 share)', value: 1 },
    ],
    sessions: ['Pre-Market', 'Opening (9:15-10:00)', 'Mid-Session', 'Closing (3:00-3:30)'],
    defaultCapital: 100000,
    defaultRisk: 1,
  },
  foreign: {
    label: 'Foreign',
    currency: 'USD',
    currencySymbol: '$',
    unit: 'Units',
    pnlUnit: 'Pips',
    instruments: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD',
      'USDCAD', 'NZDUSD', 'GBPJPY', 'EURJPY', 'EURGBP',
      'XAUUSD (Gold)', 'XAGUSD (Silver)', 'US30', 'NAS100', 'SPX500',
      'BTCUSD', 'ETHUSD', 'WTI Crude', 'Brent Crude', 'Natural Gas',
    ],
    strategies: [
      'Trend Follow', 'Counter Trend', 'Breakout', 'Scalping',
      'Swing Trade', 'News Play', 'Range Trading', 'ICT Concepts',
      'Smart Money', 'Supply/Demand', 'Fibonacci', 'Elliott Wave',
    ],
    tradeTypes: [
      'Forex Spot', 'CFD Long', 'CFD Short', 'Crypto Spot',
      'Crypto Futures', 'Commodities', 'Indices', 'Options',
    ],
    mistakes: [
      'Revenge Trading', 'Overtrading', 'Moving Stop Loss',
      'News Gamble', 'FOMO', 'Overleveraging', 'No Risk Management',
      'Correlation Ignore', 'Session Mismatch', 'Emotional Hold',
    ],
    lotSizes: [
      { label: 'Micro Lot (0.01)', value: 0.01 },
      { label: 'Mini Lot (0.1)',   value: 0.1  },
      { label: 'Standard (1.0)',   value: 1.0  },
    ],
    sessions: ['Asian Session', 'London Session', 'NY Session', 'London/NY Overlap'],
    defaultCapital: 10000,
    defaultRisk: 1,
  },
};

// Returns the correct config for active market
export const getMarketConfig = (market) => MARKETS[market] || MARKETS.indian;

// Format currency based on market
export const formatCurrency = (value, market) => {
  const cfg = getMarketConfig(market);
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: market === 'foreign' ? 2 : 0,
    maximumFractionDigits: market === 'foreign' ? 2 : 0,
  });
  return (value < 0 ? '-' : '') + cfg.currencySymbol + formatted;
};