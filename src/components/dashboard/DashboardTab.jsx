// src/components/dashboard/DashboardTab.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ProgressBar, EmptyState } from '../ui/GlassUI';
import { getMarketConfig } from '../../utils/tradeConstants';

const MotionDiv = motion.div;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(value, cur) {
  const n = Number(value || 0);
  return `${n >= 0 ? '+' : '-'}${cur}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function toDateKey(date) {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function weekdayCount(startKey, endKey) {
  if (!startKey || !endKey) return 0;
  const d = new Date(startKey);
  const end = new Date(endKey);
  let count = 0;
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function weekKey(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

const EMOTION_COLORS = {
  fear: 'var(--clr-loss)',
  greed: 'var(--color-amber)',
  fomo: 'var(--color-purple)',
  calm: 'var(--clr-profit)',
  revenge: 'var(--color-red)',
  neutral: 'var(--txt-muted)',
};

// ─── Equity Curve ─────────────────────────────────────────────────────────────

function EquityCurve({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState message="Trade to see equity curve" />
      </div>
    );
  }
  const W = 560, H = 140, PAD = 12; // Compact height
  const mn = Math.min(0, ...data);
  const mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((v - mn) / range) * (H - PAD * 2),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts.at(-1).x},${H} L${pts[0].x},${H} Z`;
  const zeroY = H - PAD - ((0 - mn) / range) * (H - PAD * 2);
  const isProfit = data.at(-1) >= 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-indian)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent-indian)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="var(--border-strong)" strokeWidth="0.5" strokeDasharray="4,4" />
      <path d={areaPath} fill="url(#ecGrad)" />
      <path d={linePath} fill="none" stroke={isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="3.5" fill={isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)'} />
    </svg>
  );
}

// ─── ListCard ─────────────────────────────────────────────────────────────────

