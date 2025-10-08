import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../firebase';

interface UserResult {
  id: string;
  name: string;
  username?: string; // YENİ: Username alanı eklendi
  email: string;
  photoURL?: string;
  bio?: string;
}

export default function UserSearchScreen() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchLower = searchQuery.toLowerCase().trim();
      
      const usersQuery = query(
        collection(db, 'users'),
        limit(20)
      );

      const snapshot = await getDocs(usersQuery);
      const results: UserResult[] = [];

      snapshot.forEach((doc) => {
        if (doc.id === user?.uid) return; // Kendini gösterme

        const data = doc.data();
        const userName = (data.name || '').toLowerCase();
        const userEmail = (data.email || '').toLowerCase();
        const userUsername = (data.username || '').toLowerCase(); // YENİ: Username kontrolü

        // YENİ: Username'e göre de ara
        if (userName.includes(searchLower) || 
            userEmail.includes(searchLower) ||
            userUsername.includes(searchLower)) {
          results.push({
            id: doc.id,
            name: data.name || 'İsimsiz Kullanıcı',
            username: data.username, // YENİ: Username ekle
            email: data.email || '',
            photoURL: data.photoURL,
            bio: data.bio
          });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kullanıcı Ara</Text>
      </View>

      {/* Arama Kutusu */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="İsim, email veya kullanıcı adı ile ara..." // YENİ: Placeholder güncellendi
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={handleSearch}
          disabled={!searchQuery.trim() || loading}
        >
          <Text style={styles.searchButtonText}>Ara</Text>
        </TouchableOpacity>
      </View>

      {/* Sonuçlar */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
              onPress={() => router.push(`/users/${item.id}`)}
            >
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                
                {/* YENİ: Username gösterimi */}
                {item.username && (
                  <Text style={[styles.userUsername, { color: colors.primary }]}>
                    @{item.username}
                  </Text>
                )}
                
                <Text style={[styles.userEmail, { color: colors.secondaryText }]}>{item.email}</Text>
                {item.bio && (
                  <Text style={[styles.userBio, { color: colors.secondaryText }]} numberOfLines={1}>
                    {item.bio}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Kullanıcı bulunamadı</Text>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  Farklı anahtar kelimeler deneyin
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={64} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Kullanıcı Ara</Text>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  İsim, email veya kullanıcı adı ile kullanıcı arayın ve profillerini görüntüleyin
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  // YENİ: Username stili
  userUsername: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  userBio: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});