import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import SignupScreen from '../../../app/auth/signup';

const mockSignUp = jest.fn();
const mockCheckUsernameAvailability = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signUp: mockSignUp,
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
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.spyOn(Alert, 'alert');

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<SignupScreen />);

    expect(getByPlaceholderText('Ad Soyad *')).toBeTruthy();
    expect(getByPlaceholderText('Kullanıcı Adı *')).toBeTruthy();
    expect(getByPlaceholderText('E-posta *')).toBeTruthy();
    expect(getByPlaceholderText('Şifre *')).toBeTruthy();
    expect(getByPlaceholderText('Şifre Tekrar *')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy(); // testID ile tekil buton kontrolü
    expect(getByText('Zaten hesabın var mı? Giriş Yap')).toBeTruthy();
  });

  it('allows user to type in all fields', () => {
    const { getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Ad Soyad *'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('E-posta *'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Şifre *'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Şifre Tekrar *'), 'password123');

    expect(getByPlaceholderText('Ad Soyad *').props.value).toBe('Test User');
    expect(getByPlaceholderText('Kullanıcı Adı *').props.value).toBe('testuser');
    expect(getByPlaceholderText('E-posta *').props.value).toBe('test@example.com');
    expect(getByPlaceholderText('Şifre *').props.value).toBe('password123');
    expect(getByPlaceholderText('Şifre Tekrar *').props.value).toBe('password123');
  });

  it('shows error when fields are empty', async () => {
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Lütfen tüm alanları doldurun');
    });
  });

  it('shows error when passwords do not match', async () => {
    const { getByPlaceholderText, getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Ad Soyad *'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('E-posta *'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Şifre *'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Şifre Tekrar *'), 'differentpassword');

    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Şifreler eşleşmiyor');
    });
  });

  it('shows error when password is too short', async () => {
    const { getByPlaceholderText, getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Ad Soyad *'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('E-posta *'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Şifre *'), '12345');
    fireEvent.changeText(getByPlaceholderText('Şifre Tekrar *'), '12345');

    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Şifre en az 6 karakter olmalı');
    });
  });

  it('checks username availability', async () => {
    mockCheckUsernameAvailability.mockResolvedValue(true);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.press(getByText('Kontrol'));

    await waitFor(() => {
      expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('testuser');
    });
  });

  it('shows username is available', async () => {
    mockCheckUsernameAvailability.mockResolvedValue(true);

    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.press(getByText('Kontrol'));

    const availabilityMessage = await findByText('✓ Bu kullanıcı adı müsait');
    expect(availabilityMessage).toBeTruthy();
  });

  it('shows username is taken', async () => {
    mockCheckUsernameAvailability.mockResolvedValue(false);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'takenuser');
    fireEvent.press(getByText('Kontrol'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Uyarı', 'Bu kullanıcı adı zaten alınmış');
    });
  });

  it('successfully signs up with valid data', async () => {
    mockCheckUsernameAvailability.mockResolvedValue(true);
    mockSignUp.mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByText, getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Ad Soyad *'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'testuser');
    fireEvent.press(getByText('Kontrol'));

    await waitFor(() => {
      expect(mockCheckUsernameAvailability).toHaveBeenCalled();
    });

    fireEvent.changeText(getByPlaceholderText('E-posta *'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Şifre *'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Şifre Tekrar *'), 'password123');

    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
        'testuser'
      );
      expect(Alert.alert).toHaveBeenCalledWith('Başarılı', 'Hesap oluşturuldu!');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('navigates to login screen when login link is pressed', () => {
    const { getByText } = render(<SignupScreen />);
    fireEvent.press(getByText('Zaten hesabın var mı? Giriş Yap'));
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('disables signup button when username is not available', async () => {
    mockCheckUsernameAvailability.mockResolvedValue(false);

    const { getByPlaceholderText, getByText, getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Kullanıcı Adı *'), 'takenuser');
    fireEvent.press(getByText('Kontrol'));

    await waitFor(() => {
      expect(mockCheckUsernameAvailability).toHaveBeenCalled();
    });

    fireEvent.changeText(getByPlaceholderText('Ad Soyad *'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('E-posta *'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Şifre *'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Şifre Tekrar *'), 'password123');

    expect(getByTestId('signup-button').props.accessibilityState.disabled).toBe(true);
  });
});
