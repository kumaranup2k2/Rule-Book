import React, { useState } from 'react';
import ThemeToggle from '../components/common/ThemeToggle';
import { useApp } from '../context/AppContext';
// import { auth, db } from './firebase-config';
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

function AdminLogin() {
  const [userId, setUserId] = useState('');
  const [userPass, setUserPass] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useApp();
  const dk = theme === 'dark';

  const toggleTheme = () => {
    setTheme(dk ? 'light' : 'dark');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fakeEmail = `${userId.trim()}@admin.com`;

    try {
      // FIREBASE LOGIC (Uncomment when Firebase is setup)
      /*
      const cred = await signInWithEmailAndPassword(auth, fakeEmail, userPass);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === 'super_admin') {
              window.location.href = '/admin-dashboard';
          } else if (data.assignedProject === 'rulebook') {
              window.location.href = '/rule-book';
          } else if (data.assignedProject === 'traderworld') {
              window.location.href = '/trader-world';
          } else {
              setError("No project assigned to this user.");
          }
      } else {
          setError("User profile not found in database.");
      }
      */
      setTimeout(() => { setLoading(false); setError("Firebase connection not active yet."); }, 1500);
    } catch (err) {
      setError("Invalid User ID or Password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{ backgroundColor: 'var(--bg-page)', transition: 'background-color 0.5s' }}>

      {/* Background Orbs */}
      <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15 top-[-100px] left-[-100px]"
        style={{ background: 'var(--orb1-color)' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-15 bottom-[-150px] right-[-100px]"
        style={{ background: 'var(--orb2-color)' }} />

      {/* Theme Toggle - top right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle
          isDark={dk}
          onToggle={toggleTheme}
          trackClassName="border"
          className="bg-[rgba(0,0,0,0.2)] border-[var(--card-border)]"
        />
      </div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => window.location.href='/'}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
          style={{ color: 'var(--txt-muted)' }}>
          <i className="fa-solid fa-arrow-left text-[10px]" /> Back
        </button>
      </div>

      {/* Glass Panel Form */}
      <div className="backdrop-blur-xl rounded-3xl p-10 w-full max-w-md z-10 text-center"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 15px 35px rgba(0,0,0,0.25)' }}>
        <h2 className="font-bold tracking-widest uppercase mb-1 text-2xl" style={{ color: 'var(--txt-primary)' }}>
          Secure Login
        </h2>
        <p className="text-xs mb-8" style={{ color: 'var(--txt-muted)' }}>Enter your workspace credentials</p>

        {error && (
          <div className="p-3 rounded-lg mb-6 text-xs text-left flex items-center gap-2 text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="text"
              placeholder="User ID (e.g. anup)"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-4 rounded-xl outline-none transition-all"
              style={{
                background: 'var(--bg-bar)',
                border: '1px solid var(--card-border)',
                color: 'var(--txt-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-indian)'}
              onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              className="w-full p-4 rounded-xl outline-none transition-all"
              style={{
                background: 'var(--bg-bar)',
                border: '1px solid var(--card-border)',
                color: 'var(--txt-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-indian)'}
              onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent-indian)',
              color: 'var(--btn-solid-text)',
              boxShadow: loading ? 'none' : '0 5px 15px rgba(0,209,255,0.25)',
            }}
          >
            {loading
              ? <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Checking...</>
              : "Authenticate"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
