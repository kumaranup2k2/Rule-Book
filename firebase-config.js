import { initializeApp } from "----------";
import { getFirestore, collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc, orderBy, setDoc, getDoc, deleteDoc } from "----";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, EmailAuthProvider, reauthenticateWithCredential } from "----";

const firebaseConfig = {
    apiKey: "API Key",
    authDomain: "-----",
    projectId: "----",
    storageBucket: "----",
    messagingSenderId: "----",
    appId: "----",
    measurementId: "----"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const fb = { 
    collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc, orderBy, setDoc, getDoc, deleteDoc,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInWithPopup,
    EmailAuthProvider, reauthenticateWithCredential 
};