/**
 * Conversation - Écran de chat style Instagram
 * Avec édition de messages, photos de profil et temps réel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import { Avatar, AnimatedPressable } from '../../../src/composants';
import { ANIMATION_CONFIG } from '../../../src/hooks/useAnimations';
import {
  getMessages,
  envoyerMessage,
  marquerConversationLue,
  toggleMuetConversation,
  retirerParticipantGroupe,
  modifierMessage,
  supprimerMessage,
  Message,
  Utilisateur,
} from '../../../src/services/messagerie';

interface ConversationInfo {
  _id: string;
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  participants: Utilisateur[];
}

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
      console.error('Erreur chargement messages:', error);
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
  // Réduit de 2s à 10s pour économiser la batterie et les requêtes API
  // Plus fréquent que la liste car on est dans une conversation active
  // TODO: Remplacer par WebSocket pour temps réel optimal
  useEffect(() => {
    const interval = setInterval(() => {
      if (!chargement && id) {
        chargerMessages(true); // Silencieux
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [chargerMessages, chargement, id]);

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

  // Envoyer un message
  const handleEnvoyer = async () => {
    if (!messageTexte.trim() || envoiEnCours || !id) return;

    const contenu = messageTexte.trim();
    setMessageTexte('');
    setEnvoiEnCours(true);

    try {
      const reponse = await envoyerMessage(contenu, { conversationId: id });
      if (reponse.succes && reponse.data) {
        setMessages((prev) => [...prev, reponse.data!.message]);
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

  // Long press sur un message
  const handleLongPressMessage = (message: Message) => {
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

  // Sélectionner une image
  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      Alert.alert('Info', "L'envoi d'images sera bientôt disponible !");
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
              // Naviguer vers le profil
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
      // Pour les groupes, afficher les options
      showOptions();
    } else {
      // Pour les conversations privées, aller au profil
      const autre = getAutreParticipant();
      if (autre) {
        router.push({
          pathname: '/(app)/utilisateur/[id]',
          params: { id: autre._id },
        });
      }
    }
  };

  // Render message
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const estMoi = item.estMoi;
    const showSeparator = shouldShowDateSeparator(index);
    const autreParticipant = getAutreParticipant();

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

    // Déterminer si on affiche l'avatar (messages de l'autre personne)
    const showAvatar = !estMoi;
    const avatarUrl = conversation?.estGroupe ? item.expediteur.avatar : autreParticipant?.avatar;
    const initiales = item.expediteur.prenom?.[0] || '?';

    // Détecter si c'est un message récent (moins de 2 secondes)
    const messageAge = Date.now() - new Date(item.dateCreation).getTime();
    const isRecentMessage = messageAge < 2000;

    return (
      <View>
        {showSeparator && (
          <Text style={styles.dateSeparator}>{formatDateSeparateur(item.dateCreation)}</Text>
        )}
        <AnimatedPressable
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={500}
          scaleOnPress={0.98}
        >
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

            <View style={[styles.messageBubble, estMoi ? styles.messageBubbleMoi : styles.messageBubbleAutre]}>
              {/* Nom de l'expéditeur (groupes uniquement) */}
              {!estMoi && conversation?.estGroupe && (
                <Text style={styles.messageAuteur}>{item.expediteur.prenom}</Text>
              )}

              {/* Contenu */}
              {item.type === 'image' ? (
                <Image source={{ uri: item.contenu }} style={styles.messageImage} />
              ) : (
                <Text style={[styles.messageTexte, estMoi && styles.messageTexteMoi]}>
                  {item.contenu}
                </Text>
              )}

              {/* Heure + indicateurs */}
              <View style={styles.messageFooter}>
                {item.modifie && (
                  <Text style={[styles.messageModifie, estMoi && styles.messageModifieMoi]}>
                    modifié
                  </Text>
                )}
                <Text style={[styles.messageHeure, estMoi && styles.messageHeureMoi]}>
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
            </View>

              {/* Espace pour aligner les messages envoyés */}
              {estMoi && <View style={styles.messageAvatarSpacer} />}
            </View>
          </AnimatedMessageBubble>
        </AnimatedPressable>
      </View>
    );
  };

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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesContainer}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || espacements.md }]}>
        <Pressable style={styles.inputAction} onPress={handleSelectImage}>
          <Ionicons name="image-outline" size={24} color={couleurs.primaire} />
        </Pressable>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={couleurs.textePlaceholder}
            value={messageTexte}
            onChangeText={setMessageTexte}
            multiline
            maxLength={2000}
          />
        </View>

        {messageTexte.trim() ? (
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
    </KeyboardAvoidingView>
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
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInitiales: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
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
  messagesContainer: {
    padding: espacements.md,
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
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarInitiales: {
    fontSize: 10,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.lg,
  },
  messageBubbleMoi: {
    backgroundColor: couleurs.primaire,
    borderBottomRightRadius: rayons.xs,
  },
  messageBubbleAutre: {
    backgroundColor: couleurs.fondCard,
    borderBottomLeftRadius: rayons.xs,
  },
  messageAuteur: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
    marginBottom: 2,
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
    width: 200,
    height: 200,
    borderRadius: rayons.md,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
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
  messageCheckmark: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
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
    maxHeight: 120,
  },
  input: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    paddingVertical: espacements.sm,
    maxHeight: 100,
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
});
