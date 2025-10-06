import { useAuth } from '@/hooks/useAuth';
import { User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext } from 'react';

interface UserData {
  name: string;
  bio?: string;
  email: string;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<any>;
  updateUserProfile: (updates: { name?: string; bio?: string }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
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