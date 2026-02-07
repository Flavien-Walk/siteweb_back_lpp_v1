/**
 * StoriesRow - Rangée horizontale de stories (style Instagram)
 * Affiche "Votre story" à gauche + les stories des autres utilisateurs
 */

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import StoryCircle from './StoryCircle';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { espacements, couleurs } from '../constantes/theme';
import {
  getStoriesActives,
  getMesStories,
  StoriesGroupeesParUtilisateur,
  Story,
} from '../services/stories';

interface StoriesRowProps {
  onStoryPress: (userId: string, stories: Story[], userName: string, userAvatar: string | undefined, isOwnStory: boolean) => void;
  onAddStoryPress: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const StoriesRow: React.FC<StoriesRowProps> = ({
  onStoryPress,
  onAddStoryPress,
  refreshing = false,
  onRefresh,
}) => {
  const { couleurs: themeColors } = useTheme();
  const { utilisateur } = useUser();

  const [storiesParUtilisateur, setStoriesParUtilisateur] = useState<StoriesGroupeesParUtilisateur[]>([]);
  const [mesStories, setMesStories] = useState<Story[]>([]);
  const [chargement, setChargement] = useState(true);

  // Charger les stories
  const chargerStories = useCallback(async () => {
    try {
      const [storiesResponse, mesStoriesResponse] = await Promise.all([
        getStoriesActives(),
        getMesStories(),
      ]);

      if (storiesResponse.succes && storiesResponse.data) {
        // Filtrer pour exclure ses propres stories de la liste générale
        const autresStories = storiesResponse.data.storiesParUtilisateur.filter(
          (groupe) => groupe.utilisateur._id !== utilisateur?.id
        );
        setStoriesParUtilisateur(autresStories);
      }

      if (mesStoriesResponse.succes && mesStoriesResponse.data) {
        setMesStories(mesStoriesResponse.data.stories);
      }
    } catch (error) {
      console.error('Erreur chargement stories:', error);
    } finally {
      setChargement(false);
    }
  }, [utilisateur?.id]);

  useEffect(() => {
    chargerStories();
  }, [chargerStories]);

  // Rafraîchir quand le parent demande
  useEffect(() => {
    if (refreshing) {
      chargerStories();
    }
  }, [refreshing, chargerStories]);

  // Memoize own story press handler
  const handleOwnStoryPress = useCallback(() => {
    if (mesStories.length > 0 && utilisateur) {
      onStoryPress(
        utilisateur.id,
        mesStories,
        `${utilisateur.prenom} ${utilisateur.nom}`,
        utilisateur.avatar,
        true
      );
    }
  }, [mesStories, utilisateur, onStoryPress]);

  if (chargement) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={couleurs.primaire} size="small" />
      </View>
    );
  }

  // Ne pas afficher si pas d'utilisateur et pas de stories
  if (!utilisateur && storiesParUtilisateur.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.fond }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={couleurs.primaire}
            />
          ) : undefined
        }
      >
        {/* Ma story (toujours visible à gauche) */}
        {utilisateur && (
          <StoryCircle
            uri={utilisateur.avatar}
            prenom={utilisateur.prenom}
            nom={utilisateur.nom}
            taille={68}
            hasStory={mesStories.length > 0}
            isOwn
            onPress={handleOwnStoryPress}
            onAddPress={onAddStoryPress}
          />
        )}

        {/* Stories des autres utilisateurs */}
        {storiesParUtilisateur.map((groupe) => (
          <StoryCircle
            key={groupe.utilisateur._id}
            uri={groupe.utilisateur.avatar}
            prenom={groupe.utilisateur.prenom}
            nom={groupe.utilisateur.nom}
            taille={68}
            hasStory
            onPress={() =>
              onStoryPress(
                groupe.utilisateur._id,
                groupe.stories,
                `${groupe.utilisateur.prenom} ${groupe.utilisateur.nom}`,
                groupe.utilisateur.avatar,
                false // isOwnStory
              )
            }
            isSeen={groupe.toutesVues}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: espacements.md,
  },
});

export default memo(StoriesRow);
