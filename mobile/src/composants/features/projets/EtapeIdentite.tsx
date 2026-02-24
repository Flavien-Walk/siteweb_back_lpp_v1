/**
 * EtapeIdentite - Etape Identite du wizard projet
 * Partagee entre nouveau-projet (creation) et modifier-projet (edition)
 */

import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { espacements } from '../../../constantes/theme';
import { CATEGORIES } from '../../../constantes/projets';
import { INCUBATEURS_FR } from '../../../constantes/incubateurs';

interface EtapeIdentiteProps {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  estIncube: boolean;
  setEstIncube: (v: boolean) => void;
  incubateurRecherche: string;
  setIncubateurRecherche: (v: string) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  addTag: () => void;
  removeTag: (index: number) => void;
  couleurs: any;
  styles: any;
  /** 'creation' utilise styles.addTeamBtn, 'modification' utilise styles.addLinkBtn */
  mode: 'creation' | 'modification';
}

export default function EtapeIdentite({
  formData,
  setFormData,
  estIncube,
  setEstIncube,
  incubateurRecherche,
  setIncubateurRecherche,
  tagInput,
  setTagInput,
  addTag,
  removeTag,
  couleurs,
  styles,
  mode,
}: EtapeIdentiteProps) {
  const addBtnStyle = mode === 'creation' ? styles.addTeamBtn : styles.addLinkBtn;

  return (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Identite du projet</Text>
      <Text style={styles.etapeDescription}>
        {mode === 'creation'
          ? 'Donnez vie a votre projet avec un nom accrocheur et un pitch percutant.'
          : 'Modifiez les informations de base de votre projet.'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom du projet *</Text>
        <TextInput
          style={styles.input}
          value={formData.nom}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, nom: text }))}
          placeholder="Ex: GreenTech Solutions"
          placeholderTextColor={couleurs.texteSecondaire}
          maxLength={100}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pitch (tagline) *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.pitch}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, pitch: text }))}
          placeholder="Decrivez votre projet en une phrase"
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={200}
        />
        <Text style={styles.charCount}>{formData.pitch?.length || 0}/200</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Categorie *</Text>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              style={[
                styles.categoryChip,
                formData.categorie === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setFormData((prev: any) => ({ ...prev, categorie: cat.value }))}
            >
              <Ionicons
                name={cat.icon as any}
                size={18}
                color={formData.categorie === cat.value ? '#FFFFFF' : couleurs.texte}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  formData.categorie === cat.value && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ville *</Text>
        <TextInput
          style={styles.input}
          value={formData.localisation?.ville}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, localisation: { ville: text } }))}
          placeholder="Ex: Lyon, Paris, Marseille..."
          placeholderTextColor={couleurs.texteSecondaire}
        />
      </View>

      {/* Incubateur */}
      <View style={styles.inputGroup}>
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: espacements.sm }}
          onPress={() => {
            const next = !estIncube;
            setEstIncube(next);
            if (!next) {
              setFormData((prev: any) => ({ ...prev, incubateur: undefined }));
              setIncubateurRecherche('');
            }
          }}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 4,
            borderWidth: 2, borderColor: estIncube ? couleurs.primaire : couleurs.bordure,
            backgroundColor: estIncube ? couleurs.primaire : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {estIncube && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Ton projet est-il incube ?</Text>
        </Pressable>

        {estIncube && (
          <View style={{ marginTop: espacements.sm }}>
            <TextInput
              style={styles.input}
              value={incubateurRecherche}
              onChangeText={setIncubateurRecherche}
              placeholder="Rechercher un incubateur..."
              placeholderTextColor={couleurs.texteSecondaire}
            />
            <View style={styles.categoriesGrid}>
              {INCUBATEURS_FR
                .filter(inc => !incubateurRecherche || inc.nom.toLowerCase().includes(incubateurRecherche.toLowerCase()))
                .map((inc) => (
                  <Pressable
                    key={inc.nom}
                    style={[
                      styles.categoryChip,
                      formData.incubateur === inc.nom && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      setFormData((prev: any) => ({ ...prev, incubateur: prev.incubateur === inc.nom ? undefined : inc.nom }));
                    }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color={formData.incubateur === inc.nom ? '#FFFFFF' : couleurs.texte}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.incubateur === inc.nom && styles.categoryChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {inc.nom}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Secteur d'activite</Text>
        <TextInput
          style={styles.input}
          value={formData.secteur}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, secteur: text }))}
          placeholder="Ex: SaaS B2B, E-commerce..."
          placeholderTextColor={couleurs.texteSecondaire}
          maxLength={50}
        />
      </View>

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tags</Text>
        <Text style={styles.inputHint}>Validez pour ajouter un tag (max 10)</Text>

        {(formData.tags || []).length > 0 && (
          <View style={styles.tagsContainer}>
            {formData.tags!.map((tag: string, i: number) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <Pressable onPress={() => removeTag(i)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={couleurs.texteSecondaire} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: espacements.sm }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Ex: IA, Fintech, GreenTech..."
            placeholderTextColor={couleurs.texteSecondaire}
            maxLength={30}
            onSubmitEditing={addTag}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Pressable
            style={[addBtnStyle, { paddingHorizontal: espacements.md, flex: 0 }]}
            onPress={addTag}
          >
            <Ionicons name="add" size={22} color={couleurs.primaire} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
