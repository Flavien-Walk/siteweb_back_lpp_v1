/**
 * Layout racine de l'application
 */

import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contextes/AuthContexte';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { UserProvider } from '../src/contexts/UserContext';
import SplashScreen from '../src/composants/SplashScreen';

// Composant interne qui utilise le theme
function AppContent() {
  const { couleurs, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: couleurs.fond },
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        {/* Auth screens - fade */}
        <Stack.Screen
          name="(auth)"
          options={{
            animation: 'fade',
          }}
        />
        {/* Main app screens */}
        <Stack.Screen
          name="(app)"
          options={{
            animation: 'slide_from_right',
          }}
        />
        {/* Index - no animation */}
        <Stack.Screen
          name="index"
          options={{
            animation: 'none',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <AppContent />
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
