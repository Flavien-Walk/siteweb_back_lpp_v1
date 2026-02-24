import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getPublicationsUtilisateur, Publication } from '../../services/publications';
import { getMesProjets, Projet } from '../../services/projets';
import Avatar from '../../composants/Avatar';
import AppBadge from '../../composants/AppBadge';
import { isUserVerified } from '../../utils/userDisplay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OngletActivite = 'publications' | 'projets';

interface ProfilPublicTabProps {
  couleurs: any;
  styles: any;
  isDark: boolean;
  utilisateur: any;
  gamification: any;
  moderationStatus: any;
  mesStories: any[];
  rafraichissement: boolean;
  onRefresh: () => Promise<void>;
  onOuvrirModalAvatar: () => void;
  onOuvrirModalBio: () => void;
  onStoryViewerOpen: () => void;
  onStoryCreatorOpen: () => void;
  applyDelta: (delta: any) => void;
  /** Called when the user taps "Modifier le profil" (switches parent to parametres/profil section) */
  onNaviguerParametresProfil?: () => void;
  /** Called when the user taps "Parametres" (switches parent to parametres tab) */
  onNaviguerParametres?: () => void;
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const formatDateInscription = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

const getVideoThumbnail = (videoUrl: string): string => {
  if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
    return videoUrl
      .replace('/video/upload/', '/video/upload/so_0,w_400,h_400,c_fill,f_jpg/')
      .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
  }
  return videoUrl;
};

