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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuthContext();
  const { colors } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      Alert.alert('Başarılı', 'Giriş yapıldı!');
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
    },
    linkText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>
      
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
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.card} />
        ) : (
          <Text style={styles.buttonText}>Giriş Yap</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.linkButton}
        onPress={() => router.push('/auth/signup')}
      >
        <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
      </TouchableOpacity>
    </View>
  );
}