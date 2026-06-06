import React from 'react';

/* -------------------------------------------------------------------------- */
/* HELPER COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

function FaIcon({ name, className = '', ...props }) {
  return <i className={`fa-solid ${name} ${className}`} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* LOGOS & BRAND ICONS                                                        */
/* -------------------------------------------------------------------------- */

/* RuleBook SVG Logo */
export function RBLogo({ id = 'rb', className = 'h-8 w-auto' }) {
  const gradientId = `${id}Grad`;
  return (
    <svg id={id} className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="38" y1="56" x2="456" y2="472" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--hl-from)" />
          <stop offset="0.5" stopColor="var(--hl-via)" />
          <stop offset="1" stopColor="var(--hl-to)" />
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="488" height="488" rx="100" fill="transparent" stroke={`url(#${gradientId})`} strokeWidth="22" />
      <path d="M140 143H289C350 143 386 176 386 227C386 278 350 310 289 310H140M289 310L378 405" stroke={`url(#${gradientId})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Default Logo Export
export const Logo = RBLogo;

/* Placeholder ecosystem icon */
export function EcoIcon({ dk }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={dk ? 'var(--color-cyan)' : 'var(--color-purple)'} strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="4" fill={dk ? 'var(--color-cyan)' : 'var(--color-purple)'} opacity="0.4" />
    </svg>
  );
}

/* Rulebook Pro alternative Logo */
export const LogoPro = ({ className = '', id = 'logo-pro' }) => (
  <div className={`flex items-center gap-2 ${className}`} id={id}>
    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--accent-indian), var(--accent-foreign))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L16 7V11L9 16L2 11V7L9 2Z" fill="white" fillOpacity=".9"/>
      </svg>
    </div>
    <div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 900, letterSpacing: '0.06em', color: 'var(--txt-primary)', lineHeight: 1 }}>RULEBOOK</div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--txt-muted)', lineHeight: 1, marginTop: 2 }}>Pro</div>
    </div>
  </div>
);


/* -------------------------------------------------------------------------- */
/* ICONS OBJECT - CLEANED & STANDARDIZED                                      */
/* -------------------------------------------------------------------------- */

export const Icons = {
  // ── 1. FONT AWESOME CLASSES (Legacy Menu Icons) ──
  dashboard: "fa-solid fa-chart-pie",
  profile: "fa-solid fa-user",
  settings: "fa-solid fa-gear",
  messages: "fa-solid fa-envelope",
  bell: "fa-solid fa-bell",
  trending: "fa-solid fa-fire",
  close: "fa-solid fa-xmark",

  // ── 2. FONT AWESOME COMPONENTS ──
  Alert: (props) => <FaIcon name="fa-triangle-exclamation" {...props} />,
  CheckCircle: (props) => <FaIcon name="fa-circle-check" {...props} />,
  Cross: (props) => <FaIcon name="fa-circle-xmark" {...props} />,
  Flame: (props) => <FaIcon name="fa-fire" {...props} />,
  Folder: (props) => <FaIcon name="fa-folder-open" {...props} />,
  Inbox: (props) => <FaIcon name="fa-inbox" {...props} />,
  Logout: (props) => <FaIcon name="fa-right-from-bracket" {...props} />,
  Target: (props) => <FaIcon name="fa-bullseye" {...props} />,

  // ── 3. MODERN SVG COMPONENTS (Standardized) ──
  ChartPie: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
  Book: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Calculator: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>,
  LineChart: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Gear: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Plus: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Moon: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Upload: ({ size = 20, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Shield: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  TrendUp: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  TrendDown: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  Brain: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" className={className}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z"/></svg>,
  India: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Globe: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Edit: ({ size = 13, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Briefcase: ({ size = 20, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,

  // ── 4. SETTINGS & UTILITY SVG ICONS ──
  Eye: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Warning: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2v2M12 20v-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.1 9.08l1.41 1.41M20.49 14.92l1.41 1.41M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Clock: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Check: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>,
  Download: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 10 12 15 7 10"/><polyline points="12 15 12 3"/></svg>,
  Trash: ({ size = 16, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Lock: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Info: ({ size = 14, className = '', color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  VerifiedBadge: ({ size = 16, className = '' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`ml-1.5 inline-block ${className}`}><path d="M10.52 2.62C11.31 1.75 12.69 1.75 13.48 2.62L14.5 3.74C14.9 4.18 15.48 4.42 16.07 4.4L17.58 4.32C18.76 4.27 19.73 5.24 19.68 6.42L19.6 7.93C19.58 8.52 19.82 9.1 20.26 9.5L21.38 10.52C22.25 11.31 22.25 12.69 21.38 13.48L20.26 14.5C19.82 14.9 19.58 15.48 19.6 16.07L19.68 17.58C19.73 18.76 18.76 19.73 17.58 19.68L16.07 19.6C15.48 19.58 14.9 19.82 14.5 20.26L13.48 21.38C12.69 22.25 11.31 22.25 10.52 21.38L9.5 20.26C9.1 19.82 8.52 19.58 7.93 19.6L6.42 19.68C5.24 19.73 4.27 18.76 4.32 17.58L4.4 16.07C4.42 15.48 4.18 14.9 3.74 14.5L2.62 13.48C1.75 12.69 1.75 11.31 2.62 10.52L3.74 9.5C4.18 9.1 4.42 8.52 4.4 7.93L4.32 6.42C4.27 5.24 5.24 4.27 6.42 4.32L7.93 4.4C8.52 4.42 9.1 4.18 9.5 3.74L10.52 2.62Z" fill="var(--color-cyan)"/><path d="M10.33 14.33L7.17 11.17L8.11 10.23L10.33 12.45L15.89 6.89L16.83 7.83L10.33 14.33Z" fill="var(--btn-solid-text)"/></svg>,
};
