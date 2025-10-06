import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { IListing } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  listing: IListing | null;
  onClose: () => void;
}

export default function ListingModal({ visible, listing, onClose }: Props) {
  const [activePhoto, setActivePhoto] = useState(0);
  const { user } = useAuthContext();

  if (!listing) return null;

  const isOwner = user?.uid === listing.ownerId;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{listing.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Kapat</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {/* Fotoğraf Carousel */}
          {listing.photos && listing.photos.length > 0 && (
            <View style={styles.carousel}>
              <Image 
                source={{ uri: listing.photos[activePhoto] }} 
                style={styles.mainImage}
                resizeMode="cover"
              />
              {listing.photos.length > 1 && (
                <ScrollView 
                  horizontal 
                  style={styles.thumbnailContainer}
                  showsHorizontalScrollIndicator={false}
                >
                  {listing.photos.map((photo, index) => (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => setActivePhoto(index)}
                    >
                      <Image 
                        source={{ uri: photo }} 
                        style={[
                          styles.thumbnail,
                          activePhoto === index && styles.thumbnailActive
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* İlan Detayları */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tür:</Text>
              <Text style={styles.detailValue}>{listing.species}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cins:</Text>
              <Text style={styles.detailValue}>{listing.breed}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Yaş:</Text>
              <Text style={styles.detailValue}>{listing.age}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cinsiyet:</Text>
              <Text style={styles.detailValue}>{listing.gender}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Konum:</Text>
              <Text style={styles.detailValue}>{listing.city} / {listing.district}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aşılı:</Text>
              <Text style={styles.detailValue}>
                {listing.vaccinated ? 'Evet' : 'Hayır'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kısırlaştırılmış:</Text>
              <Text style={styles.detailValue}>
                {listing.neutered ? 'Evet' : 'Hayır'}
              </Text>
            </View>

            {/* Açıklama */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>Açıklama:</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          </View>
        </ScrollView>

        {/* İletişim Butonu */}
        {!isOwner && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Sahiplenmek İstiyorum</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  closeButton: { padding: 4 },
  closeText: { color: '#007AFF', fontSize: 16 },
  carousel: { marginBottom: 16 },
  mainImage: { width: '100%', height: 300 },
  thumbnailContainer: { 
    flexDirection: 'row', 
    padding: 8,
    backgroundColor: '#f8f8f8'
  },
  thumbnail: { 
    width: 60, 
    height: 60, 
    marginRight: 8, 
    borderRadius: 4 
  },
  thumbnailActive: { borderWidth: 2, borderColor: '#007AFF' },
  details: { padding: 16 },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: { fontWeight: '500', color: '#666' },
  detailValue: { color: '#333' },
  descriptionSection: { marginTop: 16 },
  descriptionLabel: { 
    fontWeight: '500', 
    color: '#666', 
    marginBottom: 8 
  },
  description: { 
    fontSize: 16, 
    lineHeight: 22, 
    color: '#333' 
  },
  footer: { 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0' 
  },
  contactButton: { 
    backgroundColor: '#34C759', 
    padding: 16, 
    borderRadius: 8,
    alignItems: 'center'
  },
  contactButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  }
});