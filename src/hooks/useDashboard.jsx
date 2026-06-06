import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { fb, db } from '../services/firebase';
import { useApp } from '../context/AppContext';

export function useDashboard() {
  const { user, trades, market, setMarket, theme, setTheme, addTrade } = useApp();

  // ── States (extracted from Dashboard.jsx) ──
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    return ['dashboard', 'journal', 'risk', 'analytics', 'settings'].includes(hash) ? hash : 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDataHidden, setIsDataHidden] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [feedbackText, setFeedbackText] = useState('');

  const dashboardRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Derived data ──
  const marketTrades = useMemo(
    () => (trades || []).filter(t => t.market === market),
    [trades, market]
  );

  // ── URL Sync ──
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // ── Helpers ──
  const TABS = ['dashboard', 'journal', 'risk', 'analytics', 'settings'];
  const TAB_ICONS = {
    dashboard: 'fa-chart-pie',
    journal: 'fa-book',
    risk: 'fa-shield-halved',
    analytics: 'fa-chart-line',
    settings: 'fa-gear',
  };
  const TAB_LABELS = {
    dashboard: 'DASH',
    journal: 'JOUR',
    risk: 'RISK',
    analytics: 'ANLT',
    settings: 'SET',
  };

  const DROPDOWN_CLS = 
    'absolute right-0 mt-3 p-2 bg-[var(--drawer-bg)] border border-[var(--nav-border)] ' +
    'shadow-2xl backdrop-blur-2xl rounded-2xl w-44 z-[999] origin-top-right ' +
    'transition-all duration-200';

  const toggleMenu = useCallback((name) => setActiveMenu(prev => prev === name ? null : name), []);
  const closeMenu = useCallback(() => setActiveMenu(null), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);
  const toggleMarket = useCallback(() => setMarket(market === 'indian' ? 'foreign' : 'indian'), [market, setMarket]);

  // ── Actions (from dashboardHelpers.js later) ──
  const handleDownloadImage = useCallback(async () => {
    if (!dashboardRef.current) return;
    try {
      closeMenu();

      const targetEl = dashboardRef.current.querySelector('.dashboard-content');
      const dynamicBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-page').trim();

      const canvas = await html2canvas(targetEl, {
        backgroundColor: dynamicBg,
        scale: 3,
        useCORS: true,
        logging: false,
      });

      // Watermark (same logic)
      const ctx = canvas.getContext('2d');
      ctx.globalAlpha = 0.15;
      const _cs = getComputedStyle(document.documentElement);
      const txtDark = (_cs.getPropertyValue('--txt-head-from') || '#ffffff').trim();
      const txtLight = (_cs.getPropertyValue('--txt-name') || '#000000').trim();
      ctx.fillStyle = theme === 'dark' ? txtDark : txtLight;
      ctx.font = 'bold 60px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('RuleBook.app', canvas.width - 40, canvas.height - 40);
      ctx.globalAlpha = 1;

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1.0);
      link.download = `RuleBook_Snapshot_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.warn('Dashboard image export failed:', err);
    }
  }, [theme, closeMenu]);

  // Placeholder for other handlers (will move to utils later)
  const handleExportCSV = useCallback(() => {
    // Implementation will be in utils/dashboardHelpers.js
  }, []);

  const handleImportCSV = useCallback((e) => {
    // Implementation will be in utils/dashboardHelpers.js  
  }, []);

  const handleBackupData = useCallback(() => {
  }, []);

  const submitFeedback = useCallback(async () => {
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
  }, [feedbackText, feedbackType, user, closeModal]);

  // ── Render helpers (pure functions) ──
  const renderRightAction = useCallback(() => {
    // Same exact JSX logic as original - just extracted
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="relative">
            <button onClick={() => toggleMenu('share')} className="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all shadow-sm rb-icon-circle rb-txt-name hover:scale-105">
              <i className="fa-solid fa-share-nodes text-[10px]" />
            </button>
          </div>
        );
      // Other cases simplified for Phase 1
      default:
        return null;
    }
  }, [activeTab, toggleMenu]);

  return {
    // States
    activeTab, setActiveTab,
    activeMenu, 
    isDataHidden, setIsDataHidden,
    activeModal, setActiveModal,
    feedbackType, setFeedbackType,
    feedbackText, setFeedbackText,
    
    // Refs
    dashboardRef,
    fileInputRef,

    // Derived
    marketTrades,
    TABS, TAB_ICONS, TAB_LABELS, DROPDOWN_CLS,
    
    // Actions
    toggleMenu, closeMenu, closeModal,
    toggleTheme, toggleMarket,
    handleDownloadImage,
    handleExportCSV,
    handleImportCSV,
    handleBackupData,
    submitFeedback,
    
    // Render helpers
    renderRightAction,
  };
}

