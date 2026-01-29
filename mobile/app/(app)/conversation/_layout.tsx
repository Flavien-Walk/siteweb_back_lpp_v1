/**
 * Layout pour les ecrans de conversation
 */

import { Stack } from 'expo-router';
import { couleurs } from '../../../src/constantes/theme';

export default function ConversationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'slide_from_right',
      }}
    />
  );
}
