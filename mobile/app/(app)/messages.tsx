/**
 * Messages - Liste des conversations style Instagram
 * Avec swipe pour supprimer et mise à jour temps réel
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';

import { useTheme } from '../../src/contexts/ThemeContext';
import createStyles from '../../src/features/messagerie/messages.styles';
import { Avatar, AnimatedPressable, SkeletonList, NotificationBadge } from '../../src/composants';
import { Conversation } from '../../src/services/messagerie';
import { useMessages } from '../../src/features/messagerie/useMessages';

export default function Messages() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const styles = React.useMemo(() => createStyles(couleurs), [couleurs]);

  const {
    // Refs
    swipeableRefs,

    // État conversations
    chargement,
    rafraichissement,
    recherche,
    setRecherche,
    ongletActif,
    setOngletActif,

    // État modal
    modalNouveauVisible,
    setModalNouveauVisible,
    rechercheUtilisateur,
    setRechercheUtilisateur,
    utilisateursTrouves,
    chargementRecherche,

    // État groupe
    modeGroupe,
    participantsSelectionnes,
    nomGroupe,
    setNomGroupe,

    // État amis
    mesAmis,
    chargementAmis,
    amisIds,

    // Données dérivées
    contactsExistants,
    conversationsFiltrees,
    compteurOnglets,

    // Handlers
    chargerConversations,
    ouvrirConversation,
    handleSupprimerConversation,
    demarrerConversation,
    handleCreerGroupe,
    activerModeGroupe,
    resetModalState,
    formatDate,
  } = useMessages();

  // ── Render swipe actions ──────────────────────────────────────────────────

  const renderRightActions = (
    convId: string,
    progress: Animated.AnimatedInterpolation<number>
  ) => {
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

  const renderLeftActions = (
    conv: Conversation,
    progress: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });

    return (
      <Animated.View style={[styles.swipeActionsLeft, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.swipeActionMute}
          onPress={() => {
            swipeableRefs.current.get(conv._id)?.close();
            // TODO: Toggle mute
          }}
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

  // ── Render conversation item ──────────────────────────────────────────────

  const renderConversation = React.useCallback(
    ({ item }: { item: Conversation }) => {
      const nom = item.estGroupe
        ? item.nomGroupe
        : `${item.participant?.prenom} ${item.participant?.nom}`;

      const avatar = item.estGroupe ? item.imageGroupe : item.participant?.avatar;

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
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Avatar
                uri={avatar}
                prenom={item.estGroupe ? item.nomGroupe?.substring(0, 1) : item.participant?.prenom}
                nom={item.estGroupe ? item.nomGroupe?.substring(1, 2) : item.participant?.nom}
                taille={56}
                gradientColors={
                  item.estGroupe
                    ? ['#10B981', '#059669']
                    : [couleurs.primaire, couleurs.primaireDark]
                }
              />
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
                <NotificationBadge count={item.messagesNonLus} />
              </View>
            </View>

            {/* Indicateur sourdine */}
            {item.estMuet && (
              <Ionicons name="volume-mute" size={16} color={couleurs.texteMuted} />
            )}
          </AnimatedPressable>
        </Swipeable>
      );
    },
    [ouvrirConversation, formatDate]
  );

  // ── JSX ───────────────────────────────────────────────────────────────────

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
          placeholderTextColor={couleurs.texteMuted}
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
          windowSize={10}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
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
              if (!modeGroupe) {
                activerModeGroupe();
              } else {
                resetModalState();
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
                placeholderTextColor={couleurs.texteMuted}
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
              placeholderTextColor={couleurs.texteMuted}
              value={rechercheUtilisateur}
              onChangeText={setRechercheUtilisateur}
              autoFocus
            />
          </View>

          {/* Résultats - Mode Groupe (amis uniquement) */}
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
                      Ajoutez des amis depuis leur profil !
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>
                      Sélectionnez vos amis ({mesAmis.length} ami{mesAmis.length > 1 ? 's' : ''})
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
                            demarrerConversation({
                              _id: ami._id,
                              prenom: ami.prenom,
                              nom: ami.nom,
                              avatar: ami.avatar,
                            });
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
            /* Mode conversation normale */
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
                {/* Contacts existants si pas de recherche */}
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

                {/* Résultats de recherche */}
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
                                Ira dans ses demandes
                              </Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={couleurs.texteMuted} />
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {/* Aucun résultat de recherche */}
                {rechercheUtilisateur.length >= 2 && utilisateursTrouves.length === 0 && (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color={couleurs.texteMuted} />
                    <Text style={styles.modalEmptyText}>Aucun utilisateur trouvé</Text>
                    <Text style={styles.modalEmptySubtext}>Essayez un autre nom</Text>
                  </View>
                )}

                {/* Aucun contact et pas de recherche */}
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
}
