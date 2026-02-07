/**
 * SwipeBackPreviews - Composants de prévisualisation pour SwipeableScreen
 *
 * Ces composants simulent l'apparence des pages de destination
 * lors du swipe-back pour donner un feedback visuel réaliste.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * FeedPreview - Simule la page d'accueil (feed)
 * Utilisé pour le swipe-back depuis profil → accueil
 */
export const FeedPreview: React.FC = () => {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: couleurs.fond, paddingTop: insets.top }]}>
      {/* Header simulé */}
      <View style={[styles.feedHeader, { borderBottomColor: couleurs.bordure }]}>
        <View style={[styles.logoPlaceholder, { backgroundColor: couleurs.primaire + '30' }]} />
        <View style={styles.headerIcons}>
          <View style={[styles.iconPlaceholder, { backgroundColor: couleurs.texteMuted + '30' }]} />
          <View style={[styles.iconPlaceholder, { backgroundColor: couleurs.texteMuted + '30' }]} />
        </View>
      </View>

      {/* Stories row simulée */}
      <View style={styles.storiesRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.storyItem}>
            <View style={[styles.storyCircle, { borderColor: couleurs.primaire + '60' }]}>
              <View style={[styles.storyAvatar, { backgroundColor: couleurs.fondSecondaire }]} />
            </View>
            <View style={[styles.storyName, { backgroundColor: couleurs.texteMuted + '20' }]} />
          </View>
        ))}
      </View>

      {/* Publications simulées */}
      <View style={styles.postsContainer}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.postCard, { backgroundColor: couleurs.fondCard }]}>
            {/* Header du post */}
            <View style={styles.postHeader}>
              <View style={[styles.postAvatar, { backgroundColor: couleurs.fondSecondaire }]} />
              <View style={styles.postHeaderText}>
                <View style={[styles.postAuthor, { backgroundColor: couleurs.texteMuted + '40' }]} />
                <View style={[styles.postTime, { backgroundColor: couleurs.texteMuted + '20' }]} />
              </View>
            </View>
            {/* Contenu du post */}
            <View style={[styles.postContent, { backgroundColor: couleurs.fondSecondaire }]} />
            {/* Actions du post */}
            <View style={styles.postActions}>
              <View style={[styles.actionIcon, { backgroundColor: couleurs.texteMuted + '30' }]} />
              <View style={[styles.actionIcon, { backgroundColor: couleurs.texteMuted + '30' }]} />
              <View style={[styles.actionIcon, { backgroundColor: couleurs.texteMuted + '30' }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * MessagesListPreview - Simule la liste des conversations
 * Utilisé pour le swipe-back depuis conversation → messages
 */
export const MessagesListPreview: React.FC = () => {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: couleurs.fond, paddingTop: insets.top }]}>
      {/* Header simulé */}
      <View style={[styles.messagesHeader, { borderBottomColor: couleurs.bordure }]}>
        <View style={[styles.messagesTitle, { backgroundColor: couleurs.texte + '20' }]} />
        <View style={[styles.iconPlaceholder, { backgroundColor: couleurs.texteMuted + '30' }]} />
      </View>

      {/* Barre de recherche simulée */}
      <View style={[styles.searchBar, { backgroundColor: couleurs.fondCard }]}>
        <View style={[styles.searchIcon, { backgroundColor: couleurs.texteMuted + '40' }]} />
        <View style={[styles.searchText, { backgroundColor: couleurs.texteMuted + '20' }]} />
      </View>

      {/* Liste des conversations simulées */}
      <View style={styles.conversationsList}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[styles.conversationItem, { borderBottomColor: couleurs.bordure }]}>
            <View style={[styles.conversationAvatar, { backgroundColor: couleurs.fondSecondaire }]} />
            <View style={styles.conversationContent}>
              <View style={[styles.conversationName, { backgroundColor: couleurs.texte + '30' }]} />
              <View style={[styles.conversationMessage, { backgroundColor: couleurs.texteMuted + '20' }]} />
            </View>
            <View style={[styles.conversationTime, { backgroundColor: couleurs.texteMuted + '15' }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Feed Preview Styles
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
  },
  logoPlaceholder: {
    width: 100,
    height: 28,
    borderRadius: rayons.sm,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: espacements.md,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  storiesRow: {
    flexDirection: 'row',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
  },
  storyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  storyName: {
    width: 50,
    height: 10,
    borderRadius: 5,
  },
  postsContainer: {
    paddingHorizontal: espacements.md,
    gap: espacements.md,
  },
  postCard: {
    borderRadius: rayons.md,
    padding: espacements.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    marginLeft: espacements.sm,
    gap: 6,
  },
  postAuthor: {
    width: 100,
    height: 12,
    borderRadius: 6,
  },
  postTime: {
    width: 60,
    height: 10,
    borderRadius: 5,
  },
  postContent: {
    width: '100%',
    height: 180,
    borderRadius: rayons.md,
    marginBottom: espacements.sm,
  },
  postActions: {
    flexDirection: 'row',
    gap: espacements.lg,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // Messages List Preview Styles
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
  },
  messagesTitle: {
    width: 120,
    height: 24,
    borderRadius: rayons.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: espacements.md,
    marginVertical: espacements.sm,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    gap: espacements.sm,
  },
  searchIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  searchText: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
  conversationsList: {
    paddingTop: espacements.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    borderBottomWidth: 0.5,
  },
  conversationAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  conversationContent: {
    flex: 1,
    marginLeft: espacements.md,
    gap: 6,
  },
  conversationName: {
    width: 120,
    height: 14,
    borderRadius: 7,
  },
  conversationMessage: {
    width: 180,
    height: 12,
    borderRadius: 6,
  },
  conversationTime: {
    width: 40,
    height: 10,
    borderRadius: 5,
  },
});
