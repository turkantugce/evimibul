import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import { IListing } from '../types/types';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  listing: IListing | null;
  onClose: () => void;
}

export default function ListingModal({ visible, listing, onClose }: Props) {
  const [activePhoto, setActivePhoto] = useState(0);
  const { user, userData } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!listing) return null;

  const isOwner = user?.uid === listing.ownerId;

  const handleContact = async () => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Mesaj göndermek için giriş yapmalısınız', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => {
          onClose();
          router.push('/auth/login');
        }}
      ]);
      return;
    }

    if (!userData) {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi');
      return;
    }

    setLoading(true);

    try {
      const ownerDoc = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', listing.ownerId))
      );

      if (ownerDoc.empty) {
        Alert.alert('Hata', 'İlan sahibi bulunamadı');
        setLoading(false);
        return;
      }

      const ownerData = ownerDoc.docs[0].data();

      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );

      const snapshot = await getDocs(conversationsQuery);
      let existingConvoId: string | null = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(listing.ownerId)) {
          existingConvoId = doc.id;
        }
      });

      if (existingConvoId) {
        onClose();
        router.push(`/chat/${existingConvoId}`);
      } else {
        const newConvoRef = doc(collection(db, 'conversations'));
        
        await setDoc(newConvoRef, {
          participants: [user.uid, listing.ownerId],
          participantNames: {
            [user.uid]: userData.name,
            [listing.ownerId]: ownerData.name || 'Kullanıcı'
          },
          participantPhotos: {
            [user.uid]: (userData as any).photoURL || '',
            [listing.ownerId]: ownerData.photoURL || ''
          },
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [listing.ownerId]: 0
          },
          createdAt: serverTimestamp()
        });

        onClose();
        router.push(`/chat/${newConvoRef.id}`);
      }
    } catch (error) {
      console.error('İletişim hatası:', error);
      Alert.alert('Hata', 'Bir sorun oluştu, lütfen tekrar deneyin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {listing.title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Fotoğraf Carousel */}
          {listing.photos && listing.photos.length > 0 ? (
            <View style={styles.carousel}>
              <Image 
                source={{ uri: listing.photos[activePhoto] }} 
                style={styles.mainImage}
                resizeMode="cover"
              />
              {listing.photos.length > 1 && (
                <ScrollView 
                  horizontal 
                  style={[styles.thumbnailContainer, { backgroundColor: colors.inputBackground }]}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailContent}
                >
                  {listing.photos.map((photo, index) => (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => setActivePhoto(index)}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: photo }} 
                        style={[
                          styles.thumbnail,
                          activePhoto === index && [styles.thumbnailActive, { borderColor: colors.primary }]
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="paw" size={64} color={colors.border} />
              <Text style={[styles.placeholderText, { color: colors.secondaryText }]}>
                Fotoğraf Yok
              </Text>
            </View>
          )}

          {/* İlan Detayları */}
          <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
            {/* Bilgi Kartları Grid */}
            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="paw" size={24} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Tür</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {listing.species}
                </Text>
              </View>
              
              {listing.breed && (
                <View style={[styles.infoCard, { backgroundColor: colors.inputBackground }]}>
                  <Ionicons name="ribbon" size={24} color={colors.primary} />
                  <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Cins</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                    {listing.breed}
                  </Text>
                </View>
              )}
              
              <View style={[styles.infoCard, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="time" size={24} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Yaş</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {listing.age}
                </Text>
              </View>
              
              {listing.gender && (
                <View style={[styles.infoCard, { backgroundColor: colors.inputBackground }]}>
                  <Ionicons 
                    name={listing.gender.toLowerCase() === 'erkek' ? 'male' : 'female'} 
                    size={24} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Cinsiyet</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                    {listing.gender.charAt(0).toUpperCase() + listing.gender.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Konum Bölümü */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="location" size={18} color={colors.text} /> Konum
              </Text>
              <View style={[styles.locationCard, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
                <View style={styles.locationText}>
                  <Text style={[styles.locationCity, { color: colors.text }]}>
                    {listing.city}
                  </Text>
                  {listing.district && (
                    <Text style={[styles.locationDistrict, { color: colors.secondaryText }]}>
                      {listing.district}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Sağlık Durumu */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="medical" size={18} color={colors.text} /> Sağlık Durumu
              </Text>
              <View style={styles.healthBadges}>
                <View style={[
                  styles.healthBadge, 
                  { 
                    backgroundColor: listing.vaccinated 
                      ? `${colors.success}20` 
                      : `${colors.border}40` 
                  }
                ]}>
                  <Ionicons 
                    name={listing.vaccinated ? 'checkmark-circle' : 'close-circle'} 
                    size={20} 
                    color={listing.vaccinated ? colors.success : colors.secondaryText} 
                  />
                  <Text style={[
                    styles.healthBadgeText, 
                    { 
                      color: listing.vaccinated 
                        ? colors.success 
                        : colors.secondaryText 
                    }
                  ]}>
                    {listing.vaccinated ? '✓ Aşılı' : '✗ Aşısız'}
                  </Text>
                </View>
                
                <View style={[
                  styles.healthBadge, 
                  { 
                    backgroundColor: listing.neutered 
                      ? `${colors.success}20` 
                      : `${colors.border}40` 
                  }
                ]}>
                  <Ionicons 
                    name={listing.neutered ? 'checkmark-circle' : 'close-circle'} 
                    size={20} 
                    color={listing.neutered ? colors.success : colors.secondaryText} 
                  />
                  <Text style={[
                    styles.healthBadgeText, 
                    { 
                      color: listing.neutered 
                        ? colors.success 
                        : colors.secondaryText 
                    }
                  ]}>
                    {listing.neutered ? '✓ Kısırlaştırılmış' : '✗ Kısır Değil'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Açıklama */}
            {listing.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  <Ionicons name="document-text" size={18} color={colors.text} /> Açıklama
                </Text>
                <View style={[styles.descriptionCard, { backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.description, { color: colors.secondaryText }]}>
                    {listing.description}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* İletişim Butonu */}
        {!isOwner && (
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[
                styles.contactButton, 
                { backgroundColor: colors.primary },
                loading && styles.contactButtonDisabled
              ]}
              onPress={handleContact}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.contactButtonText}>Yükleniyor...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                  <Text style={styles.contactButtonText}>Mesaj Gönder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    flex: 1, 
    paddingRight: 12,
    lineHeight: 26,
  },
  closeButton: { 
    padding: 4,
    marginLeft: 8,
  },
  carousel: { 
    marginBottom: 0,
  },
  mainImage: { 
    width: width, 
    height: 320,
  },
  imagePlaceholder: {
    width: width,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  thumbnailContainer: { 
    flexDirection: 'row',
  },
  thumbnailContent: {
    padding: 12,
    gap: 8,
  },
  thumbnail: { 
    width: 70, 
    height: 70, 
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: { 
    borderWidth: 3,
  },
  detailsCard: { 
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  locationText: {
    flex: 1,
  },
  locationCity: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationDistrict: {
    fontSize: 14,
  },
  healthBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  healthBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  healthBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionCard: {
    padding: 16,
    borderRadius: 12,
  },
  description: { 
    fontSize: 15, 
    lineHeight: 24,
  },
  footer: { 
    padding: 16, 
    borderTopWidth: 1,
  },
  contactButton: { 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  contactButtonDisabled: {
    opacity: 0.7,
  },
  contactButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600',
  }
});