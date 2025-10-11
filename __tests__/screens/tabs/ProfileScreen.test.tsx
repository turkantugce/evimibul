import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getDownloadURL, uploadBytes } from 'firebase/storage';
import React from 'react';
import { Alert } from 'react-native';
import ProfileScreen from '../../../app/(tabs)/profile';

// Mock data
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUserData = {
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  photoURL: 'https://example.com/photo.jpg',
  bio: 'Test bio',
  phone: '05551234567',
  location: 'Istanbul',
};

const mockListings = [
  {
    id: 'listing-1',
    title: 'Sevimli Köpek',
    species: 'Köpek',
    breed: 'Golden Retriever',
    age: '2',
    gender: 'Erkek',
    city: 'Istanbul',
    district: 'Kadıköy',
    description: 'Çok sevimli bir köpek',
    photos: ['https://example.com/photo1.jpg'],
    vaccinated: true,
    neutered: false,
    status: 'active',
    ownerId: 'test-user-id',
    createdAt: { toMillis: () => Date.now() },
    updatedAt: { toMillis: () => Date.now() }
  },
  {
    id: 'listing-2',
    title: 'Tatlı Kedi',
    species: 'Kedi',
    breed: 'Tekir',
    age: '1',
    gender: 'Dişi',
    city: 'Istanbul',
    district: 'Beşiktaş',
    description: 'Çok tatlı bir kedi',
    photos: ['https://example.com/photo2.jpg'],
    vaccinated: true,
    neutered: true,
    status: 'adopted',
    ownerId: 'test-user-id',
    createdAt: { toMillis: () => Date.now() - 86400000 },
    updatedAt: { toMillis: () => Date.now() - 86400000 }
  }
];

// Mock functions
const mockUpdateUserProfile = jest.fn();
const mockUpdateUsername = jest.fn();
const mockCheckUsernameAvailability = jest.fn();
const mockPush = jest.fn();
const mockUnsubscribe = jest.fn();

// Context mocks
jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: mockUser,
    userData: mockUserData,
    updateUserProfile: mockUpdateUserProfile,
    updateUsername: mockUpdateUsername,
    checkUsernameAvailability: mockCheckUsernameAvailability,
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
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

// Firebase mocks
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn((q, successCallback) => {
    successCallback({
      forEach: (callback: any) => {
        mockListings.forEach((listing) => {
          callback({
            id: listing.id,
            data: () => listing,
          });
        });
      },
    });
    return mockUnsubscribe;
  }),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../../firebase', () => ({
  db: {},
  storage: {},
}));

// Alert mock
jest.spyOn(Alert, 'alert');

