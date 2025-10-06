import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD1AMyCZ1YQ54cZgwY9vF2LHfgGUD3yibg",
  authDomain: "petadoptionapp-ec77c.firebaseapp.com",
  projectId: "petadoptionapp-ec77c",
  storageBucket: "petadoptionapp-ec77c.firebasestorage.app",
  messagingSenderId: "880779689169",
  appId: "1:880779689169:web:1fa5d03cf1e178cecdd9f0",
  measurementId: "G-P0DJV9R9MJ"
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