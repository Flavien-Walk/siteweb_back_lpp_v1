/**
 * Ecran de creation de projet - Wizard multi-etapes
 * Etape A: Identite | B: Equipe | C: Proposition | D: Business | E: Medias | F: Publication
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import {
  ProjetFormData,
  CategorieProjet,
  MaturiteProjet,
  creerProjet,
  modifierProjet,
  uploadMediaProjet,
  gererEquipeProjet,
} from '../../../src/services/projets';
import { getMesAmis, ProfilUtilisateur } from '../../../src/services/utilisateurs';

// Types pour les etapes
type Etape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const ETAPES: { key: Etape; label: string; description: string }[] = [
  { key: 'A', label: 'Identite', description: 'Nom, pitch et categorie' },
  { key: 'B', label: 'Equipe', description: 'Porteurs et co-fondateurs' },
  { key: 'C', label: 'Proposition', description: 'Probleme et solution' },
  { key: 'D', label: 'Business', description: 'Maturite et objectifs' },
  { key: 'E', label: 'Medias', description: 'Images et documents' },
  { key: 'F', label: 'Publication', description: 'Relecture et publication' },
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

export default function NouveauProjetScreen() {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // Etape courante
  const [etapeActive, setEtapeActive] = useState<Etape>('A');
  const [loading, setLoading] = useState(false);
  const [projetId, setProjetId] = useState<string | null>(null);

  // Equipe
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [loadingAmis, setLoadingAmis] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProfilUtilisateur[]>([]);

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
  });

  // Images selectionnees (base64)
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galerieImages, setGalerieImages] = useState<string[]>([]);

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
    if (etapeActive === 'A') {
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
        setEtapeActive('B');
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

  // Rendu de l'etape A - Identite
  const renderEtapeA = () => (
    <View style={styles.etapeContent}>
      <Text style={styles.etapeTitle}>Identite du projet</Text>
      <Text style={styles.etapeDescription}>
        Donnez vie a votre projet avec un nom accrocheur et un pitch percutant.
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

  // Rendu de l'etape C - Proposition de valeur
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

  // Rendu de l'etape D - Business
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
      case 'A': return renderEtapeA();
      case 'B': return renderEtapeB();
      case 'C': return renderEtapeC();
      case 'D': return renderEtapeD();
      case 'E': return renderEtapeE();
      case 'F': return renderEtapeF();
      default: return renderEtapeA();
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
            style={[styles.footerBtn, styles.footerBtnPrimary, loading && styles.footerBtnDisabled]}
            onPress={goNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.footerBtnPrimaryText}>
                {etapeActive === 'A' && !projetId ? 'Creer' : 'Suivant'}
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
    </SafeAreaView>
  );
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
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
    width: 20,
    height: 2,
    backgroundColor: couleurs.fondSecondaire,
    marginHorizontal: 4,
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
  comingSoon: {
    alignItems: 'center',
    paddingVertical: espacements.xl * 2,
  },
  comingSoonText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: espacements.md,
    lineHeight: 22,
  },
  comingSoonHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
    fontStyle: 'italic',
  },
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
  publishBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveDraftBtn: {
    alignItems: 'center',
    paddingVertical: espacements.md,
    marginTop: espacements.md,
  },
  saveDraftBtnText: {
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
  // Styles Equipe
  teamList: {
    marginBottom: espacements.lg,
  },
  teamListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondSecondaire,
  },
  memberAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  memberInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  memberRole: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  memberRemoveBtn: {
    padding: espacements.xs,
  },
  addTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire + '15',
    borderRadius: rayons.md,
    padding: espacements.md,
    gap: 8,
  },
  addTeamBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  teamHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: espacements.md,
    fontStyle: 'italic',
  },
  noFriendsBox: {
    flexDirection: 'row',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginTop: espacements.md,
    gap: 8,
  },
  noFriendsText: {
    flex: 1,
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
  },
  // Styles Modal
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
    marginBottom: espacements.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  modalSubtitle: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.lg,
  },
  modalLoading: {
    paddingVertical: espacements.xl * 2,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: espacements.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
    textAlign: 'center',
  },
  modalEmptyHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
    textAlign: 'center',
    paddingHorizontal: espacements.lg,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  friendItemSelected: {
    backgroundColor: couleurs.primaire + '10',
    marginHorizontal: -espacements.md,
    paddingHorizontal: espacements.md,
    borderRadius: rayons.md,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.fondSecondaire,
  },
  friendAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  friendInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '500',
    color: couleurs.texte,
  },
  friendStatus: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  friendCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCheckboxSelected: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  modalConfirmBtn: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    marginTop: espacements.lg,
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
