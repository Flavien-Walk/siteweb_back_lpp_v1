/**
 * Ecran d'edition de projet - Mode edition avec prefill
 * Permet de modifier un projet existant et gerer les liens externes
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import {
  ProjetFormData,
  CategorieProjet,
  MaturiteProjet,
  LienProjet,
  TypeLien,
  Projet,
  modifierProjet,
  uploadMediaProjet,
  getProjet,
  publierProjet as publierProjetAPI,
} from '../../../src/services/projets';

// Types pour les etapes
type Etape = 'A' | 'C' | 'D' | 'E' | 'L' | 'F';

const ETAPES: { key: Etape; label: string; description: string }[] = [
  { key: 'A', label: 'Identite', description: 'Nom, pitch et categorie' },
  { key: 'C', label: 'Proposition', description: 'Probleme et solution' },
  { key: 'D', label: 'Business', description: 'Maturite et objectifs' },
  { key: 'E', label: 'Medias', description: 'Images et documents' },
  { key: 'L', label: 'Liens', description: 'Liens externes' },
  { key: 'F', label: 'Recap', description: 'Verifier et sauvegarder' },
];

const CATEGORIES: { value: CategorieProjet; label: string; icon: string }[] = [
  { value: 'tech', label: 'Tech', icon: 'code-slash' },
  { value: 'food', label: 'Food', icon: 'restaurant' },
  { value: 'sante', label: 'Sante', icon: 'medkit' },
  { value: 'education', label: 'Education', icon: 'school' },
  { value: 'energie', label: 'Energie', icon: 'flash' },
  { value: 'culture', label: 'Culture', icon: 'color-palette' },
  { value: 'environnement', label: 'Environnement', icon: 'leaf' },
  { value: 'autre', label: 'Autre', icon: 'ellipsis-horizontal' },
];

const MATURITES: { value: MaturiteProjet; label: string; description: string }[] = [
  { value: 'idee', label: 'Idee', description: 'Concept en reflexion' },
  { value: 'prototype', label: 'Prototype', description: 'MVP en developpement' },
  { value: 'lancement', label: 'Lancement', description: 'Premiers clients' },
  { value: 'croissance', label: 'Croissance', description: 'Scaling en cours' },
];

const TYPES_LIENS: { value: TypeLien; label: string; icon: string; placeholder: string }[] = [
  { value: 'site', label: 'Site web', icon: 'globe-outline', placeholder: 'https://monsite.com' },
  { value: 'fundraising', label: 'Levee de fonds', icon: 'cash-outline', placeholder: 'https://wiseed.com/...' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/company/...' },
  { value: 'twitter', label: 'X / Twitter', icon: 'logo-twitter', placeholder: 'https://twitter.com/...' },
  { value: 'instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: 'https://instagram.com/...' },
  { value: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', placeholder: 'https://tiktok.com/@...' },
  { value: 'youtube', label: 'YouTube', icon: 'logo-youtube', placeholder: 'https://youtube.com/...' },
  { value: 'discord', label: 'Discord', icon: 'logo-discord', placeholder: 'https://discord.gg/...' },
  { value: 'doc', label: 'Document', icon: 'document-outline', placeholder: 'https://notion.so/...' },
  { value: 'email', label: 'Email', icon: 'mail-outline', placeholder: 'mailto:contact@monprojet.com' },
  { value: 'other', label: 'Autre', icon: 'link-outline', placeholder: 'https://...' },
];

export default function ModifierProjetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // State
  const [etapeActive, setEtapeActive] = useState<Etape>('A');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projet, setProjet] = useState<Projet | null>(null);

  // Donnees du formulaire
  const [formData, setFormData] = useState<ProjetFormData>({
    nom: '',
    pitch: '',
    description: '',
    categorie: undefined,
    secteur: '',
    tags: [],
    localisation: { ville: '' },
    maturite: 'idee',
    probleme: '',
    solution: '',
    avantageConcurrentiel: '',
    cible: '',
    businessModel: '',
    objectifFinancement: undefined,
    objectif: '',
    metriques: [],
    liens: [],
  });

  // Images
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);
  const [galerieImages, setGalerieImages] = useState<string[]>([]);

  // Modal ajout lien
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkType, setNewLinkType] = useState<TypeLien>('site');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Charger le projet existant
  useEffect(() => {
    if (id) {
      chargerProjet();
    }
  }, [id]);

  const chargerProjet = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getProjet(id);
      if (response.succes && response.data?.projet) {
        const p = response.data.projet;
        setProjet(p);
        // Prefill formData
        setFormData({
          nom: p.nom || '',
          pitch: p.pitch || '',
          description: p.description || '',
          categorie: p.categorie,
          secteur: p.secteur || '',
          tags: p.tags || [],
          localisation: p.localisation || { ville: '' },
          maturite: p.maturite || 'idee',
          probleme: p.probleme || '',
          solution: p.solution || '',
          avantageConcurrentiel: p.avantageConcurrentiel || '',
          cible: p.cible || '',
          businessModel: p.businessModel || '',
          objectifFinancement: p.objectifFinancement,
          objectif: p.objectif || '',
          metriques: p.metriques || [],
          liens: p.liens || [],
        });
        // Image existante
        if (p.image) {
          setCoverImage(p.image);
        }
      } else {
        Alert.alert('Erreur', 'Projet non trouve');
        router.back();
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      Alert.alert('Erreur', 'Impossible de charger le projet');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const etapeIndex = ETAPES.findIndex(e => e.key === etapeActive);
  const canGoBack = etapeIndex > 0;
  const canGoNext = etapeIndex < ETAPES.length - 1;

  const goBack = () => {
    if (canGoBack) {
      setEtapeActive(ETAPES[etapeIndex - 1].key);
    } else {
      router.back();
    }
  };

  const goNext = async () => {
    // Validation etape A
    if (etapeActive === 'A') {
      if (!formData.nom?.trim() || !formData.pitch?.trim() || !formData.categorie || !formData.localisation?.ville) {
        Alert.alert('Champs requis', 'Veuillez remplir le nom, le pitch, la categorie et la ville.');
        return;
      }
    }

    // Sauvegarder les modifications
    await saveDraft();

    if (canGoNext) {
      setEtapeActive(ETAPES[etapeIndex + 1].key);
    }
  };

  // Sauvegarder les modifications
  const saveDraft = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await modifierProjet(id, formData);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  // Selectionner une image de couverture
  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      setCoverImage(`data:${mimeType};base64,${base64}`);
      setCoverChanged(true);
    }
  };

  // Gestion des liens
  const addLink = () => {
    if (!newLinkUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL');
      return;
    }
    // Validation URL basique
    const urlPattern = /^(https?:\/\/|mailto:).+/i;
    if (!urlPattern.test(newLinkUrl.trim())) {
      Alert.alert('URL invalide', 'L\'URL doit commencer par http://, https:// ou mailto:');
      return;
    }

    const newLink: LienProjet = {
      type: newLinkType,
      url: newLinkUrl.trim(),
      label: newLinkLabel.trim() || undefined,
    };

    setFormData({
      ...formData,
      liens: [...(formData.liens || []), newLink],
    });

    // Reset modal
    setNewLinkUrl('');
    setNewLinkLabel('');
    setNewLinkType('site');
    setShowLinkModal(false);
  };

  const removeLink = (index: number) => {
    const liens = [...(formData.liens || [])];
    liens.splice(index, 1);
    setFormData({ ...formData, liens });
  };

  const getLinkIcon = (type: TypeLien): string => {
    return TYPES_LIENS.find(t => t.value === type)?.icon || 'link-outline';
  };

  const getLinkLabel = (lien: LienProjet): string => {
    if (lien.label) return lien.label;
    const typeInfo = TYPES_LIENS.find(t => t.value === lien.type);
    return typeInfo?.label || 'Lien';
  };

  // Sauvegarder et quitter
  const saveAndExit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Upload nouvelle cover si changee
      if (coverChanged && coverImage && coverImage.startsWith('data:')) {
        await uploadMediaProjet(id, [coverImage], 'cover');
      }
      // Sauvegarder les donnees
      await modifierProjet(id, formData);
      Alert.alert('Succes', 'Modifications enregistrees', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  // Publier
  const handlePublish = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Upload cover si nouvelle
      if (coverChanged && coverImage && coverImage.startsWith('data:')) {
        await uploadMediaProjet(id, [coverImage], 'cover');
      }
      // Sauvegarder puis publier
      await modifierProjet(id, formData);
      const response = await publierProjetAPI(id) as any;

      if (response.succes) {
        Alert.alert('Succes', 'Projet publie !', [
          { text: 'OK', onPress: () => router.replace('/(app)/accueil') }
        ]);
      } else {
        if (response.missing && Array.isArray(response.missing)) {
          const details = response.details || {};
          const errorMessages = response.missing.map((field: string) =>
            details[field] || `${field} est requis`
          );
          Alert.alert('Projet incomplet', `Impossible de publier :\n\n${errorMessages.join('\n')}`);
        } else {
          Alert.alert('Erreur', response.message || 'Impossible de publier');
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur est survenue');
      console.error('Erreur publication:', error);
    } finally {
      setSaving(false);
    }
  };

  // Rendu etape A - Identite
  const renderEtapeA = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Identite du projet</Text>
      <Text style={styles.etapeDescription}>
        Modifiez les informations de base de votre projet.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom du projet *</Text>
        <TextInput
          style={styles.input}
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
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
          onChangeText={(text) => setFormData({ ...formData, pitch: text })}
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
              onPress={() => setFormData({ ...formData, categorie: cat.value })}
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
          onChangeText={(text) => setFormData({ ...formData, localisation: { ville: text } })}
          placeholder="Ex: Lyon, Paris, Marseille..."
          placeholderTextColor={couleurs.texteSecondaire}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Secteur d'activite</Text>
        <TextInput
          style={styles.input}
          value={formData.secteur}
          onChangeText={(text) => setFormData({ ...formData, secteur: text })}
          placeholder="Ex: SaaS B2B, E-commerce..."
          placeholderTextColor={couleurs.texteSecondaire}
          maxLength={50}
        />
      </View>
    </View>
  );

  // Rendu etape C - Proposition de valeur
  const renderEtapeC = () => (
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
          onChangeText={(text) => setFormData({ ...formData, probleme: text })}
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
          onChangeText={(text) => setFormData({ ...formData, solution: text })}
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
          onChangeText={(text) => setFormData({ ...formData, avantageConcurrentiel: text })}
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
          onChangeText={(text) => setFormData({ ...formData, cible: text })}
          placeholder="A qui s'adresse votre produit/service ?"
          placeholderTextColor={couleurs.texteSecondaire}
          maxLength={500}
        />
      </View>
    </View>
  );

  // Rendu etape D - Business
  const renderEtapeD = () => (
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
              onPress={() => setFormData({ ...formData, maturite: mat.value })}
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
        <Text style={styles.inputLabel}>Description detaillee</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { minHeight: 120 }]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Decrivez votre projet en detail..."
          placeholderTextColor={couleurs.texteSecondaire}
          multiline
          maxLength={5000}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business model</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={formData.businessModel}
          onChangeText={(text) => setFormData({ ...formData, businessModel: text })}
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
            const num = parseInt(text.replace(/\D/g, ''), 10);
            setFormData({ ...formData, objectifFinancement: isNaN(num) ? undefined : num });
          }}
          placeholder="Ex: 50000"
          placeholderTextColor={couleurs.texteSecondaire}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  // Rendu etape E - Medias
  const renderEtapeE = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Medias</Text>
      <Text style={styles.etapeDescription}>
        Modifiez les visuels de votre projet.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Image de couverture</Text>
        <Pressable style={styles.imagePickerBtn} onPress={pickCoverImage}>
          {coverImage ? (
            <View style={styles.imagePicked}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.imagePickedText}>
                {coverChanged ? 'Nouvelle image selectionnee' : 'Image actuelle'}
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={couleurs.texteSecondaire} />
              <Text style={styles.imagePickerText}>Ajouter une image 16:9</Text>
            </>
          )}
        </Pressable>
        {coverImage && !coverImage.startsWith('data:') && (
          <Image source={{ uri: coverImage }} style={styles.previewImage} />
        )}
      </View>
    </View>
  );

  // Rendu etape L - Liens
  const renderEtapeL = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Liens externes</Text>
      <Text style={styles.etapeDescription}>
        Ajoutez des liens vers votre site, vos reseaux sociaux, votre page de levee de fonds, etc.
      </Text>

      {/* Liste des liens existants */}
      {formData.liens && formData.liens.length > 0 ? (
        <View style={styles.linksList}>
          {formData.liens.map((lien, index) => (
            <View key={index} style={styles.linkItem}>
              <View style={styles.linkIcon}>
                <Ionicons name={getLinkIcon(lien.type) as any} size={20} color={couleurs.primaire} />
              </View>
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>{getLinkLabel(lien)}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{lien.url}</Text>
              </View>
              <Pressable style={styles.linkRemoveBtn} onPress={() => removeLink(index)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noLinksBox}>
          <Ionicons name="link-outline" size={32} color={couleurs.texteSecondaire} />
          <Text style={styles.noLinksText}>Aucun lien ajoute</Text>
          <Text style={styles.noLinksHint}>
            Les liens seront visibles sur la fiche publique de votre projet
          </Text>
        </View>
      )}

      {/* Bouton ajouter */}
      <Pressable style={styles.addLinkBtn} onPress={() => setShowLinkModal(true)}>
        <Ionicons name="add-circle-outline" size={24} color={couleurs.primaire} />
        <Text style={styles.addLinkBtnText}>Ajouter un lien</Text>
      </Pressable>
    </View>
  );

  // Rendu etape F - Recap
  const renderEtapeF = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Recapitulatif</Text>
      <Text style={styles.etapeDescription}>
        Verifiez les informations avant de sauvegarder.
      </Text>

      <View style={styles.recapCard}>
        <Text style={styles.recapTitle}>{formData.nom || 'Sans nom'}</Text>
        <Text style={styles.recapPitch}>{formData.pitch || 'Pas de pitch'}</Text>
        <View style={styles.recapRow}>
          <Ionicons name="location-outline" size={16} color={couleurs.texteSecondaire} />
          <Text style={styles.recapText}>{formData.localisation?.ville || 'Non renseigne'}</Text>
        </View>
        <View style={styles.recapRow}>
          <Ionicons name="folder-outline" size={16} color={couleurs.texteSecondaire} />
          <Text style={styles.recapText}>
            {CATEGORIES.find(c => c.value === formData.categorie)?.label || 'Non renseigne'}
          </Text>
        </View>
        <View style={styles.recapRow}>
          <Ionicons name="trending-up-outline" size={16} color={couleurs.texteSecondaire} />
          <Text style={styles.recapText}>
            {MATURITES.find(m => m.value === formData.maturite)?.label || 'Idee'}
          </Text>
        </View>
        <View style={styles.recapRow}>
          <Ionicons name="link-outline" size={16} color={couleurs.texteSecondaire} />
          <Text style={styles.recapText}>
            {(formData.liens?.length || 0)} lien(s) externe(s)
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={saveAndExit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
          </>
        )}
      </Pressable>

      {projet?.statut === 'draft' && (
        <Pressable
          style={[styles.publishBtn, saving && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={saving}
        >
          <Ionicons name="rocket-outline" size={20} color={couleurs.primaire} />
          <Text style={[styles.publishBtnText, { color: couleurs.primaire }]}>
            Publier mon projet
          </Text>
        </Pressable>
      )}

      <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelBtnText}>Annuler</Text>
      </Pressable>
    </View>
  );

  // Rendu contenu selon etape
  const renderEtapeContent = () => {
    switch (etapeActive) {
      case 'A': return renderEtapeA();
      case 'C': return renderEtapeC();
      case 'D': return renderEtapeD();
      case 'E': return renderEtapeE();
      case 'L': return renderEtapeL();
      case 'F': return renderEtapeF();
      default: return renderEtapeA();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
        <Text style={styles.loadingText}>Chargement du projet...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Modifier le projet</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {ETAPES.map((etape, index) => (
          <View key={etape.key} style={styles.progressItem}>
            <Pressable
              style={[
                styles.progressDot,
                index <= etapeIndex && styles.progressDotActive,
              ]}
              onPress={() => {
                if (index < etapeIndex) setEtapeActive(ETAPES[index].key);
              }}
            >
              <Text
                style={[
                  styles.progressDotText,
                  index <= etapeIndex && styles.progressDotTextActive,
                ]}
              >
                {etape.key}
              </Text>
            </Pressable>
            {index < ETAPES.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < etapeIndex && styles.progressLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderEtapeContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer navigation */}
      {etapeActive !== 'F' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, espacements.md) + espacements.sm }]}>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnSecondary]}
            onPress={goBack}
          >
            <Text style={styles.footerBtnSecondaryText}>
              {canGoBack ? 'Retour' : 'Annuler'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnPrimary, saving && styles.footerBtnDisabled]}
            onPress={goNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.footerBtnPrimaryText}>Suivant</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Modal ajout lien */}
      <Modal
        visible={showLinkModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + espacements.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un lien</Text>
              <Pressable onPress={() => setShowLinkModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>Type de lien</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linkTypesScroll}>
              <View style={styles.linkTypesRow}>
                {TYPES_LIENS.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.linkTypeChip,
                      newLinkType === type.value && styles.linkTypeChipActive,
                    ]}
                    onPress={() => setNewLinkType(type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={16}
                      color={newLinkType === type.value ? '#FFFFFF' : couleurs.texte}
                    />
                    <Text
                      style={[
                        styles.linkTypeChipText,
                        newLinkType === type.value && styles.linkTypeChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>URL *</Text>
              <TextInput
                style={styles.modalInput}
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
                placeholder={TYPES_LIENS.find(t => t.value === newLinkType)?.placeholder}
                placeholderTextColor={couleurs.texteSecondaire}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Label personnalise (optionnel)</Text>
              <TextInput
                style={styles.modalInput}
                value={newLinkLabel}
                onChangeText={setNewLinkLabel}
                placeholder="Ex: Notre page Wiseed"
                placeholderTextColor={couleurs.texteSecondaire}
                maxLength={50}
              />
            </View>

            <Pressable style={styles.modalConfirmBtn} onPress={addLink}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.modalConfirmBtnText}>Ajouter</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: couleurs.texte,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: couleurs.primaire,
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  progressDotTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    width: 16,
    height: 2,
    backgroundColor: couleurs.fondSecondaire,
    marginHorizontal: 2,
  },
  progressLineActive: {
    backgroundColor: couleurs.primaire,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  etapeContent: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
  },
  etapeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  etapeDescription: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.xl,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: espacements.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  input: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 16,
    color: couleurs.texte,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    marginTop: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.full,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: couleurs.primaire,
  },
  categoryChipText: {
    fontSize: 14,
    color: couleurs.texte,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  maturiteGrid: {
    gap: espacements.sm,
  },
  maturiteCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  maturiteCardActive: {
    borderColor: couleurs.primaire,
  },
  maturiteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  maturiteLabelActive: {
    color: couleurs.primaire,
  },
  maturiteDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  imagePickerBtn: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.bordure,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },
  imagePicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imagePickedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: rayons.md,
    marginTop: espacements.md,
  },
  // Liens
  linksList: {
    marginBottom: espacements.lg,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  linkUrl: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  linkRemoveBtn: {
    padding: espacements.xs,
  },
  noLinksBox: {
    alignItems: 'center',
    paddingVertical: espacements.xl,
    marginBottom: espacements.lg,
  },
  noLinksText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },
  noLinksHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.xs,
    textAlign: 'center',
    paddingHorizontal: espacements.lg,
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire + '15',
    borderRadius: rayons.md,
    padding: espacements.md,
    gap: 8,
  },
  addLinkBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  // Recap
  recapCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.xl,
  },
  recapTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  recapPitch: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.md,
    lineHeight: 20,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: espacements.sm,
  },
  recapText: {
    fontSize: 14,
    color: couleurs.texte,
  },
  saveBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
    marginTop: espacements.md,
    backgroundColor: couleurs.primaire + '15',
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: espacements.md,
    marginTop: espacements.sm,
  },
  cancelBtnText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: couleurs.fondSecondaire,
  },
  footerBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  footerBtnPrimary: {
    backgroundColor: couleurs.primaire,
  },
  footerBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerBtnDisabled: {
    opacity: 0.6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: couleurs.fond,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    padding: espacements.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  linkTypesScroll: {
    marginBottom: espacements.lg,
  },
  linkTypesRow: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  linkTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.full,
    gap: 6,
  },
  linkTypeChipActive: {
    backgroundColor: couleurs.primaire,
  },
  linkTypeChipText: {
    fontSize: 13,
    color: couleurs.texte,
  },
  linkTypeChipTextActive: {
    color: '#FFFFFF',
  },
  modalInputGroup: {
    marginBottom: espacements.lg,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  modalInput: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 16,
    color: couleurs.texte,
  },
  modalConfirmBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
