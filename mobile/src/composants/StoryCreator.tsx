/**
 * StoryCreator - Modal de création de story
 * Permet de sélectionner une photo ou vidéo et de la publier
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';
import { creerStory, TypeStory } from '../services/stories';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_VIDEO_SIZE_MB = 50;
const MAX_IMAGE_SIZE_MB = 10;

interface StoryCreatorProps {
  visible: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

interface SelectedMedia {
  uri: string;
  type: TypeStory;
  base64?: string;
  mimeType?: string;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({
  visible,
  onClose,
  onStoryCreated,
}) => {
  const insets = useSafeAreaInsets();
  const { couleurs: themeColors } = useTheme();

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset state à la fermeture
  const handleClose = useCallback(() => {
    setSelectedMedia(null);
    setIsPublishing(false);
    onClose();
  }, [onClose]);

  // Demander les permissions
  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à votre galerie pour publier une story.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Sélectionner un média
  const selectMedia = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 secondes pour les vidéos
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      const mediaType: TypeStory = isVideo ? 'video' : 'photo';

      // Vérifier la taille du fichier
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        const sizeMB = fileInfo.size / (1024 * 1024);
        const maxSize = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;

        if (sizeMB > maxSize) {
          Alert.alert(
            'Fichier trop volumineux',
            `Le fichier ne doit pas dépasser ${maxSize} MB. Votre fichier fait ${sizeMB.toFixed(1)} MB.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Convertir en base64
      let base64: string | undefined;
      try {
        const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });

        // Déterminer le type MIME
        let mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
        if (isVideo && !mimeType.startsWith('video/')) {
          mimeType = 'video/mp4';
        }
        if (!isVideo && !mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        }

        base64 = `data:${mimeType};base64,${fileBase64}`;

        setSelectedMedia({
          uri: asset.uri,
          type: mediaType,
          base64,
          mimeType,
        });
      } catch (error) {
        console.error('Erreur conversion base64:', error);
        Alert.alert('Erreur', 'Impossible de traiter ce fichier.');
      }
    } catch (error) {
      console.error('Erreur sélection média:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le média.');
    }
  };

  // Publier la story
  const publishStory = async () => {
    if (!selectedMedia || !selectedMedia.base64) return;

    setIsPublishing(true);

    try {
      const response = await creerStory(selectedMedia.base64, selectedMedia.type);

      if (response.succes) {
        Alert.alert('Story publiée', 'Votre story est maintenant visible.', [
          {
            text: 'OK',
            onPress: () => {
              onStoryCreated();
              handleClose();
            },
          },
        ]);
      } else {
        Alert.alert(
          'Erreur',
          response.message || 'Impossible de publier la story.'
        );
      }
    } catch (error) {
      console.error('Erreur publication story:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la publication.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Annuler la sélection
  const cancelSelection = () => {
    setSelectedMedia(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: themeColors.fond }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + espacements.sm,
              backgroundColor: themeColors.fond,
            },
          ]}
        >
          <Pressable
            style={styles.headerButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={themeColors.texte} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: themeColors.texte }]}>
            Nouvelle story
          </Text>

          {selectedMedia ? (
            <Pressable
              style={[
                styles.publishButton,
                isPublishing && styles.publishButtonDisabled,
              ]}
              onPress={publishStory}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color={couleurs.blanc} />
              ) : (
                <Text style={styles.publishButtonText}>Publier</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {selectedMedia ? (
            // Prévisualisation du média sélectionné
            <View style={styles.previewContainer}>
              {selectedMedia.type === 'video' ? (
                <Video
                  source={{ uri: selectedMedia.uri }}
                  style={styles.previewMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  isMuted={false}
                />
              ) : (
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={styles.previewMedia}
                  resizeMode="contain"
                />
              )}

              {/* Bouton pour changer le média */}
              <Pressable
                style={[styles.changeMediaButton, { backgroundColor: themeColors.fondCard }]}
                onPress={cancelSelection}
              >
                <Ionicons name="refresh" size={20} color={themeColors.texte} />
                <Text style={[styles.changeMediaText, { color: themeColors.texte }]}>
                  Changer
                </Text>
              </Pressable>

              {/* Indicateur de type */}
              <View style={styles.mediaTypeIndicator}>
                <Ionicons
                  name={selectedMedia.type === 'video' ? 'videocam' : 'image'}
                  size={16}
                  color={couleurs.blanc}
                />
                <Text style={styles.mediaTypeText}>
                  {selectedMedia.type === 'video' ? 'Vidéo' : 'Photo'}
                </Text>
              </View>
            </View>
          ) : (
            // Sélection du média
            <View style={styles.selectContainer}>
              <LinearGradient
                colors={[couleurs.primaire, couleurs.secondaire]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.selectIconContainer}
              >
                <Ionicons name="images" size={48} color={couleurs.blanc} />
              </LinearGradient>

              <Text style={[styles.selectTitle, { color: themeColors.texte }]}>
                Créer une story
              </Text>

              <Text style={[styles.selectSubtitle, { color: themeColors.texteSecondaire }]}>
                Partagez un moment avec vos amis.{'\n'}
                Votre story sera visible pendant 24h.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  pressed && styles.selectButtonPressed,
                ]}
                onPress={selectMedia}
              >
                <LinearGradient
                  colors={[couleurs.primaire, couleurs.primaireDark]}
                  style={styles.selectButtonGradient}
                >
                  <Ionicons name="add" size={24} color={couleurs.blanc} />
                  <Text style={styles.selectButtonText}>
                    Choisir une photo ou vidéo
                  </Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={18} color={themeColors.texteSecondaire} />
                  <Text style={[styles.infoText, { color: themeColors.texteSecondaire }]}>
                    Durée : 24 heures
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="videocam-outline" size={18} color={themeColors.texteSecondaire} />
                  <Text style={[styles.infoText, { color: themeColors.texteSecondaire }]}>
                    Vidéo : max 60 sec
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingBottom: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
  },
  publishButton: {
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    minWidth: 80,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  changeMediaButton: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    gap: espacements.xs,
  },
  changeMediaText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  mediaTypeIndicator: {
    position: 'absolute',
    top: espacements.lg,
    right: espacements.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
    gap: espacements.xs,
  },
  mediaTypeText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  selectContainer: {
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  selectIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.xl,
  },
  selectTitle: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    marginBottom: espacements.sm,
  },
  selectSubtitle: {
    fontSize: typographie.tailles.base,
    textAlign: 'center',
    marginBottom: espacements.xxl,
    lineHeight: 22,
  },
  selectButton: {
    borderRadius: rayons.full,
    overflow: 'hidden',
  },
  selectButtonPressed: {
    opacity: 0.8,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    gap: espacements.sm,
  },
  selectButtonText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
  },
  infoContainer: {
    marginTop: espacements.xxl,
    gap: espacements.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  infoText: {
    fontSize: typographie.tailles.sm,
  },
});

export default StoryCreator;
