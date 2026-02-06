/**
 * Layout pour les ecrans Entrepreneur
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../../src/contexts/ThemeContext';

export default function EntrepreneurLayout() {
  const { couleurs } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="nouveau-projet" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
