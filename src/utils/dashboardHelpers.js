// src/utils/dashboardHelpers.js
// Pure utility functions for Dashboard operations

import html2canvas from 'html2canvas';

/**
 * Download dashboard as HD PNG image 
 * (Extracted from Dashboard.jsx handleDownloadImage)
 */
export async function downloadDashboardImage(targetEl, theme) {
  if (!targetEl) throw new Error('No target element provided');
  
  const dynamicBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-page').trim();

  const canvas = await html2canvas(targetEl, {
    backgroundColor: dynamicBg,
    scale: 3,
    useCORS: true,
    logging: false,
  });

  // Watermark (identical to original)
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
}

/**
 * Export trades to CSV 
 * (Placeholder - full impl in Phase 3)
 */
export function exportTradesToCSV(trades) {
  if (!trades?.length) {
    throw new Error('No trades to export');
  }
  
  const headers = Object.keys(trades[0]).join(',');
  const rows = trades.map(t => Object.values(t).join(',')).join('\\n');
  const blob = new Blob([`${headers}\\n${rows}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RuleBook_Trades.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV file and return trades array
 * (Placeholder - full impl in Phase 3) 
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\\n').filter(r => r.trim());
        if (rows.length < 2) throw new Error('Invalid CSV');
        
        const headers = rows[0].split(',').map(h => h.trim());
        const parsedTrades = rows.slice(1).map(row => {
          const values = row.split(',').map(v => v.trim());
          return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
        });
        resolve(parsedTrades);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Create data backup JSON
 */
export function createDataBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'RuleBook_Backup.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Constants (will consolidate in Phase 3) ──
export const DROPDOWN_CLASSES = 
  'absolute right-0 mt-3 p-2 bg-[var(--drawer-bg)] border border-[var(--nav-border)] ' +
  'shadow-2xl backdrop-blur-2xl rounded-2xl w-44 z-[999] origin-top-right ' +
  'transition-all duration-200';

export const TABS_CONFIG = {
  dashboard: { icon: 'fa-chart-pie', label: 'DASH' },
  journal: { icon: 'fa-book', label: 'JOUR' },
  risk: { icon: 'fa-shield-halved', label: 'RISK' },
  analytics: { icon: 'fa-chart-line', label: 'ANLT' },
  settings: { icon: 'fa-gear', label: 'SET' },
};

