import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { getDoc, getDocs } from 'firebase/firestore';
import React from 'react';
import { Alert } from 'react-native';
import ListingModal from '../../components/ListingModal';
import { IListing } from '../../types/types';

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

const mockUserData = {
  name: 'Test User',
  photoURL: 'https://example.com/user-photo.jpg',
};

const mockPush = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: mockUser,
    userData: mockUserData,
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.spyOn(Alert, 'alert');

const createMockTimestamp = () => ({
  seconds: 0,
  nanoseconds: 0,
  toDate: () => new Date(),
  toMillis: () => Date.now(),
  isEqual: () => false,
  toJSON: () => '',
} as any);

const mockListing: IListing = {
  id: 'listing-1',
  title: 'Sevimli Kedi',
  species: 'Kedi',
  breed: 'Tekir',
  age: '0-6 ay',
  gender: 'Dişi',
  city: 'İstanbul',
  district: 'Kadıköy',
  description: 'Çok sevimli ve oyuncu bir kedi',
  photos: [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
  ],
  vaccinated: true,
  neutered: false,
  status: 'active',
  ownerId: 'owner-user-id',
  createdAt: createMockTimestamp(),
  updatedAt: createMockTimestamp(),
};

const mockOwnerData = {
  name: 'John Doe',
  photoURL: 'https://example.com/owner-photo.jpg',
};

describe('ListingModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => mockOwnerData,
      id: 'owner-user-id',
    });
  });

  it('renders correctly when visible', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    expect(await findByText('Sevimli Kedi')).toBeTruthy();
    expect(await findByText('Kedi')).toBeTruthy();
    expect(await findByText('İstanbul')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <ListingModal visible={false} listing={mockListing} onClose={mockOnClose} />
    );

    expect(queryByText('Sevimli Kedi')).toBeFalsy();
  });

  it('displays listing owner information', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(async () => {
      expect(await findByText('İlan Sahibi')).toBeTruthy();
      expect(await findByText('John Doe')).toBeTruthy();
    });
  });

  it('shows all listing details', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    expect(await findByText('Tekir')).toBeTruthy();
    expect(await findByText('0-6 ay')).toBeTruthy();
    expect(await findByText('Dişi')).toBeTruthy();
    expect(await findByText('Kadıköy')).toBeTruthy();
    expect(await findByText('Çok sevimli ve oyuncu bir kedi')).toBeTruthy();
  });

  it('displays vaccination status correctly', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    expect(await findByText('✓ Aşılı')).toBeTruthy();
    expect(await findByText('✗ Kısır Değil')).toBeTruthy();
  });

  it('closes modal on close button press', async () => {
    const { getByTestId } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(() => {
      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('navigates to owner profile on owner info press', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(async () => {
      const ownerName = await findByText('John Doe');
      fireEvent.press(ownerName.parent?.parent || ownerName);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/users/owner-user-id');
    });
  });

  it('shows contact button for non-owner', async () => {
    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    expect(await findByText('Mesaj Gönder')).toBeTruthy();
  });

  it('hides contact button for owner', async () => {
    const ownListing = { ...mockListing, ownerId: 'test-user-id' };
    
    const { queryByText } = render(
      <ListingModal visible={true} listing={ownListing} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(queryByText('Mesaj Gönder')).toBeFalsy();
    });
  });

  it('handles contact button press for authenticated user', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      empty: true,
      docs: [],
      forEach: jest.fn(),
    });

    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    const contactButton = await findByText('Mesaj Gönder');
    
    await act(async () => {
      fireEvent.press(contactButton);
    });

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });
  });

  it('shows alert for non-authenticated user trying to contact', async () => {
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuthContext')
      .mockReturnValue({ user: null, userData: null });

    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    const contactButton = await findByText('Mesaj Gönder');
    fireEvent.press(contactButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Giriş Gerekli',
        'Mesaj göndermek için giriş yapmalısınız',
        expect.any(Array)
      );
    });
  });

  it('displays multiple photos in carousel', async () => {
    const { getByTestId } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(() => {
      const mainImage = getByTestId('main-image');
      expect(mainImage).toBeTruthy();
      expect(mainImage.props.source.uri).toBe('https://example.com/photo1.jpg');
    });
  });

  it('switches between photos on thumbnail press', async () => {
    const { getByTestId } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(() => {
      const thumbnail1 = getByTestId('thumbnail-1');
      fireEvent.press(thumbnail1);
      
      const mainImage = getByTestId('main-image');
      expect(mainImage.props.source.uri).toBe('https://example.com/photo2.jpg');
    });
  });

  it('opens full screen view on main image press', async () => {
    const { getByTestId } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    await waitFor(() => {
      const mainImageTouchable = getByTestId('main-image-touchable');
      fireEvent.press(mainImageTouchable);
      
      // Full screen modal should open - verify by checking for full screen close button
      expect(getByTestId('fullscreen-close-button')).toBeTruthy();
    });
  });

  it('displays placeholder when no photos', () => {
    const listingWithoutPhotos = { ...mockListing, photos: [] };
    
    const { getByText } = render(
      <ListingModal visible={true} listing={listingWithoutPhotos} onClose={mockOnClose} />
    );

    expect(getByText('Fotoğraf Yok')).toBeTruthy();
  });

  it('handles owner data loading error gracefully', async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    // Should still render listing details
    expect(await findByText('Sevimli Kedi')).toBeTruthy();
  });

  it('creates new conversation when contacting owner', async () => {
    const mockSetDoc = jest.fn().mockResolvedValue(undefined);
    const mockDocRef = { id: 'new-conv-id' };
    
    // Mock Firebase functions
    jest.spyOn(require('firebase/firestore'), 'doc').mockReturnValue(mockDocRef as any);
    jest.spyOn(require('firebase/firestore'), 'setDoc').mockImplementation(mockSetDoc);
    
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => mockOwnerData,
        }],
      })
      .mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: jest.fn(),
      });

    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    const contactButton = await findByText('Mesaj Gönder');
    
    await act(async () => {
      fireEvent.press(contactButton);
    });

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/chat/new-conv-id');
    }, { timeout: 3000 });
  });

  it('navigates to existing conversation', async () => {
    const existingConvId = 'existing-conv-id';
    
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => mockOwnerData,
        }],
      })
      .mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: existingConvId,
          data: () => ({
            participants: ['test-user-id', 'owner-user-id']
          })
        }],
        forEach: function(callback: any) {
          this.docs.forEach(callback);
        },
      });

    const { findByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    const contactButton = await findByText('Mesaj Gönder');
    
    await act(async () => {
      fireEvent.press(contactButton);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/chat/${existingConvId}`);
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('displays loading indicator while sending message', async () => {
    let resolveGetDocs: any;
    const getDoctPromise = new Promise(resolve => {
      resolveGetDocs = resolve;
    });

    (getDocs as jest.Mock).mockImplementation(() => getDoctPromise);

    const { findByText, queryByText } = render(
      <ListingModal visible={true} listing={mockListing} onClose={mockOnClose} />
    );

    const contactButton = await findByText('Mesaj Gönder');
    
    await act(async () => {
      fireEvent.press(contactButton);
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should show loading text
    expect(queryByText('Yükleniyor...')).toBeTruthy();

    // Resolve the promise to clean up
    await act(async () => {
      resolveGetDocs({ 
        empty: false,
        docs: [{ data: () => mockOwnerData }],
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  });

  it('returns null when listing is null', () => {
    const { toJSON } = render(
      <ListingModal visible={true} listing={null} onClose={mockOnClose} />
    );

    expect(toJSON()).toBeNull();
  });
});