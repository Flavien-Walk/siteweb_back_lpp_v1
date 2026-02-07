/**
 * MessagesTab - Onglet Messages intégré dans l'accueil
 * Version optimisée pour PagerView (sans header de navigation)
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';

import { couleurs, espacements, rayons, typographie } from '../constantes/theme';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { Avatar, AnimatedPressable, SkeletonList, NotificationBadge } from '../composants';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';
import {
  getConversations,
  rechercherUtilisateurs,
  getOuCreerConversationPrivee,
  creerGroupe,
  supprimerConversation,
  Conversation,
  Utilisateur,
} from '../services/messagerie';
import {
  getMesAmis,
  ProfilUtilisateur,
} from '../services/utilisateurs';

interface MessagesTabProps {
  isActive?: boolean;
  onNewConversation?: () => void;
}

const MessagesTab: React.FC<MessagesTabProps> = memo(({ isActive = true, onNewConversation }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur } = useUser();
  const { onNewMessage, isConnected: socketConnected } = useSocket();
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [ongletActif, setOngletActif] = useState<'messages' | 'demandes'>('messages');

  // Nouvelle conversation
  const [modalNouveauVisible, setModalNouveauVisible] = useState(false);
  const [rechercheUtilisateur, setRechercheUtilisateur] = useState('');
  const [utilisateursTrouves, setUtilisateursTrouves] = useState<Utilisateur[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);

  // Nouveau groupe
  const [modeGroupe, setModeGroupe] = useState(false);
  const [participantsSelectionnes, setParticipantsSelectionnes] = useState<Utilisateur[]>([]);
  const [nomGroupe, setNomGroupe] = useState('');

  // Liste d'amis
  const [mesAmis, setMesAmis] = useState<ProfilUtilisateur[]>([]);
  const [chargementAmis, setChargementAmis] = useState(false);
  const [amisIds, setAmisIds] = useState<Set<string>>(new Set());

  // Contacts existants
  const contactsExistants = React.useMemo(() => {
    const contacts: Utilisateur[] = [];
    const idsVus = new Set<string>();

    conversations.forEach(conv => {
      if (!conv.estGroupe && conv.participant && !idsVus.has(conv.participant._id)) {
        contacts.push(conv.participant);
        idsVus.add(conv.participant._id);
      }
      if (conv.participants) {
        conv.participants.forEach(p => {
          if (!idsVus.has(p._id)) {
            contacts.push(p);
            idsVus.add(p._id);
          }
        });
      }
    });

    return contacts;
  }, [conversations]);

  // Charger les conversations
  const chargerConversations = useCallback(async (estRefresh = false, silencieux = false) => {
    if (estRefresh) {
      setRafraichissement(true);
    } else if (!silencieux) {
      setChargement(true);
    }

    try {
      const reponse = await getConversations();
      if (reponse.succes && reponse.data) {
        setConversations(reponse.data.conversations);
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    chargerConversations();
    chargerAmisInitial();
  }, [chargerConversations]);

  // Socket: écouter les nouveaux messages
  useEffect(() => {
    const unsubscribe = onNewMessage(() => {
      chargerConversations(false, true);
    });
    return unsubscribe;
  }, [onNewMessage, chargerConversations]);

  // Charger les amis au démarrage
  const chargerAmisInitial = async () => {
    try {
      const reponse = await getMesAmis();
      if (reponse.succes && reponse.data) {
        const ids = new Set(reponse.data.amis.map(ami => ami._id));
        setAmisIds(ids);
        setMesAmis(reponse.data.amis.filter(ami => ami._id !== utilisateur?.id));
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
  };

  // Polling seulement si l'onglet est actif
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      chargerConversations(false, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [chargerConversations, isActive]);

  // Rafraîchir quand l'onglet devient actif
  useEffect(() => {
    if (isActive) {
      chargerConversations(false, true);
    }
  }, [isActive, chargerConversations]);

  // Recherche utilisateurs
  useEffect(() => {
    const delai = setTimeout(async () => {
      if (rechercheUtilisateur.trim().length >= 2) {
        setChargementRecherche(true);
        try {
          const reponse = await rechercherUtilisateurs(rechercheUtilisateur.trim());
          if (reponse.succes && reponse.data) {
            setUtilisateursTrouves(reponse.data.utilisateurs);
          }
        } catch (error) {
          console.error('Erreur recherche:', error);
        } finally {
          setChargementRecherche(false);
        }
      } else {
        setUtilisateursTrouves([]);
      }
    }, 300);

    return () => clearTimeout(delai);
  }, [rechercheUtilisateur]);

  // Charger amis pour groupe
  const chargerMesAmis = async () => {
    setChargementAmis(true);
    try {
      const reponse = await getMesAmis();
      if (reponse.succes && reponse.data) {
        const amisFiltres = reponse.data.amis.filter(
          (ami) => ami._id !== utilisateur?.id
        );
        setMesAmis(amisFiltres);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    } finally {
      setChargementAmis(false);
    }
  };

  const activerModeGroupe = async () => {
    setModeGroupe(true);
    setParticipantsSelectionnes([]);
    await chargerMesAmis();
  };

  // Filtrer conversations
  const conversationsFiltrees = React.useMemo(() => {
    return conversations.filter((conv) => {
      if (!conv.estGroupe && conv.participant) {
        const estAmi = amisIds.has(conv.participant._id);
        if (ongletActif === 'messages' && !estAmi) return false;
        if (ongletActif === 'demandes' && estAmi) return false;
      }
      if (conv.estGroupe && ongletActif === 'demandes') return false;

      if (recherche.length < 2) return true;
      const rechercheMin = recherche.toLowerCase();

      if (conv.estGroupe) {
        return conv.nomGroupe?.toLowerCase().includes(rechercheMin);
      }

      return `${conv.participant?.prenom} ${conv.participant?.nom}`
        .toLowerCase()
        .includes(rechercheMin);
    });
  }, [conversations, ongletActif, amisIds, recherche]);

  // Compteurs onglets
  const compteurOnglets = React.useMemo(() => {
    let messagesAmis = 0;
    let demandesNonAmis = 0;

    conversations.forEach(conv => {
      if (conv.estGroupe) {
        messagesAmis += conv.messagesNonLus || 0;
      } else if (conv.participant) {
        const estAmi = amisIds.has(conv.participant._id);
        if (estAmi) {
          messagesAmis += conv.messagesNonLus || 0;
        } else {
          demandesNonAmis += conv.messagesNonLus || 0;
        }
      }
    });

    return { messagesAmis, demandesNonAmis };
  }, [conversations, amisIds]);

  const ouvrirConversation = (conv: Conversation) => {
    router.push({
      pathname: '/(app)/conversation/[id]',
      params: { id: conv._id },
    });
  };

  const handleSupprimerConversation = async (convId: string) => {
    Alert.alert(
      'Supprimer la conversation',
      'Cette conversation sera supprimée de votre liste.',
      [
        { text: 'Annuler', style: 'cancel', onPress: () => {
          swipeableRefs.current.get(convId)?.close();
        }},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const reponse = await supprimerConversation(convId);
              if (reponse.succes) {
                setConversations(prev => prev.filter(c => c._id !== convId));
              } else {
                Alert.alert('Erreur', reponse.message || 'Impossible de supprimer');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la conversation');
            }
          },
        },
      ]
    );
  };

  const demarrerConversation = async (user: Utilisateur) => {
    if (modeGroupe) {
      if (!amisIds.has(user._id)) {
        Alert.alert('Ami requis', `${user.prenom} n'est pas dans votre liste d'amis.`);
        return;
      }
      const dejaSelectionne = participantsSelectionnes.find((p) => p._id === user._id);
      if (dejaSelectionne) {
        setParticipantsSelectionnes(participantsSelectionnes.filter((p) => p._id !== user._id));
      } else {
        setParticipantsSelectionnes([...participantsSelectionnes, user]);
      }
    } else {
      if (!amisIds.has(user._id)) {
        Alert.alert(
          'Ami requis',
          `Vous ne pouvez envoyer des messages qu'à vos amis.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Voir le profil',
              onPress: () => {
                setModalNouveauVisible(false);
                router.push(`/utilisateur/${user._id}`);
              },
            },
          ]
        );
        return;
      }
      try {
        const reponse = await getOuCreerConversationPrivee(user._id);
        if (reponse.succes && reponse.data) {
          setModalNouveauVisible(false);
          setRechercheUtilisateur('');
          router.push({
            pathname: '/(app)/conversation/[id]',
            params: { id: reponse.data.conversation._id },
          });
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de créer la conversation');
      }
    }
  };

  const handleCreerGroupe = async () => {
    if (participantsSelectionnes.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un participant');
      return;
    }
    if (!nomGroupe.trim()) {
      Alert.alert('Erreur', 'Entrez un nom pour le groupe');
      return;
    }

    try {
      const reponse = await creerGroupe(
        nomGroupe.trim(),
        participantsSelectionnes.map((p) => p._id)
      );
      if (reponse.succes && reponse.data) {
        setModalNouveauVisible(false);
        resetModalState();
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.groupe._id },
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    }
  };

  const resetModalState = () => {
    setRechercheUtilisateur('');
    setUtilisateursTrouves([]);
    setModeGroupe(false);
    setParticipantsSelectionnes([]);
    setNomGroupe('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const maintenant = new Date();
    const diff = maintenant.getTime() - date.getTime();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (jours === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (jours === 1) {
      return 'Hier';
    } else if (jours < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderRightActions = (convId: string, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.swipeActionsRight, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.swipeActionDelete}
          onPress={() => handleSupprimerConversation(convId)}
        >
          <Ionicons name="trash-outline" size={24} color={couleurs.blanc} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderLeftActions = (conv: Conversation, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });

    return (
      <Animated.View style={[styles.swipeActionsLeft, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.swipeActionMute}
          onPress={() => swipeableRefs.current.get(conv._id)?.close()}
        >
          <Ionicons
            name={conv.estMuet ? 'volume-high-outline' : 'volume-mute-outline'}
            size={24}
            color={couleurs.blanc}
          />
        </Pressable>
      </Animated.View>
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const nom = item.estGroupe
      ? item.nomGroupe
      : `${item.participant?.prenom} ${item.participant?.nom}`;

    const avatar = item.estGroupe
      ? item.imageGroupe
      : item.participant?.avatar;

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current.set(item._id, ref); }}
        renderRightActions={(progress) => renderRightActions(item._id, progress)}
        renderLeftActions={(progress) => renderLeftActions(item, progress)}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
      >
        <AnimatedPressable
          style={styles.conversationItem}
          onPress={() => ouvrirConversation(item)}
          scaleOnPress={0.98}
        >
          <View style={styles.avatarContainer}>
            <Avatar
              uri={avatar}
              prenom={item.estGroupe ? item.nomGroupe?.substring(0, 1) : item.participant?.prenom}
              nom={item.estGroupe ? item.nomGroupe?.substring(1, 2) : item.participant?.nom}
              taille={56}
              gradientColors={item.estGroupe ? ['#10B981', '#059669'] : [couleurs.primaire, couleurs.primaireDark]}
            />
            {item.estGroupe && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={10} color={couleurs.blanc} />
              </View>
            )}
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text
                style={[
                  styles.conversationNom,
                  item.messagesNonLus > 0 && styles.conversationNomNonLu,
                ]}
                numberOfLines={1}
              >
                {nom}
              </Text>
              <Text style={styles.conversationDate}>
                {item.dernierMessage ? formatDate(item.dernierMessage.dateCreation) : ''}
              </Text>
            </View>
            <View style={styles.conversationPreview}>
              <Text
                style={[
                  styles.conversationMessage,
                  item.messagesNonLus > 0 && styles.conversationMessageNonLu,
                ]}
                numberOfLines={1}
              >
                {item.dernierMessage?.contenu || 'Aucun message'}
              </Text>
              <NotificationBadge count={item.messagesNonLus} />
            </View>
          </View>

          {item.estMuet && (
            <Ionicons name="volume-mute" size={16} color={couleurs.texteMuted} />
          )}
        </AnimatedPressable>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header compact pour l'onglet */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable
          style={styles.headerAction}
          onPress={() => setModalNouveauVisible(true)}
        >
          <Ionicons name="create-outline" size={24} color={couleurs.primaire} />
        </Pressable>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={couleurs.texteMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={couleurs.textePlaceholder}
          value={recherche}
          onChangeText={setRecherche}
        />
        {recherche.length > 0 && (
          <Pressable onPress={() => setRecherche('')}>
            <Ionicons name="close-circle" size={20} color={couleurs.texteMuted} />
          </Pressable>
        )}
      </View>

      {/* Onglets Messages / Demandes */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, ongletActif === 'messages' && styles.tabActive]}
          onPress={() => setOngletActif('messages')}
        >
          <Text style={[styles.tabText, ongletActif === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
          {compteurOnglets.messagesAmis > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {compteurOnglets.messagesAmis > 99 ? '99+' : compteurOnglets.messagesAmis}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.tab, ongletActif === 'demandes' && styles.tabActive]}
          onPress={() => setOngletActif('demandes')}
        >
          <Text style={[styles.tabText, ongletActif === 'demandes' && styles.tabTextActive]}>
            Demandes
          </Text>
          {compteurOnglets.demandesNonAmis > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {compteurOnglets.demandesNonAmis > 99 ? '99+' : compteurOnglets.demandesNonAmis}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Liste des conversations */}
      {chargement ? (
        <View style={styles.loadingContainer}>
          <SkeletonList type="conversation" count={5} />
        </View>
      ) : conversationsFiltrees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={ongletActif === 'messages' ? 'chatbubbles-outline' : 'mail-unread-outline'}
            size={64}
            color={couleurs.texteMuted}
          />
          <Text style={styles.emptyText}>
            {recherche.length > 0
              ? 'Aucune conversation trouvée'
              : ongletActif === 'messages'
                ? 'Aucune conversation avec vos amis'
                : 'Aucune demande de message'
            }
          </Text>
          {ongletActif === 'demandes' && (
            <Text style={styles.emptySubtext}>
              Les messages de personnes qui ne sont pas encore vos amis apparaîtront ici
            </Text>
          )}
          {ongletActif === 'messages' && (
            <Pressable
              style={styles.emptyButton}
              onPress={() => setModalNouveauVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Démarrer une conversation</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={conversationsFiltrees}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={() => chargerConversations(true)}
              tintColor={couleurs.primaire}
              colors={[couleurs.primaire]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal nouvelle conversation */}
      <Modal
        visible={modalNouveauVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalNouveauVisible(false);
          resetModalState();
        }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                setModalNouveauVisible(false);
                resetModalState();
              }}
            >
              <Text style={styles.modalCancel}>Annuler</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {modeGroupe ? 'Nouveau groupe' : 'Nouveau message'}
            </Text>
            {modeGroupe ? (
              <Pressable onPress={handleCreerGroupe}>
                <Text style={styles.modalAction}>Créer</Text>
              </Pressable>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          <Pressable
            style={styles.toggleGroupe}
            onPress={() => {
              if (!modeGroupe) {
                activerModeGroupe();
              } else {
                setModeGroupe(false);
                setParticipantsSelectionnes([]);
              }
            }}
          >
            <Ionicons
              name={modeGroupe ? 'people' : 'people-outline'}
              size={20}
              color={modeGroupe ? couleurs.primaire : couleurs.texteSecondaire}
            />
            <Text style={[styles.toggleGroupeText, modeGroupe && styles.toggleGroupeTextActive]}>
              Créer un groupe
            </Text>
          </Pressable>

          {modeGroupe && (
            <View style={styles.groupNameContainer}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Nom du groupe"
                placeholderTextColor={couleurs.textePlaceholder}
                value={nomGroupe}
                onChangeText={setNomGroupe}
              />
            </View>
          )}

          {modeGroupe && participantsSelectionnes.length > 0 && (
            <View style={styles.selectedContainer}>
              <FlatList
                horizontal
                data={participantsSelectionnes}
                keyExtractor={(item) => item._id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.selectedChip}
                    onPress={() => demarrerConversation(item)}
                  >
                    <Text style={styles.selectedChipText} numberOfLines={1}>
                      {item.prenom}
                    </Text>
                    <Ionicons name="close" size={14} color={couleurs.blanc} />
                  </Pressable>
                )}
              />
            </View>
          )}

          <View style={styles.modalSearchContainer}>
            <Text style={styles.modalSearchLabel}>À :</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={couleurs.textePlaceholder}
              value={rechercheUtilisateur}
              onChangeText={setRechercheUtilisateur}
              autoFocus
            />
          </View>

          {modeGroupe ? (
            chargementAmis ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color={couleurs.primaire} />
                <Text style={styles.modalLoadingText}>Chargement de vos amis...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {mesAmis.length === 0 ? (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="people-outline" size={48} color={couleurs.texteMuted} />
                    <Text style={styles.modalEmptyText}>Aucun ami</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Vous devez avoir des amis pour créer un groupe.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>
                      Sélectionnez vos amis ({mesAmis.length})
                    </Text>
                    {mesAmis.map((ami) => {
                      const estSelectionne = participantsSelectionnes.find(
                        (p) => p._id === ami._id
                      );
                      return (
                        <Pressable
                          key={ami._id}
                          style={({ pressed }) => [
                            styles.utilisateurItem,
                            pressed && styles.utilisateurItemPressed,
                            estSelectionne && styles.utilisateurItemSelectionne,
                          ]}
                          onPress={() => {
                            if (estSelectionne) {
                              setParticipantsSelectionnes(
                                participantsSelectionnes.filter((p) => p._id !== ami._id)
                              );
                            } else {
                              setParticipantsSelectionnes([
                                ...participantsSelectionnes,
                                { _id: ami._id, prenom: ami.prenom, nom: ami.nom, avatar: ami.avatar },
                              ]);
                            }
                          }}
                        >
                          <Avatar
                            uri={ami.avatar}
                            prenom={ami.prenom}
                            nom={ami.nom}
                            taille={44}
                          />
                          <View style={styles.utilisateurInfo}>
                            <Text style={styles.utilisateurNom}>
                              {ami.prenom} {ami.nom}
                            </Text>
                          </View>
                          <View style={[styles.checkBox, estSelectionne && styles.checkBoxActive]}>
                            {estSelectionne && (
                              <Ionicons name="checkmark" size={14} color={couleurs.blanc} />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            )
          ) : (
            chargementRecherche ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color={couleurs.primaire} />
              </View>
            ) : (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {rechercheUtilisateur.length < 2 && contactsExistants.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Suggestions</Text>
                    {contactsExistants.map((contact) => (
                      <Pressable
                        key={contact._id}
                        style={({ pressed }) => [
                          styles.utilisateurItem,
                          pressed && styles.utilisateurItemPressed,
                        ]}
                        onPress={() => demarrerConversation(contact)}
                      >
                        <Avatar
                          uri={contact.avatar}
                          prenom={contact.prenom}
                          nom={contact.nom}
                          taille={44}
                        />
                        <View style={styles.utilisateurInfo}>
                          <Text style={styles.utilisateurNom}>
                            {contact.prenom} {contact.nom}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={couleurs.texteMuted} />
                      </Pressable>
                    ))}
                  </>
                )}

                {rechercheUtilisateur.length >= 2 && utilisateursTrouves.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Résultats</Text>
                    {utilisateursTrouves.map((user) => {
                      const estAmi = amisIds.has(user._id);
                      return (
                        <Pressable
                          key={user._id}
                          style={({ pressed }) => [
                            styles.utilisateurItem,
                            pressed && styles.utilisateurItemPressed,
                            !estAmi && styles.utilisateurNonAmi,
                          ]}
                          onPress={() => demarrerConversation(user)}
                        >
                          <Avatar
                            uri={user.avatar}
                            prenom={user.prenom}
                            nom={user.nom}
                            taille={44}
                          />
                          <View style={styles.utilisateurInfo}>
                            <Text style={styles.utilisateurNom}>
                              {user.prenom} {user.nom}
                            </Text>
                            {!estAmi && (
                              <Text style={styles.utilisateurNonAmiLabel}>
                                Non ami - Message impossible
                              </Text>
                            )}
                          </View>
                          {estAmi ? (
                            <Ionicons name="chevron-forward" size={20} color={couleurs.texteMuted} />
                          ) : (
                            <Ionicons name="lock-closed" size={18} color={couleurs.texteMuted} />
                          )}
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {rechercheUtilisateur.length >= 2 && utilisateursTrouves.length === 0 && (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color={couleurs.texteMuted} />
                    <Text style={styles.modalEmptyText}>Aucun utilisateur trouvé</Text>
                  </View>
                )}

                {rechercheUtilisateur.length < 2 && contactsExistants.length === 0 && (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="people-outline" size={48} color={couleurs.texteMuted} />
                    <Text style={styles.modalEmptyText}>Aucun contact</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Tapez au moins 2 caractères pour rechercher
                    </Text>
                  </View>
                )}
              </ScrollView>
            )
          )}
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  headerTitle: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  headerAction: {
    padding: espacements.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    marginHorizontal: espacements.lg,
    marginVertical: espacements.md,
    paddingHorizontal: espacements.md,
    borderRadius: rayons.lg,
    gap: espacements.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: espacements.md,
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.sm,
    gap: espacements.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.lg,
    backgroundColor: couleurs.fondCard,
    gap: espacements.xs,
  },
  tabActive: {
    backgroundColor: couleurs.primaire,
  },
  tabText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texteSecondaire,
  },
  tabTextActive: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
  },
  tabBadge: {
    backgroundColor: couleurs.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  emptyText: {
    fontSize: typographie.tailles.lg,
    color: couleurs.texteSecondaire,
    marginTop: espacements.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteMuted,
    marginTop: espacements.sm,
    textAlign: 'center',
    paddingHorizontal: espacements.xl,
  },
  emptyButton: {
    marginTop: espacements.xl,
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    borderRadius: rayons.full,
  },
  emptyButtonText: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
    fontSize: typographie.tailles.base,
  },
  listContent: {
    paddingBottom: espacements.xl,
  },
  swipeActionsRight: {
    width: 80,
    flexDirection: 'row',
  },
  swipeActionsLeft: {
    width: 80,
    flexDirection: 'row',
  },
  swipeActionDelete: {
    flex: 1,
    backgroundColor: couleurs.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionMute: {
    flex: 1,
    backgroundColor: couleurs.primaire,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
    backgroundColor: couleurs.fond,
  },
  avatarContainer: {
    position: 'relative',
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: couleurs.succes,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texte,
    flex: 1,
    marginRight: espacements.sm,
  },
  conversationNomNonLu: {
    fontWeight: typographie.poids.bold,
  },
  conversationDate: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationMessage: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    flex: 1,
    marginRight: espacements.sm,
  },
  conversationMessageNonLu: {
    color: couleurs.texte,
    fontWeight: typographie.poids.medium,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  modalCancel: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
  },
  modalTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  modalAction: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  toggleGroupe: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  toggleGroupeText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
  },
  toggleGroupeTextActive: {
    color: couleurs.primaire,
    fontWeight: typographie.poids.medium,
  },
  groupNameContainer: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  groupNameInput: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    paddingVertical: espacements.sm,
  },
  selectedContainer: {
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  selectedList: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    gap: espacements.xs,
    marginRight: espacements.sm,
  },
  selectedChipText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.blanc,
    fontWeight: typographie.poids.medium,
    maxWidth: 80,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    gap: espacements.sm,
  },
  modalSearchLabel: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
  },
  modalLoadingContainer: {
    padding: espacements.xl,
    alignItems: 'center',
    gap: espacements.md,
  },
  modalLoadingText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: espacements.xl,
  },
  modalEmptyContainer: {
    padding: espacements.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
  },
  modalEmptySubtext: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteMuted,
    textAlign: 'center',
    marginTop: espacements.xs,
    paddingHorizontal: espacements.lg,
  },
  sectionTitle: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texteMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
    paddingBottom: espacements.sm,
  },
  utilisateurItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  utilisateurItemPressed: {
    backgroundColor: couleurs.fondCard,
  },
  utilisateurItemSelectionne: {
    backgroundColor: couleurs.primaireLight,
  },
  utilisateurInfo: {
    flex: 1,
  },
  utilisateurNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texte,
  },
  utilisateurNonAmi: {
    opacity: 0.6,
  },
  utilisateurNonAmiLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginTop: 2,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
});

MessagesTab.displayName = 'MessagesTab';

export default MessagesTab;
