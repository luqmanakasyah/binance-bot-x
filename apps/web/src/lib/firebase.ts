import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyDHDRqid66sXt4n-Rsled5pRE6umFRImQs",
    authDomain: "binance-bot-x.firebaseapp.com",
    projectId: "binance-bot-x",
    storageBucket: "binance-bot-x.firebasestorage.app",
    messagingSenderId: "883648805535",
    appId: "1:883648805535:web:052573b26b8569b57ec0aa",
    measurementId: "G-HWMRCS27HN"
};

// Initialize only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-southeast1");
