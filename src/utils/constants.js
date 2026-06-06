// src/utils/constants.js

export const CHART_COLORS = { 
  cyan: 'var(--color-cyan)', 
  purple: 'var(--color-purple)', 
  pink: 'var(--color-pink)', 
  green: 'var(--color-green)', 
  red: 'var(--color-red)', 
  amber: 'var(--color-amber)', 
  muted: 'var(--color-muted)'
};

export const PIE_COLORS = [
  CHART_COLORS.cyan, CHART_COLORS.purple, CHART_COLORS.pink,
  CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red,
  'var(--color-light-cyan)', 'var(--color-light-purple)'
];

export const STRATS = ['Breakout','Pullback','Scalping','Options Selling','Mean Reversion','Trend Following','Gap Up/Down','ORB','VWAP Reversal','Momentum'];
export const TYPES  = ['Intraday','BTST','Swing','Positional','Options Buy','Options Sell','Futures'];
export const MISTAKES = ['None','FOMO Entry','Revenge Trade','Oversize Position','Early Exit','No Stop Loss','Broke Rules','Chasing','Overtrading'];
export const EMOTIONS = ['Calm','Focused','Fear','Greed','FOMO','Revenge','Anxious','Overconfident','Neutral'];