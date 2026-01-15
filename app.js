import { auth, db, fb } from './firebase-config.js';

let userUID = "";
let trades = [];
let startingCap = 0;
let weeklyGoal = 5000;
let finalTarget = 50000; 
let lineChart = null;
let pendingAction = null;

window.addEventListener('load', () => {
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();
    revealCards();
});

fb.onAuthStateChanged(auth, async (user) => {
    if (user) {
        userUID = user.uid;
        document.body.style.opacity = "1";
        await loadUserData();
    } else {
        window.location.href = "index.html";
    }
});

async function loadUserData() {
    try {
        const docSnap = await fb.getDoc(fb.doc(db, "users", userUID));
        if (docSnap.exists()) {
            const userData = docSnap.data();
            startingCap = parseFloat(userData.startingCapital || 0);
            document.getElementById('displayUser').innerText = userData.name || "Authorized Trader";
            document.getElementById('totalWithdrawnVal').innerText = (userData.totalWithdrawn || 0).toLocaleString();
            
            const q = fb.query(fb.collection(db, "trades"), fb.where("userId", "==", userUID), fb.orderBy("createdAt", "asc"));
            fb.onSnapshot(q, (snaps) => {
                trades = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
                initDashboard();
            });
        }
    } catch (e) { console.error("System Error:", e); }
}

function initDashboard() {
    const savedGoal = localStorage.getItem('rulebook_weekly_goal');
    if (savedGoal) weeklyGoal = parseFloat(savedGoal);
    document.getElementById('targetDisplay').innerText = `₹${weeklyGoal.toLocaleString()}`;

    const savedFinal = localStorage.getItem('rulebook_final_target');
    if (savedFinal) finalTarget = parseFloat(savedFinal);
    document.getElementById('finalTargetDisplay').innerText = `₹${finalTarget.toLocaleString()}`;
    
    if (!lineChart) initCharts();
    updateUI();
}

function initCharts() {
    const ctxL = document.getElementById('equityChart').getContext('2d');
    const grad = ctxL.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, 'rgba(0, 209, 255, 0.15)');
    grad.addColorStop(1, 'rgba(161, 85, 255, 0)');
    lineChart = new Chart(ctxL, {
        type: 'line',
        data: { labels: ['S'], datasets: [{ data: [startingCap], borderColor: '#00d1ff', tension: 0.4, fill: true, backgroundColor: grad, borderWidth: 3, pointRadius: 0 }]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false }, ticks: { color: '#444' } } }
        }
    });
}

function updateUI() {
    const body = document.getElementById('tableBody');
    body.innerHTML = '';
    let currentBal = startingCap, netTotal = 0, wins = 0, totalDisc = 0, totalTradeCount = 0;
    let totalBrok = 0, totalTax = 0;
    let cData = [startingCap], cLabels = ['S'], thisWeekProfit = 0;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0,0,0,0);

    trades.forEach(tr => {
        const isWithdrawal = tr.type === "WITHDRAWAL";
        const net = tr.pl - (tr.brokerage || 0) - (tr.tax || 0);
        currentBal += net;
        if(!isWithdrawal) {
            netTotal += net;
            totalBrok += (tr.brokerage || 0);
            totalTax += (tr.tax || 0);
            if (net > 0) wins++;
            totalTradeCount += parseInt(tr.qty || 1);
            totalDisc += ((tr.rules || 0) / 3) * 100;
        }
        if (new Date(tr.date) >= startOfWeek) thisWeekProfit += net;
        cData.push(currentBal);
        cLabels.push('');

        body.innerHTML += `
            <tr class="hover:bg-white/[0.02] transition-all border-b border-white/[0.02]">
                <td class="p-6 text-[10px] text-gray-500 font-mono">${tr.date}</td>
                <td class="p-6 text-xs font-black italic ${isWithdrawal ? 'text-red-400' : (net >= 0 ? 'text-cyan-accent' : 'text-red-500')}">
                    <span class="currency-symbol">₹</span>${Math.abs(net).toLocaleString()} ${isWithdrawal ? '(OUT)' : ''}
                </td>
                <td class="p-6 text-[10px] text-gray-700 font-black uppercase italic">${isWithdrawal ? 'WITHDRAWAL' : (tr.qty || 1) + ' Trades'}</td>
                <td class="p-6 text-right">
                    <button onclick="delTrade('${tr.id}')" class="text-gray-800 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
                </td>
            </tr>`;
    });

    animateValue("displayCapVal", 0, currentBal, 1000);
    animateValue("totalNetVal", 0, netTotal, 1000);
    animateValue("totalTradesVal", 0, totalTradeCount, 1000);
    animateValue("totalBrokVal", 0, totalBrok, 1000);
    animateValue("totalTaxVal", 0, totalTax, 1000);
    
    document.getElementById('winRate').innerText = (trades.length - trades.filter(t=>t.type==="WITHDRAWAL").length) > 0 ? ((wins / (trades.length - trades.filter(t=>t.type==="WITHDRAWAL").length)) * 100).toFixed(0) + '%' : '0%';
    document.getElementById('discScore').innerText = trades.length > 0 ? (totalDisc / trades.length).toFixed(0) + '%' : '0%';
    
    let weeklyPercent = Math.max(0, Math.min(100, (thisWeekProfit / weeklyGoal) * 100));
    document.getElementById('progressBar').style.width = `${weeklyPercent}%`;
    document.getElementById('weeklyProfitDisplay').innerText = `₹${thisWeekProfit.toLocaleString()}`;
    document.getElementById('progressPercentText').innerText = `${weeklyPercent.toFixed(0)}% COMPLETED`;

    let finalPercent = Math.max(0, Math.min(100, (netTotal / finalTarget) * 100));
    document.getElementById('finalProgressBar').style.width = `${finalPercent}%`;
    document.getElementById('finalProfitDisplay').innerText = `₹${netTotal.toLocaleString()}`;
    document.getElementById('finalProgressPercentText').innerText = `${finalPercent.toFixed(0)}% COMPLETED`;

    lineChart.data.labels = cLabels;
    lineChart.data.datasets[0].data = cData;
    lineChart.update();
}

