/**
 * useConversation - Hook pour la gestion de l'écran de conversation
 * Encapsule état, effets et handlers extraits de conversation/[id].tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  ActionSheetIOS,
  Platform,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useUser } from '../../contexts/UserContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useSocket, MessageSocketEvent, TypingSocketEvent } from '../../contexts/SocketContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
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
} from '../../services/messagerie';

// Types pour les nouvelles fonctionnalités
export interface DraftMedia {
  type: 'image' | 'video';
  uri: string;
  base64?: string;
  mime?: string;
  duration?: number;
}

export interface ConversationInfo {
  _id: string;
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  participants: Utilisateur[];
}

// Réactions disponibles
export const REACTIONS: { type: TypeReaction; emoji: string }[] = [
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
  { type: 'like', emoji: '👍' },
];

// Délai maximum pour éditer un message (15 minutes)
export const DELAI_EDITION_MS = 15 * 60 * 1000;

export interface UseConversationReturn {
  // State
  conversation: ConversationInfo | null;
  messages: Message[];
  chargement: boolean;
  messageTexte: string;
  envoiEnCours: boolean;
  messageEnEdition: Message | null;
  contenuEdition: string;
  setContenuEdition: (text: string) => void;
  modalEditionVisible: boolean;
  setModalEditionVisible: (v: boolean) => void;
  draftMedia: DraftMedia | null;
  replyingTo: Message | null;
  heartAnimationMessage: string | null;
  typingUsers: Map<string, string>;

  // Actions
  chargerMessages: (silencieux?: boolean) => Promise<void>;
  handleTextChange: (text: string) => void;
  handleEnvoyer: () => Promise<void>;
  handleEnvoyerDraft: () => Promise<void>;
  handleCancelDraft: () => void;
  handleSelectMedia: () => Promise<void>;
  handleSupprimerMessage: (message: Message) => Promise<void>;
  handleLongPressMessage: (message: Message) => void;
  handleMessageOptions: (message: Message) => void;
  handleDoubleTapLike: (message: Message) => Promise<void>;
  handleAddReaction: (message: Message, reactionType: TypeReaction) => Promise<void>;
  handleReplyToMessage: (message: Message) => void;
  handleCancelReply: () => void;
  handleSwipeReply: (message: Message) => void;
  handleOpenFullscreen: (message: Message) => void;
  handleToggleMuet: () => Promise<void>;
  handleQuitterGroupe: () => Promise<void>;
  saveEdition: () => Promise<void>;
  clearHeartAnimation: () => void;

  // Fullscreen
  fullscreenVideoUrl: string | null;
  fullscreenImageUrl: string | null;
  setFullscreenVideoUrl: (url: string | null) => void;
  setFullscreenImageUrl: (url: string | null) => void;

  // Reaction picker
  reactionPickerMessage: Message | null;
  setReactionPickerMessage: (msg: Message | null) => void;

  // Refs
  flatListRef: React.RefObject<FlatList | null>;
}

export function useConversation(id: string | undefined): UseConversationReturn {
  const router = useRouter();
  const { utilisateur } = useUser();
  const { applyDelta } = useGamification();
  const flatListRef = useRef<FlatList>(null);

  // Socket pour temps réel
  const {
    isConnected: socketConnected,
    onNewMessage,
    onTyping,
    emitTyping,
    emitMessageRead,
    joinConversation,
    leaveConversation,
  } = useSocket();

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

  // Fullscreen média viewer
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  // Réactions
  const [reactionPickerMessage, setReactionPickerMessage] = useState<Message | null>(null);

  // Reply to message
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Animation coeur double-tap
  const [heartAnimationMessage, setHeartAnimationMessage] = useState<string | null>(null);

  // Typing indicator (qui est en train de taper)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  // ===== HELPERS =====

  const peutEditerMessage = (message: Message) => {
    if (!message.estMoi) return false;
    const dateCreation = new Date(message.dateCreation).getTime();
    const maintenant = Date.now();
    return (maintenant - dateCreation) < DELAI_EDITION_MS;
  };

  const generateClientMessageId = () => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // ===== CORE: Charger les messages =====

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

  // ===== EFFECT: Chargement initial =====

  useEffect(() => {
    chargerMessages();
  }, [chargerMessages]);

  // ===== EFFECT: Socket — Rejoindre/quitter la conversation =====

  useEffect(() => {
    if (id && socketConnected) {
      if (__DEV__) console.log('[CONVERSATION] Joining room:', id);
      joinConversation(id);

      return () => {
        if (__DEV__) console.log('[CONVERSATION] Leaving room:', id);
        leaveConversation(id);
      };
    }
  }, [id, socketConnected, joinConversation, leaveConversation]);

  // ===== EFFECT: Socket — Écouter les nouveaux messages =====

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onNewMessage((event: MessageSocketEvent) => {
      // Vérifier que le message est pour cette conversation
      if (event.conversationId !== id) return;

      if (__DEV__) console.log('[CONVERSATION] Nouveau message reçu via socket:', event.message._id);

      // Convertir le format socket vers le format Message
      const newMessage: Message = {
        _id: event.message._id,
        contenu: event.message.contenu,
        expediteur: event.message.expediteur,
        dateCreation: event.message.dateEnvoi,
        type: 'texte' as TypeMessage,
        estMoi: event.message.expediteur._id === utilisateur?.id,
        estLu: false,
        lecteurs: [],
        reactions: [],
      };

      // Ajouter le message s'il n'existe pas déjà
      setMessages(prev => {
        const exists = prev.some(m => m._id === newMessage._id);
        if (exists) return prev;
        return [...prev, newMessage];
      });

      // Scroll vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Marquer comme lu si c'est pas mon message
      if (!newMessage.estMoi) {
        emitMessageRead(id, newMessage._id);
      }
    });

    return unsubscribe;
  }, [id, utilisateur?.id, onNewMessage, emitMessageRead]);

  // ===== EFFECT: Socket — Écouter les indicateurs de frappe =====

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onTyping((event: TypingSocketEvent) => {
      if (event.conversationId !== id) return;
      if (event.userId === utilisateur?.id) return; // Ignorer mes propres events

      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (event.isTyping) {
          newMap.set(event.userId, event.userName);
        } else {
          newMap.delete(event.userId);
        }
        return newMap;
      });
    });

    return unsubscribe;
  }, [id, utilisateur?.id, onTyping]);

  // ===== EFFECT: Auto-refresh en fallback =====

  useAutoRefresh({
    onRefresh: useCallback(async () => {
      if (id) {
        await chargerMessages(true);
      }
    }, [id, chargerMessages]),
    // Si socket connecté: polling moins fréquent (30s) comme backup
    // Si socket déconnecté: polling fréquent (8s) pour compenser
    pollingInterval: socketConnected ? 30000 : 8000,
    refreshOnFocus: true,
    minRefreshInterval: socketConnected ? 10000 : 3000,
    enabled: !!id && !chargement,
  });

  // ===== EFFECT: Typing timeout cleanup =====

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // ===== HANDLERS =====

  const handleTextChange = useCallback((text: string) => {
    setMessageTexte(text);

    if (!id || !socketConnected) return;

    const now = Date.now();
    // Throttle: émettre max toutes les 2 secondes
    if (now - lastTypingEmitRef.current > 2000) {
      emitTyping(id, true);
      lastTypingEmitRef.current = now;
    }

    // Reset le timeout pour arrêter le typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(id, false);
    }, 3000);
  }, [id, socketConnected, emitTyping]);

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
        // Dedup: socket may have already delivered this message
        setMessages((prev) => {
          const exists = prev.some(m => m._id === reponse.data!.message._id);
          if (exists) return prev;
          return [...prev, reponse.data!.message];
        });
        setReplyingTo(null);
        if (reponse.gamification) applyDelta(reponse.gamification);
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
        // Dedup: socket may have already delivered this message
        setMessages((prev) => {
          const exists = prev.some(m => m._id === reponse.data!.message._id);
          if (exists) return prev;
          return [...prev, reponse.data!.message];
        });
        setDraftMedia(null);
        setReplyingTo(null);
        if (reponse.gamification) applyDelta(reponse.gamification);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Erreur', reponse.message || "Impossible d'envoyer le média");
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur envoi média:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le média");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const handleCancelDraft = () => {
    setDraftMedia(null);
  };

  const handleSelectMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire pour envoyer des médias.");
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

  const handleLongPressMessage = useCallback((message: Message) => {
    setReactionPickerMessage(message);
  }, []);

  // Ouvrir le modal d'édition (interne, utilisé par handleMessageOptions)
  const ouvrirEdition = (message: Message) => {
    if (!peutEditerMessage(message)) {
      Alert.alert('Impossible', 'Ce message ne peut plus être modifié (délai de 15 minutes dépassé)');
      return;
    }
    setMessageEnEdition(message);
    setContenuEdition(message.contenu);
    setModalEditionVisible(true);
  };

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
      Alert.alert('Erreur', "Impossible d'ajouter la réaction");
    }
  };

  const handleReplyToMessage = useCallback((message: Message) => {
    setReplyingTo(message);
    setReactionPickerMessage(null);
  }, []);

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSwipeReply = useCallback((message: Message) => {
    handleReplyToMessage(message);
  }, [handleReplyToMessage]);

  const handleOpenFullscreen = useCallback((message: Message) => {
    if (message.type === 'video') {
      setFullscreenVideoUrl(message.contenu);
    } else if (message.type === 'image') {
      setFullscreenImageUrl(message.contenu);
    }
  }, []);

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

  const clearHeartAnimation = useCallback(() => {
    setHeartAnimationMessage(null);
  }, []);

  const saveEdition = async () => {
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

  return {
    // State
    conversation,
    messages,
    chargement,
    messageTexte,
    envoiEnCours,
    messageEnEdition,
    contenuEdition,
    setContenuEdition,
    modalEditionVisible,
    setModalEditionVisible,
    draftMedia,
    replyingTo,
    heartAnimationMessage,
    typingUsers,

    // Actions
    chargerMessages,
    handleTextChange,
    handleEnvoyer,
    handleEnvoyerDraft,
    handleCancelDraft,
    handleSelectMedia,
    handleSupprimerMessage,
    handleLongPressMessage,
    handleMessageOptions,
    handleDoubleTapLike,
    handleAddReaction,
    handleReplyToMessage,
    handleCancelReply,
    handleSwipeReply,
    handleOpenFullscreen,
    handleToggleMuet,
    handleQuitterGroupe,
    saveEdition,
    clearHeartAnimation,

    // Fullscreen
    fullscreenVideoUrl,
    fullscreenImageUrl,
    setFullscreenVideoUrl,
    setFullscreenImageUrl,

    // Reaction picker
    reactionPickerMessage,
    setReactionPickerMessage,

    // Refs
    flatListRef,
  };
}
