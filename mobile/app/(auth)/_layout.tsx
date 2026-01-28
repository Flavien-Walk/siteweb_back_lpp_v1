/**
 * Layout pour les écrans d'authentification
 */

import { Stack } from 'expo-router';
import { couleurs } from '../../src/constantes/theme';

export default function AuthLayout() {
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
