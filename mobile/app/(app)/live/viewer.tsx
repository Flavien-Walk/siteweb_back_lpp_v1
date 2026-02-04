/**
 * Live Viewer - Placeholder pour la feature Live
 * TODO: Implémenter le viewer Agora quand la feature sera activée
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, typographie } from '../../../src/constantes/theme';
import { Bouton } from '../../../src/composants';

export default function LiveViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channelName?: string; hostName?: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.content}>
        <Ionicons name="videocam-off" size={64} color={couleurs.texteSecondaire} />
        <Text style={styles.title}>Live non disponible</Text>
        <Text style={styles.subtitle}>
          Cette fonctionnalité sera bientôt disponible.
        </Text>
        <Bouton
          titre="Retour"
          onPress={() => router.back()}
          variante="primaire"
          style={{ marginTop: espacements.xl }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacements.xl,
  },
  title: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginTop: espacements.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
    textAlign: 'center',
  },
});
