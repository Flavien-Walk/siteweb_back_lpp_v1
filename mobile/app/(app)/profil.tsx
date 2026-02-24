/**
 * Page Profil - Structure en deux onglets
 * Onglet 1: Profil public (style Instagram)
 * Onglet 2: Paramètres (modification, theme, securite, RGPD)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { espacements } from '../../src/constantes/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import {
  getAvatarsDefaut,
  modifierAvatar,
  getModerationStatus,
  ModerationStatus,
  modifierProfil,
} from '../../src/services/auth';
import { getMesStories, Story } from '../../src/services/stories';
import KeyboardView from '../../src/composants/KeyboardView';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import { useGamification } from '../../src/contexts/GamificationContext';
import StoryViewer from '../../src/composants/StoryViewer';
import StoryCreator from '../../src/composants/StoryCreator';
import EditBioModal from '../../src/composants/EditBioModal';
import createStyles from '../../src/features/profil/profil.styles';
import ProfilPublicTab from '../../src/features/profil/ProfilPublicTab';
import ParametresTab from '../../src/features/profil/ParametresTab';

type Onglet = 'profil-public' | 'parametres';

export default function Profil() {
  const { couleurs, toggleTheme, isDark } = useTheme();
  const { utilisateur, updateUser, logout, refreshUser } = useUser();
  const { width: screenWidth } = useWindowDimensions();

  // Calculer la largeur de l'indicateur (moitié de la barre moins les paddings)
  const tabBarPadding = espacements.lg * 2 + 8; // padding horizontal + inner padding
  const tabIndicatorWidth = (screenWidth - tabBarPadding) / 2;

  // Onglet actif
  const [ongletActif, setOngletActif] = useState<Onglet>('profil-public');

  // États généraux
  const [chargement, setChargement] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  // Avatar
  const [modalAvatar, setModalAvatar] = useState(false);
  const [avatarsDefaut, setAvatarsDefaut] = useState<string[]>([]);
  const [chargementAvatar, setChargementAvatar] = useState(false);

  // Modal Bio
  const [modalBio, setModalBio] = useState(false);

  // Animation de l'indicateur d'onglet
  const [indicatorPosition] = useState(new Animated.Value(0));

  // Stories
  const [mesStories, setMesStories] = useState<Story[]>([]);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);

  // Statut de moderation (pour afficher les avertissements)
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);

  // Gamification (nouveau systeme)
  const { state: gamification, applyDelta } = useGamification();

  // Rafraîchir les données utilisateur quand la page gagne le focus
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  // Charger le statut de moderation (compteur d'avertissements)
  useEffect(() => {
    const fetchModerationStatus = async () => {
      try {
        const response = await getModerationStatus();
        if (response.succes && response.data) {
          setModerationStatus(response.data);
        }
      } catch (error) {
        console.log('[Profil] Erreur chargement statut moderation:', error);
      }
    };
    fetchModerationStatus();
  }, []);

  // Charger mes stories
  useEffect(() => {
    const chargerMesStories = async () => {
      try {
        const reponse = await getMesStories();
        if (reponse.succes && reponse.data) {
          setMesStories(reponse.data.stories);
        }
      } catch (error) {
        console.error('Erreur chargement stories:', error);
      }
    };
    chargerMesStories();
  }, []);

  // Animation lors du changement d'onglet
  useEffect(() => {
    Animated.spring(indicatorPosition, {
      toValue: ongletActif === 'profil-public' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [ongletActif, indicatorPosition]);

  const chargerAvatars = async () => {
    try {
      const reponse = await getAvatarsDefaut();
      if (reponse.succes && reponse.data) {
        setAvatarsDefaut(reponse.data.avatars);
      }
    } catch (error) {
      console.error('Erreur chargement avatars:', error);
    }
  };

  const handleChangerAvatar = async (avatar: string | null) => {
    try {
      setChargementAvatar(true);
      const reponse = await modifierAvatar(avatar);
      if (reponse.succes && reponse.data) {
        updateUser(reponse.data.utilisateur);
        setModalAvatar(false);
        afficherMessage('succes', 'Avatar mis a jour !');
      } else {
        afficherMessage('erreur', reponse.message || 'Erreur lors de la mise a jour');
      }
    } catch (error) {
      afficherMessage('erreur', 'Une erreur est survenue');
    } finally {
      setChargementAvatar(false);
    }
  };

  const handleOuvrirModalAvatar = async () => {
    setModalAvatar(true);
    if (avatarsDefaut.length === 0) {
      await chargerAvatars();
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        afficherMessage('erreur', 'Permission d\'acces a la galerie requise');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setChargementAvatar(true);

        const asset = result.assets[0];
        let avatarUrl: string;

        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          avatarUrl = `data:${mimeType};base64,${asset.base64}`;
        } else {
          avatarUrl = asset.uri;
        }

        const reponse = await modifierAvatar(avatarUrl);
        if (reponse.succes && reponse.data) {
          updateUser(reponse.data.utilisateur);
          setModalAvatar(false);
          afficherMessage('succes', 'Photo de profil mise a jour !');
        } else {
          afficherMessage('erreur', reponse.message || 'Erreur lors de la mise a jour');
        }
        setChargementAvatar(false);
      }
    } catch (error) {
      afficherMessage('erreur', 'Erreur lors de la selection de l\'image');
      setChargementAvatar(false);
    }
  };

  const afficherMessage = (type: 'succes' | 'erreur', texte: string) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleOuvrirModalBio = () => {
    setModalBio(true);
  };

  const handleSauvegarderBio = async (nouvelleBio: string) => {
    setChargement(true);
    const reponse = await modifierProfil({
      bio: nouvelleBio
    });
    setChargement(false);

    if (reponse.succes && reponse.data) {
      updateUser(reponse.data.utilisateur);
      setModalBio(false);
      afficherMessage('succes', 'Bio mise a jour !');
      if (reponse.gamification) {
        applyDelta(reponse.gamification);
      }
    } else {
      afficherMessage('erreur', reponse.message || 'Erreur lors de la mise a jour');
    }
  };

  const handleDeconnexion = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/connexion');
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    setRafraichissement(true);
    try {
      await refreshUser();
      const storiesResponse = await getMesStories();
      if (storiesResponse.succes && storiesResponse.data) {
        setMesStories(storiesResponse.data.stories);
      }
    } catch (error) {
      console.error('Erreur refresh:', error);
    } finally {
      setRafraichissement(false);
    }
  }, []);

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  // Styles dynamiques
  const styles = createStyles(couleurs, isDark);

  // Contenu principal du profil
  const profilContent = (
    <>
      <LinearGradient
        colors={[couleurs.fond, couleurs.fondSecondaire, couleurs.fond]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardView style={styles.keyboardView}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.headerTitle}>Mon profil</Text>
            <Pressable style={styles.logoutButton} onPress={handleDeconnexion}>
              <Ionicons name="log-out-outline" size={24} color={couleurs.erreur} />
            </Pressable>
        </View>

        {/* Onglets */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBar}>
            <Pressable
              style={styles.tab}
              onPress={() => setOngletActif('profil-public')}
            >
              <Text style={[
                styles.tabText,
                ongletActif === 'profil-public' && styles.tabTextActive,
              ]}>
                Profil public
              </Text>
            </Pressable>
            <Pressable
              style={styles.tab}
              onPress={() => setOngletActif('parametres')}
            >
              <Text style={[
                styles.tabText,
                ongletActif === 'parametres' && styles.tabTextActive,
              ]}>
                Parametres
              </Text>
            </Pressable>

            {/* Indicateur animé */}
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: tabIndicatorWidth,
                  transform: [{
                    translateX: indicatorPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, tabIndicatorWidth],
                    }),
                  }],
                },
              ]}
            />
          </View>
        </View>

        {/* Message */}
        {message && (
          <View style={[styles.message, message.type === 'succes' ? styles.messageSucces : styles.messageErreur]}>
            <Ionicons
              name={message.type === 'succes' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={message.type === 'succes' ? couleurs.succes : couleurs.erreur}
            />
            <Text style={[styles.messageText, message.type === 'succes' ? styles.messageTextSucces : styles.messageTextErreur]}>
              {message.texte}
            </Text>
          </View>
        )}

        {/* Contenu selon l'onglet */}
        {ongletActif === 'profil-public' ? (
          <ProfilPublicTab
            couleurs={couleurs}
            styles={styles}
            isDark={isDark}
            utilisateur={utilisateur}
            gamification={gamification}
            moderationStatus={moderationStatus}
            mesStories={mesStories}
            rafraichissement={rafraichissement}
            onRefresh={handleRefresh}
            onOuvrirModalAvatar={handleOuvrirModalAvatar}
            onOuvrirModalBio={handleOuvrirModalBio}
            onStoryViewerOpen={() => setStoryViewerVisible(true)}
            onStoryCreatorOpen={() => setStoryCreatorVisible(true)}
            applyDelta={applyDelta}
            onNaviguerParametresProfil={() => {
              setOngletActif('parametres');
            }}
            onNaviguerParametres={() => setOngletActif('parametres')}
          />
        ) : (
          <ParametresTab
            couleurs={couleurs}
            styles={styles}
            isDark={isDark}
            utilisateur={utilisateur}
            updateUser={updateUser}
            refreshUser={refreshUser}
            moderationStatus={moderationStatus}
            gamification={gamification}
            applyDelta={applyDelta}
            toggleTheme={toggleTheme}
            afficherMessage={afficherMessage}
            chargement={chargement}
            setChargement={setChargement}
            logout={logout}
          />
        )}

        {/* Modal selection avatar */}
        <Modal
          visible={modalAvatar}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalAvatar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choisir un avatar</Text>
                <Pressable onPress={() => setModalAvatar(false)}>
                  <Ionicons name="close" size={24} color={couleurs.texte} />
                </Pressable>
              </View>

              {chargementAvatar ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={couleurs.primaire} />
                  <Text style={styles.modalLoadingText}>Mise a jour...</Text>
                </View>
              ) : (
                <>
                  <Pressable style={styles.galleryButton} onPress={handlePickImage}>
                    <Ionicons name="images-outline" size={24} color={couleurs.primaire} />
                    <Text style={styles.galleryButtonText}>Choisir depuis la galerie</Text>
                  </Pressable>

                  <Text style={styles.avatarSectionTitle}>Ou choisissez un avatar</Text>

                  <ScrollView contentContainerStyle={styles.avatarGrid}>
                    <Pressable
                      style={[
                        styles.avatarOption,
                        !utilisateur?.avatar && styles.avatarOptionSelected,
                      ]}
                      onPress={() => handleChangerAvatar(null)}
                    >
                      <View style={styles.avatarOptionInitiales}>
                        <Text style={styles.avatarOptionInitialesText}>{getInitiales()}</Text>
                      </View>
                      <Text style={styles.avatarOptionLabel}>Initiales</Text>
                    </Pressable>

                    {avatarsDefaut.map((avatar, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.avatarOption,
                          utilisateur?.avatar === avatar && styles.avatarOptionSelected,
                        ]}
                        onPress={() => handleChangerAvatar(avatar)}
                      >
                        <Image source={{ uri: avatar }} style={styles.avatarOptionImage} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal modification bio */}
        <EditBioModal
          visible={modalBio}
          initialValue={utilisateur?.bio || ''}
          onClose={() => setModalBio(false)}
          onSave={handleSauvegarderBio}
          loading={chargement}
        />

        {/* Modal Viewer Stories */}
        <StoryViewer
          visible={storyViewerVisible}
          stories={mesStories}
          userName={utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Vous'}
          userAvatar={utilisateur?.avatar}
          isOwnStory={true}
          onClose={() => setStoryViewerVisible(false)}
        />

        {/* Modal Création Story */}
        <StoryCreator
          visible={storyCreatorVisible}
          onClose={() => setStoryCreatorVisible(false)}
          onStoryCreated={async () => {
            // Rafraîchir les stories
            try {
              const reponse = await getMesStories();
              if (reponse.succes && reponse.data) {
                setMesStories(reponse.data.stories);
              }
            } catch (error) {
              console.error('Erreur rafraîchissement stories:', error);
            }
          }}
        />
      </KeyboardView>
    </>
  );

  const screen = (
    <SafeAreaView style={styles.container} edges={['top']}>
      {profilContent}
    </SafeAreaView>
  );

  if (Platform.OS === 'android') {
    return <SwipeableScreen>{screen}</SwipeableScreen>;
  }

  return screen;
}
