// src/components/dashboard/JournalTab.jsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketConfig } from '../../utils/tradeConstants';
import CSVDropZone from './CSVDropZone';

/* ─────────────────────────────────────────────────────────────────────
   CUSTOM SELECT DROPDOWN
───────────────────────────────────────────────────────────────────── */
const CustomSelect = ({ value, onChange, options, placeholder, isFilter = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selObj = options.find(o => (o.value || o) === value);
  const label = selObj ? (selObj.label || selObj) : placeholder;

  return (
    <div className="relative shrink-0" ref={ref} style={{ minWidth: isFilter ? '130px' : '100%', zIndex: isOpen ? 50 : 1 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 cursor-pointer transition-all duration-300 ${
          isFilter 
            ? 'bg-[var(--card-bg)] border rounded-xl px-3 py-2 text-[10px] sm:text-xs font-bold hover:border-[var(--accent-indian)] hover:shadow-[0_0_10px_rgba(99,102,241,0.1)]'
            : 'w-full bg-[var(--bar-bg)] border rounded-xl px-4 py-3 text-sm hover:border-[var(--accent-indian)] shadow-inner'
        } ${isOpen ? 'border-[var(--accent-indian)] shadow-[0_0_10px_rgba(99,102,241,0.15)]' : 'border-[var(--nav-border)]'}`}
      >
        <span className={value ? 'text-[var(--txt-name)] font-bold truncate' : 'text-[var(--txt-muted)] truncate'}>{label}</span>
        <i className={`fa-solid fa-chevron-down text-[9px] text-[var(--txt-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--accent-indian)]' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-full mt-2 bg-[var(--card-bg)] border border-[var(--nav-border)] rounded-xl shadow-2xl max-h-48 overflow-y-auto rb-scrollbar backdrop-blur-xl"
          >
            <div 
              className={`px-4 py-2.5 cursor-pointer transition-colors text-[var(--txt-muted)] hover:bg-[var(--bar-bg)] ${isFilter ? 'text-[10px]' : 'text-xs sm:text-sm'}`}
              onClick={() => { onChange(''); setIsOpen(false); }}
            >
              {placeholder}
            </div>
            {options.map(opt => {
              const val = opt.value || opt;
              const lbl = opt.label || opt;
              const active = value === val;
              return (
                <div 
                  key={val} 
                  onClick={() => { onChange(val); setIsOpen(false); }}
                  className={`px-4 py-2.5 cursor-pointer transition-colors ${isFilter ? 'text-[10px]' : 'text-xs sm:text-sm'} ${active ? 'text-[var(--accent-indian)] font-black bg-[var(--accent-indian-dim)]' : 'rb-txt-name hover:bg-[var(--bar-bg)] font-bold'}`}
                >
                  {lbl}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   CUSTOM DATE PICKER
───────────────────────────────────────────────────────────────────── */
const CustomDatePicker = ({ value, onChange }) => {
  const inputRef = useRef(null);
  
  const openPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={openPicker}
        className="flex items-center justify-between w-full bg-[var(--bar-bg)] border border-[var(--nav-border)] rounded-xl px-4 py-3 text-sm hover:border-[var(--accent-indian)] transition-all duration-300 cursor-pointer shadow-inner focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)] focus-within:border-[var(--accent-indian)]"
      >
        <span className={value ? 'text-[var(--txt-name)] font-bold' : 'text-[var(--txt-muted)]'}>
          {value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}
        </span>
        <i className="fa-regular fa-calendar text-[var(--accent-indian)]" />
      </div>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────────── */
function computeStreak(entries) {
  const sorted = [...entries].filter(e => e.metrics && e.script !== 'NO_TRADE').sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!sorted.length) return { current: 0, best: 0, worst: 0 };
  let cur = 0, best = 0, worst = 0, streak = 0, lastRes = null;
  sorted.forEach(e => {
    const res = e.metrics.netPnl >= 0 ? 'W' : 'L';
    if (res === lastRes) streak++; else { streak = 1; lastRes = res; }
    if (res === 'W') { if (streak > best) best = streak; cur = streak; }
    else { if (streak > worst) worst = streak; cur = -streak; }
  });
  return { current: cur, best, worst };
}

function PsychStats({ entries }) {
  const data = useMemo(() => {
    const moodMap = {};
    entries.forEach(e => {
      if (!e.emotion || e.script === 'NO_TRADE') return;
      if (!moodMap[e.emotion]) moodMap[e.emotion] = { count: 0, pnl: 0 };
      moodMap[e.emotion].count++;
      moodMap[e.emotion].pnl += e.metrics?.netPnl || 0;
    });
    return Object.entries(moodMap).sort((a, b) => b[1].count - a[1].count);
  }, [entries]);

  const mistakeMap = useMemo(() => {
    const m = {};
    entries.forEach(e => (e.mistakes || []).filter(x => x !== 'None').forEach(mk => { m[mk] = (m[mk] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [entries]);

  if (!data.length && !mistakeMap.length) return null;

  return (
    <div className="h-full bg-[var(--card-bg)] rounded-3xl p-5 sm:p-6 border border-[var(--nav-border)] shadow-sm flex flex-col">
      <div className="text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-[0.2em] flex items-center gap-2 mb-4 shrink-0">
        <i className="fa-solid fa-brain text-[var(--accent-indian)]" /> Psychology & Mistakes
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {data.length > 0 && (
          <div>
            <div className="text-[9px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-3">Mood vs P&L</div>
            <div className="space-y-2.5">
              {data.slice(0, 4).map(([mood, s]) => {
                const moodObj = MOODS.find(m => m.value === mood);
                return (
                  <div key={mood} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--txt-muted)] w-16 sm:w-20 truncate">{moodObj?.label || mood}</span>
                    <div className="flex-1 h-2 bg-[var(--bar-bg)] rounded-full overflow-hidden shadow-inner">
                      <div style={{ width: `${Math.min(100, s.count * 20)}%`, background: s.pnl >= 0 ? 'var(--clr-profit)' : 'var(--clr-loss)' }} className="h-full rounded-full" />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-black rb-mono w-16 text-right ${s.pnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
                      {s.pnl >= 0 ? '+' : ''}{Math.round(s.pnl).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {mistakeMap.length > 0 && (
          <div>
            <div className="text-[9px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-3">Top Errors Logged</div>
            <div className="space-y-2.5">
              {mistakeMap.map(([mk, cnt]) => (
                <div key={mk} className="flex items-center justify-between p-2.5 bg-[var(--clr-loss-dim)] border border-[var(--clr-loss)]/20 rounded-xl">
                  <span className="text-[10px] sm:text-xs font-bold text-[var(--clr-loss)] truncate flex-1 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-[10px]" /> {mk}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black rb-mono text-[var(--clr-loss)] bg-[var(--bg)] px-2 py-1 rounded-lg">{cnt}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreakBanner({ entries }) {
  const { current, best, worst } = computeStreak(entries);
  if (!entries.filter(e => e.metrics && e.script !== 'NO_TRADE').length) return null;
  const isWin = current > 0;
  const abs = Math.abs(current);
  return (
    <div className={`h-full flex flex-col justify-center items-center gap-6 sm:gap-8 p-6 sm:p-8 rounded-3xl border transition-all duration-500 shadow-lg ${isWin ? 'bg-[var(--clr-profit-dim)] border-[var(--clr-profit)]/30' : abs > 0 ? 'bg-[var(--clr-loss-dim)] border-[var(--clr-loss)]/30' : 'bg-[var(--bar-bg)] border-[var(--nav-border)]'}`}>
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isWin ? 'bg-[var(--clr-profit)]/20' : abs > 0 ? 'bg-[var(--clr-loss)]/20' : 'bg-[var(--nav-border)]'}`}>
           <i className={`fa-solid text-xl ${isWin ? 'fa-fire text-[var(--clr-profit)]' : abs > 0 ? 'fa-skull text-[var(--clr-loss)]' : 'fa-minus text-[var(--txt-muted)]'}`} />
        </div>
        <div>
          <div className="text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-[0.2em] mb-1">Current Streak</div>
          <div className={`text-3xl font-black rb-mono leading-none ${isWin ? 'text-[var(--clr-profit)]' : abs > 0 ? 'text-[var(--clr-loss)]' : 'text-[var(--txt-muted)]'}`}>
            {abs === 0 ? 'None' : `${abs} ${isWin ? 'WIN' : 'LOSS'}`}
          </div>
        </div>
      </div>
      
      <div className="w-full h-px bg-[var(--txt-muted)]/20" />
      
      <div className="flex w-full justify-around">
        <div className="text-center">
          <div className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-1">Best Run</div>
          <div className="text-xl font-black text-[var(--clr-profit)] rb-mono">{best}W</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-1">Worst Run</div>
          <div className="text-xl font-black text-[var(--clr-loss)] rb-mono">{worst}L</div>
        </div>
      </div>
    </div>
  );
}

const MOODS = [
  { value: 'focused',    label: 'Focused',   color: 'var(--clr-profit)' },
  { value: 'confident',  label: 'Confident', color: 'var(--accent-indian)' },
  { value: 'neutral',    label: 'Neutral',   color: 'var(--txt-muted)' },
  { value: 'anxious',    label: 'Anxious',   color: 'var(--color-amber)' },
  { value: 'fomo',       label: 'FOMO',      color: 'var(--color-amber)' },
  { value: 'revenge',    label: 'Revenge',   color: 'var(--clr-loss)' },
  { value: 'overtraded', label: 'Overtrade', color: 'var(--clr-loss)' },
];

const SESSIONS_INDIAN = ['Pre-Market', 'Opening (9:15–10)', 'Mid-Session', 'Afternoon', 'Closing', 'Post-Market'];
const SESSIONS_GLOBAL = ['Asian Session', 'London Session', 'New York Session', 'Weekend', 'Other'];
const SETUPS = ['Breakout', 'Breakdown', 'Reversal', 'Gap Up', 'Gap Down', 'Support Bounce', 'Resistance Rejection', 'Trend Follow', 'Range Trade', 'News Play', 'Options Strategy', 'Other'];
const MISTAKES = ['No Stop Loss', 'Moved SL', 'Early Exit', 'Late Entry', 'Revenge Trade', 'Oversize Position', 'Ignored Plan', 'Chased Price', 'FOMO Entry', 'No Setup', 'None'];
const RULE_OPTIONS = ['Followed Rules', 'Broke Rules', 'Partial'];

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  session: '', script: '', setup: '', direction: '',
  entryPrice: '', exitPrice: '', stopLoss: '', target: '',
  quantity: '', charges: '', emotion: '', mistakes: [],
  ruleFollowed: '', screenshot: '', notes: '', rating: 0,
};

const calcMetrics = (f) => {
  const entry = parseFloat(f.entryPrice), exit = parseFloat(f.exitPrice), qty = parseFloat(f.quantity);
  const sl = parseFloat(f.stopLoss), tgt = parseFloat(f.target), charge = parseFloat(f.charges) || 0;
  if (!entry || !exit || !qty) return null;
  const isLong = f.direction === 'LONG';
  const grossPnl = isLong ? (exit - entry) * qty : (entry - exit) * qty;
  const netPnl = grossPnl - charge;
  const pnlPct = (grossPnl / (entry * qty)) * 100;
  const risk = sl ? Math.abs(entry - sl) * qty : null;
  const reward = tgt ? Math.abs(tgt - entry) * qty : null;
  const rr = risk && reward ? (reward / risk).toFixed(2) : null;
  return { grossPnl, netPnl, pnlPct, risk, reward, rr, charge };
};


const fmtMoney = (val, cur) => {
  const v = Number(val) || 0;
  const abs = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v >= 0 ? '+' : '−'}${cur}${abs}`;
};

const inputCls = 'w-full bg-[var(--bar-bg)] border border-[var(--nav-border)] rounded-xl px-4 py-3 text-sm rb-txt-name outline-none focus:border-[var(--accent-indian)] transition-colors shadow-inner placeholder:text-[var(--txt-muted)] focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]';

const Field = ({ label, required, hint, children }) => (
  <div className="flex flex-col gap-1.5 relative">
    <label className="text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-[0.15em]">
      {label}{required && <span className="text-[var(--clr-loss)] ml-0.5">*</span>}
    </label>
    {children}
    {hint && <span className="text-[9px] text-[var(--txt-muted)] font-bold">{hint}</span>}
  </div>
);

const CardSection = ({ title, icon, children }) => (
  <div className="bg-[var(--card-bg)] rounded-3xl p-5 sm:p-7 border border-[var(--nav-border)] shadow-sm space-y-5 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-indian)] to-transparent opacity-50" />
    <h4 className="flex items-center gap-2 text-sm font-black rb-txt-name uppercase tracking-widest pb-3 border-b border-[var(--nav-border)]">
      <i className={`fa-solid ${icon} text-[var(--accent-indian)]`} />{title}
    </h4>
    {children}
  </div>
);

const PillSelect = ({ options, value, onChange, multi = false, getColor }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const v = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const active = multi ? (value || []).includes(v) : value === v;
      const color = getColor ? getColor(opt) : null;
      return (
        <button key={v} type="button" onClick={() => {
            if (multi) { const arr = value || []; onChange(active ? arr.filter(x => x !== v) : [...arr, v]); }
            else { onChange(active ? '' : v); }
          }}
          style={active && color ? { borderColor: color, color, background: `${color}18` } : {}}
          className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide border transition-all duration-300 ${
            active && !color ? 'bg-[var(--accent-indian)] text-white border-[var(--accent-indian)] shadow-md shadow-[var(--accent-indian)]/20 scale-105' : !active ? 'border-[var(--nav-border)] text-[var(--txt-muted)] bg-[var(--bar-bg)] hover:text-[var(--txt-name)] hover:border-[var(--accent-indian)] hover:bg-[var(--accent-indian-dim)]' : ''
          }`}>{label}</button>
      );
    })}
  </div>
);

const StarRating = ({ value, onChange }) => (
  <div className="flex items-center gap-2 bg-[var(--bar-bg)] w-max px-4 py-2 rounded-xl border border-[var(--nav-border)]">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)} className={`text-xl transition-all hover:scale-125 leading-none ${n <= value ? 'text-[var(--color-amber)] drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-[var(--nav-border)] hover:text-[var(--color-amber)]/50'}`}><i className="fa-solid fa-star" /></button>
    ))}
    {value > 0 && <span className="text-[10px] text-[var(--txt-name)] font-black uppercase ml-2 tracking-wider">{['', 'Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][value]}</span>}
  </div>
);

const StatsBar = ({ entries, cur }) => {
  const s = useMemo(() => {
    const wm = entries.filter(e => e.metrics && e.script !== 'NO_TRADE');
    const wins = wm.filter(e => e.metrics.netPnl >= 0);
    const losses = wm.filter(e => e.metrics.netPnl < 0);
    const total = wm.reduce((a, e) => a + e.metrics.netPnl, 0);
    const avgW = wins.length ? wins.reduce((a, e) => a + e.metrics.netPnl, 0) / wins.length : 0;
    const avgL = losses.length ? losses.reduce((a, e) => a + e.metrics.netPnl, 0) / losses.length : 0;
    const wr = wm.length ? (wins.length / wm.length) * 100 : 0;
    const rrArr = wm.filter(e => e.metrics.rr);
    const avgRR = rrArr.length ? rrArr.reduce((a, e) => a + parseFloat(e.metrics.rr), 0) / rrArr.length : 0;
    return { count: entries.length, wins: wins.length, losses: losses.length, total, avgW, avgL, wr, avgRR };
  }, [entries]);

  const cols = [
    { label: 'Trades', val: s.count, fmt: v => v, pos: null },
    { label: 'Win Rate', val: s.wr, fmt: v => `${v.toFixed(1)}%`, pos: s.wr >= 50 },
    { label: 'Net P&L', val: s.total, fmt: v => fmtMoney(v, cur), pos: s.total >= 0 },
    { label: 'Avg Win', val: s.avgW, fmt: v => `+${cur}${v.toFixed(0)}`, pos: true },
    { label: 'Avg Loss', val: s.avgL, fmt: v => `${cur}${Math.abs(v).toFixed(0)}`, pos: false },
    { label: 'Avg R:R', val: s.avgRR, fmt: v => v ? `1:${v.toFixed(2)}` : '—', pos: s.avgRR >= 1.5 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cols.map(({ label, val, fmt, pos }) => (
        <div key={label} className="relative bg-[var(--card-bg)] p-4 sm:p-5 rounded-3xl border border-[var(--nav-border)] shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[var(--accent-indian)] transition-all duration-300 group overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-indian)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="text-[9px] sm:text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-[0.2em] mb-1.5 z-10">{label}</div>
          <div className={`text-lg sm:text-2xl font-black rb-mono z-10 ${pos === null ? 'rb-txt-name' : pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
            {fmt(val)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   JOURNAL FORM
───────────────────────────────────────────────────────────────────── */
const JournalForm = ({ initial, onSave, onCancel, cur, saving, importing, market, onCsvImport }) => {
  const [form, setForm] = useState(() => initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM });
  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => set('screenshot', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.date || !form.script.trim()) return;
    const metrics = calcMetrics(form);
    onSave({
      ...form,
      script: form.script.trim().toUpperCase(),
      strategy: form.setup || 'Manual',
      pnl: metrics?.netPnl || 0,
      metrics,
      savedAt: new Date().toISOString(),
    });
  };

  const handleNoTradeDay = () => {
    onSave({
      date: form.date || new Date().toISOString().slice(0, 10),
      script: 'NO_TRADE',
      setup: 'No Trading Day',
      strategy: 'Discipline Maintained',
      direction: 'NONE',
      notes: 'No trading day. Maintained discipline and protected capital.',
      emotion: 'neutral',
      rating: 5,
      pnl: 0,
      metrics: { netPnl: 0, grossPnl: 0, pnlPct: 0, charge: 0 },
      savedAt: new Date().toISOString()
    });
  };

  const sessionsList = market === 'global' ? SESSIONS_GLOBAL : SESSIONS_INDIAN;

  return (
    <div className="space-y-6 animate-fade-in-up relative rounded-3xl">
      
      {importing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-[var(--bg)]/50 backdrop-blur-md">
          <div className="text-center animate-fade-in scale-110">
            <div className="w-16 h-12 border-4 border-[var(--accent-indian)] rounded-md relative mx-auto mb-5 shadow-[0_0_20px_rgba(99,102,241,0.4)]" 
                 style={{ animation: 'flip 1.5s infinite ease-in-out', perspective: '1000px' }}>
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[var(--accent-indian)]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--txt-name)]">Parsing Engine Active...</h3>
            <style>{`@keyframes flip { 0% { transform: rotateY(0); } 50% { transform: rotateY(-180deg); } 100% { transform: rotateY(-360deg); } }`}</style>
          </div>
        </div>
      )}

      {!initial && (
        <div className="mb-8">
          <CSVDropZone market={market} onImport={(rows) => onCsvImport(rows, 'journal-dropzone')} />
        </div>
      )}

      <CardSection title="Manual Trade Entry" icon="fa-crosshairs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Date" required>
            <CustomDatePicker value={form.date} onChange={v => set('date', v)} />
          </Field>
          <Field label="Instrument / Script" required>
            <input type="text" value={form.script} placeholder={market === 'global' ? "e.g. BTCUSDT, ETH" : "e.g. RELIANCE, NIFTY"}
              onChange={e => set('script', e.target.value.toUpperCase())} className={inputCls} />
          </Field>
          <Field label="Session">
            <CustomSelect 
              value={form.session} 
              onChange={v => set('session', v)} 
              options={sessionsList} 
              placeholder="Select session" 
            />
          </Field>
        </div>

        <Field label="Direction" required>
          <div className="flex gap-4 mt-2">
            {['LONG', 'SHORT'].map(d => (
              <button key={d} type="button" onClick={() => set('direction', d)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-black tracking-widest border transition-all duration-300 ${
                  form.direction === d
                    ? d === 'LONG' ? 'bg-[var(--clr-profit)] text-white border-[var(--clr-profit)] shadow-[0_4px_15px_rgba(34,197,94,0.3)] scale-[1.02]' : 'bg-[var(--clr-loss)] text-white border-[var(--clr-loss)] shadow-[0_4px_15px_rgba(239,68,68,0.3)] scale-[1.02]'
                    : 'border-[var(--nav-border)] text-[var(--txt-muted)] bg-[var(--bar-bg)] hover:border-[var(--txt-name)] hover:bg-[var(--card-bg)]'
                }`}>{d}</button>
            ))}
          </div>
        </Field>

        <Field label="Setup / Pattern">
          <PillSelect options={SETUPS} value={form.setup} onChange={v => set('setup', v)} />
        </Field>
      </CardSection>

      <CardSection title="Price Details" icon="fa-indian-rupee-sign">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { k: 'entryPrice', label: 'Entry Price', req: true },
            { k: 'exitPrice', label: 'Exit Price', req: true },
            { k: 'stopLoss', label: 'Stop Loss' },
            { k: 'target', label: 'Target' },
            { k: 'quantity', label: 'Qty', req: true },
          ].map(({ k, label, req }) => (
            <Field key={k} label={label} required={req}>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={form[k]} onChange={e => set(k, e.target.value)} className={inputCls} />
            </Field>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-5 items-end mt-4">
          <Field label="Brokerage + Taxes">
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.charges} onChange={e => set('charges', e.target.value)} className={`${inputCls} w-full sm:w-40`} />
          </Field>
          <div className="flex-1 w-full">
            {calcMetrics(form) && (
              <div className="bg-[var(--bar-bg)] rounded-2xl p-4 border border-[var(--nav-border)] flex items-center justify-between shadow-inner">
                <div className="flex gap-6 sm:gap-10">
                   <div>
                      <div className="text-[9px] text-[var(--txt-muted)] font-black uppercase tracking-widest mb-1">Net P&L</div>
                      <div className={`text-lg sm:text-xl font-black rb-mono ${calcMetrics(form).netPnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
                         {fmtMoney(calcMetrics(form).netPnl, cur)}
                      </div>
                   </div>
                   <div>
                      <div className="text-[9px] text-[var(--txt-muted)] font-black uppercase tracking-widest mb-1">Risk:Reward</div>
                      <div className="text-sm sm:text-base font-black rb-mono rb-txt-name mt-1">
                         {calcMetrics(form).rr ? `1 : ${calcMetrics(form).rr}` : '—'}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardSection>

      <CardSection title="Psychology & Review" icon="fa-brain">
        <Field label="Emotional State Before Trade">
          <PillSelect options={MOODS} value={form.emotion} onChange={v => set('emotion', v)} getColor={opt => opt.color} />
        </Field>
        <Field label="Mistakes Made">
          <PillSelect options={MISTAKES} value={form.mistakes} onChange={v => set('mistakes', v)} multi />
        </Field>
        <Field label="Rules Followed?">
          <PillSelect options={RULE_OPTIONS} value={form.ruleFollowed} onChange={v => set('ruleFollowed', v)} />
        </Field>
        <Field label="Trade Quality (self rating)">
          <StarRating value={form.rating} onChange={v => set('rating', v)} />
        </Field>
      </CardSection>

      <CardSection title="Notes & Chart" icon="fa-note-sticky">
        <Field label="Observations / Learnings">
          <textarea rows={4} value={form.notes} placeholder="What was the thesis? What went right / wrong?" onChange={e => set('notes', e.target.value)} className={`${inputCls} resize-none rounded-2xl`} />
        </Field>
        <Field label="Chart Screenshot">
          <div className="flex items-center gap-4 flex-wrap mt-2">
            <label className="cursor-pointer flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-[var(--nav-border)] bg-[var(--bar-bg)] rb-txt-name text-xs font-bold hover:border-[var(--accent-indian)] transition-colors">
              <i className="fa-solid fa-upload text-[var(--accent-indian)]" />{form.screenshot ? 'Change Image' : 'Upload Screenshot'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            {form.screenshot && (
              <div className="relative group">
                <img src={form.screenshot} alt="preview" className="h-16 rounded-xl border border-[var(--nav-border)] object-cover shadow-sm group-hover:opacity-50 transition-opacity" />
                <button type="button" onClick={() => set('screenshot', '')} className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-[var(--clr-loss)] text-white text-xs flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><i className="fa-solid fa-trash" /></button>
              </div>
            )}
          </div>
        </Field>
      </CardSection>

      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4">
        <button onClick={handleNoTradeDay} disabled={saving || importing}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-[var(--nav-border)] bg-[var(--bar-bg)] rb-txt-name text-sm font-bold hover:bg-[var(--card-bg)] hover:border-[var(--accent-indian)] transition-colors flex justify-center items-center gap-2 shadow-sm">
          <i className="fa-solid fa-bed text-[var(--accent-indian)]" /> Mark No Trading Day
        </button>
        
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl border border-[var(--nav-border)] rb-txt-name text-sm font-bold hover:bg-[var(--bar-bg)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.date || !form.script.trim() || saving || importing}
            className="flex-2 sm:flex-none px-8 py-3.5 rounded-2xl bg-[var(--accent-indian)] text-white text-sm font-black shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 tracking-wide">
            <i className="fa-solid fa-floppy-disk" />{saving ? 'Saving...' : form.id ? 'Update Trade' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   ENTRY CARD (collapsible) - WITH CRASH FIXES
───────────────────────────────────────────────────────────────────── */
const EntryCard = ({ entry, cur, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const m = entry.metrics || {}; // Safe fallback
  const mood = MOODS.find(x => x.value === entry.emotion);
  const isNoTrade = entry.script === 'NO_TRADE';

  return (
    <div className={`bg-[var(--card-bg)] rounded-3xl border transition-all duration-300 group overflow-hidden ${open ? 'border-[var(--nav-border)] shadow-xl' : 'border-[var(--nav-border)]/50 shadow-sm hover:border-[var(--accent-indian)] hover:shadow-md'}`}>
      <div className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer select-none" onClick={() => setOpen(p => !p)}>
        <div className="text-center shrink-0 w-12 bg-[var(--bar-bg)] rounded-xl py-2">
          <div className="text-[9px] font-black text-[var(--txt-muted)] uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
          <div className="text-xl font-black rb-txt-name leading-none mt-1">{new Date(entry.date).getDate()}</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="rb-txt-name font-black text-sm sm:text-base tracking-wide">
              {isNoTrade ? 'No Trading Day' : entry.script || 'Unnamed'}
            </span>
            {entry.direction && !isNoTrade && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border tracking-wider ${entry.direction === 'LONG' ? 'bg-[var(--clr-profit-dim)] text-[var(--clr-profit)] border-[var(--clr-profit-dim)]' : 'bg-[var(--clr-loss-dim)] text-[var(--clr-loss)] border-[var(--clr-loss-dim)]'}`}>
                {entry.direction}
              </span>
            )}
            {entry.setup && !isNoTrade && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--bar-bg)] border border-[var(--nav-border)] text-[var(--txt-muted)]">{entry.setup}</span>}
          </div>
          <div className="text-[10px] sm:text-xs text-[var(--txt-muted)] font-medium">
            {isNoTrade ? 'Capital Protected. Discipline Maintained.' : [entry.session, entry.quantity && `Qty ${entry.quantity}`, mood && mood.label].filter(Boolean).join(' • ')}
          </div>
        </div>
        {!isNoTrade && (
          <div className={`text-right shrink-0 rb-mono font-black text-base sm:text-lg ${m.netPnl >= 0 ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>
            {fmtMoney(m.netPnl, cur)}
          </div>
        )}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bar-bg)] transition-transform duration-300 ml-1 sm:ml-4 shrink-0 group-hover:bg-[var(--accent-indian-dim)] ${open ? 'rotate-180' : ''}`}>
           <i className={`fa-solid fa-chevron-down text-[10px] ${open ? 'text-[var(--accent-indian)]' : 'text-[var(--txt-muted)]'}`} />
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--nav-border)] p-4 sm:p-6 bg-[var(--bg)]/30 space-y-5">
          {!isNoTrade && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Gross', val: fmtMoney(m.grossPnl, cur), pos: (m.grossPnl || 0) >= 0 },
                  { label: 'Net P&L', val: fmtMoney(m.netPnl, cur), pos: (m.netPnl || 0) >= 0 },
                  // CRASH FIX: Safe check for pnlPct
                  { label: 'P&L %', val: m.pnlPct != null ? `${m.pnlPct >= 0 ? '+' : ''}${Number(m.pnlPct).toFixed(2)}%` : '—', pos: (m.pnlPct || 0) >= 0 },
                  // CRASH FIX: Safe check for rr
                  { label: 'R:R', val: m.rr ? `1 : ${m.rr}` : '—', pos: parseFloat(m.rr || 0) >= 2 },
                ].map(({ label, val, pos }) => (
                  <div key={label} className="bg-[var(--bar-bg)] rounded-2xl p-3 border border-[var(--nav-border)] text-center shadow-inner">
                    <div className="text-[9px] text-[var(--txt-muted)] font-black uppercase tracking-widest mb-1.5">{label}</div>
                    <div className={`text-sm font-black rb-mono ${pos ? 'text-[var(--clr-profit)]' : 'text-[var(--clr-loss)]'}`}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {[
                  { label: 'Entry', val: entry.entryPrice ? `${cur}${entry.entryPrice}` : '—' },
                  { label: 'Exit', val: entry.exitPrice ? `${cur}${entry.exitPrice}` : '—' },
                  { label: 'SL', val: entry.stopLoss ? `${cur}${entry.stopLoss}` : '—' },
                  { label: 'Target', val: entry.target ? `${cur}${entry.target}` : '—' },
                  { label: 'Qty', val: entry.quantity || '—' },
                  { label: 'Charges', val: entry.charges ? `${cur}${entry.charges}` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-[var(--card-bg)] rounded-xl p-2.5 border border-[var(--nav-border)] text-center">
                    <div className="text-[8px] sm:text-[9px] text-[var(--txt-muted)] font-black uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-[11px] sm:text-xs rb-txt-name font-bold rb-mono">{val}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(entry.mistakes?.length > 0 || entry.ruleFollowed) && !isNoTrade && (
            <div className="flex flex-wrap gap-2 pt-1">
              {entry.ruleFollowed && typeof entry.ruleFollowed === 'string' && (
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${entry.ruleFollowed.includes('Followed') ? 'bg-[var(--clr-profit-dim)] text-[var(--clr-profit)] border-[var(--clr-profit-dim)]' : entry.ruleFollowed.includes('Broke') ? 'bg-[var(--clr-loss-dim)] text-[var(--clr-loss)] border-[var(--clr-loss-dim)]' : 'bg-[var(--bar-bg)] text-[var(--txt-muted)] border-[var(--nav-border)]'}`}>
                  {entry.ruleFollowed}
                </span>
              )}
              {Array.isArray(entry.mistakes) && entry.mistakes.filter(x => x !== 'None').map(x => (
                <span key={x} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-[var(--clr-loss-dim)] text-[var(--clr-loss)] border border-[var(--clr-loss-dim)] flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-exclamation text-[9px]" />{x}
                </span>
              ))}
            </div>
          )}

          {entry.notes && (
            <div className="bg-[var(--bar-bg)] rounded-2xl p-4 border border-[var(--nav-border)] shadow-inner">
              <div className="text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-widest mb-2"><i className="fa-solid fa-note-sticky mr-2 text-[var(--accent-indian)]" />Notes & Thesis</div>
              <p className="text-sm rb-txt-name leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {entry.screenshot && !isNoTrade && (
            <div>
              <div className="text-[10px] font-black text-[var(--txt-muted)] uppercase tracking-widest mb-2"><i className="fa-solid fa-image mr-2 text-[var(--accent-indian)]" />Execution Chart</div>
              <img src={entry.screenshot} alt="chart" className="rounded-2xl border border-[var(--nav-border)] max-h-64 object-contain w-full bg-[var(--card-bg)] shadow-md" />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--nav-border)]">
            <button onClick={() => onEdit(entry)} className="px-4 py-2.5 text-xs font-bold rounded-xl border border-[var(--nav-border)] rb-txt-name hover:bg-[var(--card-bg)] transition-colors flex items-center gap-2"><i className="fa-solid fa-pen" /> Edit</button>
            <button onClick={() => onDelete(entry.id)} className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[var(--clr-loss-dim)] text-[var(--clr-loss)] hover:opacity-80 transition-opacity flex items-center gap-2"><i className="fa-solid fa-trash" /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────── */
export default function JournalTab({ trades = [], market, onAddTrade, onUpdateTrade, onDeleteTrade }) {
  const marketCfg = getMarketConfig(market);
  const cur = marketCfg.currencySymbol;

  const [view, setView] = useState('list'); 
  const [editEntry, setEditEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterSetup, setFilterSetup] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  const entries = useMemo(
    () => (trades || []).map(t => ({ ...t, market: t.market === 'global' ? 'foreign' : t.market })),
    [trades]
  );

  const handleSave = async (entry) => {
    setSaving(true); setError('');
    const payload = { ...entry, market, date: entry.date || new Date().toISOString().slice(0, 10) };
    const ok = editEntry?.id ? await onUpdateTrade?.(editEntry.id, payload) : await onAddTrade?.(payload);
    setSaving(false);
    if (!ok) { setError('Could not save trade. Check your connection and permissions.'); return; }
    setNotice(editEntry?.id ? 'Trade updated.' : 'Trade saved.');
    setEditEntry(null); setView('list');
  };

  const handleCsvImport = async (rows, source = 'dropzone') => {
    if (!rows?.length) return false;
    setImporting(true); setError(''); setNotice('');
    const normalizedRows = rows.map(row => ({
      ...row, market, source,
      strategy: row.strategy || row.setup || 'Manual',
      setup: row.setup || row.strategy || 'Manual',
      pnl: Number(row.pnl ?? row.metrics?.netPnl ?? 0),
      metrics: { ...(row.metrics || {}), netPnl: Number(row.pnl ?? row.metrics?.netPnl ?? 0) },
      importedAt: new Date().toISOString(),
    }));
    const ok = await onAddTrade?.(normalizedRows);
    setImporting(false);
    if (!ok) { setError('CSV import failed. Check Firebase permissions.'); return false; }
    setNotice(`${normalizedRows.length} trades imported.`);
    setView('list'); 
    return true;
  };

  const handleEdit = (entry) => { setEditEntry(entry); setView('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDelete = async (id) => {
    setError('');
    const ok = await onDeleteTrade?.(id);
    if (!ok) { setError('Could not delete trade.'); return; }
    setDeleteId(null);
  };

  const months = useMemo(() => [...new Set(entries.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse(), [entries]);

  const displayed = useMemo(() => {
    let arr = [...entries];
    if (filterMood) arr = arr.filter(e => e.emotion === filterMood);
    if (filterMonth) arr = arr.filter(e => e.date?.slice(0, 7) === filterMonth);
    if (filterSetup) arr = arr.filter(e => e.setup === filterSetup);
    return arr.sort((a, b) => {
      const d = new Date(b.date) - new Date(a.date);
      return sortDir === 'desc' ? d : -d;
    });
  }, [entries, filterMood, filterMonth, filterSetup, sortDir]);

  return (
    <div className="font-primary space-y-6 sm:space-y-8 relative pb-20">

      {/* ── HEADER (Cleaned up, no total PnL box here) ── */}
      <div className="flex items-center justify-between border-b border-[var(--nav-border)] pb-6">
        {view === 'list' ? (
          <button onClick={() => { setEditEntry(null); setView('form'); }}
            className="w-full sm:w-auto bg-[var(--accent-indian)] hover:bg-[#4f46e5] text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-[0_4px_15px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 tracking-wide">
            <i className="fa-solid fa-plus" /> New Entry
          </button>
        ) : (
          <button onClick={() => setView('list')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-[var(--nav-border)] bg-[var(--bar-bg)] rb-txt-name text-xs sm:text-sm font-bold hover:border-[var(--accent-indian)] transition-colors flex items-center justify-center gap-2">
            <i className="fa-solid fa-arrow-left" /> Back to Journal
          </button>
        )}
      </div>

      {error && <div className="rounded-2xl border border-[var(--clr-loss)] bg-[var(--clr-loss-dim)] px-5 py-4 text-xs font-bold text-[var(--clr-loss)] shadow-sm flex items-center gap-3"><i className="fa-solid fa-circle-exclamation text-lg" /> {error}</div>}
      {notice && <div className="rounded-2xl border border-[var(--clr-profit)] bg-[var(--clr-profit-dim)] px-5 py-4 text-xs font-bold text-[var(--clr-profit)] shadow-sm flex items-center gap-3"><i className="fa-solid fa-circle-check text-lg" /> {notice}</div>}

      {view === 'list' && entries.length > 0 && <StatsBar entries={entries} cur={cur} />}
      
      {/* ── STREAK & PSYCHOLOGY IN SAME ROW ON DESKTOP ── */}
      {view === 'list' && entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <StreakBanner entries={entries} />
          {entries.length > 2 && <PsychStats entries={entries} />}
        </div>
      )}

      {/* FORM: Full Reset via Key */}
      {view === 'form' && (
        <JournalForm
          key={market + (editEntry?.id || 'new')}
          initial={editEntry}
          onSave={handleSave}
          onCancel={() => { setEditEntry(null); setView('list'); }}
          cur={cur}
          saving={saving}
          importing={importing}
          market={market}
          onCsvImport={handleCsvImport}
        />
      )}

      {view === 'list' && (
        <div className="space-y-5">
          {entries.length > 0 && (
            <div className="bg-[var(--bar-bg)]/80 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-[var(--nav-border)] flex gap-2 items-center overflow-x-auto [&::-webkit-scrollbar]:hidden relative z-10 shadow-sm mx-[-10px] px-[10px] sm:mx-0 sm:px-3">
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--nav-border)]">
                 <i className="fa-solid fa-filter text-[var(--txt-muted)] text-[10px]" />
              </div>
              
              <CustomSelect value={filterMonth} onChange={setFilterMonth} placeholder="All Months" isFilter={true} options={months.map(m => ({ value: m, label: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }))} />
              <CustomSelect value={filterMood} onChange={setFilterMood} placeholder="All Moods" options={MOODS} isFilter={true} />
              <CustomSelect value={filterSetup} onChange={setFilterSetup} placeholder="All Setups" options={SETUPS} isFilter={true} />
              
              <button onClick={() => setSortDir(p => p === 'desc' ? 'asc' : 'desc')} className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[10px] sm:text-xs font-bold rb-txt-sub border border-[var(--nav-border)] rounded-xl bg-[var(--card-bg)] hover:border-[var(--accent-indian)] hover:text-[var(--accent-indian)] transition-colors">
                <i className={`fa-solid fa-arrow-${sortDir === 'desc' ? 'down' : 'up'}-wide-short`} />{sortDir === 'desc' ? 'Newest' : 'Oldest'}
              </button>
              
              {(filterMood || filterMonth || filterSetup) && (
                <button onClick={() => { setFilterMood(''); setFilterMonth(''); setFilterSetup(''); }} className="shrink-0 text-[10px] font-bold text-white bg-[var(--clr-loss)] px-3 py-2 rounded-xl ml-2 hover:bg-red-600 transition-colors">Clear</button>
              )}
              <span className="shrink-0 text-[10px] text-[var(--txt-muted)] font-bold px-2 ml-auto">{displayed.length} trade{displayed.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {displayed.length === 0 && (
            <div className="bg-[var(--card-bg)] flex flex-col items-center justify-center p-12 sm:p-20 rounded-[40px] text-center border border-[var(--nav-border)] shadow-sm">
              <div className="w-20 h-20 bg-[var(--bar-bg)] rounded-full flex items-center justify-center mb-6">
                 <i className="fa-solid fa-folder-open text-3xl text-[var(--txt-muted)]" />
              </div>
              <h3 className="rb-txt-name font-black text-lg sm:text-xl uppercase tracking-widest">{entries.length === 0 ? 'No Trades Logged' : 'No Filters Matched'}</h3>
              <p className="text-[var(--txt-muted)] text-sm sm:text-base mt-2 max-w-sm">
                {entries.length === 0 ? 'Start your journey. Log trades to track your performance, mistakes, and psychology over time.' : 'Try adjusting the filters above to find your trades.'}
              </p>
              {entries.length === 0 && (
                <button onClick={() => setView('form')} className="mt-8 bg-[var(--accent-indian)] hover:bg-[#4f46e5] text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                  <i className="fa-solid fa-plus" /> Log First Trade
                </button>
              )}
            </div>
          )}

          <div className="space-y-4 relative z-0">
            {displayed.map(entry => <EntryCard key={entry.id} entry={entry} cur={cur} onEdit={handleEdit} onDelete={id => setDeleteId(id)} />)}
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="bg-[var(--card-bg)] p-8 rounded-3xl max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[var(--nav-border)]">
            <div className="w-16 h-16 bg-[var(--clr-loss-dim)] rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-triangle-exclamation text-3xl text-[var(--clr-loss)]" />
            </div>
            <h3 className="text-xl text-center font-black rb-txt-name mb-2">Delete Entry?</h3>
            <p className="text-[var(--txt-muted)] text-center text-sm mb-8 leading-relaxed">This journal entry will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3.5 text-sm rounded-2xl border border-[var(--nav-border)] rb-txt-name font-bold hover:bg-[var(--bar-bg)] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3.5 text-sm rounded-2xl bg-[var(--clr-loss)] text-white font-black hover:bg-red-600 shadow-lg shadow-[var(--clr-loss)]/30 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}