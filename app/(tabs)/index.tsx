import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ListingCard from '../../components/ListingCard';
import ListingModal from '../../components/ListingModal';
import { useAuthContext } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { IListing } from '../../types';

export default function HomeScreen() {
  const [allListings, setAllListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<IListing | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');

  const { user } = useAuthContext();

  useEffect(() => {
    // Real-time listener
    const unsubscribe = setupListingsListener();
    return () => unsubscribe();
  }, []);

  const setupListingsListener = () => {
    try {
      setLoading(true);
      
      // Sadece status ve orderBy kullan - species filtresini client-side yapacağız
      const q = query(
        collection(db, 'listings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(50)
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

          console.log(`${listingsData.length} ilan yüklendi`);
          setAllListings(listingsData);
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
      return () => {}; // boş unsubscribe
    }
  };

  // Client-side filtreleme
  const filteredListings = useMemo(() => {
    let filtered = allListings;

    // Tür filtreleme
    if (speciesFilter) {
      filtered = filtered.filter(listing => 
        listing.species.toLowerCase() === speciesFilter.toLowerCase()
      );
    }

    // Arama filtreleme
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.species.toLowerCase().includes(query) ||
        listing.breed.toLowerCase().includes(query) ||
        listing.city.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allListings, speciesFilter, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Listener otomatik güncelleyecek, sadece loading state'i göster
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleListingPress = (listing: IListing) => {
    setSelectedListing(listing);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama ve Filtre */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="İlanlarda ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.speciesFilter}>
          <TouchableOpacity 
            style={[styles.filterButton, speciesFilter === '' && styles.filterButtonActive]}
            onPress={() => setSpeciesFilter('')}
          >
            <Text style={[styles.filterText, speciesFilter === '' && styles.filterTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, speciesFilter === 'kedi' && styles.filterButtonActive]}
            onPress={() => setSpeciesFilter('kedi')}
          >
            <Text style={[styles.filterText, speciesFilter === 'kedi' && styles.filterTextActive]}>
              Kediler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, speciesFilter === 'köpek' && styles.filterButtonActive]}
            onPress={() => setSpeciesFilter('köpek')}
          >
            <Text style={[styles.filterText, speciesFilter === 'köpek' && styles.filterTextActive]}>
              Köpekler
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* İlan Listesi */}
      <FlatList
        data={filteredListings}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={handleListingPress} />
        )}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || speciesFilter 
                ? 'Arama kriterlerine uygun ilan bulunamadı' 
                : 'Henüz ilan bulunmuyor'
              }
            </Text>
          </View>
        }
      />

      {/* İlan Detay Modal */}
      <ListingModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { padding: 16, backgroundColor: 'white' },
  searchInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  speciesFilter: { flexDirection: 'row', justifyContent: 'space-around' },
  filterButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    backgroundColor: '#f8f8f8'
  },
  filterButtonActive: { backgroundColor: '#007AFF' },
  filterText: { color: '#666', fontWeight: '500' },
  filterTextActive: { color: 'white' },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center' 
  }
});