function ListCard({ title, items, cur, empty = 'No data yet' }) {
  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">{title}</div>
      {!items?.length ? <EmptyState message={empty} /> : (
        <div className="space-y-2.5">
          {items.slice(0, 6).map(item => {
            const pos = Number(item.pnl || 0) >= 0;
            return (
              <div key={item.name || item.label} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black rb-txt-name truncate">{item.name || item.label}</div>
                  <div className="text-[9px] rb-txt-sub">{item.count || 0} trade{item.count === 1 ? '' : 's'}{item.winRate !== undefined ? ` / ${item.winRate}% win` : ''}</div>
                </div>
                {item.pnl !== undefined && (
                  <div className={`rb-mono text-xs font-black ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
                    {money(item.pnl, cur)}
                  </div>
                )}
                {item.countOnly && <div className="rb-mono text-xs font-black text-[var(--txt-muted)]">{item.count}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 1. Psychology Heatmap ────────────────────────────────────────────────────

function PsychologyHeatmap({ trades, cur }) {
  const data = useMemo(() => {
    const emotionMap = {};
    trades.forEach(t => {
      const emotion = (t.emotion || t.mood || 'neutral').toLowerCase();
      const pnl = Number(t.pnl ?? 0);
      if (!emotionMap[emotion]) emotionMap[emotion] = { emotion, pnl: 0, count: 0, wins: 0 };
      emotionMap[emotion].pnl += pnl;
      emotionMap[emotion].count += 1;
      if (pnl > 0) emotionMap[emotion].wins += 1;
    });
    return Object.values(emotionMap).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Psychology Heatmap</div>
      {!data.length ? <EmptyState message="Log emotion on trades to see pattern" /> : (
        <div className="space-y-2.5">
          {data.map(e => {
            const winRate = e.count ? Math.round((e.wins / e.count) * 100) : 0;
            const pos = e.pnl >= 0;
            const clr = EMOTION_COLORS[e.emotion] || 'var(--txt-muted)';
            return (
              <div key={e.emotion} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: clr }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black rb-txt-name capitalize">{e.emotion}</div>
                  <div className="text-[9px] rb-txt-sub">{e.count} trades · {winRate}% win</div>
                </div>
                <div className={`rb-mono text-xs font-black ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
                  {money(e.pnl, cur)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 2. Risk Monitor ──────────────────────────────────────────────────────────

function RiskMonitor({ trades, stats, market, cur }) {
  const marketCfg = getMarketConfig(market);
  const capitalKey = market === 'indian' ? 'rb_cap_ind' : 'rb_cap_glb';
  const capital = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(capitalKey) : 0) || marketCfg.defaultCapital || 100000;
  const dailyLossLimit = capital * 0.02;

  const todayKey = toDateKey(new Date());
  const todayTrades = trades.filter(t => toDateKey(t.date) === todayKey);
  const todayPnl = todayTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const capitalRisk = capital ? Math.abs(Math.min(0, todayPnl) / capital * 100) : 0;
  const ddPct = Number(stats?.maxDrawdownPct || 0);
  const breached = todayPnl <= -dailyLossLimit;

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="flex items-center justify-between mb-3">
        <div className="rb-section-title text-sm">Risk Monitor</div>
        {breached && (
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[var(--clr-loss)] text-white tracking-widest uppercase">LIMIT HIT</span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1"><span className="rb-label">Today's P&L</span><span className={`rb-mono text-xs font-black ${todayPnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(todayPnl, cur)}</span></div>
          <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${clamp(Math.abs(todayPnl) / dailyLossLimit * 100, 0, 100)}%`, background: breached ? 'var(--clr-loss)' : 'var(--clr-profit)' }} />
          </div>
          <div className="text-[9px] rb-txt-sub mt-0.5">Daily limit: {money(dailyLossLimit, cur)}</div>
        </div>
        <div>
          <div className="flex justify-between mb-1"><span className="rb-label">Capital at Risk</span><span className="rb-mono text-xs font-black text-[var(--clr-loss)]">{capitalRisk.toFixed(2)}%</span></div>
          <ProgressBar pct={clamp(capitalRisk * 5, 0, 100)} color="var(--clr-loss)" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
          <div><div className="rb-label">Max Drawdown</div><div className="rb-value-md text-base text-[var(--clr-loss)]">-{ddPct}%</div></div>
          <div><div className="rb-label">Today Trades</div><div className="rb-value-md text-base text-[var(--accent-indian)]">{todayTrades.length}</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Holding Time Analysis ─────────────────────────────────────────────────

function HoldingTimeAnalysis({ trades, cur }) {
  const data = useMemo(() => {
    const buckets = { 'Scalp <5m': { pnl: 0, count: 0 }, '5–30m': { pnl: 0, count: 0 }, '30m–2h': { pnl: 0, count: 0 }, '2h+': { pnl: 0, count: 0 } };
    trades.forEach(t => {
      const mins = Number(t.holdingMins || t.durationMins || t.duration || 0);
      const pnl = Number(t.pnl ?? 0);
      let key;
      if (mins < 5) key = 'Scalp <5m';
      else if (mins < 30) key = '5–30m';
      else if (mins < 120) key = '30m–2h';
      else key = '2h+';
      buckets[key].pnl += pnl;
      buckets[key].count += 1;
    });
    return Object.entries(buckets).map(([label, v]) => ({ label, ...v }));
  }, [trades]);

  const hasTrades = data.some(d => d.count > 0);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Holding Time Analysis</div>
      {!hasTrades ? <EmptyState message="No holding time data yet" /> : (
        <div className="space-y-2.5">
          {data.map(b => {
            const pos = b.pnl >= 0;
            return (
              <div key={b.label} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black rb-txt-name">{b.label}</div>
                  <div className="text-[9px] rb-txt-sub">{b.count} trade{b.count !== 1 ? 's' : ''}</div>
                </div>
                {b.count > 0 ? (
                  <div className={`rb-mono text-xs font-black ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(b.pnl, cur)}</div>
                ) : <div className="rb-mono text-xs text-[var(--txt-muted)]">—</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 4. R:R Ratio Tracker ─────────────────────────────────────────────────────

function RRTracker({ trades, cur }) {
  const data = useMemo(() => {
    const valid = trades.filter(t => t.plannedRR || t.rr);
    const actual = trades.filter(t => {
      const sl = Number(t.sl || t.stopLoss || 0);
      const target = Number(t.target || t.tp || 0);
      const entry = Number(t.entryPrice || t.entry || 0);
      return sl && target && entry;
    }).map(t => {
      const sl = Math.abs(Number(t.entryPrice || t.entry) - Number(t.sl || t.stopLoss));
      const tp = Math.abs(Number(t.target || t.tp) - Number(t.entryPrice || t.entry));
      return sl ? tp / sl : 0;
    });
    const avgActual = actual.length ? actual.reduce((a, b) => a + b, 0) / actual.length : 0;
    const avgPlanned = valid.length ? valid.reduce((s, t) => s + Number(t.plannedRR || t.rr || 0), 0) / valid.length : 0;
    const wins = trades.filter(t => Number(t.pnl ?? 0) > 0);
    const losses = trades.filter(t => Number(t.pnl ?? 0) < 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length) : 0;
    return { avgActual, avgPlanned, avgWin, avgLoss, ratio: avgLoss ? avgWin / avgLoss : 0 };
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">R:R Ratio Tracker</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="rb-label">Planned R:R</div>
          <div className="rb-value-md text-base text-[var(--accent-indian)]">{data.avgPlanned.toFixed(2)}</div>
          <div className="text-[9px] rb-txt-sub">avg target</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="rb-label">Actual R:R</div>
          <div className={`rb-value-md text-base ${data.ratio >= 1 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{data.ratio.toFixed(2)}</div>
          <div className="text-[9px] rb-txt-sub">win/loss ratio</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="rb-label">Avg Winner</div>
          <div className="rb-value-md text-base text-[var(--clr-profit)]">{money(data.avgWin, cur)}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="rb-label">Avg Loser</div>
          <div className="rb-value-md text-base text-[var(--clr-loss)]">-{cur}{Math.abs(data.avgLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 5. Session Heatmap ───────────────────────────────────────────────────────

const SESSION_SLOTS = [
  { label: '9:15–10:00', start: 9 * 60 + 15, end: 10 * 60 },
  { label: '10:00–11:30', start: 10 * 60, end: 11 * 60 + 30 },
  { label: '11:30–1:00', start: 11 * 60 + 30, end: 13 * 60 },
  { label: '1:00–2:30', start: 13 * 60, end: 14 * 60 + 30 },
  { label: '2:30–3:30', start: 14 * 60 + 30, end: 15 * 60 + 30 },
];

function SessionHeatmap({ trades, cur }) {
  const data = useMemo(() => {
    return SESSION_SLOTS.map(slot => {
      const matched = trades.filter(t => {
        const time = t.time || t.entryTime || '';
        if (!time) return false;
        const [h, m] = time.split(':').map(Number);
        const mins = h * 60 + (m || 0);
        return mins >= slot.start && mins < slot.end;
      });
      const pnl = matched.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
      const wins = matched.filter(t => Number(t.pnl ?? 0) > 0).length;
      return { ...slot, pnl, count: matched.length, winRate: matched.length ? Math.round(wins / matched.length * 100) : 0 };
    });
  }, [trades]);

  const maxAbs = Math.max(1, ...data.map(d => Math.abs(d.pnl)));

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Session Heatmap</div>
      {!data.some(d => d.count > 0) ? <EmptyState message="Log trade time to see session analysis" /> : (
        <div className="space-y-2">
          {data.map(slot => {
            const pos = slot.pnl >= 0;
            const pct = (Math.abs(slot.pnl) / maxAbs) * 100;
            return (
              <div key={slot.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black rb-txt-name">{slot.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] rb-txt-sub">{slot.count}t · {slot.winRate}%W</span>
                    <span className={`rb-mono text-[10px] font-black ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{slot.count > 0 ? money(slot.pnl, cur) : '—'}</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pos ? 'var(--clr-profit)' : 'var(--clr-loss)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 6. Streak Tracker ────────────────────────────────────────────────────────

function StreakTracker({ trades }) {
  const data = useMemo(() => {
    const sorted = [...trades].filter(t => t.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    let cur = 0, curType = null, maxWin = 0, maxLoss = 0;
    sorted.forEach(t => {
      const pnl = Number(t.pnl ?? 0);
      const type = pnl >= 0 ? 'win' : 'loss';
      if (type === curType) { cur++; }
      else { cur = 1; curType = type; }
      if (curType === 'win') maxWin = Math.max(maxWin, cur);
      else maxLoss = Math.max(maxLoss, cur);
    });
    const last5 = sorted.slice(-5).map(t => Number(t.pnl ?? 0) >= 0);
    return { current: cur, type: curType, maxWin, maxLoss, last5 };
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Streak Tracker</div>
      {!trades.length ? <EmptyState message="No streak data yet" /> : (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="rb-label">Current Streak</div>
              <div className={`rb-value-xl text-xl ${data.type === 'win' ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
                {data.type === 'win' ? '+' : '-'}{data.current}
              </div>
              <div className="text-[9px] rb-txt-sub capitalize">{data.type || '—'} streak</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="rb-stat-glass rounded-xl p-2 text-center">
                <div className="rb-label text-center">Best Win</div>
                <div className="rb-value-md text-base text-[var(--clr-profit)] text-center">{data.maxWin}</div>
              </div>
              <div className="rb-stat-glass rounded-xl p-2 text-center">
                <div className="rb-label text-center">Max Loss</div>
                <div className="rb-value-md text-base text-[var(--clr-loss)] text-center">{data.maxLoss}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="rb-label mb-1.5">Last 5 trades</div>
            <div className="flex gap-1.5">
              {data.last5.map((win, i) => (
                <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black" style={{ background: win ? 'color-mix(in srgb, var(--clr-profit) 20%, transparent)' : 'color-mix(in srgb, var(--clr-loss) 20%, transparent)', color: win ? 'var(--clr-profit)' : 'var(--clr-loss)' }}>
                  {win ? 'W' : 'L'}
                </div>
              ))}
              {data.last5.length === 0 && <span className="rb-txt-sub text-xs">—</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 7. Symbol Leaderboard ────────────────────────────────────────────────────

function SymbolLeaderboard({ trades, cur }) {
  const data = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      const sym = t.symbol || t.instrument || t.stock || 'Unknown';
      if (!map[sym]) map[sym] = { name: sym, pnl: 0, count: 0, wins: 0 };
      map[sym].pnl += Number(t.pnl ?? 0);
      map[sym].count += 1;
      if (Number(t.pnl ?? 0) > 0) map[sym].wins += 1;
    });
    return Object.values(map)
      .map(x => ({ ...x, winRate: x.count ? Math.round(x.wins / x.count * 100) : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Symbol Leaderboard</div>
      {!data.length ? <EmptyState message="No symbol data yet" /> : (
        <div className="space-y-2.5">
          {data.slice(0, 6).map((s, i) => {
            const pos = s.pnl >= 0;
            return (
              <div key={s.name} className="flex items-center gap-3">
                <div className="text-[9px] font-black rb-txt-sub w-3">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black rb-txt-name truncate">{s.name}</div>
                  <div className="text-[9px] rb-txt-sub">{s.count} trades · {s.winRate}% win</div>
                </div>
                <div className={`rb-mono text-xs font-black ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(s.pnl, cur)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 8. Rule Compliance ───────────────────────────────────────────────────────

function RuleCompliance({ trades, cur }) {
  const data = useMemo(() => {
    const ruleMap = {};
    trades.forEach(t => {
      const broken = (t.rulesBreached || t.rulesBroken || t.mistakes || []).filter(r => r && r !== 'None');
      const followed = (t.rulesFollowed || []);
      broken.forEach(r => {
        if (!ruleMap[r]) ruleMap[r] = { name: r, broken: 0, pnlImpact: 0 };
        ruleMap[r].broken += 1;
        ruleMap[r].pnlImpact += Number(t.pnl ?? 0);
      });
    });
    const totalWithRules = trades.filter(t => (t.rulesFollowed || []).length > 0 || (t.rulesBreached || t.rulesBroken || t.mistakes || []).filter(r => r && r !== 'None').length > 0).length;
    const brokenCount = trades.filter(t => (t.rulesBreached || t.rulesBroken || t.mistakes || []).filter(r => r && r !== 'None').length > 0).length;
    const compliancePct = totalWithRules ? Math.round((1 - brokenCount / trades.length) * 100) : 0;
    return { rules: Object.values(ruleMap).sort((a, b) => b.broken - a.broken), compliancePct, brokenCount };
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="flex items-center justify-between mb-3">
        <div className="rb-section-title text-sm">Rule Compliance</div>
        <div className={`text-sm font-black rb-mono ${data.compliancePct >= 80 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{data.compliancePct}%</div>
      </div>
      <div className="mb-3">
        <ProgressBar pct={data.compliancePct} color={data.compliancePct >= 80 ? 'var(--clr-profit)' : data.compliancePct >= 60 ? 'var(--color-amber)' : 'var(--clr-loss)'} />
        <div className="text-[9px] rb-txt-sub mt-1">{data.brokenCount} trades with rule violations</div>
      </div>
      {!data.rules.length ? <EmptyState message="No rule violations logged" /> : (
        <div className="space-y-2">
          {data.rules.slice(0, 4).map(r => (
            <div key={r.name} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black rb-txt-name truncate">{r.name}</div>
                <div className="text-[9px] rb-txt-sub">{r.broken}× broken</div>
              </div>
              <div className={`rb-mono text-xs font-black ${r.pnlImpact >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(r.pnlImpact, cur)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 9. Monthly Target Progress ───────────────────────────────────────────────

function MonthlyTarget({ trades, market, cur }) {
  const marketCfg = getMarketConfig(market);
  const targetKey = market === 'indian' ? 'rb_monthly_target_ind' : 'rb_monthly_target_glb';
  const target = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(targetKey) : 0) || marketCfg.defaultCapital * 0.05 || 5000;

  const data = useMemo(() => {
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const monthTrades = trades.filter(t => toDateKey(t.date).startsWith(monthKey));
    const achieved = monthTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
    const pct = target ? clamp((achieved / target) * 100, 0, 200) : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysLeft = daysInMonth - daysPassed;
    const dailyRunRate = daysPassed ? achieved / daysPassed : 0;
    const projected = dailyRunRate * daysInMonth;
    return { achieved, pct: clamp(pct, 0, 100), daysLeft, projected, monthTrades: monthTrades.length, onTrack: projected >= target };
  }, [trades, target]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Monthly Target</div>
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <div className="rb-label">Achieved</div>
            <div className={`rb-value-xl text-xl ${data.achieved >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(data.achieved, cur)}</div>
          </div>
          <div className="text-right">
            <div className="rb-label">Target</div>
            <div className="rb-value-md text-base text-[var(--txt-muted)]">{cur}{target.toLocaleString()}</div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[9px] rb-txt-sub">{data.pct.toFixed(0)}% complete</span>
            <span className="text-[9px] rb-txt-sub">{data.daysLeft}d left</span>
          </div>
          <ProgressBar pct={data.pct} color={data.onTrack ? 'var(--clr-profit)' : 'var(--color-amber)'} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
          <div><div className="rb-label">Projected</div><div className={`rb-value-md text-base ${data.projected >= target ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(data.projected, cur)}</div></div>
          <div><div className="rb-label">This Month</div><div className="rb-value-md text-base text-[var(--accent-indian)]">{data.monthTrades} trades</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── 10. Trading Calendar (Compact Height) ────────────────────────────────────

function TradingCalendar({ trades, cur }) {
  const { weeks, monthLabel } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const pnlByDay = {};
    trades.forEach(t => {
      const dk = toDateKey(t.date);
      if (!dk) return;
      pnlByDay[dk] = (pnlByDay[dk] || 0) + Number(t.pnl ?? 0);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ d, dk, pnl: pnlByDay[dk] });
    }
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { weeks, monthLabel };
  }, [trades]);

  const maxAbs = useMemo(() => {
    let m = 1;
    weeks.forEach(w => w.forEach(c => { if (c?.pnl) m = Math.max(m, Math.abs(c.pnl)); }));
    return m;
  }, [weeks]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="flex items-center justify-between mb-3">
        <div className="rb-section-title text-sm">Trading Calendar</div>
        <div className="text-[10px] rb-txt-sub">{monthLabel}</div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] rb-txt-sub font-black">{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week[di];
              if (!cell) return <div key={di} className="h-8 lg:h-10" />; 
              const intensity = cell.pnl !== undefined ? clamp(Math.abs(cell.pnl) / maxAbs, 0.15, 1) : 0;
              const isToday = cell.dk === toDateKey(new Date());
              let bg = 'var(--border)';
              if (cell.pnl !== undefined) {
                bg = cell.pnl >= 0
                  ? `color-mix(in srgb, var(--clr-profit) ${Math.round(intensity * 60)}%, transparent)`
                  : `color-mix(in srgb, var(--clr-loss) ${Math.round(intensity * 60)}%, transparent)`;
              }
              return (
                <div 
                  key={di} 
                  className="h-8 lg:h-10 rounded-md flex items-center justify-center relative w-full" 
                  style={{ background: bg, outline: isToday ? '1.5px solid var(--accent-indian)' : 'none' }} 
                  title={cell.pnl !== undefined ? `${cell.dk}: ${cell.pnl >= 0 ? '+' : ''}${cell.pnl?.toFixed(0)}` : cell.dk}
                >
                  <span className="text-[9px] font-black rb-txt-name">{cell.d}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: 'color-mix(in srgb, var(--clr-profit) 50%, transparent)' }} /><span className="text-[9px] rb-txt-sub">Profit</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: 'color-mix(in srgb, var(--clr-loss) 50%, transparent)' }} /><span className="text-[9px] rb-txt-sub">Loss</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[var(--border)]" /><span className="text-[9px] rb-txt-sub">No trade</span></div>
      </div>
    </div>
  );
}

// ─── 11. Trade Grade Distribution ────────────────────────────────────────────

function TradeGradeDistribution({ trades, cur }) {
  const data = useMemo(() => {
    const grades = { A: { pnl: 0, count: 0 }, B: { pnl: 0, count: 0 }, C: { pnl: 0, count: 0 }, D: { pnl: 0, count: 0 } };
    trades.forEach(t => {
      const grade = (t.grade || t.quality || t.tradeGrade || '').toUpperCase();
      if (grades[grade]) {
        grades[grade].pnl += Number(t.pnl ?? 0);
        grades[grade].count += 1;
      }
    });
    const total = Object.values(grades).reduce((s, g) => s + g.count, 0);
    return { grades, total };
  }, [trades]);

  const gradeColors = { A: 'var(--clr-profit)', B: 'var(--color-light-cyan)', C: 'var(--color-amber)', D: 'var(--clr-loss)' };

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Trade Grade Distribution</div>
      {!data.total ? <EmptyState message="Log A/B/C/D grade on trades" /> : (
        <div className="space-y-2.5">
          {Object.entries(data.grades).map(([g, v]) => {
            const pct = data.total ? (v.count / data.total) * 100 : 0;
            const avgPnl = v.count ? v.pnl / v.count : 0;
            return (
              <div key={g}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black" style={{ color: gradeColors[g] }}>Grade {g}</span>
                    <span className="text-[9px] rb-txt-sub">{v.count} trades</span>
                  </div>
                  <span className={`rb-mono text-[9px] font-black ${avgPnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>avg {money(avgPnl, cur)}</span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: gradeColors[g] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 12. Overtrading Detector ─────────────────────────────────────────────────

function OvertradingDetector({ trades }) {
  const data = useMemo(() => {
    const dayMap = {};
    trades.forEach(t => {
      const dk = toDateKey(t.date);
      if (!dk) return;
      dayMap[dk] = dayMap[dk] || { count: 0, pnl: 0 };
      dayMap[dk].count += 1;
      dayMap[dk].pnl += Number(t.pnl ?? 0);
    });
    const days = Object.values(dayMap);
    const avgCount = days.length ? days.reduce((s, d) => s + d.count, 0) / days.length : 0;
    const overtradedDays = Object.entries(dayMap).filter(([, v]) => v.count > avgCount * 1.5);
    const revengePattern = Object.entries(dayMap).filter(([, v]) => v.pnl < 0 && v.count > avgCount);
    return { avgCount: avgCount.toFixed(1), overtradedDays: overtradedDays.length, revengePattern: revengePattern.length, totalDays: days.length };
  }, [trades]);

  const overtradePct = data.totalDays ? Math.round(data.overtradedDays / data.totalDays * 100) : 0;

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Overtrading Detector</div>
      {!trades.length ? <EmptyState message="No overtrading data yet" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rb-stat-glass rounded-xl p-2 text-center">
              <div className="rb-label text-center text-[9px]">Avg/Day</div>
              <div className="rb-value-md text-base text-center text-[var(--accent-indian)]">{data.avgCount}</div>
            </div>
            <div className="rb-stat-glass rounded-xl p-2 text-center">
              <div className="rb-label text-center text-[9px]">Overtrade Days</div>
              <div className={`rb-value-md text-base text-center ${data.overtradedDays > 0 ? 'text-[var(--clr-loss)]' : 'text-[var(--clr-profit)]'}`}>{data.overtradedDays}</div>
            </div>
            <div className="rb-stat-glass rounded-xl p-2 text-center">
              <div className="rb-label text-center text-[9px]">Revenge Days</div>
              <div className={`rb-value-md text-base text-center ${data.revengePattern > 0 ? 'text-[var(--clr-loss)]' : 'text-[var(--clr-profit)]'}`}>{data.revengePattern}</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5"><span className="rb-label">Overtrading Frequency</span><span className="rb-mono text-xs font-black text-[var(--clr-loss)]">{overtradePct}%</span></div>
            <ProgressBar pct={overtradePct} color={overtradePct > 30 ? 'var(--clr-loss)' : overtradePct > 15 ? 'var(--color-amber)' : 'var(--clr-profit)'} />
          </div>
          <div className="text-[9px] rb-txt-sub">
            {data.revengePattern > 0 ? `${data.revengePattern} day${data.revengePattern > 1 ? 's' : ''} of possible revenge trading detected` : 'No revenge trading pattern found'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 13. MFE / MAE Analysis ───────────────────────────────────────────────────

function MFEMAEAnalysis({ trades, cur }) {
  const data = useMemo(() => {
    const valid = trades.filter(t => t.mfe !== undefined || t.mae !== undefined);
    if (!valid.length) return null;
    const avgMFE = valid.reduce((s, t) => s + Number(t.mfe || 0), 0) / valid.length;
    const avgMAE = valid.reduce((s, t) => s + Math.abs(Number(t.mae || 0)), 0) / valid.length;
    const exitEfficiency = valid.filter(t => {
      const pnl = Number(t.pnl ?? 0);
      const mfe = Number(t.mfe || 0);
      return mfe > 0 && pnl / mfe < 0.5;
    }).length;
    const earlyExitPct = valid.length ? Math.round(exitEfficiency / valid.length * 100) : 0;
    return { avgMFE, avgMAE, earlyExitPct, count: valid.length };
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">MFE / MAE Analysis</div>
      {!data ? <EmptyState message="Log MFE & MAE on trades to unlock" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="rb-label">Avg MFE</div>
              <div className="rb-value-md text-base text-[var(--clr-profit)]">{money(data.avgMFE, cur)}</div>
              <div className="text-[9px] rb-txt-sub">Max favorable move</div>
            </div>
            <div>
              <div className="rb-label">Avg MAE</div>
              <div className="rb-value-md text-base text-[var(--clr-loss)]">-{cur}{Math.abs(data.avgMAE).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className="text-[9px] rb-txt-sub">Max adverse move</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5"><span className="rb-label">Early Exit Rate</span><span className={`rb-mono text-xs font-black ${data.earlyExitPct > 40 ? 'text-[var(--clr-loss)]' : 'text-[var(--clr-profit)]'}`}>{data.earlyExitPct}%</span></div>
            <ProgressBar pct={data.earlyExitPct} color={data.earlyExitPct > 40 ? 'var(--clr-loss)' : 'var(--clr-profit)'} />
            <div className="text-[9px] rb-txt-sub mt-1">{data.earlyExitPct > 40 ? 'You may be exiting winners too early' : 'Exit timing looks good'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 14. Consistency Score ────────────────────────────────────────────────────

function ConsistencyScore({ trades, cur }) {
  const data = useMemo(() => {
    const weekly = {};
    trades.forEach(t => {
      const wk = weekKey(t.dateKey || toDateKey(t.date));
      weekly[wk] = weekly[wk] || { pnl: 0, count: 0 };
      weekly[wk].pnl += Number(t.pnl ?? 0);
      weekly[wk].count += 1;
    });
    const weeks = Object.values(weekly);
    if (weeks.length < 2) return null;
    const pnls = weeks.map(w => w.pnl);
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / pnls.length;
    const stddev = Math.sqrt(variance);
    const cv = avg !== 0 ? Math.abs(stddev / avg) : 1;
    const score = Math.max(0, Math.round(100 - cv * 50));
    const profitWeeks = pnls.filter(p => p >= 0).length;
    return { score, stddev, avg, profitWeeks, totalWeeks: weeks.length, recentWeeks: weeks.slice(-4) };
  }, [trades]);

  return (
    <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem]">
      <div className="rb-section-title text-sm mb-3">Consistency Score</div>
      {!data ? <EmptyState message="Need 2+ weeks of data" /> : (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none" stroke={data.score >= 70 ? 'var(--clr-profit)' : data.score >= 40 ? 'var(--color-amber)' : 'var(--clr-loss)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${data.score * 1.634} 163.4`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rb-mono text-xs font-black" style={{ color: data.score >= 70 ? 'var(--clr-profit)' : data.score >= 40 ? 'var(--color-amber)' : 'var(--clr-loss)' }}>{data.score}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="rb-label">Weekly Avg</div>
              <div className={`rb-value-md text-base ${data.avg >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(data.avg, cur)}</div>
              <div className="text-[9px] rb-txt-sub mt-1">{data.profitWeeks}/{data.totalWeeks} profit weeks</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="rb-label mb-1.5">Recent 4 weeks</div>
            {data.recentWeeks.map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.abs(w.pnl) / Math.max(1, ...data.recentWeeks.map(x => Math.abs(x.pnl))) * 100}%`, background: w.pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)' }} />
                </div>
                <span className={`rb-mono text-[9px] font-black w-14 text-right ${w.pnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(w.pnl, cur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────


const DashboardTab = ({ trades, stats, market }) => {
  const marketCfg = getMarketConfig(market);
  const cur = marketCfg.currencySymbol;
  const s = stats || {};
  const defaultCapital = marketCfg.defaultCapital;

  const insight = useMemo(() => {
    const clean = [...(trades || [])]
      .filter(t => t.date)
      .map(t => ({ ...t, pnl: Number(t.pnl ?? t.metrics?.netPnl ?? 0), dateKey: toDateKey(t.date) }))
      .filter(t => t.dateKey)
      .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));

    const firstDate = clean[0]?.dateKey || '';
    const lastDate = clean.at(-1)?.dateKey || '';
    const tradedDays = new Set(clean.map(t => t.dateKey)).size;
    const possibleDays = weekdayCount(firstDate, lastDate);
    const totalPnl = clean.reduce((sum, t) => sum + t.pnl, 0);
    const capitalKey = market === 'indian' ? 'rb_cap_ind' : 'rb_cap_glb';
    const capital = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(capitalKey) : 0) || defaultCapital || 1;
    const profitPct = capital ? (totalPnl / capital) * 100 : 0;

    const weekly = {}, monthly = {}, mistakeByDay = {}, strategy = {}, dayPnl = {};

    clean.forEach(t => {
      const wk = weekKey(t.dateKey);
      const mo = t.dateKey.slice(0, 7);
      const dow = new Date(t.dateKey).toLocaleDateString('en-US', { weekday: 'short' });
      const strat = t.strategy || t.setup || 'Manual';
      const mistakes = (t.mistakes || []).filter(m => m && m !== 'None');

      weekly[wk] = weekly[wk] || { label: `Week ${wk}`, pnl: 0, count: 0 };
      monthly[mo] = monthly[mo] || { label: mo, pnl: 0, count: 0 };
      dayPnl[dow] = dayPnl[dow] || { label: dow, pnl: 0, count: 0 };
      strategy[strat] = strategy[strat] || { name: strat, pnl: 0, count: 0, wins: 0 };

      weekly[wk].pnl += t.pnl; weekly[wk].count += 1;
      monthly[mo].pnl += t.pnl; monthly[mo].count += 1;
      dayPnl[dow].pnl += t.pnl; dayPnl[dow].count += 1;
      strategy[strat].pnl += t.pnl; strategy[strat].count += 1;
      if (t.pnl > 0) strategy[strat].wins += 1;

      mistakes.forEach(m => {
        const key = `${dow}:${m}`;
        mistakeByDay[key] = mistakeByDay[key] || { name: `${m} on ${dow}`, count: 0, countOnly: true };
        mistakeByDay[key].count += 1;
      });
    });

    const strategyRows = Object.values(strategy)
      .map(x => ({ ...x, winRate: x.count ? Math.round((x.wins / x.count) * 100) : 0 }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      clean, firstDate, tradedDays, possibleDays, totalPnl, profitPct,
      weeklyRows: Object.values(weekly).sort((a, b) => a.label.localeCompare(b.label)).slice(-6),
      monthlyRows: Object.values(monthly).sort((a, b) => a.label.localeCompare(b.label)).slice(-6),
      mistakeRows: Object.values(mistakeByDay).sort((a, b) => b.count - a.count),
      strategyRows,
      dayRows: Object.values(dayPnl).sort((a, b) => b.pnl - a.pnl),
    };
  }, [trades, market, defaultCapital]);

  const equityCurve = insight.clean.reduce((acc, t) => {
    acc.push((acc.at(-1) || 0) + t.pnl);
    return acc;
  }, []);

  const topCards = [
    { label: 'Profit Percent', value: `${insight.profitPct >= 0 ? '+' : ''}${insight.profitPct.toFixed(2)}%`, color: insight.profitPct >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', sub: `${money(insight.totalPnl, cur)} on base capital` },
    { label: 'Trading Days', value: `${insight.tradedDays}/${insight.possibleDays || 0}`, color: 'var(--accent-indian)', sub: insight.firstDate ? `Since ${insight.firstDate}` : 'No first trade yet' },
    { label: 'Win Rate', value: `${s.winRate || 0}%`, color: 'var(--accent-indian)', sub: `${s.winTrades || 0}W / ${s.lossTrades || 0}L` },
    { label: 'Best Strategy', value: insight.strategyRows[0]?.name || 'None', color: 'var(--txt-primary)', sub: insight.strategyRows[0] ? money(insight.strategyRows[0].pnl, cur) : 'Add strategy on trades' },
  ];

  const anim = (i) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 } });

  return (
    <div className="flex flex-col gap-3">

      {/* ── Top KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {topCards.map((c, i) => (
          <MotionDiv key={c.label} {...anim(i)}>
            <div className="rb-stat-glass rb-animated-card p-4 rounded-xl flex flex-col gap-1.5">
              <div className="rb-label">{c.label}</div>
              <div className="rb-value-xl text-xl truncate" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[9px] rb-txt-sub font-bold tracking-wide">{c.sub}</div>
            </div>
          </MotionDiv>
        ))}
      </div>

      {/* ── Equity Curve + Trade Quality ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3">
        <MotionDiv {...anim(4)}>
          <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem] flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="rb-section-title text-sm">Equity Curve</div>
              <div className="text-[8px] font-bold rb-txt-sub uppercase tracking-widest">Firebase trades / {marketCfg.label}</div>
            </div>
            <div className="h-[140px]"><EquityCurve data={equityCurve} /></div>
          </div>
        </MotionDiv>

        <MotionDiv {...anim(5)}>
          <div className="rb-card-glass rb-animated-card p-4 rounded-[1.5rem] flex flex-col gap-4">
            <div className="rb-section-title text-sm">Trade Quality</div>
            <div>
              <div className="flex justify-between mb-1"><span className="rb-label">Profitable</span><span className="rb-mono text-xs font-bold text-[var(--clr-profit)]">{s.winTrades || 0}</span></div>
              <ProgressBar pct={s.winRate || 0} color="var(--clr-profit)" />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span className="rb-label">Loss Making</span><span className="rb-mono text-xs font-bold text-[var(--clr-loss)]">{s.lossTrades || 0}</span></div>
              <ProgressBar pct={100 - (s.winRate || 0)} color="var(--clr-loss)" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
              <div><div className="rb-label">Avg Trade</div><div className={`rb-value-md text-base ${(s.expectancy || 0) >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{money(s.expectancy || 0, cur)}</div></div>
              <div><div className="rb-label">Max DD</div><div className="rb-value-md text-base text-[var(--clr-loss)]">-{s.maxDrawdownPct || 0}%</div></div>
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* ── Auto-packed insight cards ── */}
      <div className="dashboard-masonry">
        <MotionDiv className="dashboard-masonry-item" {...anim(6)}><RiskMonitor trades={insight.clean} stats={s} market={market} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(7)}><MonthlyTarget trades={insight.clean} market={market} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(8)}><TradingCalendar trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(9)}><SessionHeatmap trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(10)}><StreakTracker trades={insight.clean} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(11)}><RRTracker trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(12)}><HoldingTimeAnalysis trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(13)}><SymbolLeaderboard trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(14)}><RuleCompliance trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(15)}><TradeGradeDistribution trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(16)}><OvertradingDetector trades={insight.clean} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(17)}><MFEMAEAnalysis trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(18)}><ConsistencyScore trades={insight.clean} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(19)}><ListCard title="Weekly Profit" items={insight.weeklyRows} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(20)}><ListCard title="Monthly Profit" items={insight.monthlyRows} cur={cur} /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(21)}><ListCard title="Strategy Profitability" items={insight.strategyRows} cur={cur} empty="No strategy data yet" /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(22)}><ListCard title="Mistake Pattern By Day" items={insight.mistakeRows} cur={cur} empty="No mistakes logged yet" /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(23)}><ListCard title="Best Trading Days" items={insight.dayRows} cur={cur} empty="No day data yet" /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(24)}><ListCard title="Strategy Risk Watch" items={[...insight.strategyRows].reverse().filter(x => x.pnl < 0)} cur={cur} empty="No losing strategy pattern yet" /></MotionDiv>
        <MotionDiv className="dashboard-masonry-item" {...anim(25)}><PsychologyHeatmap trades={insight.clean} cur={cur} /></MotionDiv>
      </div>

    </div>
  );
};

export default DashboardTab;
