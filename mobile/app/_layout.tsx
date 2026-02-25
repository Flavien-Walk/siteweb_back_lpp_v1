/**
 * Layout racine de l'application
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contextes/AuthContexte';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { UserProvider, useUser } from '../src/contexts/UserContext';
import { GamificationProvider } from '../src/contexts/GamificationContext';
import { SocketProvider } from '../src/contexts/SocketContext';
import AccountRestrictedScreen from '../src/composants/AccountRestrictedScreen';
import ErrorBoundary from '../src/composants/ErrorBoundary';
import XpToast from '../src/composants/XpToast';

// Wrapper pour fournir le SocketProvider avec le userId
function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useUser();
  return (
    <SocketProvider userId={utilisateur?.id || null}>
      {children}
    </SocketProvider>
  );
}

// Composant interne qui utilise le theme
function AppContent() {
  const { couleurs, isDark } = useTheme();
  const { accountRestriction, retryRestriction, logoutFromRestriction } = useUser();

  // Si le compte est restreint, afficher l'écran de restriction
  if (accountRestriction) {
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
      <XpToast />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <ThemeProvider>
          {/* UserProvider est la source unique de vérité pour l'utilisateur */}
          {/* AuthProvider est un wrapper pour compatibilité avec l'API legacy */}
          <UserProvider>
            <GamificationProvider>
              <AuthProvider>
                {/* SocketProvider pour le temps reel */}
                <SocketWrapper>
                  <AppContent />
                </SocketWrapper>
              </AuthProvider>
            </GamificationProvider>
          </UserProvider>
        </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
