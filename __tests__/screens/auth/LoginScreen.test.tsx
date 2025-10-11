import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import LoginScreen from '../../../app/auth/login';

// Mock dependencies
const mockSignIn = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signIn: mockSignIn,
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

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    const { getByTestId, getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByPlaceholderText('E-posta')).toBeTruthy();
    expect(getByPlaceholderText('Şifre')).toBeTruthy();
    expect(getByText("Hesabın yok mu? Kayıt Ol")).toBeTruthy();
  });


  it('allows user to type email and password', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('E-posta');
    const passwordInput = getByPlaceholderText('Şifre');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('hides password input text', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText('Şifre');
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('shows error alert when fields are empty', async () => {
    const { getByTestId } = render(<LoginScreen />);

    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Lütfen tüm alanları doldurun');
    });
  });

  it('successfully logs in with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('E-posta');
    const passwordInput = getByPlaceholderText('Şifre');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(Alert.alert).toHaveBeenCalledWith('Başarılı', 'Giriş yapıldı!');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows error alert on failed login', async () => {
    const errorMessage = 'Invalid credentials';
    mockSignIn.mockResolvedValue({ success: false, error: errorMessage });

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('E-posta');
    const passwordInput = getByPlaceholderText('Şifre');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Hata', errorMessage);
    });
  });

  it('navigates to signup screen when signup link is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    const signupLink = getByText("Hesabın yok mu? Kayıt Ol");
    fireEvent.press(signupLink);

    expect(mockPush).toHaveBeenCalledWith('/auth/signup');
  });

  it('shows ActivityIndicator while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500)));

    const { getByPlaceholderText, getByTestId, queryByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('E-posta');
    const passwordInput = getByPlaceholderText('Şifre');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });

    expect(queryByTestId('activity-indicator')).toBeTruthy();
  });

  it('disables login button during loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('E-posta');
    const passwordInput = getByPlaceholderText('Şifre');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    // Try to press again during loading
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });
});
