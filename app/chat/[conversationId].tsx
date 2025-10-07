import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db, storage } from '../../firebase';
import ChatSettingsModal from './components/ChatSettingsModal';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  imageUrl?: string;
  read?: boolean;
}

interface ConversationData {
  participants: string[];
  participantNames: { [key: string]: string };
  participantPhotos: { [key: string]: string };
  unreadCount: { [key: string]: number };
  settings: {
    [key: string]: {
      readReceipts: boolean;
      muted: boolean;
    };
  };
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { user } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Diğer kullanıcı bilgilerini al
  const getOtherUser = () => {
    if (!conversationData || !user) return null;
    
    const otherUserId = conversationData.participants.find(id => id !== user.uid);
    if (!otherUserId) return null;

    return {
      id: otherUserId,
      name: conversationData.participantNames[otherUserId] || 'Kullanıcı',
      photo: conversationData.participantPhotos[otherUserId]
    };
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    // Konuşma verilerini yükle
    const conversationRef = doc(db, 'conversations', conversationId as string);
    const unsubscribeConversation = onSnapshot(conversationRef, (doc) => {
      if (doc.exists()) {
        setConversationData(doc.data() as ConversationData);
      }
    });

    // Mesajları dinle
    const messagesQuery = query(
      collection(db, 'conversations', conversationId as string, 'messages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);

      // Okunmamış mesajları işaretle
      markMessagesAsRead();
    });

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId, user]);

  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;

    try {
      // Tüm mesajları al ve filtrele (index gerektirmez)
      const messagesQuery = query(
        collection(db, 'conversations', conversationId as string, 'messages')
      );

      const snapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      let hasUnread = false;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Sadece karşı taraftan gelen okunmamış mesajları işaretle
        if (data.senderId !== user.uid && data.read === false) {
          batch.update(doc.ref, { read: true });
          hasUnread = true;
        }
      });

      if (hasUnread) {
        await batch.commit();

        // Unread count'u sıfırla
        await updateDoc(doc(db, 'conversations', conversationId as string), {
          [`unreadCount.${user.uid}`]: 0
        });
      }
    } catch (error) {
      console.error('Mesaj okundu işaretleme hatası:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const otherUser = getOtherUser();
      if (!otherUser) return;

      // Mesajı ekle
      await addDoc(
        collection(db, 'conversations', conversationId as string, 'messages'),
        {
          text: messageText,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          read: false
        }
      );

      // Konuşmayı güncelle
      await updateDoc(doc(db, 'conversations', conversationId as string), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUser.id}`]: (conversationData?.unreadCount?.[otherUser.id] || 0) + 1
      });
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilemedi');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploading(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `chat_images/${conversationId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const otherUser = getOtherUser();
      if (!otherUser) return;

      // Resimli mesaj ekle
      await addDoc(
        collection(db, 'conversations', conversationId as string, 'messages'),
        {
          text: '',
          imageUrl: downloadURL,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          read: false
        }
      );

      // Konuşmayı güncelle
      await updateDoc(doc(db, 'conversations', conversationId as string), {
        lastMessage: '📷 Fotoğraf',
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUser.id}`]: (conversationData?.unreadCount?.[otherUser.id] || 0) + 1
      });

    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      Alert.alert('Hata', 'Resim yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const showReadReceipt = isOwnMessage && item.read && 
      conversationData?.settings?.[user?.uid || '']?.readReceipts;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        ) : (
          <View style={[
            styles.messageBubble,
            { backgroundColor: isOwnMessage ? colors.primary : colors.inputBackground }
          ]}>
            <Text style={[
              styles.messageText,
              { color: isOwnMessage ? 'white' : colors.text }
            ]}>
              {item.text}
            </Text>
          </View>
        )}
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, { color: colors.secondaryText }]}>
            {item.timestamp?.toDate().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {showReadReceipt && (
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
          )}
        </View>
      </View>
    );
  };

  const otherUser = getOtherUser();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        {otherUser && (
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => router.push(`/users/${otherUser.id}`)}
          >
            {otherUser.photo ? (
              <Image source={{ uri: otherUser.photo }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerAvatarText}>
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.headerName, { color: colors.text }]}>{otherUser.name}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsButton}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
      />

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          onPress={handleImagePick}
          style={styles.imageButton}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="image" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.secondaryText}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      {otherUser && (
        <ChatSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          conversationId={conversationId as string}
          currentUserId={user?.uid || ''}
          otherUser={otherUser}
          onSettingsChange={() => {}}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '75%',
    marginBottom: 12,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  imageButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});