window.saveTrade = async () => {
    const pl = parseFloat(document.getElementById('pl').value);
    const date = document.getElementById('date').value;
    const qty = parseInt(document.getElementById('tradeQty').value || 1);
    const brokerage = parseFloat(document.getElementById('brokerage').value || 0);
    const tax = parseFloat(document.getElementById('tax').value || 0);
    const notes = document.getElementById('notes').value;
    const rulesChecked = document.querySelectorAll('.rule-item:checked').length;
    if (!date || isNaN(pl)) return openConfirm("Input Error", "Please provide valid profit and date entries.", () => {}, "fa-circle-exclamation");
    await fb.addDoc(fb.collection(db, "trades"), { userId: userUID, date, pl, qty, brokerage, tax, rules: rulesChecked, notes, createdAt: Date.now() });
    resetForm();
};

window.handleWithdraw = async () => {
    const val = parseFloat(document.getElementById('withdrawInput').value);
    if (isNaN(val) || val <= 0) return;
    openConfirm("Confirm Withdrawal", `Are you sure you want to withdraw ₹${val.toLocaleString()}?`, async () => {
        const u = (await fb.getDoc(fb.doc(db, "users", userUID))).data();
        await fb.updateDoc(fb.doc(db, "users", userUID), { totalWithdrawn: (u.totalWithdrawn || 0) + val });
        await fb.addDoc(fb.collection(db, "trades"), { userId: userUID, date: new Date().toISOString().split('T')[0], pl: -val, qty: 0, type: "WITHDRAWAL", createdAt: Date.now() });
        closeWithdrawModal();
    }, "fa-money-bill-transfer");
};

