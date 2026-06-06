// src/components/dashboard/SettingsTab.jsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../ui/Icons';
import ThemeToggle from '../common/ThemeToggle';
import { auth, db, fb } from '../../services/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { parseCSV } from '../../utils/csvImport';
import { encryptValue, decryptValue } from '../../utils/encryptionUtils';
import { fetchBrokerTrades } from '../../services/brokerService';
import { mapBrokerTrades, deduplicateTrades } from '../../utils/brokerDataMapper';

const MotionDiv = motion.div;
const MotionButton = motion.button;

/* ─────────────────────────────────────────────────────────────────────
   SAFE STORAGE
───────────────────────────────────────────────────────────────────── */
const safeStorage = {
  get(key, fallback = '') {
    try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch {}
  },
  remove(key) {
    try { window.localStorage.removeItem(key); } catch {}
  },
  keys() {
    try { return Object.keys(window.localStorage); } catch { return []; }
  },
};

/* ─────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────── */
const BROKER_TOKEN_TTL_MS  = 24 * 60 * 60 * 1000;
const PRESERVED_WIPE_KEYS  = new Set(['rb_market', 'rb_theme']);

/* Sync status enum */
const SYNC = {
  IDLE:    'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR:   'error',
};

const ALL_BROKERS = [
  // ── Indian Brokers ─────────────────────────────────────────────────
  {
    id: 'dhan', name: 'Dhan', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at dhanhq.co',
      'Go to My Profile → API → Generate Access Token',
      'Copy the token — it renews every 24 hours',
    ],
  },
  {
    id: 'angel', name: 'Angel One (SmartAPI)', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at smartapi.angelbroking.com',
      'Go to My Apps → Create App (if first time)',
      'Copy the JWT Token from the dashboard',
      'Token renews every 24 hours automatically',
    ],
  },
  {
    id: 'fyers', name: 'Fyers', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at myapi.fyers.in',
      'Create an App → note the App ID and Secret',
      'Use the API login flow to generate a daily Access Token',
      'Paste the Access Token here',
    ],
  },
  {
    id: 'upstox', name: 'Upstox', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at developer.upstox.com',
      'Register an App → get Client ID & Secret',
      'Use the authorization flow to get a daily Access Token',
      'Paste the Access Token here',
    ],
  },
  {
    id: 'zerodha', name: 'Zerodha (Kite)', marketType: 'indian', apiCost: 'paid',
    costNote: '₹2,000/month + ₹700 one-time setup fee',
    warning: 'Zerodha charges ₹2,000/month for API access. Consider Dhan or Angel One for free API.',
    apiGuide: [
      'Log in at kite.trade/settings → API → Create App',
      'Subscription required: ₹2,000/month',
      'Generate a Request Token from developer.zerodha.com',
      'Exchange it for an Access Token (valid 24 hours) — format: apiKey:accessToken',
      'Paste the combined token here',
    ],
  },
  {
    id: 'shoonya', name: 'Shoonya (Finvasia)', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at shoonya.com',
      'Go to API → Generate Session Token',
      'Use the Shoonya API login to get a jKey token',
      'Paste the Session Token here (renews daily)',
    ],
  },
  {
    id: 'flattrade', name: 'Flattrade', marketType: 'indian', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at flattrade.in',
      'Go to API Settings → Create App',
      'Generate your Access Token from the developer portal',
      'Paste the Access Token here (renews every 24 hours)',
    ],
  },
  {
    id: 'icici', name: 'ICICI Direct (Breeze)', marketType: 'indian', apiCost: 'paid',
    costNote: 'Subscription required — pricing varies by plan',
    warning: 'ICICI Breeze API requires a paid subscription. Check api.icicidirect.com for current pricing.',
    apiGuide: [
      'Log in at api.icicidirect.com',
      'Subscribe to the Breeze API plan',
      'Go to API Settings → Generate Session Token',
      'Paste the Session Token here (renews daily)',
    ],
  },
  {
    id: 'groww', name: 'Groww', marketType: 'indian', apiCost: 'none',
    costNote: null,
    warning: 'Groww does not offer a public API. Auto-journaling is not possible with Groww accounts.',
    apiGuide: [],
  },
  // ── Foreign Brokers ────────────────────────────────────────────────
  {
    id: 'binance', name: 'Binance', marketType: 'foreign', apiCost: 'free',
    costNote: null,
    warning: 'Binance private trade history requires server-side HMAC signing. Direct browser calls will fail with auth errors — a backend proxy is needed for full history.',
    apiGuide: [
      'Log in at binance.com',
      'Go to Profile → API Management → Create API',
      'Complete verification → copy the API Key',
      'Note: HMAC signature required — direct fetch returns auth error',
      'Paste the API Key here (used for future server-proxy support)',
    ],
  },
  {
    id: 'bybit', name: 'Bybit', marketType: 'foreign', apiCost: 'free',
    costNote: null,
    warning: 'Bybit v5 API requires HMAC signing. A backend proxy is needed for authenticated requests.',
    apiGuide: [
      'Log in at bybit.com',
      'Go to Account → API → Create New Key',
      'Set permissions to Read-Only for safety',
      'Copy the API Key shown (Secret shown only once)',
      'Format: apiKey:apiSecret — paste here',
    ],
  },
  {
    id: 'kucoin', name: 'KuCoin', marketType: 'foreign', apiCost: 'free',
    costNote: null,
    warning: 'KuCoin requires HMAC signing. Format your token as: apiKey:apiSecret:passphrase',
    apiGuide: [
      'Log in at kucoin.com',
      'Go to Profile → API Management → Create API',
      'Name the key, set password, choose Read-Only',
      'Complete 2FA verification',
      'Paste as: apiKey:apiSecret:passphrase',
    ],
  },
  {
    id: 'okx', name: 'OKX', marketType: 'foreign', apiCost: 'free',
    costNote: null,
    warning: 'OKX requires HMAC signing. Format as: apiKey:apiSecret:passphrase',
    apiGuide: [
      'Log in at okx.com',
      'Go to Profile → API → Create V5 API Key',
      'Set Read permission only, complete 2FA',
      'Copy the API Key, Secret, and Passphrase',
      'Paste as: apiKey:apiSecret:passphrase',
    ],
  },
  {
    id: 'exness', name: 'Exness', marketType: 'foreign', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at exness.com',
      'Go to My Account → API Settings',
      'Generate an Access Token',
      'Paste the token here (renews every 24 hours)',
    ],
  },
  {
    id: 'ibkr', name: 'Interactive Brokers', marketType: 'foreign', apiCost: 'free',
    costNote: 'Free with active IBKR account',
    warning: 'IBKR Client Portal API requires TWS or IB Gateway running locally on port 5000.',
    apiGuide: [
      'Run TWS or IB Gateway on your computer (localhost:5000)',
      'Log in at interactivebrokers.com → Client Portal',
      'Go to Settings → API → Generate OAuth Token',
      'Paste the OAuth token here',
    ],
  },
  {
    id: 'alpaca', name: 'Alpaca', marketType: 'foreign', apiCost: 'free',
    costNote: null, warning: null,
    apiGuide: [
      'Log in at app.alpaca.markets',
      'Go to Your Account → API Keys → Generate New Key',
      'Copy API Key ID and Secret Key',
      'Paste as: keyId:secretKey',
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────── */
function isBrokerTokenValid(brokerId) {
  try {
    const raw = safeStorage.get(`rb_broker_ts_${brokerId}`, '');
    if (!raw) return false;
    return Date.now() - Number(raw) < BROKER_TOKEN_TTL_MS;
  } catch { return false; }
}

function tokenTimeRemaining(brokerId) {
  try {
    const raw = safeStorage.get(`rb_broker_ts_${brokerId}`, '');
    if (!raw) return null;
    const remaining = BROKER_TOKEN_TTL_MS - (Date.now() - Number(raw));
    if (remaining <= 0) return 'Expired';
    const hrs  = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m remaining`;
  } catch { return null; }
}

function formatCapitalIndian(n) {
  const num = Number(n);
  if (isNaN(num)) return '';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)} K`;
  return `₹${num}`;
}

function formatCapitalGlobal(n) {
  const num = Number(n);
  if (isNaN(num)) return '';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000)    return `$${(num / 1000).toFixed(1)}K`;
  return `$${num}`;
}

function clearWipeLocalData() {
  safeStorage.keys()
    .filter(key => key.startsWith('rb_') && !PRESERVED_WIPE_KEYS.has(key))
    .forEach(key => safeStorage.remove(key));
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─────────────────────────────────────────────────────────────────────
   UI ATOMS
───────────────────────────────────────────────────────────────────── */
function SettingsRow({ icon, label, sub, action, onClick, isLast, danger }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 bg-[var(--card-bg)] hover:bg-[var(--bg-bar)] transition-colors
        ${!isLast ? 'border-b border-[var(--card-border)]' : ''}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className={`shrink-0 ${danger ? 'text-[var(--clr-loss)]' : 'text-[var(--txt-primary)] opacity-90'}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className={`text-sm font-semibold flex items-center flex-wrap gap-1 ${danger ? 'text-[var(--clr-loss)]' : 'text-[var(--txt-primary)]'}`}>
            {label}
          </div>
          {sub && <div className="text-[11px] text-[var(--txt-muted)] mt-0.5 tracking-wide">{sub}</div>}
        </div>
      </div>
      <div className="shrink-0 ml-3">{action}</div>
    </div>
  );
}

function SettingsGroup({ children, title }) {
  return (
    <div className="mb-6">
      {title && (
        <div className="text-[10px] font-extrabold text-[var(--txt-muted)] tracking-[0.12em] uppercase mb-2 pl-1">
          {title}
        </div>
      )}
      <div className="rounded-2xl border border-[var(--card-border)] overflow-hidden bg-[var(--card-bg)] backdrop-blur-xl shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ChipSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] font-bold bg-[var(--bg-page)] border border-[var(--card-border)] text-[var(--txt-primary)] rounded-lg px-3 py-1.5 whitespace-nowrap"
      >
        {value}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <MotionDiv
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[130px] rounded-xl border border-[var(--card-border)] overflow-hidden shadow-xl"
            style={{ background: 'var(--card-bg)' }}
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2.5 text-[12px] font-semibold transition-colors hover:bg-[var(--bg-bar)]
                  ${value === opt ? 'text-[var(--accent-indian)] bg-[var(--bg-bar)]' : 'text-[var(--txt-primary)]'}`}
              >
                {value === opt && <span className="mr-1.5"><Icons.Check size={10} /></span>}
                {opt}
              </button>
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MODAL OVERLAY
───────────────────────────────────────────────────────────────────── */
function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {children}
    </div>
  );
}

function ModalCard({ children, maxWidth = '360px' }) {
  return (
    <MotionDiv
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="border border-[var(--card-border)] p-7 rounded-3xl w-full shadow-2xl"
      style={{ background: 'var(--card-bg)', maxWidth, isolation: 'isolate' }}
    >
      {children}
    </MotionDiv>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SYNC STATUS PILL
───────────────────────────────────────────────────────────────────── */
function SyncPill({ status, count, lastSync, error }) {
  if (status === SYNC.IDLE && !lastSync) return null;

  const cfg = {
    [SYNC.LOADING]: { bg: 'rgba(234,179,8,0.12)', clr: '#eab308', text: 'Fetching trades…' },
    [SYNC.SUCCESS]: { bg: 'rgba(34,197,94,0.12)',  clr: 'var(--clr-profit)', text: `${count} trades synced · ${timeAgo(lastSync)}` },
    [SYNC.ERROR]:   { bg: 'rgba(239,68,68,0.10)',  clr: 'var(--clr-loss)',   text: error || 'Sync failed' },
    [SYNC.IDLE]:    { bg: 'rgba(34,197,94,0.08)',  clr: 'var(--clr-profit)', text: `Last sync ${timeAgo(lastSync)} · ${count} trades` },
  }[status];

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg mt-1"
      style={{ background: cfg.bg, color: cfg.clr }}>
      {status === SYNC.LOADING && (
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
        </svg>
      )}
      {status === SYNC.SUCCESS && <Icons.Check size={10} />}
      {status === SYNC.ERROR   && <Icons.Warning size={10} />}
      {status === SYNC.IDLE    && <Icons.Clock size={10} />}
      <span>{cfg.text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────── */
export default function SettingsTab({
  theme, setTheme, market, setMarket,
  trades = [], onResetData, onImportTrades,
  onLogout, onDeleteAccount, currentUser,
}) {
  /* ── Generic confirm modal ── */
  const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: null, isDanger: false });

  /* ── Wipe modal ── */
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [wipingData,    setWipingData]    = useState(false);
  const [wipeError,     setWipeError]     = useState('');

  /* ── Capital ── */
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [capInd, setCapInd] = useState(() => safeStorage.get('rb_cap_ind', '100000'));
  const [capGlb, setCapGlb] = useState(() => safeStorage.get('rb_cap_glb', '1000'));
  const hasIndianTrades  = trades.some(t => t.market === 'indian');
  const hasForeignTrades = trades.some(t => t.market === 'foreign');

  /* ── Password ── */
  const [showPassword, setShowPassword] = useState(false);
  const [passData,     setPassData]     = useState({ current: '', new: '', confirm: '' });
  const [passError,    setPassError]    = useState('');
  const [passLoading,  setPassLoading]  = useState(false);
  const [showPassVis,  setShowPassVis]  = useState({ current: false, new: false, confirm: false });

  /* ── Broker API ── */
  const [showBrokers,     setShowBrokers]     = useState(false);
  const [connectedBroker, setConnectedBroker] = useState(() => safeStorage.get('rb_connected_broker', '') || null);
  const [connectedBrokerObj, setConnectedBrokerObj] = useState(null); // full broker object
  const [setupBroker,     setSetupBroker]     = useState(null);
  const [apiToken,        setApiToken]        = useState('');
  const [apiError,        setApiError]        = useState('');
  const [apiVisible,      setApiVisible]      = useState(false);
  const [brokerLoading,   setBrokerLoading]   = useState(false);
  const [tokenStatus,     setTokenStatus]     = useState('');

  /* ── Sync state ── */
  const [syncStatus,  setSyncStatus]  = useState(SYNC.IDLE);
  const [syncCount,   setSyncCount]   = useState(() => Number(safeStorage.get('rb_last_sync_count', '0')));
  const [lastSyncAt,  setLastSyncAt]  = useState(() => safeStorage.get('rb_last_sync_at', ''));
  const [syncError,   setSyncError]   = useState('');

  /* ── CSV import ── */
  const [mailImportLoading, setMailImportLoading] = useState(false);
  const mailCsvInputRef = useRef(null);

  /* ── Feedback / Report ── */
  const [supportTab,      setSupportTab]      = useState('feedback');
  const [feedbackMsg,     setFeedbackMsg]     = useState('');
  const [reportMsg,       setReportMsg]       = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  /* ── Derived ── */
  const displayBrokers  = ALL_BROKERS.filter(b => b.marketType === market);
  const profileName     = currentUser?.displayName || 'Trader';
  const profileEmail    = currentUser?.email       || '';
  const profilePhoto    = currentUser?.photoURL    || null;
  const isEmailProvider = currentUser?.providerData?.[0]?.providerId === 'password';

  /* ── Resolve connected broker object ── */
  useEffect(() => {
    if (!connectedBroker) { setConnectedBrokerObj(null); return; }
    const found = ALL_BROKERS.find(b => b.name === connectedBroker || b.id === connectedBroker);
    setConnectedBrokerObj(found || null);
  }, [connectedBroker]);

  /* ── Load cloud settings ── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser?.uid) return;
      try {
        const snap     = await fb.getDoc(fb.doc(db, 'users', currentUser.uid));
        const settings = snap.exists() ? snap.data()?.settings : null;
        if (!mounted || !settings) return;

        if (settings.capitalIndian !== undefined) {
          setCapInd(String(settings.capitalIndian));
          safeStorage.set('rb_cap_ind', String(settings.capitalIndian));
        }
        if (settings.capitalForeign !== undefined) {
          setCapGlb(String(settings.capitalForeign));
          safeStorage.set('rb_cap_glb', String(settings.capitalForeign));
        }

        if (settings.connectedBroker) setConnectedBroker(settings.connectedBroker);

        if (settings.lastSyncAt) {
          setLastSyncAt(settings.lastSyncAt);
          safeStorage.set('rb_last_sync_at', settings.lastSyncAt);
        }
        if (settings.lastSyncCount !== undefined) {
          setSyncCount(settings.lastSyncCount);
          safeStorage.set('rb_last_sync_count', String(settings.lastSyncCount));
        }
      } catch (err) {
        console.warn('Settings sync failed:', err);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentUser?.uid]);

  /* ── Broker token expiry ticker ── */
  useEffect(() => {
    if (!connectedBroker) { setTokenStatus(''); return; }
    const update = () => setTokenStatus(tokenTimeRemaining(connectedBroker) || '');
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [connectedBroker]);

  /* ── Auto-expire broker token ── */
  useEffect(() => {
    if (!connectedBroker) return;
    if (!isBrokerTokenValid(connectedBroker)) {
      setConnectedBroker(null);
      safeStorage.remove('rb_connected_broker');
      safeStorage.remove(`rb_broker_ts_${connectedBroker}`);
    }
  }, [connectedBroker]);

  /* ══════════════════════════════════════
     BROKER SYNC — FETCH TRADES
  ══════════════════════════════════════ */
  const handleSyncBrokerTrades = async () => {
    if (!connectedBrokerObj) return;
    if (syncStatus === SYNC.LOADING) return;

    setSyncStatus(SYNC.LOADING);
    setSyncError('');

    try {
      // 1. Retrieve the stored encrypted token from Firestore
      let plainToken = null;

      if (currentUser?.uid) {
        const snap = await fb.getDoc(fb.doc(db, 'users', currentUser.uid));
        const brokerApi = snap.data()?.settings?.brokerApi;
        if (brokerApi?.tokenEncrypted) {
          try {
            plainToken = await decryptValue(brokerApi.tokenEncrypted, currentUser.uid);
          } catch {
            // Fall back to prompting — token decrypt failed
            plainToken = null;
          }
        }
      }

      if (!plainToken) {
        setSyncStatus(SYNC.ERROR);
        setSyncError('Could not retrieve API token. Please reconnect your broker.');
        return;
      }

      // 2. Fetch raw trades from broker
      const { ok, trades: rawTrades, error: fetchErr } = await fetchBrokerTrades(
        connectedBrokerObj.id,
        plainToken
      );

      if (!ok || !rawTrades?.length) {
        setSyncStatus(SYNC.ERROR);
        setSyncError(fetchErr || 'No trades returned. Check your token and try again.');
        return;
      }

      // 3. Map to RuleBook schema
      const normalized = mapBrokerTrades(connectedBrokerObj.id, rawTrades);

      // 4. Deduplicate against existing trades
      const newTrades = deduplicateTrades(trades, normalized);

      if (!newTrades.length) {
        // All already imported
        const ts = new Date().toISOString();
        setSyncStatus(SYNC.SUCCESS);
        setSyncCount(0);
        setLastSyncAt(ts);
        safeStorage.set('rb_last_sync_at', ts);
        safeStorage.set('rb_last_sync_count', '0');

        if (currentUser?.uid) {
          await fb.setDoc(fb.doc(db, 'users', currentUser.uid), {
            settings: { lastSyncAt: ts, lastSyncCount: 0, updatedAt: fb.serverTimestamp() },
          }, { merge: true });
        }
        return;
      }

      // 5. Import via parent handler
      const ok2 = await onImportTrades?.(newTrades);

      if (!ok2) {
        setSyncStatus(SYNC.ERROR);
        setSyncError('Import failed. Please try again.');
        return;
      }

      // 6. Persist sync metadata
      const ts = new Date().toISOString();
      setSyncStatus(SYNC.SUCCESS);
      setSyncCount(newTrades.length);
      setLastSyncAt(ts);
      safeStorage.set('rb_last_sync_at', ts);
      safeStorage.set('rb_last_sync_count', String(newTrades.length));

      if (currentUser?.uid) {
        await fb.setDoc(fb.doc(db, 'users', currentUser.uid), {
          settings: {
            lastSyncAt: ts,
            lastSyncCount: newTrades.length,
            lastSyncBroker: connectedBrokerObj.name,
            updatedAt: fb.serverTimestamp(),
          },
        }, { merge: true });
      }

    } catch (err) {
      setSyncStatus(SYNC.ERROR);
      setSyncError(err.message || 'Unexpected error during sync.');
      console.warn('Broker sync failed:', err);
    }
  };

  /* ══════════════════════════════════════
     CAPITAL
  ══════════════════════════════════════ */
  const handleSaveCapital = async () => {
    let payloadSettings = { updatedAt: fb.serverTimestamp() };

    if (market === 'indian') {
      if (hasIndianTrades) return;
      const indNum = Number(capInd);
      if (isNaN(indNum) || indNum <= 0) return;
      safeStorage.set('rb_cap_ind', capInd);
      payloadSettings.capitalIndian = indNum;
    } else {
      if (hasForeignTrades) return;
      const glbNum = Number(capGlb);
      if (isNaN(glbNum) || glbNum <= 0) return;
      safeStorage.set('rb_cap_glb', capGlb);
      payloadSettings.capitalForeign = glbNum;
    }

    if (!currentUser?.uid) { setShowCapitalModal(false); return; }

    try {
      await fb.setDoc(fb.doc(db, 'users', currentUser.uid), { settings: payloadSettings }, { merge: true });
      setShowCapitalModal(false);
    } catch {
      setShowCapitalModal(false);
    }
  };

  /* ══════════════════════════════════════
     EXPORT / IMPORT
  ══════════════════════════════════════ */
  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `RuleBook_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.warn('JSON export failed:', err); }
  };

  const downloadCSV = () => {
    if (!trades?.length) return false;
    try {
      // Exclude raw broker response from CSV export (too verbose)
      const clean  = trades.map(({ raw, ...rest }) => rest);
      const headers = Object.keys(clean[0]).join(',');
      const rows    = clean.map(t =>
        Object.values(t).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `RuleBook_Trades_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch { return false; }
  };

  const downloadWipeBackupCSV = () => {
    if (!trades?.length) return false;
    return downloadCSV();
  };

  const handleMailCsvImport = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) return;
    if (file.size > 10 * 1024 * 1024) return;
    setMailImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = parseCSV(e.target.result, market).map(row => ({
          ...row,
          source: 'csv-import',
          importedAt: new Date().toISOString(),
        }));
        if (!parsed.length) return;
        await onImportTrades?.(parsed);
      } catch (err) {
        console.warn('CSV could not be parsed:', err);
      } finally {
        setMailImportLoading(false);
        if (mailCsvInputRef.current) mailCsvInputRef.current.value = '';
      }
    };
    reader.onerror = () => setMailImportLoading(false);
    reader.readAsText(file);
  };

  /* ══════════════════════════════════════
     WIPE
  ══════════════════════════════════════ */
  const openWipeModal = () => {
    setCsvDownloaded(false);
    setWipingData(false);
    setWipeError('');
    setShowWipeModal(true);
  };

  const handleWipeDownloadCSV = () => {
    setWipeError('');
    const ok = downloadWipeBackupCSV();
    if (ok || trades.length === 0) { setCsvDownloaded(true); return; }
    setWipeError('Backup download failed. Please try again before deleting.');
  };

  const handleConfirmWipe = async () => {
    if (wipingData || !csvDownloaded) return;
    setWipeError('');
    setWipingData(true);
    try {
      const ok = await onResetData?.();
      if (!ok) { setWipeError('Could not delete your data. Please try again.'); return; }
      clearWipeLocalData();
      setConnectedBroker(null);
      setConnectedBrokerObj(null);
      setSetupBroker(null);
      setApiToken('');
      setTokenStatus('');
      setCapInd('100000');
      setCapGlb('1000');
      setSyncStatus(SYNC.IDLE);
      setSyncCount(0);
      setLastSyncAt('');
      setCsvDownloaded(false);
      setShowWipeModal(false);
    } catch (err) {
      setWipeError('Could not delete your data. Please try again.');
    } finally {
      setWipingData(false);
    }
  };

  /* ══════════════════════════════════════
     DELETE ACCOUNT
  ══════════════════════════════════════ */
  const confirmDeleteAccount = () => {
    setModal({
      show: true, title: 'Delete Account',
      message: 'This permanently deletes your account, all cloud trades, and settings. This cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        const result = await onDeleteAccount?.();
        if (result?.ok) {
          safeStorage.keys().filter(k => k.startsWith('rb_')).forEach(k => safeStorage.remove(k));
          setModal({ show: false });
          return;
        }
        console.warn(result?.message || 'Account deletion failed.');
        setModal({ show: false });
      },
    });
  };

  /* ══════════════════════════════════════
     BROKER API CONNECT / DISCONNECT
  ══════════════════════════════════════ */
  const handleBrokerClick = (broker) => {
    if (broker.apiCost === 'none') return;

    if (connectedBroker === broker.name) {
      setModal({
        show: true,
        title: `Disconnect ${broker.name}`,
        message: `Your API token for ${broker.name} will be removed. You can reconnect anytime.`,
        isDanger: true,
        onConfirm: async () => {
          safeStorage.remove('rb_connected_broker');
          safeStorage.remove(`rb_broker_ts_${broker.name}`);
          setConnectedBroker(null);
          setConnectedBrokerObj(null);
          setTokenStatus('');
          setSyncStatus(SYNC.IDLE);
          if (currentUser?.uid) {
            await fb.setDoc(fb.doc(db, 'users', currentUser.uid), {
              settings: { connectedBroker: null, brokerApi: null, updatedAt: fb.serverTimestamp() },
            }, { merge: true });
          }
          setModal({ show: false });
        },
      });
    } else {
      setSetupBroker(prev => prev === broker.name ? null : broker.name);
      setApiToken('');
      setApiError('');
      setApiVisible(false);
    }
  };

  const verifyAndConnectAPI = async (brokerObj) => {
    const trimmed = apiToken.trim();
    if (!trimmed || trimmed.length < 10) { setApiError('Enter a valid API token (min 10 characters).'); return; }
    setBrokerLoading(true);
    try {
      const encryptedToken = currentUser?.uid ? await encryptValue(trimmed, currentUser.uid) : null;
      const now = Date.now();
      safeStorage.set('rb_connected_broker', brokerObj.name);
      safeStorage.set(`rb_broker_ts_${brokerObj.name}`, String(now));
      setConnectedBroker(brokerObj.name);
      setConnectedBrokerObj(brokerObj);

      if (currentUser?.uid) {
        await fb.setDoc(fb.doc(db, 'users', currentUser.uid), {
          settings: {
            connectedBroker: brokerObj.name,
            connectedBrokerId: brokerObj.id,
            brokerApi: {
              broker:         brokerObj.name,
              brokerId:       brokerObj.id,
              tokenEncrypted: encryptedToken,
              tokenLast4:     trimmed.slice(-4),
              status:         'connected',
              linkedAt:       fb.serverTimestamp(),
              expiresAt:      new Date(now + BROKER_TOKEN_TTL_MS).toISOString(),
            },
            updatedAt: fb.serverTimestamp(),
          },
        }, { merge: true });
      }

      setSetupBroker(null);
      setApiToken('');
      setApiVisible(false);
      setSyncStatus(SYNC.IDLE);

    } catch {
      setApiError('Could not save broker connection. Try again.');
    } finally {
      setBrokerLoading(false);
    }
  };

  /* ══════════════════════════════════════
     PASSWORD
  ══════════════════════════════════════ */
  const handlePasswordUpdate = async () => {
    setPassError('');
    if (!passData.current)                        return setPassError('Enter your current password.');
    if (!passData.new || passData.new.length < 6) return setPassError('New password must be 6+ characters.');
    if (passData.new !== passData.confirm)         return setPassError('Passwords do not match.');
    setPassLoading(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('Not authenticated');
      const credential = EmailAuthProvider.credential(user.email, passData.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passData.new);
      setPassData({ current: '', new: '', confirm: '' });
      setShowPassword(false);
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        setPassError('Current password is incorrect.');
      else if (err.code === 'auth/requires-recent-login')
        setPassError('Session expired. Log out and back in.');
      else
        setPassError('Failed. Check your connection.');
    } finally {
      setPassLoading(false);
    }
  };

  /* ══════════════════════════════════════
     FEEDBACK / REPORT
  ══════════════════════════════════════ */
  const handleSupportSubmit = async () => {
    const msg = supportTab === 'feedback' ? feedbackMsg : reportMsg;
    if (!msg.trim()) return;
    setFeedbackLoading(true);
    try {
      await fb.addDoc(fb.collection(db, 'feedbacks'), {
        uid: currentUser?.uid || 'anonymous', email: profileEmail,
        type: supportTab, message: msg, timestamp: fb.serverTimestamp(),
      });
      if (supportTab === 'feedback') setFeedbackMsg('');
      else setReportMsg('');
    } catch { console.warn('Support message failed.'); }
    finally  { setFeedbackLoading(false); }
  };

  /* ══════════════════════════════════════
     LOGOUT
  ══════════════════════════════════════ */
  const handleLogout = async () => {
    try { await onLogout?.(); } catch { }
  };

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-[540px] mx-auto flex flex-col pb-12 relative px-2">

      {/* ── GENERIC CONFIRM MODAL ── */}
      <AnimatePresence>
        {modal.show && (
          <ModalOverlay onClose={() => setModal({ show: false })}>
            <ModalCard>
              <h3 className="m-0 mb-3 text-lg text-[var(--txt-primary)] font-extrabold">{modal.title}</h3>
              <p className="m-0 mb-6 text-[13px] text-[var(--txt-muted)] leading-relaxed">{modal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setModal({ show: false })}
                  className="flex-1 p-3 rounded-xl font-bold text-[var(--txt-primary)] border border-[var(--card-border)]"
                  style={{ background: 'var(--bg-bar)' }}>
                  Cancel
                </button>
                <button onClick={modal.onConfirm}
                  className={`flex-1 p-3 rounded-xl font-bold ${modal.isDanger ? 'bg-[var(--clr-loss)] text-white' : 'text-white'}`}
                  style={!modal.isDanger ? { background: 'var(--accent-indian)' } : {}}>
                  Confirm
                </button>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
         WIPE MODAL
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showWipeModal && (
          <ModalOverlay onClose={() => setShowWipeModal(false)}>
            <ModalCard maxWidth="400px">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--clr-loss)]"
                  style={{ background: 'var(--state-err-bg)' }}>
                  <Icons.Trash size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-lg font-extrabold text-[var(--clr-loss)]">Wipe All Trades</h3>
                  <p className="m-0 text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest">Permanent · Cannot Be Undone</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border mb-5" style={{ background: 'var(--state-err-bg)', borderColor: 'var(--state-err-border)' }}>
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[var(--clr-loss)] mb-2 uppercase tracking-wider">
                  <Icons.Warning size={13} /> What will be deleted
                </div>
                <ul className="m-0 p-0 pl-4 text-[12px] text-[var(--txt-muted)] leading-relaxed space-y-1">
                  <li>All {trades.length} trade records</li>
                  <li>All journal entries linked to trades</li>
                  <li>Broker tokens and local RuleBook data on this device</li>
                  <li>Capital locks and saved cloud settings</li>
                  {currentUser?.uid && <li>Your cloud-synced trade data</li>}
                </ul>
                <div className="mt-3 text-[11px] font-bold text-[var(--clr-loss)]">
                  After deletion, we have NO way to recover your data.
                </div>
              </div>

              <div className={`rounded-xl p-4 mb-3 border transition-all ${csvDownloaded ? 'border-[var(--clr-profit)] opacity-60' : 'border-[var(--card-border)]'}`}
                style={{ background: csvDownloaded ? 'rgba(34,197,94,0.07)' : 'var(--bg-bar)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-bold text-[var(--txt-primary)] flex items-center gap-1.5">
                      {csvDownloaded ? <span className="text-[var(--clr-profit)]"><Icons.Check size={13} /></span> : <Icons.Download size={13} />}
                      Step 1: Download CSV Backup
                    </div>
                    <div className="text-[10px] text-[var(--txt-muted)] mt-0.5">
                      {csvDownloaded ? 'Backup saved to your device' : 'Save a copy before deleting'}
                    </div>
                  </div>
                  <button onClick={handleWipeDownloadCSV} disabled={csvDownloaded}
                    className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors
                      ${csvDownloaded ? 'cursor-not-allowed text-[var(--txt-muted)]' : 'text-white'}`}
                    style={{ background: csvDownloaded ? 'var(--bg-page)' : 'var(--accent-indian)' }}>
                    {csvDownloaded ? 'Downloaded' : 'Download'}
                  </button>
                </div>
              </div>

              <div className={`rounded-xl p-4 mb-5 border transition-all ${!csvDownloaded ? 'opacity-40 pointer-events-none border-[var(--card-border)]' : 'border-[var(--clr-loss)]'}`}
                style={{ background: !csvDownloaded ? 'var(--bg-bar)' : 'rgba(239,68,68,0.07)' }}>
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--txt-primary)] mb-1">
                  <Icons.Trash size={13} /> Step 2: Permanently Delete Everything
                </div>
                <div className="text-[10px] text-[var(--txt-muted)]">
                  {csvDownloaded ? 'Your backup is saved. Ready to delete all data.' : 'Download the CSV backup first to unlock this step.'}
                </div>
              </div>

              {wipeError && (
                <div className="mb-4 rounded-xl border px-3 py-2 text-[11px] font-bold leading-relaxed text-[var(--clr-loss)]"
                  style={{ background: 'var(--state-err-bg)', borderColor: 'var(--state-err-border)' }}>
                  {wipeError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowWipeModal(false)} disabled={wipingData}
                  className="flex-1 p-3 rounded-xl font-bold text-[var(--txt-primary)] border border-[var(--card-border)]"
                  style={{ background: 'var(--bg-bar)' }}>
                  Cancel
                </button>
                <button onClick={handleConfirmWipe} disabled={!csvDownloaded || wipingData}
                  className={`flex-1 p-3 rounded-xl font-extrabold text-white text-sm transition-all bg-[var(--clr-loss)]
                    ${(!csvDownloaded || wipingData) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {wipingData ? 'Deleting…' : 'Delete All'}
                </button>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
         CAPITAL MODAL
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showCapitalModal && (
          <ModalOverlay onClose={() => setShowCapitalModal(false)}>
            <ModalCard maxWidth="400px">
              <h3 className="m-0 mb-1 text-lg text-[var(--txt-primary)] font-extrabold">
                Trading Capital — {market === 'indian' ? 'Indian Market' : 'Global Market'}
              </h3>
              <p className="m-0 mb-5 text-xs text-[var(--txt-muted)] leading-relaxed">
                Set your starting capital for {market === 'indian' ? 'NSE / BSE' : 'Forex / Crypto / International'}.
                Capital is <strong className="text-[var(--txt-primary)]">locked</strong> once trades exist.
              </p>

              {market === 'indian' && (
                <div className="mb-5 rounded-2xl border border-[var(--card-border)] overflow-hidden" style={{ background: 'var(--bg-bar)' }}>
                  <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold text-[var(--txt-muted)] uppercase tracking-widest">Indian Market</div>
                      <div className="text-[13px] font-bold text-[var(--txt-primary)] mt-0.5">NSE / BSE</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-black text-[var(--txt-primary)]">{formatCapitalIndian(capInd)}</div>
                      {hasIndianTrades && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Icons.Lock size={10} />
                          <span className="text-[9px] font-bold" style={{ color: 'var(--clr-loss)' }}>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-2">Amount in ₹ (Rupees)</div>
                    <input type="number" value={capInd}
                      onChange={e => !hasIndianTrades && setCapInd(e.target.value)}
                      disabled={hasIndianTrades} placeholder="e.g. 100000"
                      className={`w-full p-3 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[14px] font-bold outline-none ${hasIndianTrades ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ background: 'var(--bg-page)' }} />
                    {hasIndianTrades && <p className="text-[10px] text-[var(--txt-muted)] mt-2">Wipe Indian trades first to change this.</p>}
                  </div>
                </div>
              )}

              {market === 'foreign' && (
                <div className="mb-5 rounded-2xl border border-[var(--card-border)] overflow-hidden" style={{ background: 'var(--bg-bar)' }}>
                  <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold text-[var(--txt-muted)] uppercase tracking-widest">Global Market</div>
                      <div className="text-[13px] font-bold text-[var(--txt-primary)] mt-0.5">Forex / Crypto / Intl</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-black text-[var(--txt-primary)]">{formatCapitalGlobal(capGlb)}</div>
                      {hasForeignTrades && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Icons.Lock size={10} />
                          <span className="text-[9px] font-bold" style={{ color: 'var(--clr-loss)' }}>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-2">Amount in $ (USD)</div>
                    <input type="number" value={capGlb}
                      onChange={e => !hasForeignTrades && setCapGlb(e.target.value)}
                      disabled={hasForeignTrades} placeholder="e.g. 1000"
                      className={`w-full p-3 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[14px] font-bold outline-none ${hasForeignTrades ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ background: 'var(--bg-page)' }} />
                    {hasForeignTrades && <p className="text-[10px] text-[var(--txt-muted)] mt-2">Wipe Global trades first to change this.</p>}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-[10px] text-[var(--txt-muted)] mb-5 leading-relaxed p-3 rounded-xl border border-[var(--card-border)]"
                style={{ background: 'var(--bg-bar)' }}>
                <span className="shrink-0 mt-0.5 text-[var(--accent-indian)]"><Icons.Info size={12} /></span>
                To change locked capital: Wipe trades → update capital → re-import your CSV backup.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowCapitalModal(false)}
                  className="flex-1 p-3 rounded-xl font-bold text-[var(--txt-primary)] border border-[var(--card-border)]"
                  style={{ background: 'var(--bg-bar)' }}>
                  Cancel
                </button>
                <button onClick={handleSaveCapital}
                  disabled={(market === 'indian' && hasIndianTrades) || (market === 'foreign' && hasForeignTrades)}
                  className={`flex-1 p-3 rounded-xl font-bold text-white
                    ${(market === 'indian' && hasIndianTrades) || (market === 'foreign' && hasForeignTrades) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: 'var(--accent-indian)' }}>
                  Save Capital
                </button>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
         PROFILE CARD
      ══════════════════════════════════════ */}
      <div className="flex items-center gap-4 mb-8 px-1">
        <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden border-2 border-[var(--card-border)] bg-gradient-to-br from-[var(--accent-indian)] to-[var(--orb2)]">
          {profilePhoto
            ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : profileName.charAt(0).toUpperCase()
          }
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-xl tracking-tight text-[var(--txt-primary)]">{profileName}</div>
          <div className="text-xs text-[var(--txt-muted)] mt-0.5">{profileEmail}</div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {connectedBroker && (
              <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-[#1D9BF014] text-[#1D9BF0] tracking-widest uppercase">
                {connectedBroker}
              </span>
            )}
            {lastSyncAt && (
              <span className="text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
                style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--clr-profit)' }}>
                Synced {timeAgo(lastSyncAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
         1. PREFERENCES
      ══════════════════════════════════════ */}
      <SettingsGroup title="Preferences">
        <SettingsRow
          icon={theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
          label="Appearance"
          sub={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          action={
            <ThemeToggle
              size="sm" isDark={theme === 'dark'}
              onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              trackClassName={theme === 'dark' ? 'bg-[var(--accent-indian)] border-transparent' : 'bg-[var(--card-border)] border-transparent'}
            />
          }
        />
        <SettingsRow
          icon={<Icons.Briefcase />} label="Trading Capital"
          sub={market === 'indian'
            ? `India: ${formatCapitalIndian(capInd)}${hasIndianTrades ? '  ·  Locked' : ''}`
            : `Global: ${formatCapitalGlobal(capGlb)}${hasForeignTrades ? '  ·  Locked' : ''}`}
          onClick={() => setShowCapitalModal(true)}
          action={<span className="text-[11px] font-bold text-[var(--accent-indian)]">EDIT</span>}
        />
        <SettingsRow
          icon={market === 'indian' ? <Icons.India /> : <Icons.Globe />}
          label="Active Market"
          sub={market === 'indian' ? 'Indian (NSE/BSE)' : 'Foreign (Forex/Crypto)'}
          isLast
          action={
            <div className="flex rounded-lg p-1 border border-[var(--card-border)]" style={{ background: 'var(--bg-page)' }}>
              <button onClick={() => setMarket('indian')}
                className={`py-1 px-2.5 rounded-md text-[11px] font-bold transition-all ${market === 'indian' ? 'text-[var(--txt-primary)]' : 'text-[var(--txt-primary)] opacity-40'}`}
                style={{ background: market === 'indian' ? 'var(--card-bg)' : 'transparent' }}>
                IND
              </button>
              <button onClick={() => setMarket('foreign')}
                className={`py-1 px-2.5 rounded-md text-[11px] font-bold transition-all ${market === 'foreign' ? 'text-[var(--txt-primary)]' : 'text-[var(--txt-primary)] opacity-40'}`}
                style={{ background: market === 'foreign' ? 'var(--card-bg)' : 'transparent' }}>
                GLB
              </button>
            </div>
          }
        />
      </SettingsGroup>

      {/* ══════════════════════════════════════
         2. BROKER API  ← MAIN FEATURE
      ══════════════════════════════════════ */}
      <SettingsGroup title="Broker API">

        {/* ── Connected Broker Header Row ── */}
        <SettingsRow
          icon={<Icons.Book />}
          label={
            connectedBroker
              ? <>{connectedBroker} <Icons.VerifiedBadge /></>
              : `Link Broker (${market === 'indian' ? 'IND' : 'GLB'})`
          }
          sub={
            connectedBroker
              ? `Auto-journaling active  ·  ${tokenStatus}`
              : 'Connect broker API for real-time trade sync'
          }
          isLast={!showBrokers && !connectedBroker}
          onClick={() => { setShowBrokers(v => !v); setSetupBroker(null); }}
          action={
            <MotionDiv animate={{ rotate: showBrokers ? 90 : 0 }} className="text-[var(--txt-muted)] text-xs">▶</MotionDiv>
          }
        />

        {/* ── SYNC PANEL: shown when a broker is connected ── */}
        {connectedBroker && (
          <div className="border-t border-[var(--card-border)] px-4 py-3" style={{ background: 'var(--bg-bar)' }}>

            {/* Sync status */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-[var(--txt-muted)] uppercase tracking-widest mb-0.5">
                  Trade Sync
                </div>
                <div className="text-[12px] font-semibold text-[var(--txt-primary)]">
                  {syncStatus === SYNC.LOADING ? 'Fetching from broker…' :
                   syncStatus === SYNC.SUCCESS ? `${syncCount} new trade${syncCount !== 1 ? 's' : ''} imported` :
                   syncStatus === SYNC.ERROR   ? 'Sync failed' :
                   lastSyncAt ? `Last synced ${timeAgo(lastSyncAt)}` : 'Not synced yet'}
                </div>
                {syncStatus === SYNC.ERROR && syncError && (
                  <div className="text-[10px] text-[var(--clr-loss)] font-semibold mt-0.5 leading-relaxed">{syncError}</div>
                )}
              </div>

              {/* SYNC button */}
              <button
                onClick={handleSyncBrokerTrades}
                disabled={syncStatus === SYNC.LOADING || tokenStatus === 'Expired'}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest text-white transition-all
                  ${syncStatus === SYNC.LOADING || tokenStatus === 'Expired' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
                style={{ background: tokenStatus === 'Expired' ? 'var(--bg-page)' : 'var(--accent-indian)' }}
              >
                {syncStatus === SYNC.LOADING ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                    </svg>
                    Syncing
                  </>
                ) : (
                  <>↻ Sync Now</>
                )}
              </button>
            </div>

            {/* Progress bar for loading */}
            {syncStatus === SYNC.LOADING && (
              <div className="w-full h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--card-border)' }}>
                <MotionDiv
                  initial={{ width: '0%' }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 4, ease: 'easeInOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-indian)' }}
                />
              </div>
            )}

            {/* Last sync details */}
            {(syncStatus === SYNC.SUCCESS || (syncStatus === SYNC.IDLE && lastSyncAt)) && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold"
                  style={{ color: 'var(--clr-profit)' }}>
                  <Icons.Check size={10} /> {syncCount} trades from {connectedBroker}
                </div>
                <div className="text-[10px] text-[var(--txt-muted)]">
                  {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : ''}
                </div>
              </div>
            )}

            {/* Expired token warning */}
            {tokenStatus === 'Expired' && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold"
                style={{ color: 'var(--clr-loss)' }}>
                <Icons.Warning size={11} /> Token expired — reconnect to resume syncing.
              </div>
            )}
          </div>
        )}

        {/* Expired warning row (for non-expanded view) */}
        {connectedBroker && tokenStatus === 'Expired' && !showBrokers && (
          <div className="px-4 py-3 border-t border-[var(--card-border)] flex items-center gap-2 text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--clr-loss)' }}>
            <Icons.Warning size={13} /> API token expired. Reconnect to resume auto-journaling.
          </div>
        )}

        {/* ── Broker list (expanded) ── */}
        <AnimatePresence>
          {showBrokers && (
            <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">

              {/* Info banner */}
              <div className="px-4 py-3 border-t border-[var(--card-border)] flex items-center gap-2 text-xs font-semibold leading-relaxed"
                style={{ background: 'rgba(var(--accent-indian-rgb,0,209,255),0.08)', color: 'var(--accent-indian)' }}>
                <Icons.Clock size={13} />
                <span><strong>Tokens expire every 24 hours.</strong> Paste a fresh token each day for continuous sync.</span>
              </div>

              <div className="border-t border-[var(--card-border)]">
                {displayBrokers.map((broker, idx) => {
                  const isConnected = connectedBroker === broker.name;
                  const isSettingUp = setupBroker === broker.name;
                  const isLast      = idx === displayBrokers.length - 1;
                  const isPaid      = broker.apiCost === 'paid';
                  const hasNoApi    = broker.apiCost === 'none';

                  return (
                    <div key={broker.id} className={!isLast ? 'border-b border-[var(--card-border)]' : ''}>
                      <div
                        onClick={() => !hasNoApi && handleBrokerClick(broker)}
                        className={`py-3 pr-4 pl-5 flex items-center justify-between transition-colors
                          ${isConnected || isSettingUp ? '' : 'hover:bg-[var(--bg-bar)]'}
                          ${hasNoApi ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        style={{ background: isConnected ? 'rgba(29,155,240,0.07)' : isSettingUp ? 'var(--bg-bar)' : undefined }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-[13px] font-semibold text-[var(--txt-primary)]">{broker.name}</div>
                            {isPaid && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--clr-loss)' }}>Paid API</span>
                            )}
                            {broker.apiCost === 'free' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--clr-profit)' }}>Free</span>
                            )}
                            {hasNoApi && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>No API</span>
                            )}
                          </div>
                          {isConnected && tokenStatus && (
                            <div className={`flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${tokenStatus === 'Expired' ? 'text-[var(--clr-loss)]' : 'text-[var(--clr-profit)]'}`}>
                              <Icons.Clock size={10} /> {tokenStatus}
                            </div>
                          )}
                          {isPaid && broker.costNote && !isConnected && (
                            <div className="text-[10px] text-[var(--txt-muted)] mt-0.5">{broker.costNote}</div>
                          )}
                          {hasNoApi && (
                            <div className="text-[10px] text-[var(--txt-muted)] mt-0.5">API not available</div>
                          )}
                        </div>
                        {!hasNoApi && (
                          isConnected
                            ? <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md"
                                style={{ background: 'rgba(29,155,240,0.12)', color: '#1D9BF0' }}>ACTIVE</span>
                            : <span className="shrink-0 text-[11px] font-semibold text-[var(--txt-muted)]">Link →</span>
                        )}
                      </div>

                      {/* ── API Setup Panel ── */}
                      <AnimatePresence>
                        {isSettingUp && !isConnected && !hasNoApi && (
                          <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 pl-5 border-t border-[var(--card-border)]" style={{ background: 'var(--bg-bar)' }}>

                              {/* Warning banners */}
                              {(isPaid || broker.warning) && (
                                <div className="mb-3 p-3 rounded-xl border flex items-start gap-2 text-[11px] font-semibold leading-relaxed"
                                  style={{
                                    background:   isPaid ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
                                    borderColor:  isPaid ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.25)',
                                    color:        isPaid ? 'var(--clr-loss)'       : '#eab308',
                                  }}>
                                  <span className="shrink-0 mt-0.5"><Icons.Warning size={13} /></span>
                                  {broker.warning}
                                </div>
                              )}

                              {/* Step-by-step guide */}
                              {broker.apiGuide.length > 0 && (
                                <div className="mb-4 p-3 rounded-xl border border-[var(--card-border)]" style={{ background: 'var(--bg-page)' }}>
                                  <div className="text-[10px] font-extrabold text-[var(--accent-indian)] uppercase tracking-widest mb-2">
                                    How to get your API token
                                  </div>
                                  <ol className="m-0 p-0 pl-4 space-y-1">
                                    {broker.apiGuide.map((step, i) => (
                                      <li key={i} className="text-[11px] text-[var(--txt-muted)] leading-relaxed">{step}</li>
                                    ))}
                                  </ol>
                                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--clr-loss)' }}>
                                    <Icons.Clock size={11} /> Token expires in 24h — paste a fresh one each day.
                                  </div>
                                </div>
                              )}

                              {/* Token input */}
                              <div className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-1.5">API Token</div>
                              <div className="relative mb-2.5">
                                <input
                                  type={apiVisible ? 'text' : 'password'}
                                  placeholder="Paste your API Token here"
                                  value={apiToken}
                                  onChange={e => { setApiToken(e.target.value); setApiError(''); }}
                                  className="w-full p-3 pr-10 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[13px] outline-none"
                                  style={{ background: 'var(--bg-page)' }}
                                />
                                <button type="button" onClick={() => setApiVisible(v => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-[var(--txt-muted)]">
                                  {apiVisible ? <Icons.Eye size={15} /> : <Icons.EyeOff size={15} />}
                                </button>
                              </div>

                              {apiError && (
                                <div className="text-[var(--clr-loss)] text-[11px] font-semibold text-center mb-2">{apiError}</div>
                              )}

                              <button
                                onClick={() => verifyAndConnectAPI(broker)}
                                disabled={brokerLoading}
                                className="w-full p-3 rounded-xl font-extrabold text-xs tracking-widest uppercase text-white disabled:opacity-50"
                                style={{ background: 'var(--accent-indian)' }}>
                                {brokerLoading ? 'Saving…' : 'Save & Connect (24h)'}
                              </button>
                            </div>
                          </MotionDiv>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </SettingsGroup>

      {/* ══════════════════════════════════════
         3. DATA & BACKUP
      ══════════════════════════════════════ */}
      <SettingsGroup title="Data & Backup">
        <input ref={mailCsvInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => handleMailCsvImport(e.target.files?.[0])} />
        <SettingsRow
          icon={<Icons.Upload />} label="Import CSV"
          sub="Import trades from broker-downloaded CSV"
          onClick={() => mailCsvInputRef.current?.click()}
          action={<span className="text-[11px] font-bold text-[var(--accent-indian)]">{mailImportLoading ? 'IMPORTING…' : 'IMPORT'}</span>}
        />
        <SettingsRow
          icon={<Icons.LineChart />} label="Export JSON Backup"
          sub="Download all trades as JSON"
          onClick={handleExportJSON}
          action={<span className="text-[11px] font-bold text-[var(--accent-indian)]">EXPORT</span>}
        />
        <SettingsRow
          icon={<Icons.LineChart />} label="Export CSV"
          sub={`Download ${trades.length} trades as spreadsheet`}
          isLast onClick={downloadCSV}
          action={<span className="text-[11px] font-bold text-[var(--accent-indian)]">CSV</span>}
        />
      </SettingsGroup>

      {/* ══════════════════════════════════════
         4. ACCOUNT SECURITY
      ══════════════════════════════════════ */}
      <SettingsGroup title="Account Security">
        {isEmailProvider && (
          <>
            <SettingsRow
              icon={<Icons.Shield />} label="Update Password"
              sub="Change your login password"
              onClick={() => { setShowPassword(v => !v); setPassError(''); setPassData({ current: '', new: '', confirm: '' }); }}
              action={<MotionDiv animate={{ rotate: showPassword ? 90 : 0 }} className="text-[var(--txt-muted)] text-xs">▶</MotionDiv>}
            />
            <AnimatePresence>
              {showPassword && (
                <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-5 border-b border-[var(--card-border)]" style={{ background: 'var(--bg-bar)' }}>
                    {[
                      { key: 'current', label: 'Current Password',           vis: showPassVis.current, setVis: v => setShowPassVis(p => ({ ...p, current: v })) },
                      { key: 'new',     label: 'New Password (min 6 chars)', vis: showPassVis.new,     setVis: v => setShowPassVis(p => ({ ...p, new: v })) },
                      { key: 'confirm', label: 'Confirm New Password',       vis: showPassVis.confirm, setVis: v => setShowPassVis(p => ({ ...p, confirm: v })) },
                    ].map(f => (
                      <div key={f.key} className="relative mb-2.5">
                        <input type={f.vis ? 'text' : 'password'} placeholder={f.label}
                          value={passData[f.key]} onChange={e => setPassData(d => ({ ...d, [f.key]: e.target.value }))}
                          className="w-full p-3 pr-10 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[13px] outline-none"
                          style={{ background: 'var(--bg-page)' }} />
                        <div onClick={() => f.setVis(!f.vis)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity text-[var(--txt-muted)]">
                          {f.vis ? <Icons.Eye size={15} /> : <Icons.EyeOff size={15} />}
                        </div>
                      </div>
                    ))}
                    {passError && <div className="text-[var(--clr-loss)] text-[11px] font-semibold text-center my-1.5">{passError}</div>}
                    <MotionButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={handlePasswordUpdate} disabled={passLoading}
                      className={`w-full p-3 mt-1 rounded-xl font-extrabold text-xs tracking-widest uppercase text-white ${passLoading ? 'opacity-60' : ''}`}
                      style={{ background: 'var(--accent-indian)' }}>
                      {passLoading ? 'Updating…' : 'Update Password'}
                    </MotionButton>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </>
        )}
        <SettingsRow
          icon={<Icons.Shield />} label="Account Verified"
          sub={isEmailProvider ? 'Email & password login' : 'Google OAuth login'}
          isLast
          action={
            <span className="text-[9px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--clr-profit)' }}>
              Secure
            </span>
          }
        />
      </SettingsGroup>

      {/* ══════════════════════════════════════
         5. DANGER ZONE
      ══════════════════════════════════════ */}
      <SettingsGroup title="Danger Zone">
        <SettingsRow
          icon={<Icons.Trash />} label="Wipe All Trades" danger
          sub={`Permanently deletes all ${trades.length} trades — backup downloaded first`}
          onClick={openWipeModal}
          action={<span className="text-[11px] font-bold text-[var(--clr-loss)]">WIPE</span>}
        />
        <SettingsRow
          icon={<Icons.Trash />} label="Delete Account" danger isLast
          sub="Permanently removes account and all cloud data"
          onClick={confirmDeleteAccount}
          action={<span className="text-[11px] font-bold text-[var(--clr-loss)]">DELETE</span>}
        />
      </SettingsGroup>

      {/* ══════════════════════════════════════
         6. SUPPORT & FEEDBACK
      ══════════════════════════════════════ */}
      <SettingsGroup title="Support & Feedback">
        <div className="p-4 pb-0 border-b border-[var(--card-border)]">
          <div className="flex rounded-xl p-1 border border-[var(--card-border)]" style={{ background: 'var(--bg-page)' }}>
            {['feedback', 'report'].map(tab => (
              <button key={tab} onClick={() => setSupportTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all ${supportTab === tab ? 'text-[var(--txt-primary)]' : 'opacity-40 text-[var(--txt-primary)]'}`}
                style={{ background: supportTab === tab ? 'var(--card-bg)' : 'transparent' }}>
                {tab === 'feedback' ? 'Feedback' : 'Report Bug'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4" style={{ background: 'var(--card-bg)' }}>
          <AnimatePresence mode="wait">
            {supportTab === 'feedback' ? (
              <MotionDiv key="feedback" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <p className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-2">Feature request or general feedback</p>
                <textarea rows={3} placeholder="What would make RuleBook better for you?"
                  value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[13px] outline-none resize-none mb-3"
                  style={{ background: 'var(--bg-page)' }} />
                <button onClick={handleSupportSubmit} disabled={!feedbackMsg.trim() || feedbackLoading}
                  className={`w-full py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-colors border border-[var(--card-border)]
                    ${feedbackMsg.trim() && !feedbackLoading ? 'text-white' : 'opacity-50 cursor-not-allowed text-[var(--txt-muted)]'}`}
                  style={{ background: feedbackMsg.trim() && !feedbackLoading ? 'var(--accent-indian)' : 'var(--bg-bar)' }}>
                  {feedbackLoading ? 'Sending…' : 'Send Feedback'}
                </button>
              </MotionDiv>
            ) : (
              <MotionDiv key="report" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <p className="text-[10px] font-bold text-[var(--txt-muted)] uppercase tracking-widest mb-2">Describe the bug — steps to reproduce help a lot</p>
                <textarea rows={4} placeholder={`1. I went to...\n2. Then clicked...\n3. Expected X but got Y`}
                  value={reportMsg} onChange={e => setReportMsg(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--card-border)] text-[var(--txt-primary)] text-[13px] outline-none resize-none mb-3"
                  style={{ background: 'var(--bg-page)' }} />
                <button onClick={handleSupportSubmit} disabled={!reportMsg.trim() || feedbackLoading}
                  className={`w-full py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-colors border
                    ${reportMsg.trim() && !feedbackLoading
                      ? 'border-[var(--clr-loss)] text-[var(--clr-loss)]'
                      : 'border-[var(--card-border)] opacity-50 cursor-not-allowed text-[var(--txt-muted)]'}`}
                  style={{ background: reportMsg.trim() && !feedbackLoading ? 'rgba(239,68,68,0.10)' : 'var(--bg-bar)' }}>
                  {feedbackLoading ? 'Submitting…' : 'Submit Bug Report'}
                </button>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </SettingsGroup>

      {/* ══════════════════════════════════════
         7. LOGOUT
      ══════════════════════════════════════ */}
      <SettingsGroup>
        <SettingsRow
          icon={<Icons.Logout />} label="Logout" isLast
          sub={`Signed in as ${profileEmail || profileName}`}
          onClick={handleLogout}
          action={<span className="text-[11px] font-bold text-[var(--accent-indian)]">LOGOUT</span>}
        />
      </SettingsGroup>

      <div className="text-center text-[10px] text-[var(--txt-muted)] mt-2 tracking-widest">RULEBOOK</div>
    </div>
  );
}