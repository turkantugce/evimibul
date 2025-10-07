import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { IListing } from '../types/types';

interface Props {
  listing: IListing;
  onPress: (listing: IListing) => void;
}

export default function ListingCard({ listing, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]} 
      onPress={() => onPress(listing)}
    >
      {listing.photos?.[0] ? (
        <Image 
          source={{ uri: listing.photos[0] }} 
          style={styles.image} 
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="paw" size={40} color={colors.secondaryText} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={[styles.meta, { color: colors.secondaryText }]} numberOfLines={1}>
          {listing.species} • {listing.age} • {listing.city}
        </Text>
        
        {/* Sağlık durumu badge'leri */}
        <View style={styles.badges}>
          {listing.vaccinated && (
            <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={10} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Aşılı</Text>
            </View>
          )}
          {listing.neutered && (
            <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={10} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Kısır</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginVertical: 6, 
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  image: { 
    width: 120, 
    height: 120 
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { 
    flex: 1, 
    padding: 12, 
    justifyContent: 'center' 
  },
  title: { 
    fontWeight: '600', 
    fontSize: 16,
    marginBottom: 4,
  },
  meta: { 
    marginTop: 2, 
    fontSize: 14,
    marginBottom: 6,
  },
  badges: {
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
});