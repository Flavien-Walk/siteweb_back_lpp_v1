/**
 * Page Profil Utilisateur - Design épuré et moderne
 * Inspiré d'Instagram avec une hiérarchie visuelle claire
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import { Avatar } from '../../../src/composants';
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

export default function ProfilUtilisateurPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur: moi } = useUser();

  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargementPublications, setChargementPublications] = useState(false);

  // Modal visionneuse média
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  // Contrôles vidéo (identiques à accueil.tsx)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Calcul largeur item grille (3 colonnes avec gap de 1px)
  const GRID_GAP = 1;
  const gridItemWidth = (SCREEN_WIDTH - (GRID_GAP * 2)) / 3;

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

  // Contrôles vidéo
  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
      resetControlsTimeout();
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
      resetControlsTimeout();
    }
  };

  const seekVideo = async (value: number) => {
    if (videoRef.current && videoDuration > 0) {
      await videoRef.current.setPositionAsync(value);
      resetControlsTimeout();
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 3000);
  };

  const handleVideoTap = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeVideoModal = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setVideoModalVisible(false);
    setVideoUrl(null);
    setIsPlaying(true);
    setIsMuted(false);
    setVideoDuration(0);
    setVideoPosition(0);
    setShowControls(true);
    controlsOpacity.setValue(1);
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
  }, [id, chargerPublications]);

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
    }
  }, [id, chargerProfil]);

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

  // Configuration du statut (avec gestion du rôle admin)
  const getStatutConfig = (role?: string, statut?: string) => {
    // Admin en priorité
    if (role === 'admin') {
      return { label: 'Admin LPP', icon: 'shield-checkmark' as const, color: '#dc2626' };
    }
    // Sinon statut utilisateur
    switch (statut) {
      case 'entrepreneur':
        return { label: 'Entrepreneur', icon: 'rocket' as const, color: couleurs.primaire };
      case 'visiteur':
      default:
        return { label: 'Visiteur', icon: 'compass' as const, color: couleurs.texteSecondaire };
    }
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
  const statutConfig = getStatutConfig(profil.role, profil.statut);

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
          {/* Avatar avec gradient */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[couleurs.primaire, couleurs.secondaire, couleurs.accent]}
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
          </View>

          {/* Stats horizontales */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profil.nbAmis || 0}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
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
          <View style={[styles.statutBadge, { backgroundColor: `${statutConfig.color}15` }]}>
            <Ionicons name={statutConfig.icon} size={14} color={statutConfig.color} />
            <Text style={[styles.statutText, { color: statutConfig.color }]}>
              {statutConfig.label}
            </Text>
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

        {/* Section activité */}
        <View style={styles.activitySection}>
          {/* Header de section avec onglets style Instagram */}
          <View style={styles.activityHeader}>
            <View style={styles.activityTabActive}>
              <Ionicons name="grid-outline" size={22} color={couleurs.primaire} />
            </View>
          </View>

          {/* Séparateur fin */}
          <View style={styles.activitySeparator} />

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
                const mediaIsVideo = isVideoMedia(pub.media);
                const thumbnailUri = pub.media
                  ? (mediaIsVideo ? getVideoThumbnail(pub.media) : pub.media)
                  : null;

                const handlePress = () => {
                  if (pub.media) {
                    if (mediaIsVideo) {
                      setVideoUrl(pub.media);
                      setVideoModalVisible(true);
                    } else {
                      setImageUrl(pub.media);
                      setImageModalVisible(true);
                    }
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
                        {mediaIsVideo && (
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
                        <Text style={styles.publicationTextContent} numberOfLines={5}>
                          {pub.contenu}
                        </Text>
                        <View style={styles.publicationTextStats}>
                          <Ionicons name="heart-outline" size={12} color={couleurs.texteSecondaire} />
                          <Text style={styles.publicationTextStatValue}>{pub.nbLikes || 0}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
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

      {/* Modal Lecteur Vidéo - Style Instagram/LinkedIn (identique à accueil) */}
      <Modal
        visible={videoModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={closeVideoModal}
        statusBarTranslucent
      >
        <View style={styles.videoModalContainer}>
          {/* Vidéo */}
          {videoUrl && (
            <View style={styles.videoTouchArea}>
              <Video
                ref={videoRef}
                source={{ uri: videoUrl }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isMuted={isMuted}
                isLooping={false}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    setVideoDuration(status.durationMillis || 0);
                    setVideoPosition(status.positionMillis || 0);
                    setIsPlaying(status.isPlaying);
                    if (status.didJustFinish) {
                      setIsPlaying(false);
                      setShowControls(true);
                      controlsOpacity.setValue(1);
                    }
                  }
                }}
              />
            </View>
          )}

          {/* Overlay gradient haut */}
          <Animated.View
            style={[styles.videoGradientTop, { opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* Overlay gradient bas */}
          <Animated.View
            style={[styles.videoGradientBottom, { opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* Bouton fermer - Style Instagram */}
          <Animated.View
            style={[styles.videoCloseContainer, { opacity: controlsOpacity }]}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            <Pressable
              style={styles.videoCloseBtn}
              onPress={closeVideoModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={26} color={couleurs.blanc} />
            </Pressable>
          </Animated.View>

          {/* Zone de tap pour toggle les contrôles */}
          <Pressable
            style={styles.videoCenterControl}
            onPress={handleVideoTap}
          >
            {/* Bouton Play/Pause central */}
            {showControls && (
              <Animated.View style={{ opacity: controlsOpacity }}>
                <Pressable
                  style={styles.videoCenterBtn}
                  onPress={togglePlayPause}
                >
                  <View style={styles.videoCenterBtnInner}>
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={44}
                      color={couleurs.blanc}
                      style={!isPlaying ? { marginLeft: 4 } : undefined}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            )}
          </Pressable>

          {/* Contrôles bas - Style épuré */}
          <Animated.View
            style={[styles.videoBottomControls, { opacity: controlsOpacity }]}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            {/* Barre de progression */}
            <Pressable
              style={styles.videoProgressBar}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const progress = locationX / (SCREEN_WIDTH - 32);
                const newPosition = progress * videoDuration;
                seekVideo(Math.max(0, Math.min(newPosition, videoDuration)));
              }}
            >
              <View style={styles.videoProgressTrack}>
                <View
                  style={[
                    styles.videoProgressFill,
                    {
                      width: videoDuration > 0
                        ? `${(videoPosition / videoDuration) * 100}%`
                        : '0%',
                    },
                  ]}
                />
              </View>
            </Pressable>

            {/* Ligne de contrôles */}
            <View style={styles.videoControlsRow}>
              {/* Temps */}
              <View style={styles.videoTimeContainer}>
                <Text style={styles.videoTimeText}>
                  {formatTime(videoPosition)} <Text style={styles.videoTimeSeparator}>/</Text> {formatTime(videoDuration)}
                </Text>
              </View>

              {/* Boutons droite */}
              <View style={styles.videoRightControls}>
                {/* Bouton Mute */}
                <Pressable
                  style={styles.videoSmallBtn}
                  onPress={toggleMute}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={22}
                    color={couleurs.blanc}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginHorizontal: espacements.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xxl,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  errorTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  errorText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.xl,
  },
  errorButton: {
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  errorButtonText: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
    fontSize: typographie.tailles.sm,
  },

  // Scroll
  scrollContent: {
    paddingBottom: espacements.xxxl,
  },

  // Profil Header - Layout Instagram
  profilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.xl,
  },
  avatarSection: {
    marginRight: espacements.xl,
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
  },
  nomComplet: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espacements.xs,
    paddingHorizontal: espacements.sm,
    paddingVertical: 4,
    borderRadius: rayons.sm,
    marginBottom: espacements.sm,
  },
  statutText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  // Section Description
  descriptionSection: {
    marginTop: espacements.sm,
    marginBottom: espacements.sm,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  descriptionLabel: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: espacements.xs,
  },
  descriptionText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    lineHeight: 22,
  },
  dateInscription: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },

  // Actions Section
  actionsSection: {
    flexDirection: 'row',
    gap: espacements.sm,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.sm + 2,
    borderRadius: rayons.md,
    gap: espacements.xs,
  },
  actionBtnPrimary: {
    backgroundColor: couleurs.primaire,
  },
  actionBtnSuccess: {
    backgroundColor: couleurs.succes,
  },
  actionBtnOutline: {
    backgroundColor: couleurs.fondCard,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  actionBtnTextDark: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },

  // =====================
  // SECTION ACTIVITÉ / PUBLICATIONS
  // =====================
  activitySection: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    marginTop: espacements.md,
  },
  activityTabActive: {
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.xl,
    borderTopWidth: 2,
    borderTopColor: couleurs.primaire,
    marginTop: -1,
  },
  activitySeparator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginBottom: 1,
  },
  loadingActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
    gap: espacements.md,
  },
  loadingText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
    paddingHorizontal: espacements.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: couleurs.texteSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  emptyIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  emptyText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },
  publicationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  publicationItem: {
    // width et height définis dynamiquement via gridItemWidth
    backgroundColor: couleurs.fondCard,
    marginBottom: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  publicationItemMargin: {
    marginRight: 1,
  },
  publicationItemPressed: {
    opacity: 0.7,
  },
  publicationMediaContainer: {
    flex: 1,
    position: 'relative',
  },
  publicationImage: {
    width: '100%',
    height: '100%',
    backgroundColor: couleurs.fondElevated,
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicationItemOverlay: {
    position: 'absolute',
    bottom: espacements.xs,
    right: espacements.xs,
  },
  publicationItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: espacements.xs,
    paddingVertical: 2,
    borderRadius: rayons.xs,
    gap: 4,
  },
  publicationItemStatText: {
    fontSize: 11,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  publicationTextOnly: {
    flex: 1,
    padding: espacements.sm,
    backgroundColor: couleurs.fondElevated,
    justifyContent: 'space-between',
  },
  publicationTextContent: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texte,
    lineHeight: 16,
    flex: 1,
  },
  publicationTextStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: espacements.xs,
  },
  publicationTextStatValue: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },

  // =====================
  // MODALS MÉDIA (image)
  // =====================
  mediaModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaModalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mediaModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  // ========== LECTEUR VIDEO - Style Instagram/LinkedIn ==========
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoTouchArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  videoGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  videoGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 160 : 200,
  },
  videoCloseContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    zIndex: 10,
  },
  videoCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCenterControl: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCenterBtn: {
    padding: 8,
  },
  videoCenterBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 72,
  },
  videoProgressBar: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  videoProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: couleurs.primaire,
    borderRadius: 1.5,
  },
  videoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTimeText: {
    fontSize: 13,
    color: couleurs.blanc,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  videoTimeSeparator: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  videoRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  videoSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
