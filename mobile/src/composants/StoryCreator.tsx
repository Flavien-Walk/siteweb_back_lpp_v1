/**
 * StoryCreator - Modal de création de story
 * Permet de prendre une photo/vidéo avec la caméra ou choisir depuis la galerie
 * UI inspirée d'Instagram : actions en bas, design épuré
 */

import React, { useState, useCallback, useRef } from 'react';
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
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';
import { creerStory, TypeStory, FilterPreset, StoryLocation } from '../services/stories';
import DurationSelector, { StoryDuration } from './DurationSelector';
import ExpirationSelector, { ExpirationMinutes } from './ExpirationSelector';
import FilterSelector from './FilterSelector';
import LocationPicker from './LocationPicker';
import { getFilterOverlay } from '../utils/imageFilters';
import {
  StoryWidget,
  StoryWidgetType,
  createDefaultTransform,
  LinkWidget,
  TextWidget,
  EmojiWidget,
  TimeWidget,
  LocationWidget,
} from '../types/storyWidgets';
import {
  WidgetToolbar,
  DraggableWidget,
  WidgetRenderer,
  LinkEditorSheet,
  TextEditorSheet,
  EmojiPicker,
  LinkEditorData,
  TextEditorData,
} from './stories';

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

  // V2 - États pour les nouvelles options
  const [duration, setDuration] = useState<StoryDuration>(7);
  const [filter, setFilter] = useState<FilterPreset>('normal');
  const [location, setLocation] = useState<StoryLocation | null>(null);

  // V3 - Durée de vie de la story (expiration)
  const [expirationMinutes, setExpirationMinutes] = useState<ExpirationMinutes>(1440); // 24h par défaut

  // V4 - Système de widgets
  const [widgets, setWidgets] = useState<StoryWidget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [linkEditorVisible, setLinkEditorVisible] = useState(false);
  const [textEditorVisible, setTextEditorVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // Swipe-to-close vers la gauche
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
  const VELOCITY_THRESHOLD = 500;
  const translateX = useRef(new Animated.Value(0)).current;
  const isValidSwipe = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const isClosing = useRef(false);

  const resetSwipePosition = useCallback(() => {
    hasTriggeredHaptic.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [translateX]);

  const animateClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isClosing.current = false;
      translateX.setValue(0);
      handleClose();
    });
  }, [translateX, handleClose]);

  const onSwipeGesture = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!isValidSwipe.current || isClosing.current) return;

      const { translationX } = event.nativeEvent;
      // Limiter le swipe vers la gauche uniquement (valeur négative)
      const clampedX = Math.min(0, Math.max(translationX, -SCREEN_WIDTH));
      translateX.setValue(clampedX);

      // Haptic feedback au seuil
      if (Math.abs(clampedX) > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (Math.abs(clampedX) < SWIPE_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
    },
    [translateX]
  );

  const onSwipeStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { state, translationX, velocityX } = event.nativeEvent;

      if (state === State.BEGAN) {
        isValidSwipe.current = true;
        hasTriggeredHaptic.current = false;
      }

      if (state === State.END || state === State.CANCELLED) {
        if (!isValidSwipe.current) {
          resetSwipePosition();
          return;
        }

        // Fermer si on dépasse le seuil ou si le swipe est rapide vers la gauche
        const shouldClose =
          translationX < -SWIPE_THRESHOLD ||
          (velocityX < -VELOCITY_THRESHOLD && translationX < -50);

        if (shouldClose) {
          animateClose();
        } else {
          resetSwipePosition();
        }

        isValidSwipe.current = false;
      }
    },
    [resetSwipePosition, animateClose]
  );

  // Reset state à la fermeture
  const handleClose = useCallback(() => {
    setSelectedMedia(null);
    setIsPublishing(false);
    // Reset V2 options
    setDuration(7);
    setFilter('normal');
    setLocation(null);
    // Reset V3 option
    setExpirationMinutes(1440);
    // Reset V4 widgets
    setWidgets([]);
    setSelectedWidgetId(null);
    onClose();
  }, [onClose]);

  // V4 - Fonctions de gestion des widgets
  const generateWidgetId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addWidget = (type: StoryWidgetType, data: any) => {
    const newWidget = {
      id: generateWidgetId(),
      type,
      transform: createDefaultTransform(),
      zIndex: widgets.length,
      data,
    } as StoryWidget;
    setWidgets((prev) => [...prev, newWidget]);
    setSelectedWidgetId(newWidget.id);
  };

  const updateWidgetTransform = (id: string, transform: StoryWidget['transform']) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, transform } : w))
    );
  };

  const deleteWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    if (selectedWidgetId === id) {
      setSelectedWidgetId(null);
    }
  };

  const handleAddWidget = (type: StoryWidgetType) => {
    switch (type) {
      case 'link':
        setLinkEditorVisible(true);
        break;
      case 'text':
        setTextEditorVisible(true);
        break;
      case 'emoji':
        setEmojiPickerVisible(true);
        break;
      case 'time':
        addWidget('time', { format: '24h', style: 'badge' });
        break;
      case 'location':
        if (location) {
          addWidget('location', { label: location.label, lat: location.lat, lng: location.lng });
        } else {
          Alert.alert('Localisation', 'Ajoutez d\'abord une localisation avec le bouton dédié.');
        }
        break;
      default:
        break;
    }
  };

  const handleSaveLink = (data: LinkEditorData) => {
    addWidget('link', { url: data.url, label: data.label, style: data.style });
    setLinkEditorVisible(false);
  };

  const handleSaveText = (data: TextEditorData) => {
    addWidget('text', data);
    setTextEditorVisible(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    addWidget('emoji', { emoji });
  };

  // Demander les permissions galerie
  const requestGalleryPermissions = async (): Promise<boolean> => {
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

  // Demander les permissions caméra (+ micro pour vidéo)
  const requestCameraPermissions = async (needsMicrophone: boolean): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Permission caméra requise',
        'Veuillez autoriser l\'accès à la caméra pour prendre une photo ou vidéo.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (needsMicrophone) {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    return true;
  };

  // Traiter un asset média (commun à caméra et galerie)
  const processMediaAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<void> => {
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
    try {
      const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });

      let mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
      if (isVideo && !mimeType.startsWith('video/')) {
        mimeType = 'video/mp4';
      }
      if (!isVideo && !mimeType.startsWith('image/')) {
        mimeType = 'image/jpeg';
      }

      const base64 = `data:${mimeType};base64,${fileBase64}`;

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
  };

  // Prendre une photo avec la caméra
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions(false);
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processMediaAsset(result.assets[0]);
    } catch (error) {
      console.error('Erreur capture photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    }
  };

  // Filmer une vidéo avec la caméra
  const recordVideo = async () => {
    const hasPermission = await requestCameraPermissions(true);
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processMediaAsset(result.assets[0]);
    } catch (error) {
      console.error('Erreur capture vidéo:', error);
      Alert.alert('Erreur', 'Impossible de filmer la vidéo.');
    }
  };

  // Choisir depuis la galerie
  const selectFromGallery = async () => {
    const hasPermission = await requestGalleryPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processMediaAsset(result.assets[0]);
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
      // V2 - Passer les options (durée, localisation, filtre)
      // V3 - Ajouter la durée de vie (expiration)
      // V4 - Ajouter les widgets
      const response = await creerStory(selectedMedia.base64, selectedMedia.type, {
        durationSec: duration,
        location: location || undefined,
        filterPreset: filter,
        expirationMinutes: expirationMinutes,
        widgets: widgets.length > 0 ? widgets : undefined,
      });

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

  // Composant bouton d'action
  const ActionButton = ({
    icon,
    label,
    sublabel,
    onPress,
    iconColor,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sublabel?: string;
    onPress: () => void;
    iconColor: string;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: themeColors.fondCard },
        pressed && styles.actionButtonPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.actionIconWrapper, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={22} color={couleurs.blanc} />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={[styles.actionLabel, { color: themeColors.texte }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.actionSublabel, { color: themeColors.texteSecondaire }]}>
            {sublabel}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors.texteSecondaire} />
    </Pressable>
  );

  // Indicateur de swipe (flèche sur le bord droit)
  const indicatorOpacity = translateX.interpolate({
    inputRange: [-60, -20, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const indicatorTranslateX = translateX.interpolate({
    inputRange: [-100, 0],
    outputRange: [-15, 10],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.swipeContainer}>
        {/* Indicateur de swipe sur le bord droit */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            {
              opacity: indicatorOpacity,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.swipeIndicatorCircle}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.95)" />
          </View>
        </Animated.View>

        <PanGestureHandler
          onGestureEvent={onSwipeGesture}
          onHandlerStateChange={onSwipeStateChange}
          activeOffsetX={-15}
          failOffsetX={15}
          failOffsetY={[-20, 20]}
        >
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: themeColors.fond,
                transform: [{ translateX }],
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  paddingTop: insets.top + espacements.sm,
                  borderBottomColor: themeColors.bordure,
                },
              ]}
            >
              <Pressable
                style={styles.closeButton}
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
            <View style={styles.headerPlaceholder} />
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {selectedMedia ? (
            // Prévisualisation du média sélectionné + Options V2
            <ScrollView
              style={styles.previewScrollView}
              contentContainerStyle={styles.previewScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Preview média */}
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
                  <View style={styles.previewImageWrapper}>
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.previewMedia}
                      resizeMode="contain"
                    />
                    {/* Overlay du filtre pour preview */}
                    {filter !== 'normal' && (
                      <View
                        style={[
                          styles.filterOverlayPreview,
                          {
                            backgroundColor: getFilterOverlay(filter).overlayColor,
                            opacity: getFilterOverlay(filter).overlayOpacity || 0.2,
                          },
                        ]}
                      />
                    )}
                  </View>
                )}

                {/* V4 - Layer des widgets */}
                <View style={styles.widgetLayer} pointerEvents="box-none">
                  {widgets.map((widget) => (
                    <DraggableWidget
                      key={widget.id}
                      widget={widget}
                      isEditing={true}
                      isSelected={selectedWidgetId === widget.id}
                      onSelect={setSelectedWidgetId}
                      onTransformChange={updateWidgetTransform}
                      onDelete={deleteWidget}
                      containerHeight={SCREEN_HEIGHT * 0.45}
                    >
                      <WidgetRenderer widget={widget} isEditing />
                    </DraggableWidget>
                  ))}
                </View>

                {/* Badge type de média */}
                <View style={styles.mediaTypeBadge}>
                  <Ionicons
                    name={selectedMedia.type === 'video' ? 'videocam' : 'image'}
                    size={14}
                    color={couleurs.blanc}
                  />
                  <Text style={styles.mediaTypeText}>
                    {selectedMedia.type === 'video' ? 'Vidéo' : 'Photo'}
                  </Text>
                </View>

                {/* Bouton changer */}
                <Pressable
                  style={[styles.changeButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                  onPress={cancelSelection}
                >
                  <Ionicons name="refresh" size={18} color={couleurs.blanc} />
                  <Text style={styles.changeButtonText}>Changer</Text>
                </Pressable>
              </View>

              {/* V2 - Options de personnalisation */}
              <View style={[styles.optionsContainer, { backgroundColor: themeColors.fond }]}>
                {/* V4 - Toolbar pour ajouter des widgets */}
                <WidgetToolbar
                  onAddWidget={handleAddWidget}
                  disabled={widgets.length >= 10}
                />

                {/* V3 - Sélecteur de durée de vie (expiration) */}
                <ExpirationSelector value={expirationMinutes} onChange={setExpirationMinutes} />

                {/* Sélecteur de durée d'affichage */}
                <DurationSelector value={duration} onChange={setDuration} />

                {/* Sélecteur de filtre (uniquement pour les photos) */}
                {selectedMedia.type === 'photo' && (
                  <FilterSelector
                    imageUri={selectedMedia.uri}
                    value={filter}
                    onChange={setFilter}
                  />
                )}

                {/* Sélecteur de localisation */}
                <LocationPicker value={location} onChange={setLocation} />
              </View>
            </ScrollView>
          ) : (
            // Sélection du média
            <View style={styles.selectContainer}>
              {/* Zone illustrative */}
              <View style={styles.illustrationContainer}>
                <LinearGradient
                  colors={[couleurs.primaireLight, 'transparent']}
                  style={styles.illustrationGlow}
                />
                <View style={[styles.illustrationCircle, { borderColor: themeColors.bordure }]}>
                  <Ionicons name="sparkles" size={40} color={couleurs.primaire} />
                </View>
                <Text style={[styles.illustrationTitle, { color: themeColors.texte }]}>
                  Partagez un moment
                </Text>
                <Text style={[styles.illustrationSubtitle, { color: themeColors.texteSecondaire }]}>
                  Visible par vos amis pendant 24h
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <ActionButton
                  icon="camera"
                  label="Prendre une photo"
                  sublabel="Utiliser la caméra"
                  onPress={takePhoto}
                  iconColor={couleurs.primaire}
                />

                <ActionButton
                  icon="videocam"
                  label="Filmer une vidéo"
                  sublabel="60 secondes max"
                  onPress={recordVideo}
                  iconColor={couleurs.secondaire}
                />

                <ActionButton
                  icon="images"
                  label="Choisir dans la galerie"
                  sublabel="Photos et vidéos"
                  onPress={selectFromGallery}
                  iconColor={couleurs.accent}
                />
              </View>

              {/* Footer info */}
              <View style={[styles.footerInfo, { paddingBottom: insets.bottom + espacements.lg }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={themeColors.texteMuted} />
                <Text style={[styles.footerText, { color: themeColors.texteMuted }]}>
                  Seuls vos amis peuvent voir vos stories
                </Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </PanGestureHandler>
  </View>

      {/* V4 - Modales d'édition des widgets */}
      <LinkEditorSheet
        visible={linkEditorVisible}
        onClose={() => setLinkEditorVisible(false)}
        onSave={handleSaveLink}
      />

      <TextEditorSheet
        visible={textEditorVisible}
        onClose={() => setTextEditorVisible(false)}
        onSave={handleSaveText}
      />

      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelect={handleSelectEmoji}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  swipeIndicator: {
    position: 'absolute',
    right: 10,
    top: '45%',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  swipeIndicatorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  container: {
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 25,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -espacements.sm,
  },
  headerTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
  },
  headerPlaceholder: {
    width: 80,
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
  },

  // Preview V2
  previewScrollView: {
    flex: 1,
  },
  previewScrollContent: {
    flexGrow: 1,
  },
  previewContainer: {
    height: SCREEN_HEIGHT * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: couleurs.noir,
  },
  previewImageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  filterOverlayPreview: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  widgetLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  optionsContainer: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
    paddingBottom: espacements.xl,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: espacements.lg,
    right: espacements.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    gap: espacements.xs,
  },
  mediaTypeText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  changeButton: {
    position: 'absolute',
    bottom: espacements.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderRadius: rayons.full,
    gap: espacements.sm,
  },
  changeButtonText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },

  // Select
  selectContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  illustrationContainer: {
    alignItems: 'center',
    paddingTop: espacements.xxxl,
    paddingHorizontal: espacements.xl,
  },
  illustrationGlow: {
    position: 'absolute',
    top: espacements.xl,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  illustrationCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.lg,
  },
  illustrationTitle: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    marginBottom: espacements.xs,
  },
  illustrationSubtitle: {
    fontSize: typographie.tailles.base,
    textAlign: 'center',
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: espacements.lg,
    gap: espacements.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.md,
    borderRadius: rayons.lg,
    gap: espacements.md,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
  },
  actionSublabel: {
    fontSize: typographie.tailles.sm,
    marginTop: 2,
  },

  // Footer
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.xl,
  },
  footerText: {
    fontSize: typographie.tailles.sm,
  },
});

export default StoryCreator;
