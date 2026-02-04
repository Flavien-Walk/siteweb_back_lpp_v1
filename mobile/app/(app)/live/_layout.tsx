/**
 * Layout pour les écrans Live
 */

import { Stack } from 'expo-router';

export default function LiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
