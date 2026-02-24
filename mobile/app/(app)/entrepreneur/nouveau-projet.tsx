/**
 * Ecran de creation de projet - Wizard multi-etapes
 * Etape 1: Identite | 2: Equipe | 3: Proposition | 4: Business | 5: Medias | 6: Publication
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { espacements } from '../../../src/constantes/theme';
import createStyles from '../../../src/features/projets/nouveau-projet.styles';
import {
  ProjetFormData,
  DocumentProjet,
  Metrique,
  LienProjet,
  TypeLien,
  VisibiliteDocument,
  creerProjet,
  modifierProjet,
  uploadMediaProjet,
  uploadDocumentProjet,
  gererEquipeProjet,
} from '../../../src/services/projets';
import * as DocumentPicker from 'expo-document-picker';
import { getMesAmis, ProfilUtilisateur } from '../../../src/services/utilisateurs';
import KeyboardView from '../../../src/composants/KeyboardView';
import {
  ETAPES_CREATION as ETAPES,
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

export default function NouveauProjetScreen() {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // Etape courante
  const [etapeActive, setEtapeActive] = useState<Etape>('1');
  const [loading, setLoading] = useState(false);
  const [projetId, setProjetId] = useState<string | null>(null);

  // Equipe
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [loadingAmis, setLoadingAmis] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProfilUtilisateur[]>([]);

  // Tags
  const [tagInput, setTagInput] = useState('');

  // Metriques
  const [showMetriqueModal, setShowMetriqueModal] = useState(false);
  const [newMetriqueLabel, setNewMetriqueLabel] = useState('');
  const [newMetriqueValeur, setNewMetriqueValeur] = useState('');
  const [newMetriqueIcone, setNewMetriqueIcone] = useState('analytics-outline');

  // Liens
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkType, setNewLinkType] = useState<TypeLien>('site');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

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
    metriques: [],
    liens: [],
  });

  // Images selectionnees (base64)
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galerieImages, setGalerieImages] = useState<string[]>([]);

  // Documents selectionnes
  const [documents, setDocuments] = useState<{ nom: string; base64: string; type: DocumentProjet['type']; visibilite: VisibiliteDocument }[]>([]);

  // Navigation entre etapes
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
    // Validation selon l'etape
    if (etapeActive === '1') {
      if (!formData.nom?.trim() || !formData.pitch?.trim() || !formData.categorie || !formData.localisation?.ville) {
        Alert.alert('Champs requis', 'Veuillez remplir le nom, le pitch, la categorie et la ville.');
        return;
      }
      // Creer le projet brouillon a l'etape A
      if (!projetId) {
        await createDraft();
        return;
      }
    }

    // Sauvegarder les modifications
    if (projetId) {
      await saveDraft();
    }

    if (canGoNext) {
      setEtapeActive(ETAPES[etapeIndex + 1].key);
    }
  };

  // Creer le brouillon initial
  const createDraft = async () => {
    setLoading(true);
    try {
      const response = await creerProjet(formData);
      if (response.succes && response.data?.projet) {
        setProjetId(response.data.projet._id);
        setEtapeActive('2');
      } else {
        Alert.alert('Erreur', response.message || 'Impossible de creer le projet');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
      console.error('Erreur creation projet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les modifications
  const saveDraft = async () => {
    if (!projetId) return;
    setLoading(true);
    try {
      await modifierProjet(projetId, formData);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setLoading(false);
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
    }
  };

  // Ajouter des images a la galerie
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
    }
  };

  // Ajouter un document
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

        // Determiner le type de document
        let docType: DocumentProjet['type'] = 'other';
        if (asset.mimeType?.includes('pdf')) docType = 'pdf';
        else if (asset.mimeType?.includes('presentation')) docType = 'pptx';
        else if (asset.mimeType?.includes('spreadsheet')) docType = 'xlsx';
        else if (asset.mimeType?.includes('wordprocessing')) docType = 'docx';

        setDocuments([...documents, {
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

  // Supprimer un document
  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  // Toggle visibilite document
  const toggleDocVisibility = (index: number) => {
    setDocuments(documents.map((doc, i) =>
      i === index
        ? { ...doc, visibilite: (doc.visibilite === 'public' ? 'private' : 'public') as VisibiliteDocument }
        : doc
    ));
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

  // Gestion des liens
  const addLink = () => {
    if (!newLinkUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL');
      return;
    }
    const urlPattern = /^(https?:\/\/|mailto:).+/i;
    if (!urlPattern.test(newLinkUrl.trim())) {
      Alert.alert('URL invalide', "L'URL doit commencer par http://, https:// ou mailto:");
      return;
    }
    const newLink: LienProjet = {
      type: newLinkType,
      url: newLinkUrl.trim(),
      label: newLinkLabel.trim() || undefined,
    };
    setFormData({ ...formData, liens: [...(formData.liens || []), newLink] });
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
    return TYPES_LIENS.find(t => t.value === lien.type)?.label || 'Lien';
  };

  // Charger les amis entrepreneurs
  const loadAmis = async () => {
    setLoadingAmis(true);
    try {
      const response = await getMesAmis();
      if (response.succes && response.data?.amis) {
        // Filtrer pour garder uniquement les entrepreneurs
        const entrepreneurAmis = response.data.amis.filter(
          (ami) => ami.statut === 'entrepreneur'
        );
        setAmis(entrepreneurAmis);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    } finally {
      setLoadingAmis(false);
    }
  };

  // Ouvrir le modal de selection d'equipe
  const openTeamModal = () => {
    loadAmis();
    // Pre-selectionner les membres actuels
    setSelectedMembers(teamMembers.map((m) => m._id));
    setShowTeamModal(true);
  };

  // Toggle selection d'un membre
  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Confirmer la selection d'equipe
  const confirmTeamSelection = async () => {
    if (!projetId) {
      Alert.alert('Erreur', 'Le projet doit d\'abord etre cree');
      return;
    }

    setLoading(true);
    try {
      // Determiner les ajouts et suppressions
      const currentIds = teamMembers.map((m) => m._id);
      const toAdd = selectedMembers.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !selectedMembers.includes(id));

      if (toAdd.length > 0 || toRemove.length > 0) {
        const response = await gererEquipeProjet(projetId, toAdd, toRemove);
        if (response.succes) {
          // Mettre a jour la liste des membres
          const newMembers = amis.filter((ami) => selectedMembers.includes(ami._id));
          setTeamMembers(newMembers);

          if (response.data?.errors && response.data.errors.length > 0) {
            Alert.alert('Attention', response.data.errors.join('\n'));
          }
        } else {
          Alert.alert('Erreur', response.message || 'Impossible de modifier l\'equipe');
        }
      } else {
        // Pas de changement, juste mettre a jour l'affichage local
        const newMembers = amis.filter((ami) => selectedMembers.includes(ami._id));
        setTeamMembers(newMembers);
      }
    } catch (error) {
      console.error('Erreur modification equipe:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setShowTeamModal(false);
    }
  };

  // Retirer un membre de l'equipe
  const removeMember = async (userId: string) => {
    if (!projetId) return;

    Alert.alert(
      'Retirer ce membre ?',
      'Ce membre ne pourra plus modifier le projet.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await gererEquipeProjet(projetId, [], [userId]);
              setTeamMembers((prev) => prev.filter((m) => m._id !== userId));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de retirer ce membre');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Validation locale avant publication
  const validateBeforePublish = (): { valid: boolean; missing: string[] } => {
    const missing: string[] = [];
    if (!formData.nom?.trim()) missing.push('Nom du projet');
    if (!formData.pitch?.trim()) missing.push('Pitch');
    if (!formData.categorie) missing.push('Categorie');
    if (!formData.localisation?.ville?.trim()) missing.push('Ville');
    if (!coverImage) missing.push('Image de couverture');
    return { valid: missing.length === 0, missing };
  };

  // Upload des medias et publication
  const publierProjetHandler = async () => {
    if (!projetId) return;

    // Validation locale d'abord
    const validation = validateBeforePublish();
    if (!validation.valid) {
      Alert.alert(
        'Projet incomplet',
        `Il manque les informations suivantes :\n\n• ${validation.missing.join('\n• ')}`,
        [{ text: 'Compris' }]
      );
      return;
    }

    setLoading(true);
    try {
      // Upload cover si presente
      if (coverImage) {
        await uploadMediaProjet(projetId, [coverImage], 'cover');
      }
      // Upload galerie si presente
      if (galerieImages.length > 0) {
        await uploadMediaProjet(projetId, galerieImages, 'galerie');
      }
      // Upload documents si presents
      for (const doc of documents) {
        await uploadDocumentProjet(projetId, doc.base64, doc.nom, doc.type, doc.visibilite);
      }
      // Publication
      const { publierProjet: publier } = await import('../../../src/services/projets');
      const response = await publier(projetId) as any;

      if (response.succes) {
        Alert.alert('Succes', 'Votre projet a ete publie !', [
          { text: 'OK', onPress: () => router.replace('/(app)/accueil') }
        ]);
      } else {
        // Afficher les erreurs detaillees du backend
        if (response.missing && Array.isArray(response.missing)) {
          const details = response.details || {};
          const errorMessages = response.missing.map((field: string) =>
            details[field] || `${field} est requis`
          );
          Alert.alert(
            'Projet incomplet',
            `Impossible de publier :\n\n• ${errorMessages.join('\n• ')}`,
            [{ text: 'Compris' }]
          );
        } else {
          Alert.alert('Erreur', response.message || 'Impossible de publier le projet');
        }
      }
    } catch (error: any) {
      // Gerer les erreurs reseau avec details
      if (error?.response?.data?.missing) {
        const { missing, details } = error.response.data;
        const errorMessages = missing.map((field: string) =>
          details?.[field] || `${field} est requis`
        );
        Alert.alert(
          'Projet incomplet',
          `Impossible de publier :\n\n• ${errorMessages.join('\n• ')}`,
          [{ text: 'Compris' }]
        );
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de la publication');
        console.error('Erreur publication:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Rendu de l'etape B - Equipe
  const renderEtapeB = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Votre equipe</Text>
      <Text style={styles.etapeDescription}>
        Ajoutez des co-fondateurs parmi vos amis entrepreneurs. Ils pourront modifier le projet.
      </Text>

      {/* Liste des membres actuels */}
      {teamMembers.length > 0 && (
        <View style={styles.teamList}>
          <Text style={styles.teamListTitle}>Membres de l'equipe ({teamMembers.length})</Text>
          {teamMembers.map((member) => (
            <View key={member._id} style={styles.teamMemberCard}>
              {member.avatar ? (
                <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
              ) : (
                <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                  <Ionicons name="person" size={20} color={couleurs.texteSecondaire} />
                </View>
              )}
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.prenom} {member.nom}</Text>
                <Text style={styles.memberRole}>Co-fondateur</Text>
              </View>
              <Pressable
                style={styles.memberRemoveBtn}
                onPress={() => removeMember(member._id)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Bouton ajouter des membres */}
      <Pressable
        style={styles.addTeamBtn}
        onPress={openTeamModal}
        disabled={!projetId}
      >
        <Ionicons name="person-add-outline" size={24} color={couleurs.primaire} />
        <Text style={styles.addTeamBtnText}>
          {teamMembers.length > 0 ? 'Modifier l\'equipe' : 'Ajouter des membres'}
        </Text>
      </Pressable>

      {!projetId && (
        <Text style={styles.teamHint}>
          Creez d'abord le projet (etape A) pour pouvoir ajouter des membres.
        </Text>
      )}

      {projetId && amis.length === 0 && !loadingAmis && (
        <View style={styles.noFriendsBox}>
          <Ionicons name="information-circle-outline" size={20} color={couleurs.texteSecondaire} />
          <Text style={styles.noFriendsText}>
            Seuls vos amis entrepreneurs peuvent rejoindre votre equipe.
            Ajoutez des amis ou invitez-les a devenir entrepreneurs.
          </Text>
        </View>
      )}
    </View>
  );

  // Rendu de l'etape E - Medias
  const renderEtapeE = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Medias</Text>
      <Text style={styles.etapeDescription}>
        Ajoutez des visuels pour rendre votre projet plus attractif.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Image de couverture</Text>
        <Pressable style={styles.imagePickerBtn} onPress={pickCoverImage}>
          {coverImage ? (
            <View style={styles.imagePicked}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.imagePickedText}>Image selectionnee</Text>
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={couleurs.texteSecondaire} />
              <Text style={styles.imagePickerText}>Ajouter une image 16:9</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Galerie ({galerieImages.length} images)</Text>
        <Pressable style={styles.imagePickerBtn} onPress={pickGalerieImages}>
          <Ionicons name="images-outline" size={32} color={couleurs.texteSecondaire} />
          <Text style={styles.imagePickerText}>Ajouter des images</Text>
        </Pressable>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Documents ({documents.length})</Text>
        <Text style={styles.inputHint}>PDF, PowerPoint, Word, Excel</Text>

        {/* Liste des documents ajoutes */}
        {documents.map((doc, index) => (
          <View key={index} style={styles.documentItem}>
            <View style={styles.documentIcon}>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.documentName} numberOfLines={1}>{doc.nom}</Text>
              <Pressable onPress={() => toggleDocVisibility(index)} style={styles.visibilityToggle}>
                <Ionicons
                  name={doc.visibilite === 'public' ? 'eye-outline' : 'lock-closed-outline'}
                  size={14}
                  color={doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire}
                />
                <Text style={[styles.visibilityText, { color: doc.visibilite === 'public' ? '#10B981' : couleurs.texteSecondaire }]}>
                  {doc.visibilite === 'public' ? 'Public' : 'Prive (investisseurs)'}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={() => removeDocument(index)} style={styles.documentRemove}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.imagePickerBtn} onPress={pickDocument}>
          <Ionicons name="folder-open-outline" size={32} color={couleurs.texteSecondaire} />
          <Text style={styles.imagePickerText}>Ajouter un document</Text>
        </Pressable>
      </View>

      {/* Liens externes */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Liens externes</Text>
        <Text style={styles.inputHint}>Site web, reseaux sociaux, page de levee de fonds...</Text>

        {(formData.liens || []).length > 0 && (
          <View style={{ marginBottom: espacements.sm }}>
            {formData.liens!.map((lien, index) => (
              <View key={index} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <Ionicons name={getLinkIcon(lien.type) as any} size={20} color={couleurs.primaire} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.documentName} numberOfLines={1}>{getLinkLabel(lien)}</Text>
                  <Text style={styles.inputHint} numberOfLines={1}>{lien.url}</Text>
                </View>
                <Pressable onPress={() => removeLink(index)} style={styles.documentRemove}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.addTeamBtn} onPress={() => setShowLinkModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color={couleurs.primaire} />
          <Text style={styles.addTeamBtnText}>Ajouter un lien</Text>
        </Pressable>
      </View>
    </View>
  );

  // Rendu de l'etape F - Publication
  const renderEtapeF = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Pret a publier ?</Text>
      <Text style={styles.etapeDescription}>
        Verifiez les informations avant de publier votre projet.
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

        {/* Incubateur */}
        {formData.incubateur && (
          <View style={styles.recapRow}>
            <Ionicons name="business-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>{formData.incubateur}</Text>
          </View>
        )}

        {/* Objectif de financement */}
        {formData.objectifFinancement && formData.objectifFinancement > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="cash-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              Objectif: {formData.objectifFinancement.toLocaleString('fr-FR')} EUR
            </Text>
          </View>
        )}

        {/* Equipe */}
        {teamMembers.length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="people-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} dans l'equipe
            </Text>
          </View>
        )}

        {/* Image de couverture */}
        <View style={styles.recapRow}>
          <Ionicons
            name={coverImage ? 'checkmark-circle' : 'alert-circle-outline'}
            size={16}
            color={coverImage ? '#10B981' : '#F59E0B'}
          />
          <Text style={[styles.recapText, { color: coverImage ? '#10B981' : '#F59E0B' }]}>
            {coverImage ? 'Image de couverture ajoutee' : 'Image de couverture requise'}
          </Text>
        </View>

        {/* Galerie */}
        {galerieImages.length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="images-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {galerieImages.length} image{galerieImages.length > 1 ? 's' : ''} dans la galerie
            </Text>
          </View>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="folder-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {documents.length} document{documents.length > 1 ? 's' : ''} ajoute{documents.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Tags */}
        {(formData.tags || []).length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="pricetags-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {formData.tags!.length} tag{formData.tags!.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Metriques */}
        {(formData.metriques || []).length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="stats-chart-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {formData.metriques!.length} metrique{formData.metriques!.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Liens */}
        {(formData.liens || []).length > 0 && (
          <View style={styles.recapRow}>
            <Ionicons name="link-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.recapText}>
              {formData.liens!.length} lien{formData.liens!.length > 1 ? 's' : ''} externe{formData.liens!.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
        onPress={publierProjetHandler}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            <Text style={styles.publishBtnText}>Publier mon projet</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.saveDraftBtn}
        onPress={() => {
          saveDraft();
          Alert.alert('Brouillon sauvegarde', 'Vous pouvez continuer plus tard.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }}
      >
        <Text style={styles.saveDraftBtnText}>Sauvegarder comme brouillon</Text>
      </Pressable>
    </View>
  );

  // Rendu du contenu selon l'etape
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
          mode="creation"
        />
      );
      case '2': return renderEtapeB();
      case '3': return (
        <EtapeProposition
          formData={formData}
          setFormData={setFormData}
          couleurs={couleurs}
          styles={styles}
        />
      );
      case '4': return (
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
          mode="creation"
        />
      );
      case '5': return renderEtapeE();
      case '6': return renderEtapeF();
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
          mode="creation"
        />
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Nouveau projet</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {ETAPES.map((etape, index) => (
          <View key={etape.key} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                index <= etapeIndex && styles.progressDotActive,
              ]}
            >
              <Text
                style={[
                  styles.progressDotText,
                  index <= etapeIndex && styles.progressDotTextActive,
                ]}
              >
                {etape.key}
              </Text>
            </View>
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
            style={[styles.footerBtn, styles.footerBtnPrimary, loading && styles.footerBtnDisabled]}
            onPress={goNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.footerBtnPrimaryText}>
                {etapeActive === '1' && !projetId ? 'Creer' : 'Suivant'}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Modal de selection d'equipe */}
      <Modal
        visible={showTeamModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + espacements.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter des membres</Text>
              <Pressable onPress={() => setShowTeamModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Selectionnez parmi vos amis entrepreneurs
            </Text>

            {loadingAmis ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={couleurs.primaire} />
              </View>
            ) : amis.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={48} color={couleurs.texteSecondaire} />
                <Text style={styles.modalEmptyText}>
                  Aucun ami entrepreneur trouve.
                </Text>
                <Text style={styles.modalEmptyHint}>
                  Vos amis doivent avoir le statut "entrepreneur" pour rejoindre votre equipe.
                </Text>
              </View>
            ) : (
              <FlatList
                data={amis}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isSelected = selectedMembers.includes(item._id);
                  return (
                    <Pressable
                      style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                      onPress={() => toggleMemberSelection(item._id)}
                    >
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                          <Ionicons name="person" size={18} color={couleurs.texteSecondaire} />
                        </View>
                      )}
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{item.prenom} {item.nom}</Text>
                        <Text style={styles.friendStatus}>Entrepreneur</Text>
                      </View>
                      <View style={[styles.friendCheckbox, isSelected && styles.friendCheckboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                    </Pressable>
                  );
                }}
                style={styles.friendsList}
              />
            )}

            <Pressable
              style={[styles.modalConfirmBtn, loading && styles.modalConfirmBtnDisabled]}
              onPress={confirmTeamSelection}
              disabled={loading || loadingAmis}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalConfirmBtnText}>
                  Confirmer ({selectedMembers.length} selectionne{selectedMembers.length > 1 ? 's' : ''})
                </Text>
              )}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: espacements.md }}>
              <View style={{ flexDirection: 'row', gap: espacements.sm }}>
                {METRIQUE_ICONES.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.categoryChip,
                      newMetriqueIcone === item.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setNewMetriqueIcone(item.value)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={newMetriqueIcone === item.value ? '#FFFFFF' : couleurs.texte}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Valeur *</Text>
              <TextInput
                style={styles.input}
                value={newMetriqueValeur}
                onChangeText={setNewMetriqueValeur}
                placeholder="Ex: 15k, 98%, 2.5M EUR"
                placeholderTextColor={couleurs.texteSecondaire}
                maxLength={30}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label *</Text>
              <TextInput
                style={styles.input}
                value={newMetriqueLabel}
                onChangeText={setNewMetriqueLabel}
                placeholder="Ex: Utilisateurs actifs, CA mensuel"
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: espacements.lg }}>
              <View style={{ flexDirection: 'row', gap: espacements.sm }}>
                {TYPES_LIENS.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.categoryChip,
                      newLinkType === type.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setNewLinkType(type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={16}
                      color={newLinkType === type.value ? '#FFFFFF' : couleurs.texte}
                    />
                    <Text style={[
                      styles.categoryChipText,
                      newLinkType === type.value && styles.categoryChipTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL *</Text>
              <TextInput
                style={styles.input}
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
                placeholder={TYPES_LIENS.find(t => t.value === newLinkType)?.placeholder}
                placeholderTextColor={couleurs.texteSecondaire}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label personnalise (optionnel)</Text>
              <TextInput
                style={styles.input}
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

