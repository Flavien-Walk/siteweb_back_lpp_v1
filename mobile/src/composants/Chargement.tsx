/**
 * Composant de chargement
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { couleurs, typographie, espacements } from '../constantes/theme';

interface ChargementProps {
  message?: string;
  taille?: 'small' | 'large';
  couleur?: string;
  pleinEcran?: boolean;
}

const Chargement: React.FC<ChargementProps> = ({
  message,
  taille = 'large',
  couleur = couleurs.primaire,
  pleinEcran = false,
}) => {
  if (pleinEcran) {
    return (
      <View style={styles.pleinEcran}>
        <ActivityIndicator size={taille} color={couleur} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={taille} color={couleur} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacements.xl,
  },
  pleinEcran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.fond,
  },
  message: {
    marginTop: espacements.md,
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
});

export default Chargement;
