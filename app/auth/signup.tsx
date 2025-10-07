import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !userName) {
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

    setLoading(true);
    const result = await signUp(email, password, userName);
    setLoading(false);

    if (result.success) {
      Alert.alert('Başarılı', 'Hesap oluşturuldu!');
      router.replace('/(tabs)');
    } else {
      Alert.alert('Hata', result.error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
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
    button: {
      backgroundColor: colors.success,
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
    },
    linkText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıt Ol</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ad Soyad *"
        placeholderTextColor={colors.secondaryText}
        value={userName}
        onChangeText={setUserName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="E-posta *"
        placeholderTextColor={colors.secondaryText}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre *"
        placeholderTextColor={colors.secondaryText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre Tekrar *"
        placeholderTextColor={colors.secondaryText}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSignup}
        disabled={loading}
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
  );
}