import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import ListingModal from '../../components/ListingModal'
import { useAuthContext } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import { IListing } from '../../types/types'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

// ✅ Genişletilmiş tür listesi
const QUICK_FILTER_SPECIES = [
  { label: 'Tümü', value: '' },
  { label: 'Kediler', value: 'Kedi' },
  { label: 'Köpekler', value: 'Köpek' },
  { label: 'Kuşlar', value: 'Kuş' },
  { label: 'Tavşanlar', value: 'Tavşan' },
  { label: 'Hamsterlar', value: 'Hamster' },
  { label: 'Balıklar', value: 'Balık' },
  { label: 'Axolotl', value: 'Axolotl' },
  { label: 'Kaplumbağalar', value: 'Kaplumbağa' },
  { label: 'Papağanlar', value: 'Papağan' },
];

export default function HomeScreen() {
  const [allListings, setAllListings] = useState<IListing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedListing, setSelectedListing] = useState<IListing | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [vaccinatedFilter, setVaccinatedFilter] = useState<boolean | null>(null)
  const [neuteredFilter, setNeuteredFilter] = useState<boolean | null>(null)
  const [filterModalVisible, setFilterModalVisible] = useState(false)

  const { user } = useAuthContext()
  const { isDarkMode, colors } = useTheme()

  useEffect(() => {
    let subscription: any = null;
    
    const setupListings = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

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

        setAllListings(listingsData);
        setLoading(false);

        subscription = supabase
          .channel('listings_channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'listings',
              filter: 'status=eq.active'
            },
            (payload) => {
              console.log('Yeni ilan eklendi:', payload.new);
              const newListing: IListing = {
                id: payload.new.id,
                title: payload.new.title || '',
                species: payload.new.species || '',
                breed: payload.new.breed || '',
                age: payload.new.age || '',
                gender: payload.new.gender || '',
                city: payload.new.city || '',
                district: payload.new.district || '',
                description: payload.new.description || '',
                photos: payload.new.photos || [],
                vaccinated: payload.new.vaccinated || false,
                neutered: payload.new.neutered || false,
                status: payload.new.status || 'active',
                ownerId: payload.new.owner_id || '',
                createdAt: payload.new.created_at,
                updatedAt: payload.new.updated_at
              };
              setAllListings(prev => [newListing, ...prev]);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'listings'
            },
            (payload) => {
              console.log('İlan güncellendi:', payload.new);
              setAllListings(prev => 
                prev.map(listing => 
                  listing.id === payload.new.id
                    ? {
                        id: payload.new.id,
                        title: payload.new.title || '',
                        species: payload.new.species || '',
                        breed: payload.new.breed || '',
                        age: payload.new.age || '',
                        gender: payload.new.gender || '',
                        city: payload.new.city || '',
                        district: payload.new.district || '',
                        description: payload.new.description || '',
                        photos: payload.new.photos || [],
                        vaccinated: payload.new.vaccinated || false,
                        neutered: payload.new.neutered || false,
                        status: payload.new.status || 'active',
                        ownerId: payload.new.owner_id || '',
                        createdAt: payload.new.created_at,
                        updatedAt: payload.new.updated_at
                      }
                    : listing
                )
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'listings'
            },
            (payload) => {
              console.log('İlan silindi:', payload.old.id);
              setAllListings(prev => prev.filter(listing => listing.id !== payload.old.id));
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Listings fetch error:', error);
        setLoading(false);
      }
    };

    setupListings();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const filteredListings = useMemo(() => {
    let filtered = allListings;

    if (speciesFilter) {
      filtered = filtered.filter(listing => 
        listing.species.toLowerCase() === speciesFilter.toLowerCase()
      )
    }

    if (genderFilter) {
      filtered = filtered.filter(listing => 
        listing.gender.toLowerCase() === genderFilter.toLowerCase()
      )
    }

    if (ageFilter) {
      filtered = filtered.filter(listing => 
        listing.age.toLowerCase() === ageFilter.toLowerCase()
      )
    }

    if (cityFilter) {
      filtered = filtered.filter(listing => 
        listing.city.toLowerCase().includes(cityFilter.toLowerCase())
      )
    }

    if (vaccinatedFilter !== null) {
      filtered = filtered.filter(listing => listing.vaccinated === vaccinatedFilter)
    }

    if (neuteredFilter !== null) {
      filtered = filtered.filter(listing => listing.neutered === neuteredFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.species.toLowerCase().includes(query) ||
        listing.breed.toLowerCase().includes(query) ||
        listing.city.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allListings, speciesFilter, genderFilter, ageFilter, cityFilter, vaccinatedFilter, neuteredFilter, searchQuery])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

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

      setAllListings(listingsData);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false)
    }
  }

  const handleListingPress = (listing: IListing) => {
    setSelectedListing(listing)
    setModalVisible(true)
  }

  const clearAllFilters = () => {
    setSpeciesFilter('')
    setGenderFilter('')
    setAgeFilter('')
    setCityFilter('')
    setVaccinatedFilter(null)
    setNeuteredFilter(null)
  }

  const activeFilterCount = [
    speciesFilter,
    genderFilter,
    ageFilter,
    cityFilter,
    vaccinatedFilter !== null,
    neuteredFilter !== null
  ].filter(Boolean).length

  const renderGridItem = ({ item }: { item: IListing }) => (
    <TouchableOpacity 
      style={[styles.gridCard, { backgroundColor: colors.card }]}
      onPress={() => handleListingPress(item)}
      testID={`listing-card-${item.id}`}
    >
      {item.photos && item.photos.length > 0 ? (
        <Image 
          source={{ uri: item.photos[0] }} 
          style={styles.gridImage}
          testID={`listing-image-${item.id}`}
        />
      ) : (
        <View style={[styles.gridImagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="paw" size={40} color={colors.secondaryText} />
        </View>
      )}
      
      <View style={styles.gridContent}>
        <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        
        <View style={styles.gridInfo}>
          <View style={styles.gridInfoRow}>
            <Ionicons name="paw" size={12} color={colors.secondaryText} />
            <Text style={[styles.gridInfoText, { color: colors.secondaryText }]}>{item.species}</Text>
          </View>
          <View style={styles.gridInfoRow}>
            <Ionicons name="time" size={12} color={colors.secondaryText} />
            <Text style={[styles.gridInfoText, { color: colors.secondaryText }]}>{item.age}</Text>
          </View>
        </View>

        <View style={styles.gridLocation}>
          <Ionicons name="location" size={12} color={colors.primary} />
          <Text style={[styles.gridLocationText, { color: colors.primary }]} numberOfLines={1}>
            {item.city}
          </Text>
        </View>

        <View style={styles.gridBadges}>
          {item.vaccinated && (
            <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={10} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Aşılı</Text>
            </View>
          )}
          {item.neutered && (
            <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={10} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Kısır</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]} testID="loading-indicator">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="home-screen">
      {/* Arama ve Filtre Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="İlanlarda ara..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              testID="search-clear-button"
            >
              <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.inputBackground }]}
          onPress={() => setFilterModalVisible(true)}
          testID="filter-button"
        >
          <Ionicons name="options" size={24} color={colors.primary} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Hızlı Tür Filtresi */}
      <View style={[styles.quickFilters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_FILTER_SPECIES.map((item) => (
            <TouchableOpacity 
              key={item.value}
              style={[
                styles.quickFilterChip, 
                { backgroundColor: colors.inputBackground },
                speciesFilter === item.value && [styles.quickFilterChipActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setSpeciesFilter(item.value)}
              testID={`filter-${item.value || 'all'}`}
            >
              <Text style={[
                styles.quickFilterText, 
                { color: colors.secondaryText },
                speciesFilter === item.value && [styles.quickFilterTextActive, { color: colors.card }]
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* İlan Grid Listesi */}
      <FlatList
        data={filteredListings}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridList}
        columnWrapperStyle={styles.gridRow}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        testID="listings-flatlist"
        ListEmptyComponent={
          <View style={styles.emptyContainer} testID="empty-state">
            <Ionicons name="search-outline" size={64} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              {searchQuery || activeFilterCount > 0
                ? 'Arama kriterlerine uygun ilan bulunamadı' 
                : 'Henüz ilan bulunmuyor'
              }
            </Text>
          </View>
        }
      />

      {/* Gelişmiş Filtre Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
        testID="filter-modal"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filtreler</Text>
            <TouchableOpacity 
              onPress={() => setFilterModalVisible(false)}
              testID="close-filter-modal"
            >
              <Ionicons name="close" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Cinsiyet Filtresi */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Cinsiyet</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    genderFilter === '' && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setGenderFilter('')}
                  testID="gender-filter-all"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    genderFilter === '' && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    genderFilter === 'erkek' && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setGenderFilter('erkek')}
                  testID="gender-filter-male"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    genderFilter === 'erkek' && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Erkek
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    genderFilter === 'dişi' && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setGenderFilter('dişi')}
                  testID="gender-filter-female"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    genderFilter === 'dişi' && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Dişi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Şehir Filtresi */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Şehir</Text>
              <TextInput
                style={[
                  styles.filterInput, 
                  { 
                    backgroundColor: colors.inputBackground, 
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                placeholder="Şehir ara..."
                placeholderTextColor={colors.secondaryText}
                value={cityFilter}
                onChangeText={setCityFilter}
                testID="city-filter-input"
              />
            </View>

            {/* Aşı Durumu */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Aşı Durumu</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    vaccinatedFilter === null && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setVaccinatedFilter(null)}
                  testID="vaccinated-filter-all"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    vaccinatedFilter === null && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    vaccinatedFilter === true && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setVaccinatedFilter(true)}
                  testID="vaccinated-filter-vaccinated"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    vaccinatedFilter === true && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Aşılı
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    vaccinatedFilter === false && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setVaccinatedFilter(false)}
                  testID="vaccinated-filter-not-vaccinated"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    vaccinatedFilter === false && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Aşısız
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Kısırlaştırma Durumu */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Kısırlaştırma</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    neuteredFilter === null && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setNeuteredFilter(null)}
                  testID="neutered-filter-all"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    neuteredFilter === null && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    neuteredFilter === true && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setNeuteredFilter(true)}
                  testID="neutered-filter-neutered"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    neuteredFilter === true && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Kısır
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    neuteredFilter === false && [styles.filterOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setNeuteredFilter(false)}
                  testID="neutered-filter-not-neutered"
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: colors.secondaryText },
                    neuteredFilter === false && [styles.filterOptionTextActive, { color: colors.card }]
                  ]}>
                    Kısır Değil
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.clearButton, { backgroundColor: colors.inputBackground }]}
              onPress={clearAllFilters}
              testID="clear-filters-button"
            >
              <Text style={[styles.clearButtonText, { color: colors.secondaryText }]}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setFilterModalVisible(false)}
              testID="apply-filters-button"
            >
              <Text style={[styles.applyButtonText, { color: colors.card }]}>
                Uygula ({filteredListings.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  container: { 
    flex: 1
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    gap: 12,
  },
  searchContainer: {
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickFilters: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  quickFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickFilterChipActive: {},
  quickFilterText: {
    fontWeight: '500',
    fontSize: 14,
  },
  quickFilterTextActive: {},
  gridList: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImage: {
    width: '100%',
    height: CARD_WIDTH,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  gridInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  gridInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridInfoText: {
    fontSize: 12,
  },
  gridLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  gridLocationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gridBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    marginTop: 60,
  },
  emptyText: { 
    fontSize: 16, 
    textAlign: 'center',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionActive: {},
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {},
  filterInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});;