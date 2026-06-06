// src/components/dashboard/RiskTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../ui/Icons';
import { getMarketConfig } from '../../utils/tradeConstants';
import { calcPositionSize } from '../../utils/helpers';

/* ────────────────────────────────────────────
   MARKET STYLE HELPER
   NOTE: --accent-foreign, --accent-indian-glow, --accent-foreign-glow, --accent-foreign-dim
   are NOT in index.css → necessary hardcodes below.
   Only --accent-indian & --accent-indian-dim exist in index.css.
──────────────────────────────────────────── */
const getMarketStyle = (market) =>
  market === 'indian'
    ? {
        accent:     'var(--accent-indian)',
        accentDim:  'var(--accent-indian-dim)',
        accentGlow: 'rgba(109,40,217,0.25)', // necessary hardcode — no CSS var in index.css
      }
    : {
        accent:     '#3B82F6',               // necessary hardcode — no CSS var in index.css
        accentDim:  'rgba(59,130,246,0.08)', // necessary hardcode
        accentGlow: 'rgba(59,130,246,0.25)', // necessary hardcode
      };

/* ────────────────────────────────────────────
   INLINE ICONS
──────────────────────────────────────────── */
const WarningIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ verticalAlign: 'text-bottom', marginRight: 4 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
);
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/* ────────────────────────────────────────────
   RISK GAUGE — SVG Speedometer Arc
──────────────────────────────────────────── */
function RiskGauge({ riskPct }) {
  const MAX_RISK = 5;
  const fraction = Math.min(Math.max(Number(riskPct) || 0, 0), MAX_RISK) / MAX_RISK;
  const cx = 100, cy = 90, r = 68;

  const toRad = deg => (deg * Math.PI) / 180;
  const ptAt  = (deg, radius = r) => ({
    x: +(cx + radius * Math.cos(toRad(deg))).toFixed(2),
    y: +(cy + radius * Math.sin(toRad(deg))).toFixed(2),
  });

  // Arc from 210° → 330° clockwise (passes through 270° = top in SVG)
  const START = 210, SWEEP = 120;
  const arcPath = (sDeg, eDeg, radius = r) => {
    const s = ptAt(sDeg, radius), e = ptAt(eDeg, radius);
    const large = (eDeg - sDeg) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const gaugeColor = fraction < 0.4 ? 'var(--clr-profit)' : fraction < 0.7 ? 'var(--color-amber)' : 'var(--clr-loss)';
  const riskLabel  = fraction < 0.4 ? 'SAFE ZONE' : fraction < 0.7 ? 'CAUTION' : 'DANGER!';
  const filledEnd  = fraction > 0 ? Math.min(START + fraction * SWEEP, 330) : START;

  // Needle: triangle pointing outward from center
  const needleDeg   = START + fraction * SWEEP;
  const needleTip   = ptAt(needleDeg, r - 12);
  const needleBase1 = ptAt(needleDeg + 90, 7);
  const needleBase2 = ptAt(needleDeg - 90, 7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg viewBox="0 0 200 145" style={{ width: '100%', maxWidth: 230, height: 'auto' }}>
        {/* Zone tracks (faint) */}
        <path d={arcPath(210, 258)} fill="none" stroke="var(--clr-profit)" strokeWidth="10" strokeLinecap="butt" opacity="0.2" />
        <path d={arcPath(258, 282)} fill="none" stroke="var(--color-amber)" strokeWidth="10" strokeLinecap="butt" opacity="0.2" />
        <path d={arcPath(282, 330)} fill="none" stroke="var(--clr-loss)" strokeWidth="10" strokeLinecap="butt" opacity="0.2" />
        {/* Active fill */}
        {fraction > 0 && (
          <path d={arcPath(START, filledEnd)} fill="none" stroke={gaugeColor} strokeWidth="10" strokeLinecap="round" />
        )}
        {/* Tick marks at 0%, 25%, 50%, 75%, 100% */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const deg = START + f * SWEEP;
          const inner = ptAt(deg, r - 20), outer = ptAt(deg, r - 8);
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--txt-muted)" strokeWidth="1.5" opacity="0.5" />;
        })}
        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={gaugeColor} opacity="0.95"
        />
        <circle cx={cx} cy={cy} r="8" fill="var(--card-bg)" stroke={gaugeColor} strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="3.5" fill={gaugeColor} />
        {/* Zone labels */}
        <text x="18" y="132" fontSize="8" fill="var(--clr-profit)" fontWeight="800" textAnchor="middle">0%</text>
        <text x="100" y="18" fontSize="8" fill="var(--color-amber)" fontWeight="800" textAnchor="middle">2.5%</text>
        <text x="182" y="132" fontSize="8" fill="var(--clr-loss)" fontWeight="800" textAnchor="middle">5%+</text>
      </svg>
      <div className="rb-mono" style={{ fontSize: 30, fontWeight: 800, color: gaugeColor, lineHeight: 1, marginTop: -12 }}>
        {(Number(riskPct) || 0).toFixed(2)}%
      </div>
      <div style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: gaugeColor, padding: '3px 12px', borderRadius: 20, marginTop: 4,
        background: fraction < 0.4 ? 'var(--clr-profit-dim)' : fraction < 0.7 ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)' : 'var(--clr-loss-dim)',
      }}>
        {riskLabel}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   R:R VISUAL BAR
