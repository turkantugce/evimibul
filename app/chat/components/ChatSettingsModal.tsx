import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
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
import { db } from '../../../firebase';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    id: string;
    name: string;
    photo?: string;
  };
  onSettingsChange?: () => void;
}

interface SharedMedia {
  id: string;
  url: string;
  timestamp: any;
  senderId: string;
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
  const [readReceipts, setReadReceipts] = useState(true);
  const [muted, setMuted] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [otherUserRealPhoto, setOtherUserRealPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    loadSettings();
    
    const mediaQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('imageUrl', '!=', null)
    );

    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      const media: SharedMedia[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.imageUrl) {
          media.push({
            id: doc.id,
            url: data.imageUrl,
            timestamp: data.timestamp,
            senderId: data.senderId
          });
        }
      });

      media.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setSharedMedia(media);
    });

    return () => unsubscribe();
  }, [visible, conversationId]);

  // Diğer kullanıcının gerçek profil fotoğrafını yükle
  useEffect(() => {
    if (!visible || !otherUser) return;

    const loadOtherUserPhoto = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', otherUser.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOtherUserRealPhoto(userData.photoURL || null);
        }
      } catch (error) {
        console.error('Kullanıcı fotoğrafı yüklenirken hata:', error);
      }
    };

    loadOtherUserPhoto();
  }, [visible, otherUser]);

  const loadSettings = async () => {
    try {
      const convoDoc = await getDocs(
        query(collection(db, 'conversations'), where('__name__', '==', conversationId))
      );

      if (!convoDoc.empty) {
        const data = convoDoc.docs[0].data();
        const userSettings = data.settings?.[currentUserId] || {};
        setReadReceipts(userSettings.readReceipts ?? true);
        setMuted(userSettings.muted ?? false);
      }
    } catch (error) {
      console.error('Ayarlar yükleme hatası:', error);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`settings.${currentUserId}.${key}`]: value
      });
      
      if (onSettingsChange) {
        onSettingsChange();
      }
    } catch (error) {
      console.error('Ayar güncelleme hatası:', error);
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

  // otherUser undefined ise modal'ı gösterme
  if (!otherUser) {
    return null;
  }

  // Gerçek zamanlı fotoğraf varsa onu kullan, yoksa prop'tan gelen fotoğrafı kullan
  const displayPhoto = otherUserRealPhoto !== null ? otherUserRealPhoto : otherUser.photo;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sohbet Ayarları</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          {/* Kullanıcı Bilgisi */}
          <View style={[styles.userSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {displayPhoto ? (
              <Image 
                source={{ uri: displayPhoto }} 
                style={styles.userPhoto}
                key={displayPhoto} // Force re-render when photo changes
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

          {/* Ayarlar */}
          <View style={[styles.settingsSection, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
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

          {/* Paylaşılan Medya */}
          <View style={[styles.mediaSection, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
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
                  <View style={styles.mediaItem}>
                    <Image source={{ uri: item.url }} style={styles.mediaImage} />
                  </View>
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
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
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  settingsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  mediaSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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