// src/pages/Dashboard.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useApp } from '../context/AppContext';
import DashboardTab from '../components/dashboard/DashboardTab';
import JournalTab from '../components/dashboard/JournalTab';
import RiskTab from '../components/dashboard/RiskTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import { calcStats } from '../utils/helpers';
import { parseCSV } from '../utils/csvImport';
import { RBLogo } from '../components/ui/Icons';
import ThemeToggle from '../components/common/ThemeToggle';
import { db, fb } from '../services/firebase';

/* ─────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────── */
const TABS = ['dashboard', 'journal', 'risk', 'analytics', 'settings'];

const TAB_ICONS = {
  dashboard: 'fa-chart-pie',
  journal:   'fa-book',
  risk:      'fa-shield-halved',
  analytics: 'fa-chart-line',
  settings:  'fa-gear',
};

const TAB_LABELS = {
  dashboard: 'DASH',
  journal:   'JOUR',
  risk:      'RISK',
  analytics: 'ANLT',
  settings:  'SET',
};

/* Dropdown container — uses CSS tokens, no hardcoded bg */
const DROPDOWN_CLS =
  'absolute right-0 mt-3 p-2 bg-[var(--drawer-bg)] border border-[var(--nav-border)] ' +
  'shadow-2xl backdrop-blur-2xl rounded-2xl w-44 z-[999] origin-top-right ' +
  'transition-all duration-200';

/* ─────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────── */

/** Home-style glass toggle slider */
function Slider({ active, onToggle, leftLabel, rightLabel, width = 'w-14' }) {
  const isWide = width === 'w-[72px]';

  return (
    <div
      onClick={onToggle}
      className={`relative flex items-center ${isWide ? 'w-[72px]' : 'w-12'} h-[24px] rounded-full cursor-pointer shrink-0 transition-all duration-500 p-0.5 select-none rb-toggle-track`}
      role="switch"
      aria-checked={active}
    >
      <div
        className={`rb-toggle-thumb bg-white h-[18px] rounded-full shadow-md flex items-center justify-center transition-all duration-500 ease-out ${
          isWide ? 'w-[30px]' : 'w-[18px]'
        } ${active ? 'ml-auto' : 'ml-0'}`}
      >
        <span className="text-[8px] font-black leading-none text-[var(--accent-indian)]">
          {active ? rightLabel : leftLabel}
        </span>
      </div>
    </div>
  );
}

