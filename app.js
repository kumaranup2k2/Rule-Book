import { auth, db, fb } from './firebase-config.js';

let userUID = "", entries = [], startingCap = 0, pendingAction = null;

window.addEventListener('load', () => {
    document.body.style.opacity = "1";
});

fb.onAuthStateChanged(auth, async (user) => {
    if (user) { 
        userUID = user.uid; 
        await loadData(); 
    } else { 
        window.location.href = "index.html"; 
    }
});

async function loadData() {
    try {
        const docSnap = await fb.getDoc(fb.doc(db, "users", userUID));
        if (docSnap.exists()) {
            const userData = docSnap.data();
            startingCap = parseFloat(userData.startingCapital || 0);
            document.getElementById('displayUser').innerText = userData.name;
            
            document.getElementById('displayCapital').innerText = `₹${startingCap.toLocaleString()}`;
            
            const q = fb.query(
                fb.collection(db, "trades"), 
                fb.where("userId", "==", userUID), 
                fb.orderBy("createdAt", "asc")
            );
            
            fb.onSnapshot(q, (snaps) => {
                entries = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
                render();
            });
        }
    } catch (e) { console.error("Database Load Error:", e); }
}

function render() {
    const body = document.getElementById('journalBody');
    if(!body) return;
    body.innerHTML = '';
    let bal = startingCap;
    
    entries.forEach(e => {
        const net = e.pl - (e.brokerage || 0) - (e.tax || 0);
        bal += net;
        body.innerHTML += `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
                <td class="p-5 text-gray-400 font-medium">${e.date}</td>
                <td class="p-5 font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}">₹${net.toFixed(2)}</td>
                <td class="p-5 font-mono text-blue-300">₹${bal.toLocaleString()}</td>
                <td class="p-5 text-center">
                    <button onclick="del('${e.id}')" class="text-gray-600 hover:text-red-400">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
    });
    document.getElementById('displayCapital').innerText = `₹${bal.toLocaleString()}`;
}

window.saveTrade = async () => {
    const dateInput = document.getElementById('date').value;
    const plInput = parseFloat(document.getElementById('pl').value);
    
    if(!dateInput || isNaN(plInput)) return alert("Please fill in both Date and P&L fields!");
    
    const d = { 
        userId: userUID, 
        date: dateInput, 
        pl: plInput, 
        brokerage: parseFloat(document.getElementById('brokerage').value || 0), 
        tax: parseFloat(document.getElementById('tax').value || 0), 
        notes: document.getElementById('notes').value, 
        createdAt: Date.now() 
    };
    
    try {
        await fb.addDoc(fb.collection(db, "trades"), d);
        resetForm();
    } catch (e) {
        alert("Error saving trade: " + e.message);
    }
};

window.del = async (id) => { 
    if(confirm("Confirm: Delete this trade entry?")) await fb.deleteDoc(fb.doc(db, "trades", id)); 
};

window.toggleSettings = () => {
    const modal = document.getElementById('settingsModal');
    const panel = document.getElementById('settingsPanel');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        panel.style.transform = "translateX(0)";
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        panel.style.transform = "translateX(100%)";
    }
};

window.verifyAndAction = (action) => {
    pendingAction = action;
    const user = auth.currentUser;
    const provider = user.providerData[0].providerId;

    document.getElementById('pwdModal').classList.remove('hidden');
    document.getElementById('pwdModal').classList.add('flex');

    if (provider === 'google.com') {
        document.getElementById('pwdInputSection').classList.add('hidden');
        document.getElementById('confirmBtn').classList.add('hidden');
        document.getElementById('googleVerifySection').classList.remove('hidden');
    } else {
        document.getElementById('pwdInputSection').classList.remove('hidden');
        document.getElementById('confirmBtn').classList.remove('hidden');
        document.getElementById('googleVerifySection').classList.add('hidden');
    }
};

window.closePwdModal = () => document.getElementById('pwdModal').classList.add('hidden');

window.reauthGoogle = async () => {
    try {
        await fb.signInWithPopup(auth, window.googleProvider);
        handleSuccess();
    } catch (e) { alert("Google Re-authentication Failed!"); }
};

document.getElementById('confirmBtn').onclick = async () => {
    const pwd = document.getElementById('verifyPwd').value;
    if(!pwd) return alert("Password is required!");
    try {
        const cred = fb.EmailAuthProvider.credential(auth.currentUser.email, pwd);
        await fb.reauthenticateWithCredential(auth.currentUser, cred);
        handleSuccess();
    } catch (e) { alert("Incorrect Password! Access Denied."); }
};

async function handleSuccess() {
    closePwdModal();
    if (pendingAction === 'updateCap') {
        const n = prompt("Enter New Starting Capital (₹):", startingCap);
        if (n && !isNaN(n)) {
            await fb.updateDoc(fb.doc(db, "users", userUID), { startingCapital: parseFloat(n) });
            location.reload();
        }
    } else if (pendingAction === 'reset') {
        if (confirm("DANGER: This will permanently delete ALL trade data. Continue?")) {
            const docs = await fb.getDocs(fb.query(fb.collection(db, "trades"), fb.where("userId", "==", userUID)));
            await Promise.all(docs.docs.map(d => fb.deleteDoc(fb.doc(db, "trades", d.id))));
            location.reload();
        }
    }
}

window.exportData = () => {
    if(entries.length === 0) return alert("No trades found to export!");
    let csv = "Date,P&L,Brokerage,Tax,Net P&L\n" + 
        entries.map(e => `${e.date},${e.pl},${e.brokerage},${e.tax},${e.pl-e.brokerage-e.tax}`).join("\n");
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `RuleBook_Report_${new Date().toLocaleDateString()}.csv`;
    a.click();
};

window.logout = () => { if(confirm("Are you sure you want to sign out?")) fb.signOut(auth); };

function resetForm() {
    ["date", "pl", "brokerage", "tax", "notes"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
}