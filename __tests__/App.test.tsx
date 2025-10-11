import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Expo router'ı mock'la
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}));

// Basit bir test bileşeni
const TestComponent = () => (
  <View testID="test-view">
    <Text>Merhaba Test</Text>
  </View>
);

describe('Basit Test', () => {
  it('jest çalışıyor mu', () => {
    expect(1 + 1).toBe(2);
  });

  it('component render oluyor mu', () => {
    const { getByText } = render(<TestComponent />);
    expect(getByText('Merhaba Test')).toBeTruthy();
  });

  it('testID ile bulma', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-view')).toBeTruthy();
  });
});