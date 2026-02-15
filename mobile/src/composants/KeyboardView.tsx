/**
 * KeyboardView - Wrapper unifié pour le clavier sur iOS et Android
 *
 * Résout les problèmes courants :
 * - Clavier qui cache la vue
 * - Clavier qui rebondit au retour (Android KAV padding stuck)
 * - Comportement incohérent entre iOS et Android
 *
 * Usage :
 *   <KeyboardView offset={headerHeight}>
 *     <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
 *       ...
 *     </ScrollView>
 *   </KeyboardView>
 */

import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, View, Keyboard, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface KeyboardViewProps {
  children: React.ReactNode;
  /** Offset vertical additionnel (header, safe area, etc.) */
  offset?: number;
  /** Style du container */
  style?: StyleProp<ViewStyle>;
}

export default function KeyboardView({ children, offset = 0, style }: KeyboardViewProps) {
  // Android edge-to-edge + softwareKeyboardLayoutMode="resize" :
  // KAV ne reset pas correctement son padding/height après dismiss du clavier.
  // Solution : gérer manuellement la hauteur clavier via Keyboard events.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Android : padding manuel explicite, reset garanti à 0 au dismiss
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, style, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        {children}
      </View>
    );
  }

  // iOS : KAV avec behavior="padding" (pas d'adjustResize natif)
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior="padding"
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
