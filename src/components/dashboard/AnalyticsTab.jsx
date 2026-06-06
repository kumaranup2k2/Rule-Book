// src/components/dashboard/AnalyticsTab.jsx
// Advanced Interactive Analytics — zoom, drill-down, clickable calendar, TradingView-style charts
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '../ui/GlassUI';
import { Icons } from '../ui/Icons';
import { calcStats } from '../../utils/helpers';
import { getMarketConfig } from '../../utils/tradeConstants';
import { useMobile } from '../../hooks/useUI';

const MotionDiv = motion.div;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(v, cur) {
  const n = Number(v || 0);
  return `${n >= 0 ? '+' : '-'}${cur}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function toDateKey(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.toISOString().slice(0, 10);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Data Hook ────────────────────────────────────────────────────────────────

function useAdvancedStats(trades) {
  return useMemo(() => {
    if (!trades?.length) return null;
    const sorted = [...trades].filter(t => t.date).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Equity curve
    let eq = 0, minEq = 0, maxEq = 0;
    const equityCurve = sorted.map(t => {
      eq += Number(t.pnl ?? 0);
      minEq = Math.min(minEq, eq);
      maxEq = Math.max(maxEq, eq);
      return { date: t.date, pnl: Number(t.pnl ?? 0), balance: eq };
    });

    // Monthly & weekly
    const monthly = {}, weekly = {};
    sorted.forEach(t => {
      const d = new Date(t.date);
      const mKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const day = d.getDay() || 7;
      const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
      const wKey = mon.toISOString().slice(0, 10);

      if (!monthly[mKey]) monthly[mKey] = { label: mKey, pnl: 0, count: 0, wins: 0, filterKey: mKey };
      monthly[mKey].pnl += Number(t.pnl ?? 0); monthly[mKey].count++;
      if (Number(t.pnl ?? 0) > 0) monthly[mKey].wins++;

      if (!weekly[wKey]) weekly[wKey] = { label: `${mon.getDate()} ${mon.toLocaleString('default', { month: 'short' })}`, pnl: 0, count: 0, wins: 0, rawDate: mon, filterKey: wKey };
      weekly[wKey].pnl += Number(t.pnl ?? 0); weekly[wKey].count++;
      if (Number(t.pnl ?? 0) > 0) weekly[wKey].wins++;
    });

    // Calendar heatmap — 90 days
    const dateMap = {};
    sorted.forEach(t => { const k = toDateKey(t.date); if (!dateMap[k]) dateMap[k] = []; dateMap[k].push(t); });
    let hmMax = 1;
    const heatmap = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dk = d.toISOString().slice(0, 10);
      const dayTrades = dateMap[dk] || [];
      const pnl = dayTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
      if (dayTrades.length && Math.abs(pnl) > hmMax) hmMax = Math.abs(pnl);
      heatmap.push({ date: dk, pnl: dayTrades.length ? pnl : null, count: dayTrades.length, trades: dayTrades });
    }

    // Instruments & sessions
    const instMap = {}, sessMap = {}, stratMap = {};
    sorted.forEach(t => {
      const inst = t.script || t.symbol || t.instrument || 'Unknown';
      const sess = t.session || 'Any';
      const strat = t.strategy || t.setup || 'Manual';
      [instMap, sessMap, stratMap].forEach((m, mi) => {
        const key = [inst, sess, strat][mi];
        if (!m[key]) m[key] = { name: key, pnl: 0, wins: 0, total: 0 };
        m[key].pnl += Number(t.pnl ?? 0); m[key].total++;
        if (Number(t.pnl ?? 0) > 0) m[key].wins++;
      });
    });

    // DOW
    const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dowData = Array.from({ length: 7 }, (_, i) => ({ label: DOW[i], pnl: 0, count: 0, wins: 0, filterKey: String(i) }));
    sorted.forEach(t => { const dow = (new Date(t.date).getDay() + 6) % 7; dowData[dow].pnl += Number(t.pnl ?? 0); dowData[dow].count++; if (Number(t.pnl ?? 0) > 0) dowData[dow].wins++; });

    // Streak
    let streak = 0, lastRes = null, curStreak = 0, bestWin = 0, bestLoss = 0;
    sorted.forEach(t => {
      const res = Number(t.pnl ?? 0) > 0 ? 'W' : 'L';
      streak = res === lastRes ? streak + 1 : 1; lastRes = res;
      if (res === 'W') bestWin = Math.max(bestWin, streak);
      else bestLoss = Math.max(bestLoss, streak);
    });
    curStreak = lastRes === 'W' ? streak : lastRes === 'L' ? -streak : 0;

    // Sharpe
    const dailyPnl = {};
    sorted.forEach(t => { dailyPnl[t.date] = (dailyPnl[t.date] || 0) + Number(t.pnl ?? 0); });
    const dr = Object.values(dailyPnl);
    let sharpe = '—';
    if (dr.length > 1) {
      const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
      const std = Math.sqrt(dr.reduce((a, b) => a + (b - mean) ** 2, 0) / (dr.length - 1));
      sharpe = std ? ((mean / std) * Math.sqrt(252)).toFixed(2) : '—';
    }

    // MFE/MAE
    const mfeValid = sorted.filter(t => t.mfe !== undefined);
    const maeValid = sorted.filter(t => t.mae !== undefined);
    const avgMFE = mfeValid.length ? mfeValid.reduce((s, t) => s + Number(t.mfe), 0) / mfeValid.length : null;
    const avgMAE = maeValid.length ? maeValid.reduce((s, t) => s + Math.abs(Number(t.mae)), 0) / maeValid.length : null;

    // Emotion
    const emotionMap = {};
    sorted.forEach(t => {
      const em = (t.emotion || t.mood || '').toLowerCase();
      if (!em) return;
      if (!emotionMap[em]) emotionMap[em] = { name: em, pnl: 0, count: 0, wins: 0 };
      emotionMap[em].pnl += Number(t.pnl ?? 0); emotionMap[em].count++;
      if (Number(t.pnl ?? 0) > 0) emotionMap[em].wins++;
    });

    const dailySorted = Object.entries(dailyPnl).sort((a, b) => b[1] - a[1]);
    const bestDay = dailySorted[0] || null;
    const worstDay = dailySorted[dailySorted.length - 1] || null;

    return {
      equityCurve, minEq, maxEq,
      monthlyData: Object.values(monthly).slice(-12),
      weeklyData: Object.values(weekly).sort((a, b) => a.rawDate - b.rawDate).slice(-12),
      heatmap, hmMax,
      topInstruments: Object.values(instMap).sort((a, b) => b.pnl - a.pnl).slice(0, 6),
      topSessions: Object.values(sessMap).sort((a, b) => b.pnl - a.pnl),
      topStrategies: Object.values(stratMap).sort((a, b) => b.pnl - a.pnl).slice(0, 6),
      dowData, curStreak, bestWin, bestLoss, sharpe, bestDay, worstDay,
      avgMFE, avgMAE,
      emotions: Object.values(emotionMap).sort((a, b) => b.pnl - a.pnl),
      dateMap,
    };
  }, [trades]);
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(trades, market) {
  if (!trades?.length) return;
  const h = ['Date', 'Symbol', 'Session', 'Strategy', 'PnL', 'Emotion', 'Grade'];
  const rows = trades.map(t => [t.date, t.script || t.symbol || '', t.session || '', t.strategy || '', t.pnl, t.emotion || '', t.grade || '']);
  const csv = [h, ...rows].map(r => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `Analytics_${market}_${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ─── TradingView-Style Zoomable Equity Curve ──────────────────────────────────

function ZoomableEquityCurve({ data, minEq, maxEq, cur, isMobile }) {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState({ start: 0, end: 1 });
  const [dragging, setDragging] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [crosshair, setCrosshair] = useState(null);
  const series = data || [];

  const W = 1000, H = 260, PAD = { t: 20, r: 80, b: 32, l: 12 };
  const visStart = Math.floor(zoom.start * series.length);
  const visEnd = Math.max(visStart + 2, Math.ceil(zoom.end * series.length));
  const visData = series.slice(visStart, visEnd);
  const visMin = Math.min(minEq ?? 0, ...visData.map(d => d.balance));
  const visMax = Math.max(maxEq ?? 0, ...visData.map(d => d.balance));
  const range = visMax - visMin || 1;

  const pts = visData.map((d, i) => ({
    x: PAD.l + (i / Math.max(1, visData.length - 1)) * (W - PAD.l - PAD.r),
    y: H - PAD.b - ((d.balance - visMin) / range) * (H - PAD.t - PAD.b),
    d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length > 1 ? `${linePath} L${pts.at(-1).x},${H - PAD.b} L${pts[0].x},${H - PAD.b} Z` : '';
  const zeroY = H - PAD.b - ((0 - visMin) / range) * (H - PAD.t - PAD.b);
  const isProfit = visData.at(-1)?.balance >= 0;
  const color = isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)';

  const gridLines = 4;
  const yLabels = Array.from({ length: gridLines + 1 }, (_, i) => {
    const val = visMin + (range / gridLines) * i;
    const y = H - PAD.b - (i / gridLines) * (H - PAD.t - PAD.b);
    return { val, y };
  });

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg || !pts.length) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const closest = pts.reduce((best, p, i) => Math.abs(p.x - mx) < Math.abs(best.p.x - mx) ? { p, i } : best, { p: pts[0], i: 0 });
    setHoverIdx(closest.i);
    setCrosshair({ x: closest.p.x, y: closest.p.y, data: closest.p.d });
  }, [pts]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.05 : -0.05;
    setZoom(z => {
      const mid = (z.start + z.end) / 2;
      const half = (z.end - z.start) / 2;
      const newHalf = clamp(half + delta, 0.05, 0.5);
      return { start: clamp(mid - newHalf, 0, 1), end: clamp(mid + newHalf, 0, 1) };
    });
  }, []);

  if (!series.length) return <EmptyState message="Not enough data" />;

  // Scrollbar drag
  const sbY = H - 16, sbH = 10, sbW = W - PAD.l - PAD.r;
  const sbStart = PAD.l + zoom.start * sbW;
  const sbEnd = PAD.l + zoom.end * sbW;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {['1W', '1M', '3M', 'ALL'].map(tf => (
          <button key={tf} onClick={() => {
            const map = { '1W': [0.85, 1], '1M': [0.7, 1], '3M': [0.5, 1], 'ALL': [0, 1] };
            setZoom({ start: map[tf][0], end: map[tf][1] });
          }} style={{ background: 'var(--bg-bar)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: 'var(--txt-muted)', cursor: 'pointer', letterSpacing: '0.05em' }}>
            {tf}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--txt-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>Scroll to zoom · Drag to pan</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoverIdx(null); setCrosshair(null); }}
        onWheel={handleWheel}
      >
        <defs>
          <linearGradient id="eqAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)', stopOpacity: 0.0 }} />
          </linearGradient>
          <clipPath id="chartClip"><rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} /></clipPath>
        </defs>

        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={l.y} x2={W - PAD.r} y2={l.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={W - PAD.r + 6} y={l.y + 4} fontSize="9" fill="var(--txt-muted)" fontFamily="var(--font-mono)">
              {l.val >= 0 ? '+' : ''}{Math.round(l.val).toLocaleString()}
            </text>
          </g>
        ))}

        {/* Zero line */}
        {visMin < 0 && visMax > 0 && (
          <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="var(--border)" strokeWidth="1" strokeDasharray="6,3" />
        )}

        {/* Area + line clipped */}
        <g clipPath="url(#chartClip)">
          {areaPath && <path d={areaPath} fill="url(#eqAreaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {/* Individual trade dots on hover */}
          {hoverIdx !== null && pts[hoverIdx] && (
            <circle cx={pts[hoverIdx].x} cy={pts[hoverIdx].y} r="5" fill={color} stroke="var(--card-bg)" strokeWidth="2" />
          )}
        </g>

        {/* Crosshair */}
        {crosshair && (
          <>
            <line x1={crosshair.x} y1={PAD.t} x2={crosshair.x} y2={H - PAD.b} stroke="var(--txt-muted)" strokeWidth="0.5" strokeDasharray="4,3" />
            <line x1={PAD.l} y1={crosshair.y} x2={W - PAD.r} y2={crosshair.y} stroke="var(--txt-muted)" strokeWidth="0.5" strokeDasharray="4,3" />
            {/* Tooltip box */}
            <rect x={Math.min(crosshair.x + 8, W - PAD.r - 120)} y={crosshair.y - 28} width={112} height={52} rx="6" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.5" />
            <text x={Math.min(crosshair.x + 14, W - PAD.r - 114)} y={crosshair.y - 14} fontSize="9" fill="var(--txt-muted)" fontFamily="var(--font-sans)">{crosshair.data.date}</text>
            <text x={Math.min(crosshair.x + 14, W - PAD.r - 114)} y={crosshair.y + 2} fontSize="11" fontWeight="700" fill={crosshair.data.pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)'} fontFamily="var(--font-mono)">
              {crosshair.data.pnl >= 0 ? '+' : ''}{Math.round(crosshair.data.pnl).toLocaleString()}
            </text>
            <text x={Math.min(crosshair.x + 14, W - PAD.r - 114)} y={crosshair.y + 18} fontSize="10" fontWeight="800" fill={isProfit ? 'var(--clr-profit)' : 'var(--clr-loss)'} fontFamily="var(--font-mono)">
              Eq: {crosshair.data.balance >= 0 ? '+' : ''}{Math.round(crosshair.data.balance).toLocaleString()}
            </text>
          </>
        )}

        {/* Scrollbar track */}
        <rect x={PAD.l} y={sbY} width={sbW} height={sbH} rx="4" fill="var(--bg-bar)" />
        <rect x={sbStart} y={sbY} width={sbEnd - sbStart} height={sbH} rx="4" fill="var(--txt-muted)" opacity="0.5"
          style={{ cursor: 'ew-resize' }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startZoom = { ...zoom };
            const onMove = (me) => {
              const dx = (me.clientX - startX) / (svgRef.current?.getBoundingClientRect().width || 1);
              const span = startZoom.end - startZoom.start;
              const ns = clamp(startZoom.start + dx, 0, 1 - span);
              setZoom({ start: ns, end: ns + span });
            };
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />

        {/* X-axis date labels */}
        {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 5)) === 0).map((p, i) => (
          <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--txt-muted)" fontFamily="var(--font-sans)">{p.d.date?.slice(5)}</text>
        ))}
      </svg>

      {/* Current equity overlay */}
      <div style={{ position: 'absolute', top: 8, right: 8, textAlign: 'right' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equity</div>
        <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
          {data.at(-1)?.balance >= 0 ? '+' : ''}{cur}{Math.abs(data.at(-1)?.balance || 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Bar Chart ─────────────────────────────────────────────────────

function InteractiveBarChart({ data, cur, onBarClick, label }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return <EmptyState message="No data" />;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);

  return (
    <div>
      {label && <div style={{ fontSize: 9, color: 'var(--txt-muted)', marginBottom: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em' }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, width: '100%', paddingBottom: 28, position: 'relative', overflowX: 'auto' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--border)' }} />
        {data.map((d, i) => {
          const win = d.pnl >= 0;
          const hPct = (Math.abs(d.pnl) / maxAbs) * 46;
          const isHov = hovered === i;
          return (
            <div key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick?.(d)}
              style={{ flex: 1, minWidth: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', position: 'relative', zIndex: 1, cursor: onBarClick ? 'pointer' : 'default', transition: 'opacity 0.15s', opacity: hovered !== null && !isHov ? 0.45 : 1 }}
            >
              {isHov && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap', zIndex: 10, fontSize: 10, fontWeight: 800 }}>
                  <div style={{ color: 'var(--txt-muted)' }}>{d.label}</div>
                  <div style={{ color: win ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)' }}>{win ? '+' : ''}{cur}{Math.abs(d.pnl).toLocaleString()}</div>
                  {d.count && <div style={{ color: 'var(--txt-muted)' }}>{d.count} trades{d.wins !== undefined ? ` · ${Math.round(d.wins / d.count * 100)}%W` : ''}</div>}
                </div>
              )}
              <div style={{ width: '100%', maxWidth: 28, height: `${hPct}%`, background: win ? 'var(--clr-profit)' : 'var(--clr-loss)', borderRadius: win ? '4px 4px 0 0' : '0 0 4px 4px', transform: win ? 'translateY(-50%)' : 'translateY(50%)', opacity: isHov ? 1 : 0.75, transition: 'opacity 0.15s' }} />
              <div style={{ position: 'absolute', bottom: -22, fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      {onBarClick && <div style={{ fontSize: 9, color: 'var(--txt-muted)', textAlign: 'right', marginTop: 4 }}>Click bar to drill down ↓</div>}
    </div>
  );
}

// ─── Full Interactive Calendar ─────────────────────────────────────────────────

function FullCalendar({ dateMap, cur, onDaySelect, selectedDay }) {
  const [viewDate, setViewDate] = useState(new Date());

  const { weeks, monthLabel, year, month } = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const label = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const trades = dateMap?.[dk] || [];
      const pnl = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
      cells.push({ d, dk, trades, pnl: trades.length ? pnl : null });
    }
    const w = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return { weeks: w, monthLabel: label, year: y, month: m };
  }, [viewDate, dateMap]);

  const totalMonthPnl = weeks.flat().filter(c => c?.pnl !== null).reduce((s, c) => s + (c?.pnl || 0), 0);
  const tradingDays = weeks.flat().filter(c => c?.trades?.length > 0).length;
  const maxAbsPnl = Math.max(1, ...weeks.flat().filter(c => c?.pnl !== null).map(c => Math.abs(c?.pnl || 0)));

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setViewDate(new Date());

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={prevMonth} style={{ background: 'var(--bg-bar)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--txt-primary)', fontSize: 14, fontWeight: 800 }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-primary)' }}>{monthLabel}</div>
          <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 2 }}>
            {tradingDays} trading days · <span style={{ color: totalMonthPnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{totalMonthPnl >= 0 ? '+' : ''}{cur}{Math.abs(totalMonthPnl).toLocaleString()}</span>
          </div>
        </div>
        <button onClick={nextMonth} style={{ background: 'var(--bg-bar)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--txt-primary)', fontSize: 14, fontWeight: 800 }}>›</button>
        <button onClick={goToday} style={{ background: 'var(--bg-bar)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--txt-muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>TODAY</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week[di];
              if (!cell) return <div key={di} />;
              const isToday = cell.dk === toDateKey(new Date());
              const isSel = selectedDay === cell.dk;
              const hasTrade = cell.trades.length > 0;
              const intensity = hasTrade ? clamp(Math.abs(cell.pnl) / maxAbsPnl, 0.2, 1) : 0;
              let bg = 'var(--bg-bar)';
              if (hasTrade && cell.pnl !== null) {
                const pct = Math.round(intensity * 55);
                bg = cell.pnl >= 0
                  ? `color-mix(in srgb, var(--clr-profit) ${pct}%, var(--bg-bar))`
                  : `color-mix(in srgb, var(--clr-loss) ${pct}%, var(--bg-bar))`;
              }
              return (
                <div key={di}
                  onClick={() => hasTrade && onDaySelect?.(cell.dk, cell.trades)}
                  style={{
                    background: bg,
                    border: isSel ? '2px solid var(--accent-indian)' : isToday ? '1.5px solid var(--txt-muted)' : '1px solid transparent',
                    borderRadius: 8,
                    padding: '6px 4px',
                    minHeight: 52,
                    cursor: hasTrade ? 'pointer' : 'default',
                    transition: 'transform 0.1s, border 0.1s',
                    transform: isSel ? 'scale(1.04)' : 'scale(1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: isToday ? 'var(--accent-indian)' : 'var(--txt-primary)', textAlign: 'center' }}>{cell.d}</div>
                  {hasTrade && (
                    <>
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800, color: cell.pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', textAlign: 'center', lineHeight: 1.1 }}>
                        {cell.pnl >= 0 ? '+' : ''}{Math.abs(cell.pnl) > 999 ? `${(cell.pnl / 1000).toFixed(1)}k` : Math.round(cell.pnl)}
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--txt-muted)', textAlign: 'center' }}>{cell.trades.length}T</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'color-mix(in srgb, var(--clr-profit) 45%, var(--bg-bar))' }} /><span style={{ fontSize: 9, color: 'var(--txt-muted)' }}>Profit</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'color-mix(in srgb, var(--clr-loss) 45%, var(--bg-bar))' }} /><span style={{ fontSize: 9, color: 'var(--txt-muted)' }}>Loss</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg-bar)', border: '1px solid var(--border)' }} /><span style={{ fontSize: 9, color: 'var(--txt-muted)' }}>No trade</span></div>
        <span style={{ fontSize: 9, color: 'var(--txt-muted)', marginLeft: 'auto' }}>Click day to see trades ↓</span>
      </div>
    </div>
  );
}

// ─── Day Trade Detail Panel ────────────────────────────────────────────────────

function DayDetailPanel({ date, trades, cur, onClose }) {
  if (!trades?.length) return null;
  const total = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const wins = trades.filter(t => Number(t.pnl ?? 0) > 0).length;
  return (
    <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--txt-primary)' }}>{date}</div>
          <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 2 }}>{trades.length} trades · {wins}W {trades.length - wins}L</div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: total >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)' }}>
          {total >= 0 ? '+' : ''}{cur}{Math.abs(total).toLocaleString()}
        </div>
        <button onClick={onClose} style={{ background: 'var(--bg-bar)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'var(--txt-muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {trades.map((t, i) => {
          const pnl = Number(t.pnl ?? 0);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-bar)', borderRadius: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--txt-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.script || t.symbol || 'Trade'}{t.strategy ? ` · ${t.strategy}` : ''}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt-muted)', marginTop: 1 }}>
                  {t.session || ''}{t.emotion ? ` · ${t.emotion}` : ''}{t.grade ? ` · Grade ${t.grade}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {pnl >= 0 ? '+' : ''}{cur}{Math.abs(pnl).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </MotionDiv>
  );
}

// ─── Horizontal Dominance Bar ──────────────────────────────────────────────────

function DominanceBar({ data, cur }) {
  const [hov, setHov] = useState(null);
  if (!data?.length) return <EmptyState message="No data" />;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((item, i) => {
        const win = item.pnl >= 0;
        const pct = (Math.abs(item.pnl) / maxAbs) * 100;
        const wr = item.total ? Math.round(item.wins / item.total * 100) : 0;
        return (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ opacity: hov !== null && hov !== i ? 0.5 : 1, transition: 'opacity 0.15s' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--txt-primary)' }}>{item.name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--txt-muted)' }}>{item.total}T · {wr}%W</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: win ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)' }}>
                  {win ? '+' : ''}{cur}{Math.abs(item.pnl).toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-bar)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: win ? 'var(--clr-profit)' : 'var(--clr-loss)', opacity: 0.8, transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Radar Chart (Trader DNA) ─────────────────────────────────────────────────

function TraderDNA({ stats, advStats }) {
  if (!stats || !advStats) return <EmptyState message="Not enough data" />;

  const wr = Number(stats.winRate) || 0;
  const rr = stats.avgLoss ? Math.abs(stats.avgWin / stats.avgLoss) : 0;
  const pf = Math.min(Number(stats.profitFactor) || 0, 5) / 5 * 100;
  const cons = advStats.weeklyData.length > 1 ? (() => {
    const pnls = advStats.weeklyData.map(w => w.pnl);
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((s, p) => s + (p - avg) ** 2, 0) / pnls.length);
    return clamp(100 - (avg ? Math.abs(std / avg) * 50 : 50), 0, 100);
  })() : 50;
  const disc = clamp(100 - (advStats.dowData.filter(d => d.pnl < 0).length / 7 * 100), 0, 100);
  const exec = clamp(rr * 33, 0, 100);

  const axes = [
    { label: 'Win Rate', val: wr },
    { label: 'R:R', val: exec },
    { label: 'Profit Factor', val: pf },
    { label: 'Consistency', val: cons },
    { label: 'Discipline', val: disc },
    { label: 'Avg Expectancy', val: clamp((stats.expectancy || 0) > 0 ? 70 : 30, 0, 100) },
  ];

  const N = axes.length;
  const cx = 110, cy = 105, R = 80;
  const pts = axes.map((a, i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const r = (a.val / 100) * R;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), lx: cx + (R + 22) * Math.cos(angle), ly: cy + (R + 22) * Math.sin(angle) };
  });
  const gridRings = [0.25, 0.5, 0.75, 1];
  const polyStr = pts.map(p => `${p.x},${p.y}`).join(' ');

  const traderType = wr >= 60 && rr >= 1.5 ? 'Elite Trader' : wr >= 55 ? 'Consistent Scalper' : rr >= 2 ? 'Trend Follower' : cons > 70 ? 'Steady Accumulator' : 'Developing Trader';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: 220 }}>
        {/* Grid rings */}
        {gridRings.map((r, ri) => {
          const gPts = Array.from({ length: N }, (_, i) => {
            const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
            return `${cx + R * r * Math.cos(angle)},${cy + R * r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={ri} points={gPts} fill="none" stroke="var(--border)" strokeWidth="0.5" />;
        })}
        {/* Spokes */}
        {axes.map((_, i) => {
          const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(angle)} y2={cy + R * Math.sin(angle)} stroke="var(--border)" strokeWidth="0.5" />;
        })}
        {/* Data polygon */}
        <polygon points={polyStr} fill="var(--accent-indian)" fillOpacity="0.15" stroke="var(--accent-indian)" strokeWidth="1.5" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent-indian)" />)}
        {/* Labels */}
        {axes.map((a, i) => (
          <text key={i} x={pts[i].lx} y={pts[i].ly} textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight="700" fill="var(--txt-muted)" fontFamily="var(--font-sans)">{a.label}</text>
        ))}
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trader Type</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-indian)', marginTop: 2 }}>{traderType}</div>
      </div>
    </div>
  );
}

// ─── DOW Performance ──────────────────────────────────────────────────────────

function DOWChart({ data, cur }) {
  const [hov, setHov] = useState(null);
  const active = data.filter(d => d.count > 0);
  if (!active.length) return <EmptyState message="No data" />;
  const maxAbs = Math.max(...active.map(d => Math.abs(d.pnl)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {active.map((d, i) => {
        const win = d.pnl >= 0;
        const pct = (Math.abs(d.pnl) / maxAbs) * 100;
        const wr = d.count ? Math.round(d.wins / d.count * 100) : 0;
        return (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: hov !== null && hov !== i ? 0.5 : 1, transition: 'opacity 0.15s' }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--txt-muted)', width: 30, textTransform: 'uppercase' }}>{d.label}</div>
            <div style={{ flex: 1, height: 18, borderRadius: 5, background: 'var(--bg-bar)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', [win ? 'left' : 'right']: 0, height: '100%', width: `${pct}%`, background: win ? 'var(--clr-profit)' : 'var(--clr-loss)', opacity: 0.75, borderRadius: 5, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: win ? 'var(--clr-profit)' : 'var(--clr-loss)', width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {win ? '+' : ''}{cur}{Math.abs(d.pnl) > 999 ? `${(d.pnl / 1000).toFixed(1)}k` : d.pnl.toFixed(0)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--txt-muted)', width: 52 }}>{d.count}T · {wr}%W</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SCard({ title, icon, children, span = 12, accent, action }) {
  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ gridColumn: `span ${span}`, background: 'var(--card-bg)', border: accent ? `1.5px solid ${accent}` : '1px solid var(--card-border)', borderRadius: 24, padding: '20px 24px', backdropFilter: 'blur(24px)' }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
        {title}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </MotionDiv>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsTab({ trades, market }) {
  const isMobile = useMobile();
  const marketCfg = getMarketConfig(market);
  const cur = marketCfg.currencySymbol;

  const marketTrades = useMemo(() => (trades || []).map(t => ({ ...t, pnl: Number(t.pnl ?? t.metrics?.netPnl ?? 0) })), [trades]);
  const stats = useMemo(() => calcStats(marketTrades), [marketTrades]);
  const adv = useAdvancedStats(marketTrades);

  const [timeframe, setTimeframe] = useState('monthly');
  const [drillData, setDrillData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayTrades, setSelectedDayTrades] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDaySelect = useCallback((dk, trades) => {
    setSelectedDay(prev => prev === dk ? null : dk);
    setSelectedDayTrades(prev => prev === trades ? [] : trades);
  }, []);

  const handleBarDrill = useCallback((d) => {
    if (timeframe === 'monthly') {
      const monthTrades = marketTrades.filter(t => new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' }) === d.filterKey);
      const weekly = {};
      monthTrades.forEach(t => {
        const dt = new Date(t.date), day = dt.getDay() || 7;
        const mon = new Date(dt); mon.setDate(dt.getDate() - day + 1);
        const wKey = mon.toISOString().slice(0, 10);
        if (!weekly[wKey]) weekly[wKey] = { label: `${mon.getDate()} ${mon.toLocaleString('default', { month: 'short' })}`, pnl: 0, count: 0, wins: 0, rawDate: mon, filterKey: wKey };
        weekly[wKey].pnl += Number(t.pnl ?? 0); weekly[wKey].count++;
        if (Number(t.pnl ?? 0) > 0) weekly[wKey].wins++;
      });
      setDrillData({ title: `Weekly — ${d.label}`, data: Object.values(weekly).sort((a, b) => a.rawDate - b.rawDate), type: 'week' });
    } else if (timeframe === 'weekly') {
      const weekTrades = marketTrades.filter(t => { const dt = new Date(t.date), day = dt.getDay() || 7; const mon = new Date(dt); mon.setDate(dt.getDate() - day + 1); return mon.toISOString().slice(0, 10) === d.filterKey; });
      const daily = {};
      weekTrades.forEach(t => { const dt = new Date(t.date); const label = `${dt.toLocaleString('default', { weekday: 'short' })} ${dt.getDate()}`; if (!daily[t.date]) daily[t.date] = { label, pnl: 0, count: 0, wins: 0, rawDate: dt, filterKey: t.date }; daily[t.date].pnl += Number(t.pnl ?? 0); daily[t.date].count++; if (Number(t.pnl ?? 0) > 0) daily[t.date].wins++; });
      setDrillData({ title: `Daily — ${d.label}`, data: Object.values(daily).sort((a, b) => a.rawDate - b.rawDate), type: 'day' });
    }
  }, [timeframe, marketTrades]);

  if (!marketTrades.length || !adv) {
    return (
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginTop: 16 }}>No {marketCfg.label} data yet</div>
        <div style={{ fontSize: 13, color: 'var(--txt-sub)', marginTop: 8 }}>Log trades in Journal to unlock Analytics.</div>
      </div>
    );
  }

  const rrNum = stats.avgLoss ? Math.abs(stats.avgWin / stats.avgLoss) : null;
  const tabs = ['overview', 'charts', 'calendar', 'performance'];

  const metricCards = [
    { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 55 ? 'var(--clr-profit)' : 'var(--clr-loss)' },
    { label: 'Profit Factor', value: String(stats.profitFactor), color: Number(stats.profitFactor) >= 1.5 ? 'var(--clr-profit)' : 'var(--clr-loss)' },
    { label: 'Realized R:R', value: rrNum ? `1 : ${rrNum.toFixed(2)}` : '—', color: rrNum >= 1.5 ? 'var(--clr-profit)' : 'var(--clr-loss)' },
    { label: 'Expectancy', value: `${stats.expectancy >= 0 ? '+' : ''}${cur}${Math.abs(stats.expectancy).toLocaleString()}`, color: stats.expectancy >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)' },
    { label: 'Sharpe Ratio', value: adv.sharpe, color: parseFloat(adv.sharpe) >= 1 ? 'var(--clr-profit)' : parseFloat(adv.sharpe) >= 0 ? 'var(--color-amber)' : 'var(--clr-loss)' },
    { label: 'Max Drawdown', value: `-${stats.maxDrawdownPct}%`, color: 'var(--clr-loss)' },
    { label: 'Avg Win', value: `${cur}${stats.avgWin.toLocaleString()}`, color: 'var(--clr-profit)' },
    { label: 'Avg Loss', value: `${cur}${stats.avgLoss.toLocaleString()}`, color: 'var(--clr-loss)' },
    { label: 'Largest Win', value: `${cur}${stats.largestWin.toLocaleString()}`, color: 'var(--clr-profit)' },
    { label: 'Best Day', value: adv.bestDay ? `+${cur}${adv.bestDay[1].toLocaleString()}` : '—', color: 'var(--clr-profit)' },
    { label: 'Worst Day', value: adv.worstDay ? `${cur}${adv.worstDay[1].toLocaleString()}` : '—', color: 'var(--clr-loss)' },
    { label: 'Avg MFE', value: adv.avgMFE !== null ? `${cur}${Math.round(adv.avgMFE).toLocaleString()}` : '—', color: 'var(--clr-profit)' },
  ];

  return (
    <>
      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '7px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', background: activeTab === t ? 'var(--accent-indian)' : 'transparent', color: activeTab === t ? 'var(--btn-solid-text)' : 'var(--txt-muted)', cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.04em', transition: 'all 0.2s' }}
          >{t}</button>
        ))}
        <button onClick={() => exportCSV(marketTrades, market)}
          style={{ marginLeft: 8, padding: '7px 14px', borderRadius: 10, fontSize: 10, fontWeight: 800, border: '1px solid var(--border)', background: 'transparent', color: 'var(--txt-muted)', cursor: 'pointer', letterSpacing: '0.04em' }}>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: isMobile ? 14 : 20 }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && <>
          {/* KPI top row */}
          {[
            { label: 'Win Rate', val: `${stats.winRate}%`, sub: `${stats.winTrades}W · ${stats.lossTrades}L`, color: stats.winRate >= 55 ? 'var(--clr-profit)' : 'var(--clr-loss)', accent: stats.winRate >= 55 ? 'color-mix(in srgb, var(--clr-profit) 15%, transparent)' : null },
            { label: 'Max Drawdown', val: `-${stats.maxDrawdownPct}%`, sub: `${cur}${stats.maxDrawdown.toLocaleString()} peak-to-trough`, color: 'var(--clr-loss)', accent: 'color-mix(in srgb, var(--clr-loss) 10%, transparent)' },
            { label: 'Top Mistake', val: stats.mistakeFrequency?.[0]?.name || 'None!', sub: 'Primary leakage', color: 'var(--color-amber)', accent: 'color-mix(in srgb, var(--color-amber) 8%, var(--bg-bar))' },
            { label: 'Current Streak', val: adv.curStreak === 0 ? '—' : `${adv.curStreak > 0 ? 'WIN' : 'LOSS'} ${Math.abs(adv.curStreak)}`, sub: `Best: ${adv.bestWin}W · ${adv.bestLoss}L`, color: adv.curStreak > 0 ? 'var(--clr-profit)' : adv.curStreak < 0 ? 'var(--clr-loss)' : 'var(--txt-muted)' },
          ].map((c, i) => (
            <SCard key={i} span={isMobile ? 12 : 3} accent={c.accent}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: c.color, lineHeight: 1, fontFamily: 'var(--font-mono)', wordBreak: 'break-word' }}>{c.val}</div>
              <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 6 }}>{c.sub}</div>
            </SCard>
          ))}

          {/* Equity Curve */}
          <SCard title="Equity Curve" icon={<Icons.TrendUp />} span={12}
            action={<div style={{ fontSize: 9, color: 'var(--txt-muted)' }}>Scroll/pinch to zoom · Drag scrollbar</div>}
          >
            <ZoomableEquityCurve data={adv.equityCurve} minEq={adv.minEq} maxEq={adv.maxEq} cur={cur} isMobile={isMobile} />
          </SCard>

          {/* Trader DNA + Metric Matrix */}
          <SCard title="Trader DNA" icon={<Icons.Brain />} span={isMobile ? 12 : 4}>
            <TraderDNA stats={stats} advStats={adv} />
          </SCard>

          <SCard title="Performance Matrix" icon={<Icons.ChartPie />} span={isMobile ? 12 : 8}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
              {metricCards.map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </SCard>
        </>}

        {/* ── CHARTS TAB ── */}
        {activeTab === 'charts' && <>
          <SCard title="Performance Timeline" icon={<Icons.LineChart />} span={12}
            action={
              <div style={{ display: 'flex', background: 'var(--bg-bar)', padding: 3, borderRadius: 8, gap: 2, border: '1px solid var(--border)' }}>
                {['monthly', 'weekly'].map(tf => (
                  <button key={tf} onClick={() => { setTimeframe(tf); setDrillData(null); }}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 800, border: 'none', background: timeframe === tf ? 'var(--card-bg)' : 'transparent', color: timeframe === tf ? 'var(--txt-primary)' : 'var(--txt-muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tf}
                  </button>
                ))}
              </div>
            }
          >
            <InteractiveBarChart
              data={timeframe === 'monthly' ? adv.monthlyData : adv.weeklyData}
              cur={cur} onBarClick={handleBarDrill}
            />
            <AnimatePresence>
              {drillData && (
                <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{drillData.title}</div>
                    <button onClick={() => setDrillData(null)} style={{ marginLeft: 'auto', background: 'var(--bg-bar)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', cursor: 'pointer' }}>Close ×</button>
                  </div>
                  <InteractiveBarChart data={drillData.data} cur={cur}
                    onBarClick={drillData.type === 'week' ? (d) => {
                      const dt = marketTrades.filter(t => t.date === d.filterKey);
                      if (dt.length) { setSelectedDay(d.filterKey); setSelectedDayTrades(dt); setActiveTab('calendar'); }
                    } : null}
                  />
                </MotionDiv>
              )}
            </AnimatePresence>
          </SCard>

          <SCard title="Day of Week Performance" icon={<Icons.LineChart />} span={isMobile ? 12 : 6}>
            <DOWChart data={adv.dowData} cur={cur} />
          </SCard>

          <SCard title="Session Dominance" icon={<Icons.Sun />} span={isMobile ? 12 : 6}>
            <DominanceBar data={adv.topSessions} cur={cur} />
          </SCard>

          <SCard title="Instrument Leaderboard" icon={<Icons.Briefcase />} span={isMobile ? 12 : 6}>
            <DominanceBar data={adv.topInstruments} cur={cur} />
          </SCard>

          <SCard title="Strategy Performance" icon={<Icons.Target />} span={isMobile ? 12 : 6}>
            <DominanceBar data={adv.topStrategies} cur={cur} />
          </SCard>

          {adv.emotions.length > 0 && (
            <SCard title="Psychology vs P&L" icon={<Icons.Brain />} span={12}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {adv.emotions.map((e, i) => {
                  const CLRS = { fear: 'var(--clr-loss)', greed: 'var(--color-amber)', fomo: 'var(--color-purple)', calm: 'var(--clr-profit)', revenge: 'var(--color-red)', neutral: 'var(--txt-muted)' };
                  const clr = CLRS[e.name] || 'var(--accent-indian)';
                  const wr = e.count ? Math.round(e.wins / e.count * 100) : 0;
                  return (
                    <div key={i} style={{ background: 'var(--bg-bar)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: clr, flexShrink: 0 }} />
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--txt-primary)', textTransform: 'capitalize' }}>{e.name}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: e.pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)', fontFamily: 'var(--font-mono)' }}>
                        {e.pnl >= 0 ? '+' : ''}{cur}{Math.abs(e.pnl).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt-muted)', marginTop: 2 }}>{e.count}T · {wr}%W</div>
                    </div>
                  );
                })}
              </div>
            </SCard>
          )}
        </>}

        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && <>
          <SCard title="Interactive Trading Calendar" icon={<Icons.Book />} span={12}>
            <FullCalendar dateMap={adv.dateMap} cur={cur} onDaySelect={handleDaySelect} selectedDay={selectedDay} />
            <AnimatePresence>
              {selectedDay && selectedDayTrades.length > 0 && (
                <DayDetailPanel date={selectedDay} trades={selectedDayTrades} cur={cur} onClose={() => { setSelectedDay(null); setSelectedDayTrades([]); }} />
              )}
            </AnimatePresence>
          </SCard>

          {/* Streak tracker */}
          <SCard title="Streak Tracker" icon={<Icons.Target />} span={isMobile ? 12 : 4}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: adv.curStreak > 0 ? 'color-mix(in srgb, var(--clr-profit) 12%, transparent)' : adv.curStreak < 0 ? 'color-mix(in srgb, var(--clr-loss) 12%, transparent)' : 'var(--bg-bar)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Current Streak</div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1, color: adv.curStreak > 0 ? 'var(--clr-profit)' : adv.curStreak < 0 ? 'var(--clr-loss)' : 'var(--txt-muted)' }}>
                  {adv.curStreak === 0 ? '—' : `${adv.curStreak > 0 ? '+' : ''}${adv.curStreak}`}
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 4 }}>{adv.curStreak > 0 ? 'Winning' : adv.curStreak < 0 ? 'Losing' : 'No trades'} streak</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'color-mix(in srgb, var(--clr-profit) 10%, transparent)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--clr-profit)', textTransform: 'uppercase', marginBottom: 4 }}>Best Win</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--clr-profit)', fontFamily: 'var(--font-mono)' }}>{adv.bestWin}</div>
                </div>
                <div style={{ background: 'color-mix(in srgb, var(--clr-loss) 10%, transparent)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--clr-loss)', textTransform: 'uppercase', marginBottom: 4 }}>Max Loss</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--clr-loss)', fontFamily: 'var(--font-mono)' }}>{adv.bestLoss}</div>
                </div>
              </div>
            </div>
          </SCard>

          <SCard title="60-Day Heatmap" icon={<Icons.Book />} span={isMobile ? 12 : 8}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {adv.heatmap.map((d, i) => {
                const hasTrade = d.count > 0;
                const intensity = hasTrade ? clamp(Math.abs(d.pnl) / adv.hmMax, 0.2, 1) : 0;
                let bg = 'var(--bg-bar)';
                if (hasTrade && d.pnl !== null) {
                  const pct = Math.round(intensity * 60);
                  bg = d.pnl >= 0 ? `color-mix(in srgb, var(--clr-profit) ${pct}%, var(--bg-bar))` : `color-mix(in srgb, var(--clr-loss) ${pct}%, var(--bg-bar))`;
                }
                return (
                  <div key={i} title={`${d.date}${d.pnl !== null ? `: ${d.pnl >= 0 ? '+' : ''}${d.pnl?.toFixed(0)}` : ' (no trades)'}`}
                    onClick={() => hasTrade && handleDaySelect(d.date, d.trades)}
                    style={{ width: 18, height: 18, borderRadius: 4, background: bg, cursor: hasTrade ? 'pointer' : 'default', transition: 'transform 0.1s', border: selectedDay === d.date ? '2px solid var(--accent-indian)' : '1px solid transparent' }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              {['Profit', 'Loss', 'No trade'].map((l, i) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: i === 0 ? 'color-mix(in srgb, var(--clr-profit) 50%, var(--bg-bar))' : i === 1 ? 'color-mix(in srgb, var(--clr-loss) 50%, var(--bg-bar))' : 'var(--bg-bar)', border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: 9, color: 'var(--txt-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </SCard>
        </>}

        {/* ── PERFORMANCE TAB ── */}
        {activeTab === 'performance' && <>
          <SCard title="Full Performance Matrix" icon={<Icons.ChartPie />} span={12}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 20 }}>
              {metricCards.map(m => (
                <div key={m.label} style={{ background: 'var(--bg-bar)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </SCard>

          <SCard title="Trader DNA Fingerprint" icon={<Icons.Brain />} span={isMobile ? 12 : 5}>
            <TraderDNA stats={stats} advStats={adv} />
          </SCard>

          <SCard title="Day of Week Deep Dive" icon={<Icons.LineChart />} span={isMobile ? 12 : 7}>
            <DOWChart data={adv.dowData} cur={cur} />
          </SCard>

          <SCard title="All Instruments" icon={<Icons.Briefcase />} span={isMobile ? 12 : 6}>
            <DominanceBar data={adv.topInstruments} cur={cur} />
          </SCard>

          <SCard title="All Strategies" icon={<Icons.Target />} span={isMobile ? 12 : 6}>
            <DominanceBar data={adv.topStrategies} cur={cur} />
          </SCard>

          <SCard title="All Sessions" icon={<Icons.Sun />} span={12}>
            <DominanceBar data={adv.topSessions} cur={cur} />
          </SCard>
        </>}

      </div>
    </>
  );
}
