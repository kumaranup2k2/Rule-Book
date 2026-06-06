// src/context/AppContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, fb } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CryptoJS from 'crypto-js';
import { applyTheme, getStoredTheme, persistTheme, THEME_CHANGE_EVENT } from '../utils/theme';

// 🔐 SECRET KEY FOR ENCRYPTION 
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "RuleBook_Ultimate_Secret_Key_2026";

const AppContext = createContext(null);

function normalizeTrade(input) {
  let raw = {};
  
  // 1. Decryption & Mapping Safety Check
  if (input.id && typeof input.data === 'function') {
    raw = input.data();
    
    if (raw.encryptedPayload) {
      try {
        const bytes = CryptoJS.AES.decrypt(raw.encryptedPayload, SECRET_KEY);
        const decString = bytes.toString(CryptoJS.enc.Utf8);
        if (decString) {
           raw = { ...raw, ...JSON.parse(decString) };
        }
      } catch (err) {
        console.warn("Failed to decrypt trade data for doc:", input.id);
      }
    }
    raw.id = input.id;
  } else {
    raw = { ...input }; 
  }

  // 2. CRASH FIX: Guarantee that metrics is always a valid object
  const metrics = raw.metrics || {};
  const entry = Number(raw.entryPrice || raw.entry || raw.buyPrice || 0);
  const exit = Number(raw.exitPrice || raw.exit || raw.sellPrice || 0);
  const qty = Number(raw.quantity || raw.qty || 0);
  const charges = Number(raw.charges || metrics.charge || 0);
  const direction = raw.direction || 'LONG';
  
  const calculatedPnl = entry && exit && qty
    ? (direction === 'SHORT' ? (entry - exit) * qty : (exit - entry) * qty) - charges
    : 0;
  
  const importedPnl = raw.pnl ?? metrics.netPnl ?? raw.netPnl;
  const shouldUseCalculatedPnl = Number(importedPnl || 0) === 0 && calculatedPnl !== 0;
  const pnl = Number(shouldUseCalculatedPnl ? calculatedPnl : (importedPnl ?? calculatedPnl ?? 0));

  return {
    ...raw,
    market: raw.market === 'global' ? 'foreign' : (raw.market || 'indian'),
    pnl: pnl,
    strategy: raw.strategy || raw.setup || raw.type || 'Manual',
    setup: raw.setup || raw.strategy || 'Manual',
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes : [],
    metrics: {
      ...metrics,
      netPnl: pnl,
      grossPnl: Number(metrics.grossPnl ?? (pnl + charges)),
      charge: charges,
    },
  };
}

