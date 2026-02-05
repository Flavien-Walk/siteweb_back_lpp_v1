/**
 * Conversation - Écran de chat style Instagram
 * Avec édition de messages, photos de profil et temps réel
 * V2: Draft média, fullscreen viewer, réactions, reply-to, swipe reply
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
  Modal,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import { Avatar, VideoPlayerModal, ImageViewerModal, HeartAnimation } from '../../../src/composants';
import { ANIMATION_CONFIG } from '../../../src/hooks/useAnimations';
import { useDoubleTap } from '../../../src/hooks/useDoubleTap';
import {
  getMessages,
  envoyerMessage,
  marquerConversationLue,
  toggleMuetConversation,
  retirerParticipantGroupe,
  modifierMessage,
  supprimerMessage,
  reagirMessage,
  Message,
  Utilisateur,
  TypeMessage,
  TypeReaction,
} from '../../../src/services/messagerie';
import { getVideoThumbnail } from '../../../src/utils/mediaUtils';
import * as FileSystem from 'expo-file-system/legacy';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;
const SWIPE_DEADZONE = 15; // Deadzone avant de décider horizontal vs vertical

// Types pour les nouvelles fonctionnalités
interface DraftMedia {
  type: 'image' | 'video';
  uri: string;
  base64?: string;
  mime?: string;
  duration?: number;
}

interface ConversationInfo {
  _id: string;
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  participants: Utilisateur[];
}

// Réactions disponibles
const REACTIONS: { type: TypeReaction; emoji: string }[] = [
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
  { type: 'like', emoji: '👍' },
];

// Délai maximum pour éditer un message (15 minutes)
const DELAI_EDITION_MS = 15 * 60 * 1000;

// Composant animé pour les bulles de message
const AnimatedMessageBubble = ({
  children,
  estMoi,
  isNew = false
}: {
  children: React.ReactNode;
  estMoi: boolean;
  isNew?: boolean;
}) => {
  const slideAnim = useRef(new Animated.Value(isNew ? (estMoi ? 30 : -30) : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isNew ? 0.8 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          ...ANIMATION_CONFIG.spring,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          ...ANIMATION_CONFIG.spring,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, slideAnim, scaleAnim, opacityAnim, estMoi]);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [
          { translateX: slideAnim },
          { scale: scaleAnim },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

// Composant message avec swipe pour répondre - optimisé pour ne pas bloquer le scroll
interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
}

const SwipeableMessage = memo(({ children, onSwipeReply }: SwipeableMessageProps) => {
  const translateX = useRef(new Animated.Value(0)).current;

  // Animated event optimisé avec useNativeDriver
  const onGestureEvent = useMemo(
    () => Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    ),
    [translateX]
  );

  const onHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { state, translationX: tx, translationY: ty } = event.nativeEvent;

    if (state === State.END) {
      // Vérifier le geste FINAL : horizontal et au-delà du seuil
      const absX = Math.abs(tx);
      const absY = Math.abs(ty);
      const isHorizontalSwipe = absX > absY * 1.2; // Ratio plus permissif pour le geste final

      if (tx > SWIPE_THRESHOLD && isHorizontalSwipe) {
        // Déclencher reply AVANT le reset animation
        onSwipeReply();
      }

      // Reset position avec animation fluide
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    } else if (state === State.CANCELLED) {
      // Juste reset sans action
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }
  }, [onSwipeReply, translateX]);

  // Clamp translation: seulement swipe droit, max 80px
  const clampedTranslateX = useMemo(
    () => translateX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    }),
    [translateX]
  );

  // Opacité icône reply basée sur distance
  const replyIconOpacity = useMemo(
    () => translateX.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    [translateX]
  );

  return (
    <View style={styles.swipeableContainer}>
      {/* Icône reply indicator */}
      <Animated.View style={[styles.swipeReplyIcon, { opacity: replyIconOpacity }]}>
        <Ionicons name="arrow-undo" size={20} color={couleurs.primaire} />
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={SWIPE_DEADZONE}
        failOffsetY={[-8, 8]}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View style={{ transform: [{ translateX: clampedTranslateX }] }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { utilisateur } = useUser();
  const flatListRef = useRef<FlatList>(null);

  // State
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chargement, setChargement] = useState(true);
  const [messageTexte, setMessageTexte] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Édition de message
  const [messageEnEdition, setMessageEnEdition] = useState<Message | null>(null);
  const [contenuEdition, setContenuEdition] = useState('');
  const [modalEditionVisible, setModalEditionVisible] = useState(false);

  // Draft média (preview avant envoi)
  const [draftMedia, setDraftMedia] = useState<DraftMedia | null>(null);

  // Fullscreen média viewer - utilise les mêmes composants que le feed
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  // Réactions
  const [reactionPickerMessage, setReactionPickerMessage] = useState<Message | null>(null);

  // Reply to message
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Animation coeur double-tap
  const [heartAnimationMessage, setHeartAnimationMessage] = useState<string | null>(null);

  // Android keyboard spacer - même approche que UnifiedCommentsSheet qui marche
  // On mesure l'overlap entre l'input et le clavier, puis on ajoute un spacer
  const [keyboardSpacer, setKeyboardSpacer] = useState(0);
  const inputContainerRef = useRef<View>(null);
  const KEYBOARD_EXTRA_MARGIN = 28; // Marge de sécurité au-dessus du clavier (plus d'espace)

  // Charger les messages
  const chargerMessages = useCallback(async (silencieux = false) => {
    if (!id) return;

    if (!silencieux) {
      setChargement(true);
    }

    try {
      const reponse = await getMessages(id);
      if (reponse.succes && reponse.data) {
        setConversation(reponse.data.conversation);
        setMessages(reponse.data.messages);
        // Marquer comme lu
        marquerConversationLue(id);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement messages:', error);
      if (!silencieux) {
        Alert.alert('Erreur', 'Impossible de charger les messages');
      }
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    chargerMessages();
  }, [chargerMessages]);

  // Polling pour mise à jour temps réel (toutes les 10 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!chargement && id) {
        chargerMessages(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [chargerMessages, chargement, id]);

  // Android: keyboard spacer dynamique - même approche que UnifiedCommentsSheet
  // Mesure l'overlap entre l'inputContainer et le clavier, ajoute un spacer pour pousser vers le haut
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      const keyboardY = e.endCoordinates.screenY; // Position Y du haut du clavier

      // Mesurer l'inputContainer pour calculer l'overlap
      inputContainerRef.current?.measureInWindow((x, y, width, height) => {
        const inputBottom = y + height;
        const overlap = inputBottom - keyboardY + KEYBOARD_EXTRA_MARGIN;

        if (__DEV__) {
          console.log('⌨️ [KEYBOARD SHOW] spacer calc:', {
            inputBottom,
            keyboardY,
            overlap,
            willAddSpacer: overlap > 0,
          });
        }

        if (overlap > 0) {
          setKeyboardSpacer(overlap);
        }
      });

      // Scroll vers le bas après un court délai
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardSpacer(0);
      if (__DEV__) {
        console.log('⌨️ [KEYBOARD HIDE] spacer reset to 0');
      }
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // iOS: scroll vers le bas quand clavier s'ouvre
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Vérifier si un message peut être édité (moins de 15 minutes)
  const peutEditerMessage = (message: Message) => {
    if (!message.estMoi) return false;
    const dateCreation = new Date(message.dateCreation).getTime();
    const maintenant = Date.now();
    return (maintenant - dateCreation) < DELAI_EDITION_MS;
  };

  // Calculer le temps restant pour éditer
  const getTempsRestantEdition = (message: Message) => {
    const dateCreation = new Date(message.dateCreation).getTime();
    const maintenant = Date.now();
    const tempsEcoule = maintenant - dateCreation;
    const tempsRestant = DELAI_EDITION_MS - tempsEcoule;

    if (tempsRestant <= 0) return null;

    const minutes = Math.floor(tempsRestant / 60000);
    return `${minutes} min restantes`;
  };

  // Envoyer un message (texte ou draft média)
  const handleEnvoyer = async () => {
    // Si on a un draft média, l'envoyer
    if (draftMedia) {
      return handleEnvoyerDraft();
    }

    if (!messageTexte.trim() || envoiEnCours || !id) return;

    const contenu = messageTexte.trim();
    setMessageTexte('');
    setEnvoiEnCours(true);

    try {
      const reponse = await envoyerMessage(contenu, {
        conversationId: id,
        replyTo: replyingTo?._id,
      });
      if (reponse.succes && reponse.data) {
        setMessages((prev) => [...prev, reponse.data!.message]);
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
      setMessageTexte(contenu);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // Ouvrir le modal d'édition
  const ouvrirEdition = (message: Message) => {
    if (!peutEditerMessage(message)) {
      Alert.alert('Impossible', 'Ce message ne peut plus être modifié (délai de 15 minutes dépassé)');
      return;
    }
    setMessageEnEdition(message);
    setContenuEdition(message.contenu);
    setModalEditionVisible(true);
  };

  // Sauvegarder l'édition
  const sauvegarderEdition = async () => {
    if (!messageEnEdition || !contenuEdition.trim() || !id) return;

    try {
      const reponse = await modifierMessage(id, messageEnEdition._id, contenuEdition.trim());
      if (reponse.succes && reponse.data) {
        setMessages(prev => prev.map(m =>
          m._id === messageEnEdition._id
            ? { ...m, contenu: contenuEdition.trim(), modifie: true }
            : m
        ));
        setModalEditionVisible(false);
        setMessageEnEdition(null);
        setContenuEdition('');
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de modifier le message');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le message');
    }
  };

  // Supprimer un message pour tout le monde
  const handleSupprimerMessage = async (message: Message) => {
    if (!peutEditerMessage(message) || !id) return;

    Alert.alert(
      'Supprimer pour tous',
      'Ce message sera supprimé pour tout le monde. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const reponse = await supprimerMessage(id, message._id);
              if (reponse.succes) {
                setMessages(prev => prev.filter(m => m._id !== message._id));
              } else {
                Alert.alert('Erreur', reponse.message || 'Impossible de supprimer le message');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le message');
            }
          },
        },
      ]
    );
  };

  // Long press sur un message - ouvre le picker de réactions
  const handleLongPressMessage = useCallback((message: Message) => {
    setReactionPickerMessage(message);
  }, []);

  // Options supplémentaires pour mes propres messages
  const handleMessageOptions = (message: Message) => {
    if (!message.estMoi) return;

    const peutModifier = peutEditerMessage(message);

    if (Platform.OS === 'ios') {
      const options = peutModifier
        ? ['Modifier', 'Supprimer pour tous', 'Copier', 'Annuler']
        : ['Copier', 'Annuler'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: peutModifier ? 1 : undefined,
        },
        (buttonIndex) => {
          if (peutModifier) {
            if (buttonIndex === 0) ouvrirEdition(message);
            if (buttonIndex === 1) handleSupprimerMessage(message);
          }
        }
      );
    } else {
      Alert.alert(
        'Options',
        undefined,
        peutModifier
          ? [
              { text: 'Modifier', onPress: () => ouvrirEdition(message) },
              { text: 'Supprimer pour tous', style: 'destructive', onPress: () => handleSupprimerMessage(message) },
              { text: 'Copier' },
              { text: 'Annuler', style: 'cancel' },
            ]
          : [
              { text: 'Copier' },
              { text: 'Annuler', style: 'cancel' },
            ]
      );
    }
  };

  // Générer un ID unique pour le message (idempotence)
  const generateClientMessageId = () => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Sélectionner un média (image ou vidéo) - MISE EN DRAFT
  const handleSelectMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire pour envoyer des médias.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsEditing: false,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const isVideo = asset.type === 'video';

    if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) {
      Alert.alert('Fichier trop volumineux', 'La taille maximale est de 25 MB.');
      return;
    }

    const mimeType = isVideo
      ? (asset.uri.endsWith('.mov') ? 'video/quicktime' : 'video/mp4')
      : 'image/jpeg';

    setDraftMedia({
      type: isVideo ? 'video' : 'image',
      uri: asset.uri,
      mime: mimeType,
      duration: asset.duration ?? undefined,
    });
  };

  // Annuler le draft média
  const handleCancelDraft = () => {
    setDraftMedia(null);
  };

  // Envoyer le draft média
  const handleEnvoyerDraft = async () => {
    if (!draftMedia || !id) return;

    setEnvoiEnCours(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(draftMedia.uri, {
        encoding: 'base64',
      });

      const dataUrl = `data:${draftMedia.mime};base64,${base64}`;
      const clientMessageId = generateClientMessageId();

      const reponse = await envoyerMessage(dataUrl, {
        conversationId: id,
        type: draftMedia.type,
        clientMessageId,
        replyTo: replyingTo?._id,
      });

      if (reponse.succes && reponse.data) {
        setMessages((prev) => [...prev, reponse.data!.message]);
        setDraftMedia(null);
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible d\'envoyer le média');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur envoi média:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le média');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // Ouvrir média en fullscreen - utilise les mêmes composants que le feed
  const handleOpenFullscreen = useCallback((message: Message) => {
    if (message.type === 'video') {
      setFullscreenVideoUrl(message.contenu);
    } else if (message.type === 'image') {
      setFullscreenImageUrl(message.contenu);
    }
  }, []);

  // Double-tap pour liker un message
  const handleDoubleTapLike = useCallback(async (message: Message) => {
    // Animation coeur
    setHeartAnimationMessage(message._id);

    // Toggle réaction coeur
    const userId = utilisateur?.id;
    const myReaction = message.reactions?.find(r => r.userId === userId);
    const newType = myReaction?.type === 'heart' ? null : 'heart';

    try {
      const reponse = await reagirMessage(message._id, newType);
      if (reponse.succes && reponse.data) {
        setMessages(prev => prev.map(m =>
          m._id === message._id
            ? { ...m, reactions: reponse.data!.reactions }
            : m
        ));
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur ajout réaction:', error);
    }
  }, [utilisateur?.id]);

  // Ajouter/supprimer une réaction
  const handleAddReaction = async (message: Message, reactionType: TypeReaction) => {
    setReactionPickerMessage(null);

    const userId = utilisateur?.id;
    const myReaction = message.reactions?.find(r => r.userId === userId);
    const newReactionType = myReaction?.type === reactionType ? null : reactionType;

    try {
      const reponse = await reagirMessage(message._id, newReactionType);
      if (reponse.succes && reponse.data) {
        setMessages(prev => prev.map(m =>
          m._id === message._id
            ? { ...m, reactions: reponse.data!.reactions }
            : m
        ));
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur réaction:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la réaction');
    }
  };

  // Répondre à un message
  const handleReplyToMessage = useCallback((message: Message) => {
    setReplyingTo(message);
    setReactionPickerMessage(null);
  }, []);

  // Annuler le reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Menu d'options
  const showOptions = () => {
    if (Platform.OS === 'ios') {
      const options = conversation?.estGroupe
        ? ['Voir les participants', 'Mettre en sourdine', 'Quitter le groupe', 'Annuler']
        : ['Voir le profil', 'Mettre en sourdine', 'Annuler'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: conversation?.estGroupe ? 2 : undefined,
        },
        async (buttonIndex) => {
          if (conversation?.estGroupe) {
            if (buttonIndex === 0) {
              Alert.alert(
                'Participants',
                conversation.participants.map((p) => `${p.prenom} ${p.nom}`).join('\n')
              );
            } else if (buttonIndex === 1) {
              handleToggleMuet();
            } else if (buttonIndex === 2) {
              handleQuitterGroupe();
            }
          } else {
            if (buttonIndex === 0) {
              const autre = getAutreParticipant();
              if (autre) {
                router.push({
                  pathname: '/(app)/utilisateur/[id]',
                  params: { id: autre._id },
                });
              }
            } else if (buttonIndex === 1) {
              handleToggleMuet();
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Options',
        undefined,
        conversation?.estGroupe
          ? [
              {
                text: 'Voir les participants',
                onPress: () =>
                  Alert.alert(
                    'Participants',
                    conversation.participants.map((p) => `${p.prenom} ${p.nom}`).join('\n')
                  ),
              },
              { text: 'Mettre en sourdine', onPress: handleToggleMuet },
              { text: 'Quitter le groupe', style: 'destructive', onPress: handleQuitterGroupe },
              { text: 'Annuler', style: 'cancel' },
            ]
          : [
              {
                text: 'Voir le profil',
                onPress: () => {
                  const autre = getAutreParticipant();
                  if (autre) {
                    router.push({
                      pathname: '/(app)/utilisateur/[id]',
                      params: { id: autre._id },
                    });
                  }
                },
              },
              { text: 'Mettre en sourdine', onPress: handleToggleMuet },
              { text: 'Annuler', style: 'cancel' },
            ]
      );
    }
  };

  const handleToggleMuet = async () => {
    if (!id) return;
    try {
      const reponse = await toggleMuetConversation(id);
      if (reponse.succes && reponse.data) {
        Alert.alert(
          'Info',
          reponse.data.estMuet ? 'Conversation en sourdine' : 'Notifications activées'
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les paramètres');
    }
  };

  const handleQuitterGroupe = async () => {
    const userId = utilisateur?.id;
    if (!id || !userId) return;

    Alert.alert(
      'Quitter le groupe',
      'Êtes-vous sûr de vouloir quitter ce groupe ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await retirerParticipantGroupe(id, userId);
              router.back();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de quitter le groupe');
            }
          },
        },
      ]
    );
  };

  // Formater l'heure
  const formatHeure = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formater la date pour les séparateurs
  const formatDateSeparateur = (dateStr: string) => {
    const date = new Date(dateStr);
    const maintenant = new Date();
    const hier = new Date(maintenant);
    hier.setDate(hier.getDate() - 1);

    if (date.toDateString() === maintenant.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === hier.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Vérifier si on doit afficher un séparateur de date
  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].dateCreation).toDateString();
    const previousDate = new Date(messages[index - 1].dateCreation).toDateString();
    return currentDate !== previousDate;
  };

  // Obtenir l'avatar de l'autre personne (conversation privée)
  const getAutreParticipant = () => {
    if (!conversation || conversation.estGroupe) return null;
    const userId = utilisateur?.id;
    return conversation.participants.find((p) => p._id !== userId);
  };

  // Naviguer vers le profil de l'autre utilisateur
  const naviguerVersProfil = () => {
    if (!conversation) return;

    if (conversation.estGroupe) {
      showOptions();
    } else {
      const autre = getAutreParticipant();
      if (autre) {
        router.push({
          pathname: '/(app)/utilisateur/[id]',
          params: { id: autre._id },
        });
      }
    }
  };

  // Obtenir l'emoji de réaction pour l'affichage
  const getReactionEmoji = (type: TypeReaction): string => {
    return REACTIONS.find(r => r.type === type)?.emoji || '👍';
  };

  // Callback stable pour swipe reply
  const handleSwipeReply = useCallback((message: Message) => {
    handleReplyToMessage(message);
  }, [handleReplyToMessage]);

  // Composant message individuel avec handlers - MEMOIZED
  const MessageItem = memo(({
    item,
    showSeparator,
    autreParticipant,
    estGroupe,
    heartAnimationId,
    onDoubleTap,
    onLongPress,
    onOpenFullscreen,
    onSwipeReply,
    onHeartAnimationEnd,
  }: {
    item: Message;
    showSeparator: boolean;
    autreParticipant: Utilisateur | null | undefined;
    estGroupe: boolean;
    heartAnimationId: string | null;
    onDoubleTap: (msg: Message) => void;
    onLongPress: (msg: Message) => void;
    onOpenFullscreen: (msg: Message) => void;
    onSwipeReply: (msg: Message) => void;
    onHeartAnimationEnd: () => void;
  }) => {
    const estMoi = item.estMoi;

    // Message système
    if (item.type === 'systeme') {
      return (
        <View>
          {showSeparator && (
            <Text style={styles.dateSeparator}>{formatDateSeparateur(item.dateCreation)}</Text>
          )}
          <View style={styles.messageSysteme}>
            <Text style={styles.messageSystemeText}>{item.contenu}</Text>
          </View>
        </View>
      );
    }

    const showAvatar = !estMoi;
    const avatarUrl = estGroupe ? item.expediteur.avatar : autreParticipant?.avatar;
    const messageAge = Date.now() - new Date(item.dateCreation).getTime();
    const isRecentMessage = messageAge < 2000;

    // Réactions groupées par type - memoized
    const reactionsGrouped = useMemo(() => {
      return item.reactions?.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<TypeReaction, number>) || {};
    }, [item.reactions]);

    const hasReactions = Object.keys(reactionsGrouped).length > 0;
    const isMedia = item.type === 'image' || item.type === 'video';

    // Callbacks stables
    const handleTapDoubleTap = useCallback(() => onDoubleTap(item), [item, onDoubleTap]);
    const handleTapSingle = useCallback(() => {
      if (isMedia) onOpenFullscreen(item);
    }, [item, isMedia, onOpenFullscreen]);
    const handleLongPressCallback = useCallback(() => onLongPress(item), [item, onLongPress]);
    const handleSwipeReplyCallback = useCallback(() => onSwipeReply(item), [item, onSwipeReply]);

    // Hook double tap - single tap ouvre fullscreen pour médias, double tap = like
    const handleTap = useDoubleTap({
      onDoubleTap: handleTapDoubleTap,
      onSingleTap: isMedia ? handleTapSingle : undefined,
      delayMs: 250,
    });

    const messageContent = (
      <AnimatedMessageBubble estMoi={estMoi} isNew={isRecentMessage}>
        <View style={[styles.messageRow, estMoi && styles.messageRowMoi]}>
          {/* Avatar pour les messages reçus */}
          {showAvatar && (
            <View style={styles.messageAvatarContainer}>
              <Avatar
                uri={avatarUrl}
                prenom={item.expediteur.prenom}
                nom={item.expediteur.nom}
                taille={28}
              />
            </View>
          )}

          <View style={[styles.messageContentWrapper, estMoi && styles.messageContentWrapperMoi]}>
            {/* ReplyTo preview */}
            {item.replyTo && (
              <View style={[styles.replyToPreview, estMoi && styles.replyToPreviewMoi]}>
                <View style={styles.replyToBar} />
                <View style={styles.replyToContent}>
                  <Text style={[styles.replyToAuthor, estMoi && styles.replyToAuthorMoi]} numberOfLines={1}>
                    {item.replyTo.expediteur.prenom} {item.replyTo.expediteur.nom}
                  </Text>
                  <Text style={styles.replyToText} numberOfLines={1}>
                    {item.replyTo.type === 'image' ? '📷 Photo' :
                     item.replyTo.type === 'video' ? '🎥 Vidéo' :
                     item.replyTo.contenu}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              onPress={handleTap}
              onLongPress={handleLongPressCallback}
              delayLongPress={400}
            >
              <View style={[
                styles.messageBubble,
                estMoi ? styles.messageBubbleMoi : styles.messageBubbleAutre,
                isMedia && styles.messageBubbleMedia,
              ]}>
                {/* Nom de l'expéditeur (groupes uniquement) */}
                {!estMoi && estGroupe && (
                  <Text style={styles.messageAuteur}>{item.expediteur.prenom}</Text>
                )}

                {/* Contenu */}
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.contenu }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                ) : item.type === 'video' ? (
                  <View style={styles.messageVideoContainer}>
                    <Image
                      source={{ uri: getVideoThumbnail(item.contenu) }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                    <View style={styles.videoPlayOverlay}>
                      <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.messageTexte, estMoi && styles.messageTexteMoi]}>
                    {item.contenu}
                  </Text>
                )}

                {/* Heure + indicateurs */}
                <View style={[styles.messageFooter, isMedia && styles.messageFooterMedia]}>
                  {item.modifie && (
                    <Text style={[styles.messageModifie, estMoi && styles.messageModifieMoi]}>
                      modifié
                    </Text>
                  )}
                  <Text style={[styles.messageHeure, estMoi && styles.messageHeureMoi, isMedia && styles.messageHeureMedia]}>
                    {formatHeure(item.dateCreation)}
                  </Text>
                  {estMoi && (
                    <Ionicons
                      name={(item.lecteurs?.length || 0) > 1 ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={(item.lecteurs?.length || 0) > 1 ? couleurs.secondaire : 'rgba(255,255,255,0.7)'}
                      style={styles.messageCheckmark}
                    />
                  )}
                </View>

                {/* Heart animation */}
                {heartAnimationId === item._id && (
                  <HeartAnimation
                    visible={true}
                    onAnimationEnd={onHeartAnimationEnd}
                    size={60}
                  />
                )}
              </View>
            </Pressable>

            {/* Réactions affichées sous la bulle */}
            {hasReactions && (
              <View style={[styles.reactionsContainer, estMoi && styles.reactionsContainerMoi]}>
                {Object.entries(reactionsGrouped).map(([type, count]) => {
                  const countNum = count as number;
                  return (
                    <View key={type} style={styles.reactionBadge}>
                      <Text style={styles.reactionEmoji}>{getReactionEmoji(type as TypeReaction)}</Text>
                      {countNum > 1 && <Text style={styles.reactionCount}>{countNum}</Text>}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Espace pour aligner les messages envoyés */}
          {estMoi && <View style={styles.messageAvatarSpacer} />}
        </View>
      </AnimatedMessageBubble>
    );

    return (
      <View>
        {showSeparator && (
          <Text style={styles.dateSeparator}>{formatDateSeparateur(item.dateCreation)}</Text>
        )}
        <SwipeableMessage onSwipeReply={handleSwipeReplyCallback}>
          {messageContent}
        </SwipeableMessage>
      </View>
    );
  });

  // Clear heart animation callback stable
  const clearHeartAnimation = useCallback(() => setHeartAnimationMessage(null), []);

  // Autre participant memoized
  const autreParticipant = useMemo(() => getAutreParticipant(), [conversation, utilisateur?.id]);
  const isGroupConversation = conversation?.estGroupe ?? false;

  // Render message - optimisé avec props stables
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const showSeparator = index === 0 ||
      new Date(item.dateCreation).toDateString() !==
      new Date(messages[index - 1].dateCreation).toDateString();

    return (
      <MessageItem
        item={item}
        showSeparator={showSeparator}
        autreParticipant={autreParticipant}
        estGroupe={isGroupConversation}
        heartAnimationId={heartAnimationMessage}
        onDoubleTap={handleDoubleTapLike}
        onLongPress={handleLongPressMessage}
        onOpenFullscreen={handleOpenFullscreen}
        onSwipeReply={handleSwipeReply}
        onHeartAnimationEnd={clearHeartAnimation}
      />
    );
  }, [messages, autreParticipant, isGroupConversation, heartAnimationMessage, handleDoubleTapLike, handleLongPressMessage, handleOpenFullscreen, handleSwipeReply, clearHeartAnimation]);

  // KeyExtractor stable
  const keyExtractor = useCallback((item: Message) => item._id, []);

  // Obtenir le nom et l'avatar de la conversation
  const getConversationDisplay = () => {
    if (!conversation) return { nom: '', avatar: null, prenom: '', nomUtilisateur: '', sousTitre: undefined, estGroupe: false };

    if (conversation.estGroupe) {
      return {
        nom: conversation.nomGroupe || 'Groupe',
        avatar: conversation.imageGroupe,
        prenom: conversation.nomGroupe?.substring(0, 1) || 'G',
        nomUtilisateur: conversation.nomGroupe?.substring(1, 2) || 'R',
        sousTitre: `${conversation.participants.length} participants`,
        estGroupe: true,
      };
    }

    const userId = utilisateur?.id;
    const autre = conversation.participants.find((p) => p._id !== userId);
    return {
      nom: autre ? `${autre.prenom} ${autre.nom}` : 'Conversation',
      avatar: autre?.avatar,
      prenom: autre?.prenom || '',
      nomUtilisateur: autre?.nom || '',
      sousTitre: undefined,
      estGroupe: false,
    };
  };

  const { nom, avatar, prenom, nomUtilisateur, sousTitre, estGroupe } = getConversationDisplay();

  if (chargement) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>

          <Pressable style={styles.headerInfo} onPress={naviguerVersProfil}>
            <Avatar
              uri={avatar}
              prenom={prenom}
              nom={nomUtilisateur}
              taille={40}
              gradientColors={estGroupe ? ['#10B981', '#059669'] : [couleurs.primaire, couleurs.primaireDark]}
            />
            <View style={styles.headerTexts}>
              <Text style={styles.headerNom} numberOfLines={1}>
                {nom}
              </Text>
              {sousTitre ? (
                <Text style={styles.headerSousTitre}>{sousTitre}</Text>
              ) : (
                <Text style={styles.headerSousTitre}>Appuyez pour voir le profil</Text>
              )}
            </View>
          </Pressable>

          <Pressable onPress={showOptions} style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={20} color={couleurs.texte} />
          </Pressable>
        </View>

        {/* Messages - optimisé pour performance */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Optimisations performance
          removeClippedSubviews={Platform.OS === 'android'}
          windowSize={11}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          // Callback scroll - scroll to end on content size change
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={48} color={couleurs.texteMuted} />
              <Text style={styles.emptyMessagesText}>
                Aucun message. Commencez la conversation !
              </Text>
            </View>
          }
        />

        {/* Bottom area: Reply + Draft + Input */}
        {/* Structure identique à UnifiedCommentsSheet: composer dans le flux + spacer Android */}
        <View style={[styles.bottomArea, { paddingBottom: insets.bottom || espacements.md }]}>
          {/* Reply preview */}
          {replyingTo && (
            <View style={styles.replyBar}>
              <View style={styles.replyBarContent}>
                <View style={styles.replyBarIndicator} />
                <View style={styles.replyBarInfo}>
                  <Text style={styles.replyBarAuthor}>
                    {replyingTo.estMoi ? 'Vous' : `${replyingTo.expediteur.prenom} ${replyingTo.expediteur.nom}`}
                  </Text>
                  <Text style={styles.replyBarText} numberOfLines={1}>
                    {replyingTo.type === 'image' ? '📷 Photo' :
                     replyingTo.type === 'video' ? '🎥 Vidéo' :
                     replyingTo.contenu}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleCancelReply} style={styles.replyBarClose}>
                <Ionicons name="close" size={20} color={couleurs.texteMuted} />
              </Pressable>
            </View>
          )}

          {/* Draft média preview */}
          {draftMedia && (
            <View style={styles.draftPreview}>
              <View style={styles.draftMediaContainer}>
                {draftMedia.type === 'image' ? (
                  <Image source={{ uri: draftMedia.uri }} style={styles.draftMediaImage} />
                ) : (
                  <View style={styles.draftVideoContainer}>
                    <Image source={{ uri: draftMedia.uri }} style={styles.draftMediaImage} />
                    <View style={styles.draftVideoOverlay}>
                      <Ionicons name="videocam" size={24} color={couleurs.blanc} />
                      {draftMedia.duration && (
                        <Text style={styles.draftVideoDuration}>
                          {Math.floor(draftMedia.duration / 1000)}s
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                <Pressable onPress={handleCancelDraft} style={styles.draftCloseButton}>
                  <Ionicons name="close-circle" size={24} color={couleurs.blanc} />
                </Pressable>
              </View>
              <Text style={styles.draftHint}>Appuyez sur envoyer pour partager</Text>
            </View>
          )}

          {/* Input - ref pour mesurer position (Android keyboard spacer) */}
          <View ref={inputContainerRef} style={styles.inputContainer}>
            <Pressable style={styles.inputAction} onPress={handleSelectMedia} disabled={envoiEnCours || !!draftMedia}>
              <Ionicons name="attach-outline" size={24} color={(envoiEnCours || draftMedia) ? couleurs.texteMuted : couleurs.primaire} />
            </Pressable>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={draftMedia ? 'Ajouter une légende...' : 'Message...'}
                placeholderTextColor={couleurs.textePlaceholder}
                value={messageTexte}
                onChangeText={setMessageTexte}
                multiline
                scrollEnabled
                textAlignVertical="top"
                maxLength={2000}
                blurOnSubmit={false}
              />
            </View>

            {(messageTexte.trim() || draftMedia) ? (
              <Pressable
                style={[styles.sendButton, envoiEnCours && styles.sendButtonDisabled]}
                onPress={handleEnvoyer}
                disabled={envoiEnCours}
              >
                {envoiEnCours ? (
                  <ActivityIndicator size="small" color={couleurs.blanc} />
                ) : (
                  <Ionicons name="send" size={20} color={couleurs.blanc} />
                )}
              </Pressable>
            ) : (
              <Pressable style={styles.inputAction}>
                <Ionicons name="mic-outline" size={24} color={couleurs.primaire} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Android: Spacer dynamique pour pousser le contenu au-dessus du clavier */}
        {/* Même approche que UnifiedCommentsSheet qui fonctionne */}
        {Platform.OS === 'android' && keyboardSpacer > 0 && (
          <View style={{ height: keyboardSpacer, backgroundColor: couleurs.fond }} />
        )}

        {/* Modal d'édition */}
        <Modal
          visible={modalEditionVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalEditionVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalEditionVisible(false)}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier le message</Text>
                {messageEnEdition && (
                  <Text style={styles.modalSubtitle}>
                    {getTempsRestantEdition(messageEnEdition)}
                  </Text>
                )}
              </View>

              <TextInput
                style={styles.modalInput}
                value={contenuEdition}
                onChangeText={setContenuEdition}
                multiline
                autoFocus
                maxLength={2000}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setModalEditionVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveBtn, !contenuEdition.trim() && styles.modalSaveBtnDisabled]}
                  onPress={sauvegarderEdition}
                  disabled={!contenuEdition.trim()}
                >
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal picker réactions */}
        <Modal
          visible={!!reactionPickerMessage}
          animationType="fade"
          transparent
          onRequestClose={() => setReactionPickerMessage(null)}
        >
          <Pressable
            style={styles.reactionPickerOverlay}
            onPress={() => setReactionPickerMessage(null)}
          >
            <View style={styles.reactionPickerContainer}>
              <View style={styles.reactionPickerContent}>
                {/* Réactions */}
                <View style={styles.reactionPickerRow}>
                  {REACTIONS.map((reaction) => {
                    const isSelected = reactionPickerMessage?.reactions?.some(
                      r => r.userId === utilisateur?.id && r.type === reaction.type
                    );
                    return (
                      <Pressable
                        key={reaction.type}
                        style={[styles.reactionPickerItem, isSelected && styles.reactionPickerItemSelected]}
                        onPress={() => reactionPickerMessage && handleAddReaction(reactionPickerMessage, reaction.type)}
                      >
                        <Text style={styles.reactionPickerEmoji}>{reaction.emoji}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Actions supplémentaires */}
                <View style={styles.reactionPickerActions}>
                  <Pressable
                    style={styles.reactionPickerAction}
                    onPress={() => {
                      if (reactionPickerMessage) {
                        handleReplyToMessage(reactionPickerMessage);
                      }
                    }}
                  >
                    <Ionicons name="arrow-undo-outline" size={20} color={couleurs.texte} />
                    <Text style={styles.reactionPickerActionText}>Répondre</Text>
                  </Pressable>

                  {reactionPickerMessage?.estMoi && (
                    <Pressable
                      style={styles.reactionPickerAction}
                      onPress={() => {
                        setReactionPickerMessage(null);
                        if (reactionPickerMessage) {
                          handleMessageOptions(reactionPickerMessage);
                        }
                      }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texte} />
                      <Text style={styles.reactionPickerActionText}>Plus</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* VideoPlayerModal - même composant que le feed */}
        <VideoPlayerModal
          visible={!!fullscreenVideoUrl}
          videoUrl={fullscreenVideoUrl}
          onClose={() => setFullscreenVideoUrl(null)}
          autoPlay={true}
        />

        {/* ImageViewerModal - même composant que le feed */}
        <ImageViewerModal
          visible={!!fullscreenImageUrl}
          imageUrl={fullscreenImageUrl}
          onClose={() => setFullscreenImageUrl(null)}
        />
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    gap: espacements.sm,
  },
  headerBack: {
    padding: espacements.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
  },
  headerTexts: {
    flex: 1,
  },
  headerNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  headerSousTitre: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  headerAction: {
    padding: espacements.sm,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: espacements.md,
    paddingBottom: espacements.md,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
  },
  emptyMessagesText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
    textAlign: 'center',
  },
  dateSeparator: {
    textAlign: 'center',
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginVertical: espacements.md,
    textTransform: 'capitalize',
  },
  messageSysteme: {
    alignSelf: 'center',
    backgroundColor: couleurs.fondCard,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    marginVertical: espacements.sm,
  },
  messageSystemeText: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  // Swipeable container
  swipeableContainer: {
    position: 'relative',
  },
  swipeReplyIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -10,
    zIndex: -1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: espacements.sm,
    alignItems: 'flex-end',
  },
  messageRowMoi: {
    justifyContent: 'flex-end',
  },
  messageAvatarContainer: {
    marginRight: espacements.xs,
  },
  messageAvatarSpacer: {
    width: 36,
    marginLeft: espacements.xs,
  },
  // Message content wrapper - alignement sans maxWidth
  messageContentWrapper: {
    flexShrink: 1,
    maxWidth: '80%',
  },
  messageContentWrapperMoi: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  messageBubbleMoi: {
    backgroundColor: couleurs.primaire,
    borderBottomRightRadius: rayons.xs,
  },
  messageBubbleAutre: {
    backgroundColor: couleurs.fondCard,
    borderBottomLeftRadius: rayons.xs,
  },
  messageBubbleMedia: {
    padding: 0,
    overflow: 'hidden',
  },
  messageAuteur: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
    marginBottom: 2,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
  },
  messageTexte: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    lineHeight: 22,
  },
  messageTexteMoi: {
    color: couleurs.blanc,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: rayons.lg,
  },
  messageVideoContainer: {
    width: 220,
    height: 220,
    borderRadius: rayons.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageFooterMedia: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rayons.sm,
  },
  messageModifie: {
    fontSize: 10,
    fontStyle: 'italic',
    color: couleurs.texteMuted,
  },
  messageModifieMoi: {
    color: 'rgba(255,255,255,0.6)',
  },
  messageHeure: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
  },
  messageHeureMoi: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageHeureMedia: {
    color: couleurs.blanc,
  },
  messageCheckmark: {
    marginLeft: 2,
  },
  // Reply preview dans la bulle
  replyToPreview: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: rayons.md,
    padding: espacements.sm,
    marginBottom: espacements.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyToPreviewMoi: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyToBar: {
    width: 3,
    height: 32,
    backgroundColor: couleurs.primaire,
    borderRadius: 2,
    marginRight: espacements.sm,
  },
  replyToContent: {
    flex: 1,
  },
  replyToAuthor: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  replyToAuthorMoi: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyToText: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  // Réactions sous la bulle
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionsContainerMoi: {
    justifyContent: 'flex-end',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginLeft: 2,
  },
  // Bottom area (reply + draft + input)
  bottomArea: {
    backgroundColor: couleurs.fond,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  // Reply bar au-dessus de l'input
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarIndicator: {
    width: 3,
    height: 36,
    backgroundColor: couleurs.primaire,
    borderRadius: 2,
    marginRight: espacements.sm,
  },
  replyBarInfo: {
    flex: 1,
  },
  replyBarAuthor: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  replyBarText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  replyBarClose: {
    padding: espacements.xs,
  },
  // Draft média preview
  draftPreview: {
    backgroundColor: couleurs.fondCard,
    padding: espacements.md,
    alignItems: 'center',
  },
  draftMediaContainer: {
    position: 'relative',
    borderRadius: rayons.md,
    overflow: 'hidden',
  },
  draftMediaImage: {
    width: 150,
    height: 150,
    borderRadius: rayons.md,
  },
  draftVideoContainer: {
    position: 'relative',
  },
  draftVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: rayons.md,
  },
  draftVideoDuration: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    marginTop: 4,
  },
  draftCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: rayons.full,
  },
  draftHint: {
    marginTop: espacements.sm,
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.sm,
  },
  inputAction: {
    padding: espacements.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.xl,
    paddingHorizontal: espacements.md,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    paddingVertical: Platform.OS === 'ios' ? espacements.sm : espacements.xs,
    paddingTop: Platform.OS === 'android' ? espacements.sm : undefined,
    minHeight: 24,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: couleurs.primaire,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  // Modal d'édition
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacements.lg,
  },
  modalContent: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  modalSubtitle: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    padding: espacements.md,
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: espacements.lg,
    gap: espacements.md,
  },
  modalCancelBtn: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
  },
  modalCancelText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
  },
  modalSaveBtn: {
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  // Picker réactions
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    width: '90%',
    maxWidth: 350,
  },
  reactionPickerContent: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.md,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: espacements.sm,
  },
  reactionPickerItem: {
    padding: espacements.sm,
    borderRadius: rayons.full,
  },
  reactionPickerItemSelected: {
    backgroundColor: couleurs.fondCard,
  },
  reactionPickerEmoji: {
    fontSize: 28,
  },
  reactionPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
    marginTop: espacements.sm,
  },
  reactionPickerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.sm,
    gap: espacements.xs,
  },
  reactionPickerActionText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
  },
});
