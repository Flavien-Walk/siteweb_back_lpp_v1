/**
 * Conversation - Écran de chat style Instagram
 * Avec édition de messages, photos de profil et temps réel
 * V2: Draft média, fullscreen viewer, réactions, reply-to, swipe reply
 */

import React, { useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  ActionSheetIOS,
  Modal,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

import { espacements } from '../../../src/constantes/theme';
import createStyles from '../../../src/features/conversation/conversation.styles';
import KeyboardView from '../../../src/composants/KeyboardView';
import { useUser } from '../../../src/contexts/UserContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Avatar, VideoPlayerModal, ImageViewerModal, HeartAnimation, SwipeableScreen } from '../../../src/composants';
import { ANIMATION_CONFIG } from '../../../src/hooks/useAnimations';
import { useDoubleTap } from '../../../src/hooks/useDoubleTap';
import {
  Message,
  Utilisateur,
  TypeReaction,
} from '../../../src/services/messagerie';
import { getVideoThumbnail } from '../../../src/utils/mediaUtils';
import {
  useConversation,
  REACTIONS,
  DELAI_EDITION_MS,
  type DraftMedia,
  type ConversationInfo,
} from '../../../src/features/conversation/useConversation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;
const SWIPE_DEADZONE = 15; // Deadzone avant de décider horizontal vs vertical

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
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
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
        hitSlop={{ left: -60 }}
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
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  const inputContainerRef = useRef<View>(null);

  const {
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
    fullscreenVideoUrl,
    fullscreenImageUrl,
    setFullscreenVideoUrl,
    setFullscreenImageUrl,
    reactionPickerMessage,
    setReactionPickerMessage,
    flatListRef,
  } = useConversation(id);

  // Keyboard handling: scroll to end when keyboard opens
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 50 : 150);
    });

    return () => {
      keyboardShowListener.remove();
    };
  }, [flatListRef]);

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

  // Obtenir l'emoji de réaction pour l'affichage
  const getReactionEmoji = (type: TypeReaction): string => {
    return REACTIONS.find(r => r.type === type)?.emoji || '👍';
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

  // Contenu principal de la conversation
  const conversationContent = (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardView style={styles.keyboardContainer}>
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

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>
              {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'écrit...' : 'écrivent...'}
            </Text>
          </View>
        )}

        {/* Bottom area: Reply + Draft + Input */}
        <View style={[styles.bottomArea, {
          paddingBottom: insets.bottom || espacements.md,
        }]}>
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
                placeholderTextColor={couleurs.texteMuted}
                value={messageTexte}
                onChangeText={handleTextChange}
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
                  onPress={saveEdition}
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
      </KeyboardView>
    </View>
  );

  return (
    <SwipeableScreen>
      {conversationContent}
    </SwipeableScreen>
  );
}
