/**
 * Messages - Liste des conversations style Instagram
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons, typographie } from '../../src/constantes/theme';
import { useUser } from '../../src/contexts/UserContext';
import {
  getConversations,
  rechercherUtilisateurs,
  getOuCreerConversationPrivee,
  creerGroupe,
  Conversation,
  Utilisateur,
} from '../../src/services/messagerie';

export default function Messages() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur } = useUser();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [recherche, setRecherche] = useState('');

  // Nouvelle conversation
  const [modalNouveauVisible, setModalNouveauVisible] = useState(false);
  const [rechercheUtilisateur, setRechercheUtilisateur] = useState('');
  const [utilisateursTrouves, setUtilisateursTrouves] = useState<Utilisateur[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);

  // Nouveau groupe
  const [modeGroupe, setModeGroupe] = useState(false);
  const [participantsSelectionnes, setParticipantsSelectionnes] = useState<Utilisateur[]>([]);
  const [nomGroupe, setNomGroupe] = useState('');

  // Charger les conversations
  const chargerConversations = useCallback(async (estRefresh = false) => {
    if (estRefresh) {
      setRafraichissement(true);
    } else {
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
  }, [chargerConversations]);

  // Recherche utilisateurs pour nouvelle conversation
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

  // Filtrer conversations par recherche
  const conversationsFiltrees = conversations.filter((conv) => {
    if (recherche.length < 2) return true;
    const rechercheMin = recherche.toLowerCase();

    if (conv.estGroupe) {
      return conv.nomGroupe?.toLowerCase().includes(rechercheMin);
    }

    return `${conv.participant?.prenom} ${conv.participant?.nom}`
      .toLowerCase()
      .includes(rechercheMin);
  });

  // Ouvrir une conversation
  const ouvrirConversation = (conv: Conversation) => {
    router.push({
      pathname: '/(app)/conversation/[id]',
      params: { id: conv._id },
    });
  };

  // Démarrer une conversation privée
  const demarrerConversation = async (user: Utilisateur) => {
    if (modeGroupe) {
      // Ajouter/retirer des participants
      const dejaSelectionne = participantsSelectionnes.find((p) => p._id === user._id);
      if (dejaSelectionne) {
        setParticipantsSelectionnes(participantsSelectionnes.filter((p) => p._id !== user._id));
      } else {
        setParticipantsSelectionnes([...participantsSelectionnes, user]);
      }
    } else {
      // Conversation privée directe
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

  // Créer un groupe
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

  // Formater la date
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

  // Render conversation item
  const renderConversation = ({ item }: { item: Conversation }) => {
    const nom = item.estGroupe
      ? item.nomGroupe
      : `${item.participant?.prenom} ${item.participant?.nom}`;

    const avatar = item.estGroupe
      ? item.imageGroupe
      : item.participant?.avatar;

    const initiales = item.estGroupe
      ? (item.nomGroupe?.substring(0, 2).toUpperCase() || 'GR')
      : `${item.participant?.prenom?.[0] || ''}${item.participant?.nom?.[0] || ''}`.toUpperCase();

    return (
      <Pressable
        style={({ pressed }) => [
          styles.conversationItem,
          pressed && styles.conversationItemPressed,
        ]}
        onPress={() => ouvrirConversation(item)}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={item.estGroupe ? ['#10B981', '#059669'] : [couleurs.primaire, couleurs.primaireDark]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitiales}>{initiales}</Text>
            </LinearGradient>
          )}
          {item.estGroupe && (
            <View style={styles.groupBadge}>
              <Ionicons name="people" size={10} color={couleurs.blanc} />
            </View>
          )}
        </View>

        {/* Infos */}
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
            {item.messagesNonLus > 0 && (
              <View style={styles.badgeNonLu}>
                <Text style={styles.badgeNonLuText}>
                  {item.messagesNonLus > 99 ? '99+' : item.messagesNonLus}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Indicateur sourdine */}
        {item.estMuet && (
          <Ionicons name="volume-mute" size={16} color={couleurs.texteMuted} />
        )}
      </Pressable>
    );
  };

  // Render utilisateur recherche
  const renderUtilisateurRecherche = ({ item }: { item: Utilisateur }) => {
    const estSelectionne = participantsSelectionnes.find((p) => p._id === item._id);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.utilisateurItem,
          pressed && styles.utilisateurItemPressed,
          estSelectionne && styles.utilisateurItemSelectionne,
        ]}
        onPress={() => demarrerConversation(item)}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.utilisateurAvatar} />
        ) : (
          <View style={styles.utilisateurAvatarPlaceholder}>
            <Text style={styles.utilisateurInitiales}>
              {item.prenom[0]}{item.nom[0]}
            </Text>
          </View>
        )}
        <View style={styles.utilisateurInfo}>
          <Text style={styles.utilisateurNom}>
            {item.prenom} {item.nom}
          </Text>
        </View>
        {modeGroupe && (
          <View style={[styles.checkBox, estSelectionne && styles.checkBoxActive]}>
            {estSelectionne && <Ionicons name="checkmark" size={14} color={couleurs.blanc} />}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
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
          placeholder="Rechercher une conversation..."
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

      {/* Liste des conversations */}
      {chargement ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      ) : conversationsFiltrees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={couleurs.texteMuted} />
          <Text style={styles.emptyText}>
            {recherche.length > 0 ? 'Aucune conversation trouvée' : 'Aucune conversation'}
          </Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => setModalNouveauVisible(true)}
          >
            <Text style={styles.emptyButtonText}>Démarrer une conversation</Text>
          </Pressable>
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
          {/* Header modal */}
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

          {/* Toggle groupe */}
          <Pressable
            style={styles.toggleGroupe}
            onPress={() => {
              setModeGroupe(!modeGroupe);
              if (!modeGroupe) {
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

          {/* Nom du groupe (si mode groupe) */}
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

          {/* Participants sélectionnés */}
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

          {/* Recherche */}
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

          {/* Résultats */}
          {chargementRecherche ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="small" color={couleurs.primaire} />
            </View>
          ) : (
            <FlatList
              data={utilisateursTrouves}
              renderItem={renderUtilisateurRecherche}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={
                rechercheUtilisateur.length >= 2 ? (
                  <View style={styles.modalEmptyContainer}>
                    <Text style={styles.modalEmptyText}>Aucun utilisateur trouvé</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

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
  headerBack: {
    padding: espacements.xs,
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
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  conversationItemPressed: {
    backgroundColor: couleurs.fondCard,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitiales: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
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
  badgeNonLu: {
    backgroundColor: couleurs.primaire,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeNonLuText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
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
  },
  modalListContent: {
    paddingVertical: espacements.sm,
  },
  modalEmptyContainer: {
    padding: espacements.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
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
  utilisateurAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  utilisateurAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilisateurInitiales: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.bold,
    color: couleurs.primaire,
  },
  utilisateurInfo: {
    flex: 1,
  },
  utilisateurNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texte,
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
