import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '../../utils/theme'
import { Icons } from './Icons'

export function ProgressBar({ pct = 0, color, style = {}, className = '' }) {
  return (
    <div className={className} style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', ...style }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', borderRadius: 99, background: color || `linear-gradient(90deg,${T.cyan},${T.purple})`, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export function SectionHeading({ children, bar }) {
  return (
    <motion.div initial={{ opacity: 0, x: -34, filter: 'blur(8px)' }} whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }} viewport={{ once: false, amount: 0.55 }} transition={{ type: 'spring', stiffness: 150, damping: 22, mass: 0.7 }} className="flex items-center justify-center gap-4 mb-12 text-center">
      <motion.div initial={{ scaleY: 0, opacity: 0 }} whileInView={{ scaleY: 1, opacity: 1 }} viewport={{ once: false, amount: 0.55 }} transition={{ delay: 0.08, type: 'spring', stiffness: 220, damping: 18 }} className={`w-1 h-10 rounded-full origin-center ${bar}`} />
      <motion.h2 initial={{ opacity: 0, x: 26 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.55 }} transition={{ delay: 0.04, type: 'spring', stiffness: 170, damping: 22 }} className="text-2xl font-black uppercase rb-display rb-section-head-desktop">
        {children}
      </motion.h2>
    </motion.div>
  );
}

export function EcoCard({ children, className = '', ...props }) {
  return (
    <motion.div whileHover={{ y: -8, scale: 1.025 }} whileTap={{ scale: 0.99 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }} className={`rb-card-glass rb-animated-card rounded-[2rem] p-8 flex flex-col gap-4 ${className}`} {...props}>
      {children}
    </motion.div>
  );
}

export function IconCircle({ children }) {
  return <div className="rb-icon-circle w-12 h-12 rounded-2xl flex items-center justify-center mb-2">{children}</div>;
}

export function StatCounter({ value, suffix = '', label, dk, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: false, amount: 0.45 }} whileHover={{ y: -7, scale: 1.025 }} whileTap={{ scale: 0.99 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} className={`flex-1 text-center px-6 py-5 rounded-[1.5rem] rb-stat-glass rb-animated-card ${className}`}>
      <div className={`text-3xl font-black font-mono mb-1 ${dk ? 'text-cyan-400' : 'text-purple-600'}`}>
        {value.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest rb-txt-sub">{label}</div>
    </motion.div>
  );
}


/* Section Title ── */
export const SectionTitle = ({ children }) => (
  <div className="rb-section-title">{children}</div>
);

/* ── Stat Card (Pro Variant) ── */
export const StatCard = ({ label, value, sub, color, animate = true }) => (
  <div className="rb-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div className="rb-label">{label}</div>
    <div className={`rb-value-xl ${color || ''}`} style={{ color: color ? undefined : 'var(--txt-primary)' }}>
      {value ?? '—'}
    </div>
    {sub && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.08em' }}>{sub}</div>}
  </div>
);

/* ── Input Field Box ── */
export const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label className="rb-label">{label}</label>
    {children}
  </div>
);

/* ── Progress Bar (Pro Variant) ── */
export const ProgressBarPro = ({ pct, color }) => (
  <div className="rb-progress-track">
    <div className="rb-progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color || 'var(--accent-indian)' }} />
  </div>
);

/* ── Empty State ── */
export const EmptyState = ({ message = 'No data available' }) => (
  <div style={{
    padding: '60px 20px', textAlign: 'center',
    color: 'var(--txt-muted)', fontSize: 10,
    fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
  }}>
    {message}
  </div>
);

/* ── Icon Button ── */
export const IconBtn = ({ onClick, children, title, danger = false, style = {} }) => (
  <button
    onClick={onClick} title={title}
    style={{
      width: 34, height: 34, borderRadius: '50%',
      border: `1px solid ${danger ? 'var(--clr-loss-dim)' : 'var(--border)'}`,
      background: danger ? 'var(--clr-loss-dim)' : 'var(--bg-bar)',
      color: danger ? 'var(--clr-loss)' : 'var(--txt-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.2s',
      ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
  >
    {children}
  </button>
);

/* ── Pill Button ── */
export const PillBtn = ({ onClick, children, active = false, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 16px', borderRadius: 999,
      border: `1px solid ${active ? 'var(--accent-indian)' : 'var(--border)'}`,
      background: active ? 'var(--accent-indian-dim)' : 'var(--bg-bar)',
      color: active ? 'var(--accent-indian)' : 'var(--txt-secondary)',
      fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      cursor: 'pointer', transition: 'all 0.2s', ...style,
    }}
  >
    {children}
  </button>
);

/* ── Modal ── */
export const Modal = ({ open, onClose, title, children, maxWidth = 500 }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="rb-modal-overlay"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
          className="rb-modal-box"
          style={{ maxWidth }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="rb-section-title">{title}</div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: 'var(--txt-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.X />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);


