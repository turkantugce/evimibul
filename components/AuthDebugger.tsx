import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';

export default function AuthDebugger() {
  const { user, userData, logout } = useAuthContext();

  const testLogout = async () => {
    console.log('=== LOGOUT TEST ===');
    console.log('Before logout - User:', user?.email);
    console.log('Before logout - UserData:', userData);
    
    const result = await logout();
    console.log('Logout result:', result);
    
    if (result.success) {
      Alert.alert('Başarılı', 'Çıkış yapıldı!');
    } else {
      Alert.alert('Hata', result.error || 'Çıkış yapılamadı');
    }
  };

  const testUserData = () => {
    console.log('=== USER DATA DEBUG ===');
    console.log('User:', user);
    console.log('UserData:', userData);
    console.log('User UID:', user?.uid);
    console.log('User DisplayName:', user?.displayName);
    console.log('UserData Name:', userData?.name);
    console.log('UserData Bio:', userData?.bio);
    
    Alert.alert(
      'Debug Info', 
      `User: ${user?.email}\nUserData: ${userData ? 'EXISTS' : 'NULL'}\nName: ${userData?.name}`
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>❌ Kullanıcı Girişi YOK</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ Kullanıcı: {user.email}</Text>
      <Text style={styles.text}>📛 İsim: {userData?.name || 'Yükleniyor...'}</Text>
      <Text style={styles.text}>📝 Bio: {userData?.bio || 'Yok'}</Text>
      
      <TouchableOpacity style={styles.debugButton} onPress={testUserData}>
        <Text style={styles.debugButtonText}>Debug Bilgileri</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.logoutButton} onPress={testLogout}>
        <Text style={styles.logoutButtonText}>Test Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  text: {
    fontSize: 12,
    marginBottom: 4,
    color: '#333',
  },
  debugButton: {
    backgroundColor: '#FFA500',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});