import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ListingModal from '../../components/ListingModal';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../firebase';
import { IListing } from '../../types/types';

interface UserProfile {
  id: string;
  name: string;
  username?: string; // YENİ: Username alanı eklendi
  email: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  location?: string;
  createdAt?: any;
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const { user } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userListings, setUserListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [selectedListing, setSelectedListing] = useState<IListing | null>(null);
  const [listingModalVisible, setListingModalVisible] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadUserListings();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId as string));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          id: userDoc.id,
          name: data.name || 'İsimsiz Kullanıcı',
          username: data.username, // YENİ: Username yükle
          email: data.email || '',
          photoURL: data.photoURL,
          bio: data.bio,
          phone: data.phone,
          location: data.location,
          createdAt: data.createdAt
        });
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserListings = () => {
    try {
      const listingsQuery = query(
        collection(db, 'listings'),
        where('ownerId', '==', userId),
        where('status', '==', 'active')
      );

      const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
        const listings: IListing[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          listings.push({
            id: doc.id,
            title: data.title || '',
            species: data.species || '',
            breed: data.breed || '',
            age: data.age || '',
            gender: data.gender || '',
            city: data.city || '',
            district: data.district || '',
            description: data.description || '',
            photos: data.photos || [],
            vaccinated: data.vaccinated || false,
            neutered: data.neutered || false,
            status: data.status || 'active',
            ownerId: data.ownerId || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as IListing);
        });

        listings.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setUserListings(listings);
        setListingsLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('İlanlar yükleme hatası:', error);
      setListingsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userId || creatingConversation) return;

    setCreatingConversation(true);

    try {
      // Mevcut konuşmayı kontrol et
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      let existingConversationId = null;

      conversationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(userId as string)) {
          existingConversationId = doc.id;
        }
      });

      if (existingConversationId) {
        // Mevcut konuşmaya git
        router.push(`/chat/${existingConversationId}`);
      } else {
        // Yeni konuşma oluştur
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const currentUserData = currentUserDoc.data();

        const newConversation = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, userId],
          participantNames: {
            [user.uid]: currentUserData?.name || 'Kullanıcı',
            [userId as string]: profile?.name || 'Kullanıcı'
          },
          participantPhotos: {
            [user.uid]: currentUserData?.photoURL || '',
            [userId as string]: profile?.photoURL || ''
          },
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [userId as string]: 0
          },
          settings: {
            [user.uid]: {
              readReceipts: true,
              muted: false
            },
            [userId as string]: {
              readReceipts: true,
              muted: false
            }
          }
        });

        // Yeni konuşmaya git
        router.push(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Mesaj oluşturma hatası:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleListingPress = (listing: IListing) => {
    setSelectedListing(listing);
    setListingModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Kullanıcı bulunamadı</Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwnProfile = user?.uid === userId;

  const renderListingItem = ({ item }: { item: IListing }) => (
    <TouchableOpacity 
      style={[styles.listingCard, { backgroundColor: colors.inputBackground }]}
      onPress={() => handleListingPress(item)}
    >
      {item.photos && item.photos.length > 0 ? (
        <Image 
          source={{ uri: item.photos[0] }} 
          style={styles.listingImage}
        />
      ) : (
        <View style={[styles.listingImagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="paw" size={40} color={colors.secondaryText} />
        </View>
      )}
      <View style={styles.listingInfo}>
        <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.listingDetails}>
          <Ionicons name="location" size={14} color={colors.secondaryText} />
          <Text style={[styles.listingLocation, { color: colors.secondaryText }]}>
            {item.city}, {item.district}
          </Text>
        </View>
        <View style={styles.listingTags}>
          <View style={[styles.tag, { backgroundColor: colors.primary }]}>
            <Text style={styles.tagText}>{item.species}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.primary }]}>
            <Text style={styles.tagText}>{item.age}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.primary }]}>
            <Text style={styles.tagText}>{item.gender}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
        
        {/* Mesaj Butonu - Sadece başka kullanıcı profilinde göster */}
        {!isOwnProfile && (
          <TouchableOpacity 
            onPress={handleSendMessage}
            style={styles.messageButton}
            disabled={creatingConversation}
          >
            {creatingConversation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.messageButtonContent}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                <Text style={[styles.messageButtonText, { color: colors.primary }]}>Mesaj</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        {/* Profil Fotoğrafı ve İsim */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.profilePhotoText}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
          
          {/* YENİ: Username gösterimi */}
          {profile.username && (
            <Text style={[styles.profileUsername, { color: colors.primary }]}>
              @{profile.username}
            </Text>
          )}
          
          {profile.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.secondaryText} />
              <Text style={[styles.locationText, { color: colors.secondaryText }]}>{profile.location}</Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={[styles.section, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hakkında</Text>
            <Text style={[styles.bioText, { color: colors.secondaryText }]}>{profile.bio}</Text>
          </View>
        )}

        {/* İletişim Bilgileri */}
        <View style={[styles.section, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İletişim</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>{profile.email}</Text>
          </View>

          {profile.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{profile.phone}</Text>
            </View>
          )}
        </View>

        {/* Üyelik Tarihi */}
        {profile.createdAt && (
          <View style={[styles.section, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Üyelik Tarihi</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              {new Date(profile.createdAt.seconds * 1000).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        )}

        {/* Kullanıcının İlanları */}
        <View style={[styles.listingsSection, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isOwnProfile ? 'İlanlarım' : 'İlanları'} ({userListings.length})
          </Text>
          
          {listingsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : userListings.length > 0 ? (
            <FlatList
              data={userListings}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listingsList}
            />
          ) : (
            <View style={styles.emptyListings}>
              <Ionicons name="paw-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyListingsText, { color: colors.secondaryText }]}>
                {isOwnProfile ? 'Henüz ilan oluşturmadınız' : 'Henüz ilan bulunmuyor'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* İlan Detay Modal */}
      <ListingModal
        visible={listingModalVisible}
        listing={selectedListing}
        onClose={() => setListingModalVisible(false)}
      />
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  messageButton: {
    padding: 8,
    marginLeft: 8,
  },
  messageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePhotoText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // YENİ: Username stili
  profileUsername: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
  },
  section: {
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 15,
  },
  listingsSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  listingsList: {
    paddingBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  listingCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  listingImagePlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  listingLocation: {
    fontSize: 13,
  },
  listingTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyListings: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListingsText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});