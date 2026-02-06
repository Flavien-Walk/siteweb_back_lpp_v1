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
import { UserProvider, useUser } from '../src/contexts/UserContext';
import { SocketProvider } from '../src/contexts/SocketContext';
import SplashScreen from '../src/composants/SplashScreen';
import AccountRestrictedScreen from '../src/composants/AccountRestrictedScreen';

// Wrapper pour fournir le SocketProvider avec le userId
function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useUser();
  return (
    <SocketProvider userId={utilisateur?._id || null}>
      {children}
    </SocketProvider>
  );
}

// Composant interne qui utilise le theme
function AppContent() {
  const { couleurs, isDark } = useTheme();
  const { accountRestriction, retryRestriction, logoutFromRestriction } = useUser();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Si le compte est restreint et que le splash est terminé, afficher l'écran de restriction
  if (accountRestriction && !showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <AccountRestrictedScreen
          restriction={accountRestriction}
          onRetry={retryRestriction}
          onLogout={logoutFromRestriction}
        />
      </>
    );
  }

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
          {/* UserProvider est la source unique de vérité pour l'utilisateur */}
          {/* AuthProvider est un wrapper pour compatibilité avec l'API legacy */}
          <UserProvider>
            <AuthProvider>
              {/* SocketProvider pour le temps reel */}
              <SocketWrapper>
                <AppContent />
              </SocketWrapper>
            </AuthProvider>
          </UserProvider>
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
