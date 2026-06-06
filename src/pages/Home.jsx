import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion'
import { RBLogo, EcoIcon } from '../components/ui/Icons'
import { SectionHeading, EcoCard, IconCircle, StatCounter } from '../components/ui/GlassUI'
import ThemeToggle from '../components/common/ThemeToggle'
import { useApp } from '../context/AppContext'

// --- PRO INTERACTION: Magnetic Button Wrapper ---
function MagneticButton({ children, onClick, className }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - (left + width / 2)) * 0.15 // Pull strength
    const y = (e.clientY - (top + height / 2)) * 0.15
    setPos({ x, y })
  }
  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 34, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 150, damping: 24, staggerChildren: 0.08 },
  },
}
const fadeItem = {
  hidden: { opacity: 0, y: 24, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 180, damping: 24 },
  },
}
const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 30 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
}

const PRINCIPLES = [
  { id: 1, title: 'Brutal Reality', icon: 'fa-chart-line', accent: 'text-cyan-400', desc: '9 out of 10 traders incur losses. Rule Book makes you the 10th through strict discipline and accountability.' },
  { id: 2, title: 'Process over Profit', icon: 'fa-lock', accent: 'text-purple-400', desc: 'Brutal analytics, habit tracking, and rule enforcement make your trading boring, mechanical — and profitable long-term.' },
  { id: 3, title: 'No Dopamine', icon: 'fa-bolt', accent: 'text-blue-400', desc: 'Treating trading as a business eliminates emotional swings and forces you to stick to your pre-defined system.' },
]

const ECOSYSTEM = [
  { title: 'Rule Book', desc: 'Live trade logging, P&L analytics, and in-depth risk management metrics.', badge: 'Live', badgeClass: 'rb-badge-live', live: true },
  { title: 'Trader World', desc: 'Noise-free community for setup sharing and logical market discussions.', badge: 'Coming Soon', badgeClass: 'rb-badge-soon' },
  { title: 'Strategy Lab', desc: 'The backtesting engine — a risk-free space to validate your strategy win-rate.', badge: 'Coming Soon', badgeClass: 'rb-badge-soon' },
  { title: 'Mindset Academy', desc: 'Educational hub for risk management, emotional tracking, and discipline.', badge: 'Coming Soon', badgeClass: 'rb-badge-soon' },
  { title: 'Market Radar', desc: 'Sub-second market data with economic calendars and stock screeners.', badge: 'Coming Soon', badgeClass: 'rb-badge-soon' },
  { title: 'Mentorship Hub', desc: 'Verified coaching — only profitable traders (via Rule Book) can mentor.', badge: 'Coming Soon', badgeClass: 'rb-badge-soon' },
]

const WHATS_NEW = [
  {
    icon: 'fa-shield-halved',
    col: 'text-green-400',
    title: 'End-to-End Encryption:',
    text: 'Every trade, note, and data point you log is fully encrypted at rest and in transit. Not even our team can read your data — your trading edge stays yours alone.'
  },
  {
    icon: 'fa-wand-magic-sparkles',
    col: 'text-cyan-400',
    title: 'Premium UI with Theme Engine:',
    text: 'Rebuilt from scratch with a refined iOS liquid-glass aesthetic. Seamlessly switch between light and dark mode — every component adapts instantly with zero visual glitch.'
  },
  {
    icon: 'fa-bolt',
    col: 'text-yellow-400',
    title: 'Ultra-Smooth Performance:',
    text: 'Complete core technology overhaul — reduced rendering lag, faster page transitions, and optimised animations so the app never gets in the way of your trading flow.'
  },
  {
    icon: 'fa-globe',
    col: 'text-blue-400',
    title: 'Global Market Support:',
    text: 'Rule Book now supports both Indian and international markets. Switch between INR and USD reporting, log equities, forex, or crypto — all tracked under one unified dashboard.'
  },
  {
    icon: 'fa-plug',
    col: 'text-purple-400',
    title: 'Direct Broker Integration:',
    text: 'Connect your broker account via a secure API token. Trades sync automatically — no manual entry, no errors, no missed logs. Currently supporting major Indian & Global brokers.'
  },
  {
    icon: 'fa-layer-group',
    col: 'text-orange-400',
    title: 'Fully Modular Architecture:',
    text: 'Journal, analytics, rule enforcement, and risk management are now fully decoupled modules. Navigate only what you need — clean, focused, and distraction-free by design.'
  },
  {
    icon: 'fa-robot',
    col: 'text-pink-400',
    title: 'Local AI Strategy Assistant:',
    text: 'An on-device AI that analyses your trading patterns and helps you identify weaknesses in your strategy. Runs entirely on your machine — no data is ever sent to any server. Your edge, your privacy.'
  },
]

