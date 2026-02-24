/**
 * EtapeBusiness - Etape Business & Traction du wizard projet
 * Partagee entre nouveau-projet (creation) et modifier-projet (edition)
 */

import React from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { espacements } from '../../../constantes/theme';
import { MATURITES } from '../../../constantes/projets';

interface EtapeBusinessProps {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  showMetriqueModal: boolean;
  setShowMetriqueModal: (v: boolean) => void;
  newMetriqueLabel: string;
  setNewMetriqueLabel: (v: string) => void;
  newMetriqueValeur: string;
  setNewMetriqueValeur: (v: string) => void;
  newMetriqueIcone: string;
  setNewMetriqueIcone: (v: string) => void;
  addMetrique: () => void;
  removeMetrique: (index: number) => void;
  couleurs: any;
  styles: any;
  /** 'creation' utilise styles.addTeamBtn/documentRemove, 'modification' utilise styles.addLinkBtn */
  mode: 'creation' | 'modification';
}

export default function EtapeBusiness({
  formData,
  setFormData,
  setShowMetriqueModal,
  removeMetrique,
  couleurs,
  styles,
  mode,
}: EtapeBusinessProps) {
  const addBtnStyle = mode === 'creation' ? styles.addTeamBtn : styles.addLinkBtn;
  const addBtnTextStyle = mode === 'creation' ? styles.addTeamBtnText : styles.addLinkBtnText;
  const removeStyle = mode === 'creation'
    ? styles.documentRemove
    : { padding: espacements.xs };

  return (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Business & Traction</Text>
      <Text style={styles.etapeDescription}>
        Partagez l'avancement de votre projet et vos objectifs.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Maturite du projet</Text>
        <View style={styles.maturiteGrid}>
          {MATURITES.map((mat) => (
            <Pressable
              key={mat.value}
              style={[
                styles.maturiteCard,
                formData.maturite === mat.value && styles.maturiteCardActive,
              ]}
              onPress={() => setFormData((prev: any) => ({ ...prev, maturite: mat.value }))}
            >
              <Text
                style={[
                  styles.maturiteLabel,
                  formData.maturite === mat.value && styles.maturiteLabelActive,
                ]}
              >
                {mat.label}
              </Text>
              <Text style={styles.maturiteDescription}>{mat.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business model</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.businessModel}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, businessModel: text }))}
          placeholder="Comment generez-vous des revenus ?"
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={1000}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Objectif de financement (EUR)</Text>
        <TextInput
          style={styles.input}
          value={formData.objectifFinancement?.toString() || ''}
          onChangeText={(text) => {
            const cleanedText = text.replace(/[^0-9]/g, '');
            if (cleanedText === '') {
              setFormData((prev: any) => ({ ...prev, objectifFinancement: undefined }));
            } else {
              const num = parseInt(cleanedText, 10);
              setFormData((prev: any) => ({ ...prev, objectifFinancement: isNaN(num) ? undefined : num }));
            }
          }}
          placeholder="Ex: 50000"
          placeholderTextColor={couleurs.texteSecondaire}
          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          returnKeyType="done"
          maxLength={10}
        />
      </View>

      {/* Metriques / KPIs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Metriques cles</Text>
        <Text style={styles.inputHint}>Chiffres cles a afficher sur la fiche (CA, utilisateurs, etc.)</Text>

        {(formData.metriques || []).map((metrique: any, index: number) => (
          <View key={index} style={styles.metriqueItem}>
            <View style={styles.metriqueIconBox}>
              <Ionicons
                name={(metrique.icone || 'analytics-outline') as any}
                size={20}
                color={couleurs.primaire}
              />
            </View>
            <View style={styles.metriqueInfo}>
              <Text style={styles.metriqueValeur}>{metrique.valeur}</Text>
              <Text style={styles.metriqueLabel}>{metrique.label}</Text>
            </View>
            <Pressable onPress={() => removeMetrique(index)} style={removeStyle}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        ))}

        <Pressable style={addBtnStyle} onPress={() => setShowMetriqueModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color={couleurs.primaire} />
          <Text style={addBtnTextStyle}>Ajouter une metrique</Text>
        </Pressable>
      </View>
    </View>
  );
}
