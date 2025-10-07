import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "FIREBASE_API_KEYİN",
  authDomain: "FIREBASE_PROJE_ADIN.firebaseapp.com",
  projectId: "FIREBASE_PROJE_IDN",
  storageBucket: "FIREBASE_PROJE_ADIN.appspot.com",
  messagingSenderId: "XXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXX"
  measurementId: ""
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
