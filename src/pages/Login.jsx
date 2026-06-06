import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE IMPORTS ---
import {
  EmailAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase'; 
import { RBLogo } from '../components/ui/Icons';
import ThemeToggle from '../components/common/ThemeToggle';
import { useApp } from '../context/AppContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getFirebaseMessage = (error) => {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'This email already has an account. Please sign in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/credential-already-in-use':
      return 'This email is already linked to an account.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

// ─── LOGO SVG ──────────────────────────────────────────────────────────
function Logo({ id, className = 'h-7 w-auto' }) {
  return <RBLogo id={id} className={`${className} filter drop-shadow-[0_0_8px_rgba(0,242,255,0.2)]`} />;
}

// ─── FULL CARD LOADING OVERLAY ─────────────────────────────────
function LoadingOverlay({ dk, text = "Authenticating" }) {
  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[2.5rem]`}
      style={{ backgroundColor: 'var(--bar-bg)' }}
    >
      <div className="relative flex items-center justify-center w-20 h-20">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className={`absolute inset-0 rounded-full border-4`}
          style={{ borderColor: 'var(--navlink-active-text)', borderTopColor: 'transparent' }}
        />
        <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
          <Logo id="loaderBrand" className="w-8 h-8" />
        </motion.div>
      </div>
      <motion.p 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className={`mt-4 text-[10px] font-black uppercase tracking-[0.3em]`}
        style={{ color: 'var(--navlink-active-text)' }}
      >
        {text}
      </motion.p>
    </motion.div>
  );
}

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const dk = theme === 'dark';
  const setDk = (next) => {
    setTheme(prev => {
      const nextDk = typeof next === 'function' ? next(prev === 'dark') : next;
      return nextDk ? 'dark' : 'light';
    });
  };
  
  // States
  const [isLoginView, setIsLoginView] = useState(location.pathname !== '/signup');
  const [showOauthSetup, setShowOauthSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Authenticating");

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Eye Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);

  const showAuthNotice = useCallback((text, type = 'error') => {
    if (!text) return;
    setAuthNotice({ text, type });
  }, []);

  const processGoogleResult = useCallback((result) => {
    const details = getAdditionalUserInfo(result);
    const user = result.user;

    setFullName(user.displayName || 'Trader');
    setEmail(user.email || '');

    if (details?.isNewUser) {
      showAuthNotice("Account created. Please secure it with a password.", "success");
      setShowOauthSetup(true);
      return;
    }

    const hasPassword = user.providerData.some(provider => provider.providerId === 'password');
    if (!hasPassword) {
      showAuthNotice("Please set a password to secure your account.", "success");
      setShowOauthSetup(true);
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [navigate, showAuthNotice]);

  // AUTO-LOGIN CHECK (Agar user bina logout kiye aaya hai)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !showOauthSetup) {
        // Check agar usne password set kiya hai
        const hasPassword = user.providerData.some(provider => provider.providerId === 'password');
        if (hasPassword) {
          navigate('/dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, showOauthSetup]);

  useEffect(() => {
    let mounted = true;
    getRedirectResult(auth)
      .then((result) => {
        if (!mounted || !result) return;
        processGoogleResult(result);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Firebase redirect error:", error);
        showAuthNotice(getFirebaseMessage(error));
      });
    return () => { mounted = false; };
  }, [processGoogleResult, showAuthNotice]);

  const handleViewSwitch = (toLogin) => {
    setIsLoginView(toLogin);
    setShowOauthSetup(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAuthNotice(null);
  };

  // ─── LOGIN SUBMIT (Email & Password) ───
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthNotice(null);
    if (!emailRegex.test(email)) return showAuthNotice("Please enter a valid email address.");
    if (!password) return showAuthNotice("Please enter your password.");
    
    setLoading(true);
    setLoadingText("Authenticating");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch(error) {
      showAuthNotice(getFirebaseMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ─── GOOGLE AUTH (Master Logic for Login & Signup) ───
  const handleGoogleAuth = async () => {
    setAuthNotice(null);
    setLoading(true);
    setLoadingText("Connecting to Google");
    try {
      const isMobileBrowser = window.matchMedia?.('(max-width: 768px), (pointer: coarse)')?.matches;
      if (isMobileBrowser) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      processGoogleResult(result);
    } catch (error) {
      console.error("Firebase Error:", error);
      showAuthNotice(getFirebaseMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ─── SET PASSWORD FOR GOOGLE ACCOUNT ───
  const handleOauthSubmit = async (e) => {
    e.preventDefault();
    setAuthNotice(null);
    if (password.length < 6) return showAuthNotice("Password must be at least 6 characters long.");
    if (password !== confirmPassword) return showAuthNotice("Passwords do not match.");

    setLoading(true);
    setLoadingText("Saving Secure Password");
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('No authenticated Google user found.');
      const credential = EmailAuthProvider.credential(user.email, password);
      
      // Link password credential to existing google account
      await linkWithCredential(user, credential);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      showAuthNotice(getFirebaseMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── PREMIUM ANIMATIONS ───
  const containerVariants = {
    hidden: (direction) => ({ opacity: 0, x: direction === 'left' ? -30 : 30, filter: 'blur(8px)' }),
    visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: "spring", stiffness: 300, damping: 28, staggerChildren: 0.05, delayChildren: 0.05 } },
    exit: (direction) => ({ opacity: 0, x: direction === 'left' ? 30 : -30, filter: 'blur(8px)', transition: { duration: 0.2 } })
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 28 } }
  };

  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const textItemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // ─── THEME TOKENS ───
  const barGlass = 'bg-[var(--bar-bg)] border-[var(--nav-border)] backdrop-blur-[60px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.6)]';

  const inputGlass = 'bg-[var(--bar-bg)] border-[var(--nav-border)] text-[var(--txt-name)] placeholder:text-[var(--txt-muted)] hover:bg-[var(--bar-bg)] focus:border-[var(--accent-indian)] focus:shadow-[0_0_20px_rgba(99,102,241,0.13)]';

  const inputDisabledGlass = 'bg-[var(--bar-bg)] border-[var(--nav-border)] text-[var(--txt-muted)] cursor-not-allowed opacity-70';

  const txtHead = dk ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-100 to-gray-400' : 'text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-purple-900 to-slate-700';
  const txtSub = dk ? 'text-gray-400' : 'text-slate-500';
  const textHighlight = dk
    ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400'
    : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600';

  const btnPrimary = dk
    ? 'bg-green-500/15 border border-green-400/40 text-green-300 hover:bg-green-500/25 hover:shadow-[0_0_28px_rgba(52,199,89,0.22)] shadow-[0_0_20px_rgba(52,199,89,0.15)]'
    : 'bg-slate-900 border border-slate-900 text-white shadow-xl hover:bg-slate-700 hover:shadow-2xl';

  const btnSocial = dk
    ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'
    : 'bg-white/60 border border-white text-slate-800 hover:bg-white hover:text-slate-900 shadow-sm hover:shadow-lg';

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-x-hidden py-24 md:py-12 font-sans transition-colors duration-700`} style={{ backgroundColor: 'var(--bg-page)' }}>
      
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <AnimatePresence mode="wait">
          {dk ? (
            <motion.div key="dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full" style={{ filter: 'blur(120px)', opacity: 0.5, animation: 'orb-bg 22s ease-in-out infinite', background: 'var(--orb1-color)' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{ filter: 'blur(120px)', opacity: 0.5, animation: 'orb-bg 26s ease-in-out infinite -10s', background: 'var(--orb2-color)' }} />
            </motion.div>
          ) : (
            <motion.div key="light" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full" style={{ filter: 'blur(120px)', opacity: 0.5, animation: 'orb-bg 20s ease-in-out infinite', background: 'var(--orb1-color)' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{ filter: 'blur(120px)', opacity: 0.5, animation: 'orb-bg 24s ease-in-out infinite -7s', background: 'var(--orb2-color)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-0 left-0 w-full p-5 md:p-8 flex justify-between items-center z-50">
        <Link to="/">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`w-10 h-10 flex items-center justify-center rounded-full border backdrop-blur-md shadow-lg transition-colors ${dk ? 'bg-white/10 border-white/20 text-white hover:bg-white/15' : 'bg-white/60 border-white text-slate-700 hover:bg-white/80'}`}>
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </motion.div>
        </Link>
        <ThemeToggle size="sm" isDark={dk} onToggle={() => {
          setDk(d => {
            const newDk = !d;
            return newDk;
          });
        }} trackClassName={`shadow-lg backdrop-blur-md ${dk ? 'bg-white/10 border-white/20' : 'bg-white/60 border-white text-slate-700'}`} />
      </div>

      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className={`border ${barGlass} p-6 md:p-12 rounded-[2.5rem] w-[92%] max-w-[400px] md:max-w-[850px] z-10 relative flex flex-col md:flex-row items-center justify-center overflow-hidden`}>
        
        <AnimatePresence>
          {loading && <LoadingOverlay dk={dk} text={loadingText} />}
        </AnimatePresence>

        <div className={`absolute top-0 left-0 w-full h-[2.5px] opacity-80 ${dk ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' : 'bg-gradient-to-r from-transparent via-purple-500 to-transparent'}`}></div>

        <motion.div variants={textContainerVariants} initial="hidden" animate="visible" className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left md:pr-10 md:border-r border-white/10 mb-8 md:mb-0">
          <motion.div variants={textItemVariants} className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] flex items-center justify-center mb-5 border ${dk ? 'bg-white/[0.06] border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)]' : 'bg-white/55 border-white shadow-[inset_0_2px_6px_rgba(255,255,255,0.85)]'}`}>
            <Logo id="logLogoBrand" className="h-7 md:h-8 w-auto" />
          </motion.div>
          <motion.h2 variants={textItemVariants} className={`text-[28px] md:text-[40px] font-black uppercase tracking-[0.1em] leading-[1.1] mb-2.5 ${txtHead}`}>
            {showOauthSetup ? (<>Secure<br/>Profile</>) : isLoginView ? (<>Welcome<br/>Back</>) : (<>Join<br/>RuleBook</>)}
          </motion.h2>
          <motion.p variants={textItemVariants} className={`text-[10px] md:text-[12px] font-bold uppercase tracking-[0.25em] ${textHighlight}`}>
            {showOauthSetup ? 'Setup Master Password' : isLoginView ? 'Fix Your Psychology' : 'Master Your Rules'}
          </motion.p>
          <motion.p variants={textItemVariants} className={`hidden md:block mt-6 text-[12px] leading-relaxed max-w-[260px] ${txtSub}`}>
            {showOauthSetup 
              ? "Set a master password to complete your profile. This allows you to login with email independently anytime." 
              : isLoginView 
                ? "Login with your email and password or use Google to access your dashboard and review your trades." 
                : "We value speed and security. Create your account instantly using Google, then secure it with a custom password."}
          </motion.p>
        </motion.div>

        <div className="w-full md:w-1/2 md:pl-10 relative flex justify-center items-center h-full min-h-[380px]" style={{ perspective: '1000px' }}>
          <div className="w-full max-w-sm absolute"> 
            <AnimatePresence>
              {authNotice?.text && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mb-4 rounded-xl border px-4 py-3 text-[12px] font-bold leading-relaxed ${
                    authNotice.type === 'success'
                      ? 'border-green-400/30 bg-green-500/10 text-green-500'
                      : 'border-red-400/30 bg-red-500/10 text-red-500'
                  }`}
                >
                  {authNotice.text}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              
              {/* ================= OAUTH SETUP FORM ================= */}
              {showOauthSetup ? (
                <motion.div key="oauth" custom="left" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full flex flex-col transform-style-3d">
                  <form onSubmit={handleOauthSubmit} noValidate className="w-full flex flex-col gap-3.5">
                    <motion.div variants={itemVariants} className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <i className={`fa-solid fa-id-badge text-[13px] ${dk ? 'text-gray-500' : 'text-slate-400'}`}></i>
                      </div>
                      <input type="text" value={fullName} readOnly className={`w-full pl-11 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputDisabledGlass}`} />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <i className={`fa-solid fa-envelope text-[13px] ${dk ? 'text-gray-500' : 'text-slate-400'}`}></i>
                      </div>
                      <input type="email" value={email} readOnly className={`w-full pl-11 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputDisabledGlass}`} />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <i className={`fa-solid fa-lock text-[13px] ${dk ? 'text-cyan-400/60' : 'text-purple-600/60'}`}></i>
                      </div>
                      <input type={showPassword ? "text" : "password"} placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-11 pr-10 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputGlass}`} />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => setShowPassword(!showPassword)}>
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[13px] ${dk ? 'text-gray-300' : 'text-slate-600'}`}></i>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <i className={`fa-solid fa-lock text-[13px] ${dk ? 'text-cyan-400/60' : 'text-purple-600/60'}`}></i>
                      </div>
                      <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-11 pr-10 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputGlass}`} />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-[13px] ${dk ? 'text-gray-300' : 'text-slate-600'}`}></i>
                      </div>
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="mt-2 flex gap-3">
                      <motion.button type="button" onClick={() => { setShowOauthSetup(false); setIsLoginView(true); }} disabled={loading} whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} className={`flex-1 py-4 font-black text-[11px] uppercase tracking-[0.1em] rounded-xl transition-all duration-300 disabled:opacity-70 ${btnSocial}`}>Cancel</motion.button>
                      <motion.button whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} type="submit" disabled={loading} className={`flex-[2] py-4 font-black text-[12px] uppercase tracking-[0.15em] rounded-xl transition-all duration-300 disabled:opacity-70 ${btnPrimary}`}>
                        Save Password
                      </motion.button>
                    </motion.div>
                  </form>
                </motion.div>

              ) : isLoginView ? (
                /* ================= LOGIN FORM ================= */
                <motion.div key="login" custom="left" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full flex flex-col transform-style-3d">
                   <form onSubmit={handleLoginSubmit} noValidate className="w-full flex flex-col gap-3.5">
                     <motion.div variants={itemVariants} className="relative w-full">
                       <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                         <i className={`fa-solid fa-envelope text-[13px] ${dk ? 'text-cyan-400/60' : 'text-purple-600/60'}`}></i>
                       </div>
                       <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-11 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputGlass}`} />
                     </motion.div>
                     
                     <motion.div variants={itemVariants} className="relative w-full">
                       <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                         <i className={`fa-solid fa-lock text-[13px] ${dk ? 'text-cyan-400/60' : 'text-purple-600/60'}`}></i>
                       </div>
                       <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-11 pr-10 p-3.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${inputGlass}`} />
                       <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => setShowPassword(!showPassword)}>
                          <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[13px] ${dk ? 'text-gray-300' : 'text-slate-600'}`}></i>
                        </div>
                     </motion.div>

                     <motion.div variants={itemVariants} className="flex justify-end w-full px-1">
                      <a href="#" onClick={async (e) => {
                        e.preventDefault();
                        if (!emailRegex.test(email.trim())) return showAuthNotice("Enter your email first to reset password.", "error");
                        try {
                          await sendPasswordResetEmail(auth, email.trim());
                          showAuthNotice("Password reset email sent.", "success");
                        } catch (error) {
                          showAuthNotice(getFirebaseMessage(error));
                        }
                      }} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${dk ? 'text-gray-400 hover:text-cyan-400' : 'text-slate-500 hover:text-purple-600'}`}>Forgot Password?</a>
                     </motion.div>

                     <motion.div variants={itemVariants} className="mt-1">
                       <motion.button whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} type="submit" disabled={loading} className={`w-full py-4 font-black text-[12px] uppercase tracking-[0.15em] rounded-xl transition-all duration-300 disabled:opacity-70 ${btnPrimary}`}>
                         Sign In to Journal
                       </motion.button>
                     </motion.div>
                   </form>

                  <motion.div variants={itemVariants} className={`flex items-center gap-4 my-5 w-full px-2 ${txtSub}`}>
                    <div className={`h-[1px] flex-grow ${dk ? 'bg-white/20' : 'bg-slate-300'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40">or</span>
                    <div className={`h-[1px] flex-grow ${dk ? 'bg-white/20' : 'bg-slate-300'}`}></div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="w-full">
                    <motion.button type="button" onClick={handleGoogleAuth} disabled={loading} whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} className={`w-full py-4 border-[1.5px] font-black text-[13px] uppercase tracking-[0.15em] rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${btnSocial}`}>
                      <i className="fa-brands fa-google text-lg"></i> Continue with Google
                    </motion.button>
                  </motion.div>

                  <motion.p variants={itemVariants} className={`text-center text-[10px] font-bold uppercase tracking-widest mt-7 w-full ${txtSub}`}>
                    New Trader? <button type="button" onClick={() => handleViewSwitch(false)} className={`ml-2 border-b-2 pb-0.5 cursor-pointer transition-colors ${dk ? 'text-cyan-400 hover:text-cyan-300 border-cyan-400/30 hover:border-cyan-400' : 'text-purple-600 hover:text-purple-500 border-purple-600/30 hover:border-purple-600'}`}>Create Account</button>
                  </motion.p>
                </motion.div>

              ) : (
                /* ================= SIGNUP FORM (GOOGLE ONLY) ================= */
                <motion.div key="signup" custom="right" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full flex flex-col items-center text-center justify-center transform-style-3d h-full pt-4">
                  <motion.div variants={itemVariants} className="w-full mb-8">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 border ${dk ? 'bg-white/5 border-white/10' : 'bg-white/80 border-white shadow-sm'}`}>
                      <i className={`fa-solid fa-shield-halved text-2xl ${dk ? 'text-cyan-400' : 'text-purple-600'}`}></i>
                    </div>
                    <h3 className={`text-[18px] font-black uppercase tracking-[0.15em] ${txtHead}`}>Fast & Secure</h3>
                    <p className={`text-[12px] mt-3 max-w-[250px] mx-auto leading-relaxed ${txtSub}`}>
                      Signup is handled exclusively via Google for your security. You'll set a custom password in the next step.
                    </p>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="w-full">
                    <motion.button type="button" onClick={handleGoogleAuth} disabled={loading} whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} className={`w-full py-5 border-[1.5px] font-black text-[14px] uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 flex items-center justify-center gap-4 ${btnSocial}`}>
                      <i className="fa-brands fa-google text-xl"></i> Signup with Google
                    </motion.button>
                  </motion.div>

                  <motion.p variants={itemVariants} className={`text-center text-[10px] font-bold uppercase tracking-widest mt-8 w-full ${txtSub}`}>
                    Already a member? <button type="button" onClick={() => handleViewSwitch(true)} className={`ml-2 border-b-2 pb-0.5 cursor-pointer transition-colors ${dk ? 'text-fuchsia-400 hover:text-fuchsia-300 border-fuchsia-400/30 hover:border-fuchsia-400' : 'text-pink-600 hover:text-pink-500 border-pink-600/30 hover:border-pink-600'}`}>Sign In</button>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
