// contexts/NotificationContext.tsx
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from './AuthContext';

interface NotificationContextType {
  totalUnreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  totalUnreadCount: 0,
  refreshUnreadCount: async () => {},
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

  const refreshUnreadCount = async () => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    try {
      console.log('🔄 Unread count yeniden hesaplanıyor...');

      // ✅ DÜZELTİLDİ: Daha güvenilir sorgu
      const { data: userConversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .or(`participants.cs.{${user.id}}`); // PostgreSQL array contains syntax

      if (convError) {
        console.error('❌ Conversation sorgusu hatası:', convError);
        throw convError;
      }

      if (!userConversations || userConversations.length === 0) {
        console.log('✅ Hiç conversation yok');
        setTotalUnreadCount(0);
        return;
      }

      const conversationIds = userConversations.map(conv => conv.id);

      const { count, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .neq('sender_id', user.id);

      if (messagesError) {
        console.error('❌ Message sorgusu hatası:', messagesError);
        throw messagesError;
      }

      const unreadCount = count || 0;
      console.log('📊 Toplam okunmamış mesaj:', unreadCount);
      setTotalUnreadCount(unreadCount);
    } catch (err) {
      console.error('❌ Unread count hesaplanamadı:', err);
      setTotalUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    // İlk yükleme
    refreshUnreadCount();

    // ✅ Tek bir channel ile tüm message eventlerini dinle
    const messagesChannel = supabase
      .channel(`user-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('📬 Yeni mesaj eklendi:', payload.new);
          const newMessage = payload.new as any;

          if (newMessage.sender_id !== user.id && !newMessage.read) {
            console.log('✅ Unread count +1');
            setTotalUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          const oldMessage = payload.old as any;

          if (
            updatedMessage.read === true &&
            oldMessage.read === false &&
            updatedMessage.sender_id !== user.id
          ) {
            console.log('✅ Mesaj okundu, unread count -1');
            setTotalUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const deletedMessage = payload.old as any;

          if (deletedMessage.read === false && deletedMessage.sender_id !== user.id) {
            console.log('🗑️ Okunmamış mesaj silindi, unread count -1');
            setTotalUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Notification channel temizleniyor...');
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ totalUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};