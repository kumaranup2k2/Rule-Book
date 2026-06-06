import { db, fb } from './firebase';

/* ────────────────────────────────────────────
   GET ALL TRADES
──────────────────────────────────────────── */
export async function getTrades(userId) {
  try {
    if (!userId) return [];

    const ref = fb.collection(db, 'trades');
    const q = fb.query(ref, fb.where('userId', '==', userId));
    const snap = await fb.getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error("Trade fetch error:", err);
    return [];
  }
}

/* ────────────────────────────────────────────
   ADD TRADE
──────────────────────────────────────────── */
export async function addTrade(trade, userId) {
  try {
    if (!userId) return false;
    const ref = fb.collection(db, 'trades');
    await fb.addDoc(ref, {
      ...trade,
      userId,
      createdAt: fb.serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("Add trade error:", err);
    return false;
  }
}

/* ────────────────────────────────────────────
   DELETE TRADE
──────────────────────────────────────────── */
export async function deleteTrade(id, userId) {
  try {
    if (!id || !userId) return false;
    const ref = fb.doc(db, 'trades', id);
    const snap = await fb.getDoc(ref);
    if (!snap.exists() || snap.data()?.userId !== userId) return false;
    await fb.deleteDoc(ref);
    return true;
  } catch (err) {
    console.error("Delete trade error:", err);
    return false;
  }
}
