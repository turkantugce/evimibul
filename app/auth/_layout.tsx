import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Giriş Yap',
        }} 
      />
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Kayıt Ol',
        }} 
      />
    </Stack>
  );
}