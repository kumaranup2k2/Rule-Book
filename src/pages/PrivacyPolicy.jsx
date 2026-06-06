import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/common/ThemeToggle';
import { useApp } from '../context/AppContext';

function PrivacyPolicy() {
  const [activeTab, setActiveTab] = useState('policy');
  const { theme, setTheme } = useApp();
  const dk = theme === 'dark';
  const setDk = (next) => {
    setTheme(prev => {
      const nextDk = typeof next === 'function' ? next(prev === 'dark') : next;
      return nextDk ? 'dark' : 'light';
    });
  };

  const toggleTheme = () => {
    setDk(prev => !prev);
  };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--txt-primary)', transition: 'background-color 0.5s, color 0.5s' }}>

      {/* Background Orbs */}
      <div className="fixed w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.12] -z-10 top-[-10%] left-[-5%]"
        style={{ background: 'var(--orb1-color)' }} />
      <div className="fixed w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.12] -z-10 bottom-[-10%] right-[-5%]"
        style={{ background: 'var(--orb2-color)' }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl"
        style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bar-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative flex flex-col md:flex-row md:items-center md:h-14">
          <div className="flex items-center justify-between w-full h-14 md:w-auto">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => window.location.href='/'}>
              <span className="text-sm md:text-base font-black tracking-[0.2em] uppercase rb-brand">RULEBOOK</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle
                isDark={dk}
                onToggle={toggleTheme}
                trackClassName="border"
                className="bg-[rgba(0,0,0,0.2)] border-[var(--card-border)]"
              />
              <button onClick={() => window.location.href='/'}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-bar)', border: '1px solid var(--card-border)', color: 'var(--txt-muted)' }}>
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          <div className="flex w-full md:w-auto overflow-x-auto gap-2 pb-3 md:pb-0 md:absolute md:left-1/2 md:-translate-x-1/2 scrollbar-hide">
            {['policy', 'notice', 'minimization'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all duration-300 shrink-0"
                style={{
                  color: activeTab === tab ? 'var(--accent-indian)' : 'var(--txt-muted)',
                  background: activeTab === tab ? 'rgba(0,209,255,0.08)' : 'transparent',
                  border: activeTab === tab ? '1px solid rgba(0,209,255,0.2)' : '1px solid transparent',
                }}>
                {tab === 'policy' ? 'Policy' : tab === 'notice' ? 'Disclosure' : 'Technical'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-28 md:pt-24 pb-12">
        <AnimatePresence mode="wait">

          {activeTab === 'policy' && (
            <motion.div key="policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="backdrop-blur-2xl rounded-[24px] md:rounded-[32px] p-6 md:p-10"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h2 className="text-xl md:text-2xl font-extrabold mb-6 md:mb-8 uppercase tracking-tight" style={{ color: 'var(--txt-primary)' }}>
                Privacy Policy
              </h2>
              <div className="space-y-6 md:space-y-8 text-[12px] md:text-sm leading-relaxed" style={{ color: 'var(--txt-muted)' }}>
                <section className="p-4 md:p-5 rounded-2xl" style={{ background: 'var(--bg-bar)', border: '1px solid var(--card-border)' }}>
                  <h3 className="font-bold uppercase tracking-widest text-[10px] mb-2 md:mb-3" style={{ color: 'var(--accent-indian)' }}>01. Purpose Limitation</h3>
                  <p>Rule Book is engineered to refine trading discipline. We collect only essential data—Google profile details for security and manually logged trade data for your personal performance metrics.</p>
                </section>
                <section>
                  <h3 className="font-bold uppercase tracking-widest text-[10px] mb-3" style={{ color: 'var(--accent-indian)' }}>02. Data Processing & Transparency</h3>
                  <ul className="space-y-3 md:space-y-4">
                    {[
                      { title: "Account Security:", desc: "Authentication is handled exclusively via Google OAuth. We do not see, access, or store your personal passwords." },
                      { title: "Raw P&L Protection:", desc: "Rule Book does not store your original raw brokerage P&L files. Our system processes these files in a temporary volatile memory to extract performance metrics." },
                      { title: "Encrypted Trade Logs:", desc: "The journals and analytics generated from your data are stored in a 256-bit encrypted database on Google Cloud." },
                      { title: "Community & Privacy:", desc: "Trader World interactions are strictly opt-in. Your financial data remains private unless you explicitly broadcast them." }
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 md:gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-bar)', border: '1px solid var(--card-border)' }}>
                        <i className="fa-solid fa-check-double mt-1 text-[10px]" style={{ color: 'var(--accent-indian)' }}></i>
                        <span><strong style={{ color: 'var(--txt-primary)' }}>{item.title}</strong> {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="p-5 md:p-6 rounded-2xl md:rounded-3xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <h3 className="font-bold uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2 text-red-400">
                    <i className="fa-solid fa-circle-exclamation"></i> Regulatory Status & Legal Disclaimer
                  </h3>
                  <p className="text-[11px] md:text-sm leading-relaxed" style={{ color: 'var(--txt-muted)' }}>
                    Rule Book is an independent self-analysis tool and is <strong style={{ color: 'var(--txt-primary)' }}>NOT registered with SEBI</strong> or any other government body. Generated analytics cannot be used for legal purposes or tax filings.
                  </p>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'notice' && (
            <motion.div key="notice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="backdrop-blur-2xl p-6 md:p-10 rounded-[24px] md:rounded-[32px]"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 md:mb-10 text-center" style={{ color: 'var(--txt-primary)' }}>
                Important Disclosures
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { colorVar: 'var(--accent-indian)', title: "Zero API Access", desc: "We never request automated API access to your brokerage accounts." },
                  { colorVar: 'var(--clr-profit)', title: "Non-Custodial", desc: "We do not hold or manage your capital. Rule Book acts only as a visualization engine." },
                  { colorVar: 'var(--accent-indian)', title: "Full Ownership", desc: "You retain 100% ownership of your logs. We do not sell data to brokers." },
                  { colorVar: 'var(--clr-loss)', title: "The Wipe Rule", desc: "Account deletion is instant and irreversible. All records are purged upon request." }
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--bg-bar)', border: '1px solid var(--card-border)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: item.colorVar }}>{item.title}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--txt-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'minimization' && (
            <motion.div key="minimization" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="text-center mb-8">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.3em]" style={{ color: 'var(--accent-indian)' }}>Technical Principle</h2>
                <p className="text-[8px] md:text-[9px] uppercase font-bold tracking-[0.4em] mt-2" style={{ color: 'var(--txt-muted)' }}>Data Minimization Framework</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {[
                  { icon: "fa-microchip", colorVar: 'var(--accent-indian)', title: "Zero PII Policy", desc: "No Phone Numbers, PAN Cards, or Bank details. Identity is tied purely to Google Authentication." },
                  { icon: "fa-fingerprint", colorVar: 'var(--clr-profit)', title: "No Tracking", desc: "We strictly avoid collecting IP addresses, hardware fingerprints, or precise geolocations." },
                  { icon: "fa-rotate", colorVar: 'var(--accent-indian)', title: "Ephemeral Processing", desc: "Broker reports are sanitized in-memory. Only generated performance math is permanently stored." },
                  { icon: "fa-fire", colorVar: 'var(--clr-profit)', title: "Instant Purge", desc: "One-click data wipe protocol ensures zero residual footprints on Google Cloud servers." }
                ].map((item, i) => (
                  <div key={i} className="backdrop-blur-2xl p-6 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <i className={`fa-solid ${item.icon} mb-4 block text-lg`} style={{ color: item.colorVar }}></i>
                    <h4 className="font-bold uppercase tracking-widest text-[10px] mb-2" style={{ color: 'var(--txt-primary)' }}>{item.title}</h4>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--txt-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
