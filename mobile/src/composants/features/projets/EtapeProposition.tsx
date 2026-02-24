/**
 * EtapeProposition - Etape Proposition de valeur du wizard projet
 * Partagee entre nouveau-projet (creation) et modifier-projet (edition)
 */

import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface EtapePropositionProps {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  couleurs: any;
  styles: any;
}

export default function EtapeProposition({
  formData,
  setFormData,
  couleurs,
  styles,
}: EtapePropositionProps) {
  return (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Proposition de valeur</Text>
      <Text style={styles.etapeDescription}>
        Expliquez le probleme que vous resolvez et comment vous le faites.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Probleme adresse</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.probleme}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, probleme: text }))}
          placeholder="Quel probleme resolvez-vous ?"
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={1000}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Votre solution</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.solution}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, solution: text }))}
          placeholder="Comment resolvez-vous ce probleme ?"
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={1000}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Avantage concurrentiel</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.avantageConcurrentiel}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, avantageConcurrentiel: text }))}
          placeholder="Qu'est-ce qui vous differencie ?"
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={500}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Public cible</Text>
        <TextInput
          style={styles.input}
          value={formData.cible}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, cible: text }))}
          placeholder="A qui s'adresse votre produit/service ?"
          placeholderTextColor={couleurs.texteSecondaire}
          maxLength={500}
        />
      </View>
    </View>
  );
}
