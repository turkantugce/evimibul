import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db, subscriptions, supabase } from '../../lib/supabase';

interface Conversation {
  id: string;
  participants: string[];
  participant_names: { [key: string]: string };
  participant_photos: { [key: string]: string };
  last_message: string;
  last_message_time: any;
  unread_count: { [key: string]: number };
}

interface UserPhotoCache {
  [userId: string]: string | null;
}

interface UserNameCache {
  [userId: string]: string;
}

export default function MessagesScreen() {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPhotos, setUserPhotos] = useState<UserPhotoCache>({});
  const [userNames, setUserNames] = useState<UserNameCache>({});

  // 📄 Kullanıcı fotoğrafı ve adı güncelleme
  const loadUserInfo = useCallback(async (convos: Conversation[]) => {
    try {
      const photos: UserPhotoCache = {};
      const names: UserNameCache = {};
      const missingIds = new Set<string>();

      // Önce conversation'daki bilgileri kullan
      convos.forEach((convo) => {
        convo.participants.forEach((pid) => {
          if (convo.participant_photos?.[pid]) {
            photos[pid] = convo.participant_photos[pid];
          }
          if (convo.participant_names?.[pid]) {
            names[pid] = convo.participant_names[pid];
          }
          // Eksik bilgileri users tablosundan çekeceğiz
          if (!convo.participant_photos?.[pid] || !convo.participant_names?.[pid]) {
            missingIds.add(pid);
          }
        });
      });

      // Eksik kullanıcı bilgilerini veritabanından çek
      if (missingIds.size > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, photo_url')
          .in('id', Array.from(missingIds));

        if (!error && data) {
          data.forEach((u) => {
            // Sadece name kolonunu kullan
            names[u.id] = u.name || 'Kullanıcı';
            photos[u.id] = u.photo_url || null;
          });
        }
      }

      setUserPhotos(photos);
      setUserNames(names);
    } catch (err) {
      console.error('User info load error:', err);
    }
  }, []);

  // 🧩 Sohbetleri yükle
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convos = await db.conversations.getByUserId(user.id);
      setConversations(convos || []);
      await loadUserInfo(convos || []);
      setLoading(false);
    } catch (error) {
      console.error('Conversations fetch error:', error);
      setLoading(false);
    }
  }, [user, loadUserInfo]);

  // ✅ useFocusEffect ile her sayfa açıldığında yükle
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }

      loadConversations();
    }, [user, loadConversations])
  );

  // 🔔 Real-time listener
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const channel = subscriptions.onConversationsChange(user.id, async () => {
      await loadConversations();
    });

    return () => {
      subscriptions.unsubscribe(channel);
    };
  }, [user, loadConversations]);

  const getOtherUserId = (participants: string[]) =>
    participants.find((id) => id !== user?.id) || '';

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    authContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    authTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
      color: colors.text,
    },
    authText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 24,
    },
    authButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 12,
    },
    authButtonText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    searchButton: {
      padding: 8,
    },
    conversationItem: {
      flexDirection: 'row',
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 12,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: colors.card,
      fontSize: 24,
      fontWeight: 'bold',
    },
    conversationContent: {
      flex: 1,
      justifyContent: 'center',
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    time: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lastMessage: {
      fontSize: 14,
      color: colors.secondaryText,
      flex: 1,
    },
    unreadMessage: {
      fontWeight: '600',
      color: colors.text,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      marginLeft: 8,
    },
    unreadText: {
      color: colors.card,
      fontSize: 12,
      fontWeight: 'bold',
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      marginTop: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    startChatButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    startChatText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="chatbubbles" size={64} color={colors.primary} />
          <Text style={styles.authTitle}>Mesajlar</Text>
          <Text style={styles.authText}>Mesajlaşmak için giriş yapmalısınız</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/users/search')}
        >
          <Ionicons name="person-add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const otherUserId = getOtherUserId(item.participants);
          const otherUserName = userNames[otherUserId] || item.participant_names[otherUserId] || 'Kullanıcı';
          const otherUserPhoto = userPhotos[otherUserId] || item.participant_photos?.[otherUserId] || null;
          const unreadCount = item.unread_count[user.id] || 0;

          return (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              {otherUserPhoto ? (
                <Image source={{ uri: otherUserPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {otherUserName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.userName}>{otherUserName}</Text>
                  <Text style={styles.time}>{formatTime(item.last_message_time)}</Text>
                </View>
                <View style={styles.messageRow}>
                  <Text
                    style={[
                      styles.lastMessage,
                      unreadCount > 0 && styles.unreadMessage,
                    ]}
                    numberOfLines={1}
                  >
                    {item.last_message || 'Yeni konuşma'}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>Henüz mesajınız yok</Text>
            <Text style={styles.emptyText}>
              Kullanıcı ara butonuna tıklayarak yeni bir konuşma başlatabilirsiniz
            </Text>
            <TouchableOpacity
              style={styles.startChatButton}
              onPress={() => router.push('/users/search')}
            >
              <Ionicons name="person-add" size={20} color={colors.card} />
              <Text style={styles.startChatText}>Kullanıcı Ara</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}