const isVideo = (mediaUrl?: string): boolean => {
  if (!mediaUrl) return false;
  return (
    mediaUrl.includes('.mp4') ||
    mediaUrl.includes('.mov') ||
    mediaUrl.includes('.webm') ||
    mediaUrl.includes('video')
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilPublicTab(props: ProfilPublicTabProps) {
  const {
    couleurs,
    styles,
    utilisateur,
    gamification,
    mesStories,
    rafraichissement,
    onRefresh,
    onOuvrirModalAvatar,
    onOuvrirModalBio,
    onStoryViewerOpen,
    onStoryCreatorOpen,
    onNaviguerParametresProfil,
    onNaviguerParametres,
  } = props;

  const { width: screenWidth } = useWindowDimensions();

  // Calcul largeur item grille (3 colonnes avec gap de 1px)
  const GRID_GAP = 1;
  const gridItemWidth = (screenWidth - GRID_GAP * 2) / 3;

  // ------------------------------------------------------------------
  // Local state
  // ------------------------------------------------------------------

  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargementPublications, setChargementPublications] = useState(false);

  const [projetsSuivis, setProjetsSuivis] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);

  const [ongletActivite, setOngletActivite] = useState<OngletActivite>('publications');

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------------

  // Charger les publications de l'utilisateur
  useEffect(() => {
    const chargerPublications = async () => {
      if (!utilisateur?.id) return;
      setChargementPublications(true);
      try {
        const reponse = await getPublicationsUtilisateur(utilisateur.id);
        if (reponse.succes && reponse.data) {
          // Filtrage frontend de sécurité : ne garder que les publications de cet utilisateur
          const publicationsFiltrees = reponse.data.publications.filter(
            (pub) => pub.auteur._id === utilisateur.id
          );
          setPublications(publicationsFiltrees);
        }
      } catch (error) {
        console.error('Erreur chargement publications:', error);
      } finally {
        setChargementPublications(false);
      }
    };
    chargerPublications();
  }, [utilisateur?.id]);

  // Charger mes projets suivis
  const chargerProjetsSuivis = useCallback(async () => {
    setChargementProjets(true);
    try {
      const reponse = await getMesProjets();
      if (reponse.succes && reponse.data) {
        setProjetsSuivis(reponse.data.projets);
      }
    } catch (error) {
      console.error('Erreur chargement projets suivis:', error);
    } finally {
      setChargementProjets(false);
    }
  }, []);

  useEffect(() => {
    chargerProjetsSuivis();
  }, [chargerProjetsSuivis]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={onRefresh}
            tintColor={couleurs.primaire}
            colors={[couleurs.primaire]}
          />
        }
      >
        {/* Section profil - Layout horizontal style Instagram */}
        <View style={styles.profilHeader}>
          {/* Avatar avec anneau de story (si stories actives) et boutons */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={() => {
                if (mesStories.length > 0) {
                  onStoryViewerOpen();
                } else {
                  onOuvrirModalAvatar();
                }
              }}
              onLongPress={onOuvrirModalAvatar}
            >
              {mesStories.length > 0 ? (
                <LinearGradient
                  colors={[couleurs.accent, couleurs.primaire, couleurs.secondaire]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <View style={styles.avatarInner}>
                    <Avatar
                      uri={utilisateur?.avatar}
                      prenom={utilisateur?.prenom}
                      nom={utilisateur?.nom}
                      taille={86}
                      onPress={onOuvrirModalAvatar}
                    />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.avatarGradient, styles.avatarNoStory]}>
                  <View style={styles.avatarInner}>
                    <Avatar
                      uri={utilisateur?.avatar}
                      prenom={utilisateur?.prenom}
                      nom={utilisateur?.nom}
                      taille={86}
                      onPress={onOuvrirModalAvatar}
                    />
                  </View>
                </View>
              )}
              {/* Badge camera pour modifier avatar */}
              <Pressable
                style={styles.avatarEditBadge}
                onPress={onOuvrirModalAvatar}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="camera" size={14} color={couleurs.blanc} />
              </Pressable>
            </Pressable>
            {/* Bouton + pour ajouter une story */}
            <Pressable
              style={styles.storyAddBadge}
              onPress={() => onStoryCreatorOpen()}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Ionicons name="add" size={16} color={couleurs.blanc} />
            </Pressable>
          </View>

          {/* Stats horizontales */}
          <View style={styles.statsRow}>
            <Pressable
              style={styles.statItem}
              onPress={() => {
                if (utilisateur?.id) {
                  router.push({ pathname: '/(app)/amis/[id]', params: { id: utilisateur.id } });
                }
              }}
            >
              <Text style={styles.statValue}>{utilisateur?.nbAmis || 0}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </Pressable>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{utilisateur?.projetsSuivis || 0}</Text>
              <Text style={styles.statLabel}>Projets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{publications.length}</Text>
              <Text style={styles.statLabel}>Publications</Text>
            </View>
          </View>
        </View>

        {/* Informations utilisateur */}
        <View style={styles.infoSection}>
          {/* Nom complet et badges — une seule ligne, nom tronque si besoin */}
          <View style={styles.nameStatusRow}>
            <Text style={styles.nomComplet} numberOfLines={1} ellipsizeMode="tail">
              {utilisateur?.prenom} {utilisateur?.nom}
            </Text>
            <View style={styles.badgesRow}>
              <AppBadge type="role" role={utilisateur?.role} statut={utilisateur?.statut} size="sm" variant="soft" />
              {isUserVerified(utilisateur) && (
                <AppBadge type="verified" size="sm" variant="outline" />
              )}
              {gamification && (
                <View style={styles.xpBadge}>
                  <Ionicons
                    name={(gamification.levelIcon || 'trophy-outline') as any}
                    size={11}
                    color={couleurs.primaire}
                  />
                  <Text style={styles.xpBadgeText}>
                    Niv.{gamification.level}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Section Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Pressable
                onPress={onOuvrirModalBio}
                style={({ pressed }) => [
                  styles.modifierDescriptionBtn,
                  pressed && styles.modifierDescriptionBtnPressed,
                ]}
              >
                <Ionicons name="pencil-outline" size={14} color={couleurs.primaire} />
                <Text style={styles.modifierDescriptionText}>
                  {utilisateur?.bio ? 'Modifier' : 'Ajouter'}
                </Text>
              </Pressable>
            </View>
            {utilisateur?.bio ? (
              <Text style={styles.descriptionText}>{utilisateur.bio}</Text>
            ) : (
              <Text style={styles.descriptionPlaceholder}>
                Ajoutez une description pour vous présenter à la communauté
              </Text>
            )}
          </View>

          {/* Infos secondaires */}
          <View style={styles.secondaryInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={14} color={couleurs.texteSecondaire} />
              <Text style={styles.infoItemText}>{utilisateur?.email}</Text>
            </View>
            {utilisateur?.dateInscription && (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={styles.infoItemText}>
                  {formatDateInscription(utilisateur.dateInscription)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bouton modifier profil */}
        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnOutline,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => {
              if (onNaviguerParametresProfil) onNaviguerParametresProfil();
            }}
          >
            <Ionicons name="pencil-outline" size={18} color={couleurs.texte} />
            <Text style={styles.actionBtnTextDark}>Modifier le profil</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnOutline,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => {
              if (onNaviguerParametres) onNaviguerParametres();
            }}
          >
            <Ionicons name="settings-outline" size={18} color={couleurs.texte} />
            <Text style={styles.actionBtnTextDark}>Parametres</Text>
          </Pressable>
        </View>

        {/* Section activité */}
        <View style={styles.activitySection}>
          {/* Header de section avec onglets style Instagram */}
          <View style={styles.activityHeader}>
            <Pressable
              style={[
                styles.activityTab,
                ongletActivite === 'publications' && styles.activityTabActive,
              ]}
              onPress={() => setOngletActivite('publications')}
            >
              <Ionicons
                name="grid-outline"
                size={22}
                color={ongletActivite === 'publications' ? couleurs.primaire : couleurs.texteSecondaire}
              />
            </Pressable>
            <Pressable
              style={[
                styles.activityTab,
                ongletActivite === 'projets' && styles.activityTabActive,
              ]}
              onPress={() => setOngletActivite('projets')}
            >
              <Ionicons
                name="bookmark-outline"
                size={22}
                color={ongletActivite === 'projets' ? couleurs.primaire : couleurs.texteSecondaire}
              />
            </Pressable>
          </View>

          {/* Séparateur fin */}
          <View style={styles.activitySeparator} />

          {/* Contenu Publications */}
          {ongletActivite === 'publications' && (
            <>
              {chargementPublications ? (
                <View style={styles.loadingActivity}>
                  <ActivityIndicator size="large" color={couleurs.primaire} />
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : publications.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <View style={styles.emptyIconCircle}>
                    <View style={styles.emptyIconInner}>
                      <Ionicons name="camera-outline" size={40} color={couleurs.texteSecondaire} />
                    </View>
                  </View>
                  <Text style={styles.emptyTitle}>Aucune publication</Text>
                  <Text style={styles.emptyText}>
                    Partagez des moments avec la communauté
                  </Text>
                </View>
              ) : (
                <View style={styles.publicationsGrid}>
                  {publications.map((pub, index) => {
                    // Support medias[] (nouveau) et media (legacy)
                    const firstMedia =
                      pub.medias?.[0] ||
                      (pub.media
                        ? { type: isVideo(pub.media) ? 'video' : 'image', url: pub.media }
                        : null);
                    const mediaIsVideo = firstMedia?.type === 'video';
                    const thumbnailUri = firstMedia
                      ? mediaIsVideo
                        ? firstMedia.thumbnailUrl || getVideoThumbnail(firstMedia.url)
                        : firstMedia.url
                      : null;
                    const hasMultipleMedias = (pub.medias?.length || 0) > 1;

                    const handlePress = () => {
                      if (mediaIsVideo) {
                        // Ouvrir le feed Reels vertical
                        const videoPubs = publications.filter(
                          (p) =>
                            p.medias?.some((m) => m.type === 'video') ||
                            (p.media && isVideo(p.media))
                        );
                        const idx = videoPubs.findIndex((p) => p._id === pub._id);
                        router.push({
                          pathname: '/(app)/reels',
                          params: {
                            initialIndex: String(Math.max(0, idx)),
                            videoPublicationIds: JSON.stringify(videoPubs.map((p) => p._id)),
                          },
                        });
                      } else {
                        // Naviguer vers la page de detail de la publication
                        router.push({
                          pathname: '/(app)/publication/[id]',
                          params: { id: pub._id },
                        });
                      }
                    };

                    return (
                      <Pressable
                        key={pub._id}
                        style={({ pressed }) => [
                          styles.publicationItem,
                          { width: gridItemWidth, height: gridItemWidth },
                          (index + 1) % 3 !== 0 && styles.publicationItemMargin,
                          pressed && styles.publicationItemPressed,
                        ]}
                        onPress={handlePress}
                      >
                        {thumbnailUri ? (
                          <View style={styles.publicationMediaContainer}>
                            <Image
                              source={{ uri: thumbnailUri }}
                              style={styles.publicationImage}
                              resizeMode="cover"
                            />
                            {/* Badge multi-médias */}
                            {hasMultipleMedias && (
                              <View style={styles.multiMediaBadge}>
                                <Ionicons name="copy-outline" size={14} color={couleurs.blanc} />
                              </View>
                            )}
                            {/* Badge vidéo (si pas multi) */}
                            {mediaIsVideo && !hasMultipleMedias && (
                              <View style={styles.videoBadge}>
                                <Ionicons name="play" size={20} color={couleurs.blanc} />
                              </View>
                            )}
                            <View style={styles.publicationItemOverlay}>
                              <View style={styles.publicationItemStats}>
                                <Ionicons name="heart" size={14} color={couleurs.blanc} />
                                <Text style={styles.publicationItemStatText}>{pub.nbLikes || 0}</Text>
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.publicationTextOnly}>
                            {/* Guillemet decoratif */}
                            <View style={styles.textQuoteIcon}>
                              <Ionicons name="chatbox" size={16} color={couleurs.primaire} />
                            </View>
                            {/* Contenu texte */}
                            <View style={styles.textContentWrapper}>
                              <Text style={styles.publicationTextContent} numberOfLines={4}>
                                {pub.contenu}
                              </Text>
                            </View>
                            {/* Stats en bas */}
                            <View style={styles.publicationTextStats}>
                              <View style={styles.textStatBadge}>
                                <Ionicons name="heart" size={10} color={couleurs.primaire} />
                                <Text style={styles.publicationTextStatValue}>{pub.nbLikes || 0}</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Contenu Projets Suivis */}
          {ongletActivite === 'projets' && (
            <>
              {chargementProjets ? (
                <View style={styles.loadingActivity}>
                  <ActivityIndicator size="large" color={couleurs.primaire} />
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : projetsSuivis.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <View style={styles.emptyIconCircle}>
                    <View style={styles.emptyIconInner}>
                      <Ionicons name="bookmark-outline" size={40} color={couleurs.texteSecondaire} />
                    </View>
                  </View>
                  <Text style={styles.emptyTitle}>Aucun projet suivi</Text>
                  <Text style={styles.emptyText}>
                    Découvrez et suivez des projets qui vous inspirent
                  </Text>
                </View>
              ) : (
                <View style={styles.publicationsGrid}>
                  {projetsSuivis.map((projet, index) => (
                    <Pressable
                      key={projet._id}
                      style={({ pressed }) => [
                        styles.publicationItem,
                        { width: gridItemWidth, height: gridItemWidth },
                        (index + 1) % 3 !== 0 && styles.publicationItemMargin,
                        pressed && styles.publicationItemPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/projet/[id]',
                          params: { id: projet._id },
                        })
                      }
                    >
                      <View style={styles.publicationMediaContainer}>
                        <Image
                          source={{ uri: projet.logo || projet.image }}
                          style={styles.publicationImage}
                          resizeMode="cover"
                        />
                        <View style={styles.projetOverlay}>
                          <Text style={styles.projetName} numberOfLines={2}>
                            {projet.nom}
                          </Text>
                          <View style={styles.projetStats}>
                            <Ionicons name="people" size={12} color={couleurs.blanc} />
                            <Text style={styles.projetFollowers}>
                              {projet.nbFollowers || projet.followers?.length || 0}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal Visionneuse Image */}
      <Modal
        visible={imageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setImageModalVisible(false);
          setImageUrl(null);
        }}
      >
        <View style={styles.mediaModalContainer}>
          <Pressable
            style={styles.mediaModalBackdrop}
            onPress={() => {
              setImageModalVisible(false);
              setImageUrl(null);
            }}
          />
          <Pressable
            style={styles.mediaModalCloseBtn}
            onPress={() => {
              setImageModalVisible(false);
              setImageUrl(null);
            }}
          >
            <Ionicons name="close" size={28} color={couleurs.blanc} />
          </Pressable>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.mediaModalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}
