import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Dev 1: Onboarding Flow */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/otp" options={{ title: 'Verify OTP' }} />
          <Stack.Screen name="(auth)/register" options={{ title: 'Sign Up' }} />
          <Stack.Screen name="(auth)/zone-select" options={{ title: 'Select Zone' }} />
          <Stack.Screen name="(auth)/slot-select" options={{ title: 'Select Slots' }} />

          {/* Main App (tabs) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Dev 2: Policy Flow */}
          <Stack.Screen name="policy/select" options={{ title: 'Choose Plan' }} />
          <Stack.Screen name="policy/payment" options={{ title: 'Payment' }} />

          {/* Dev 5: Manual Claim */}
          <Stack.Screen name="claim/manual" options={{ title: 'Submit Claim' }} />
          <Stack.Screen name="claim/camera" options={{ title: 'Take Photo' }} />

          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