export function AppProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);

  const [market, setMarket] = useState(() => {
    const saved = localStorage.getItem('rb_market') || 'indian';
    return saved === 'global' ? 'foreign' : saved;
  });

  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    let tradesUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (u) {
        const tradesRef = fb.collection(db, 'trades');
        const userTradesQuery = fb.query(
          tradesRef,
          fb.where('userId', '==', u.uid),
          fb.orderBy('date', 'desc')
        );

        tradesUnsub = fb.onSnapshot(
          userTradesQuery,
          (snapshot) => {
            const data = snapshot.docs.map(normalizeTrade);
            setTrades(data);
            setLoading(false);
          },
          (error) => {
            console.warn('Trades listener error:', error);
            const fallbackQuery = fb.query(tradesRef, fb.where('userId', '==', u.uid));
            tradesUnsub = fb.onSnapshot(fallbackQuery, (snapshot) => {
              const data = snapshot.docs
                .map(normalizeTrade)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
              setTrades(data);
              setLoading(false);
            }, (fallbackError) => {
              console.warn('Trades fallback listener error:', fallbackError);
              setTrades([]);
              setLoading(false);
            });
          }
        );
      } else {
        setTrades([]);
        setLoading(false);
        if (tradesUnsub) tradesUnsub();
      }
    });

    return () => {
      authUnsub();
      if (tradesUnsub) tradesUnsub();
    };
  }, []);

  useEffect(() => { localStorage.setItem('rb_market', market); }, [market]);

  useEffect(() => {
    // Apply to <html data-theme="..."> and persist to localStorage
    // Use applyTheme directly to avoid re-dispatching the event (infinite loop)
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  // Theme sync: listen for external theme changes (e.g. from other tabs)
  useEffect(() => {
    const onThemeChange = (event) => {
      const t = event.detail?.theme;
      if (t) setTheme(t); // only update state, useEffect below will apply it
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  const addTrade = useCallback(async (tradeOrTrades) => {
    if (!user) return false;
    try {
      const tradesArr = Array.isArray(tradeOrTrades) ? tradeOrTrades : [tradeOrTrades];
      const batch = fb.writeBatch(db);

      tradesArr.forEach((trade) => {
        const ref = fb.doc(fb.collection(db, 'trades'));
        const normalized = normalizeTrade(trade);
        
        const { date, ...privateData } = normalized;
        delete privateData.id;

        const encryptedPayload = CryptoJS.AES.encrypt(JSON.stringify(privateData), SECRET_KEY).toString();

        batch.set(ref, {
          userId: user.uid,
          date: date || new Date().toISOString().slice(0, 10),
          createdAt: fb.serverTimestamp(),
          encryptedPayload: encryptedPayload,
        });
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.warn('addTrade error:', err);
      return false;
    }
  }, [user]);

  const updateTrade = useCallback(async (tradeId, updates) => {
    if (!user || !tradeId) return false;
    try {
      const ref = fb.doc(db, 'trades', String(tradeId));
      const snap = await fb.getDoc(ref);
      if (!snap.exists() || snap.data()?.userId !== user.uid) return false;

      let existingData = snap.data();
      if (existingData.encryptedPayload) {
        const bytes = CryptoJS.AES.decrypt(existingData.encryptedPayload, SECRET_KEY);
        const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        existingData = { ...existingData, ...decrypted };
      }

      const mergedData = { ...existingData, ...updates };
      const { id, userId, createdAt, encryptedPayload: _oldPayload, date, ...privateData } = mergedData;
      const newEncrypted = CryptoJS.AES.encrypt(JSON.stringify(privateData), SECRET_KEY).toString();

      await fb.updateDoc(ref, {
        date: date,
        encryptedPayload: newEncrypted,
        updatedAt: fb.serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn('updateTrade error:', err);
      return false;
    }
  }, [user]);

  const deleteTrade = useCallback(async (tradeId) => {
    if (!user || !tradeId) return false;
    try {
      const ref = fb.doc(db, 'trades', String(tradeId));
      const snap = await fb.getDoc(ref);
      if (!snap.exists() || snap.data()?.userId !== user.uid) return false;
      await fb.deleteDoc(ref);
      return true;
    } catch (err) {
      console.warn('deleteTrade error:', err);
      return false;
    }
  }, [user]);

  const resetData = useCallback(async () => {
    if (!user) return false;
    try {
      const q = fb.query(fb.collection(db, 'trades'), fb.where('userId', '==', user.uid));
      const snap = await fb.getDocs(q);
      const chunks = [];
      for (let i = 0; i < snap.docs.length; i += 450) {
        chunks.push(snap.docs.slice(i, i + 450));
      }
      for (const chunk of chunks) {
        const batch = fb.writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      const userRef = fb.doc(db, 'users', user.uid);
      try {
        const userSnap = await fb.getDoc(userRef);
        if (userSnap.exists()) {
          await fb.updateDoc(userRef, { settings: fb.deleteField() });
        }
      } catch (settingsErr) {
        console.warn('resetData settings cleanup skipped:', settingsErr);
      }
      setTrades([]);
      return true;
    } catch (err) {
      console.warn('resetData error:', err);
      return false;
    }
  }, [user]);

  const logout = useCallback(async () => {
    try { await fb.signOut(auth); } catch (err) { console.warn('logout error:', err); }
  }, []); 

  const deleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return { ok: false, message: 'No authenticated user.' };

    try {
      const q = fb.query(fb.collection(db, 'trades'), fb.where('userId', '==', currentUser.uid));
      const snap = await fb.getDocs(q);
      const chunks = [];
      for (let i = 0; i < snap.docs.length; i += 450) {
        chunks.push(snap.docs.slice(i, i + 450));
      }
      for (const chunk of chunks) {
        const batch = fb.writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      const userBatch = fb.writeBatch(db);
      userBatch.delete(fb.doc(db, 'users', currentUser.uid));
      await userBatch.commit();
      await fb.deleteUser(currentUser);
      setUser(null);
      setTrades([]);
      return { ok: true };
    } catch (err) {
      console.error('deleteAccount error:', err);
      const needsLogin = err.code === 'auth/requires-recent-login';
      return { ok: false, message: needsLogin ? 'Please log out, sign in again, and then delete the account.' : 'Deletion failed.' };
    }
  }, []);

  const value = {
    user, trades, setTrades, market, setMarket, theme, setTheme,
    loading, addTrade, updateTrade, deleteTrade, resetData, logout, deleteAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
