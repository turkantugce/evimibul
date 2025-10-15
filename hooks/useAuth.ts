import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Supabase client importunu unutma!

interface UserData {
  name: string;
  username?: string;
  bio?: string;
  email: string;
  phone?: string;
  location?: string;
  photoURL?: string;
  created_at?: string;
  updated_at?: string;
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Giriş durumunu dinle
  useEffect(() => {
    console.log('🔐 Supabase auth listener başlatıldı');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth değişti:', event);

        if (session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        } else {
          setUser(null);
          setUserData(null);
        }

        setLoading(false);
      }
    );

    // İlk yüklemede mevcut kullanıcıyı kontrol et
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        await loadUserData(data.user.id);
      }
      setLoading(false);
    })();

    return () => {
      console.log('🔒 Supabase auth listener temizlendi');
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Kullanıcı verisini yükle
  const loadUserData = async (userId: string) => {
    try {
      console.log('📥 Kullanıcı verisi yükleniyor:', userId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // kayıt bulunamadı hatası hariç
      if (data) {
        console.log(' Kullanıcı verisi bulundu:', data);
        setUserData(data);
      } else {
        console.log(' Kullanıcı verisi bulunamadı, varsayılan oluşturuluyor');
        const defaultData: UserData = {
          name: 'Kullanıcı',
          email: '',
          bio: '',
        };
        setUserData(defaultData);
      }
    } catch (error) {
      console.error(' Kullanıcı verisi yüklenemedi:', error);
    }
  };

  // 🔹 Giriş yap
  const signIn = async (email: string, password: string) => {
    try {
      console.log(' Giriş yapılıyor:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await loadUserData(data.user.id);
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error(' Giriş hatası:', error.message);
      return { success: false, error: error.message };
    }
  };

  // 🔹 Kayıt ol
  const signUp = async (email: string, password: string, name: string, username?: string) => {
    try {
      console.log(' Kayıt olunuyor:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('Kullanıcı oluşturulamadı');

      // users tablosuna kayıt
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: userId,
          name,
          email,
          username: username?.toLowerCase(),
          bio: '',
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      // username varsa usernames tablosuna ekle
      if (username) {
        await supabase.from('usernames').insert([
          {
            username: username.toLowerCase(),
            user_id: userId,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      await loadUserData(userId);
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error(' Kayıt hatası:', error.message);
      return { success: false, error: error.message };
    }
  };

  // 🔹 Kullanıcı adının uygunluğunu kontrol et
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('usernames')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      return !data; // data yoksa müsaittir
    } catch (error) {
      console.error('Username kontrol hatası:', error);
      return false;
    }
  };

  // 🔹 Username güncelle
  const updateUsername = async (username: string) => {
    if (!user) return { success: false, error: 'Kullanıcı girişi gerekli' };

    try {
      const available = await checkUsernameAvailability(username);
      if (!available) {
        return { success: false, error: 'Bu kullanıcı adı zaten alınmış' };
      }

      // usernames tablosuna kaydet
      await supabase.from('usernames').upsert({
        username: username.toLowerCase(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      });

      // users tablosunu güncelle
      const { error } = await supabase
        .from('users')
        .update({ username: username.toLowerCase(), updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setUserData(prev => (prev ? { ...prev, username: username.toLowerCase() } : prev));
      console.log('✅ Username güncellendi:', username);
      return { success: true };
    } catch (error: any) {
      console.error(' Username güncelleme hatası:', error.message);
      return { success: false, error: error.message };
    }
  };

  // 🔹 Profil güncelle
  const updateUserProfile = async (updates: Partial<UserData>) => {
    if (!user) return { success: false, error: 'Kullanıcı girişi yok' };

    try {
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setUserData(prev => (prev ? { ...prev, ...updates } : prev));
      return { success: true };
    } catch (error: any) {
      console.error(' Profil güncelleme hatası:', error.message);
      return { success: false, error: error.message };
    }
  };

  // 🔹 Çıkış yap
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserData(null);
      console.log('✅ Kullanıcı çıkış yaptı');
      return { success: true };
    } catch (error: any) {
      console.error(' Çıkış hatası:', error.message);
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
    checkUsernameAvailability,
    updateUsername,
    setUserData,
  };
}
