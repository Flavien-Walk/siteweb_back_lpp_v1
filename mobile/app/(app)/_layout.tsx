/**
 * Layout pour les écrans de l'application (utilisateur connecté)
 * Avec transitions personnalisées par écran et gestes de swipe natifs
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { couleurs } from '../../src/constantes/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
        animationDuration: 250,
        // Geste de swipe natif - montre la page précédente
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      {/* Accueil - fade pour entrée initiale, pas de geste back */}
      <Stack.Screen
        name="accueil"
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      {/* Conversation - slide from right, geste géré par SwipeableScreen */}
      <Stack.Screen
        name="conversation"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureEnabled: false,
        }}
      />
      {/* Profil utilisateur - slide from right */}
      <Stack.Screen
        name="utilisateur"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Notifications - slide from right, gesture handled by SwipeableScreen */}
      <Stack.Screen
        name="notifications"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: false,
        }}
      />
      {/* Messages - slide from right */}
      <Stack.Screen
        name="messages"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Profil perso - slide from right, Android: SwipeableScreen, iOS: native */}
      <Stack.Screen
        name="profil"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureEnabled: Platform.OS === 'ios',
          fullScreenGestureEnabled: Platform.OS === 'ios',
        }}
      />
      {/* Choix statut - fade, pas de geste */}
      <Stack.Screen
        name="choix-statut"
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