──────────────────────────────────────────── */
function RRBar({ riskAmt, rewardAmt, cur }) {
  if (!riskAmt && !rewardAmt) return null;
  const total = riskAmt + rewardAmt || 1;
  const riskW = (riskAmt / total) * 100;
  const rwrdW = 100 - riskW;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <span style={{ color: 'var(--clr-loss)' }}>Risk {cur}{riskAmt.toLocaleString()}</span>
        <span style={{ color: 'var(--txt-muted)' }}>R:R Visual</span>
        <span style={{ color: 'var(--clr-profit)' }}>Reward {cur}{rewardAmt.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 22 }}>
        <div style={{ width: `${riskW}%`, background: 'var(--clr-loss)', opacity: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.4s ease' }}>
          {riskW > 14 && <span className="rb-mono" style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{riskW.toFixed(0)}%</span>}
        </div>
        <div style={{ width: `${rwrdW}%`, background: 'var(--clr-profit)', opacity: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.4s ease' }}>
          {rwrdW > 14 && <span className="rb-mono" style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{rwrdW.toFixed(0)}%</span>}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   EQUITY PROJECTION MINI CHART — SVG
──────────────────────────────────────────── */
function ProjectionChart({ days, tradesPerDay, winRate, riskAmt, rewardAmt, startCapital, brokerage, compound, cur }) {
  const W = Math.min(Math.max(winRate / 100, 0), 1);
  const T = Math.max(1, tradesPerDay);
  const D = Math.max(1, days);
  const B = Math.max(0, brokerage);

  // Deterministic expected-value projection
  const evPerTrade  = W * rewardAmt - (1 - W) * riskAmt - B;
  const riskRatio   = startCapital > 0 ? riskAmt   / startCapital : 0.01;
  const rewardRatio = startCapital > 0 ? rewardAmt / startCapital : riskRatio * 1.5;
  const evRatio     = W * rewardRatio - (1 - W) * riskRatio;
  const brokerageR  = startCapital > 0 ? B / startCapital : 0;

  const points = [startCapital];
  let cap = startCapital;
  for (let d = 1; d <= D; d++) {
    cap = compound
      ? cap * Math.pow(Math.max(0.001, 1 + evRatio - brokerageR), T)
      : Math.max(0, cap + evPerTrade * T);
    points.push(cap);
  }
  if (points.length < 2 || points.every(p => p === points[0])) return null;

  const minV  = Math.min(...points);
  const maxV  = Math.max(...points);
  const range = maxV - minV || 1;
  const W_SVG = 400, H_SVG = 90, PAD = 8;

  const pStr = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W_SVG - PAD * 2);
    const y = H_SVG - PAD - ((p - minV) / range) * (H_SVG - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const fillPts = `${PAD},${H_SVG - PAD} ${pStr} ${W_SVG - PAD},${H_SVG - PAD}`;

  const finalCap = points[points.length - 1];
  const isProfit = finalCap >= startCapital;
  const lineColor = isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)';
  const delta = Math.abs(Math.round(finalCap - startCapital));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {D}-Day {compound ? 'Compound' : 'Simple'} Curve
        </span>
        <span className="rb-mono" style={{ fontSize: 11, fontWeight: 800, color: lineColor }}>
          {isProfit ? '+' : '-'}{cur}{delta.toLocaleString()}
        </span>
      </div>
      <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--bg-bar)' }}>
        <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: lineColor, stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: lineColor, stopOpacity: 0.0 }} />
            </linearGradient>
          </defs>
          <polygon points={fillPts} fill="url(#projGrad)" />
          <polyline points={pStr} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   LOT SIZE PILL BUTTONS — replaces select dropdown
──────────────────────────────────────────── */
function LotButtons({ lotSizes, selected, onSelect, accent }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {lotSizes.map((ls, i) => {
        const active = selected === i;
        return (
          <motion.button
            key={i} whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(i)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 10, fontWeight: 800,
              border:     `1px solid ${active ? accent : 'var(--border)'}`,
              background: active ? accent : 'var(--bg-bar)',
              color:      active ? '#fff' : 'var(--txt-muted)',
              cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}
          >
            {ls.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────
   METRIC CARD (Kelly / BE / EV)
──────────────────────────────────────────── */
function MetricCard({ label, value, color, hint }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '10px 12px', borderRadius: 10,
      background: 'var(--bg-bar)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div className="rb-mono" style={{ fontSize: 15, fontWeight: 800, color: color || 'var(--txt-primary)' }}>{value}</div>
      {hint && <div style={{ fontSize: 9, color: 'var(--txt-muted)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────
   RESULT BOX
──────────────────────────────────────────── */
function ResultBox({ label, value, sub, color, large = false, highlight = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: '16px 8px',

      background: highlight ? 'var(--bg-bar)' : 'transparent',
      borderRadius: highlight ? 12 : 0,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>{label}</div>
      <div className="rb-mono" style={{ fontSize: large ? 32 : 20, fontWeight: 800, color: color || 'var(--txt-primary)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt-muted)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sub}</div>}
    </div>
  );
}

function SectionHeading({ title, icon, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: accent || 'var(--accent-indian)', opacity: 0.85 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-primary)' }}>{title}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '12px 0' }} />;
}

/* ────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────── */
export default function RiskTab({ market }) {
  const marketCfg = getMarketConfig(market);
  const cur       = marketCfg.currencySymbol;
  const ms = getMarketStyle(market);

  /* ── State ── */
  const [capital,       setCapital]      = useState(marketCfg.defaultCapital.toString());
  const [riskPercent,   setRiskPercent]  = useState(marketCfg.defaultRisk.toString());
  const [entryPrice,    setEntryPrice]   = useState('');
  const [stopLoss,      setStopLoss]     = useState('');
  const [target,        setTarget]       = useState('');
  const [lotIndex,      setLotIndex]     = useState(0);
  const [marginPerLot,  setMarginPerLot] = useState('');
  const [tradeDays,     setTradeDays]    = useState('30');
  const [tradesPerDay,  setTradesPerDay] = useState('2');
  const [winRate,       setWinRate]      = useState('50');
  const [brokerage,     setBrokerage]    = useState(market === 'indian' ? '40' : '0');
  const [targetCapital, setTargetCapital]= useState('');
  const [compound,      setCompound]     = useState(false);


  useEffect(() => {
    setCapital(marketCfg.defaultCapital.toString());
    setBrokerage(market === 'indian' ? '40' : '0');
    setEntryPrice(''); setStopLoss(''); setTarget('');
    setTargetCapital(''); setMarginPerLot(''); setLotIndex(0);
  }, [market, marketCfg.defaultCapital]);



  const handleReset = () => {
    setCapital(marketCfg.defaultCapital.toString());
    setRiskPercent(marketCfg.defaultRisk.toString());
    setEntryPrice(''); setStopLoss(''); setTarget(''); setMarginPerLot('');
    setTradeDays('30'); setTradesPerDay('2'); setWinRate('50');
    setBrokerage(market === 'indian' ? '40' : '0');
    setTargetCapital(''); setLotIndex(0); setCompound(false);
  };

  const lotSize = marketCfg.lotSizes[lotIndex]?.value || 1;

  /* ── Validation ── */
  const C              = Math.max(0, Number(capital))     || 0;
  const R_pct          = Math.max(0, Number(riskPercent)) || 0;
  const W_input        = Number(winRate);
  const isInvalidSL    = entryPrice && stopLoss && Number(entryPrice) === Number(stopLoss);
  const isWinRateError = W_input < 0 || W_input > 100;
  const safeWinRate    = isWinRateError ? 0 : W_input;

  /* ── Core Position Sizing ── */
  const result = isInvalidSL
    ? { slPoints: 0, recommendedSize: 0, riskAmount: 0, warning: 'Invalid SL' }
    : calcPositionSize({ market, capital: C, riskPercent: R_pct, entryPrice, stopLoss, lotSize });

  const slPts     = result.slPoints;
  const tgtPts    = Number(target) && Number(entryPrice) ? Math.abs(Number(target) - Number(entryPrice)) : 0;
  const rrRatio   = slPts > 0 && tgtPts > 0 ? (tgtPts / slPts).toFixed(2) : 0;
  const potReward = tgtPts > 0 && result.recommendedSize > 0
    ? (market === 'indian'
        ? result.recommendedSize * tgtPts * lotSize
        : result.recommendedSize * tgtPts)
    : 0;

  const reqMargin       = Number(marginPerLot) > 0 ? result.recommendedSize * Number(marginPerLot) : 0;
  const marginShortfall = reqMargin > C ? reqMargin - C : 0;

  /* ── Advanced Metrics ── */
  const rrNum = rrRatio > 0 ? Number(rrRatio) : 0;
  const W     = safeWinRate / 100;
  const B     = Math.max(0, Number(brokerage)) || 0;

  // Kelly Criterion: f* = W - (1−W)/R
  const kelly        = rrNum > 0 ? Math.min(Math.max(W - (1 - W) / rrNum, 0), 1) : null;
  const kellyDisplay = kelly !== null ? `${(kelly * 100).toFixed(1)}%` : '—';

  // Breakeven win rate: 1 / (1 + R:R)
  const beWinRate   = rrNum > 0 ? (1 / (1 + rrNum)) * 100 : null;
  const beWRDisplay = beWinRate !== null ? `${beWinRate.toFixed(1)}%` : '—';

  // Expected value per trade
  const ev        = rrNum > 0 && result.riskAmount > 0 ? W * potReward - (1 - W) * result.riskAmount - B : null;
  const evDisplay = ev !== null ? `${ev >= 0 ? '+' : ''}${cur}${Math.abs(ev).toFixed(0)}` : '—';
  const evColor   = ev !== null ? (ev >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)') : 'var(--txt-muted)';

  /* ── Projection Math ── */
  const D = Math.max(1, Number(tradeDays))    || 1;
  const T = Math.max(1, Number(tradesPerDay)) || 1;
  const R = R_pct / 100 || 0;
  const TC = Math.max(0, Number(targetCapital)) || 0;

  const totalTrades    = D * T;
  const winTrades      = Math.round(totalTrades * W);
  const loseTrades     = totalTrades - winTrades;
  const baseRisk       = result.riskAmount || C * R;
  const baseReward     = potReward || baseRisk * 1.5;
  const grossLoss      = loseTrades * baseRisk;
  const grossProfit    = winTrades * baseReward;
  const totalBrokerage = totalTrades * B;
  const netProfit      = grossProfit - grossLoss - totalBrokerage;
  const projectedCap   = C + netProfit;

  let losingStreak = 0;
  if (totalTrades > 1 && W < 1 && W >= 0) {
    const probLoss = 1 - W;
    losingStreak = probLoss > 0 ? Math.round(Math.log(totalTrades) / Math.log(1 / probLoss)) : 0;
  }
  const maxDrawdown = Math.max(0, losingStreak * baseRisk);

  const isReverseMode = TC > C;
  let reqRR = 0;
  if (isReverseMode && W > 0 && R > 0) {
    const reqDailyReturn = Math.pow(TC / C, 1 / D) - 1;
    const reqNetEvPct    = reqDailyReturn / T;
    const reqEvAmt       = reqNetEvPct * C + B;
    const reqEvPct       = reqEvAmt / C;
    reqRR = (reqEvPct + (1 - W) * R) / (W * R);
  }

  /* ── Copy Results ── */
  const handleCopy = () => {
    const lines = [
      `=== RISK CALCULATOR RESULTS ===`,
      `Market: ${marketCfg.label}`,
      `Capital: ${cur}${C.toLocaleString()}  |  Risk/Trade: ${R_pct}%`,
      `Recommended Qty: ${result.recommendedSize} ${marketCfg.unit}`,
      `Risk: ${cur}${result.riskAmount.toLocaleString()}  |  Reward: ${cur}${potReward.toLocaleString()}`,
      `R:R Ratio: 1 : ${rrRatio || '—'}`,
      kelly     !== null ? `Kelly Fraction: ${kellyDisplay}` : null,
      beWinRate !== null ? `Breakeven Win Rate: ${beWRDisplay}` : null,
      ev        !== null ? `Expected Value/Trade: ${evDisplay}` : null,
      `Projected Cap (${D}d): ${cur}${Math.max(0, projectedCap).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(lines);
  };

  const handleNumChange = setter => e => setter(e.target.value);

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: 'var(--bg-page)', border: '1px solid var(--border)',
    color: 'var(--txt-primary)', fontFamily: 'inherit', fontSize: 13, outline: 'none',
  };
  const errInputStyle = { ...inputStyle, border: '1px solid var(--clr-loss)', background: 'var(--clr-loss-dim)' };

  const rrColor = rrNum >= 1.5 ? 'var(--clr-profit)' : rrNum >= 1 ? 'var(--color-amber)' : 'var(--clr-loss)';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header Bar ── */}
      <div style={{
        padding: '12px 20px', borderRadius: 14,
        background: ms.accentDim, border: `1px solid ${ms.accentGlow}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {market === 'indian' ? <Icons.India /> : <Icons.Globe />}
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: ms.accent }}>
            Pro Calculator — Reality & Risk Engine
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--txt-muted)', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase' }}>
            <CopyIcon /> Copy
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReset}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--txt-primary)', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase' }}>
            <ResetIcon /> Reset
          </motion.button>
        </div>
      </div>

      {/* ── Main Two-Column Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>

        {/* ════ INPUT PANEL ════ */}
        <div style={{
          background: 'var(--card-bg)', borderRadius: 20, padding: 24,
          border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>

          {/* 1. Capital & Risk */}
          <div>
            <SectionHeading title="1. Base Capital & Risk" icon={<Icons.Briefcase />} accent={ms.accent} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Capital ({cur})</label>
                <input style={C <= 0 && capital !== '' ? errInputStyle : inputStyle} type="number" value={capital} onChange={handleNumChange(setCapital)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Risk / Trade (%)</label>
                <input style={R_pct <= 0 && riskPercent !== '' ? errInputStyle : inputStyle} type="number" step="0.1" value={riskPercent} onChange={handleNumChange(setRiskPercent)} />
              </div>
            </div>
          </div>

          {/* 2. Trade Setup */}
          <div>
            <SectionHeading title="2. Trade Setup" icon={<Icons.LineChart />} accent={ms.accent} />
            {isInvalidSL && (
              <div style={{ fontSize: 10, color: 'var(--clr-loss)', fontWeight: 700, marginBottom: 10 }}>
                <WarningIcon size={12} /> Entry & Stop Loss cannot be identical.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Entry Price</label>
                <input style={isInvalidSL ? errInputStyle : inputStyle} type="number" value={entryPrice} onChange={handleNumChange(setEntryPrice)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Stop Loss</label>
                <input style={isInvalidSL ? errInputStyle : inputStyle} type="number" value={stopLoss} onChange={handleNumChange(setStopLoss)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Target Price</label>
              <input style={inputStyle} type="number" value={target} onChange={handleNumChange(setTarget)} />
            </div>
            {/* Lot Size as Pill Buttons */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: ms.accent, marginBottom: 10, display: 'block', textTransform: 'uppercase' }}>
                Instrument / Lot Size
              </label>
              <LotButtons lotSizes={marketCfg.lotSizes} selected={lotIndex} onSelect={setLotIndex} accent={ms.accent} />
            </div>
          </div>

          {/* Margin Check */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: ms.accent, marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>
              Margin per {marketCfg.unit} (Optional)
            </label>
            <input
              style={{ ...inputStyle, border: `1px solid ${ms.accentGlow}` }}
              type="number" placeholder="Enter broker required margin"
              value={marginPerLot} onChange={handleNumChange(setMarginPerLot)}
            />
          </div>

          {/* 3. Projection Setup */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: ms.accent, opacity: 0.85 }}><Icons.Book /></span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-primary)' }}>
                  3. Projection Setup
                </span>
              </div>
              {/* Compound / Simple Toggle */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setCompound(c => !c)}
                style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                  border:     `1px solid ${compound ? ms.accentGlow : 'var(--border)'}`,
                  background: compound ? ms.accentDim : 'var(--bg-bar)',
                  color:      compound ? ms.accent : 'var(--txt-muted)',
                }}>
                {compound ? '◆ Compound' : '◇ Simple'}
              </motion.button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Days</label>
                <input style={inputStyle} type="number" value={tradeDays} onChange={handleNumChange(setTradeDays)} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>T/Day</label>
                <input style={inputStyle} type="number" value={tradesPerDay} onChange={handleNumChange(setTradesPerDay)} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: isWinRateError ? 'var(--clr-loss)' : 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Win%</label>
                <input style={isWinRateError ? errInputStyle : inputStyle} type="number" value={winRate} onChange={handleNumChange(setWinRate)} />
              </div>
            </div>
            {isWinRateError && (
              <div style={{ fontSize: 10, color: 'var(--clr-loss)', fontWeight: 700, marginTop: -6, marginBottom: 8 }}>
                <WarningIcon size={12} /> Win rate must be 0–100.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Brokerage / Trade</label>
                <input style={inputStyle} type="number" value={brokerage} onChange={handleNumChange(setBrokerage)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: ms.accent, marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Target Capital</label>
                <input
                  style={{ ...inputStyle, border: `1px solid ${ms.accentGlow}` }}
                  type="number" placeholder="Goal (Reverse Math)"
                  value={targetCapital} onChange={handleNumChange(setTargetCapital)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════ OUTPUT PANEL ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Risk Gauge + Sizing */}
          <div style={{
            background: ms.accentDim, border: `1px solid ${ms.accentGlow}`,
            borderRadius: 20, padding: 24, boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 4 }}>
              Risk Meter
            </div>
            <RiskGauge riskPct={R_pct} />

            <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--card-border)', padding: '16px 0', marginTop: 16 }}>
              <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 12 }}>
                Trade Sizing
              </div>
              <ResultBox
                label="Recommended Quantity"
                value={result.recommendedSize > 0 ? result.recommendedSize : '0'}
                sub={`Total ${marketCfg.unit}s to Trade`}
                color={ms.accent} large
              />
              {result.warning && !isInvalidSL && (
                <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--clr-loss)', fontWeight: 700, marginTop: -8, marginBottom: 8 }}>
                  <WarningIcon size={12} /> Risk too low for minimum size
                </div>
              )}
              {marginShortfall > 0 && (
                <div style={{ margin: '0 16px 12px', padding: '10px', borderRadius: 8, background: 'var(--clr-loss-dim)', color: 'var(--clr-loss)', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
                  <WarningIcon size={14} /> MARGIN SHORTFALL<br />
                  Need {cur}{reqMargin.toLocaleString()} • Short by {cur}{marginShortfall.toLocaleString()}
                </div>
              )}
              <Divider />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ borderRight: '1px solid var(--border)' }}>
                  <ResultBox label="Risk Amount" value={`${cur}${result.riskAmount.toLocaleString()}`} color="var(--clr-loss)" />
                </div>
                <div>
                  <ResultBox label="Potential Reward" value={potReward > 0 ? `${cur}${potReward.toLocaleString()}` : `${cur}0`} color={potReward > 0 ? 'var(--clr-profit)' : 'var(--txt-primary)'} />
                </div>
              </div>
            </div>
          </div>

          {/* R:R Analysis + Advanced Metrics */}
          <div style={{
            background: 'var(--card-bg)', borderRadius: 20, padding: 20,
            border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)' }}>
              <span style={{ color: ms.accent }}><Icons.ChartPie /></span> Risk / Reward Analysis
            </div>

            {rrRatio > 0 ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>R:R Ratio</div>
                  <div className="rb-mono" style={{ fontSize: 34, fontWeight: 800, color: rrColor, lineHeight: 1 }}>
                    1 : {rrRatio}
                  </div>
                </div>
                <RRBar riskAmt={result.riskAmount} rewardAmt={potReward} cur={cur} />
              </>
            ) : (
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt-muted)', padding: '8px 0' }}>
                Set Entry, SL & Target to see R:R analysis
              </div>
            )}

            <Divider />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <MetricCard
                label="Kelly %"
                value={kellyDisplay}
                color={kelly !== null && kelly > 0.01 ? 'var(--clr-profit)' : 'var(--txt-muted)'}
                hint="Optimal risk fraction"
              />
              <MetricCard
                label="BE Win Rate"
                value={beWRDisplay}
                color={beWinRate !== null ? (W * 100 > beWinRate ? 'var(--clr-profit)' : 'var(--clr-loss)') : 'var(--txt-muted)'}
                hint={beWinRate !== null ? (W * 100 > beWinRate ? `✓ You beat ${beWRDisplay}` : `Need >${beWRDisplay}`) : 'Set R:R first'}
              />
              <MetricCard
                label="Exp Value"
                value={evDisplay}
                color={evColor}
                hint="Avg per trade"
              />
            </div>
          </div>

          {/* Reality / Projection Panel */}
          <div style={{
            background: 'var(--card-bg)', borderRadius: 20, padding: 20,
            border: isReverseMode ? `1px solid ${ms.accentGlow}` : '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: isReverseMode ? ms.accent : 'var(--txt-muted)' }}>
              {isReverseMode ? `Goal Reality Check (${tradeDays} Days)` : `Future Reality Check (${tradeDays} Days)`}
            </div>

            {isReverseMode ? (
              <>
                <ResultBox highlight label="Required R:R to Hit Goal" value={`1 : ${Math.max(0, reqRR).toFixed(2)}`} color={ms.accent} large />
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt-muted)', padding: '0 10px', lineHeight: 1.6 }}>
                  Lalach alert! <b style={{ color: 'var(--clr-profit)' }}>{cur}{TC.toLocaleString()}</b> banane ke liye har trade mein ye R:R hit karna padega ({safeWinRate}% win rate assume karke).
                </div>
                <Divider />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ borderRight: '1px solid var(--border)' }}>
                    <ResultBox label="Target Capital" value={`${cur}${TC.toLocaleString()}`} color="var(--clr-profit)" />
                  </div>
                  <div>
                    <ResultBox label="Brokerage Paid" value={`${cur}${totalBrokerage.toLocaleString()}`} color="var(--clr-loss)" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt-primary)', fontWeight: 600, padding: '0 20px', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--clr-profit)' }}>{winTrades} Wins</span> aayenge, par{' '}
                  <span style={{ color: 'var(--clr-loss)' }}>{loseTrades} Losses</span> bhi honge.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-bar)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--txt-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Gross Profit</div>
                    <div style={{ fontSize: 14, color: 'var(--clr-profit)', fontWeight: 800, marginTop: 4 }}>+{cur}{Math.round(grossProfit).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--txt-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Losses + Brokerage</div>
                    <div style={{ fontSize: 14, color: 'var(--clr-loss)', fontWeight: 800, marginTop: 4 }}>-{cur}{Math.round(grossLoss + totalBrokerage).toLocaleString()}</div>
                  </div>
                </div>

                {losingStreak > 1 && (
                  <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--clr-loss)', opacity: 0.85, fontWeight: 700, padding: '0 10px' }}>
                    <WarningIcon size={12} /> Expect up to {losingStreak} consecutive losses (Max Drawdown: {cur}{maxDrawdown.toLocaleString()})
                  </div>
                )}

                {/* Mini Equity Projection Chart */}
                {baseRisk > 0 && C > 0 && (
                  <ProjectionChart
                    days={D} tradesPerDay={T} winRate={safeWinRate}
                    riskAmt={baseRisk} rewardAmt={baseReward}
                    startCapital={C} brokerage={B}
                    compound={compound} cur={cur}
                  />
                )}

                <Divider />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ borderRight: '1px solid var(--border)' }}>
                    <ResultBox
                      highlight label="Projected Capital"
                      value={`${cur}${Math.max(0, projectedCap).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      color={projectedCap > C ? 'var(--clr-profit)' : 'var(--clr-loss)'}
                    />
                  </div>
                  <div>
                    <ResultBox
                      label="Net P&L"
                      value={`${netProfit >= 0 ? '+' : ''}${cur}${Math.abs(netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      color={netProfit >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)'}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
