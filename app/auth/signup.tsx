import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signUp, checkUsernameAvailability } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();

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
      console.error('Username kontrol hatası:', error);
      Alert.alert('Hata', 'Kullanıcı adı kontrol edilirken bir hata oluştu');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !userName || !username) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalı');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Hata', 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Hata', 'Lütfen müsait bir kullanıcı adı seçin');
      return;
    }

    if (usernameAvailable === null) {
      Alert.alert('Uyarı', 'Lütfen kullanıcı adınızı kontrol edin');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, userName, username);
    setLoading(false);

    if (result.success) {
      Alert.alert('Başarılı', 'Hesap oluşturuldu!');
      router.replace('/(tabs)');
    } else {
      Alert.alert('Hata', result.error);
    }
  };

  const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    container: {
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 40,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.inputBackground,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
    },
    usernameContainer: {
      position: 'relative',
      marginBottom: 15,
    },
    usernameInput: {
      backgroundColor: colors.inputBackground,
      padding: 15,
      paddingRight: 100,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
    },
    checkButton: {
      position: 'absolute',
      right: 10,
      top: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    checkButtonText: {
      color: colors.card,
      fontSize: 12,
      fontWeight: '600',
    },
    availabilityText: {
      fontSize: 12,
      marginTop: -10,
      marginBottom: 15,
      marginLeft: 5,
    },
    available: {
      color: colors.success,
      fontWeight: '600',
    },
    unavailable: {
      color: colors.danger,
      fontWeight: '600',
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: colors.card,
      fontSize: 18,
      fontWeight: '600',
    },
    linkButton: {
      marginTop: 20,
      alignItems: 'center',
      marginBottom: 30,
    },
    linkText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      style={{ backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Kayıt Ol</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Ad Soyad"
          placeholderTextColor={colors.secondaryText}
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="words"
        />
        
        <View style={styles.usernameContainer}>
          <TextInput
            style={styles.usernameInput}
            placeholder="Kullanıcı Adı"
            placeholderTextColor={colors.secondaryText}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setUsernameAvailable(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {username.length > 0 && (
            <TouchableOpacity 
              style={styles.checkButton}
              onPress={handleUsernameCheck}
              disabled={checkingUsername || username.length < 3}
            >
              {checkingUsername ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={styles.checkButtonText}>
                  {username.length < 3 ? 'Min 3' : 'Kontrol'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {usernameAvailable !== null && (
          <Text style={[
            styles.availabilityText,
            usernameAvailable ? styles.available : styles.unavailable
          ]}>
            {usernameAvailable ? '✓ Bu kullanıcı adı müsait' : '✗ Bu kullanıcı adı alınmış'}
          </Text>
        )}
        
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor={colors.secondaryText}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor={colors.secondaryText}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre Tekrar"
          placeholderTextColor={colors.secondaryText}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSignup}
          disabled={loading || usernameAvailable === false}
          testID="signup-button"
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.buttonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.linkText}>Zaten hesabın var mı? Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}