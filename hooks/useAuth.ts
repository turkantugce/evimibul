import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';

interface UserData {
  name: string;
  username?: string; // YENİ: Username alanı
  bio?: string;
  email: string;
  phone?: string;
  location?: string;
  photoURL?: string;
  createdAt?: any;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Auth listener kuruldu');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state değişti:', firebaseUser ? 'Giriş yapıldı' : 'Çıkış yapıldı');
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        console.log('👤 Kullanıcı ID:', firebaseUser.uid);
        await loadUserData(firebaseUser);
      } else {
        console.log('❌ Kullanıcı yok, userData temizleniyor');
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => {
      console.log('🔒 Auth listener temizlendi');
      unsubscribe();
    };
  }, []);

  const loadUserData = async (firebaseUser: User) => {
    try {
      console.log('📥 Kullanıcı verisi yükleniyor:', firebaseUser.uid);
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        console.log('✅ Kullanıcı verisi yüklendi:', data.name);
        setUserData(data);
      } else {
        console.log('⚠️ Kullanıcı dokümanı bulunamadı, varsayılan oluşturuluyor');
        
        const defaultData: UserData = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı',
          email: firebaseUser.email || '',
          bio: '',
          createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), defaultData);
        setUserData(defaultData);
        console.log('✅ Varsayılan kullanıcı verisi oluşturuldu');
      }
    } catch (error) {
      console.error('❌ Kullanıcı verisi yükleme hatası:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Giriş yapılıyor:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Giriş başarılı');
      
      await loadUserData(userCredential.user);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error('❌ Giriş hatası:', error.code, error.message);
      
      let errorMessage = 'Giriş yapılırken bir hata oluştu';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Bu hesap devre dışı bırakılmış';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Kullanıcı bulunamadı';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Hatalı şifre';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'E-posta veya şifre hatalı';
          break;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // YENİ: Username kontrol fonksiyonu
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      return !usernameDoc.exists();
    } catch (error) {
      console.error('Username kontrol hatası:', error);
      return false;
    }
  };

  // YENİ: Username güncelleme fonksiyonu
  const updateUsername = async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Kullanıcı girişi gerekli' };
    }

    if (!username.trim() || username.length < 3) {
      return { success: false, error: 'Kullanıcı adı en az 3 karakter olmalı' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { success: false, error: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir' };
    }

    try {
      const usernameLower = username.toLowerCase();

      // Username kontrolü
      const isAvailable = await checkUsernameAvailability(usernameLower);
      if (!isAvailable) {
        return { success: false, error: 'Bu kullanıcı adı zaten alınmış' };
      }

      // Eski username'i serbest bırak
      if (userData?.username) {
        try {
          await updateDoc(doc(db, 'usernames', userData.username.toLowerCase()), {
            releasedAt: serverTimestamp()
          });
        } catch (error) {
          console.log('Eski username serbest bırakılamadı:', error);
        }
      }

      // Yeni username'i rezerve et
      await setDoc(doc(db, 'usernames', usernameLower), {
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // User dokümanını güncelle
      await updateDoc(doc(db, 'users', user.uid), {
        username: usernameLower,
        updatedAt: serverTimestamp()
      });

      // Local state'i güncelle
      setUserData(prev => {
        if (!prev) return null;
        return { ...prev, username: usernameLower };
      });

      console.log('✅ Username güncellendi:', usernameLower);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Username güncelleme hatası:', error);
      return { 
        success: false, 
        error: error.message || 'Username güncellenirken bir hata oluştu' 
      };
    }
  };

  // GÜNCELLENDİ: Username parametresi eklendi
  const signUp = async (email: string, password: string, name: string, username?: string) => {
    try {
      console.log('📝 Kayıt olunuyor:', email, 'Username:', username);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Hesap oluşturuldu');
      
      // Kullanıcı profilini güncelle
      await updateProfile(userCredential.user, {
        displayName: name
      });
      console.log('✅ Profil güncellendi');

      // Firestore'da kullanıcı dokümanı oluştur
      const userData: UserData = {
        name: name,
        email: email,
        username: username?.toLowerCase(), // YENİ: Username kaydediliyor
        bio: '',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Eğer username verildiyse, usernames koleksiyonuna da kaydet
      if (username) {
        await setDoc(doc(db, 'usernames', username.toLowerCase()), {
          userId: userCredential.user.uid,
          createdAt: serverTimestamp()
        });
        console.log('✅ Username rezerve edildi:', username);
      }

      setUserData(userData);
      console.log('✅ Kullanıcı dokümanı oluşturuldu');

      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error('❌ Kayıt hatası:', error.code, error.message);
      
      let errorMessage = 'Kayıt olurken bir hata oluştu';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi';
          break;
        case 'auth/weak-password':
          errorMessage = 'Şifre çok zayıf';
          break;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const updateUserProfile = async (updates: { name?: string; bio?: string; phone?: string; location?: string; photoURL?: string }) => {
    if (!user) {
      console.log('❌ Kullanıcı girişi yok');
      return { success: false, error: 'Kullanıcı girişi yok' };
    }

    try {
      console.log('🔄 Profil güncelleniyor:', updates);
      
      // Firestore'da güncelle
      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Firestore güncellendi');

      // Firebase Auth profilini güncelle
      if (updates.name) {
        await updateProfile(user, {
          displayName: updates.name
        });
        console.log('✅ Auth profili güncellendi');
      }

      // Local state'i güncelle
      setUserData(prev => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });
      console.log('✅ Local state güncellendi');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Profil güncelleme hatası:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      console.log('=== ÇIKIŞ İŞLEMİ BAŞLADI ===');
      console.log('Mevcut user:', user?.email);
      console.log('Auth nesnesi:', auth ? 'Var' : 'Yok');
      
      // Firebase signOut
      await signOut(auth);
      console.log('Firebase signOut tamamlandı');
      
      // State temizleme
      setUser(null);
      setUserData(null);
      console.log('State temizlendi');
      
      console.log('=== ÇIKIŞ İŞLEMİ BİTTİ ===');
      return { success: true };
    } catch (error: any) {
      console.error('=== ÇIKIŞ HATASI ===');
      console.error('Hata kodu:', error.code);
      console.error('Hata mesajı:', error.message);
      console.error('Tam hata:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    checkUsernameAvailability, // YENİ
    updateUsername, // YENİ
    setUserData // YENİ: updateUsername için gerekli
  };
}