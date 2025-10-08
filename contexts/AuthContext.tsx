import { useAuth } from '@/hooks/useAuth';
import { User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext } from 'react';

interface UserData {
  name: string;
  username?: string; // YENİ: Username alanı eklendi
  bio?: string;
  email: string;
  phone?: string;
  location?: string;
  photoURL?: string;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, username?: string) => Promise<any>; // YENİ: username parametresi
  logout: () => Promise<any>;
  updateUserProfile: (updates: { name?: string; bio?: string; phone?: string; location?: string; photoURL?: string }) => Promise<any>;
  // YENİ: Username fonksiyonları
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  updateUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const contextValue: AuthContextType = {
    user: auth.user,
    userData: auth.userData,
    loading: auth.loading,
    signIn: auth.signIn,
    signUp: auth.signUp, // Artık username parametresi alıyor
    logout: auth.logout,
    updateUserProfile: auth.updateUserProfile,
    checkUsernameAvailability: auth.checkUsernameAvailability, // YENİ
    updateUsername: auth.updateUsername // YENİ
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}