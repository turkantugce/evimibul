import { useAuth } from '@/hooks/useAuth';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';

// 🔹 useAuth hook'unu mockluyoruz
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

const mockUseAuth = useAuth as jest.Mock;

describe('AuthContext', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockUserData = {
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    bio: 'Test bio',
    phone: '05551234567',
    location: 'Istanbul',
    photoURL: 'https://example.com/photo.jpg'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      userData: mockUserData,
      loading: false,
      // Fonksiyonların varsayılan başarılı mockları
      signIn: jest.fn().mockResolvedValue({ success: true }),
      signUp: jest.fn().mockResolvedValue({ success: true }),
      logout: jest.fn().mockResolvedValue({ success: true }),
      updateUserProfile: jest.fn().mockResolvedValue({ success: true }),
      checkUsernameAvailability: jest.fn().mockResolvedValue(true),
      updateUsername: jest.fn().mockResolvedValue({ success: true })
    });
  });

  const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;

  // ----------------- SIGN IN TESTLERİ -----------------
  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(signInResult).toEqual({ success: true });
      expect(result.current.signIn).toBeDefined();
    });

    it('should handle sign in error', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        signIn: jest.fn().mockResolvedValue({ success: false, error: 'Invalid credentials' })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(signInResult.success).toBe(false);
      expect(signInResult.error).toBe('Invalid credentials');
    });

    it('should handle Firebase auth errors with proper messages', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        signIn: jest.fn().mockResolvedValue({ success: false, error: 'auth/user-not-found' })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(signInResult.success).toBe(false);
      expect(signInResult.error).toContain('auth/user-not-found');
    });
  });

  // ----------------- SIGN UP TESTLERİ -----------------
  describe('signUp', () => {
    it('should successfully create a new user account', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'test@example.com',
          'password123',
          'Test User',
          'testuser'
        );
      });

      expect(signUpResult.success).toBe(true);
      expect(result.current.signUp).toBeDefined();
    });

    it('should check username availability before signup', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        checkUsernameAvailability: jest.fn().mockResolvedValue(false),
        signUp: jest.fn().mockResolvedValue({
          success: false,
          error: 'Bu kullanıcı adı zaten kullanılıyor.'
        })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'test@example.com',
          'password123',
          'Test User',
          'existinguser'
        );
      });

      expect(signUpResult.success).toBe(false);
      expect(signUpResult.error).toContain('kullanıcı adı');
    });

    it('should handle signup errors', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        signUp: jest.fn().mockResolvedValue({
          success: false,
          error: 'Email already in use'
        })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'test@example.com',
          'password123',
          'Test User',
          'testuser'
        );
      });

      expect(signUpResult.success).toBe(false);
      expect(signUpResult.error).toBe('Email already in use');
    });
  });

  // ----------------- USERNAME CHECK -----------------
  describe('checkUsernameAvailability', () => {
    it('should return true if username is available', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let isAvailable: any;
      await act(async () => {
        isAvailable = await result.current.checkUsernameAvailability('newuser');
      });

      expect(isAvailable).toBe(true);
    });

    it('should return false if username is taken', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        checkUsernameAvailability: jest.fn().mockResolvedValue(false)
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let isAvailable: any;
      await act(async () => {
        isAvailable = await result.current.checkUsernameAvailability('existinguser');
      });

      expect(isAvailable).toBe(false);
    });
  });

  // ----------------- PROFILE UPDATE -----------------
  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateUserProfile({
          name: 'Updated Name',
          bio: 'Updated bio'
        });
      });

      expect(updateResult.success).toBe(true);
    });

    it('should return error if user is not authenticated', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        user: null,
        updateUserProfile: jest.fn().mockResolvedValue({
          success: false,
          error: 'Giriş yapılmamış kullanıcı profili güncellenemez.'
        })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateUserProfile({ name: 'Updated Name' });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Giriş');
    });
  });

  // ----------------- UPDATE USERNAME -----------------
  describe('updateUsername', () => {
    it('should update username if available', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateUsername('newusername');
      });

      expect(updateResult.success).toBe(true);
    });

    it('should not update username if already taken', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        checkUsernameAvailability: jest.fn().mockResolvedValue(false),
        updateUsername: jest.fn().mockResolvedValue({
          success: false,
          error: 'Bu kullanıcı adı zaten alınmış.'
        })
      });

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateUsername('takenusername');
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('kullanıcı adı');
    });
  });
});
