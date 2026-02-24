/**
 * Page Profil Utilisateur - Design épuré et moderne
 * Inspiré d'Instagram avec une hiérarchie visuelle claire
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

import { couleurs } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import { useSocket } from '../../../src/contexts/SocketContext';
import { Avatar, StaffActions } from '../../../src/composants';
import { useStaff } from '../../../src/hooks/useStaff';
import {
  getProfilUtilisateur,
  envoyerDemandeAmi,
  annulerDemandeAmi,
  accepterDemandeAmi,
  supprimerAmi,
  ProfilUtilisateur,
} from '../../../src/services/utilisateurs';
import { getOuCreerConversationPrivee } from '../../../src/services/messagerie';
import { getPublicationsUtilisateur, Publication } from '../../../src/services/publications';
import { getStoriesUtilisateur, Story } from '../../../src/services/stories';
import { getProjetsSuivisUtilisateur, Projet } from '../../../src/services/projets';
import StoryViewer from '../../../src/composants/StoryViewer';
import { isUserVerified } from '../../../src/utils/userDisplay';
import AppBadge from '../../../src/composants/AppBadge';
import styles from '../../../src/features/profil/utilisateur-detail.styles';
import { getPublicGamification } from '../../../src/services/gamification';

type OngletActivite = 'publications' | 'projets';

export default function ProfilUtilisateurPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur: moi, refreshUser } = useUser();
  const { onDemandeAmi } = useSocket();

  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargementPublications, setChargementPublications] = useState(false);

  // Onglet actif dans la section activité
  const [ongletActivite, setOngletActivite] = useState<OngletActivite>('publications');

  // Projets suivis par l'utilisateur
  const [projetsSuivis, setProjetsSuivis] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);

  // Stories de l'utilisateur
  const [storiesUtilisateur, setStoriesUtilisateur] = useState<Story[]>([]);
  const [hasStories, setHasStories] = useState(false);
  const [peutVoirStories, setPeutVoirStories] = useState(false);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);

  // Note: Les médias sont visionnés via la page publication/[id].tsx
  // (navigation vers la page détail au clic sur un item de la grille)

  // Calcul largeur item grille (3 colonnes avec gap de 1px)
  const GRID_GAP = 1;
  const gridItemWidth = (SCREEN_WIDTH - (GRID_GAP * 2)) / 3;

  // Gamification publique
  const [gamificationData, setGamificationData] = useState<{ level: number; levelName: string; levelIcon: string; xp: number } | null>(null);

  // Staff modération
  const staff = useStaff();
  const [showStaffActions, setShowStaffActions] = useState(false);

  // Ref pour tracker si le profil a déjà été chargé
  const profilChargeRef = useRef(false);
  const idPrecedentRef = useRef<string | undefined>(undefined);

  // Helper: générer thumbnail Cloudinary pour vidéo
  const getVideoThumbnail = (videoUrl: string): string => {
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
      return videoUrl
        .replace('/video/upload/', '/video/upload/so_0,w_400,h_400,c_fill,f_jpg/')
        .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
    }
    return videoUrl;
  };

  // Helper: vérifier si un média est une vidéo
  const isVideoMedia = (mediaUrl?: string): boolean => {
    if (!mediaUrl) return false;
    return mediaUrl.includes('.mp4') ||
      mediaUrl.includes('.mov') ||
      mediaUrl.includes('.webm') ||
      mediaUrl.includes('video');
  };

  // Charger les publications de l'utilisateur
  const chargerPublications = useCallback(async () => {
    if (!id) return;
    setChargementPublications(true);
    try {
      const reponse = await getPublicationsUtilisateur(id);
      if (reponse.succes && reponse.data) {
        // Filtrage frontend de sécurité : ne garder que les publications de cet utilisateur
        const publicationsFiltrees = reponse.data.publications.filter(
          (pub) => pub.auteur._id === id
        );
        setPublications(publicationsFiltrees);
      }
    } catch (error) {
      console.error('Erreur chargement publications:', error);
    } finally {
      setChargementPublications(false);
    }
  }, [id]);

  // Charger les stories de l'utilisateur
  const chargerStories = useCallback(async () => {
    if (!id) return;
    try {
      const reponse = await getStoriesUtilisateur(id);
      if (reponse.succes && reponse.data) {
        setHasStories(reponse.data.hasStories);
        setPeutVoirStories(reponse.data.peutVoir);
        setStoriesUtilisateur(reponse.data.stories);
      }
    } catch (error) {
      console.error('Erreur chargement stories:', error);
    }
  }, [id]);

  // Charger les projets suivis par l'utilisateur
  const chargerProjetsSuivis = useCallback(async () => {
    if (!id) return;
    setChargementProjets(true);
    try {
      const reponse = await getProjetsSuivisUtilisateur(id);
      if (reponse.succes && reponse.data) {
        setProjetsSuivis(reponse.data.projets);
      }
    } catch (error) {
      console.error('Erreur chargement projets suivis:', error);
    } finally {
      setChargementProjets(false);
    }
  }, [id]);

  // Charger le profil
  const chargerProfil = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const [reponse] = await Promise.all([
        getProfilUtilisateur(id),
        chargerPublications(),
        chargerStories(),
        chargerProjetsSuivis(),
      ]);
      if (reponse.succes && reponse.data) {
        setProfil(reponse.data.utilisateur);
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de charger le profil');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id, chargerPublications, chargerStories, chargerProjetsSuivis]);

  // Charger le profil uniquement quand l'ID change ou au premier montage
  useEffect(() => {
    if (idPrecedentRef.current !== id) {
      idPrecedentRef.current = id;
      profilChargeRef.current = false;
      setProfil(null);
      setChargement(true);
    }

    if (!profilChargeRef.current && id) {
      profilChargeRef.current = true;
      chargerProfil();
      getPublicGamification(id).then(r => {
        if (r.succes && r.data) setGamificationData(r.data);
      }).catch(() => {});
    }
  }, [id, chargerProfil]);

  // === SOCKET: Écouter les événements de demandes d'amis ===
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onDemandeAmi((event) => {
      // Si c'est l'utilisateur de ce profil qui a accepté notre demande
      if (event.utilisateur._id === id && event.type === 'accepted') {
        console.log('[PROFIL] Demande acceptée via socket, mise à jour du profil');
        // Mettre à jour le profil localement
        setProfil(prev => prev ? {
          ...prev,
          estAmi: true,
          demandeEnvoyee: false,
          demandeRecue: false,
        } : null);
      }
      // Si on est sur notre propre profil et quelqu'un nous envoie une demande
      if (event.type === 'received' && moi?.id === id) {
        console.log('[PROFIL] Nouvelle demande reçue via socket');
        chargerProfil(true);
      }
    });

    return unsubscribe;
  }, [id, moi?.id, onDemandeAmi, chargerProfil]);

  // Envoyer un message
  const handleEnvoyerMessage = async () => {
    if (!id) return;

    setActionEnCours(true);
    try {
      const reponse = await getOuCreerConversationPrivee(id);
      if (reponse.succes && reponse.data) {
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.conversation._id },
        });
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de créer la conversation');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setActionEnCours(false);
    }
  };

  // Gérer les demandes d'ami
  const handleDemandeAmi = async () => {
    if (!id || !profil) return;

    setActionEnCours(true);
    try {
      if (profil.estAmi) {
        Alert.alert(
          'Retirer des amis',
          `Voulez-vous vraiment retirer ${profil.prenom} de vos amis ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => setActionEnCours(false) },
            {
              text: 'Retirer',
              style: 'destructive',
              onPress: async () => {
                const reponse = await supprimerAmi(id);
                if (reponse.succes) {
                  setProfil({ ...profil, estAmi: false });
                } else {
                  Alert.alert('Erreur', reponse.message || 'Erreur');
                }
                setActionEnCours(false);
              },
            },
          ]
        );
        return;
      }

      if (profil.demandeEnvoyee) {
        const reponse = await annulerDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, demandeEnvoyee: false });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else if (profil.demandeRecue) {
        const reponse = await accepterDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, estAmi: true, demandeRecue: false });
          refreshUser();
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else {
        const reponse = await envoyerDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, demandeEnvoyee: true });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setActionEnCours(false);
    }
  };

  // Configuration du bouton ami
  const getBoutonAmiConfig = () => {
    if (!profil) return { texte: 'Ajouter', icon: 'person-add-outline' as const, style: 'primary' };
    if (profil.estAmi) return { texte: 'Amis', icon: 'checkmark-circle' as const, style: 'success' };
    if (profil.demandeEnvoyee) return { texte: 'En attente', icon: 'time-outline' as const, style: 'pending' };
    if (profil.demandeRecue) return { texte: 'Accepter', icon: 'checkmark' as const, style: 'received' };
    return { texte: 'Ajouter', icon: 'person-add-outline' as const, style: 'primary' };
  };

  // Afficher un toast (cross-platform)
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  // Gérer le clic sur le compteur d'amis
  const handleAmisPress = () => {
    const estMonProfilLocal = moi?.id === profil?._id;
    const profilEstPublic = profil?.profilPublic !== false;
    // Si c'est mon profil, ami, ou profil public → naviguer vers la liste d'amis
    if (estMonProfilLocal || profil?.estAmi || profilEstPublic) {
      router.push({
        pathname: '/(app)/amis/[id]',
        params: { id: profil?._id || id },
      });
      return;
    }
    // Profil prive et non ami → accès refusé
    showToast('Devenez ami pour voir la liste d\'amis');
  };

  // Formater la date d'inscription
  const formatDateInscription = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // État de chargement
  if (chargement) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      </View>
    );
  }

  // Profil non trouvé
  if (!profil) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <Ionicons name="person-outline" size={48} color={couleurs.texteSecondaire} />
          </View>
          <Text style={styles.errorTitle}>Utilisateur introuvable</Text>
          <Text style={styles.errorText}>Ce profil n'existe pas ou a été supprimé</Text>
          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const estMonProfil = moi?.id === profil._id;
  const boutonConfig = getBoutonAmiConfig();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header simple et propre */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profil.prenom} {profil.nom}
        </Text>
        <Pressable style={styles.headerBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texte} />
          </Pressable>
        </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => chargerProfil(true)}
            tintColor={couleurs.primaire}
            colors={[couleurs.primaire]}
          />
        }
      >
        {/* Section profil - Layout horizontal style Instagram */}
        <View style={styles.profilHeader}>
          {/* Avatar avec anneau de story (si stories disponibles) */}
          <Pressable
            style={styles.avatarSection}
            onPress={() => {
              if (hasStories) {
                if (peutVoirStories) {
                  setStoryViewerVisible(true);
                } else {
                  // Non-ami: bloquer l'accès avec message
                  showToast('Devenez ami pour voir les stories');
                }
              }
            }}
            disabled={!hasStories}
          >
            {hasStories ? (
              <LinearGradient
                colors={peutVoirStories
                  ? [couleurs.accent, couleurs.primaire, couleurs.secondaire]
                  : ['#666', '#888', '#666'] // Gris si non-ami
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  <Avatar
                    uri={profil.avatar}
                    prenom={profil.prenom}
                    nom={profil.nom}
                    taille={86}
                  />
                </View>
              </LinearGradient>
            ) : (
              <View style={[styles.avatarGradient, styles.avatarNoStory]}>
                <View style={styles.avatarInner}>
                  <Avatar
                    uri={profil.avatar}
                    prenom={profil.prenom}
                    nom={profil.nom}
                    taille={86}
                  />
                </View>
              </View>
            )}
          </Pressable>

          {/* Stats horizontales */}
          <View style={styles.statsRow}>
            {/* Compteur d'amis - cliquable avec verrouillage si non ami */}
            <Pressable
              style={({ pressed }) => [
                styles.statItem,
                styles.statItemClickable,
                pressed && styles.statItemPressed,
              ]}
              onPress={handleAmisPress}
            >
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{profil.nbAmis || 0}</Text>
                {/* Cadenas si profil prive, non ami et pas mon profil */}
                {!estMonProfil && !profil.estAmi && profil.profilPublic === false && (
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={couleurs.texteSecondaire}
                    style={styles.statLockIcon}
                  />
                )}
              </View>
              <Text style={styles.statLabel}>Amis</Text>
            </Pressable>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profil.projetsSuivis || 0}</Text>
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
          {/* Nom complet */}
          <Text style={styles.nomComplet}>{profil.prenom} {profil.nom}</Text>

          {/* Badge statut */}
          <View style={styles.badgesRow}>
            <AppBadge type="role" role={profil.role} statut={profil.statut} size="md" variant="soft" />
            {isUserVerified(profil) && (
              <AppBadge type="verified" size="md" variant="soft" />
            )}
            {gamificationData && (
              <View style={[styles.statutBadge, { backgroundColor: 'rgba(124, 92, 255, 0.1)' }]}>
                <Ionicons name={(gamificationData.levelIcon || 'trophy-outline') as any} size={14} color="#7C5CFF" />
                <Text style={[styles.statutText, { color: '#7C5CFF' }]}>
                  {gamificationData.levelName} · {gamificationData.xp} XP
                </Text>
              </View>
            )}
          </View>

          {/* Section Description */}
          {profil.bio ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{profil.bio}</Text>
            </View>
          ) : null}

          {/* Date d'inscription */}
          <Text style={styles.dateInscription}>
            Membre depuis {formatDateInscription(profil.dateInscription)}
          </Text>
        </View>

        {/* Boutons d'action */}
        {!estMonProfil ? (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                boutonConfig.style === 'primary' && styles.actionBtnPrimary,
                boutonConfig.style === 'success' && styles.actionBtnSuccess,
                boutonConfig.style === 'pending' && styles.actionBtnOutline,
                boutonConfig.style === 'received' && styles.actionBtnSuccess,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleDemandeAmi}
              disabled={actionEnCours}
            >
              {actionEnCours ? (
                <ActivityIndicator
                  size="small"
                  color={boutonConfig.style === 'pending' ? couleurs.texte : couleurs.blanc}
                />
              ) : (
                <>
                  <Ionicons
                    name={boutonConfig.icon}
                    size={18}
                    color={boutonConfig.style === 'pending' ? couleurs.texte : couleurs.blanc}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      boutonConfig.style === 'pending' && styles.actionBtnTextDark,
                    ]}
                  >
                    {boutonConfig.texte}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnOutline,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleEnvoyerMessage}
              disabled={actionEnCours}
            >
              <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
              <Text style={styles.actionBtnTextDark}>Message</Text>
            </Pressable>

            {/* Bouton modération (staff uniquement) */}
            {staff.isStaff && (staff.canWarnUsers || staff.canSuspendUsers || staff.canBanUsers) && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnStaff,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={() => setShowStaffActions(true)}
              >
                <Ionicons name="shield" size={18} color="#6366f1" />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnOutline,
                { flex: 1 },
                pressed && styles.actionBtnPressed,
              ]}
              onPress={() => router.push('/(app)/profil')}
            >
              <Ionicons name="pencil-outline" size={18} color={couleurs.texte} />
              <Text style={styles.actionBtnTextDark}>Modifier le profil</Text>
            </Pressable>
          </View>
        )}

        {/* Profil privé - message de restriction */}
        {profil.estPrive && !estMonProfil && (
          <View style={styles.activitySection}>
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconCircle}>
                <View style={styles.emptyIconInner}>
                  <Ionicons name="lock-closed" size={40} color={couleurs.texteSecondaire} />
                </View>
              </View>
              <Text style={styles.emptyTitle}>Profil prive</Text>
              <Text style={styles.emptyText}>
                Envoyez une demande d'ami pour voir les publications et projets de {profil.prenom}.
              </Text>
            </View>
          </View>
        )}

        {/* Section activité (masquée si profil privé) */}
        {(!profil.estPrive || estMonProfil) && (
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
                    {profil.prenom} n'a pas encore partagé de contenu
                  </Text>
                </View>
              ) : (
                <View style={styles.publicationsGrid}>
                  {publications.map((pub, index) => {
                // Support medias[] (nouveau) et media (legacy)
                const firstMedia = pub.medias?.[0] || (pub.media ? { type: isVideoMedia(pub.media) ? 'video' as const : 'image' as const, url: pub.media } : null);
                const mediaIsVideo = firstMedia?.type === 'video';
                const thumbnailUri = firstMedia
                  ? (mediaIsVideo ? (firstMedia.thumbnailUrl || getVideoThumbnail(firstMedia.url)) : firstMedia.url)
                  : null;
                const hasMultipleMedias = (pub.medias?.length || 0) > 1;

                const handlePress = () => {
                  // Naviguer vers la page de détail de la publication
                  router.push({
                    pathname: '/(app)/publication/[id]',
                    params: { id: pub._id },
                  });
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
                    {profil.prenom} ne suit pas encore de projet
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
                      onPress={() => router.push({
                        pathname: '/(app)/projet/[id]',
                        params: { id: projet._id },
                      })}
                    >
                      <View style={styles.publicationMediaContainer}>
                        <Image
                          source={{ uri: projet.logo || projet.image }}
                          style={styles.publicationImage}
                          resizeMode="cover"
                        />
                        <View style={styles.projetOverlay}>
                          <Text style={styles.projetName} numberOfLines={2}>{projet.nom}</Text>
                          <View style={styles.projetStats}>
                            <Ionicons name="people" size={12} color={couleurs.blanc} />
                            <Text style={styles.projetFollowers}>{projet.nbFollowers || projet.followers?.length || 0}</Text>
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
        )}
      </ScrollView>

      {/* Modal Viewer Stories */}
      <StoryViewer
        visible={storyViewerVisible}
        stories={storiesUtilisateur}
        userName={profil ? `${profil.prenom} ${profil.nom}` : ''}
        userAvatar={profil?.avatar}
        isOwnStory={id === moi?.id}
        onClose={() => setStoryViewerVisible(false)}
      />

      {/* Modal Staff Actions */}
      {profil && (
        <StaffActions
          visible={showStaffActions}
          onClose={() => setShowStaffActions(false)}
          targetType="user"
          targetId={profil._id}
          targetName={`${profil.prenom} ${profil.nom}`}
          onActionComplete={() => {
            chargerProfil();
          }}
        />
      )}
    </View>
  );
}