const FAQS = [
  { q: 'Is Rule Book free to use?', a: 'Yes. The core journal is free forever so traders can build discipline without paying first.' },
  { q: 'Can I use it for Indian and global markets?', a: 'Yes. You can switch market mode and track trades with INR or USD style reporting.' },
  { q: 'Is my trading data secure?', a: 'Your account and trade logs are end-to-end encrypted, ensuring your data is completely safe and accessible only by you' },
  { q: 'Does Rule Book give trading calls?', a: 'No. Rule Book is a discipline and journaling tool. It helps you review decisions, not chase tips.' },
]

const NAV_LINKS = [['home', 'Home'], ['about', 'About'], ['vision', 'Vision'], ['principles', 'Principles'], ['whats-new', "What's New"], ['faq', 'FAQ']]
const swipeRowClass = 'flex md:grid md:grid-cols-3 gap-4 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-8 -mx-8 md:mx-0 px-8 md:px-0 hide-scrollbar'
const swipeCardClass = 'min-w-[82vw] max-w-[82vw] md:min-w-0 md:max-w-none snap-center'

function Navbar({ dk, setDk, isMobile = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()

  // Theme toggle helper function
  const handleThemeToggle = () => {
    setDk(prev => {
      const newDk = !prev;
      return newDk;
    });
  }

  // Dynamic Scroll Listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth Scroll Logic
  const handleNavClick = (e, id) => {
    e.preventDefault()
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const element = document.getElementById(id)
      if (element) {
        const offset = 100 // Navbar buffer height
        const bodyRect = document.body.getBoundingClientRect().top
        const elementRect = element.getBoundingClientRect().top
        const offsetPosition = (elementRect - bodyRect) - offset
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      }
    }
    if (isMobile) setDrawerOpen(false)
  }

  // Dynamic Background Classes
  const navGlassClass = `rb-nav-glass rounded-full flex justify-between items-center transition-all duration-500 backdrop-blur-xl border ${
    isScrolled 
      ? (dk ? 'bg-[#0b0c10]/70 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-black/5 shadow-lg') 
      : 'bg-transparent border-transparent'
  }`

  return (
    <>
      {/* Desktop navbar */}
      {!isMobile && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-5xl transition-all duration-500">
          <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={`${navGlassClass} py-3 px-6`}
          >
            <div className="flex items-center gap-8">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 cursor-pointer" onClick={(e) => handleNavClick(e, 'home')}>
                <RBLogo id="dNavG" className="h-7 w-auto" />
                <span className="text-[13px] font-black tracking-[0.22em] uppercase rb-brand">RULEBOOK</span>
              </motion.div>
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(([id, label]) => (
                  <a key={id} href={`#${id}`} onClick={(e) => handleNavClick(e, id)} className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all rb-navlink-idle hover:rb-navlink-active cursor-pointer">
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle isDark={dk} onToggle={handleThemeToggle} />
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
                <Link to="/login" className={`flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 backdrop-blur-md ${dk ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-slate-800 hover:bg-black/10'}`}>
                  Login <i className="fa-solid fa-arrow-right text-[8px]" />
                </Link>
              </motion.div>
            </div>
          </motion.nav>
        </div>
      )}

      {/* Mobile navbar */}
      {isMobile && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[94%] z-[300] transition-all duration-500">
          <nav className={`${navGlassClass} py-2.5 px-5`}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 cursor-pointer" onClick={(e) => handleNavClick(e, 'home')}>
              <RBLogo id="mNavG" className="h-6 w-auto" />
              <span className="text-[14px] font-black tracking-[0.22em] uppercase rb-brand">RULEBOOK</span>
            </motion.div>
            <div className="flex items-center gap-3">
              <ThemeToggle isDark={dk} onToggle={handleThemeToggle} />
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setDrawerOpen(true)}
                className={`w-10 h-10 flex items-center justify-center border rounded-full text-sm shadow-sm ${dk ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-slate-800'}`}>
                <i className="fa-solid fa-bars-staggered" />
              </motion.button>
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[350]" />
            <motion.div variants={drawerVariants} initial="hidden" animate="visible" exit="exit"
              className="fixed top-0 right-0 w-[280px] h-[100dvh] z-[360] flex flex-col overflow-y-auto shadow-2xl rb-drawer">
              <div className={`px-6 pt-6 pb-5 border-b flex justify-between items-center rb-divider`}>
                <span className="text-sm font-black tracking-[0.2em] uppercase rb-brand">MENU</span>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setDrawerOpen(false)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full border text-sm ${dk ? 'border-white/15 text-gray-300 bg-white/10' : 'border-slate-300 text-slate-600 bg-black/5'}`}>
                  <i className="fa-solid fa-xmark" />
                </motion.button>
              </div>
              <div className="flex flex-col px-5 py-6 gap-3 flex-grow">
                {NAV_LINKS.map(([id, label]) => (
                  <motion.a key={id} href={`#${id}`} onClick={(e) => handleNavClick(e, id)} whileTap={{ scale: 0.97 }}
                    className={`px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-colors cursor-pointer rb-bar-glass ${dk ? 'text-gray-100 hover:bg-white/5' : 'text-slate-800 hover:bg-black/5'}`}>
                    {label}
                  </motion.a>
                ))}
              </div>
              <div className="p-6 border-t rb-divider">
                <Link to="/login"
                  className={`w-full py-4 rounded-2xl flex justify-center items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all backdrop-blur-md border ${dk ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-slate-800 hover:bg-black/10'}`}>
                  Login <i className="fa-solid fa-arrow-right-to-bracket text-[10px]" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function FAQItem({ item, index, dk }) {
  const [open, setOpen] = useState(index === 0)
  const answerId = `faq-answer-${index}`

  return (
    <motion.div
      variants={fadeItem}
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className="rb-card-glass rb-animated-card rounded-[1.75rem] overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
      >
        <span className="font-display text-sm md:text-base font-bold rb-txt-name">{item.q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dk ? 'bg-white/10 text-cyan-300' : 'bg-black/5 text-purple-700'}`}
        >
          <i className="fa-solid fa-plus text-[11px]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={answerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 -mt-1 text-xs md:text-[13px] leading-relaxed rb-txt-sub">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Footer({ dk }) {
  return (
    <footer className="relative z-10 rb-footer mt-16 py-10 px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Desktop footer grid */}
        <div className="hidden md:grid grid-cols-12 gap-7 mb-7">
          <div className="col-span-5">
            <div className="flex items-center gap-2 mb-3">
              <RBLogo id="footG" className="h-7 w-auto" />
              <span className="text-sm font-black tracking-[0.2em] uppercase rb-brand">RULEBOOK</span>
            </div>
            <p className="text-[11px] leading-relaxed rb-txt-sub max-w-xs">
              The most advanced trading journal for Indian Traders. Built for discipline, not for dopamine.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://x.com/traderpoint_" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] transition-all hover:scale-110 rb-social">
                <i className="fa-brands fa-twitter" />
              </a>
              <a href="https://www.instagram.com/__rulebook__" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] transition-all hover:scale-110 rb-social">
                <i className="fa-brands fa-instagram" />
              </a>
            </div>
          </div>
          <div className="col-span-3">
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 rb-footer-head">Navigation</h4>
            <ul className="space-y-2.5 text-[9px] font-bold uppercase tracking-[0.18em] rb-txt-sub">
              {NAV_LINKS.map(([id, label]) => (
                <li key={id}><a href={`#${id}`} className="hover:text-green-500 transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-4">
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 rb-footer-head">Trust & Legal</h4>
            <ul className="space-y-2.5 text-[9px] font-bold uppercase tracking-[0.18em] rb-txt-sub">
              <li><Link to="/admin-login" className="hover:text-green-500 transition-colors">Admin Workspace</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-green-500 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="md:hidden flex flex-col gap-5 mb-6">
          <div className="flex items-center gap-2">
            <RBLogo id="mFootG" className="h-6 w-auto" />
            <span className="text-sm font-black tracking-[0.2em] uppercase rb-brand">RULEBOOK</span>
          </div>
          <p className="text-[11px] leading-relaxed rb-txt-sub">The most advanced trading journal for Indian Traders.</p>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 rb-footer-head">Navigation</h4>
              <ul className="space-y-2.5 text-[9px] font-bold uppercase tracking-[0.18em] rb-txt-sub">
                {NAV_LINKS.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} className="hover:text-green-500 transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 rb-footer-head">Trust</h4>
              <ul className="space-y-2.5 text-[9px] font-bold uppercase tracking-[0.18em] rb-txt-sub">
                <li><Link to="/admin-login" className="hover:text-green-500 transition-colors">Admin Hub</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-green-500 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex flex-col md:flex-row justify-between items-center gap-3 rb-divider">
          <div className="text-[8px] font-black uppercase tracking-[0.28em] rb-txt-sub">© 2026 RULE BOOK — ALL RIGHTS RESERVED</div>
          <div className="text-[8px] font-bold uppercase tracking-widest rb-txt-sub">
            DEVELOPED BY{' '}
            <a href="https://kumaranup2k2.github.io/Portfolio/" target="_blank" rel="noopener noreferrer"
              className="ml-1 border-b pb-0.5 transition-colors rb-txt-name hover:text-green-500">
              ANUP KUMAR
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  const { theme, setTheme } = useApp()
  const dk = theme === 'dark'
  const setDk = (next) => {
    setTheme(prev => {
      const nextDk = typeof next === 'function' ? next(prev === 'dark') : next
      return nextDk ? 'dark' : 'light'
    })
  }
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const heroYRaw = useTransform(scrollY, [0, 520], [0, -72])
  const heroOpacityRaw = useTransform(scrollY, [0, 380], [1, 0])
  const heroY = useSpring(heroYRaw, { stiffness: 90, damping: 24, mass: 0.35 })
  const heroOpacity = useSpring(heroOpacityRaw, { stiffness: 100, damping: 26, mass: 0.35 })

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden font-sans transition-colors duration-700" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Background motion */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden rb-ambient-bg">
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] top-[-5%] left-[-5%] animate-orb" style={{ background: 'var(--orb1-color)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] bottom-[-10%] right-[-5%] animate-orb [animation-delay:-8s]" style={{ background: 'var(--orb2-color)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 animate-orb [animation-delay:-14s]" style={{ background: 'var(--orb3-color)' }} />
      </div>

      <Navbar dk={dk} setDk={setDk} isMobile={isMobile} />

      {/* ── HERO ── */}
      <section id="home" className="relative w-full z-10" style={{ height: '100dvh', minHeight: 680 }}>
        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-20">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col items-center max-w-4xl w-full">
            <motion.h1 variants={fadeItem}
              className="font-display font-bold leading-[1.02] tracking-normal mb-6 rb-display rb-txt-head"
              style={{ fontSize: 'clamp(2.8rem, 6.5vw, 6rem)' }}>
              Fix Your Psychology.<br />
              <span className="rb-highlight">Master Your Rules.</span>
            </motion.h1>
            <motion.p variants={fadeItem} className="max-w-xl mx-auto text-sm leading-relaxed mb-10 font-medium rb-txt-sub">
              The most advanced trading journal for Indian Traders. Built for discipline, not for dopamine. Data encrypted via Google Cloud.
            </motion.p>
            <motion.div variants={fadeItem} className="flex items-center gap-4 flex-wrap justify-center mb-12">
              <MagneticButton onClick={() => { setTimeout(() => navigate('/login'), 800) }}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className={`px-9 py-3.5 rounded-full font-black uppercase tracking-[0.14em] text-[10px] transition-all shadow-xl backdrop-blur-md border cursor-pointer ${dk ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-slate-800 hover:bg-black/10'}`}>
                  Open Dashboard
                </motion.div>
              </MagneticButton>
              <MagneticButton onClick={() => { setTimeout(() => navigate('/signup'), 1100) }}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className={`px-9 py-3.5 rounded-full font-black uppercase tracking-[0.14em] text-[10px] transition-all backdrop-blur-md border cursor-pointer ${dk ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/20'}`}>
                  Start for Free <i className="fa-solid fa-arrow-right text-[8px] ml-1" />
                </motion.div>
              </MagneticButton>
            </motion.div>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10">
          <span className="text-[8px] uppercase tracking-[0.25em] font-bold rb-txt-sub">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }} className="rb-txt-sub">
            <i className="fa-solid fa-chevron-down text-[10px]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS (FIXED CUTOFF WITH py-6) ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp}
          className="flex gap-4 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-8 md:mx-0 px-8 md:px-0 py-6 hide-scrollbar">
          {[{ value: 100, suffix: '+', label: 'Active Traders' }, { value: 8000, suffix: '+', label: 'Trades Logged' }, { value: 98, suffix: '%', label: 'Uptime' }, { value: 0, suffix: '₹', label: 'Cost Forever' }]
            .map(s => <StatCounter key={s.label} {...s} dk={dk} className="min-w-[68vw] md:min-w-0 snap-center" />)}
        </motion.div>
      </section>

      <main className="max-w-5xl mx-auto px-8 relative z-10">

        {/* ── ABOUT ── */}
        <section id="about" className="scroll-mt-28 pt-20 mb-24">
          <SectionHeading bar={dk ? 'bg-gradient-to-b from-cyan-500 to-cyan-300' : 'bg-gradient-to-b from-purple-400 to-pink-400'}>
            What is <span className="rb-highlight">Rule Book?</span>
          </SectionHeading>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: '-60px' }} variants={fadeItem}>
            <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className={`max-w-4xl mx-auto h-auto rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-center backdrop-blur-xl border transition-all duration-300 ${dk ? 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]' : 'bg-white/60 border-white/40 shadow-xl'}`}>
              {dk && <div className="absolute -top-20 -right-20 w-52 h-52 bg-cyan-500/[0.07] blur-[70px] rounded-full pointer-events-none" />}
              <p className={`text-base leading-relaxed font-semibold mb-5 ${dk ? 'text-gray-100' : 'text-slate-800'}`}>
                Rule Book is the core trading journal of the TraderPoint ecosystem. We believe traders fail not because of bad strategies, but due to poor psychology.
              </p>
              <p className="text-xs leading-relaxed max-w-2xl mx-auto rb-txt-sub">
                We provide a strictly monitored environment where you log your trades, track emotional states, and analyze your performance through brutal, unfiltered data. By treating trading as a professional business, Rule Book ensures you stick to your system.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* ── VISION / ECOSYSTEM ── */}
        <section id="vision" className="scroll-mt-28 mb-24">
          <div className="text-center mb-4">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 mb-5 rounded-full text-[8px] font-black tracking-widest uppercase rb-badge-udev">
              <i className="fa-solid fa-code fa-fade mr-1.5" /> Under Development
            </motion.div>
          </div>
          <SectionHeading bar={dk ? 'bg-gradient-to-b from-purple-500 to-cyan-500' : 'bg-gradient-to-b from-indigo-400 to-purple-400'}>
            The <span className="rb-highlight">TraderPoint</span> Ecosystem
          </SectionHeading>
          <p className="text-center text-xs max-w-xl mx-auto -mt-8 mb-12 leading-relaxed rb-txt-sub">
            One centralized platform for everything a trader needs.
          </p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: '-60px' }} variants={fadeUp}
            className={`${swipeRowClass} py-4`}>
            {ECOSYSTEM.map((item, i) => (
              <EcoCard key={i} variants={fadeItem} className={`${swipeCardClass} ${!item.live ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (item.live) navigate('/login')
                }}
              >
                <IconCircle>
                  {item.live ? <RBLogo id={`ecG${i}`} className="h-6 w-auto" /> : <EcoIcon dk={dk} />}
                </IconCircle>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.badgeClass}`}>
                  {item.live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                  {!item.live && <i className="fa-solid fa-hourglass-half text-[7px]" />}
                  {item.badge}
                </span>
                <h3 className="font-black uppercase tracking-widest text-xs rb-txt-name">{item.title}</h3>
                <p className="text-[11px] leading-relaxed rb-txt-sub">{item.desc}</p>
              </EcoCard>
            ))}
          </motion.div>
        </section>

        {/* ── PRINCIPLES ── */}
        <section id="principles" className="scroll-mt-28 mb-24">
          <SectionHeading bar={dk ? 'bg-gradient-to-b from-cyan-500 to-purple-500' : 'bg-gradient-to-b from-slate-400 to-purple-400'}>
            Core Principles
          </SectionHeading>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: '-60px' }} variants={fadeUp}
            className={`${swipeRowClass} py-4`}>
            {PRINCIPLES.map(p => (
              <EcoCard key={p.id} variants={fadeItem} className={swipeCardClass}>
                <IconCircle>
                  <i className={`fa-solid ${p.icon} text-xl ${p.accent}`} />
                </IconCircle>
                <h3 className={`font-black uppercase tracking-widest text-xs mb-2.5 ${p.accent}`}>
                  {p.id}. {p.title}
                </h3>
                <p className="text-[11px] leading-relaxed rb-txt-sub">{p.desc}</p>
              </EcoCard>
            ))}
          </motion.div>
        </section>

        {/* ── WHAT'S NEW ── */}
        <section id="whats-new" className="scroll-mt-28 mb-24">
          <SectionHeading bar={dk ? 'bg-gradient-to-b from-cyan-500 to-purple-500' : 'bg-gradient-to-b from-slate-400 to-purple-400'}>
            What's <span className="rb-highlight">New</span>
          </SectionHeading>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: '-60px' }} variants={fadeItem}>
            <motion.div
              whileHover={{ y: -6, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="rounded-[2.5rem] p-12 rb-bar-glass rb-animated-card"
            >
              <div className="flex items-center justify-between border-b pb-6 mb-8 rb-divider">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase rb-badge-ver">v3.0.0</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest rb-txt-sub">April 2026</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold rb-txt-sub">Major Platform Upgrade</div>
              </div>
              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: '-60px' }}
                variants={fadeUp}
                className="space-y-8"
              >
                {WHATS_NEW.map((item, i) => (
                  <motion.li key={i} variants={fadeItem} className="flex items-start gap-5">
                    <div className="w-10 h-10 rounded-2xl rb-icon-circle flex items-center justify-center shrink-0 mt-0.5">
                      <i className={`fa-solid ${item.icon} ${item.col} text-sm`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${item.col}`}>
                        {item.title}
                      </span>
                      <span className="text-[12px] leading-relaxed rb-txt-sub">
                        {item.text}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>
        </section>

        {/* ── CTA ── */}
        <section id="faq" className="scroll-mt-28 mb-24">
          <SectionHeading bar={dk ? 'bg-gradient-to-b from-pink-400 to-purple-500' : 'bg-gradient-to-b from-pink-400 to-purple-500'}>
            Frequently Asked <span className="rb-highlight">Questions</span>
          </SectionHeading>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: '-60px' }} variants={fadeUp}
            className="grid gap-4">
            {FAQS.map((item, i) => (
              <FAQItem key={item.q} item={item} index={i} dk={dk} />
            ))}
          </motion.div>
        </section>

        <section className="mb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.45 }}
            whileHover={{ y: -6, scale: 1.006 }}
            transition={{ type: 'spring', stiffness: 170, damping: 24 }}
            className="rb-bar-glass max-w-4xl mx-auto h-auto rounded-[2.5rem] p-12 md:p-16 relative overflow-hidden"
          >
            <motion.h2
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.6 }}
              transition={{ type: 'spring', stiffness: 170, damping: 22 }}
              className="text-4xl font-display font-bold uppercase tracking-normal mb-4 rb-display rb-txt-head"
            >
              Ready to master<br />your rules?
            </motion.h2>

            <p className="text-sm rb-txt-sub mb-8 max-w-md mx-auto leading-relaxed">
              Join 100+ traders who use Rule Book to enforce discipline and become consistently profitable.
            </p>

            <MagneticButton onClick={() => setTimeout(() => navigate('/signup'), 1100)}>
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                className="rb-btn-primary inline-block cursor-pointer px-10 py-4 rounded-full font-black uppercase tracking-[0.14em] text-[11px] shadow-lg backdrop-blur-md"
              >
                Start for Free — It's ₹0
              </motion.div>
            </MagneticButton>
          </motion.div>
        </section>
      </main>

      <Footer dk={dk} />
    </div>
  )
}
