/**
 * Layout pour les écrans d'authentification
 * Reset le theme en light a chaque montage (filet de securite)
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AuthLayout() {
  const { couleurs, resetTheme } = useTheme();

  // Filet de securite : toujours light dans le flow auth
  // Couvre les cas ou un logout n'aurait pas appele resetTheme()
  useEffect(() => {
    resetTheme();
  }, []);

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
