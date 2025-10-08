import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "-",
  authDomain: "-",
  projectId: "-",
  storageBucket: "-",
  messagingSenderId: "-",
  appId: "-",
  measurementId: "-"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth with persistence for web
const auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
