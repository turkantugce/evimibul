import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface User {
  displayName: string | undefined;
  uid: string;
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserData {
  id: string;
  uid: string;
  email: string;
  name?: string;
  username?: string;
  bio?: string;
  phone?: string;
  location?: string;
  photoURL?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserData>) => Promise<{ success: boolean; error?: string }>;
  updateUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Auth başlatılıyor...');

        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⏰ TIMEOUT: Auth initialization timeout');
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        if (error) {
          console.error('❌ Session error:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        console.log('✅ Session kontrolü tamam:', session ? 'Var' : 'Yok');

        if (session?.user) {
          const userObj = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kullanıcı',
            user_metadata: session.user.user_metadata,
          };
          setUser(userObj);
          console.log('✅ User set edildi:', userObj.email);

          fetchUserData(session.user.id).catch(error => {
            console.error('User data fetch error:', error);
          });
        }

        setLoading(false);
        clearTimeout(timeoutId);
        console.log('🎯 Auth initialization COMPLETE - loading false');

      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);

        if (session?.user) {
          const userObj = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kullanıcı',
            user_metadata: session.user.user_metadata,
          };
          setUser(userObj);
          fetchUserData(session.user.id).catch(error => {
            console.error('User data fetch error in listener:', error);
          });
        } else {
          console.log('🚪 User signed out');
          setUser(null);
          setUserData(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('🔥 User data yükleniyor:', userId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // FIX: single() yerine maybeSingle() - null dönebilir

      if (error) {
        console.error('❌ User data query error:', error);
        return;
      }

      // Eğer veri bulunamazsa, userData null olarak kalacak ama hata almayacak
      if (data) {
        console.log('✅ User data loaded:', data.email);
        setUserData({
          id: data.id,
          uid: data.id,
          email: data.email,
          name: data.name,
          username: data.username,
          bio: data.bio,
          phone: data.phone,
          location: data.location,
          photoURL: data.photo_url,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      } else {
        console.log('ℹ️ User data bulunamadı - ilk defa giriş olabilir');
        setUserData(null);
      }
    } catch (error) {
      console.error('❌ User data fetch error:', error);
      setUserData(null);
    }
  };

  const signUp = async (email: string, password: string, name: string, username: string) => {
    try {
      console.log('👤 Yeni kullanıcı kaydı:', email);

      // 1. Auth kaydı yap
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        console.error('❌ User creation failed');
        throw new Error('User creation failed');
      }

      console.log('✅ Auth başarılı, user.id:', authData.user.id);

      // 2. Kısa gecikme - trigger'ın çalışması için
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. UPSERT ile güvenli kayıt/güncelleme
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          uid: authData.user.id,
          email,
          name,
          username,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw dbError;
      }

      console.log('✅ Kullanıcı veritabanına eklendi/güncellendi');

      const userObj = {
        id: authData.user.id,
        uid: authData.user.id,
        email: authData.user.email || '',
        displayName: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Kullanıcı',
        user_metadata: authData.user.user_metadata,
      };
      setUser(userObj);
      
      setUserData({
        id: authData.user.id,
        uid: authData.user.id,
        email,
        name,
        username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Kaydolma başarısız oldu'
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Giriş yapılıyor:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      if (!data.user) {
        console.error('❌ Login failed - no user');
        throw new Error('Login failed');
      }

      console.log('✅ Giriş başarılı');

      const userObj = {
        id: data.user.id,
        uid: data.user.id,
        email: data.user.email || '',
        displayName: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Kullanıcı',
        user_metadata: data.user.user_metadata,
      };

      setUser(userObj);
      await fetchUserData(data.user.id);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Giriş başarısız oldu'
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Çıkış yapılıyor...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserData(null);
      console.log('✅ Çıkış başarılı');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
    }
  };

  const updateUserProfile = async (profile: Partial<UserData>) => {
    try {
      if (!user) throw new Error('No user logged in');

      console.log('🔧 Profil güncelleniyor:', profile);
      
      const dbProfile: any = { ...profile };
      if (dbProfile.photoURL) {
        dbProfile.photo_url = dbProfile.photoURL;
        delete dbProfile.photoURL;
      }
      
      // UPSERT: Her durumda çalışır
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          uid: user.id,
          email: user.email,
          name: user.displayName,
          ...dbProfile,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) throw error;

      const updatedUserData = {
        ...data,
        photoURL: data.photo_url
      };

      setUserData(updatedUserData);
      console.log('✅ Profil güncellendi');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      return {
        success: false,
        error: error.message || 'Profil güncellenemedi'
      };
    }
  };

  const updateUsername = async (username: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      console.log('🔧 Username güncelleniyor:', username);
      
      const { data, error } = await supabase
        .from('users')
        .update({ 
          username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserData(prev => prev ? { ...prev, username: data.username } : null);
      console.log('✅ Username güncellendi');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Username update error:', error);
      return {
        success: false,
        error: error.message || 'Kullanıcı adı güncellenemedi'
      };
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    try {
      console.log('🔍 Username kontrol ediliyor:', username);
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle(); // FIX: single() yerine maybeSingle()

      if (error) throw error;

      const available = !data;
      console.log('✅ Username kontrolü:', available ? 'Müsait' : 'Alınmış');
      return available;
    } catch (error) {
      console.error('❌ Username check error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signUp,
        signIn,
        signOut,
        logout: signOut,
        updateUserProfile,
        updateUsername,
        checkUsernameAvailability,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
