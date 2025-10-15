import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { db, storage, supabase } from '../../lib/supabase';
import { IListing } from '../../types/types';

const AVATAR_COLORS = ['#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9'];

const CUSTOM_COLORS = {
  adopted: '#D4A574',
  delete: '#8B7355',
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function ProfileScreen() {
  const { user, userData, updateUserProfile, updateUsername, checkUsernameAvailability } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'active' | 'adopted'>('active');
  const [allUserListings, setAllUserListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [username, setUsername] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const avatarColor = AVATAR_COLORS[userName.length % AVATAR_COLORS.length];

  // ✅ Kullanıcı verilerini güncelle
  useEffect(() => {
    if (user && userData) {
      setUserName(userData.name || user.displayName || user.email?.split('@')[0] || 'Kullanıcı');
      setUsername(userData.username || '');
      setUserBio(userData.bio || '');
      setUserPhone(userData.phone || '');
      setUserLocation(userData.location || '');
      setProfilePhoto(userData.photoURL || '');
    }
  }, [user, userData]);

  const loadUserListings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setAllUserListings([]);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listingsData: IListing[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || '',
        species: item.species || '',
        breed: item.breed || '',
        age: item.age || '',
        gender: item.gender || '',
        city: item.city || '',
        district: item.district || '',
        description: item.description || '',
        photos: item.photos || [],
        vaccinated: item.vaccinated || false,
        neutered: item.neutered || false,
        status: item.status || 'active',
        ownerId: item.owner_id || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setAllUserListings(listingsData);
    } catch (error) {
      console.error('Listings load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ Her sayfa açıldığında yeniden yükle
  useFocusEffect(
    useCallback(() => {
      loadUserListings();
    }, [loadUserListings])
  );

  // ✅ Real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`user_listings_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `owner_id=eq.${user.id}`
        },
        () => {
          loadUserListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, loadUserListings]);

  const userListings = allUserListings.filter(listing => listing.status === activeTab);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      console.log('Fotograf yukleme baslatildi:', uri);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const filePath = `profiles/${user.id}/avatar.${fileExt}`;

      console.log('Fotograf yukleniyor:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, decode(base64), {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Fotograf yuklendi:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          photo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        throw updateError;
      }

      setProfilePhoto(publicUrl);

      if (updateUserProfile) {
        await updateUserProfile({ photoURL: publicUrl });
      }

      console.log('Tum islemler tamamlandi');
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');

    } catch (error: any) {
      console.error('Photo upload error:', error);

      if (error.message?.includes('row-level security')) {
        Alert.alert(
          'Yetki Hatası', 
          'Supabase Storage RLS policy ayarlarını kontrol edin.\n\n' +
          'Çözüm:\n' +
          '1. Supabase Dashboard > Storage > images\n' +
          '2. Policies > New Policy\n' +
          '3. "Enable insert for authenticated users only"\n' +
          '4. Policy: INSERT - authenticated users'
        );
      } else {
        Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken sorun oluştu');
      }
    } finally {
      setUploadingPhoto(false);
      console.log('Upload islemi sonlandi');
    }
  };

  const handleDeleteListing = (listing: IListing) => {
    Alert.alert(
      'İlanı Sil',
      `"${listing.title}" ilanını silmek istediğinizden emin misiniz?`,
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
                    const urlParts = photoUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    await storage.listings.delete(fileName);
                  } catch (photoError) {
                    console.log('Photo deletion warning:', photoError);
                  }
                }
              }

              await db.listings.delete(listing.id);
              Alert.alert('Başarılı', 'İlan silindi');
            } catch (error) {
              console.error('Listing deletion error:', error);
              Alert.alert('Hata', 'İlan silinirken sorun oluştu');
            }
          },
        },
      ]
    );
  };

  const handleUsernameCheck = async () => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      return;
    }

    if (username.length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalı');
      setUsernameAvailable(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Hata', 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(username);
      setUsernameAvailable(available);
      if (!available) {
        Alert.alert('Uyarı', 'Bu kullanıcı adı zaten alınmış');
      }
    } catch (error) {
      console.error('Username kontrol hatasi:', error);
      Alert.alert('Hata', 'Kullanıcı adı kontrol edilirken bir hata oluştu');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!userName.trim()) {
      Alert.alert('Hata', 'Lütfen bir isim girin');
      return;
    }

    try {
      const profileResult = await updateUserProfile({
        name: userName,
        bio: userBio,
        phone: userPhone,
        location: userLocation
      });

      if (!profileResult.success) {
        Alert.alert('Hata', profileResult.error || 'Profil güncellenirken bir sorun oluştu');
        return;
      }

      if (username && username !== userData?.username && usernameAvailable === true) {
        const usernameResult = await updateUsername(username);
        if (!usernameResult.success) {
          Alert.alert('Hata', usernameResult.error || 'Kullanıcı adı güncellenirken bir sorun oluştu');
          return;
        }
      }

      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
      setEditModalVisible(false);
    } catch (error: any) {
      console.error('Profil guncelleme hatasi:', error);
      Alert.alert('Hata', error.message || 'Profil güncellenirken bir sorun oluştu');
    }
  };

  const handleMarkAdopted = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'adopted',
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      Alert.alert('Başarılı', 'İlan sahiplendirildi olarak işaretlendi');
    } catch (error) {
      console.error('Mark adopted error:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
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
      <TouchableOpacity 
        style={[styles.settingsButton, { backgroundColor: colors.card }]}
        onPress={() => router.push('/settings')}
        testID="settings-button"
      >
        <Ionicons name="settings" size={24} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.userSection, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={pickProfilePhoto}
            disabled={uploadingPhoto}
            testID="avatar-button"
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
          
          {userData?.username && (
            <Text style={[styles.userUsername, { color: colors.primary }]}>
              @{userData.username}
            </Text>
          )}
          
          <Text style={[styles.userEmail, { color: colors.secondaryText }]}>{user.email}</Text>
          
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
          
          {userBio ? (
            <View style={[styles.bioContainer, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
              <Text style={[styles.bioText, { color: colors.secondaryText }]}>{userBio}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity 
            style={[styles.editProfileButton, { borderColor: colors.primary }]}
            onPress={() => setEditModalVisible(true)}
            testID="edit-profile-button"
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.editProfileText, { color: colors.primary }]}>Profili Düzenle</Text>
          </TouchableOpacity>
          
          <View style={[styles.statsContainer, { backgroundColor: colors.inputBackground }]}>
            <View testID="stats-active" style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{activeCount}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Aktif İlan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View testID="stats-adopted" style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{adoptedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Sahiplendirilen</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View testID="stats-total" style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{allUserListings.length}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Toplam</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            testID="tab-active"
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
            testID="tab-adopted"
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

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={userListings}
            renderItem={({ item }) => (
              <View style={[styles.listingItem, { backgroundColor: colors.card }]}>
                <ListingCard listing={item} onPress={() => {}} />
                <View testID="listing-actions" style={styles.listingActions}>
                  {activeTab === 'active' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: CUSTOM_COLORS.adopted }]}
                        onPress={() => handleMarkAdopted(item.id)}
                        testID="mark-adopted-button"
                      >
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Sahiplendirildi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: CUSTOM_COLORS.delete }]}
                        onPress={() => handleDeleteListing(item)}
                        testID="delete-listing-button"
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
                      testID="delete-adopted-button"
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
              <View testID="empty-listings" style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
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
                    testID="add-listing-button"
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
        testID="edit-profile-modal"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profili Düzenle</Text>
            <TouchableOpacity 
              onPress={() => setEditModalVisible(false)}
              testID="close-modal-button"
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
                testID="name-input"
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
                <Ionicons name="at" size={16} color={colors.text} /> Kullanıcı Adı
              </Text>
              <View style={styles.usernameRow}>
                <Text style={[styles.usernamePrefix, { color: colors.secondaryText }]}>@</Text>
                <TextInput
                  testID="username-input"
                  style={[
                    styles.formInput,
                    styles.usernameInput,
                    { 
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                      color: colors.text
                    }
                  ]}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setUsernameAvailable(null);
                  }}
                  placeholder="kullaniciadi"
                  placeholderTextColor={colors.secondaryText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={[styles.checkUsernameButton, { backgroundColor: colors.primary }]}
                  onPress={handleUsernameCheck}
                  testID="check-username-button"
                  disabled={checkingUsername || !username.trim()}
                >
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.checkUsernameButtonText}>
                      {username.length < 3 ? 'Min 3' : 'Kontrol'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {usernameAvailable !== null && (
                <Text 
                  style={[
                    styles.availabilityText,
                    usernameAvailable ? styles.available : styles.unavailable
                  ]}
                  testID="username-availability-text"
                >
                  {usernameAvailable ? '✓ Bu kullanıcı adı müsait' : '✗ Bu kullanıcı adı alınmış'}
                </Text>
              )}
              <Text style={[styles.helperText, { color: colors.secondaryText }]}>
                Kullanıcı adınız diğer kullanıcılar tarafından görülebilir
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                <Ionicons name="call" size={16} color={colors.text} /> Telefon
              </Text>
              <TextInput
                testID="phone-input"
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
                testID="location-input"
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
                testID="bio-input"
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
              <Text testID="bio-char-count" style={[styles.charCount, { color: colors.secondaryText }]}>{userBio.length}/200</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateProfile}
              testID="save-profile-button"
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
  container: { flex: 1 },
  settingsButton: { position: 'absolute', top: 60, right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  scrollView: { flex: 1 },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
  authText: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  authButton: { padding: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 12 },
  authButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  signupButton: { backgroundColor: 'transparent', borderWidth: 2 },
  userSection: { padding: 24, paddingTop: 80, alignItems: 'center', marginBottom: 12 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  userUsername: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  userEmail: { fontSize: 15, marginBottom: 12 },
  quickInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickInfoText: { fontSize: 14 },
  bioContainer: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 8, width: '100%', marginBottom: 12 },
  bioText: { flex: 1, fontSize: 14, lineHeight: 20 },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderRadius: 20, marginBottom: 20 },
  editProfileText: { fontSize: 15, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', width: '100%', borderRadius: 12, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 13 },
  statDivider: { width: 1 },
  tabContainer: { flexDirection: 'row', marginBottom: 12 },
  tab: { flex: 1, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 3 },
  tabText: { fontWeight: '500', fontSize: 15 },
  tabTextActive: { fontWeight: '600' },
  loader: { marginVertical: 40 },
  listingItem: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', marginHorizontal: 16 },
  listingActions: { flexDirection: 'row', padding: 12, gap: 8 },
  actionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  actionButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center', marginHorizontal: 16, borderRadius: 12, marginTop: 20, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  addListingButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addListingButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalCloseButton: { padding: 4 },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 24 },
  formLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  formInput: { padding: 14, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  usernamePrefix: { fontSize: 16, fontWeight: '600', marginRight: 8, position: 'absolute', left: 14, zIndex: 1 },
  usernameInput: { paddingLeft: 30, paddingRight: 100 },
  checkUsernameButton: { position: 'absolute', right: 10, top: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  checkUsernameButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  availabilityText: { fontSize: 12, marginTop: 4, marginLeft: 5 },
  available: { color: '#4CAF50', fontWeight: '600' },
  unavailable: { color: '#f44336', fontWeight: '600' },
  helperText: { fontSize: 12, marginTop: 4, marginLeft: 5, fontStyle: 'italic' },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 4 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});