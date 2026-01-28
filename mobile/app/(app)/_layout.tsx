/**
 * Layout pour les écrans de l'application (utilisateur connecté)
 */

import { Stack } from 'expo-router';
import { couleurs } from '../../src/constantes/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'fade',
      }}
    />
  );
}
