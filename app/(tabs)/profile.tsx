import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ListingCard from '../../components/ListingCard';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db, storage } from '../../firebase';
import { IListing } from '../../types/types';

const AVATAR_COLORS = ['#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9'];

// Özel buton renkleri
const CUSTOM_COLORS = {
  adopted: '#D4A574',  // Yumuşak turuncu (sahiplendirme için)
  delete: '#8B7355',   // Haki/toprak tonu (silme için)
};

export default function ProfileScreen() {
  const { user, userData, updateUserProfile } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'active' | 'adopted'>('active');
  const [allUserListings, setAllUserListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const avatarColor = AVATAR_COLORS[userName.length % AVATAR_COLORS.length];

  useEffect(() => {
    if (user && userData) {
      setUserName(userData.name || user.displayName || user.email?.split('@')[0] || 'Kullanıcı');
      setUserBio(userData.bio || '');
      setUserPhone((userData as any).phone || '');
      setUserLocation((userData as any).location || '');
      setProfilePhoto((userData as any).photoURL || '');
    }
  }, [user, userData]);

  useEffect(() => {
    if (user) {
      const unsubscribe = setupListingsListener();
      return () => unsubscribe();
    } else {
      setLoading(false);
      setAllUserListings([]);
    }
  }, [user]);

  const setupListingsListener = () => {
    if (!user) return () => {};

    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'listings'),
        where('ownerId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const listingsData: IListing[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            listingsData.push({ 
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

          listingsData.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          setAllUserListings(listingsData);
          setLoading(false);
        },
        (error) => {
          console.error('Listener hatası:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Listener kurulum hatası:', error);
      setLoading(false);
      return () => {};
    }
  };

  const userListings = allUserListings.filter(listing => listing.status === activeTab);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    try {
      setUploadingPhoto(true);

      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `profile/${user.uid}/avatar.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
        updatedAt: new Date()
      });

      setProfilePhoto(downloadURL);
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
      
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir sorun oluştu');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleMarkAdopted = async (listingId: string) => {
    try {
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'adopted',
        updatedAt: new Date()
      });
      
      Alert.alert('Başarılı', 'İlan sahiplendirildi olarak işaretlendi');
    } catch (error) {
      console.error('Sahiplendirme hatası:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const handleDeleteListing = (listing: IListing) => {
    Alert.alert(
      'İlanı Sil',
      `"${listing.title}" ilanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (listing.photos && listing.photos.length > 0) {
                for (const photoUrl of listing.photos) {
                  try {
                    const urlParts = photoUrl.split('/o/');
                    if (urlParts.length > 1) {
                      const pathPart = urlParts[1].split('?')[0];
                      const photoPath = decodeURIComponent(pathPart);
                      
                      const photoRef = ref(storage, photoPath);
                      await deleteObject(photoRef);
                    }
                  } catch (photoError: any) {
                    console.log('Fotoğraf silme uyarısı:', photoError.message);
                  }
                }
              }
              
              await deleteDoc(doc(db, 'listings', listing.id));
              Alert.alert('Başarılı', 'İlan başarıyla silindi');
            } catch (error: any) {
              console.error('İlan silme hatası:', error);
              Alert.alert('Hata', 'İlan silinirken bir sorun oluştu: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!userName.trim()) {
      Alert.alert('Hata', 'Lütfen bir isim girin');
      return;
    }
    
    const result = await updateUserProfile({
      name: userName,
      bio: userBio,
      phone: userPhone,
      location: userLocation
    } as any);

    if (result.success) {
      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
      setEditModalVisible(false);
    } else {
      Alert.alert('Hata', result.error || 'Profil güncellenirken bir sorun oluştu');
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.authContainer}>
          <Ionicons name="paw" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
          <Text style={[styles.authTitle, { color: colors.text }]}>Hoş Geldiniz</Text>
          <Text style={[styles.authText, { color: colors.secondaryText }]}>
            İlan eklemek ve profilinizi görüntülemek için giriş yapın
          </Text>
          <TouchableOpacity 
            style={[styles.authButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.authButton, styles.signupButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={[styles.authButtonText, { color: colors.primary }]}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeCount = allUserListings.filter(l => l.status === 'active').length;
  const adoptedCount = allUserListings.filter(l => l.status === 'adopted').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ayarlar Butonu - Sağ Üst Köşe */}
      <TouchableOpacity 
        style={[styles.settingsButton, { backgroundColor: colors.card }]}
        onPress={() => router.push('/settings')}
      >
        <Ionicons name="settings" size={24} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Kullanıcı Bilgileri */}
        <View style={[styles.userSection, { backgroundColor: colors.card }]}>
          {/* Profil Fotoğrafı */}
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={pickProfilePhoto}
            disabled={uploadingPhoto}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.cameraButton, { backgroundColor: colors.primary }]}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: colors.secondaryText }]}>{user.email}</Text>
          
          {/* Hızlı Bilgiler */}
          <View style={styles.quickInfo}>
            {userLocation && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="location" size={16} color={colors.secondaryText} />
                <Text style={[styles.quickInfoText, { color: colors.secondaryText }]}>{userLocation}</Text>
              </View>
            )}
            {userPhone && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="call" size={16} color={colors.secondaryText} />
                <Text style={[styles.quickInfoText, { color: colors.secondaryText }]}>{userPhone}</Text>
              </View>
            )}
          </View>
          
          {/* Biyografi */}
          {userBio ? (
            <View style={[styles.bioContainer, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
              <Text style={[styles.bioText, { color: colors.secondaryText }]}>{userBio}</Text>
            </View>
          ) : null}
          
          {/* Profili Düzenle Butonu */}
          <TouchableOpacity 
            style={[styles.editProfileButton, { borderColor: colors.primary }]}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.editProfileText, { color: colors.primary }]}>Profili Düzenle</Text>
          </TouchableOpacity>
          
          {/* İstatistikler */}
          <View style={[styles.statsContainer, { backgroundColor: colors.inputBackground }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{activeCount}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Aktif İlan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{adoptedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Sahiplendirilen</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{allUserListings.length}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Toplam</Text>
            </View>
          </View>
        </View>

        {/* İlanlarım Sekmeleri */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === 'active' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={activeTab === 'active' ? colors.primary : colors.secondaryText} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'active' ? colors.primary : colors.secondaryText },
              activeTab === 'active' && styles.tabTextActive
            ]}>
              Aktif ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === 'adopted' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('adopted')}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={activeTab === 'adopted' ? colors.primary : colors.secondaryText} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'adopted' ? colors.primary : colors.secondaryText },
              activeTab === 'adopted' && styles.tabTextActive
            ]}>
              Sahiplendirilen ({adoptedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* İlan Listesi */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={userListings}
            renderItem={({ item }) => (
              <View style={[styles.listingItem, { backgroundColor: colors.card }]}>
                <ListingCard listing={item} onPress={() => {}} />
                <View style={styles.listingActions}>
                  {activeTab === 'active' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: CUSTOM_COLORS.adopted }]}
                        onPress={() => handleMarkAdopted(item.id)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Sahiplendirildi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: CUSTOM_COLORS.delete }]}
                        onPress={() => handleDeleteListing(item)}
                      >
                        <Ionicons name="trash" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Sil</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {activeTab === 'adopted' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { flex: 1, backgroundColor: CUSTOM_COLORS.delete }]}
                      onPress={() => handleDeleteListing(item)}
                    >
                      <Ionicons name="trash" size={18} color="white" />
                      <Text style={styles.actionButtonText}>Sil</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
                <Ionicons 
                  name={activeTab === 'active' ? 'add-circle-outline' : 'checkmark-done-circle-outline'} 
                  size={64} 
                  color={colors.border} 
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {activeTab === 'active' 
                    ? 'Henüz aktif ilanınız yok' 
                    : 'Henüz sahiplendirilmiş ilanınız yok'
                  }
                </Text>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  {activeTab === 'active' 
                    ? 'Yeni bir hayvan sahiplendirmek için ilan ekleyin'
                    : 'Sahiplendirdiğiniz hayvanlar burada görünecek'
                  }
                </Text>
                {activeTab === 'active' && (
                  <TouchableOpacity 
                    style={[styles.addListingButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(tabs)/add')}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addListingButtonText}>İlan Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Profil Düzenleme Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profili Düzenle</Text>
            <TouchableOpacity 
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                <Ionicons name="person" size={16} color={colors.text} /> Ad Soyad *
              </Text>
              <TextInput
                style={[
                  styles.formInput, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Adınızı ve soyadınızı girin"
                placeholderTextColor={colors.secondaryText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                <Ionicons name="call" size={16} color={colors.text} /> Telefon
              </Text>
              <TextInput
                style={[
                  styles.formInput, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={userPhone}
                onChangeText={setUserPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={colors.secondaryText}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                <Ionicons name="location" size={16} color={colors.text} /> Konum
              </Text>
              <TextInput
                style={[
                  styles.formInput, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={userLocation}
                onChangeText={setUserLocation}
                placeholder="Şehir, İlçe"
                placeholderTextColor={colors.secondaryText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                <Ionicons name="document-text" size={16} color={colors.text} /> Hakkımda
              </Text>
              <TextInput
                style={[
                  styles.formInput, 
                  styles.textArea,
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={userBio}
                onChangeText={setUserBio}
                placeholder="Kendinizden, hayvan sevginizden bahsedin..."
                placeholderTextColor={colors.secondaryText}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.secondaryText }]}>{userBio.length}/200</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateProfile}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 12,
  },
  authText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  authButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  userSection: { 
    padding: 24, 
    paddingTop: 80,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: { 
    color: 'white', 
    fontSize: 40, 
    fontWeight: 'bold' 
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 4,
  },
  userEmail: { 
    fontSize: 15, 
    marginBottom: 12,
  },
  quickInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickInfoText: {
    fontSize: 14,
  },
  bioContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 20,
    marginBottom: 20,
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
  },
  tabContainer: { 
    flexDirection: 'row',
    marginBottom: 12,
  },
  tab: { 
    flex: 1, 
    padding: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { 
    borderBottomWidth: 3
  },
  tabText: { 
    fontWeight: '500',
    fontSize: 15,
  },
  tabTextActive: { 
    fontWeight: '600' 
  },
  loader: { 
    marginVertical: 40 
  },
  listingItem: { 
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  listingActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: { 
    padding: 40, 
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: { 
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  addListingButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addListingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});