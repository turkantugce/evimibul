import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    secondaryText: string;
    border: string;
    primary: string;
    danger: string;
    success: string;
    warning: string;
    inputBackground: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  background: '#fefefe',
  card: '#ffffff',
  text: '#5D4037', // Ana kahverengi tonu
  secondaryText: '#8D6E63', // Daha açık kahverengi
  border: '#D7CCC8', // Açık kahverengi border
  primary: '#795548', // Ana kahverengi
  danger: '#D84315',
  success: '#388E3C',
  warning: '#F57C00',
  notification: '#f89560ff',
  inputBackground: '#FAFAFA',
  // Yeni eklenen kahverengi tonları
  brownLight: '#EFEBE9',
  brownMedium: '#D7CCC8',
  brownDark: '#5D4037',
  brownPrimary: '#795548',
};

const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#EFEBE9',
  secondaryText: '#BCAAA4',
  border: '#4E342E',
  primary: '#A1887F',
  danger: '#FF5722',
  success: '#4CAF50',
  warning: '#FF9800',
  notification: '#f9844eff',
  inputBackground: '#2A2A2A',
  // Yeni eklenen kahverengi tonları
  brownLight: '#4E342E',
  brownMedium: '#6D4C41',
  brownDark: '#EFEBE9',
  brownPrimary: '#A1887F',
};


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Tema yükleme hatası:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Tema kaydetme hatası:', error);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}