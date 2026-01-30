/**
 * Layout pour les écrans de l'application (utilisateur connecté)
 * Avec transitions personnalisées par écran
 */

import { Stack } from 'expo-router';
import { couleurs } from '../../src/constantes/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      {/* Accueil - fade pour entrée initiale */}
      <Stack.Screen
        name="accueil"
        options={{
          animation: 'fade',
        }}
      />
      {/* Conversation - slide from bottom (style Instagram DM) */}
      <Stack.Screen
        name="conversation/[id]"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 300,
        }}
      />
      {/* Profil utilisateur - slide from right */}
      <Stack.Screen
        name="utilisateur/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Notifications - slide from right */}
      <Stack.Screen
        name="notifications"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Messages - slide from right */}
      <Stack.Screen
        name="messages"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Profil perso - slide from right */}
      <Stack.Screen
        name="profil"
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Choix statut - fade */}
      <Stack.Screen
        name="choix-statut"
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
