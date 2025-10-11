import { initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyD1AMyCZ1YQ54cZgwY9vF2LHfgGUD3yibg",
  authDomain: "petadoptionapp-ec77c.firebaseapp.com",
  projectId: "petadoptionapp-ec77c",
  storageBucket: "petadoptionapp-ec77c.firebasestorage.app",
  messagingSenderId: "880779689169",
  appId: "1:880779689169:web:1fa5d03cf1e178cecdd9f0",
  measurementId: "G-P0DJV9R9MJ"
};

let auth: any;
let db: any;
let storage: any;

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Auth with persistence
  auth = getAuth(app);
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((error: any) => {
      console.log('Persistence ayarı hatası:', error);
    });
  }

  // Database ve Storage başlat
  db = getFirestore(app);
  storage = getStorage(app);

  // Emulator bağlantısı (sadece geliştirme ortamında)
  const useEmulator = true; // Geliştirme sırasında true yapın

  if (useEmulator) {
    try {
      const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      
      // Auth Emulator'a bağlan
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      console.log('✅ Auth Emulator bağlandı');
      
      // Firestore Emulator'a bağlan
      connectFirestoreEmulator(db, emulatorHost, 8080);
      console.log('✅ Firestore Emulator bağlandı');
      
      // Storage Emulator'a bağlan
      connectStorageEmulator(storage, emulatorHost, 9199);
      console.log('✅ Storage Emulator bağlandı');
    } catch (error: any) {
      console.log('Emulator bağlantı hatası:', error.message);
    }
  }
} catch (error: any) {
  console.log('Firebase başlatma hatası:', error.message);
}

export { auth, db, storage };

