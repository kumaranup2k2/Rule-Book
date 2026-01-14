import { auth, db, fb, googleProvider } from './firebase-config.js';

window.togglePasswordVisibility = () => {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

window.toggleAuth = () => {
    const signupFields = document.getElementById('signupFields');
    const authTitle = document.getElementById('authTitle');
    const authBtn = document.getElementById('authBtn');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');

    if (signupFields.classList.contains('hidden')) {
        signupFields.classList.remove('hidden');
        authTitle.innerText = "Create Account";
        authBtn.innerText = "SIGN UP";
        toggleText.innerText = "Already have an account?";
        toggleBtn.innerText = "Login";
    } else {
        signupFields.classList.add('hidden');
        authTitle.innerText = "Welcome Back";
        authBtn.innerText = "LOGIN";
        toggleText.innerText = "New to Rule Book?";
        toggleBtn.innerText = "Create Account";
    }
};

window.handleAuth = async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value;
    const isSignup = !document.getElementById('signupFields').classList.contains('hidden');

    if (!email || !pass) return alert("Bhai, credentials toh bhardo!");

    try {
        if (isSignup) {
            const name = document.getElementById('userName').value.trim();
            const cap = document.getElementById('startCap').value;
            if (!name || !cap) return alert("Naam aur Capital bhi zaruri hai!");

            const res = await fb.createUserWithEmailAndPassword(auth, email, pass);
            await fb.setDoc(fb.doc(db, "users", res.user.uid), {
                name: name,
                startingCapital: parseFloat(cap),
                email: email,
                createdAt: Date.now()
            });
        } else {
            await fb.signInWithEmailAndPassword(auth, email, pass);
        }
        window.location.href = "dashboard.html";
    } catch (e) {
        alert("Auth Error: " + e.message);
    }
};

window.loginWithGoogle = async () => {
    try {
        const res = await fb.signInWithPopup(auth, googleProvider);
        const userDoc = await fb.getDoc(fb.doc(db, "users", res.user.uid));
        
        if (!userDoc.exists()) {
            const cap = prompt("Welcome! Please enter your Starting Capital (₹):", "10000");
            await fb.setDoc(fb.doc(db, "users", res.user.uid), {
                name: res.user.displayName,
                startingCapital: parseFloat(cap || 0),
                email: res.user.email,
                createdAt: Date.now()
            });
        }
        window.location.href = "dashboard.html";
    } catch (e) {
        alert("Google Login Failed: " + e.message);
    }
};