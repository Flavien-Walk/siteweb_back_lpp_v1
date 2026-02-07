import { Stack } from 'expo-router';
import { couleurs } from '../../../src/constantes/theme';

export default function UtilisateurLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
