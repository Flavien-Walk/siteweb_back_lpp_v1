/**
 * Composant Bouton réutilisable
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, espacements, rayons, typographie } from '../constantes/theme';

interface BoutonProps {
  titre: string;
  onPress: () => void;
  variante?: 'primaire' | 'secondaire' | 'outline' | 'ghost';
  taille?: 'sm' | 'md' | 'lg';
  chargement?: boolean;
  desactive?: boolean;
  icone?: React.ReactNode;
  style?: ViewStyle;
}

const Bouton: React.FC<BoutonProps> = ({
  titre,
  onPress,
  variante = 'primaire',
  taille = 'md',
  chargement = false,
  desactive = false,
  icone,
  style,
}) => {
  const estDesactive = desactive || chargement;

  const getTailleStyles = (): { container: ViewStyle; texte: TextStyle } => {
    switch (taille) {
      case 'sm':
        return {
          container: { paddingVertical: espacements.sm, paddingHorizontal: espacements.md },
          texte: { fontSize: typographie.tailles.sm },
        };
      case 'lg':
        return {
          container: { paddingVertical: espacements.lg, paddingHorizontal: espacements.xl },
          texte: { fontSize: typographie.tailles.lg },
        };
      default:
        return {
          container: { paddingVertical: espacements.md + 2, paddingHorizontal: espacements.xl },
          texte: { fontSize: typographie.tailles.base },
        };
    }
  };

  const tailleStyles = getTailleStyles();

  // Bouton primaire avec gradient
  if (variante === 'primaire') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={estDesactive}
        activeOpacity={0.8}
        style={[styles.touchable, style]}
      >
        <LinearGradient
          colors={estDesactive ? [couleurs.texteMuted, couleurs.texteMuted] : [...couleurs.gradientPrimaire]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, tailleStyles.container]}
        >
          {chargement ? (
            <ActivityIndicator color={couleurs.blanc} size="small" />
          ) : (
            <>
              {icone}
              <Text style={[styles.textePrimaire, tailleStyles.texte]}>{titre}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Autres variantes
  const getVarianteStyles = (): { container: ViewStyle; texte: TextStyle } => {
    switch (variante) {
      case 'secondaire':
        return {
          container: {
            backgroundColor: couleurs.primaireLight,
          },
          texte: { color: couleurs.primaire },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: couleurs.bordure,
          },
          texte: { color: couleurs.texte },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          texte: { color: couleurs.primaire },
        };
      default:
        return {
          container: {},
          texte: {},
        };
    }
  };

  const varianteStyles = getVarianteStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={estDesactive}
      activeOpacity={0.7}
      style={[
        styles.base,
        tailleStyles.container,
        varianteStyles.container,
        estDesactive && styles.desactive,
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={varianteStyles.texte.color || couleurs.texte} size="small" />
      ) : (
        <>
          {icone}
          <Text style={[styles.texteBase, tailleStyles.texte, varianteStyles.texte]}>
            {titre}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    borderRadius: rayons.lg,
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    borderRadius: rayons.lg,
  },
  textePrimaire: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
  },
  texteBase: {
    fontWeight: typographie.poids.semibold,
  },
  desactive: {
    opacity: 0.5,
  },
});

export default Bouton;
