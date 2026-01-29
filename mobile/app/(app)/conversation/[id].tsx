/**
 * Conversation - Écran de chat full screen style Instagram
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import {
  getMessages,
  envoyerMessage,
  marquerConversationLue,
  toggleMuetConversation,
  retirerParticipantGroupe,
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

  // Charger les messages
  const chargerMessages = useCallback(async () => {
    if (!id) return;

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
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    chargerMessages();
  }, [chargerMessages]);

  // Rafraîchir périodiquement (polling simple)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!chargement && id) {
        chargerMessages();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [chargerMessages, chargement, id]);

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
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
      setMessageTexte(contenu); // Restaurer le message
    } finally {
      setEnvoiEnCours(false);
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
      // TODO: Upload image et envoyer comme message type 'image'
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
              // TODO: Naviguer vers le profil
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

  // Render message
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const estMoi = item.estMoi;
    const showSeparator = shouldShowDateSeparator(index);

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

    return (
      <View>
        {showSeparator && (
          <Text style={styles.dateSeparator}>{formatDateSeparateur(item.dateCreation)}</Text>
        )}
        <View style={[styles.messageRow, estMoi && styles.messageRowMoi]}>
          {/* Avatar pour les messages des autres (groupes) */}
          {!estMoi && conversation?.estGroupe && (
            <View style={styles.messageAvatarContainer}>
              {item.expediteur.avatar ? (
                <Image source={{ uri: item.expediteur.avatar }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarInitiales}>
                    {item.expediteur.prenom?.[0]}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[styles.messageBubble, estMoi ? styles.messageBubbleMoi : styles.messageBubbleAutre]}>
            {/* Nom de l'expéditeur (groupes) */}
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

            {/* Heure */}
            <Text style={[styles.messageHeure, estMoi && styles.messageHeureMoi]}>
              {formatHeure(item.dateCreation)}
              {estMoi && (
                <Text>
                  {' '}
                  <Ionicons
                    name={item.lecteurs.length > 1 ? 'checkmark-done' : 'checkmark'}
                    size={12}
                    color={item.lecteurs.length > 1 ? couleurs.secondaire : couleurs.blanc}
                  />
                </Text>
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Obtenir le nom et l'avatar de la conversation
  const getConversationDisplay = () => {
    if (!conversation) return { nom: '', avatar: null, initiales: '' };

    if (conversation.estGroupe) {
      return {
        nom: conversation.nomGroupe || 'Groupe',
        avatar: conversation.imageGroupe,
        initiales: conversation.nomGroupe?.substring(0, 2).toUpperCase() || 'GR',
        sousTitre: `${conversation.participants.length} participants`,
      };
    }

    const userId = utilisateur?.id;
    const autre = conversation.participants.find((p) => p._id !== userId);
    return {
      nom: autre ? `${autre.prenom} ${autre.nom}` : 'Conversation',
      avatar: autre?.avatar,
      initiales: autre ? `${autre.prenom[0]}${autre.nom[0]}`.toUpperCase() : '?',
      sousTitre: undefined,
    };
  };

  const { nom, avatar, initiales, sousTitre } = getConversationDisplay();

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>

        <Pressable style={styles.headerInfo} onPress={showOptions}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          ) : (
            <LinearGradient
              colors={conversation?.estGroupe ? ['#10B981', '#059669'] : [couleurs.primaire, couleurs.primaireDark]}
              style={styles.headerAvatarPlaceholder}
            >
              <Text style={styles.headerInitiales}>{initiales}</Text>
            </LinearGradient>
          )}
          <View style={styles.headerTexts}>
            <Text style={styles.headerNom} numberOfLines={1}>
              {nom}
            </Text>
            {sousTitre && <Text style={styles.headerSousTitre}>{sousTitre}</Text>}
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
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarInitiales: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.bold,
    color: couleurs.texteSecondaire,
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
  messageHeure: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageHeureMoi: {
    color: 'rgba(255,255,255,0.7)',
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
});
