import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '../../../src/contexts/ThemeContext';

export default function ProjetLayout() {
  const { couleurs } = useTheme();

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