/** Circular icon button */
function IconBtn({ icon, onClick, active = false, activeClass = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all shadow-sm ${
        active
          ? activeClass
          : 'rb-icon-circle rb-txt-name hover:scale-105'
      }`}
    >
      <i className={`fa-solid ${icon} text-[10px]`} />
    </button>
  );
}

/** Dropdown menu item */
function DropItem({ icon, iconClass = 'rb-txt-sub', label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 text-xs rounded-xl flex items-center gap-3 font-medium transition-colors ${
        danger
          ? 'hover:bg-[var(--state-err-bg)] text-[var(--state-err-text)]'
          : 'hover:bg-[var(--bar-bg)] rb-txt-name'
      }`}
    >
      <i className={`fa-solid ${icon} w-3 ${iconClass}`} />
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, trades, market, setMarket, loading, theme, setTheme, addTrade, updateTrade, deleteTrade, resetData, logout, deleteAccount } = useApp();

  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    return TABS.includes(hash) ? hash : 'dashboard';
  };
  const [activeTab,    setActiveTab]    = useState(getInitialTab);
  const [activeMenu,   setActiveMenu]   = useState(null);
  const [isDataHidden, setIsDataHidden] = useState(false);
  const [activeModal,  setActiveModal]  = useState(null);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [feedbackText, setFeedbackText] = useState('');

  const dashboardRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ── Sync active tab to URL hash for refresh persistence ── */
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  /* ── Derived data ── */
  const marketTrades = useMemo(
    () => (trades || []).filter(t => t.market === market),
    [trades, market]
  );
  const stats = useMemo(() => calcStats(marketTrades), [marketTrades]);

  /* ── Helpers ── */
  const toggleMenu = (name) => setActiveMenu(prev => (prev === name ? null : name));
  const closeMenu  = ()     => setActiveMenu(null);
  const closeModal = ()     => setActiveModal(null);

  // FIX: theme toggle — setTheme opposite of current
  const toggleTheme  = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleMarket = () => setMarket(market === 'indian' ? 'foreign' : 'indian');

  /* ── Actions ── */
  const handleDownloadImage = async () => {
    if (!dashboardRef.current) return;
    try {
      closeMenu();

      const targetEl  = dashboardRef.current.querySelector('.dashboard-content');
      const dynamicBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-page').trim();

      const canvas = await html2canvas(targetEl, {
        backgroundColor: dynamicBg,
        scale:   3,
        useCORS: true,
        logging: false,
      });

      // Watermark
      const ctx       = canvas.getContext('2d');
      ctx.globalAlpha = 0.15;
      const _cs = getComputedStyle(document.documentElement);
      const txtDark = (_cs.getPropertyValue('--txt-head-from') || '#ffffff').trim();
      const txtLight = (_cs.getPropertyValue('--txt-name') || '#000000').trim();
      ctx.fillStyle   = theme === 'dark' ? txtDark : txtLight;
      ctx.font        = 'bold 60px "Space Grotesk", sans-serif';
      ctx.textAlign   = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('RuleBook.app', canvas.width - 40, canvas.height - 40);
      ctx.globalAlpha = 1;

      const link      = document.createElement('a');
      link.href       = canvas.toDataURL('image/png', 1.0);
      link.download   = `RuleBook_Snapshot_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.warn('Dashboard image export failed:', err);
    }
  };

  const handleExportCSV = () => {
    if (!trades?.length) {
      closeMenu();
      return;
    }
    try {
      const headers = Object.keys(trades[0]).join(',');
      const rows    = trades.map(t => Object.values(t).join(',')).join('\n');
      const blob    = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
      const url     = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = url;
      link.download = `RuleBook_${market.toUpperCase()}_Trades.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      closeMenu();
    } catch (err) {
      console.warn('Dashboard CSV export failed:', err);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const normalizedTrades = parseCSV(event.target.result, market).map(t => ({
          ...t,
          market: t.market === 'global' ? 'foreign' : (t.market || market),
          importedAt: new Date().toISOString(),
        }));
        if (!normalizedTrades.length) throw new Error('Invalid CSV');

        const results = await Promise.all(normalizedTrades.map(trade => addTrade(trade)));
        const savedCount = results.filter(Boolean).length;
        if (!savedCount) console.warn('Dashboard CSV import saved no trades.');
      } catch (err) {
        console.warn('Dashboard CSV import failed:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
    closeMenu();
  };

  const handleBackupData = () => {
    const payload = { trades, user, market, theme, exportedAt: new Date().toISOString() };
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);
    const link    = document.createElement('a');
    link.href     = url;
    link.download = 'RuleBook_Backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    closeMenu();
  };

  const importTradesBatch = async (rows = []) => {
    if (!Array.isArray(rows) || !rows.length) return false;
    const results = await Promise.all(rows.map(trade => addTrade(trade)));
    return results.every(Boolean);
  };

  const confirmResetData = async () => {
    const ok = await resetData();
    closeModal();
    if (!ok) console.warn('Dashboard reset failed.');
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      return;
    }
    try {
      await fb.addDoc(fb.collection(db, 'feedbacks'), {
        uid: user?.uid || 'anonymous',
        email: user?.email || '',
        category: feedbackType,
        message: feedbackText.trim(),
        source: 'dashboard-modal',
        createdAt: fb.serverTimestamp(),
      });
      closeModal();
      setFeedbackText('');
    } catch (err) {
      console.error('Feedback submit error:', err);
    }
  };

  /* ── Per-tab right action ── */
  const renderRightAction = () => {
    switch (activeTab) {

      case 'dashboard':
        return (
          <div className="relative">
            <IconBtn icon="fa-share-nodes" onClick={() => toggleMenu('share')} />
            {activeMenu === 'share' && (
              <div className={DROPDOWN_CLS}>
                <DropItem icon="fa-download" label="Download Image" onClick={handleDownloadImage} />
                <div className="flex justify-between px-3 pt-2 pb-1 border-t border-[var(--nav-border)] gap-2 rb-txt-sub mt-1">
                  {[
                    { icon: 'fa-brands fa-facebook',  href: '#' },
                    { icon: 'fa-brands fa-x-twitter', href: '#' },
                    { icon: 'fa-brands fa-whatsapp',  href: '#' },
                  ].map(({ icon, href }) => (
                    <a key={icon} href={href}
                      className="hover:text-[var(--accent-indian)] hover:scale-110 transition-all">
                      <i className={`${icon} text-lg`} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'journal':
        return (
          <div className="relative">
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
            <IconBtn icon="fa-folder-open" onClick={() => toggleMenu('journal')} />
            {activeMenu === 'journal' && (
              <div className={DROPDOWN_CLS}>
                <DropItem icon="fa-file-import" label="Import Trades"
                  onClick={() => fileInputRef.current?.click()} />
                <DropItem icon="fa-file-export" label="Export Trades"
                  onClick={handleExportCSV} />
              </div>
            )}
          </div>
        );

      case 'risk':
        return <IconBtn icon="fa-book-open" onClick={() => setActiveModal('risk')} />;

      case 'analytics':
        return (
          <IconBtn
            icon={isDataHidden ? 'fa-eye-slash' : 'fa-eye'}
            active={isDataHidden}
            activeClass="bg-[var(--navlink-active-bg)] text-[var(--navlink-active-text)]"
            onClick={() => setIsDataHidden(p => !p)}
          />
        );

      case 'settings':
        return (
          <div className="relative">
            <IconBtn icon="fa-ellipsis-vertical" onClick={() => toggleMenu('settings')} />
            {activeMenu === 'settings' && (
              <div className={DROPDOWN_CLS}>
                <DropItem icon="fa-comment-dots" iconClass="text-[var(--accent-indian)]"
                  label="Feedback / Bug"
                  onClick={() => { closeMenu(); setActiveModal('feedback'); }} />
                <DropItem icon="fa-cloud-arrow-down" iconClass="text-[var(--clr-profit)]"
                  label="Backup Data"
                  onClick={handleBackupData} />
                <div className="border-t border-[var(--nav-border)] my-1" />
                <DropItem icon="fa-trash" label="Reset Data" danger
                  onClick={() => { closeMenu(); setActiveModal('reset'); }} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  /* ── Status color by type ── */
  /* ─────────────────────────────────────────────────────────────────
     EARLY RETURNS
  ───────────────────────────────────────────────────────────────── */
  if (loading) {
    return <div className="p-10 text-center rb-txt-sub">Loading...</div>;
  }

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen relative pb-36 md:pb-28 font-primary">

      {/* Fixed ambient background layer */}
      <div className="rb-ambient-bg" />

      {/* ── MODALS ── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >

          {/* Reset confirmation */}
          {activeModal === 'reset' && (
            <div className="bg-[var(--drawer-bg)] p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-[var(--nav-border)] backdrop-blur-[64px] animate-scale-up">
              <div className="flex items-center gap-3 mb-4 text-[var(--state-err-icon)]">
                <i className="fa-solid fa-triangle-exclamation text-2xl" />
                <h3 className="text-xl font-bold rb-txt-name">Wipe Data?</h3>
              </div>
              <p className="rb-txt-sub mb-8 text-sm leading-relaxed">
                This will delete all trades and settings. This action{' '}
                <span className="font-bold text-[var(--state-err-text)]">cannot be undone</span>.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 text-xs rounded-xl border border-[var(--nav-border)] rb-txt-name font-bold hover:bg-[var(--bar-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetData}
                  className="px-5 py-2.5 text-xs rounded-xl bg-[var(--state-err-bg)] text-[var(--state-err-text)] font-bold hover:opacity-80 transition-opacity"
                >
                  Delete All
                </button>
              </div>
            </div>
          )}

          {/* Risk rules reference */}
          {activeModal === 'risk' && (
            <div className="bg-[var(--drawer-bg)] p-6 rounded-3xl max-w-lg w-full shadow-2xl border border-[var(--nav-border)] backdrop-blur-[64px] animate-scale-up max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sticky top-0 z-10 pb-3 border-b border-[var(--nav-border)] bg-[var(--drawer-bg)]">
                <h3 className="text-xl font-bold rb-txt-name flex items-center gap-2">
                  <i className="fa-solid fa-book-open text-[var(--navlink-active-text)]" />
                  Risk Management
                </h3>
                <button onClick={closeModal} className="w-8 h-8 rounded-full rb-icon-circle rb-txt-sub hover:rb-txt-name transition-colors">
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {[
                  {
                    icon: 'fa-shield', iconClass: 'text-[var(--state-ok-icon)]',
                    title: 'Golden Rules',
                    content: (
                      <ul className="list-disc pl-5 rb-txt-sub space-y-2 text-xs leading-relaxed">
                        <li>Never risk more than <strong className="rb-txt-name">1%–2%</strong> of capital per trade.</li>
                        <li>Always use a strict <strong className="rb-txt-name">Stop Loss</strong> — not just mentally.</li>
                        <li>Don't revenge-trade after a loss. Close the terminal and reset.</li>
                        <li>Ensure minimum <strong className="rb-txt-name">1:2 Risk-to-Reward</strong> before entering.</li>
                      </ul>
                    ),
                  },
                  {
                    icon: 'fa-calculator', iconClass: 'text-[var(--navlink-active-text)]',
                    title: 'Calculator Logic',
                    content: (
                      <p className="rb-txt-sub text-xs leading-relaxed">
                        Position sizing determines the exact qty of shares/lots to buy.<br />
                        <strong className="rb-txt-name mt-2 inline-block">Formula:</strong><br />
                        Quantity = (Capital × Risk%) ÷ (Entry − Stop Loss)
                      </p>
                    ),
                  },
                  {
                    icon: 'fa-receipt', iconClass: 'rb-txt-name',
                    title: 'Brokerage & Taxes',
                    content: (
                      <>
                        <p className="rb-txt-sub text-xs leading-relaxed mb-2">
                          Net P&L deductions include:
                        </p>
                        <ul className="list-disc pl-5 rb-txt-sub space-y-1 text-xs">
                          <li><strong className="rb-txt-name">Brokerage:</strong> Flat ₹20 per executed order.</li>
                          <li><strong className="rb-txt-name">STT/CTT:</strong> Govt levy on the sell side.</li>
                          <li><strong className="rb-txt-name">GST:</strong> 18% on (Brokerage + SEBI + Txn charges).</li>
                        </ul>
                      </>
                    ),
                  },
                ].map(({ icon, iconClass, title, content }) => (
                  <div key={title} className="rb-bar-glass p-5 rounded-2xl">
                    <h4 className="font-bold rb-txt-name mb-3 flex items-center gap-2">
                      <i className={`fa-solid ${icon} ${iconClass}`} />
                      {title}
                    </h4>
                    {content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback form */}
          {activeModal === 'feedback' && (
            <div className="bg-[var(--drawer-bg)] p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-[var(--nav-border)] backdrop-blur-[64px] animate-scale-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold rb-txt-name flex items-center gap-2">
                  <i className="fa-solid fa-paper-plane text-[var(--navlink-active-text)]" />
                  Send Feedback
                </h3>
                <button onClick={closeModal} className="w-8 h-8 rounded-full rb-icon-circle rb-txt-sub hover:rb-txt-name transition-colors">
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="block text-xs font-bold rb-txt-sub mb-2">Name</span>
                  <input
                    type="text"
                    defaultValue={user?.displayName ?? ''}
                    readOnly
                    className="w-full bg-[var(--bar-bg)] border border-[var(--nav-border)] rounded-xl px-4 py-3 text-sm rb-txt-name outline-none shadow-inner"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold rb-txt-sub mb-2">Category</span>
                  <select
                    value={feedbackType}
                    onChange={e => setFeedbackType(e.target.value)}
                    className="w-full bg-[var(--bar-bg)] border border-[var(--nav-border)] rounded-xl px-4 py-3 text-sm rb-txt-name outline-none focus:border-[var(--navlink-active-text)] transition-colors shadow-inner"
                  >
                    <option value="feedback">General Feedback</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Report a Bug</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs font-bold rb-txt-sub mb-2">Message</span>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you think..."
                    className="w-full bg-[var(--bar-bg)] border border-[var(--nav-border)] rounded-xl px-4 py-3 text-sm rb-txt-name outline-none focus:border-[var(--navlink-active-text)] transition-colors resize-none shadow-inner"
                  />
                </label>

                <button
                  onClick={submitFeedback}
                  className="w-full px-5 py-3 rounded-xl rb-btn-primary font-bold shadow-lg transition-all"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MOBILE TOP NAV ── */}
      <nav className="md:hidden fixed top-3 left-3 right-3 z-[100] flex justify-between items-center p-2.5 rounded-[28px] rb-nav-glass border border-[var(--nav-border)] shadow-2xl">
        <div className="flex items-center pl-2">
          <RBLogo id="mobile-logo" className="h-6 w-auto" />
        </div>
        <div className="flex items-center gap-2 pr-1">
          <ThemeToggle isDark={theme === 'dark'} onToggle={toggleTheme} />
          <Slider
            active={market === 'foreign'}
            onToggle={toggleMarket}
            leftLabel="IND"
            rightLabel="GLB"
            width="w-[72px]"
          />
          {renderRightAction()}
        </div>
      </nav>

      {/* ── DESKTOP NAV ── */}
      <nav className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1000px] z-[100] p-2.5 items-center justify-between rb-nav-glass rounded-full transition-all">

        {/* Logo + brand */}
        <div className="flex items-center gap-3 pl-3">
          <RBLogo id="nav-logo" className="h-7 w-auto" />
          <span className="font-bold text-xl tracking-wide rb-txt-name">
            RuleBook
          </span>
        </div>

        {/* Tab pills */}
        <div className="flex gap-1.5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-widest transition-all duration-300 ${
                activeTab === tab
                  ? 'rb-navlink-active shadow-md'
                  : 'rb-txt-sub hover:text-[var(--txt-name)] hover:bg-[var(--bar-bg)] hover:shadow-inner'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-full border border-[var(--nav-border)] bg-[var(--bar-bg)] shadow-sm pr-1.5">
          <ThemeToggle isDark={theme === 'dark'} onToggle={toggleTheme} />
          <Slider
            active={market === 'foreign'}
            onToggle={toggleMarket}
            leftLabel="IND"
            rightLabel="GLB"
            width="w-[72px]"
          />
          {renderRightAction()}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main
        ref={dashboardRef}
        onClick={() => activeMenu && closeMenu()}
        className="p-4 pt-20 md:pt-20 pb-32 md:pb-4 relative z-10 max-w-[1200px] mx-auto min-h-screen"
      >
        <div
          className="dashboard-content bg-transparent transition-transform md:origin-top"
          style={{ zoom: window.innerWidth > 768 ? 0.9 : 1 }}
        >
          {activeTab === 'dashboard'  && <DashboardTab  trades={marketTrades} market={market} stats={stats} />}
          {activeTab === 'journal'    && (
            <JournalTab
              trades={marketTrades}
              market={market}
              onAddTrade={addTrade}
              onUpdateTrade={updateTrade}
              onDeleteTrade={deleteTrade}
            />
          )}
          {activeTab === 'risk'       && <RiskTab                              market={market} />}
          {activeTab === 'analytics'  && <AnalyticsTab  trades={marketTrades}   market={market} isHidden={isDataHidden} />}
          {activeTab === 'settings'   && (
            <SettingsTab
              theme={theme}       setTheme={setTheme}
              market={market}     setMarket={setMarket}
              trades={trades}     currentUser={user}
              onResetData={resetData}
              onImportTrades={importTradesBatch}
              onLogout={logout}
              onDeleteAccount={deleteAccount}
            />
          )}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV — Capsule shape ── */}
      <nav className="md:hidden mobile-dashboard-nav rb-nav-glass border border-[var(--nav-border)] rounded-[30px]">
        <div className="flex items-center justify-around p-1.5 gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mobile-dashboard-nav-item flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-out ${
                activeTab === tab
                  ? 'rb-navlink-active is-active'
                  : 'rb-txt-sub'
              }`}
            >
              <i className={`fa-solid ${TAB_ICONS[tab]} text-lg mb-0.5`} />
              <span className="text-[8px] font-bold tracking-widest uppercase leading-none">
                {TAB_LABELS[tab]}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
