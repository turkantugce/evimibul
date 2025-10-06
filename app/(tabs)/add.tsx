import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { db, storage } from '../../firebase';

const SPECIES_OPTIONS = ['Kedi', 'Köpek', 'Kuş', 'Tavşan', 'Hamster', 'Diğer'];
const GENDER_OPTIONS = ['Erkek', 'Dişi', 'Bilinmiyor'];
const AGE_OPTIONS = ['0-6 ay', '6-12 ay', '1-3 yaş', '3-7 yaş', '7+ yaş'];

export default function AddListingScreen() {
  const [form, setForm] = useState({
    title: '',
    species: '',
    breed: '',
    age: '',
    gender: '',
    city: '',
    district: '',
    description: '',
    vaccinated: false,
    neutered: false
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useAuthContext();
  const router = useRouter();

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit', 'En fazla 5 fotoğraf ekleyebilirsiniz');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const filename = `listings/${user?.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Hata', 'Önce giriş yapmalısınız');
      return;
    }

    // Validasyon
    if (!form.title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan başlığı girin');
      return;
    }
    if (!form.species) {
      Alert.alert('Eksik Bilgi', 'Lütfen hayvan türünü seçin');
      return;
    }
    if (!form.age) {
      Alert.alert('Eksik Bilgi', 'Lütfen yaş aralığını seçin');
      return;
    }
    if (!form.city.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen şehir bilgisi girin');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen açıklama ekleyin');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az bir fotoğraf ekleyin');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Fotoğrafları yükle
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadImage(photos[i]);
        photoUrls.push(url);
        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      // Firestore'a kaydet
      await addDoc(collection(db, 'listings'), {
        ...form,
        title: form.title.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        description: form.description.trim(),
        photos: photoUrls,
        ownerId: user.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      Alert.alert('Başarılı', 'İlanınız başarıyla yayınlandı!', [
        { text: 'Tamam', onPress: () => router.push('/(tabs)') }
      ]);
      
      // Formu temizle
      setForm({
        title: '',
        species: '',
        breed: '',
        age: '',
        gender: '',
        city: '',
        district: '',
        description: '',
        vaccinated: false,
        neutered: false
      });
      setPhotos([]);

    } catch (error) {
      console.error('İlan ekleme hatası:', error);
      Alert.alert('Hata', 'İlan eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const SelectButton = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.selectButton, selected && styles.selectButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.selectButtonText, selected && styles.selectButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Yeni İlan Ekle</Text>
          <Text style={styles.subtitle}>
            Sevimli dostunuz için yeni bir yuva bulun
          </Text>
        </View>

        {/* Fotoğraflar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <Text style={styles.helperText}>
            En fazla 5 fotoğraf ekleyebilirsiniz ({photos.length}/5)
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
          >
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={pickImage}
              disabled={photos.length >= 5}
            >
              <Ionicons name="camera" size={32} color="#666" />
              <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
            </TouchableOpacity>
            
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
                {index === 0 && (
                  <View style={styles.mainPhotoBadge}>
                    <Text style={styles.mainPhotoText}>Ana</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Temel Bilgiler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İlan Başlığı <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Sevimli sarman kedi yuva arıyor"
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
              maxLength={60}
            />
            <Text style={styles.charCount}>{form.title.length}/60</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hayvan Türü <Text style={styles.required}>*</Text></Text>
            <View style={styles.selectGrid}>
              {SPECIES_OPTIONS.map((species) => (
                <SelectButton
                  key={species}
                  label={species}
                  selected={form.species === species.toLowerCase()}
                  onPress={() => setForm({ ...form, species: species.toLowerCase() })}
                />
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cins</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Scottish Fold, Golden Retriever"
              value={form.breed}
              onChangeText={(text) => setForm({ ...form, breed: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Yaş Aralığı <Text style={styles.required}>*</Text></Text>
            <View style={styles.selectGrid}>
              {AGE_OPTIONS.map((age) => (
                <SelectButton
                  key={age}
                  label={age}
                  selected={form.age === age}
                  onPress={() => setForm({ ...form, age })}
                />
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cinsiyet</Text>
            <View style={styles.selectRow}>
              {GENDER_OPTIONS.map((gender) => (
                <SelectButton
                  key={gender}
                  label={gender}
                  selected={form.gender === gender}
                  onPress={() => setForm({ ...form, gender })}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Konum Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Konum</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şehir <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: İstanbul"
              value={form.city}
              onChangeText={(text) => setForm({ ...form, city: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>İlçe</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Kadıköy"
              value={form.district}
              onChangeText={(text) => setForm({ ...form, district: text })}
            />
          </View>
        </View>

        {/* Sağlık Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Sağlık Durumu</Text>
          </View>
          
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setForm({ ...form, vaccinated: !form.vaccinated })}
          >
            <View style={[styles.checkbox, form.vaccinated && styles.checkboxChecked]}>
              {form.vaccinated && <Ionicons name="checkmark" size={18} color="white" />}
            </View>
            <View style={styles.checkboxContent}>
              <Text style={styles.checkboxLabel}>Aşıları tam</Text>
              <Text style={styles.checkboxHelper}>Düzenli aşı takvimine uygun</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setForm({ ...form, neutered: !form.neutered })}
          >
            <View style={[styles.checkbox, form.neutered && styles.checkboxChecked]}>
              {form.neutered && <Ionicons name="checkmark" size={18} color="white" />}
            </View>
            <View style={styles.checkboxContent}>
              <Text style={styles.checkboxLabel}>Kısırlaştırılmış</Text>
              <Text style={styles.checkboxHelper}>Cerrahi sterilizasyon yapılmış</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Açıklama */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <Text style={styles.helperText}>
            Karakteri, alışkanlıkları ve özel ihtiyaçları hakkında bilgi verin
          </Text>
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Dostumuzun kişiliği, alışkanlıkları ve özel bakım gereksinimleri hakkında detaylı bilgi verin..."
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            multiline
            numberOfLines={6}
            maxLength={500}
          />
          <Text style={styles.charCount}>{form.description.length}/500</Text>
        </View>

        {/* Gönder Butonu */}
        <View style={styles.submitSection}>
          <TouchableOpacity 
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator color="white" />
                <Text style={styles.submitButtonText}>
                  Yükleniyor... {Math.round(uploadProgress)}%
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="white" />
                <Text style={styles.submitButtonText}>İlanı Yayınla</Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            İlanınızı yayınlayarak kullanım koşullarını kabul etmiş olursunuz
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: { 
    backgroundColor: 'white', 
    padding: 16, 
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#333',
    marginLeft: 8,
  },
  required: {
    color: '#FF3B30',
    fontSize: 18,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  photoScroll: {
    marginTop: 8,
  },
  addPhotoButton: { 
    width: 120, 
    height: 120, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  addPhotoText: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 8,
    fontWeight: '500',
  },
  photoContainer: { 
    marginRight: 12, 
    position: 'relative' 
  },
  photo: { 
    width: 120, 
    height: 120, 
    borderRadius: 12 
  },
  removePhotoButton: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: '#FF3B30', 
    width: 28, 
    height: 28, 
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mainPhotoText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: { 
    backgroundColor: '#f8f8f8', 
    padding: 14, 
    borderRadius: 10, 
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  textArea: { 
    height: 120, 
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  selectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 12,
  },
  checkbox: { 
    width: 28, 
    height: 28, 
    borderWidth: 2, 
    borderColor: '#ddd', 
    borderRadius: 6, 
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { 
    backgroundColor: '#34C759', 
    borderColor: '#34C759' 
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '500',
  },
  checkboxHelper: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  submitSection: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: { 
    backgroundColor: '#007AFF', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  submitButtonDisabled: { 
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  submitButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '600' 
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    lineHeight: 18,
  },
});