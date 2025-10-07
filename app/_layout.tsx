// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen 
            name="chat/[conversationId]" 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="users/search" 
            options={{ headerShown: false }}
          />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}