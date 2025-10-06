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
import { db, storage } from '../../firebase';
import { IListing } from '../../types';

const AVATAR_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];

export default function ProfileScreen() {
  const { user, userData, logout, updateUserProfile } = useAuthContext();
  const router = useRouter();
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

  // Avatar rengi - kullanıcı adına göre sabit bir renk seç
  const avatarColor = AVATAR_COLORS[userName.length % AVATAR_COLORS.length];

  useEffect(() => {
    if (user && userData) {
      console.log('📝 Profil bilgileri yükleniyor:', userData.name);
      setUserName(userData.name || user.displayName || user.email?.split('@')[0] || 'Kullanıcı');
      setUserBio(userData.bio || '');
      setUserPhone((userData as any).phone || '');
      setUserLocation((userData as any).location || '');
      setProfilePhoto((userData as any).photoURL || '');
    }
  }, [user, userData]);

  useEffect(() => {
    if (user) {
      console.log('🔍 İlanlar listener kuruluyor...');
      const unsubscribe = setupListingsListener();
      return () => {
        console.log('🔒 İlanlar listener temizlendi');
        unsubscribe();
      };
    } else {
      console.log('❌ Kullanıcı yok, listener kurulmadı');
      setLoading(false);
      setAllUserListings([]);
    }
  }, [user]);

  const setupListingsListener = () => {
    if (!user) return () => {};

    try {
      setLoading(true);
      console.log('👤 Kullanıcı ID:', user.uid);
      
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

          console.log(`✅ ${listingsData.length} ilan yüklendi`);
          console.log('İlan durumları:', listingsData.map(l => ({ id: l.id, status: l.status })));
          
          setAllUserListings(listingsData);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Listener hatası:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Listener kurulum hatası:', error);
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
      
      // Firestore'da güncelle
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
      console.log('🏠 İlan sahiplendirildi olarak işaretleniyor:', listingId);
      
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'adopted',
        updatedAt: new Date()
      });
      
      console.log('✅ İlan durumu güncellendi');
      Alert.alert('Başarılı', 'İlan sahiplendirildi olarak işaretlendi');
    } catch (error) {
      console.error('❌ Sahiplendirme hatası:', error);
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
              console.log('🗑️ İlan siliniyor:', listing.id, 'Status:', listing.status);
              
              if (listing.photos && listing.photos.length > 0) {
                console.log(`📸 ${listing.photos.length} fotoğraf siliniyor`);
                
                for (const photoUrl of listing.photos) {
                  try {
                    const urlParts = photoUrl.split('/o/');
                    if (urlParts.length > 1) {
                      const pathPart = urlParts[1].split('?')[0];
                      const photoPath = decodeURIComponent(pathPart);
                      
                      const photoRef = ref(storage, photoPath);
                      await deleteObject(photoRef);
                      console.log('✅ Fotoğraf silindi:', photoPath);
                    }
                  } catch (photoError: any) {
                    console.log('⚠️ Fotoğraf silme uyarısı:', photoError.message);
                  }
                }
              }
              
              await deleteDoc(doc(db, 'listings', listing.id));
              console.log('✅ İlan Firestore\'dan silindi');
              
              Alert.alert('Başarılı', 'İlan başarıyla silindi');
            } catch (error: any) {
              console.error('❌ İlan silme hatası:', error);
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
    
    console.log('🔄 Profil güncelleniyor...');
    
    const result = await updateUserProfile({
      name: userName,
      bio: userBio,
      phone: userPhone,
      location: userLocation
    } as any);

    if (result.success) {
      console.log('✅ Profil güncellendi');
      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
      setEditModalVisible(false);
    } else {
      console.error('❌ Profil güncelleme hatası:', result.error);
      Alert.alert('Hata', result.error || 'Profil güncellenirken bir sorun oluştu');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Çıkış işlemi başlatılıyor...');
              
              await logout();
              console.log('✅ Logout fonksiyonu tamamlandı');
              
              router.replace('/auth/login');
              
            } catch (error) {
              console.error('❌ Çıkış hatası:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
            }
          }
        }
      ]
    );
  };

  if (!user) {
    console.log('👋 Kullanıcı yok - login ekranı gösteriliyor');
    
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="paw" size={64} color="#007AFF" style={{ marginBottom: 20 }} />
          <Text style={styles.authTitle}>Hoş Geldiniz</Text>
          <Text style={styles.authText}>İlan eklemek ve profilinizi görüntülemek için giriş yapın</Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.authButton, styles.signupButton]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={[styles.authButtonText, styles.signupButtonText]}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeCount = allUserListings.filter(l => l.status === 'active').length;
  const adoptedCount = allUserListings.filter(l => l.status === 'adopted').length;

  console.log(`📊 İstatistikler - Aktif: ${activeCount}, Sahiplendirilen: ${adoptedCount}`);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Kullanıcı Bilgileri */}
        <View style={styles.userSection}>
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
            <View style={styles.cameraButton}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          {/* Hızlı Bilgiler */}
          <View style={styles.quickInfo}>
            {userLocation && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.quickInfoText}>{userLocation}</Text>
              </View>
            )}
            {userPhone && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="call" size={16} color="#666" />
                <Text style={styles.quickInfoText}>{userPhone}</Text>
              </View>
            )}
          </View>
          
          {/* Biyografi */}
          {userBio ? (
            <View style={styles.bioContainer}>
              <Ionicons name="document-text" size={16} color="#007AFF" />
              <Text style={styles.bioText}>{userBio}</Text>
            </View>
          ) : null}
          
          {/* Profili Düzenle Butonu */}
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
          
          {/* İstatistikler */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{activeCount}</Text>
              <Text style={styles.statLabel}>Aktif İlan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{adoptedCount}</Text>
              <Text style={styles.statLabel}>Sahiplendirilen</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{allUserListings.length}</Text>
              <Text style={styles.statLabel}>Toplam</Text>
            </View>
          </View>
        </View>

        {/* İlanlarım Sekmeleri */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => {
              console.log('📑 Aktif ilanlar sekmesi seçildi');
              setActiveTab('active');
            }}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={activeTab === 'active' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Aktif ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'adopted' && styles.tabActive]}
            onPress={() => {
              console.log('📑 Sahiplendirilen sekmesi seçildi');
              setActiveTab('adopted');
            }}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={activeTab === 'adopted' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'adopted' && styles.tabTextActive]}>
              Sahiplendirilen ({adoptedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* İlan Listesi */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <FlatList
            data={userListings}
            renderItem={({ item }) => (
              <View style={styles.listingItem}>
                <ListingCard listing={item} onPress={() => {}} />
                <View style={styles.listingActions}>
                  {activeTab === 'active' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleMarkAdopted(item.id)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Sahiplendirildi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteListing(item)}
                      >
                        <Ionicons name="trash" size={18} color="white" />
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {activeTab === 'adopted' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton, { flex: 1 }]}
                      onPress={() => handleDeleteListing(item)}
                    >
                      <Ionicons name="trash" size={18} color="white" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={activeTab === 'active' ? 'add-circle-outline' : 'checkmark-done-circle-outline'} 
                  size={64} 
                  color="#ccc" 
                />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'active' 
                    ? 'Henüz aktif ilanınız yok' 
                    : 'Henüz sahiplendirilmiş ilanınız yok'
                  }
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'active' 
                    ? 'Yeni bir hayvan sahiplendirmek için ilan ekleyin'
                    : 'Sahiplendirdiğiniz hayvanlar burada görünecek'
                  }
                </Text>
                {activeTab === 'active' && (
                  <TouchableOpacity 
                    style={styles.addListingButton}
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

      {/* Çıkış Butonu */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Profil Düzenleme Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>
            <TouchableOpacity 
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="person" size={16} color="#333" /> Ad Soyad *
              </Text>
              <TextInput
                style={styles.formInput}
                value={userName}
                onChangeText={setUserName}
                placeholder="Adınızı ve soyadınızı girin"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="call" size={16} color="#333" /> Telefon
              </Text>
              <TextInput
                style={styles.formInput}
                value={userPhone}
                onChangeText={setUserPhone}
                placeholder="05XX XXX XX XX"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="location" size={16} color="#333" /> Konum
              </Text>
              <TextInput
                style={styles.formInput}
                value={userLocation}
                onChangeText={setUserLocation}
                placeholder="Şehir, İlçe"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="document-text" size={16} color="#333" /> Hakkımda
              </Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={userBio}
                onChangeText={setUserBio}
                placeholder="Kendinizden, hayvan sevginizden bahsedin..."
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.charCount}>{userBio.length}/200</Text>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
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
    flex: 1, 
    backgroundColor: '#f5f5f5' 
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
    color: '#333',
  },
  authText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  authButton: {
    backgroundColor: '#007AFF',
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
    borderColor: '#007AFF',
  },
  signupButtonText: {
    color: '#007AFF',
  },
  userSection: { 
    backgroundColor: 'white', 
    padding: 24, 
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
    backgroundColor: '#007AFF',
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
    color: '#333',
  },
  userEmail: { 
    fontSize: 15, 
    color: '#666',
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
    color: '#666',
  },
  bioContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 20,
    marginBottom: 20,
  },
  editProfileText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8f9fa',
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
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'white',
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
    borderBottomWidth: 3, 
    borderBottomColor: '#007AFF' 
  },
  tabText: { 
    color: '#666', 
    fontWeight: '500',
    fontSize: 15,
  },
  tabTextActive: { 
    color: '#007AFF', 
    fontWeight: '600' 
  },
  loader: { 
    marginVertical: 40 
  },
  listingItem: { 
    marginBottom: 12,
    backgroundColor: 'white',
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
    backgroundColor: '#34C759',
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
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: 'white',
  },
  emptyContainer: { 
    padding: 40, 
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: { 
    color: '#666', 
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  addListingButton: {
    backgroundColor: '#007AFF',
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
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f8f8',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
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