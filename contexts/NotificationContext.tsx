// contexts/NotificationContext.tsx
import { collection, onSnapshot, or, query, where } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuthContext } from './AuthContext';

interface NotificationContextType {
  totalUnreadCount: number;
  refreshUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  totalUnreadCount: 0,
  refreshUnreadCount: () => {},
});

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      or(where('participants', 'array-contains', user.uid))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const unreadCount = data.unreadCount?.[user.uid] || 0;
        totalUnread += unreadCount;
      });

      console.log('Toplam okunmamış mesaj:', totalUnread); // Debug için
      setTotalUnreadCount(totalUnread);
    }, (error) => {
      console.error('Okunmamış mesaj dinleme hatası:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const refreshUnreadCount = () => {
    // Manuel refresh için - şimdilik boş bırakabiliriz
  };

  return (
    <NotificationContext.Provider value={{ totalUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};