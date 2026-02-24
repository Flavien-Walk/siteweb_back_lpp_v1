/**
 * CreerPublicationModal
 * Modal plein ecran pour creer une nouvelle publication (texte + medias + mentions @).
 * Extrait depuis accueil.tsx pour factorisation.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../Avatar';
import KeyboardView from '../../KeyboardView';
import {
  Publication,
  MentionUtilisateur,
  MentionProjet,
  creerPublication,
  rechercherMentions,
} from '../../../services/publications';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreerPublicationModalProps {
  visible: boolean;
  onClose: () => void;
  couleurs: any;
  styles: any;
  utilisateur: any;
  onPublicationCreated: (publication: Publication) => void;
  applyDelta: (delta: any) => void;
  naviguerVersProfil: (userId?: string) => void;
}

interface MediaSelectionne {
  uri: string;
  type: 'image' | 'video';
  base64?: string;
  mimeType?: string;
}

interface MentionSuggestion {
  type: 'utilisateur' | 'projet';
  id: string;
  label: string;
  avatar?: string;
  sub?: string;
}

const MAX_MEDIAS = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreerPublicationModal: React.FC<CreerPublicationModalProps> = ({
  visible,
  onClose,
  couleurs,
  styles,
  utilisateur,
  onPublicationCreated,
  applyDelta,
  naviguerVersProfil,
}) => {
  // ----- State local -----
  const [nouveauPostContenu, setNouveauPostContenu] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [mediasSelectionnes, setMediasSelectionnes] = useState<MediaSelectionne[]>([]);

  // Mentions @ autocomplete
  const [mentionsSuggestions, setMentionsSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionsSelectionnees, setMentionsSelectionnees] = useState<Array<{
    type: 'utilisateur' | 'projet';
    id: string;
  }>>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const mentionSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nouveauPostInputRef = useRef<TextInput>(null);

  // ----- Reset complet a la fermeture -----
  const resetEtFermer = useCallback(() => {
    setNouveauPostContenu('');
    setMediasSelectionnes([]);
    setMentionsSelectionnees([]);
    setShowMentions(false);
    setMentionsSuggestions([]);
    setCreationEnCours(false);
    onClose();
  }, [onClose]);

  // ----- Gestion des mentions @ -----
  const handleTextChange = useCallback((text: string) => {
    setNouveauPostContenu(text);

    // Detecter si on est en train de taper une mention @
    const cursorPos = text.length; // Approximation (pas de cursorPosition en RN)
    const textBeforeCursor = text.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentions(true);

      if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
      if (query.length >= 1) {
        mentionSearchTimeout.current = setTimeout(async () => {
          try {
            const res = await rechercherMentions(query);
            if (res.succes && res.data) {
              const suggestions: MentionSuggestion[] = [];
              (res.data.utilisateurs || []).forEach((u: MentionUtilisateur) => {
                suggestions.push({
                  type: 'utilisateur',
                  id: u._id,
                  label: `${u.prenom} ${u.nom}`,
                  avatar: u.avatar,
                  sub: 'Ami',
                });
              });
              (res.data.projets || []).forEach((p: MentionProjet) => {
                suggestions.push({
                  type: 'projet',
                  id: p._id,
                  label: p.nom,
                  avatar: p.logo,
                  sub: p.categorie || 'Projet',
                });
              });
              setMentionsSuggestions(suggestions);
            }
          } catch { /* ignore */ }
        }, 250);
      } else {
        setMentionsSuggestions([]);
      }
    } else {
      setShowMentions(false);
      setMentionsSuggestions([]);
    }
  }, []);

  const handleSelectMention = useCallback((item: MentionSuggestion) => {
    setNouveauPostContenu(prev => {
      const textBeforeMention = prev.replace(/@\w*$/, '');
      const mentionTag = `@${item.label.replace(/\s+/g, '_')} `;
      return textBeforeMention + mentionTag;
    });

    // Ajouter aux mentions selectionnees (eviter doublons)
    setMentionsSelectionnees(prev => {
      if (prev.some(m => m.id === item.id)) return prev;
      return [...prev, { type: item.type, id: item.id }];
    });

    setShowMentions(false);
    setMentionsSuggestions([]);
  }, []);

  // ----- Creation de la publication -----
  const handleCreerPost = async () => {
    if ((!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) || creationEnCours) return;

    try {
      setCreationEnCours(true);

      // Preparer les medias en base64
      let mediasData: string[] | undefined;
      if (mediasSelectionnes.length > 0) {
        mediasData = mediasSelectionnes.map((m) => {
          if (m.base64) {
            const mimeType = m.mimeType || (m.type === 'video' ? 'video/mp4' : 'image/jpeg');
            return `data:${mimeType};base64,${m.base64}`;
          }
          return m.uri;
        });
      }

      const reponse = await creerPublication(
        nouveauPostContenu.trim(),
        mediasData,
        undefined,
        mentionsSelectionnees.length > 0 ? mentionsSelectionnees : undefined
      );
      if (reponse.succes && reponse.data) {
        onPublicationCreated(reponse.data.publication);
        if (reponse.gamification) applyDelta(reponse.gamification);
        Alert.alert('Succes', 'Publication creee !');
        resetEtFermer();
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de creer la publication');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setCreationEnCours(false);
    }
  };

  // ----- Selection d'images depuis la galerie (multi-selection) -----
  const handleSelectImage = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} medias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Nous avons besoin d'acceder a votre galerie pour ajouter des photos.");
        return;
      }

      const remainingSlots = MAX_MEDIAS - mediasSelectionnes.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMedias: MediaSelectionne[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image' as const,
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        }));
        setMediasSelectionnes(prev => [...prev, ...newMedias].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de selectionner les images');
    }
  };

  // ----- Selection d'une video depuis la galerie -----
  const handleSelectVideo = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} medias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Nous avons besoin d'acceder a votre galerie pour ajouter des videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Verifier la taille du fichier (limite a 50MB)
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > 50 * 1024 * 1024) {
          Alert.alert('Video trop volumineuse', 'La video ne doit pas depasser 50 MB. Essayez une video plus courte.');
          return;
        }

        // Lire la video en base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setMediasSelectionnes(prev => [...prev, {
          uri: asset.uri,
          type: 'video' as const,
          base64: base64,
          mimeType: asset.mimeType || 'video/mp4',
        }].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      console.error('Erreur selection video:', error);
      Alert.alert('Erreur', 'Impossible de selectionner la video. Elle est peut-etre trop volumineuse.');
    }
  };

  // ----- Prendre une photo avec l'appareil photo -----
  const handleTakePhoto = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} medias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Nous avons besoin d'acceder a votre camera pour prendre des photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediasSelectionnes(prev => [...prev, {
          uri: asset.uri,
          type: 'image' as const,
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        }].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // ----- Supprimer un media du tableau -----
  const handleRemoveMedia = (index: number) => {
    setMediasSelectionnes(prev => prev.filter((_, i) => i !== index));
  };

  // ----- Render -----
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={resetEtFermer}
    >
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle publication</Text>
              <Pressable onPress={resetEtFermer} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            {/* Corps du modal */}
            <ScrollView
              style={[styles.modalBody, { flex: 1 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Auteur */}
              <View style={styles.modalAuthor}>
                <Avatar
                  uri={utilisateur?.avatar}
                  prenom={utilisateur?.prenom}
                  nom={utilisateur?.nom}
                  taille={40}
                  onPress={() => naviguerVersProfil(utilisateur?.id)}
                />
                <Text style={styles.modalAuthorName}>
                  {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Vous'}
                </Text>
              </View>

              {/* Champ texte */}
              <TextInput
                ref={nouveauPostInputRef}
                style={styles.modalTextInput}
                placeholder="Quoi de neuf ? Partagez vos idees... Tapez @ pour mentionner"
                placeholderTextColor={couleurs.texteSecondaire}
                value={nouveauPostContenu}
                onChangeText={handleTextChange}
                multiline
                maxLength={5000}
              />

              {/* Autocomplete mentions */}
              {showMentions && mentionsSuggestions.length > 0 && (
                <View style={styles.mentionDropdown}>
                  {mentionsSuggestions.map((item) => (
                    <Pressable
                      key={`${item.type}-${item.id}`}
                      style={({ pressed }) => [
                        styles.mentionItem,
                        pressed && { backgroundColor: couleurs.bordure },
                      ]}
                      onPress={() => handleSelectMention(item)}
                    >
                      <View
                        style={[
                          styles.mentionItemAvatar,
                          {
                            backgroundColor:
                              item.type === 'projet'
                                ? 'rgba(245,158,11,0.15)'
                                : couleurs.primaireLight,
                          },
                        ]}
                      >
                        {item.avatar ? (
                          <Image
                            source={{ uri: item.avatar }}
                            style={styles.mentionItemAvatarImg}
                          />
                        ) : (
                          <Ionicons
                            name={
                              item.type === 'projet'
                                ? 'rocket-outline'
                                : 'person-outline'
                            }
                            size={16}
                            color={
                              item.type === 'projet' ? '#F59E0B' : couleurs.primaire
                            }
                          />
                        )}
                      </View>
                      <View style={styles.mentionItemInfo}>
                        <Text style={styles.mentionItemName}>{item.label}</Text>
                        <Text style={styles.mentionItemSub}>{item.sub}</Text>
                      </View>
                      <Ionicons
                        name={item.type === 'projet' ? 'rocket' : 'person'}
                        size={14}
                        color={couleurs.texteSecondaire}
                      />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Apercu des medias selectionnes (multi-media) */}
              {mediasSelectionnes.length > 0 && (
                <View style={styles.mediasPreviewRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {mediasSelectionnes.map((media, index) => (
                      <View key={`media-${index}`} style={styles.mediaPreviewItem}>
                        <Image
                          source={{ uri: media.uri }}
                          style={styles.mediaPreviewThumb}
                          resizeMode="cover"
                        />
                        {media.type === 'video' && (
                          <View style={styles.mediaVideoIndicatorSmall}>
                            <Ionicons
                              name="play-circle"
                              size={24}
                              color="rgba(255,255,255,0.9)"
                            />
                          </View>
                        )}
                        <Pressable
                          style={styles.mediaRemoveBtnSmall}
                          onPress={() => handleRemoveMedia(index)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={couleurs.blanc}
                          />
                        </Pressable>
                        <View style={styles.mediaIndexBadge}>
                          <Text style={styles.mediaIndexText}>{index + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <Text style={styles.mediasCount}>
                    {mediasSelectionnes.length}/{MAX_MEDIAS} medias
                  </Text>
                </View>
              )}

              <Text style={styles.modalCharCount}>
                {nouveauPostContenu.length}/5000
              </Text>
            </ScrollView>

            {/* Barre d'actions medias */}
            <View style={styles.modalMediaBar}>
              <Pressable style={styles.modalMediaBtn} onPress={handleSelectImage}>
                <Ionicons name="image-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Photo</Text>
              </Pressable>
              <Pressable style={styles.modalMediaBtn} onPress={handleSelectVideo}>
                <Ionicons name="videocam-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Video</Text>
              </Pressable>
              <Pressable style={styles.modalMediaBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Camera</Text>
              </Pressable>
            </View>

            {/* Footer avec bouton publier */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[
                  styles.modalPublishBtn,
                  ((!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) ||
                    creationEnCours) &&
                    styles.modalPublishBtnDisabled,
                ]}
                onPress={handleCreerPost}
                disabled={
                  (!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) ||
                  creationEnCours
                }
              >
                {creationEnCours ? (
                  <Text style={styles.modalPublishBtnText}>Publication...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={couleurs.blanc} />
                    <Text style={styles.modalPublishBtnText}>Publier</Text>
                  </>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CreerPublicationModal;
