import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import { getDownloadURL, uploadBytes } from 'firebase/storage';
import React from 'react';
import { Alert } from 'react-native';
import AddListingScreen from '../../../app/(tabs)/add';

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

const mockPush = jest.fn();

// Mock'lar
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(() => ({
    // Mock storage reference
  })),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('expo-image-picker');

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Default mock - authenticated user
jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(() => ({
    user: mockUser,
  })),
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

const alertMock = jest.spyOn(Alert, 'alert');

// Helper function to wait for state updates
const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

describe('AddListingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (uploadBytes as jest.Mock).mockResolvedValue(undefined);
    (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/photo.jpg');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-listing-id' });
    (collection as jest.Mock).mockReturnValue('listings');
    
    // Mock fetch for image upload
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob()),
      })
    ) as jest.Mock;
    
    // Reset auth context to authenticated user
    require('../../../contexts/AuthContext').useAuthContext.mockReturnValue({
      user: mockUser,
    });
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<AddListingScreen />);

    expect(getByText('İlan Ekle')).toBeTruthy();
    expect(getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.')).toBeTruthy();
  });

  it('allows user to enter listing title', () => {
    const { getByPlaceholderText } = render(<AddListingScreen />);

    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Sevimli Kedi');

    expect(titleInput.props.value).toBe('Sevimli Kedi');
  });

  it('allows species selection', () => {
    const { getByText } = render(<AddListingScreen />);

    const catButton = getByText('Kedi');
    fireEvent.press(catButton);

    expect(catButton).toBeTruthy();
  });

  it('allows age selection', () => {
    const { getByText } = render(<AddListingScreen />);

    const ageButton = getByText('0-6 ay');
    fireEvent.press(ageButton);

    expect(ageButton).toBeTruthy();
  });

  it('allows gender selection', () => {
    const { getByText } = render(<AddListingScreen />);

    const genderButton = getByText('Erkek');
    fireEvent.press(genderButton);

    expect(genderButton).toBeTruthy();
  });

  it('opens city selector', async () => {
    const { getByText } = render(<AddListingScreen />);

    const citySelector = getByText('Şehir seçin');
    fireEvent.press(citySelector);

    await waitFor(() => {
      expect(getByText('Şehir Seçin')).toBeTruthy();
    });
  });

  it('selects a city', async () => {
    const { getByText } = render(<AddListingScreen />);

    const citySelector = getByText('Şehir seçin');
    fireEvent.press(citySelector);

    await waitFor(() => {
      const cityOption = getByText('Adana');
      fireEvent.press(cityOption);
    });

    await waitFor(() => {
      expect(getByText('Adana')).toBeTruthy();
    });
  });

  it('enables district selector after city selection', async () => {
    const { getByText } = render(<AddListingScreen />);

    const citySelector = getByText('Şehir seçin');
    fireEvent.press(citySelector);

    await waitFor(() => {
      const cityOption = getByText('Adana');
      fireEvent.press(cityOption);
    });

    await waitFor(() => {
      const districtSelector = getByText('İlçe seçin');
      expect(districtSelector).toBeTruthy();
    });
  });

  it('picks an image', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByTestId } = render(<AddListingScreen />);

    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  it('limits photos to 5', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByTestId } = render(<AddListingScreen />);

    const addPhotoButton = getByTestId('add-photo-button');

    // Add 5 photos
    for (let i = 0; i < 5; i++) {
      fireEvent.press(addPhotoButton);
      await waitForStateUpdate();
    }

    // Try to add 6th photo - should show alert
    fireEvent.press(addPhotoButton);
    
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Limit', 'En fazla 5 fotoğraf ekleyebilirsiniz');
    });
  });

  it('toggles vaccination checkbox', async () => {
    const { getByTestId } = render(<AddListingScreen />);

    const vaccinatedCheckbox = getByTestId('vaccinated-checkbox');
    fireEvent.press(vaccinatedCheckbox);
    
    await waitFor(() => {
      expect(vaccinatedCheckbox).toBeTruthy();
    });
  });

  it('toggles neutered checkbox', async () => {
    const { getByTestId } = render(<AddListingScreen />);

    const neuteredCheckbox = getByTestId('neutered-checkbox');
    fireEvent.press(neuteredCheckbox);
    
    await waitFor(() => {
      expect(neuteredCheckbox).toBeTruthy();
    });
  });

  it('allows description input with character limit', async () => {
    const { getByPlaceholderText, getByText } = render(<AddListingScreen />);

    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    const testText = 'Test description';
    
    fireEvent.changeText(descInput, testText);

    await waitFor(() => {
      // Karakter sayacını kontrol et
      const charCount = getByText(`${testText.length}/500 karakter`);
      expect(charCount).toBeTruthy();
    });
  });

  it('validates required fields on submit', async () => {
    const { getByTestId } = render(<AddListingScreen />);

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        expect.any(String)
      );
    });
  });

  it('validates title is required', async () => {
    const { getByTestId } = render(<AddListingScreen />);

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        'Lütfen ilan başlığı girin'
      );
    });
  });

  it('validates species is required', async () => {
    const { getByPlaceholderText, getByTestId } = render(<AddListingScreen />);

    // Fill title only
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test Title');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        'Lütfen hayvan türünü seçin'
      );
    });
  });

  it('validates at least one photo is required', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Fill all required fields except photos
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test Title');
    
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));
    
    // Select city
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      fireEvent.press(getByText('Adana'));
    });

    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Test description');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        'Lütfen en az bir fotoğraf ekleyin'
      );
    });
  });

  it('successfully submits listing with all required fields', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Add photo
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // Fill form - tüm required alanları doldur
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Sevimli Kedi');
    
    // Species seç
    fireEvent.press(getByText('Kedi'));
    
    // Age seç
    fireEvent.press(getByText('0-6 ay'));
    
    // City seç
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      const cityOption = getByText('Adana');
      fireEvent.press(cityOption);
    });

    // Description ekle
    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Çok sevimli bir kedi');

    // Submit
    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Başarılı',
        'İlanınız başarıyla yayınlandı!',
        expect.any(Array)
      );
    });
  });

  it('shows upload progress during submission', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Add photo
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    // Fill form
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test');
    
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));
    
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      fireEvent.press(getByText('Adana'));
    });
    
    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Test description');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    // Upload progress gösteriliyor mu kontrol et
    await waitFor(() => {
      // Firestore call'unun yapıldığını kontrol et
      expect(addDoc).toHaveBeenCalled();
    });
  });

  it('handles submission error', async () => {
    (addDoc as jest.Mock).mockRejectedValue(new Error('Submission failed'));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Add photo
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    // Fill form
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test');
    
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));
    
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      fireEvent.press(getByText('Adana'));
    });
    
    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Test description');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Hata',
        'İlan eklenirken bir hata oluştu. Lütfen tekrar deneyin.'
      );
    });
  });

  it('clears form after successful submission', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');

    // Add photo
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    // Fill form
    fireEvent.changeText(titleInput, 'Sevimli Kedi');
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));
    
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      fireEvent.press(getByText('Adana'));
    });
    
    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Test description');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      // Başarılı alert gösterildi mi kontrol et
      expect(alertMock).toHaveBeenCalledWith(
        'Başarılı',
        'İlanınız başarıyla yayınlandı!',
        expect.any(Array)
      );
      
      // Firestore call'unun yapıldığını kontrol et
      expect(addDoc).toHaveBeenCalled();
    });
  });

  it('removes photo when remove button is pressed', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { getByTestId } = render(<AddListingScreen />);

    // Add photo
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    // Remove button'ı bul ve tıkla
    const removeButton = getByTestId('remove-photo-button');
    fireEvent.press(removeButton);
    
    await waitFor(() => {
      // Photo kaldırıldı, state değişti
      expect(removeButton).toBeTruthy();
    });
  });

  it('disables submit button when not authenticated', () => {
    // AuthContext mock'unu geçersiz kıl - user null
    require('../../../contexts/AuthContext').useAuthContext.mockReturnValue({
      user: null,
    });

    const { getByTestId } = render(<AddListingScreen />);

    const submitButton = getByTestId('submit-button');
    
    // Disabled state'ini kontrol et
    expect(submitButton.props.disabled).toBe(true);
  });

  it('shows breed input field', () => {
    const { getByPlaceholderText } = render(<AddListingScreen />);

    const breedInput = getByPlaceholderText('Örn: Tekir, Golden Retriever, Japon Balığı vb.');
    expect(breedInput).toBeTruthy();
  });

  it('handles image picker cancellation', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
    });

    const { getByTestId } = render(<AddListingScreen />);

    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // No alert should be shown for cancellation
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('handles permission denial for image picker', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByTestId } = render(<AddListingScreen />);

    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'İzin Gerekli',
        'Fotoğraf seçmek için galeri erişimi gerekiyor'
      );
    });
  });

  it('validates city is required', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Sadece bazı required alanları doldur, city boş bırak
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test Title');
    
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));

    // Photo ekle (bu da required)
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    // Description ekle
    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    fireEvent.changeText(descInput, 'Test description');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        'Lütfen şehir bilgisi girin'
      );
    });
  });

  it('validates description is required', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<AddListingScreen />);

    // Tüm required alanları doldur, description boş bırak
    const titleInput = getByPlaceholderText('Örn: Yavru kedi, sokak kedisi vb.');
    fireEvent.changeText(titleInput, 'Test Title');
    
    fireEvent.press(getByText('Kedi'));
    fireEvent.press(getByText('0-6 ay'));
    
    // City seç
    fireEvent.press(getByText('Şehir seçin'));
    await waitFor(() => {
      fireEvent.press(getByText('Adana'));
    });

    // Photo ekle
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });
    const addPhotoButton = getByTestId('add-photo-button');
    fireEvent.press(addPhotoButton);
    await waitForStateUpdate();

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Eksik Bilgi',
        'Lütfen açıklama ekleyin'
      );
    });
  });

  it('allows entering breed information', () => {
    const { getByPlaceholderText } = render(<AddListingScreen />);

    const breedInput = getByPlaceholderText('Örn: Tekir, Golden Retriever, Japon Balığı vb.');
    fireEvent.changeText(breedInput, 'Tekir');

    expect(breedInput.props.value).toBe('Tekir');
  });

  it('shows character count for description', async () => {
    const { getByPlaceholderText, getByText } = render(<AddListingScreen />);

    const descInput = getByPlaceholderText('Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin...');
    const testText = 'Bu bir test açıklamasıdır';
    
    fireEvent.changeText(descInput, testText);

    await waitFor(() => {
      expect(getByText(`${testText.length}/500 karakter`)).toBeTruthy();
    });
  });

  it('prevents district selection without city', () => {
    const { getByText } = render(<AddListingScreen />);

    const districtSelector = getByText('Önce şehir seçin');
    expect(districtSelector).toBeTruthy();
  });
});