window.exportData = () => {
    if (trades.length === 0) return;
    let csv = "Date,Gross P&L,Net P&L,Type\n" + trades.map(t => `${t.date},${t.pl},${t.pl- (t.brokerage||0) - (t.tax||0)},${t.type||'TRADE'}`).join("\n");
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Trades_Export_2026.csv`; a.click();
};

window.togglePrivacy = () => {
    const blur = document.getElementById('privacyToggle').checked;
    document.querySelectorAll('.privacy-blur').forEach(el => el.style.filter = blur ? "blur(8px)" : "none");
};

window.toggleSymbol = () => {
    const hide = document.getElementById('symbolToggle').checked;
    document.querySelectorAll('.currency-symbol').forEach(el => el.style.display = hide ? "none" : "inline");
};

window.resetWeeklyManual = () => openConfirm("Reset Progress", "Refresh weekly analytics display?", () => location.reload(), "fa-rotate");
window.setWeeklyGoal = () => openPrompt("Set Weekly Goal", weeklyGoal, (v) => { localStorage.setItem('rulebook_weekly_goal', v); location.reload(); });
window.setFinalTarget = () => openPrompt("Set Final Target", finalTarget, (v) => { localStorage.setItem('rulebook_final_target', v); location.reload(); });

window.logout = () => openConfirm("Log Out", "Are you sure you want to terminate this session?", () => fb.signOut(auth), "fa-right-from-bracket");
window.openWithdrawModal = () => document.getElementById('withdrawModal').classList.remove('hidden');
window.closeWithdrawModal = () => document.getElementById('withdrawModal').classList.add('hidden');
window.openSupportModal = () => { toggleSettings(); document.getElementById('supportModal').classList.remove('hidden'); };
window.closeSupportModal = () => document.getElementById('supportModal').classList.add('hidden');

window.sendSupport = async () => {
    const sub = document.getElementById('supportSubject').value;
    const msg = document.getElementById('supportMsg').value;

    if (!sub || !msg) {
        return openConfirm("Input Error", "Please provide both a subject and a message.", () => {}, "fa-circle-exclamation");
    }

    try {
        await fb.addDoc(fb.collection(db, "feedbacks"), {
            userId: userUID,
            userName: document.getElementById('displayUser').innerText,
            subject: sub,
            message: msg,
            createdAt: Date.now()
        });

        await emailjs.send("service_gxn55lr", "template_hc65nhj", {
            from_name: document.getElementById('displayUser').innerText,
            subject: sub,
            message: msg,
            reply_to: auth.currentUser.email
        }, "GUlvHb09NFXc-NBDB");

        openConfirm("Success", "Feedback submitted successfully. Thank you!", () => {}, "fa-circle-check");
        closeSupportModal();
        document.getElementById('supportSubject').value = "";
        document.getElementById('supportMsg').value = "";
    } catch (e) {
        console.error("Feedback Error:", e);
        openConfirm("System Error", "Failed to process the request. Please try again later.", () => {}, "fa-triangle-exclamation");
    }
};

async function handleActionSuccess() {
    closePwdModal();
    if (pendingAction === 'reset') {
        openConfirm("Wipe All Data", "This action is irreversible. Delete everything?", async () => {
            const snaps = await fb.getDocs(fb.query(fb.collection(db, "trades"), fb.where("userId", "==", userUID)));
            await Promise.all(snaps.docs.map(d => fb.deleteDoc(fb.doc(db, "trades", d.id))));
            await fb.updateDoc(fb.doc(db, "users", userUID), { totalWithdrawn: 0 });
            location.reload();
        }, "fa-triangle-exclamation");
    } else if (pendingAction === 'updateCap') {
        openPrompt("Update Capital", startingCap, async (v) => {
            await fb.updateDoc(fb.doc(db, "users", userUID), { startingCapital: parseFloat(v) });
            location.reload();
        });
    }
}

window.verifyAndAction = (a) => { pendingAction = a; document.getElementById('pwdModal').classList.remove('hidden'); };
window.closePwdModal = () => document.getElementById('pwdModal').classList.add('hidden');

document.getElementById('confirmBtn').onclick = async () => {
    try {
        const cred = fb.EmailAuthProvider.credential(auth.currentUser.email, document.getElementById('verifyPwd').value);
        await fb.reauthenticateWithCredential(auth.currentUser, cred);
        handleActionSuccess();
    } catch (e) { 
        openConfirm("Security", "Verification failed. Incorrect password.", () => {}, "fa-shield-halved"); 
    }
};

window.openConfirm = (t, m, c, i = "fa-circle-question") => {
    document.getElementById('confirmTitle').innerText = t; document.getElementById('confirmMsg').innerText = m;
    document.getElementById('confirmIcon').className = `fa-solid ${i} text-cyan-accent text-xl`;
    document.getElementById('executeBtn').onclick = () => { c(); closeConfirmModal(); };
    document.getElementById('confirmModal').classList.remove('hidden');
};

window.closeConfirmModal = () => document.getElementById('confirmModal').classList.add('hidden');
window.openPrompt = (t, v, c) => {
    document.getElementById('promptTitle').innerText = t; document.getElementById('promptInput').value = v;
    document.getElementById('promptSubmitBtn').onclick = () => { c(document.getElementById('promptInput').value); closePromptModal(); };
    document.getElementById('inputPromptModal').classList.remove('hidden');
};

window.closePromptModal = () => document.getElementById('inputPromptModal').classList.add('hidden');
window.delTrade = async (id) => openConfirm("Delete Record", "Proceed with permanent removal of this trade?", async () => await fb.deleteDoc(fb.doc(db, "trades", id)), "fa-trash-can");

window.animateValue = (id, s, e, d) => {
    const obj = document.getElementById(id); if(!obj) return;
    let startT = null;
    const step = (t) => { if(!startT) startT = t; const prog = Math.min((t-startT)/d, 1); obj.innerText = Math.floor(prog*(e-s)+s).toLocaleString(); if(prog<1) window.requestAnimationFrame(step); };
    window.requestAnimationFrame(step);
};

window.revealCards = () => document.querySelectorAll('.reveal-card').forEach((c, i) => setTimeout(() => c.classList.add('active'), i * 100));
function resetForm() { ["pl", "notes", "tradeQty", "brokerage", "tax"].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; }); document.querySelectorAll('.rule-item').forEach(c => c.checked = false); }

window.toggleSettings = () => {
    const m = document.getElementById('settingsModal'), p = document.getElementById('settingsPanel');
    if(m.classList.contains('hidden')) { m.classList.replace('hidden', 'flex'); setTimeout(() => p.style.transform = "translateX(0)", 10); }
    else { p.style.transform = "translateX(100%)"; setTimeout(() => m.classList.replace('flex', 'hidden'), 400); }
};