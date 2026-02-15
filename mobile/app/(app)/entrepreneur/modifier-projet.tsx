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
  Metrique,
  DocumentProjet,
  VisibiliteDocument,
  modifierProjet,
  uploadMediaProjet,
  uploadDocumentProjet,
  getProjet,
  publierProjet as publierProjetAPI,
} from '../../../src/services/projets';
import * as DocumentPicker from 'expo-document-picker';
import KeyboardView from '../../../src/composants/KeyboardView';

// Types pour les etapes (numeriques)
type Etape = '1' | '2' | '3' | '4' | '5' | '6';

const ETAPES: { key: Etape; label: string; description: string }[] = [
  { key: '1', label: 'Identite', description: 'Nom, pitch et categorie' },
  { key: '2', label: 'Proposition', description: 'Probleme et solution' },
  { key: '3', label: 'Business', description: 'Maturite et objectifs' },
  { key: '4', label: 'Medias', description: 'Images et documents' },
  { key: '5', label: 'Liens', description: 'Liens externes' },
  { key: '6', label: 'Recap', description: 'Verifier et sauvegarder' },
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

const METRIQUE_ICONES: { value: string; icon: string }[] = [
  { value: 'analytics-outline', icon: 'analytics-outline' },
  { value: 'people-outline', icon: 'people-outline' },
  { value: 'cash-outline', icon: 'cash-outline' },
  { value: 'trending-up-outline', icon: 'trending-up-outline' },
  { value: 'star-outline', icon: 'star-outline' },
  { value: 'cart-outline', icon: 'cart-outline' },
  { value: 'globe-outline', icon: 'globe-outline' },
  { value: 'time-outline', icon: 'time-outline' },
];

export default function ModifierProjetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // State
  const [etapeActive, setEtapeActive] = useState<Etape>('1');
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

  // Modal ajout lien
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkType, setNewLinkType] = useState<TypeLien>('site');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Tags
  const [tagInput, setTagInput] = useState('');

  // Metriques
  const [showMetriqueModal, setShowMetriqueModal] = useState(false);
  const [newMetriqueLabel, setNewMetriqueLabel] = useState('');
  const [newMetriqueValeur, setNewMetriqueValeur] = useState('');
  const [newMetriqueIcone, setNewMetriqueIcone] = useState('analytics-outline');

  // Galerie
  const [galerieImages, setGalerieImages] = useState<string[]>([]);
  const [galerieChanged, setGalerieChanged] = useState(false);

  // Documents
  const [newDocuments, setNewDocuments] = useState<{ nom: string; base64: string; type: DocumentProjet['type']; visibilite: VisibiliteDocument }[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<DocumentProjet[]>([]);

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
        // Galerie existante
        if (p.galerie && p.galerie.length > 0) {
          setGalerieImages(p.galerie.map((g: any) => g.url));
        }
        // Documents existants
        if (p.documents && p.documents.length > 0) {
          setExistingDocuments(p.documents);
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
    // Validation etape 1
    if (etapeActive === '1') {
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
      console.log('[saveDraft] tags:', formData.tags?.length, 'metriques:', formData.metriques?.length, 'liens:', formData.liens?.length);
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

  // Gestion des tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if ((formData.tags || []).includes(trimmed)) { setTagInput(''); return; }
    if ((formData.tags || []).length >= 10) {
      Alert.alert('Maximum', 'Vous pouvez ajouter 10 tags maximum');
      return;
    }
    setFormData({ ...formData, tags: [...(formData.tags || []), trimmed] });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const tags = [...(formData.tags || [])];
    tags.splice(index, 1);
    setFormData({ ...formData, tags });
  };

  // Gestion des metriques
  const addMetrique = () => {
    if (!newMetriqueLabel.trim() || !newMetriqueValeur.trim()) {
      Alert.alert('Champs requis', 'Le label et la valeur sont requis');
      return;
    }
    const metrique: Metrique = {
      label: newMetriqueLabel.trim(),
      valeur: newMetriqueValeur.trim(),
      icone: newMetriqueIcone || undefined,
    };
    setFormData({ ...formData, metriques: [...(formData.metriques || []), metrique] });
    setNewMetriqueLabel('');
    setNewMetriqueValeur('');
    setNewMetriqueIcone('analytics-outline');
    setShowMetriqueModal(false);
  };

  const removeMetrique = (index: number) => {
    const metriques = [...(formData.metriques || [])];
    metriques.splice(index, 1);
    setFormData({ ...formData, metriques });
  };

  // Galerie
  const pickGalerieImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImages: string[] = [];
      for (const asset of result.assets) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mimeType = asset.mimeType || 'image/jpeg';
        newImages.push(`data:${mimeType};base64,${base64}`);
      }
      setGalerieImages([...galerieImages, ...newImages]);
      setGalerieChanged(true);
    }
  };

  // Documents
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        let docType: DocumentProjet['type'] = 'other';
        if (asset.mimeType?.includes('pdf')) docType = 'pdf';
        else if (asset.mimeType?.includes('presentation')) docType = 'pptx';
        else if (asset.mimeType?.includes('spreadsheet')) docType = 'xlsx';
        else if (asset.mimeType?.includes('wordprocessing')) docType = 'docx';

        setNewDocuments([...newDocuments, {
          nom: asset.name || 'Document',
          base64: `data:${asset.mimeType};base64,${base64}`,
          type: docType,
          visibilite: 'public' as VisibiliteDocument,
        }]);
      }
    } catch (error) {
      console.error('Erreur selection document:', error);
      Alert.alert('Erreur', 'Impossible de selectionner le document');
    }
  };

  const removeNewDocument = (index: number) => {
    setNewDocuments(newDocuments.filter((_, i) => i !== index));
  };

  const toggleNewDocVisibility = (index: number) => {
    setNewDocuments(newDocuments.map((doc, i) =>
      i === index
        ? { ...doc, visibilite: (doc.visibilite === 'public' ? 'private' : 'public') as VisibiliteDocument }
        : doc
    ));
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
      // Upload nouvelles images galerie
      if (galerieChanged) {
        const newGalerieImages = galerieImages.filter(img => img.startsWith('data:'));
        if (newGalerieImages.length > 0) {
          await uploadMediaProjet(id, newGalerieImages, 'galerie');
        }
      }
      // Upload nouveaux documents
      for (const doc of newDocuments) {
        await uploadDocumentProjet(id, doc.base64, doc.nom, doc.type, doc.visibilite);
      }
      // Sauvegarder les donnees
      console.log('[saveAndExit] formData envoyee:', JSON.stringify({
        tags: formData.tags,
        metriques: formData.metriques,
        liens: formData.liens,
      }));
      const saveResult = await modifierProjet(id, formData);
      console.log('[saveAndExit] resultat:', JSON.stringify(saveResult));
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
      // Upload nouvelles images galerie
      if (galerieChanged) {
        const newGalerieImages = galerieImages.filter(img => img.startsWith('data:'));
        if (newGalerieImages.length > 0) {
          await uploadMediaProjet(id, newGalerieImages, 'galerie');
        }
      }
      // Upload nouveaux documents
      for (const doc of newDocuments) {
        await uploadDocumentProjet(id, doc.base64, doc.nom, doc.type, doc.visibilite);
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

  // Rendu etape 1 - Identite
  const renderEtape1 = () => (
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

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tags</Text>
        <Text style={styles.inputHint}>Validez pour ajouter un tag (max 10)</Text>

        {(formData.tags || []).length > 0 && (
          <View style={styles.tagsContainer}>
            {formData.tags!.map((tag, i) => (
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
            style={[styles.addLinkBtn, { paddingHorizontal: espacements.md, flex: 0 }]}
            onPress={addTag}
          >
            <Ionicons name="add" size={22} color={couleurs.primaire} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  // Rendu etape 2 - Proposition de valeur
  const renderEtape2 = () => (
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

  // Rendu etape 3 - Business
  const renderEtape3 = () => (
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
          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
        />
      </View>

      {/* Metriques / KPIs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Metriques cles</Text>
        <Text style={styles.inputHint}>Chiffres cles a afficher sur la fiche (CA, utilisateurs, etc.)</Text>

        {(formData.metriques || []).map((metrique, index) => (
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
            <Pressable onPress={() => removeMetrique(index)} style={{ padding: espacements.xs }}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addLinkBtn} onPress={() => setShowMetriqueModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color={couleurs.primaire} />
          <Text style={styles.addLinkBtnText}>Ajouter une metrique</Text>
        </Pressable>
      </View>
    </View>
  );

  // Rendu etape 4 - Medias
  const renderEtape4 = () => (
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

      {/* Galerie */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Galerie ({galerieImages.length} images)</Text>
        {galerieImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: espacements.sm }}>
            {galerieImages.map((img, i) => (
              <View key={i} style={{ marginRight: espacements.sm, position: 'relative' }}>
                <Image source={{ uri: img }} style={{ width: 120, height: 90, borderRadius: rayons.md }} />
                <Pressable
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
                    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
                  }}
                  onPress={() => {
                    setGalerieImages(galerieImages.filter((_, idx) => idx !== i));
                    setGalerieChanged(true);
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        <Pressable style={styles.imagePickerBtn} onPress={pickGalerieImages}>
          <Ionicons name="images-outline" size={32} color={couleurs.texteSecondaire} />
          <Text style={styles.imagePickerText}>Ajouter des images</Text>
        </Pressable>
      </View>

      {/* Documents */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Documents ({existingDocuments.length + newDocuments.length})</Text>
        <Text style={styles.inputHint}>PDF, PowerPoint, Word, Excel</Text>

        {/* Documents existants (du serveur) */}
        {existingDocuments.map((doc, index) => (
          <View key={`existing-${index}`} style={styles.linkItem}>
            <View style={styles.linkIcon}>
              <Ionicons
                name={
                  doc.type === 'pdf' ? 'document-text' :
                  doc.type === 'pptx' ? 'easel' :
                  doc.type === 'xlsx' ? 'grid' :
                  doc.type === 'docx' ? 'document' : 'document'
                }
                size={20}
                color={couleurs.primaire}
              />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel} numberOfLines={1}>{doc.nom}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons
                  name={doc.visibilite === 'public' ? 'eye-outline' : 'lock-closed-outline'}
                  size={12}
                  color={doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire}
                />
                <Text style={{ fontSize: 11, color: doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire }}>
                  {doc.visibilite === 'public' ? 'Public' : 'Prive'}
                </Text>
              </View>
            </View>
            <Ionicons name="cloud-done-outline" size={18} color={couleurs.texteSecondaire} />
          </View>
        ))}

        {/* Nouveaux documents */}
        {newDocuments.map((doc, index) => (
          <View key={`new-${index}`} style={styles.linkItem}>
            <View style={styles.linkIcon}>
              <Ionicons
                name={
                  doc.type === 'pdf' ? 'document-text' :
                  doc.type === 'pptx' ? 'easel' :
                  doc.type === 'xlsx' ? 'grid' :
                  doc.type === 'docx' ? 'document' : 'document'
                }
                size={20}
                color={couleurs.primaire}
              />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel} numberOfLines={1}>{doc.nom}</Text>
              <Pressable onPress={() => toggleNewDocVisibility(index)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons
                  name={doc.visibilite === 'public' ? 'eye-outline' : 'lock-closed-outline'}
                  size={12}
                  color={doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire}
                />
                <Text style={{ fontSize: 11, color: doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire }}>
                  {doc.visibilite === 'public' ? 'Public' : 'Prive'}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={() => removeNewDocument(index)} style={{ padding: espacements.xs }}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.imagePickerBtn} onPress={pickDocument}>
          <Ionicons name="folder-open-outline" size={32} color={couleurs.texteSecondaire} />
          <Text style={styles.imagePickerText}>Ajouter un document</Text>
        </Pressable>
      </View>
    </View>
  );

  // Rendu etape 5 - Liens
  const renderEtape5 = () => (
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

  // Rendu etape 6 - Recap
  const renderEtape6 = () => (
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
        {(formData.tags || []).length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="pricetags-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{formData.tags!.length} tag{formData.tags!.length > 1 ? 's' : ''}</Text>
          </View>
        )}
        {(formData.metriques || []).length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="analytics-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{formData.metriques!.length} metrique{formData.metriques!.length > 1 ? 's' : ''}</Text>
          </View>
        )}
        {galerieImages.length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="images-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{galerieImages.length} image{galerieImages.length > 1 ? 's' : ''} galerie</Text>
          </View>
        )}
        {(existingDocuments.length + newDocuments.length) > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="document-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{existingDocuments.length + newDocuments.length} document{(existingDocuments.length + newDocuments.length) > 1 ? 's' : ''}</Text>
          </View>
        )}
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
      case '1': return renderEtape1();
      case '2': return renderEtape2();
      case '3': return renderEtape3();
      case '4': return renderEtape4();
      case '5': return renderEtape5();
      case '6': return renderEtape6();
      default: return renderEtape1();
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
      <KeyboardView style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderEtapeContent()}
        </ScrollView>
      </KeyboardView>

      {/* Footer navigation */}
      {etapeActive !== '6' && (
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

      {/* Modal ajout metrique */}
      <Modal
        visible={showMetriqueModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMetriqueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + espacements.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une metrique</Text>
              <Pressable onPress={() => setShowMetriqueModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>Icone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: espacements.lg }}>
              <View style={{ flexDirection: 'row', gap: espacements.sm }}>
                {METRIQUE_ICONES.map((mi) => (
                  <Pressable
                    key={mi.value}
                    style={[
                      styles.metriqueIconBtn,
                      newMetriqueIcone === mi.value && styles.metriqueIconBtnActive,
                    ]}
                    onPress={() => setNewMetriqueIcone(mi.value)}
                  >
                    <Ionicons
                      name={mi.icon as any}
                      size={22}
                      color={newMetriqueIcone === mi.value ? '#FFFFFF' : couleurs.texte}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Valeur *</Text>
              <TextInput
                style={styles.modalInput}
                value={newMetriqueValeur}
                onChangeText={setNewMetriqueValeur}
                placeholder="Ex: 15 000, 42%, 3.5M..."
                placeholderTextColor={couleurs.texteSecondaire}
                maxLength={30}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Label *</Text>
              <TextInput
                style={styles.modalInput}
                value={newMetriqueLabel}
                onChangeText={setNewMetriqueLabel}
                placeholder="Ex: Utilisateurs actifs, CA mensuel..."
                placeholderTextColor={couleurs.texteSecondaire}
                maxLength={50}
              />
            </View>

            <Pressable style={styles.modalConfirmBtn} onPress={addMetrique}>
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
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.full,
    paddingHorizontal: espacements.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 6,
  },
  tagChipText: {
    fontSize: 13,
    color: couleurs.texte,
  },
  // Metriques
  metriqueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  metriqueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metriqueInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  metriqueValeur: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  metriqueLabel: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  metriqueIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metriqueIconBtnActive: {
    backgroundColor: couleurs.primaire,
  },
  inputHint: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: espacements.sm,
    paddingVertical: 4,
    borderRadius: rayons.full,
    backgroundColor: couleurs.fondSecondaire,
  },
  visibilityText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
});
