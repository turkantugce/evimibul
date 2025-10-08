import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
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

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  listing: IListing | null;
  onClose: () => void;
}

interface OwnerInfo {
  id: string;
  name: string;
  photoURL?: string;
}

export default function ListingModal({ visible, listing, onClose }: Props) {
  const [activePhoto, setActivePhoto] = useState(0);
  const { user, userData } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenActiveIndex, setFullScreenActiveIndex] = useState(0);
  const fullScreenScrollRef = useRef<ScrollView>(null);

  // İlan sahibi bilgilerini yükle
  useEffect(() => {
    if (!listing || !visible) {
      setOwnerInfo(null);
      return;
    }

    const loadOwnerInfo = async () => {
      setLoadingOwner(true);
      try {
        const ownerDoc = await getDoc(doc(db, 'users', listing.ownerId));
        if (ownerDoc.exists()) {
          const data = ownerDoc.data();
          setOwnerInfo({
            id: ownerDoc.id,
            name: data.name || 'Kullanıcı',
            photoURL: data.photoURL
          });
        }
      } catch (error) {
        console.error('İlan sahibi bilgisi yüklenirken hata:', error);
      } finally {
        setLoadingOwner(false);
      }
    };

    loadOwnerInfo();
  }, [listing, visible]);

  // Full screen açıldığında scroll pozisyonunu ayarla
  useEffect(() => {
    if (fullScreenVisible && fullScreenScrollRef.current) {
      setTimeout(() => {
        fullScreenScrollRef.current?.scrollTo({
          x: fullScreenActiveIndex * width,
          animated: false
        });
      }, 100);
    }
  }, [fullScreenVisible, fullScreenActiveIndex]);

  const openFullScreen = (index: number) => {
    setFullScreenActiveIndex(index);
    setFullScreenVisible(true);
  };

  const closeFullScreen = () => {
    setFullScreenVisible(false);
  };

  const handleFullScreenSwipe = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const currentIndex = Math.round(contentOffset.x / width);
    setFullScreenActiveIndex(currentIndex);
  };

  const handleThumbnailPress = (index: number) => {
    setFullScreenActiveIndex(index);
    fullScreenScrollRef.current?.scrollTo({
      x: index * width,
      animated: true
    });
  };

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

  const handleOwnerPress = () => {
    if (ownerInfo) {
      onClose();
      router.push(`/users/${ownerInfo.id}`);
    }
  };

  // Full Screen Image Component
  const FullScreenImageView = () => {
    if (!fullScreenVisible) return null;
    
    return (
      <Modal
        visible={fullScreenVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={closeFullScreen}
        statusBarTranslucent
      >
        <View style={styles.fullScreenContainer}>
          {/* Header */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              onPress={closeFullScreen} 
              style={styles.fullScreenCloseButton}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.fullScreenCounter}>
              {fullScreenActiveIndex + 1} / {listing?.photos?.length || 0}
            </Text>
          </View>

          {/* Image Swiper */}
          <ScrollView
            ref={fullScreenScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleFullScreenSwipe}
            style={styles.fullScreenScrollView}
          >
            {listing?.photos?.map((photo, index) => (
              <View key={index} style={styles.fullScreenImageContainer}>
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.zoomContainer}
                  centerContent
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            ))}
          </ScrollView>

          {/* Thumbnail Indicator */}
          {listing?.photos && listing.photos.length > 1 && (
            <View style={styles.fullScreenThumbnailContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fullScreenThumbnailContent}
              >
                {listing.photos.map((photo, index) => (
                  <TouchableOpacity 
                    key={index} 
                    onPress={() => handleThumbnailPress(index)}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={{ uri: photo }} 
                      style={[
                        styles.fullScreenThumbnail,
                        fullScreenActiveIndex === index && styles.fullScreenThumbnailActive
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Modal
        visible={visible && !fullScreenVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {listing.title}
              </Text>
              
              {/* İlan Sahibi Bilgisi */}
              {loadingOwner ? (
                <View style={styles.ownerLoading}>
                  <ActivityIndicator size="small" color={colors.secondaryText} />
                </View>
              ) : ownerInfo ? (
                <TouchableOpacity 
                  style={styles.ownerInfo}
                  onPress={handleOwnerPress}
                  activeOpacity={0.7}
                >
                  {ownerInfo.photoURL ? (
                    <Image 
                      source={{ uri: ownerInfo.photoURL }} 
                      style={styles.ownerPhoto}
                    />
                  ) : (
                    <View style={[styles.ownerPhotoPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.ownerPhotoText}>
                        {ownerInfo.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ownerTextContainer}>
                    <Text style={[styles.ownerLabel, { color: colors.secondaryText }]}>
                      İlan Sahibi
                    </Text>
                    <Text style={[styles.ownerName, { color: colors.text }]}>
                      {ownerInfo.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Fotoğraf Carousel */}
            {listing.photos && listing.photos.length > 0 ? (
              <View style={styles.carousel}>
                <TouchableOpacity 
                  onPress={() => openFullScreen(activePhoto)}
                  activeOpacity={0.9}
                >
                  <Image 
                    source={{ uri: listing.photos[activePhoto] }} 
                    style={styles.mainImage}
                    resizeMode="cover"
                  />
                  {/* Zoom hint */}
                  <View style={styles.zoomHint}>
                    <Ionicons name="expand" size={20} color="white" />
                    <Text style={styles.zoomHintText}>Fotoğrafa dokun</Text>
                  </View>
                </TouchableOpacity>
                
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

      {/* Full Screen Image Modal */}
      <FullScreenImageView />
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    lineHeight: 26,
    marginBottom: 12,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  ownerLoading: {
    paddingVertical: 8,
  },
  ownerPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  ownerPhotoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerPhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerTextContainer: {
    flex: 1,
  },
  ownerLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: { 
    padding: 4,
    marginLeft: 8,
  },
  carousel: { 
    marginBottom: 0,
    position: 'relative',
  },
  mainImage: { 
    width: width, 
    height: 320,
  },
  zoomHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomHintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
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
  },
  // Full Screen Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullScreenCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  fullScreenCounter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenImageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    minWidth: width,
    minHeight: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
  fullScreenThumbnailContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  fullScreenThumbnailContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  fullScreenThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fullScreenThumbnailActive: {
    borderWidth: 3,
    borderColor: 'white',
  },
});