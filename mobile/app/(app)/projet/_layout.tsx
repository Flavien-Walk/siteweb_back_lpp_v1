import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { couleurs } from '../../../src/constantes/theme';

export default function ProjetLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
        // iOS: native gesture, Android: handled by SwipeableScreen
        gestureEnabled: Platform.OS === 'ios',
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: Platform.OS === 'ios',
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
