/**
 * Layout pour les écrans Live
 * Geste swipe-back natif iOS + SwipeableScreen Android
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function LiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: Platform.OS === 'ios',
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: Platform.OS === 'ios',
      }}
    />
  );
}