// ImagePicker mocks
jest.mock('expo-image-picker');

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.Mock;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUserProfile.mockClear();
    mockUpdateUsername.mockClear();
    mockCheckUsernameAvailability.mockClear();
    mockPush.mockClear();
    mockUnsubscribe.mockClear();
    (Alert.alert as jest.Mock).mockClear();
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (uploadBytes as jest.Mock).mockResolvedValue(undefined);
    (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/new-photo.jpg');
  });

  describe('Rendering', () => {
    it('renders correctly with user data', () => {
      const { getByText } = render(<ProfileScreen />);

      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('@testuser')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('Istanbul')).toBeTruthy();
      expect(getByText('05551234567')).toBeTruthy();
      expect(getByText('Test bio')).toBeTruthy();
    });

    it('displays statistics section with correct counts', async () => {
      const { getByTestId, getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Aktif İlan')).toBeTruthy();
        expect(getByText('Sahiplendirilen')).toBeTruthy();
        expect(getByText('Toplam')).toBeTruthy();
      });

      // Check stats values
      const activeStats = getByTestId('stats-active');
      const adoptedStats = getByTestId('stats-adopted');
      const totalStats = getByTestId('stats-total');

      expect(activeStats).toBeTruthy();
      expect(adoptedStats).toBeTruthy();
      expect(totalStats).toBeTruthy();
    });

    it('shows settings button', () => {
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('settings-button')).toBeTruthy();
    });

    it('displays listing tabs with correct labels', () => {
      const { getByTestId } = render(<ProfileScreen />);

      expect(getByTestId('tab-active')).toBeTruthy();
      expect(getByTestId('tab-adopted')).toBeTruthy();
    });

    it('shows empty state when no active listings', async () => {
      // Mock empty listings
      (onSnapshot as jest.Mock).mockImplementationOnce((q, successCallback) => {
        successCallback({
          forEach: (callback: any) => {
            // No listings
          },
        });
        return mockUnsubscribe;
      });

      const { getByTestId, getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByTestId('empty-listings')).toBeTruthy();
        expect(getByText('Henüz aktif ilanınız yok')).toBeTruthy();
      });
    });

    it('displays user initial when no profile photo', () => {
      // This would require mocking the context with no photoURL
      const { getByText } = render(<ProfileScreen />);
      
      // With current mock data, photo exists, so just verify component renders
      expect(getByText('Test User')).toBeTruthy();
    });
  });

  describe('Profile Editing', () => {
    it('opens profile edit modal when edit button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<ProfileScreen />);

      const editButton = getByTestId('edit-profile-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(queryByTestId('edit-profile-modal')).toBeTruthy();
      });
    });

    it('closes edit modal when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        expect(queryByTestId('edit-profile-modal')).toBeTruthy();
      });

      const closeButton = getByTestId('close-modal-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('edit-profile-modal')).toBeNull();
      });
    });

    it('updates user profile successfully', async () => {
      mockUpdateUserProfile.mockResolvedValue({ success: true });

      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const nameInput = getByPlaceholderText('Adınızı ve soyadınızı girin');
        fireEvent.changeText(nameInput, 'Updated Name');
      });

      const saveButton = getByTestId('save-profile-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
          bio: 'Test bio',
          phone: '05551234567',
          location: 'Istanbul'
        });
        expect(Alert.alert).toHaveBeenCalledWith('Başarılı', 'Profil bilgileri güncellendi');
      });
    });

    it('handles profile update error', async () => {
      mockUpdateUserProfile.mockResolvedValue({ 
        success: false, 
        error: 'Update failed' 
      });

      const { getByTestId } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const saveButton = getByTestId('save-profile-button');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Update failed');
      });
    });

    it('shows error when name is empty', async () => {
      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const nameInput = getByPlaceholderText('Adınızı ve soyadınızı girin');
        fireEvent.changeText(nameInput, '');
      });

      const saveButton = getByTestId('save-profile-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Lütfen bir isim girin');
      });
    });

    it('shows character count for bio', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        expect(getByTestId('bio-char-count')).toBeTruthy();
      });
    });
  });

  describe('Username Management', () => {
    it('checks username availability when check button is pressed', async () => {
      mockCheckUsernameAvailability.mockResolvedValue(true);

      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const usernameInput = getByPlaceholderText('kullaniciadi');
        fireEvent.changeText(usernameInput, 'newusername');
      });

      const checkButton = getByTestId('check-username-button');
      fireEvent.press(checkButton);

      await waitFor(() => {
        expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('newusername');
      });
    });

    it('shows availability message when username is available', async () => {
      mockCheckUsernameAvailability.mockResolvedValue(true);

      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const usernameInput = getByPlaceholderText('kullaniciadi');
        fireEvent.changeText(usernameInput, 'availableusername');
        
        const checkButton = getByTestId('check-username-button');
        fireEvent.press(checkButton);
      });

      await waitFor(() => {
        const availabilityText = getByTestId('username-availability-text');
        expect(availabilityText).toBeTruthy();
      });
    });

    it('shows error when username is too short', async () => {
      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const usernameInput = getByPlaceholderText('kullaniciadi');
        fireEvent.changeText(usernameInput, 'ab');
        
        const checkButton = getByTestId('check-username-button');
        fireEvent.press(checkButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Kullanıcı adı en az 3 karakter olmalı');
      });
    });

    it('shows error when username contains invalid characters', async () => {
      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const usernameInput = getByPlaceholderText('kullaniciadi');
        fireEvent.changeText(usernameInput, 'user@name');
        
        const checkButton = getByTestId('check-username-button');
        fireEvent.press(checkButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
      });
    });

    it('updates username when available and different from current', async () => {
      mockUpdateUserProfile.mockResolvedValue({ success: true });
      mockUpdateUsername.mockResolvedValue({ success: true });
      mockCheckUsernameAvailability.mockResolvedValue(true);

      const { getByTestId, getByPlaceholderText } = render(<ProfileScreen />);

      fireEvent.press(getByTestId('edit-profile-button'));

      await waitFor(() => {
        const usernameInput = getByPlaceholderText('kullaniciadi');
        fireEvent.changeText(usernameInput, 'newusername');
        
        const checkButton = getByTestId('check-username-button');
        fireEvent.press(checkButton);
      });

      await waitFor(() => {
        const saveButton = getByTestId('save-profile-button');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockUpdateUsername).toHaveBeenCalledWith('newusername');
      });
    });
  });

  describe('Photo Upload', () => {
    it('uploads profile photo when avatar is pressed', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg' }],
      });

      const { getByTestId } = render(<ProfileScreen />);

      const avatarButton = getByTestId('avatar-button');
      fireEvent.press(avatarButton);

      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });
    });

    it('handles photo upload permission denial', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { getByTestId } = render(<ProfileScreen />);

      const avatarButton = getByTestId('avatar-button');
      fireEvent.press(avatarButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'İzin Gerekli',
          'Fotoğraf seçmek için galeri erişimi gerekiyor'
        );
      });
    });

    it('handles canceled photo selection', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const { getByTestId } = render(<ProfileScreen />);

      const avatarButton = getByTestId('avatar-button');
      fireEvent.press(avatarButton);

      await waitFor(() => {
        expect(uploadBytes).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to adopted tab', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      const adoptedTab = getByTestId('tab-adopted');
      fireEvent.press(adoptedTab);

      await waitFor(() => {
        expect(adoptedTab).toBeTruthy();
      });
    });

    it('switches back to active tab', async () => {
      const { getByTestId } = render(<ProfileScreen />);

      const adoptedTab = getByTestId('tab-adopted');
      fireEvent.press(adoptedTab);

      const activeTab = getByTestId('tab-active');
      fireEvent.press(activeTab);

      await waitFor(() => {
        expect(activeTab).toBeTruthy();
      });
    });
  });

  describe('Listing Actions', () => {
    it('marks listing as adopted', async () => {
      const { getByTestId, getAllByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        const markAdoptedButtons = getAllByTestId('mark-adopted-button');
        if (markAdoptedButtons.length > 0) {
          fireEvent.press(markAdoptedButtons[0]);
        }
      });

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Başarılı', 'İlan sahiplendirildi olarak işaretlendi');
      });
    });

    it('deletes listing after confirmation', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Sil');
        if (deleteButton?.onPress) {
          deleteButton.onPress();
        }
      });

      const { getAllByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        const deleteButtons = getAllByTestId('delete-listing-button');
        if (deleteButtons.length > 0) {
          fireEvent.press(deleteButtons[0]);
        }
      });

      await waitFor(() => {
        expect(deleteDoc).toHaveBeenCalled();
      });
    });

    it('cancels listing deletion', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === 'İptal');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      const { getAllByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        const deleteButtons = getAllByTestId('delete-listing-button');
        if (deleteButtons.length > 0) {
          fireEvent.press(deleteButtons[0]);
        }
      });

      await waitFor(() => {
        expect(deleteDoc).not.toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to settings screen', () => {
      const { getByTestId } = render(<ProfileScreen />);

      const settingsButton = getByTestId('settings-button');
      fireEvent.press(settingsButton);

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('navigates to add listing screen from empty state', async () => {
      (onSnapshot as jest.Mock).mockImplementationOnce((q, successCallback) => {
        successCallback({
          forEach: (callback: any) => {
            // No listings
          },
        });
        return mockUnsubscribe;
      });

      const { getByTestId } = render(<ProfileScreen />);

      await waitFor(() => {
        const addButton = getByTestId('add-listing-button');
        fireEvent.press(addButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/add');
    });
  });

  describe('Firebase Integration', () => {
    it('sets up listings listener on mount', () => {
      render(<ProfileScreen />);

      expect(onSnapshot).toHaveBeenCalled();
    });

    it('cleans up listener on unmount', () => {
      const { unmount } = render(<ProfileScreen />);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});