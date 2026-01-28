/**
 * Composant ChampTexte (Input) réutilisable
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
  ViewStyle,
} from 'react-native';
import { couleurs, espacements, rayons, typographie } from '../constantes/theme';

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

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          estFocus && styles.inputContainerFocus,
          erreur && styles.inputContainerErreur,
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
      </View>

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
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
    backgroundColor: couleurs.fondInput,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    minHeight: 52,
  },
  inputContainerFocus: {
    borderColor: couleurs.primaire,
    backgroundColor: couleurs.fondCard,
  },
  inputContainerErreur: {
    borderColor: couleurs.danger,
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
