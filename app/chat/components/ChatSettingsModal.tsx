import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    id: string;
    name: string;
    photo?: string | null;
  };
  onSettingsChange?: () => void;
}

interface SharedMedia {
  id: string;
  image_url: string;
  timestamp: string; // ✅ created_at yerine timestamp
  sender_id: string;
}

interface ConversationSettings {
  readReceipts: boolean;
  muted: boolean;
}

export default function ChatSettingsModal({
  visible,
  onClose,
  conversationId,
  currentUserId,
  otherUser,
  onSettingsChange
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const [readReceipts, setReadReceipts] = useState(true);
  const [muted, setMuted] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [otherUserRealPhoto, setOtherUserRealPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    loadSettings();
    loadSharedMedia();

    const subscription = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        },
        (payload) => {
          if (payload.new && (payload.new as any).image_url) {
            loadSharedMedia();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [visible, conversationId]);

  useEffect(() => {
    if (otherUser?.id) {
      loadOtherUserPhoto();
    }
  }, [otherUser?.id]);

  const loadOtherUserPhoto = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('photo_url')
        .eq('id', otherUser!.id)
        .single();

      if (error) throw error;

      if (data?.photo_url) {
        setOtherUserRealPhoto(data.photo_url);
      }
    } catch (err) {
      console.error('User photo fetch error:', err);
    }
  };

  // ✅ DÜZELTİLDİ: timestamp kullanıldı
  const loadSharedMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, image_url, timestamp, sender_id')
        .eq('conversation_id', conversationId)
        .not('image_url', 'is', null)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setSharedMedia(data || []);
    } catch (err) {
      console.error('Shared media fetch error:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('settings')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const userSettings: ConversationSettings = data?.settings?.[currentUserId] || {
        readReceipts: true,
        muted: false
      };

      setReadReceipts(userSettings.readReceipts);
      setMuted(userSettings.muted);
    } catch (err) {
      console.error('Settings fetch error:', err);
    }
  };

  const updateSetting = async (key: keyof ConversationSettings, value: boolean) => {
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('conversations')
        .select('settings')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;

      const updatedSettings = {
        ...currentData.settings,
        [currentUserId]: {
          ...currentData.settings?.[currentUserId],
          [key]: value
        }
      };

       const { error } = await supabase
        .from('conversations')
        .update({ 
          settings: updatedSettings
        })
        .eq('id', conversationId);

      if (error) throw error;

      if (onSettingsChange) onSettingsChange();
    } catch (err) {
      console.error('Setting update error:', err);
      Alert.alert('Hata', 'Ayar güncellenirken bir sorun oluştu');
    }
  };

  const handleReadReceiptsToggle = (value: boolean) => {
    setReadReceipts(value);
    updateSetting('readReceipts', value);
  };

  const handleMutedToggle = (value: boolean) => {
    setMuted(value);
    updateSetting('muted', value);
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .eq('conversation_id', conversationId);

              if (messagesError) throw messagesError;

              const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

              if (error) throw error;

              onClose();
              router.back();
            } catch (err) {
              console.error('Conversation delete error:', err);
              Alert.alert('Hata', 'Sohbet silinemedi');
            }
          }
        }
      ]
    );
  };

  const handleMediaPress = (media: SharedMedia) => {
    Alert.alert('Medya', 'Bu görseli görüntülemek için full-screen modal açılacak');
  };

  if (!otherUser) {
    return null;
  }

  const displayPhoto = otherUserRealPhoto || otherUser.photo;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sohbet Ayarları</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          <View style={[styles.userSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {displayPhoto ? (
              <Image 
                source={{ uri: displayPhoto }} 
                style={styles.userPhoto}
              />
            ) : (
              <View style={[styles.userPhotoPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.userPhotoText}>
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.userName, { color: colors.text }]}>{otherUser.name}</Text>
          </View>

          <View style={[styles.settingsSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ayarlar</Text>

            <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="checkmark-done" size={24} color={colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Görüldü Bilgisi</Text>
                  <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                    Mesajları okuyunca karşı tarafa bildir
                  </Text>
                </View>
              </View>
              <Switch
                value={readReceipts}
                onValueChange={handleReadReceiptsToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={readReceipts ? colors.card : colors.card}
              />
            </View>

            <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-off" size={24} color={colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Sessiz Mod</Text>
                  <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                    Bu sohbetten bildirim alma
                  </Text>
                </View>
              </View>
              <Switch
                value={muted}
                onValueChange={handleMutedToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={muted ? colors.card : colors.card}
              />
            </View>
          </View>

          <View style={[styles.mediaSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Paylaşılan Medya ({sharedMedia.length})
            </Text>
            
            {sharedMedia.length > 0 ? (
              <FlatList
                data={sharedMedia}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.mediaItem}
                    onPress={() => handleMediaPress(item)}
                  >
                    <Image 
                      source={{ uri: item.image_url }} 
                      style={styles.mediaImage} 
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyMedia}>
                <Ionicons name="image-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyMediaText, { color: colors.secondaryText }]}>
                  Henüz paylaşılan görsel yok
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.dangerSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tehlikeli İşlemler</Text>
            
            <TouchableOpacity 
              style={[styles.dangerItem]}
              onPress={handleDeleteConversation}
            >
              <View style={styles.dangerInfo}>
                <Ionicons name="trash-outline" size={24} color="#ff3b30" />
                <View style={styles.dangerTextContainer}>
                  <Text style={[styles.dangerLabel, { color: '#ff3b30' }]}>
                    Sohbeti Sil
                  </Text>
                  <Text style={[styles.dangerDescription, { color: colors.secondaryText }]}>
                    Bu sohbeti kalıcı olarak sil
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  closeButton: { padding: 4 },
  userSection: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
  },
  userPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userPhotoText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: { fontSize: 20, fontWeight: '600' },
  settingsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomColor: '#E5E5E5',
  },
  dangerSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomColor: '#E5E5E5',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: { flex: 1 },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: { fontSize: 13 },
  dangerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dangerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dangerTextContainer: { flex: 1 },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  dangerDescription: { fontSize: 13 },
  mediaSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomColor: '#E5E5E5',
    paddingBottom: 16,
  },
  mediaItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  emptyMedia: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMediaText: {
    fontSize: 14,
    marginTop: 12,
  },
});