import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('ThemeContext', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('provides default theme (light mode)', () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.colors.background).toBe('#fefefe');
    expect(result.current.colors.text).toBe('#5D4037');
  });

  it('toggles theme from light to dark', async () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDarkMode).toBe(false);

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.colors.background).toBe('#121212');
  });

  it('toggles theme from dark to light', async () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    // Toggle to dark
    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.isDarkMode).toBe(true);

    // Toggle back to light
    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('persists theme preference to AsyncStorage', async () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('loads theme preference from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.isDarkMode).toBe(true);
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('theme');
  });

  it('provides correct light theme colors', () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    const { colors } = result.current;

    expect(colors.background).toBe('#fefefe');
    expect(colors.text).toBe('#5D4037');
    expect(colors.primary).toBe('#795548');
    expect(colors.card).toBe('#ffffff');
    expect(colors.border).toBe('#D7CCC8');
  });

  it('provides correct dark theme colors', async () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.toggleTheme();
    });

    const { colors } = result.current;

    expect(colors.background).toBe('#121212');
    expect(colors.text).toBe('#EFEBE9');
    expect(colors.primary).toBe('#A1887F');
    expect(colors.card).toBe('#1E1E1E');
    expect(colors.border).toBe('#4E342E');
  });

  it('handles AsyncStorage errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.isDarkMode).toBe(false);
    });

    consoleSpy.mockRestore();
  });

  it('provides all required color properties', () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    const { colors } = result.current;

    [
      'background',
      'card',
      'text',
      'secondaryText',
      'border',
      'primary',
      'danger',
      'success',
      'warning',
      'inputBackground',
    ].forEach(prop => {
      expect(colors).toHaveProperty(prop);
    });
  });

  it('maintains theme state across multiple toggles', async () => {
    const wrapper = ({ children }: any) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDarkMode).toBe(false);

    await act(async () => result.current.toggleTheme()); // -> dark
    expect(result.current.isDarkMode).toBe(true);

    await act(async () => result.current.toggleTheme()); // -> light
    expect(result.current.isDarkMode).toBe(false);

    await act(async () => result.current.toggleTheme()); // -> dark
    expect(result.current.isDarkMode).toBe(true);
  });
});
