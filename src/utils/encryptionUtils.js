// src/utils/encryptionUtils.js
const APP_SALT = 'RuleBook-AES256-Salt-2026-v2';

// ─── KEY DERIVATION ───
async function deriveKey(userId) {
  const rawKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(userId + APP_SALT),
    'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(APP_SALT), iterations: 150000, hash: 'SHA-256' },
    rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// ─── ENCRYPT/DECRYPT VALUES ───
export async function encryptValue(value, userId) {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0); combined.set(new Uint8Array(encrypted), 12);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptValue(encryptedBase64, userId) {
  const key = await deriveKey(userId);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// ─── TRADE ENCRYPTION ───
const FIELDS = ['pnl', 'script', 'notes', 'emotion', 'mistakes', 'entryPrice', 'exitPrice', 'qty'];

export async function encryptTrade(trade, userId) {
  const base = { ...trade }; const encMap = {};
  for (const f of FIELDS) {
    if (base[f]) { encMap[`_enc_${f}`] = await encryptValue(base[f], userId); delete base[f]; }
  }
  return { ...base, ...encMap, _encrypted: true };
}

export async function decryptTrade(trade, userId) {
  if (!trade._encrypted) return trade;
  const res = { ...trade };
  for (const f of FIELDS) {
    const k = `_enc_${f}`;
    if (trade[k]) { try { res[f] = await decryptValue(trade[k], userId); } catch { res[f] = f==='pnl'?0:''; } delete res[k]; }
  }
  return res;
}
