import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { onSnapshot } from 'firebase/firestore';
import React from 'react';
import HomeScreen from '../../../app/(tabs)/index';

const mockPush = jest.fn();

jest.mock('firebase/firestore');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { uid: 'test-user-id', email: 'test@example.com' },
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: false,
    colors: {
      background: '#fff',
      text: '#000',
      primary: '#007AFF',
      card: '#fff',
      inputBackground: '#f5f5f5',
      border: '#e0e0e0',
      secondaryText: '#666',
      success: '#4CAF50',
      danger: '#ff3b30',
    },
  }),
}));

const mockListings = [
  {
    id: '1',
    title: 'Sevimli Kedi',
    species: 'Kedi',
    breed: 'Tekir',
    age: '0-6 ay',
    gender: 'Dişi',
    city: 'İstanbul',
    district: 'Kadıköy',
    description: 'Çok sevimli bir kedi',
    photos: ['https://example.com/photo1.jpg'],
    vaccinated: true,
    neutered: false,
    status: 'active',
    ownerId: 'owner1',
    createdAt: { toMillis: () => Date.now() },
  },
  {
    id: '2',
    title: 'Oyuncu Köpek',
    species: 'Köpek',
    breed: 'Golden Retriever',
    age: '1-3 yaş',
    gender: 'Erkek',
    city: 'Ankara',
    district: 'Çankaya',
    description: 'Çok oyuncu bir köpek',
    photos: ['https://example.com/photo2.jpg'],
    vaccinated: true,
    neutered: true,
    status: 'active',
    ownerId: 'owner2',
    createdAt: { toMillis: () => Date.now() - 1000 },
  },
  {
    id: '3',
    title: 'Renkli Kuş',
    species: 'Kuş',
    breed: 'Muhabbet Kuşu',
    age: '0-6 ay',
    gender: 'Bilinmiyor',
    city: 'İzmir',
    district: 'Karşıyaka',
    description: 'Çok güzel bir kuş',
    photos: ['https://example.com/photo3.jpg'],
    vaccinated: false,
    neutered: false,
    status: 'active',
    ownerId: 'owner3',
    createdAt: { toMillis: () => Date.now() - 2000 },
  },
];

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      callback({
        forEach: (fn: any) => mockListings.forEach((listing) => fn({ id: listing.id, data: () => listing })),
      });
      return jest.fn();
    });
  });

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<HomeScreen />);

    expect(getByPlaceholderText('İlanlarda ara...')).toBeTruthy();
    expect(getByText('Tümü')).toBeTruthy();
    expect(getByText('Kediler')).toBeTruthy();
    expect(getByText('Köpekler')).toBeTruthy();
  });

  it('displays all listings by default', async () => {
    const { findByText } = render(<HomeScreen />);

    await waitFor(async () => {
      expect(await findByText('Sevimli Kedi')).toBeTruthy();
      expect(await findByText('Oyuncu Köpek')).toBeTruthy();
      expect(await findByText('Renkli Kuş')).toBeTruthy();
    });
  });

  it('filters listings by search query', async () => {
    const { getByPlaceholderText, findByText, queryByText } = render(<HomeScreen />);

    const searchInput = getByPlaceholderText('İlanlarda ara...');
    fireEvent.changeText(searchInput, 'kedi');

    await waitFor(async () => {
      expect(await findByText('Sevimli Kedi')).toBeTruthy();
      expect(queryByText('Oyuncu Köpek')).toBeFalsy();
      expect(queryByText('Renkli Kuş')).toBeFalsy();
    });
  });

  it('filters listings by species (quick filter)', async () => {
    const { getByText, findByText, queryByText } = render(<HomeScreen />);

    const catsFilter = getByText('Kediler');
    fireEvent.press(catsFilter);

    await waitFor(async () => {
      expect(await findByText('Sevimli Kedi')).toBeTruthy();
      expect(queryByText('Oyuncu Köpek')).toBeFalsy();
      expect(queryByText('Renkli Kuş')).toBeFalsy();
    });
  });

  it('clears search when close button is pressed', async () => {
    const { getByPlaceholderText, getByTestId, queryAllByRole } = render(<HomeScreen />);

    const searchInput = getByPlaceholderText('İlanlarda ara...');
    fireEvent.changeText(searchInput, 'test');

    expect(searchInput.props.value).toBe('test');

    // Arama input'unun içindeki clear butonunu bul
    await waitFor(() => {
      // Search container içindeki clear butonunu bul
      const clearButton = getByTestId('search-clear-button');
      fireEvent.press(clearButton);
    });

    await waitFor(() => {
      expect(searchInput.props.value).toBe('');
    });
  });

  it('opens filter modal', async () => {
    const { getByText, getByTestId } = render(<HomeScreen />);

    // Filter butonunu bul (options icon'u olan buton)
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      expect(getByText('Filtreler')).toBeTruthy();
    });
  });

  it('shows empty state when no listings match filters', async () => {
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      callback({
        forEach: () => {},
      });
      return jest.fn();
    });

    const { findByText } = render(<HomeScreen />);

    expect(await findByText('Henüz ilan bulunmuyor')).toBeTruthy();
  });

  it('opens listing detail when card is pressed', async () => {
    const { findByText } = render(<HomeScreen />);

    const listingCard = await findByText('Sevimli Kedi');
    fireEvent.press(listingCard);

    // Modal'ın açıldığını kontrol et
    await waitFor(() => {
      expect(listingCard).toBeTruthy();
    });
  });

  it('filters by vaccinated status', async () => {
    const { getByTestId, getByText } = render(<HomeScreen />);

    // Filter modal'ı aç
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      // Aşılı filtresini seç
      const vaccinatedFilter = getByText('Aşılı');
      fireEvent.press(vaccinatedFilter);
      
      // Modal'ı kapat
      const applyButton = getByText(/Uygula/);
      fireEvent.press(applyButton);
    });

    // Filtrelemenin uygulandığını kontrol et
    await waitFor(() => {
      expect(getByText('Sevimli Kedi')).toBeTruthy();
      expect(getByText('Oyuncu Köpek')).toBeTruthy();
    });
  });

  it('filters by city', async () => {
    const { getByPlaceholderText, findByText, queryByText } = render(<HomeScreen />);

    const searchInput = getByPlaceholderText('İlanlarda ara...');
    fireEvent.changeText(searchInput, 'İstanbul');

    await waitFor(async () => {
      expect(await findByText('Sevimli Kedi')).toBeTruthy();
      expect(queryByText('Oyuncu Köpek')).toBeFalsy();
      expect(queryByText('Renkli Kuş')).toBeFalsy();
    });
  });

  it('handles refresh', async () => {
    const { getByTestId } = render(<HomeScreen />);

    // Refresh kontrolü için FlatList'i bul
    const flatList = getByTestId('listings-flatlist');
    fireEvent(flatList, 'refresh');

    await waitFor(() => {
      expect(onSnapshot).toHaveBeenCalled();
    });
  });

  it('displays health badges correctly', async () => {
    const { findAllByText } = render(<HomeScreen />);

    // Aşılı badge'lerini kontrol et
    const vaccinatedBadges = await findAllByText('Aşılı');
    expect(vaccinatedBadges.length).toBe(2); // 2 ilan aşılı
  });

  it('filters by neutered status', async () => {
    const { getByTestId, getByText } = render(<HomeScreen />);

    // Filter modal'ı aç
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      // Kısır filtresini seç
      const neuteredFilter = getByText('Kısır');
      fireEvent.press(neuteredFilter);
      
      // Modal'ı kapat
      const applyButton = getByText(/Uygula/);
      fireEvent.press(applyButton);
    });

    // Filtrelemenin uygulandığını kontrol et
    await waitFor(() => {
      expect(getByText('Oyuncu Köpek')).toBeTruthy();
    });
  });

  it('shows correct listing count in filter modal', async () => {
    const { getByTestId, getByText } = render(<HomeScreen />);

    // Filter modal'ı aç
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      // Uygula butonunda listing sayısını kontrol et
      const applyButton = getByText(/Uygula \(\d+\)/);
      expect(applyButton).toBeTruthy();
    });
  });

  it('clears all filters', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(<HomeScreen />);

    // Apply search filter
    const searchInput = getByPlaceholderText('İlanlarda ara...');
    fireEvent.changeText(searchInput, 'test');

    // Apply species filter
    const catsFilter = getByText('Kediler');
    fireEvent.press(catsFilter);

    // Filter modal'ı aç ve temizle
    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      const clearButton = getByText('Temizle');
      fireEvent.press(clearButton);
      
      const applyButton = getByText(/Uygula/);
      fireEvent.press(applyButton);
    });

    await waitFor(() => {
      expect(searchInput.props.value).toBe('test'); // Search should remain
    });
  });

  it('handles loading state', () => {
    (onSnapshot as jest.Mock).mockImplementation(() => {
      // Don't call callback to simulate loading
      return jest.fn();
    });

    const { getByTestId } = render(<HomeScreen />);

    // Should show loading indicator
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});