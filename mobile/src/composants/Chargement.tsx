/**
 * Composant de chargement
 */

import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { typographie, espacements } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';

interface ChargementProps {
  message?: string;
  taille?: 'small' | 'large';
  couleur?: string;
  pleinEcran?: boolean;
}

const Chargement: React.FC<ChargementProps> = ({
  message,
  taille = 'large',
  couleur,
  pleinEcran = false,
}) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const resolvedCouleur = couleur ?? couleurs.primaire;

  if (pleinEcran) {
    return (
      <View style={styles.pleinEcran}>
        <ActivityIndicator size={taille} color={resolvedCouleur} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={taille} color={resolvedCouleur} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
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
