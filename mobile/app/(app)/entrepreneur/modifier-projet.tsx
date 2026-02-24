/**
 * Ecran d'edition de projet - Mode edition avec prefill
 * Permet de modifier un projet existant et gerer les liens externes
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
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
import { useTheme } from '../../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import createStyles from '../../../src/features/projets/modifier-projet.styles';
import {
  ProjetFormData,
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
import {
  ETAPES_MODIFICATION as ETAPES,
  CATEGORIES,
  MATURITES,
  TYPES_LIENS,
  METRIQUE_ICONES,
} from '../../../src/constantes/projets';
import EtapeIdentite from '../../../src/composants/features/projets/EtapeIdentite';
import EtapeProposition from '../../../src/composants/features/projets/EtapeProposition';
import EtapeBusiness from '../../../src/composants/features/projets/EtapeBusiness';

// Types pour les etapes (numeriques)
type Etape = '1' | '2' | '3' | '4' | '5' | '6';

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

  // Incubateur
  const [estIncube, setEstIncube] = useState(false);
  const [incubateurRecherche, setIncubateurRecherche] = useState('');

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
          incubateur: p.incubateur || undefined,
        });
        if (p.incubateur) setEstIncube(true);
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
        {formData.incubateur && (
          <View style={styles.recapRow}>
            <Ionicons name="business-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{formData.incubateur}</Text>
          </View>
        )}
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
      case '1': return (
        <EtapeIdentite
          formData={formData}
          setFormData={setFormData}
          estIncube={estIncube}
          setEstIncube={setEstIncube}
          incubateurRecherche={incubateurRecherche}
          setIncubateurRecherche={setIncubateurRecherche}
          tagInput={tagInput}
          setTagInput={setTagInput}
          addTag={addTag}
          removeTag={removeTag}
          couleurs={couleurs}
          styles={styles}
          mode="modification"
        />
      );
      case '2': return (
        <EtapeProposition
          formData={formData}
          setFormData={setFormData}
          couleurs={couleurs}
          styles={styles}
        />
      );
      case '3': return (
        <EtapeBusiness
          formData={formData}
          setFormData={setFormData}
          showMetriqueModal={showMetriqueModal}
          setShowMetriqueModal={setShowMetriqueModal}
          newMetriqueLabel={newMetriqueLabel}
          setNewMetriqueLabel={setNewMetriqueLabel}
          newMetriqueValeur={newMetriqueValeur}
          setNewMetriqueValeur={setNewMetriqueValeur}
          newMetriqueIcone={newMetriqueIcone}
          setNewMetriqueIcone={setNewMetriqueIcone}
          addMetrique={addMetrique}
          removeMetrique={removeMetrique}
          couleurs={couleurs}
          styles={styles}
          mode="modification"
        />
      );
      case '4': return renderEtape4();
      case '5': return renderEtape5();
      case '6': return renderEtape6();
      default: return (
        <EtapeIdentite
          formData={formData}
          setFormData={setFormData}
          estIncube={estIncube}
          setEstIncube={setEstIncube}
          incubateurRecherche={incubateurRecherche}
          setIncubateurRecherche={setIncubateurRecherche}
          tagInput={tagInput}
          setTagInput={setTagInput}
          addTag={addTag}
          removeTag={removeTag}
          couleurs={couleurs}
          styles={styles}
          mode="modification"
        />
      );
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

