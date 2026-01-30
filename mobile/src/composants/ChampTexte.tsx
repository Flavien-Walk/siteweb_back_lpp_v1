/**
 * Composant ChampTexte (Input) réutilisable avec animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
  ViewStyle,
  Animated,
} from 'react-native';
import { couleurs, espacements, rayons, typographie } from '../constantes/theme';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';

interface ChampTexteProps {
  label?: string;
  placeholder?: string;
  valeur: string;
  onChangeText: (texte: string) => void;
  erreur?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  iconeGauche?: React.ReactNode;
  iconeDroite?: React.ReactNode;
  onIconeDroitePress?: () => void;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

const ChampTexte: React.FC<ChampTexteProps> = ({
  label,
  placeholder,
  valeur,
  onChangeText,
  erreur,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  iconeGauche,
  iconeDroite,
  onIconeDroitePress,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
}) => {
  const [estFocus, setEstFocus] = useState(false);

  // Animations
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const prevErreur = useRef<string | undefined>(undefined);

  // Animation de focus (couleurs seulement, pas de native driver)
  useEffect(() => {
    Animated.timing(borderColorAnim, {
      toValue: estFocus ? 1 : 0,
      duration: ANIMATION_CONFIG.durations.fast,
      useNativeDriver: false,
    }).start();
  }, [estFocus, borderColorAnim]);

  // Animation d'erreur (shake + fade in)
  // Note: shake utilise useNativeDriver: false car le même View a des animations de couleur
  useEffect(() => {
    if (erreur && erreur !== prevErreur.current) {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();

      // Fade in error message
      Animated.timing(errorOpacity, {
        toValue: 1,
        duration: ANIMATION_CONFIG.durations.normal,
        useNativeDriver: false,
      }).start();
    } else if (!erreur && prevErreur.current) {
      // Fade out error message
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: ANIMATION_CONFIG.durations.fast,
        useNativeDriver: false,
      }).start();
    }

    prevErreur.current = erreur;
  }, [erreur, shakeAnim, errorOpacity]);

  // Interpolation de la couleur de bordure
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [erreur ? couleurs.danger : couleurs.bordure, couleurs.primaire],
  });

  // Interpolation de la couleur de fond
  const backgroundColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [couleurs.fondInput, couleurs.fondCard],
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: erreur ? couleurs.danger : borderColor,
            backgroundColor,
            transform: [{ translateX: shakeAnim }],
          },
          !editable && styles.inputContainerDesactive,
        ]}
      >
        {iconeGauche && <View style={styles.iconeGauche}>{iconeGauche}</View>}

        <TextInput
          style={[
            styles.input,
            multiline ? styles.inputMultiline : undefined,
            iconeGauche ? styles.inputAvecIconeGauche : undefined,
            iconeDroite ? styles.inputAvecIconeDroite : undefined,
          ]}
          value={valeur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={couleurs.textePlaceholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setEstFocus(true)}
          onBlur={() => setEstFocus(false)}
          selectionColor={couleurs.primaire}
        />

        {iconeDroite && (
          <TouchableOpacity
            onPress={onIconeDroitePress}
            style={styles.iconeDroite}
            disabled={!onIconeDroitePress}
          >
            {iconeDroite}
          </TouchableOpacity>
        )}
      </Animated.View>

      {erreur && (
        <Animated.Text
          style={[
            styles.erreur,
            { opacity: errorOpacity },
          ]}
        >
          {erreur}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: espacements.lg,
  },
  label: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rayons.md,
    minHeight: 52,
  },
  inputContainerDesactive: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputAvecIconeGauche: {
    paddingLeft: espacements.sm,
  },
  inputAvecIconeDroite: {
    paddingRight: espacements.sm,
  },
  iconeGauche: {
    paddingLeft: espacements.lg,
  },
  iconeDroite: {
    paddingRight: espacements.lg,
  },
  erreur: {
    fontSize: typographie.tailles.xs,
    color: couleurs.danger,
    marginTop: espacements.xs,
    marginLeft: espacements.xs,
  },
});

export default ChampTexte;
