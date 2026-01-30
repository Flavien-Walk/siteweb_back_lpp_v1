/**
 * Composant Bouton réutilisable avec animation
 */

import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, espacements, rayons, typographie } from '../constantes/theme';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';

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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Animation de scale au press
  const handlePressIn = useCallback(() => {
    if (estDesactive) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      ...ANIMATION_CONFIG.springFast,
    }).start();
  }, [scaleAnim, estDesactive]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...ANIMATION_CONFIG.spring,
    }).start();
  }, [scaleAnim]);

  // Animation de rotation pour le loader
  React.useEffect(() => {
    if (chargement) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [chargement, spinAnim]);

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
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={estDesactive}
        style={style}
      >
        <Animated.View style={[styles.touchable, { transform: [{ scale: scaleAnim }] }]}>
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
        </Animated.View>
      </Pressable>
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
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={estDesactive}
      style={style}
    >
      <Animated.View
        style={[
          styles.base,
          tailleStyles.container,
          varianteStyles.container,
          estDesactive && styles.desactive,
          { transform: [{ scale: scaleAnim }] },
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
      </Animated.View>
    </Pressable>
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
