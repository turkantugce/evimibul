import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
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
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptions, supabase } from '../../lib/supabase';
import ChatSettingsModal from './components/ChatSettingsModal';

interface Message {
  id: string
  text: string
  sender_id: string
  timestamp: string
  image_url?: string
  read?: boolean
  conversation_id: string
}

interface ConversationData {
  id: string
  participants: string[]
  participant_names: { [key: string]: string }
  participant_photos: { [key: string]: string }
  unread_count: { [key: string]: number }
  last_message?: string
  last_message_time?: string
  settings?: {
    [key: string]: {
      read_receipts: boolean
      muted: boolean
    }
  }
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams()
  const { user } = useAuthContext()
  const { refreshUnreadCount } = useNotificationContext()
  const router = useRouter()
  const { colors } = useTheme()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [conversationData, setConversationData] = useState<ConversationData | null>(null)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [otherUserRealPhoto, setOtherUserRealPhoto] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState<string>('Kullanıcı')
  const flatListRef = useRef<FlatList>(null)
  const [appState, setAppState] = useState(AppState.currentState)
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      if (conversationId && user) {
        markMessagesAsRead();
      }
    }
    setAppState(nextAppState);
  }, [appState, conversationId, user]);

  useFocusEffect(
    useCallback(() => {
      if (conversationId && user) {
        markMessagesAsRead();
      }

      return () => {
        if (markAsReadTimeoutRef.current) {
          clearTimeout(markAsReadTimeoutRef.current);
        }
      };
    }, [conversationId, user])
  );

  const getOtherUser = () => {
    if (!conversationData || !user) return null
    
    const otherUserId = conversationData.participants.find(id => id !== user.id)
    if (!otherUserId) return null

    return {
      id: otherUserId,
      name: conversationData.participant_names[otherUserId] || 'Kullanıcı',
      photo: otherUserRealPhoto !== null ? otherUserRealPhoto : conversationData.participant_photos[otherUserId]
    }
  }

  const loadOtherUserInfo = useCallback(async () => {
    const otherUser = getOtherUser()
    if (!otherUser) return

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('name, photo_url')
        .eq('id', otherUser.id)
        .single()

      if (error) throw error
      
      if (userData?.name) {
        setOtherUserName(userData.name)
      }
      
      if (userData?.photo_url) {
        setOtherUserRealPhoto(userData.photo_url)
      }
    } catch (error) {
      console.error('Error loading user info:', error)
      if (conversationData?.participant_names[otherUser.id]) {
        setOtherUserName(conversationData.participant_names[otherUser.id])
      }
    }
  }, [conversationData, user])

  const markMessagesAsRead = useCallback(async () => {
    if (!user || !conversationId) return

    try {
      console.log('📖 markMessagesAsRead çalıştı')

      const { data: updatedMessages, error: updateError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId as string)
        .eq('read', false)
        .neq('sender_id', user.id)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.sender_id !== user.id && !msg.read 
            ? { ...msg, read: true } 
            : msg
        )
      )

      const newUnreadCount = {
        ...conversationData?.unread_count,
        [user.id]: 0
      }

      const { error: convoError } = await supabase
        .from('conversations')
        .update({ unread_count: newUnreadCount })
        .eq('id', conversationId as string)

      if (convoError) throw convoError

      if (conversationData) {
        setConversationData({
          ...conversationData,
          unread_count: newUnreadCount
        })
      }

      await refreshUnreadCount()

      console.log('✅ Mesajlar başarıyla okundu olarak işaretlendi')
    } catch (error) {
      console.error('❌ Error marking messages as read:', error)
    }
  }, [user, conversationId, conversationData, refreshUnreadCount])

  const loadConversationData = useCallback(async () => {
    if (!conversationId || !user) return

    try {
      setLoading(true)
      
      const { data: convo, error: convoError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId as string)
        .single()

      if (convoError) throw convoError
      setConversationData(convo)

      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId as string)
        .order('timestamp', { ascending: false })

      if (msgsError) throw msgsError
      setMessages(msgs || [])

      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current)
      }

      markAsReadTimeoutRef.current = setTimeout(() => {
        markMessagesAsRead()
      }, 500)

    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }, [conversationId, user, markMessagesAsRead])

  useEffect(() => {
    if (!conversationId || !user) return

    const channel = subscriptions.onMessagesChange(conversationId as string, async (payload: { 
      eventType: string; 
      new: Message;
      old: { id: string; }; 
    }) => {
      if (payload.eventType === 'INSERT') {
        setMessages(prev => {
          const existingMessage = prev.find(msg => msg.id === payload.new.id);
          if (existingMessage) return prev;
          
          return [payload.new, ...prev];
        });
        
        if (payload.new.sender_id !== user.id && appState === 'active') {
          setTimeout(() => {
            markMessagesAsRead()
          }, 300)
        }
      } else if (payload.eventType === 'UPDATE') {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          )
        )
      } else if (payload.eventType === 'DELETE') {
        setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
      }
    });

    return () => {
      subscriptions.unsubscribe(channel);
    }
  }, [conversationId, user, appState, markMessagesAsRead]);

  useEffect(() => {
    if (conversationData && user) {
      loadOtherUserInfo();
    }
  }, [conversationData, user, loadOtherUserInfo]);

  useEffect(() => {
    if (conversationId && user) {
      loadConversationData();
    }
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      const otherUser = getOtherUser()
      if (!otherUser) {
        setSending(false)
        return
      }

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        text: messageText,
        sender_id: user.id,
        timestamp: new Date().toISOString(),
        read: false,
        conversation_id: conversationId as string
      }
      
      setMessages(prev => [tempMessage, ...prev])

      const { data: insertedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId as string,
          text: messageText,
          sender_id: user.id,
          read: false,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (messageError) {
        console.error('Insert error:', messageError)
        throw messageError
      }

      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? insertedMessage : msg)
      )

      if (!conversationData) {
        setSending(false)
        return
      }

      const newUnreadCount = {
        ...conversationData.unread_count,
        [otherUser.id]: (conversationData.unread_count?.[otherUser.id] || 0) + 1,
      }

      const { error: convoError } = await supabase
        .from('conversations')
        .update({
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          unread_count: newUnreadCount,
        })
        .eq('id', conversationId as string)

      if (convoError) {
        console.error('Conversation update error:', convoError)
        throw convoError
      }

      setConversationData({
        ...conversationData,
        last_message: messageText,
        last_message_time: new Date().toISOString(),
        unread_count: newUnreadCount,
      })

    } catch (error) {
      console.error('Message send error:', error)
      Alert.alert('Hata', 'Mesaj gönderilemedi')
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setSending(false)
    }
  }

  // ✅ Çoklu fotoğraf seçimi (kırpma yok)
  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için izin vermelisiniz')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
        // ✅ allowsEditing kaldırıldı - boyut korunuyor
      })

      if (!result.canceled && result.assets.length > 0) {
        for (const asset of result.assets) {
          await uploadImage(asset.uri)
        }
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error)
      Alert.alert('Hata', 'Resim seçilemedi')
    }
  }

  const uploadImage = async (uri: string) => {
    if (!user) return

    setUploading(true)

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg'
      const filename = `${conversationId}_${Date.now()}.${fileExt}`
      const filePath = `chat_images/${filename}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, decode(base64), {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl

      const otherUser = getOtherUser()
      if (!otherUser) {
        setUploading(false)
        return
      }

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        text: '',
        image_url: imageUrl,
        sender_id: user.id,
        timestamp: new Date().toISOString(),
        read: false,
        conversation_id: conversationId as string
      }
      
      setMessages(prev => [tempMessage, ...prev])

      const { data: insertedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId as string,
          text: '',
          image_url: imageUrl,
          sender_id: user.id,
          read: false,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (messageError) throw messageError

      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? insertedMessage : msg)
      )

      if (!conversationData) {
        setUploading(false)
        return
      }

      const newUnreadCount = {
        ...conversationData.unread_count,
        [otherUser.id]: (conversationData.unread_count?.[otherUser.id] || 0) + 1
      }

      const { error: convoError } = await supabase
        .from('conversations')
        .update({
          last_message: '📷 Fotoğraf',
          last_message_time: new Date().toISOString(),
          unread_count: newUnreadCount
        })
        .eq('id', conversationId as string)

      if (convoError) throw convoError

      setConversationData({
        ...conversationData,
        last_message: '📷 Fotoğraf',
        last_message_time: new Date().toISOString(),
        unread_count: newUnreadCount
      })

    } catch (error) {
      console.error('Resim yükleme hatası:', error)
      Alert.alert('Hata', 'Resim yüklenemedi')
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setUploading(false)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id
    const showReadReceipt = isOwnMessage && item.read && 
      conversationData?.settings?.[user?.id || '']?.read_receipts !== false

    const messageDate = new Date(item.timestamp)
    const now = new Date()
    const isToday = messageDate.toDateString() === now.toDateString()
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === messageDate.toDateString()

    let timeDisplay = ''
    if (isToday) {
      timeDisplay = messageDate.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (isYesterday) {
      timeDisplay = 'Dün ' + messageDate.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      timeDisplay = messageDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit'
      }) + ' ' + messageDate.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.messageImage}
            resizeMode="cover"
          />
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
            {timeDisplay}
          </Text>
          {showReadReceipt && (
            <Ionicons name="checkmark-done" size={16} color={colors.primary} style={styles.readReceipt} />
          )}
        </View>
      </View>
    )
  }

  const otherUser = {
    id: getOtherUser()?.id || '',
    name: otherUserName,
    photo: otherUserRealPhoto
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
              <Image 
                source={{ uri: otherUser.photo }} 
                style={styles.headerAvatar}
                key={otherUser.photo}
              />
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

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
      />

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

      {otherUser && (
        <ChatSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          conversationId={conversationId as string}
          currentUserId={user?.id || ''}
          otherUser={otherUser}
          onSettingsChange={() => {}}
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 60, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerName: { fontSize: 18, fontWeight: '600' },
  settingsButton: { padding: 8 },
  messagesList: { padding: 16 },
  messageContainer: { maxWidth: '75%', marginBottom: 12 },
  ownMessage: { alignSelf: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, borderRadius: 16 },
  messageText: { fontSize: 16, lineHeight: 20 },
  messageImage: { width: 200, height: 200, borderRadius: 12 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  messageTime: { fontSize: 11 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1 },
  readReceipt: { marginLeft: 4 },
  imageButton: { padding: 8 },
  input: { flex: 1, maxHeight: 100, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
})