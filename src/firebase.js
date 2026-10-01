import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env) ? process.env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyFakeKeyForTestEnvironment123456",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "sportiq-test.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "sportiq-test",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "sportiq-test.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

import { getStorage } from "firebase/storage";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
