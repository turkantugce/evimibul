import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from './../contexts/AuthContext';
import { useTheme } from './../contexts/ThemeContext';
import { db } from './../firebase';

export default function SettingsScreen() {
  const { user, logout } = useAuthContext();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  // Şifre değiştirme modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir büyük harf içermelidir' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir küçük harf içermelidir' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir rakam içermelidir' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)' };
    }
    return { valid: true, message: 'Güçlü şifre' };
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Zayıf Şifre', validation.message);
      return;
    }

    if (!user || !user.email) {
      Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
      return;
    }

    setChangingPassword(true);

    try {
      // Kullanıcıyı yeniden doğrula
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      await updatePassword(user, newPassword);

      Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Şifre değiştirme hatası:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Hata', 'Mevcut şifre yanlış');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Hata', 'Şifre çok zayıf');
      } else {
        Alert.alert('Hata', 'Şifre değiştirilirken bir sorun oluştu');
      }
    } finally {
      setChangingPassword(false);
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
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Çıkış hatası:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Hesabı Sil', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Son Uyarı',
              'Tüm ilanlarınız, mesajlarınız ve profil bilgileriniz kalıcı olarak silinecektir. Devam etmek istiyor musunuz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Evet, Sil',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (!user) return;
                      
                      await deleteDoc(doc(db, 'users', user.uid));
                      await deleteUser(user);
                      
                      Alert.alert('Başarılı', 'Hesabınız silindi');
                      router.replace('/auth/login');
                    } catch (error: any) {
                      console.error('Hesap silme hatası:', error);
                      if (error.code === 'auth/requires-recent-login') {
                        Alert.alert(
                          'Güvenlik Gerekli',
                          'Hesabınızı silmek için lütfen çıkış yapıp tekrar giriş yapın.'
                        );
                      } else {
                        Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu');
                      }
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:destek@petadoption.com?subject=Destek Talebi'); //butona basınca maile yönlendiriyor
  };

  const handleRateApp = () => {
    Alert.alert('Uygulamamızı Değerlendirin', 'App Store / Play Store\'da değerlendirme yapabilirsiniz.');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      paddingTop: 60,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    section: {
      marginTop: 24,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      color: colors.secondaryText,
    },
    dangerTitle: {
      color: colors.danger,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dangerItem: {
      borderBottomColor: isDarkMode ? '#4a2424' : '#ffe5e5',
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
      marginBottom: 2,
      color: colors.text,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    dangerText: {
      color: colors.danger,
    },
    footer: {
      padding: 32,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    footerSubtext: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    passwordInfo: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      backgroundColor: isDarkMode ? '#1a237e' : '#e3f2fd',
      borderRadius: 8,
      marginBottom: 24,
    },
    passwordInfoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: isDarkMode ? '#e8eaf6' : '#1565c0',
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.text,
    },
    passwordInput: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    input: {
      flex: 1,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    passwordStrength: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '500',
    },
    passwordError: {
      marginTop: 6,
      fontSize: 13,
      color: colors.danger,
    },
    saveButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Bildirimler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Bildirimler</Text>
                <Text style={styles.settingDescription}>
                  Yeni mesajlar ve ilan güncellemeleri
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? colors.card : colors.border}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>E-posta Bildirimleri</Text>
                <Text style={styles.settingDescription}>
                  Önemli güncellemeleri e-posta ile al
                </Text>
              </View>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={emailNotifications ? colors.card : colors.border}
            />
          </View>
        </View>

        {/* Görünüm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Görünüm</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Karanlık Mod</Text>
                <Text style={styles.settingDescription}>
                  Gece kullanımı için koyu tema
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? colors.card : colors.border}
            />
          </View>
        </View>

        {/* Hesap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('/profile')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Profili Düzenle</Text>
                <Text style={styles.settingDescription}>
                  Ad, fotoğraf ve diğer bilgiler
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="key" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Şifre Değiştir</Text>
                <Text style={styles.settingDescription}>
                  Hesap güvenliğini güncelle
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* Destek ve Bilgi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek ve Bilgi</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleContactSupport}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Destek</Text>
                <Text style={styles.settingDescription}>
                  Yardım ve sorun bildirimi
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleRateApp}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="star" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Uygulamamızı Değerlendirin</Text>
                <Text style={styles.settingDescription}>
                  Görüşleriniz bizim için değerli
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('./privacy-policy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Gizlilik Politikası</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('./terms-of-service')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Kullanım Şartları</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={24} color={colors.secondaryText} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Versiyon</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tehlikeli İşlemler */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Tehlikeli Bölge</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]} 
            onPress={handleLogout}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="log-out" size={24} color={colors.danger} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Çıkış Yap</Text>
                <Text style={styles.settingDescription}>
                  Hesabınızdan çıkış yapın
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.danger} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]} 
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={24} color={colors.danger} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Hesabı Sil</Text>
                <Text style={styles.settingDescription}>
                  Hesabınızı kalıcı olarak silin
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🐾 Evimi Bul
          </Text>
          
        </View>
      </ScrollView>

      {/* Şifre Değiştirme Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.passwordInfo}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={styles.passwordInfoText}>
                Güçlü bir şifre: En az 8 karakter, büyük-küçük harf, rakam ve özel karakter içermelidir.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mevcut Şifre</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Mevcut şifrenizi girin"
                  placeholderTextColor={colors.secondaryText}
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Ionicons 
                    name={showCurrentPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.secondaryText} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Yeni Şifre</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Yeni şifrenizi girin"
                  placeholderTextColor={colors.secondaryText}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.secondaryText} 
                  />
                </TouchableOpacity>
              </View>
              {newPassword.length > 0 && (
                <Text style={[
                  styles.passwordStrength,
                  { color: validatePassword(newPassword).valid ? colors.success : colors.danger }
                ]}>
                  {validatePassword(newPassword).message}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Yeni Şifre (Tekrar)</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Yeni şifrenizi tekrar girin"
                  placeholderTextColor={colors.secondaryText}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.secondaryText} 
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.passwordError}>
                  Şifreler eşleşmiyor
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, changingPassword && styles.saveButtonDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <Text style={styles.saveButtonText}>Değiştiriliyor...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.card} />
                  <Text style={styles.saveButtonText}>Şifreyi Değiştir</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}