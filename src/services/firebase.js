// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, onSnapshot, 
    doc, updateDoc, orderBy, limit, setDoc, getDoc, deleteDoc, 
    deleteField, writeBatch, serverTimestamp
} from "firebase/firestore";

import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, 
    EmailAuthProvider, reauthenticateWithCredential, deleteUser
} from "firebase/auth";

// Vite ke liye import.meta.env aur VITE_ prefix use karna zaroori hai
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Exporting fb object — includes ALL needed Firestore + Auth functions
export const fb = { 
    // Firestore
    collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc, 
    orderBy, limit, setDoc, getDoc, deleteDoc, deleteField, writeBatch,
    serverTimestamp,                        // FIX: was missing — SettingsTab needs this
    // Auth
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged,
    signOut, signInWithPopup, EmailAuthProvider, reauthenticateWithCredential, deleteUser
};
