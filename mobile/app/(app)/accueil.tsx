/**
 * Ecran d'accueil - Reseau Social LPP
 * Decouverte de startups et communaute
 */

import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import type { PagerViewOnPageSelectedEvent, PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { espacements, rayons, typographie } from '../../src/constantes/theme';
import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import createStyles from '../../src/features/accueil/accueil.styles';
import { useUser } from '../../src/contexts/UserContext';
import { useSocket } from '../../src/contexts/SocketContext';
import { Utilisateur } from '../../src/services/auth';
import { PostMediaCarousel, UnifiedCommentsSheet, PublicationCard, VideoOpenParams, ImageViewerModal, MessagesTab, StorySwipeOverlay, KeyboardView, AdCard } from '../../src/composants';
import { isVideoUrl } from '../../src/utils/mediaUtils';
import { videoPlaybackStore } from '../../src/stores/videoPlaybackStore';
import { videoRegistry } from '../../src/stores/videoRegistry';
import { type FeedItem, buildFeedWithAds, isAdItem, isPublication, getFeedItemKey } from '../../src/services/ads';
import {
  Publication,
  getPublications,
} from '../../src/services/publications';
import {
  Conversation,
  getConversations,
} from '../../src/services/messagerie';
import {
  Evenement,
  getEvenements,
} from '../../src/services/evenements';
import { getNotifications } from '../../src/services/notifications';
import { getDemandesAmis } from '../../src/services/utilisateurs';
import Avatar from '../../src/composants/Avatar';
import AnimatedPressable from '../../src/composants/AnimatedPressable';
import { SkeletonList } from '../../src/composants/SkeletonLoader';
// Nouveau systeme gamification
import NextAction from '../../src/composants/NextAction';
import XpToast from '../../src/composants/XpToast';
import { useGamification } from '../../src/contexts/GamificationContext';
import StoriesRow from '../../src/composants/StoriesRow';
import StoryViewer from '../../src/composants/StoryViewer';
import StoryCreator from '../../src/composants/StoryCreator';
import { Story } from '../../src/services/stories';
import { ANIMATION_CONFIG } from '../../src/hooks/useAnimations';
import { useAutoRefresh, useNotificationsRefresh } from '../../src/hooks/useAutoRefresh';
import OnboardingFlow from '../../src/composants/CoachMark';
import ThemeSelectionModal from '../../src/composants/ThemeSelectionModal';
// Composants extraits (Phase 6)
import DecouvrirTab from '../../src/features/accueil/DecouvrirTab';
import LiveTab from '../../src/features/accueil/LiveTab';
import EntrepreneurTab from '../../src/features/accueil/EntrepreneurTab';
import CreerPublicationModal from '../../src/composants/features/feed/CreerPublicationModal';
import RechercheModal from '../../src/composants/features/feed/RechercheModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type OngletActif = 'feed' | 'decouvrir' | 'live' | 'messages' | 'entrepreneur';

// Composant wrapper pour l'animation d'entrée des publications
const AnimatedPublicationWrapper = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: ANIMATION_CONFIG.durations.normal,
      delay: index * 50, // Stagger de 50ms entre chaque post
      useNativeDriver: true,
      easing: ANIMATION_CONFIG.easing.smooth,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: animatedValue,
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

// Composant NavTab memoizé pour éviter les re-renders inutiles sur Android
interface NavTabProps {
  onglet: { key: OngletActif; label: string; icon: keyof typeof Ionicons.glyphMap };
  index: number;
  tabWidth: number;
  isActive: boolean;
  opacity: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
  unreadCount?: number;
  couleurs: any;
}

const NavTab = memo(({ onglet, tabWidth, isActive, opacity, onPress, unreadCount, couleurs }: NavTabProps) => (
  <Pressable
    style={{ width: tabWidth, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
    onPress={onPress}
  >
    <Animated.View style={{ opacity, alignItems: 'center' }}>
      <Ionicons
        name={onglet.icon}
        size={20}
        color={isActive ? couleurs.primaire : couleurs.texteSecondaire}
      />
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: isActive ? couleurs.primaire : couleurs.texteSecondaire,
          fontWeight: isActive ? '600' : '400',
        }}
        numberOfLines={1}
      >
        {onglet.label}
      </Text>
    </Animated.View>
    {onglet.key === 'messages' && unreadCount !== undefined && unreadCount > 0 && (
      <View style={{
        position: 'absolute',
        top: 2,
        right: tabWidth / 2 - 18,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
      </View>
    )}
  </Pressable>
));

export default function Accueil() {
  const { couleurs } = useTheme();
  const { utilisateur, needsStatut, refreshUser } = useUser();
  const { applyDelta } = useGamification();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // Configure audio mode: sound in feed, iOS silent mode support
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  // Socket pour les compteurs en temps réel
  const {
    isConnected: socketConnected,
    unreadMessages: socketUnreadMessages,
    unreadNotifications: socketUnreadNotifications,
    unreadDemandesAmis: socketUnreadDemandesAmis,
  } = useSocket();

  // Navigation vers profil utilisateur (mon profil ou profil public)
  const naviguerVersProfil = useCallback((userId?: string) => {
    if (!userId) {
      console.warn('naviguerVersProfil: userId manquant');
      return;
    }
    // Si c'est mon profil, aller sur /profil
    if (utilisateur && utilisateur.id === userId) {
      router.push('/(app)/profil');
    } else {
      // Sinon, aller sur le profil public
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: userId },
      });
    }
  }, [utilisateur]);

  // Paramètres de navigation (pour scroll vers une publication depuis notification)
  const { publicationId } = useLocalSearchParams<{ publicationId?: string }>();
  const publicationLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const [publicationCiblee, setPublicationCiblee] = useState<string | null>(null);

  const [rafraichissement, setRafraichissement] = useState(false);
  const [ongletActif, setOngletActif] = useState<OngletActif>('feed');
  const [fabOuvert, setFabOuvert] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [afficherScrollTop, setAfficherScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  // Video viewability tracking with hystérésis
  // START_THRESHOLD: video must be this visible to START playing
  // STOP_THRESHOLD: current video keeps playing until it drops below this (hystérésis)
  // Transitions to null (stop all) when no video is above STOP_THRESHOLD
  const activePostIdRef = useRef<string | null>(null);
  const pendingActivePostRef = useRef<string | null>(null);
  const viewabilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringContextRef = useRef(false);
  const lastScrollYRef = useRef<number>(0);
  const sectionOffsetRef = useRef<number>(0);
  const START_THRESHOLD = 0.5;    // 50% visible to START playing
  const STOP_THRESHOLD = 0.15;    // 15% visible to STOP (hystérésis buffer)
  const VIEWABILITY_DELAY_MS = 150; // 150ms debounce between switches

  // Publications API
  const [publications, setPublications] = useState<Publication[]>([]);
  // Feed mixte : publications + publicites inserees par l'algorithme
  const feedItems = useMemo(() => buildFeedWithAds(publications), [publications]);
  const [chargement, setChargement] = useState(true);
  const [modalCreerPost, setModalCreerPost] = useState(false);

  // Video player (reels navigation - states retires, navigation vers /(app)/reels)

  // Comments sheet (UnifiedCommentsSheet)
  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [commentsSheetPostId, setCommentsSheetPostId] = useState<string | null>(null);
  const [commentsSheetCount, setCommentsSheetCount] = useState(0);

  // Ouvrir les commentaires via le sheet unifié
  const openCommentsSheet = useCallback((postId: string, count: number) => {
    setCommentsSheetPostId(postId);
    setCommentsSheetCount(count);
    setCommentsSheetVisible(true);
  }, []);

  const closeCommentsSheet = useCallback(() => {
    setCommentsSheetVisible(false);
    setCommentsSheetPostId(null);
  }, []);

  // ============ CALLBACKS POUR PUBLICATIONCARD (STABLES) ============
  // Ces callbacks sont passés au composant memoizé PublicationCard
  // Ils doivent être stables pour éviter les re-renders inutiles

  const handleOpenImage = useCallback((
    url: string,
    publication: Publication,
    liked: boolean,
    nbLikes: number,
    nbComments: number,
    handlers: { onLike: () => void; onShare: () => void }
  ) => {
    setImageUrl(url);
    setImagePostId(publication._id);
    setImageLiked(liked);
    setImageLikesCount(nbLikes);
    setImageCommentsCount(nbComments);
    setImageOnLike(handlers.onLike);
    setImageOnShare(handlers.onShare);
    setImageModalVisible(true);
  }, []);

  const handleOpenVideo = useCallback((
    params: VideoOpenParams,
    publication: Publication,
    liked: boolean,
    nbLikes: number,
    nbComments: number,
    handlers: { onLike: () => void; onComments: () => void; onShare: () => void }
  ) => {
    // Filtrer les publications qui ont au moins une video
    const videoPubs = publications.filter(p =>
      p.medias?.some(m => m.type === 'video') ||
      (p.media && isVideoUrl(p.media))
    );
    const tappedIndex = videoPubs.findIndex(p => p._id === publication._id);

    // 1. Sauver le contexte feed pour restauration au retour
    videoPlaybackStore.setFeedContext({
      postId: publication._id,
      scrollY: lastScrollYRef.current,
    });

    // 2. Sauver la position vidéo dans la session store
    videoPlaybackStore.saveSession(params.videoUrl, params.positionMillis, false);

    // 3. Stopper la video du feed AVANT de naviguer (evite le double son)
    if (viewabilityTimeoutRef.current) {
      clearTimeout(viewabilityTimeoutRef.current);
      viewabilityTimeoutRef.current = null;
    }
    activePostIdRef.current = null;
    pendingActivePostRef.current = null;
    videoRegistry.stopAll().catch(() => {});
    videoPlaybackStore.setActivePostId(null);
    videoPlaybackStore.setActiveVideo(null);

    // 4. Naviguer vers Reels avec position initiale
    router.push({
      pathname: '/(app)/reels',
      params: {
        initialIndex: String(Math.max(0, tappedIndex)),
        videoPublicationIds: JSON.stringify(videoPubs.map(p => p._id)),
        initialPositionMillis: String(params.positionMillis || 0),
      },
    });
  }, [publications]);

  // ============ FIN CALLBACKS PUBLICATIONCARD ============

  // Image viewer modal (avec actions overlay comme vidéo)
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePostId, setImagePostId] = useState<string | null>(null);
  const [imageLiked, setImageLiked] = useState(false);
  const [imageLikesCount, setImageLikesCount] = useState(0);
  const [imageCommentsCount, setImageCommentsCount] = useState(0);
  const imageOnLikeRef = useRef<(() => void) | null>(null);
  const imageOnShareRef = useRef<(() => void) | null>(null);
  const setImageOnLike = (fn: () => void) => { imageOnLikeRef.current = fn; };
  const setImageOnShare = (fn: () => void) => { imageOnShareRef.current = fn; };
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Helper: générer thumbnail Cloudinary pour vidéo
  const getVideoThumbnail = (videoUrl: string): string => {
    // Cloudinary video URL: https://res.cloudinary.com/xxx/video/upload/v123/folder/file.mp4
    // Thumbnail URL: https://res.cloudinary.com/xxx/video/upload/so_0,w_600,h_600,c_limit/v123/folder/file.jpg
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
      return videoUrl
        .replace('/video/upload/', '/video/upload/so_0,w_600,h_600,c_limit,f_jpg/')
        .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
    }
    // Fallback: retourner l'URL originale (ne marchera pas mais évite le crash)
    return videoUrl;
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
    // Annuler tout timeout existant
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls) {
      // Masquer immédiatement
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      // Afficher immédiatement (sans auto-hide, l'utilisateur doit retaper pour masquer)
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  // Messagerie
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Evenements (lives) API
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargementEvenements, setChargementEvenements] = useState(false);

  // Notifications
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);

  // Demandes d'amis en attente
  const [demandesAmisEnAttente, setDemandesAmisEnAttente] = useState(0);

  // Recherche
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  // Stories
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);
  const [storiesAVisionner, setStoriesAVisionner] = useState<Story[]>([]);
  const [storyUserName, setStoryUserName] = useState('');
  const [storyUserAvatar, setStoryUserAvatar] = useState<string | undefined>();
  const [pendingStoryIndex, setPendingStoryIndex] = useState<number | null>(null);
  const pendingStoryRestoreRef = useRef(false);

  const [storyIsOwn, setStoryIsOwn] = useState(false);
  const [storyUserId, setStoryUserId] = useState('');
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0);

  // Animations FAB
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const action1Anim = useRef(new Animated.Value(0)).current;
  const action2Anim = useRef(new Animated.Value(0)).current;
  const action3Anim = useRef(new Animated.Value(0)).current;
  const action4Anim = useRef(new Animated.Value(0)).current;

  // Animation slide Story Creator (contenu principal glisse a droite)
  const storySlideAnim = useRef(new Animated.Value(0)).current;

  // Onglets de base
  const ongletsBase: { key: OngletActif; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'feed', label: 'Feed', icon: 'home-outline' },
    { key: 'decouvrir', label: 'Decouvrir', icon: 'compass-outline' },
    { key: 'live', label: 'Live', icon: 'radio-outline' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles-outline' },
  ];

  // Onglet Entrepreneur visible uniquement si statut === 'entrepreneur'
  const onglets = React.useMemo(() => {
    if (utilisateur?.statut === 'entrepreneur') {
      return [
        ...ongletsBase,
        { key: 'entrepreneur' as OngletActif, label: 'Projets', icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap },
      ];
    }
    return ongletsBase;
  }, [utilisateur?.statut]);

  // === PAGER VIEW NAVIGATION ===
  const pagerRef = useRef<PagerView>(null);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Obtenir l'index de l'onglet actuel
  const getOngletIndex = useCallback((key: OngletActif) => {
    return onglets.findIndex(o => o.key === key);
  }, [onglets]);

  // Callback quand une page est sélectionnée
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const { position } = event.nativeEvent;
    const targetOnglet = onglets[position];

    if (targetOnglet) {
      // Haptic feedback - plus léger sur Android pour éviter le lag
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.selectionAsync();
      }
      setOngletActif(targetOnglet.key);

      // Sur Android, l'animation peut déjà être en cours via handleOngletPress ou swipe
      // On ne déclenche l'animation que pour les swipes (pas les taps)
      // L'animation spring continuera naturellement vers la bonne position
      if (Platform.OS === 'android') {
        Animated.spring(tabIndicatorPosition, {
          toValue: position,
          useNativeDriver: true,
          tension: 300,
          friction: 30,
        }).start();
      }
    }
  }, [onglets, tabIndicatorPosition]);

  // Callback pendant le scroll - version optimisée pour Android
  // On utilise une approche hybride: animation native quand possible
  const handlePageScroll = useCallback((event: PagerViewOnPageScrollEvent) => {
    // Sur iOS, on peut suivre le scroll en temps réel car c'est plus fluide
    // Sur Android, on laisse l'animation spring gérer la transition
    if (Platform.OS === 'ios') {
      const { position, offset } = event.nativeEvent;
      tabIndicatorPosition.setValue(position + offset);
    }
  }, [tabIndicatorPosition]);

  // Naviguer vers un onglet par index
  const naviguerVersOngletParIndex = useCallback((index: number) => {
    if (index < 0 || index >= onglets.length) return;
    pagerRef.current?.setPage(index);
  }, [onglets.length]);

  // Rediriger vers le choix de statut si necessaire
  useEffect(() => {
    if (needsStatut) {
      router.replace('/(app)/choix-statut');
    }
  }, [needsStatut]);

  useEffect(() => {
    chargerDonnees();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Ecouter les events de navigation inter-ecrans (ex: mes-startups → onglet decouvrir)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('switchTab', (tab: string) => {
      handleOngletPress(tab as OngletActif);
    });
    return () => sub.remove();
  }, [handleOngletPress]);

  // Auto-refresh pour les notifications et messages (polling toutes les 15s)
  // Rafraîchit automatiquement quand l'écran reprend le focus ou l'app revient au premier plan
  useNotificationsRefresh(
    useCallback(async () => {
      await Promise.all([
        chargerNotifications(),
        chargerConversations(),
      ]);
    }, []),
    true // enabled
  );

  // Auto-refresh pour les données générales (polling toutes les 60s)
  // Publications, projets, événements
  useAutoRefresh({
    onRefresh: useCallback(async () => {
      await Promise.all([
        chargerPublications(),
        chargerEvenements(),
      ]);
    }, []),
    pollingInterval: 60000, // 60 secondes
    refreshOnFocus: true,
    minRefreshInterval: 15000, // 15 secondes minimum entre refreshes
    enabled: true,
  });

  // Animation slide geree directement par StorySwipeOverlay pour apercu live
  // Quand on ferme via le bouton ou swipe dans StoryCreator, on anime vers 0
  useEffect(() => {
    if (!storyCreatorVisible) {
      Animated.spring(storySlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [storyCreatorVisible, storySlideAnim]);

  // Clear active video and viewability state when switching away from feed tab
  useEffect(() => {
    if (ongletActif !== 'feed') {
      // Clear viewability tracking
      if (viewabilityTimeoutRef.current) {
        clearTimeout(viewabilityTimeoutRef.current);
        viewabilityTimeoutRef.current = null;
      }
      activePostIdRef.current = null;
      pendingActivePostRef.current = null;
      // Hard stop ALL videos via registry
      videoRegistry.stopAll().catch(() => {});
      // Clear active post and video in store
      videoPlaybackStore.setActivePostId(null);
      videoPlaybackStore.setActiveVideo(null);
    }
  }, [ongletActif]);

  // Cleanup viewability timeout and stop all videos on unmount
  useEffect(() => {
    return () => {
      if (viewabilityTimeoutRef.current) {
        clearTimeout(viewabilityTimeoutRef.current);
      }
      // Hard stop ALL videos on unmount
      videoRegistry.stopAll().catch(() => {});
    };
  }, []);

  // Scroll vers une publication ciblée (depuis notification)
  useEffect(() => {
    if (publicationId && typeof publicationId === 'string') {
      setPublicationCiblee(publicationId);
      // S'assurer qu'on est sur l'onglet feed
      pagerRef.current?.setPageWithoutAnimation(0);
      setOngletActif('feed');
    }
  }, [publicationId]);

  // Effectuer le scroll quand les publications sont chargées et qu'une cible est définie
  useEffect(() => {
    if (publicationCiblee && !chargement && publications.length > 0) {
      // Attendre que les layouts soient calculés
      const timeoutId = setTimeout(() => {
        const layout = publicationLayoutsRef.current.get(publicationCiblee);
        if (layout !== undefined && scrollViewRef.current) {
          // Scroller vers la publication avec un offset pour le header
          const absoluteY = sectionOffsetRef.current + layout.y;
          scrollViewRef.current.scrollTo({
            y: Math.max(0, absoluteY - 100),
            animated: true,
          });
          // Réinitialiser après le scroll
          setTimeout(() => {
            setPublicationCiblee(null);
          }, 1500);
        } else {
          // Publication non trouvée, réinitialiser
          setPublicationCiblee(null);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [publicationCiblee, chargement, publications]);

  const chargerDonnees = async () => {
    await Promise.all([
      chargerPublications(),
      chargerConversations(),
      chargerEvenements(),
      chargerNotifications(),
    ]);
  };

  // Charger le nombre de notifications non lues et demandes d'amis
  const chargerNotifications = async () => {
    try {
      const [notifReponse, demandesReponse] = await Promise.all([
        getNotifications(1, 50),
        getDemandesAmis(),
      ]);

      if (notifReponse.succes && notifReponse.data) {
        // Exclure les demandes d'ami du compteur (elles sont comptées via demandesAmisEnAttente)
        const nonLues = notifReponse.data.notifications.filter(
          n => !n.lue && n.type !== 'demande_ami'
        ).length;
        setNotificationsNonLues(nonLues);
      }

      if (demandesReponse.succes && demandesReponse.data) {
        setDemandesAmisEnAttente(demandesReponse.data.demandes.length);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  // Ouvrir la recherche plein écran
  const ouvrirRecherche = () => {
    setRechercheOuverte(true);
  };

  const chargerPublications = async () => {
    try {
      setChargement(true);
      const reponse = await getPublications(1, 20);
      if (reponse.succes && reponse.data) {
        setPublications(reponse.data.publications);
      }
    } catch (error) {
      console.error('Erreur chargement publications:', error);
    } finally {
      setChargement(false);
    }
  };

  const chargerConversations = async () => {
    try {
      const reponse = await getConversations();
      if (reponse.succes && reponse.data) {
        setConversations(reponse.data.conversations);
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    }
  };

  const chargerEvenements = async () => {
    try {
      setChargementEvenements(true);
      const reponse = await getEvenements({ limit: 10 });
      if (reponse.succes && reponse.data) {
        setEvenements(reponse.data.evenements);
      }
    } catch (error) {
      console.error('Erreur chargement evenements:', error);
    } finally {
      setChargementEvenements(false);
    }
  };

  const handleRafraichissement = async () => {
    setRafraichissement(true);
    await chargerDonnees();
    setRafraichissement(false);
  };

  const handleProfil = useCallback(() => {
    router.push('/(app)/profil');
  }, [router]);

  // Utiliser les compteurs socket si connecté, sinon fallback sur calcul local
  const localUnreadMessages = conversations.reduce((total, conv) => total + conv.messagesNonLus, 0);
  const unreadMessages = socketConnected ? socketUnreadMessages : localUnreadMessages;

  // Compteurs notifications et demandes d'amis avec socket
  const effectiveNotifications = socketConnected ? socketUnreadNotifications : notificationsNonLues;
  const effectiveDemandesAmis = socketConnected ? socketUnreadDemandesAmis : demandesAmisEnAttente;

  // ============ SECTIONS ============

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.searchContainer} onPress={ouvrirRecherche}>
        <Ionicons name="search" size={16} color={couleurs.texteMuted} />
        <Text style={styles.searchPlaceholder}>Rechercher</Text>
      </Pressable>
      <Pressable style={styles.notifButton} onPress={() => router.push('/(app)/notifications')}>
        <Ionicons name="notifications-outline" size={24} color={couleurs.texte} />
        {(effectiveNotifications > 0 || effectiveDemandesAmis > 0) && (
          <View style={[styles.notifBadge, effectiveDemandesAmis > 0 && styles.notifBadgeDemandes]}>
            <Text style={styles.notifBadgeText}>
              {(() => {
                const total = effectiveNotifications + effectiveDemandesAmis;
                return total > 99 ? '99+' : total;
              })()}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable style={styles.avatar} onPress={handleProfil}>
        <Avatar
          uri={utilisateur?.avatar}
          prenom={utilisateur?.prenom}
          nom={utilisateur?.nom}
          taille={36}
        />
      </Pressable>
    </View>
  );

  const handleOngletPress = useCallback((key: OngletActif) => {
    // Haptic feedback - plus léger sur Android
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    const index = getOngletIndex(key);
    if (index !== -1) {
      // Animer l'indicateur immédiatement (animation native fluide)
      Animated.spring(tabIndicatorPosition, {
        toValue: index,
        useNativeDriver: true,
        tension: 300,
        friction: 30,
      }).start();

      // Puis changer la page
      pagerRef.current?.setPage(index);
    }
  }, [getOngletIndex, tabIndicatorPosition]);

  // Largeur d'un onglet pour l'indicateur animé - memoizé
  const TAB_WIDTH = useMemo(() =>
    (SCREEN_WIDTH - espacements.lg * 2) / Math.min(onglets.length, 5),
    [onglets.length]
  );

  // Memoize l'interpolation de l'indicateur pour éviter les recalculs
  const indicatorTranslateX = useMemo(() =>
    tabIndicatorPosition.interpolate({
      inputRange: onglets.map((_, i) => i),
      outputRange: onglets.map((_, i) => i * TAB_WIDTH + 4),
      extrapolate: 'clamp',
    }),
    [tabIndicatorPosition, onglets.length, TAB_WIDTH]
  );

  // Memoize les interpolations d'opacité pour chaque onglet
  const tabOpacities = useMemo(() =>
    onglets.map((_, index) =>
      tabIndicatorPosition.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0.5, 1, 0.5],
        extrapolate: 'clamp',
      })
    ),
    [tabIndicatorPosition, onglets.length]
  );

  // Memoize les handlers de presse pour chaque onglet
  const tabPressHandlers = useMemo(() =>
    onglets.map((onglet) => () => handleOngletPress(onglet.key)),
    [onglets, handleOngletPress]
  );

  const renderNavigation = () => (
    <View style={styles.navigation}>
      <View style={styles.navContent}>
        {/* Indicateur animé qui suit le scroll */}
        <Animated.View
          style={[
            styles.navIndicator,
            {
              width: TAB_WIDTH - 8,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />

        {/* Onglets - utilise le composant memoizé */}
        {onglets.map((onglet, index) => (
          <NavTab
            key={onglet.key}
            onglet={onglet}
            index={index}
            tabWidth={TAB_WIDTH}
            isActive={ongletActif === onglet.key}
            opacity={tabOpacities[index]}
            onPress={tabPressHandlers[index]}
            unreadCount={onglet.key === 'messages' ? unreadMessages : undefined}
            couleurs={couleurs}
          />
        ))}
      </View>
    </View>
  );

  // Handlers pour les stories
  const handleStoryPress = useCallback((userId: string, stories: Story[], userName: string, userAvatar: string | undefined, isOwnStory: boolean) => {
    setStoryUserId(userId);
    setStoriesAVisionner(stories);
    setStoryUserName(userName);
    setStoryUserAvatar(userAvatar);
    setStoryIsOwn(isOwnStory);
    setStoryViewerVisible(true);
  }, []);

  const handleAddStoryPress = useCallback(() => {
    setStoryCreatorVisible(true);
  }, []);

  const handleStoryCreated = useCallback(() => {
    // Rafraichir les stories
    setStoriesRefreshKey(prev => prev + 1);
  }, []);

  // Navigation vers le profil depuis une story (Bug #3: préserver l'état)
  const handleStoryNavigateToProfile = useCallback((userId: string, currentIndex: number) => {
    // Sauvegarder l'état pour restauration au retour
    setPendingStoryIndex(currentIndex);
    pendingStoryRestoreRef.current = true;
    // Fermer le viewer
    setStoryViewerVisible(false);
    // Naviguer vers le profil
    router.push(`/utilisateur/${userId}`);
  }, []);

  // Restaurer le story viewer au retour de navigation
  useFocusEffect(
    useCallback(() => {
      if (pendingStoryRestoreRef.current && pendingStoryIndex !== null) {
        // Réouvrir le story viewer à l'index sauvegardé
        pendingStoryRestoreRef.current = false;
        setStoryViewerVisible(true);
      }
    }, [pendingStoryIndex])
  );

  // Ref to always hold the latest computeVideoViewability (declared later in file)
  const computeViewabilityRef = useRef<((scrollY: number) => void) | null>(null);

  // Stop all feed video/audio when create-post modal is open, resume on close
  useEffect(() => {
    if (modalCreerPost) {
      // Hard stop all videos immediately
      if (viewabilityTimeoutRef.current) {
        clearTimeout(viewabilityTimeoutRef.current);
        viewabilityTimeoutRef.current = null;
      }
      activePostIdRef.current = null;
      pendingActivePostRef.current = null;
      videoRegistry.stopAll().catch(() => {});
      videoPlaybackStore.setActivePostId(null);
      videoPlaybackStore.setActiveVideo(null);

      return () => {
        // Modal closing — re-trigger viewability after short delay
        setTimeout(() => {
          computeViewabilityRef.current?.(lastScrollYRef.current);
        }, 300);
      };
    }
  }, [modalCreerPost]);

  // Manage active video on screen focus/blur
  // On focus: restore feed context if returning from Reels, otherwise re-trigger viewability
  // On blur: stop all videos and clear active state
  useFocusEffect(
    useCallback(() => {
      // === ON FOCUS ===
      const feedContext = videoPlaybackStore.getFeedContext();

      // Blur cleanup (shared between both branches)
      const blurCleanup = () => {
        if (viewabilityTimeoutRef.current) {
          clearTimeout(viewabilityTimeoutRef.current);
          viewabilityTimeoutRef.current = null;
        }
        restoringContextRef.current = false;
        activePostIdRef.current = null;
        pendingActivePostRef.current = null;
        videoRegistry.stopAll().catch(() => {});
        videoPlaybackStore.setActivePostId(null);
        videoPlaybackStore.setActiveVideo(null);
      };

      if (feedContext) {
        // Returning from Reels: restore scroll + force active post
        videoPlaybackStore.setFeedContext(null); // consume one-shot

        // Freeze viewability during restore
        restoringContextRef.current = true;

        // Compute correct scrollY for the target post (handles swiped-to-different-video case)
        // If the user watched a different video in Reels, we need to scroll to THAT post
        let targetScrollY = feedContext.scrollY; // fallback to saved scrollY
        const postLayout = publicationLayoutsRef.current.get(feedContext.postId);
        if (postLayout) {
          targetScrollY = Math.max(0, sectionOffsetRef.current + postLayout.y - 100);
        }

        // Restore scroll position (no animation to avoid flash)
        scrollViewRef.current?.scrollTo({ y: targetScrollY, animated: false });

        // Force active post (bypass viewability calculation)
        activePostIdRef.current = feedContext.postId;
        pendingActivePostRef.current = feedContext.postId;
        videoPlaybackStore.setActivePostId(feedContext.postId);
        const post = publications.find(p => p._id === feedContext.postId);
        const video = post?.medias?.find(m => m.type === 'video');
        videoPlaybackStore.setActiveVideo(video?.url || null);

        // Unfreeze after 500ms — let scroll + seek stabilize
        const restoreTimer = setTimeout(() => {
          restoringContextRef.current = false;
          computeViewabilityRef.current?.(lastScrollYRef.current);
        }, 500);

        return () => {
          clearTimeout(restoreTimer);
          blurCleanup();
        };
      } else {
        // Normal focus (not returning from Reels)
        const timer = setTimeout(() => {
          computeViewabilityRef.current?.(lastScrollYRef.current);
        }, 200);

        return () => {
          clearTimeout(timer);
          blurCleanup();
        };
      }
    }, [publications])
  );

  const renderStories = () => (
    <StoriesRow
      key={storiesRefreshKey}
      onStoryPress={handleStoryPress}
      onAddStoryPress={handleAddStoryPress}
      refreshing={rafraichissement}
    />
  );

  const handleUpdatePublication = (updatedPub: Publication) => {
    setPublications(prev => prev.map(p => p._id === updatedPub._id ? updatedPub : p));
  };

  const handleDeletePublication = (id: string) => {
    setPublications(prev => prev.filter(p => p._id !== id));
  };

  const renderFeedContent = () => (
    <>
      {renderStories()}
      <NextAction />
      <View
        style={styles.section}
        onLayout={(e) => {
          sectionOffsetRef.current = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fil d'actualite</Text>
        </View>
        {chargement ? (
          <SkeletonList type="post" count={3} />
        ) : publications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={couleurs.texteSecondaire} />
            <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
            <Text style={styles.emptySubtext}>Soyez le premier a publier !</Text>
          </View>
        ) : (
          feedItems.map((item, index) => {
            const layoutKey = getFeedItemKey(item);
            return (
              <View
                key={layoutKey}
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  publicationLayoutsRef.current.set(layoutKey, { y, height });
                }}
                style={isPublication(item) && publicationCiblee === item._id ? {
                  borderWidth: 2,
                  borderColor: couleurs.primaire,
                  borderRadius: rayons.lg,
                  backgroundColor: couleurs.primaireLight,
                } : undefined}
              >
                <AnimatedPublicationWrapper index={index}>
                  {isAdItem(item) ? (
                    <AdCard
                      ad={item}
                      feedPosition={index}
                      mediaWidth={SCREEN_WIDTH - 32}
                      mediaHeight={SCREEN_WIDTH - 32}
                      styles={styles}
                    />
                  ) : (
                    <PublicationCard
                      publication={item}
                      onUpdate={handleUpdatePublication}
                      onDelete={handleDeletePublication}
                      onOpenCommentsSheet={openCommentsSheet}
                      onNavigateToProfile={naviguerVersProfil}
                      onOpenImage={handleOpenImage}
                      onOpenVideo={handleOpenVideo}
                      onResetControlsTimeout={resetControlsTimeout}
                      styles={styles}
                      mediaWidth={SCREEN_WIDTH - 32}
                      mediaHeight={SCREEN_WIDTH - 32}
                    />
                  )}
                </AnimatedPublicationWrapper>
              </View>
            );
          })
        )}
      </View>
    </>
  );




  // Actions FAB
  const FAB_ACTIONS = [
    { id: 1, icon: 'create-outline' as const, label: 'Publier', color: '#6366F1', action: () => setModalCreerPost(true) },
    { id: 2, icon: 'storefront-outline' as const, label: 'Boutique', color: '#8B5CFF', action: () => router.push('/(app)/boutique') },
    { id: 3, icon: 'trophy-outline' as const, label: 'Parcours', color: '#FFBD59', action: () => router.push('/(app)/parcours') },
    { id: 4, icon: 'rocket-outline' as const, label: 'Startup', color: '#F59E0B', action: () => router.push('/(app)/mes-startups') },
  ];

  const toggleFab = () => {
    const toValue = fabOuvert ? 0 : 1;

    // Animation du bouton principal
    Animated.parallel([
      Animated.spring(fabRotation, {
        toValue: fabOuvert ? 0 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(fabScale, {
        toValue: fabOuvert ? 1 : 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(backdropOpacity, {
        toValue: fabOuvert ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(menuTranslateY, {
        toValue: fabOuvert ? 20 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();

    // Animation des actions avec delai cascade
    const actionAnims = [action1Anim, action2Anim, action3Anim, action4Anim];
    actionAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: fabOuvert ? 0 : index * 50,
      }).start();
    });

    setFabOuvert(!fabOuvert);
  };

  const handleFabAction = (action: () => void) => {
    toggleFab();
    setTimeout(action, 200);
  };

  // Viewability calculation with hystérésis — called from handleScroll AND initial load
  // Uses absolute positions (sectionOffset + relativeY) and real measured heights
  const computeVideoViewability = useCallback((scrollY: number) => {
    // Freeze viewability during feed context restore (returning from Reels)
    if (restoringContextRef.current) return;
    if (ongletActif !== 'feed' || feedItems.length === 0) return;

    const viewportTop = scrollY;
    const viewportBottom = scrollY + SCREEN_HEIGHT;
    const sectionOffset = sectionOffsetRef.current;

    // Calculate visibility ratio for all video items (publications + ads)
    let bestPostId: string | null = null;
    let bestVisibility = 0;
    let currentActiveVisibility = 0;

    for (const item of feedItems) {
      // Determine layout key, video postId, and whether item has video
      let layoutKey: string;
      let videoPostId: string;
      let hasVideo: boolean;

      if (isAdItem(item)) {
        layoutKey = getFeedItemKey(item);
        videoPostId = `ad:${item._id}`;
        hasVideo = true; // ads are always video
      } else {
        layoutKey = item._id;
        videoPostId = item._id;
        hasVideo = item.medias?.some(m => m.type === 'video') ?? false;
      }

      if (!hasVideo) continue;

      const layout = publicationLayoutsRef.current.get(layoutKey);
      if (!layout) continue;

      // Absolute position within ScrollView content
      const postTop = sectionOffset + layout.y;
      const postBottom = postTop + layout.height;

      const visibleTop = Math.max(postTop, viewportTop);
      const visibleBottom = Math.min(postBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;

      // Track current active video's visibility
      if (videoPostId === activePostIdRef.current) {
        currentActiveVisibility = visibilityRatio;
      }

      // Track the most visible video post
      if (visibilityRatio > bestVisibility) {
        bestVisibility = visibilityRatio;
        bestPostId = videoPostId;
      }
    }

    // Hystérésis decision logic:
    // - Current active stays as long as it's above STOP_THRESHOLD (15%)
    // - New video needs START_THRESHOLD (50%) to take over
    // - If nothing above STOP_THRESHOLD → STOP ALL (null)
    let nextActivePostId: string | null = null;

    if (activePostIdRef.current) {
      if (currentActiveVisibility >= STOP_THRESHOLD) {
        nextActivePostId = activePostIdRef.current;
      } else {
        if (bestPostId && bestVisibility >= START_THRESHOLD) {
          nextActivePostId = bestPostId;
        } else {
          nextActivePostId = null;
        }
      }
    } else {
      if (bestPostId && bestVisibility >= START_THRESHOLD) {
        nextActivePostId = bestPostId;
      } else {
        nextActivePostId = null;
      }
    }

    // Apply change if different from what's pending
    if (nextActivePostId !== pendingActivePostRef.current) {
      pendingActivePostRef.current = nextActivePostId;

      if (viewabilityTimeoutRef.current) {
        clearTimeout(viewabilityTimeoutRef.current);
        viewabilityTimeoutRef.current = null;
      }

      const capturedNextId = nextActivePostId;
      viewabilityTimeoutRef.current = setTimeout(() => {
        if (pendingActivePostRef.current === capturedNextId) {
          if (activePostIdRef.current !== capturedNextId) {
            activePostIdRef.current = capturedNextId;

            if (capturedNextId) {
              // Activate a specific video (publication or ad)
              videoRegistry.stopAllExcept(capturedNextId).catch(() => {});
              videoPlaybackStore.setActivePostId(capturedNextId);

              // Find video URL — handle both publications and ads
              let videoUrl: string | null = null;
              if (capturedNextId.startsWith('ad:')) {
                const adId = capturedNextId.slice(3); // remove 'ad:' prefix
                const adItem = feedItems.find(i => isAdItem(i) && i._id === adId);
                videoUrl = adItem && isAdItem(adItem) ? adItem.videoUrl : null;
              } else {
                const pub = feedItems.find(i => isPublication(i) && i._id === capturedNextId);
                if (pub && isPublication(pub)) {
                  videoUrl = pub.medias?.find(m => m.type === 'video')?.url || null;
                }
              }
              videoPlaybackStore.setActiveVideo(videoUrl);
            } else {
              // STOP ALL — no video visible on screen
              videoRegistry.stopAll().catch(() => {});
              videoPlaybackStore.setActivePostId(null);
              videoPlaybackStore.setActiveVideo(null);
            }
          }
        }
        viewabilityTimeoutRef.current = null;
      }, VIEWABILITY_DELAY_MS);
    }
  }, [ongletActif, feedItems]);

  // Keep ref in sync so useFocusEffect can call the latest version
  computeViewabilityRef.current = computeVideoViewability;

  // Gestion du scroll pour afficher/masquer le bouton scroll-to-top + viewability vidéos
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    lastScrollYRef.current = scrollY;
    const seuil = 300;

    if (scrollY > seuil && !afficherScrollTop) {
      setAfficherScrollTop(true);
      Animated.spring(scrollTopOpacity, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else if (scrollY <= seuil && afficherScrollTop) {
      Animated.timing(scrollTopOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setAfficherScrollTop(false));
    }

    computeVideoViewability(scrollY);
  };

  // Scroll begin: no kill-switch — videos keep playing until another post becomes dominant
  // Initial viewability: trigger calculation after publications load + layout
  // handleScroll only fires on user scroll, so first visible video would never autoplay
  useEffect(() => {
    if (publications.length === 0 || ongletActif !== 'feed') return;

    // Wait for onLayout callbacks to populate publicationLayoutsRef
    const timer = setTimeout(() => {
      computeVideoViewability(lastScrollYRef.current);
    }, 300);
    return () => clearTimeout(timer);
  }, [feedItems.length, ongletActif, computeVideoViewability]);

  const handleScrollBegin = useCallback(() => {
    // No-op: let viewability tracking handle video switching
  }, []);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const fabRotationInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const renderFAB = () => {
    const actionAnims = [action1Anim, action2Anim, action3Anim, action4Anim];

    return (
      <>
        {/* Backdrop */}
        {fabOuvert && (
          <Animated.View
            style={[styles.fabBackdrop, { opacity: backdropOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleFab} />
          </Animated.View>
        )}

        {/* Menu Actions */}
        <Animated.View
          style={[
            styles.fabMenu,
            {
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
          pointerEvents={fabOuvert ? 'auto' : 'none'}
        >
          {FAB_ACTIONS.map((item, index) => (
            <Animated.View
              key={item.id}
              style={[
                styles.fabActionContainer,
                {
                  opacity: actionAnims[index],
                  transform: [
                    {
                      scale: actionAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                    {
                      translateY: actionAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.fabActionLabel}>{item.label}</Text>
              <Pressable
                style={[styles.fabAction, { backgroundColor: item.color }]}
                onPress={() => handleFabAction(item.action)}
              >
                <Ionicons name={item.icon} size={22} color={couleurs.blanc} />
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Bouton principal FAB */}
        <Pressable style={styles.fab} onPress={toggleFab}>
          <Animated.View
            style={[
              styles.fabGradientWrapper,
              {
                transform: [
                  { scale: fabScale },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={fabOuvert ? ['#EF4444', '#DC2626'] : [...couleurs.gradientPrimaire]}
              style={styles.fabGradient}
            >
              <Animated.View style={{ transform: [{ rotate: fabRotationInterpolate }] }}>
                <Ionicons name="add" size={28} color={couleurs.blanc} />
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* StoryCreator positionne derriere - visible quand le contenu principal glisse */}
      <View style={[styles.storyCreatorBackground, { paddingTop: insets.top }]}>
        <StoryCreator
          visible={storyCreatorVisible}
          onClose={() => setStoryCreatorVisible(false)}
          onStoryCreated={handleStoryCreated}
          embedded
          parentSlideAnim={storySlideAnim}
        />
      </View>

      {/* Contenu principal - glisse vers la droite pour reveler StoryCreator */}
      <Animated.View
        style={[
          styles.mainContentSlide,
          {
            transform: [{ translateX: storySlideAnim }],
            paddingTop: insets.top,
          },
        ]}
      >
        <LinearGradient
          colors={[couleurs.fond, couleurs.fondSecondaire, couleurs.fond]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderHeader()}
        {renderNavigation()}

        {/* PagerView pour navigation fluide style Instagram */}
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={handlePageSelected}
          onPageScroll={handlePageScroll}
          overdrag={true}
          overScrollMode="always"
          offscreenPageLimit={2}
        >
          {onglets.map((onglet) => {
            if (onglet.key === 'feed') {
              return (
                <View key="feed" style={styles.pageContainer}>
                  <StorySwipeOverlay
                    enabled={ongletActif === 'feed' && !storyCreatorVisible}
                    onSwipeToStory={() => setStoryCreatorVisible(true)}
                    slideAnim={storySlideAnim}
                  >
                    <ScrollView
                      ref={scrollViewRef}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.scrollContent}
                      keyboardShouldPersistTaps="handled"
                      onScroll={handleScroll}
                      onScrollBeginDrag={handleScrollBegin}
                      onMomentumScrollBegin={handleScrollBegin}
                      scrollEventThrottle={16}
                      refreshControl={
                        <RefreshControl
                          refreshing={rafraichissement}
                          onRefresh={handleRafraichissement}
                          tintColor={couleurs.primaire}
                        />
                      }
                    >
                      {renderFeedContent()}
                      <View style={styles.footer}>
                        <Text style={styles.footerLogo}>LPP</Text>
                        <Text style={styles.footerText}>La Premiere Pierre</Text>
                        <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
                      </View>
                    </ScrollView>
                  </StorySwipeOverlay>
                </View>
              );
            }
            if (onglet.key === 'decouvrir') {
              return (
                <View key="decouvrir" style={styles.pageContainer}>
                  <DecouvrirTab
                    couleurs={couleurs}
                    styles={styles}
                    utilisateur={utilisateur}
                    applyDelta={applyDelta}
                    rafraichissement={rafraichissement}
                    onRefresh={handleRafraichissement}
                  />
                </View>
              );
            }
            if (onglet.key === 'live') {
              return (
                <View key="live" style={styles.pageContainer}>
                  <LiveTab
                    couleurs={couleurs}
                    styles={styles}
                    isActive={ongletActif === 'live'}
                  />
                </View>
              );
            }
            if (onglet.key === 'messages') {
              return (
                <View key="messages" style={styles.pageContainer}>
                  <MessagesTab isActive={ongletActif === 'messages'} />
                </View>
              );
            }
            if (onglet.key === 'entrepreneur') {
              return (
                <View key="entrepreneur" style={styles.pageContainer}>
                  <EntrepreneurTab
                    couleurs={couleurs}
                    styles={styles}
                    utilisateur={utilisateur}
                  />
                </View>
              );
            }
            return null;
          }).filter(Boolean)}
        </PagerView>
      </Animated.View>

      {renderFAB()}

      {/* Bouton scroll to top - masqué quand le FAB est ouvert */}
      {afficherScrollTop && !fabOuvert && (
        <Animated.View
          style={[
            styles.scrollTopBtn,
            {
              opacity: scrollTopOpacity,
              transform: [{ scale: scrollTopOpacity }],
            },
          ]}
        >
          <Pressable onPress={scrollToTop} style={styles.scrollTopBtnInner}>
            <Ionicons name="chevron-up" size={22} color={couleurs.texte} />
          </Pressable>
        </Animated.View>
      )}
      </Animated.View>

      {/* Modal creer publication (composant extrait) */}
      <CreerPublicationModal
        visible={modalCreerPost}
        onClose={() => setModalCreerPost(false)}
        couleurs={couleurs}
        styles={styles}
        utilisateur={utilisateur}
        onPublicationCreated={(pub) => setPublications(prev => [pub, ...prev])}
        applyDelta={applyDelta}
        naviguerVersProfil={naviguerVersProfil}
      />

      {/* Recherche plein ecran (composant extrait) */}
      <RechercheModal
        visible={rechercheOuverte}
        onClose={() => setRechercheOuverte(false)}
        couleurs={couleurs}
        styles={styles}
        insets={insets}
      />

      {/* Modal Visionneuse Image - Style Instagram avec actions overlay */}
      <ImageViewerModal
        visible={imageModalVisible}
        imageUrl={imageUrl}
        postId={imagePostId || undefined}
        onClose={() => {
          setImageModalVisible(false);
          setImageUrl(null);
          setImagePostId(null);
        }}
        liked={imageLiked}
        likesCount={imageLikesCount}
        commentsCount={imageCommentsCount}
        onLike={imageOnLikeRef.current || undefined}
        onComments={imagePostId ? () => openCommentsSheet(imagePostId, imageCommentsCount) : undefined}
        onShare={imageOnShareRef.current || undefined}
      />

      {/* Modal Viewer Stories */}
      <StoryViewer
        visible={storyViewerVisible}
        stories={storiesAVisionner}
        userId={storyUserId}
        userName={storyUserName}
        userAvatar={storyUserAvatar}
        isOwnStory={storyIsOwn}
        initialIndex={pendingStoryIndex ?? 0}
        onNavigateToProfile={handleStoryNavigateToProfile}
        onClose={() => {
          setStoryViewerVisible(false);
          setStoriesAVisionner([]);
          setPendingStoryIndex(null);
          pendingStoryRestoreRef.current = false;
          // Rafraîchir les stories pour mettre à jour les vues
          setStoriesRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Comments Sheet - Expérience unifiée */}
      <UnifiedCommentsSheet
        postId={commentsSheetPostId}
        visible={commentsSheetVisible}
        onClose={closeCommentsSheet}
        onCommentAdded={() => {
          // Rafraîchir le compteur de commentaires pour le post concerné
          if (commentsSheetPostId) {
            setPublications(prev =>
              prev.map(p =>
                p._id === commentsSheetPostId
                  ? { ...p, nbCommentaires: p.nbCommentaires + 1 }
                  : p
              )
            );
          }
        }}
        mode="modal"
        theme="light"
        initialCount={commentsSheetCount}
      />
      {/* Choix du theme a la premiere connexion */}
      <ThemeSelectionModal delay={800} />
      {/* Onboarding premiere session - flow sequentiel */}
      <OnboardingFlow
        id="onboarding_v1"
        delay={1200}
        steps={[
          {
            message: 'Bienvenue sur La Premiere Pierre ! Decouvre les projets de la communaute en scrollant le fil.',
            icon: 'rocket-outline',
            iconColor: '#7C5CFF',
          },
          {
            message: 'Tes quetes te guident dans ta progression. Chaque action te rapporte de l\'XP et debloque de nouveaux niveaux !',
            icon: 'trophy-outline',
            iconColor: '#FFBD59',
          },
          {
            message: 'Like, commente, suis des projets, ajoute des amis... chaque interaction compte pour ta progression.',
            icon: 'heart-outline',
            iconColor: '#FF4D6D',
          },
          {
            message: 'Glisse vers la droite pour creer une story, ou appuie sur les cercles en haut pour voir celles des autres.',
            icon: 'videocam-outline',
            iconColor: '#2DE2E6',
            buttonText: "C'est parti !",
          },
        ]}
      />

      {/* Toast XP Gamification (nouveau systeme) */}
      <XpToast />
    </SafeAreaView>
  );
}

