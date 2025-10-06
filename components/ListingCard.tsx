import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IListing } from '../types';

interface Props {
  listing: IListing;
  onPress: (listing: IListing) => void;
}

export default function ListingCard({ listing, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(listing)}>
      <Image 
        source={{ uri: listing.photos?.[0] || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
        defaultSource={{ uri: 'https://via.placeholder.com/150' }}
      />
      <View style={styles.info}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.meta}>{listing.species} • {listing.age} • {listing.city}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
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
  image: { width: 120, height: 120 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontWeight: '600', fontSize: 16, color: '#333' },
  meta: { color: '#666', marginTop: 4, fontSize: 14 }
});