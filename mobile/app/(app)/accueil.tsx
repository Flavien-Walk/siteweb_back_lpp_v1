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
  Image,
  TextInput,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import type { PagerViewOnPageSelectedEvent, PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { espacements, rayons } from '../../src/constantes/theme';
import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { useSocket } from '../../src/contexts/SocketContext';
import { Utilisateur } from '../../src/services/auth';
// useStaff importé uniquement dans PublicationCard extrait
import { PostMediaCarousel, VideoPlayerModal, UnifiedCommentsSheet, PublicationCard, VideoOpenParams, ImageViewerModal, MessagesTab, StorySwipeOverlay } from '../../src/composants';
import { videoPlaybackStore } from '../../src/stores/videoPlaybackStore';
import { videoRegistry } from '../../src/stores/videoRegistry';
import {
  Publication,
  getPublications,
  creerPublication,
  // Les autres imports (toggleLike, comments, etc.) sont dans PublicationCard
} from '../../src/services/publications';
import {
  Conversation,
  Message as MessageAPI,
  Utilisateur as UtilisateurAPI,
  getConversations,
  getMessages,
  envoyerMessage,
  rechercherUtilisateurs,
} from '../../src/services/messagerie';
import {
  Projet,
  CategorieProjet,
  getProjets,
  getProjetsTendance,
  toggleSuivreProjet,
  getMesProjetsEntrepreneur,
  StatsEntrepreneur,
} from '../../src/services/projets';
import {
  Evenement,
  getEvenements,
} from '../../src/services/evenements';
import { getNotifications } from '../../src/services/notifications';
// sharePublication importé dans PublicationCard
import { rechercherUtilisateurs as rechercherUtilisateursAPI, ProfilUtilisateur, getDemandesAmis } from '../../src/services/utilisateurs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Avatar from '../../src/composants/Avatar';

// Clé de stockage pour l'historique de recherche
const HISTORIQUE_RECHERCHE_KEY = '@lpp_historique_recherche';
const MAX_HISTORIQUE = 10;
// LikeButton et getUserBadgeConfig importés dans PublicationCard
import AnimatedPressable from '../../src/composants/AnimatedPressable';
import { SkeletonList } from '../../src/composants/SkeletonLoader';
import StoriesRow from '../../src/composants/StoriesRow';
import StoryViewer from '../../src/composants/StoryViewer';
import StoryCreator from '../../src/composants/StoryCreator';
import { Story } from '../../src/services/stories';
import { ANIMATION_CONFIG } from '../../src/hooks/useAnimations';
import { useAutoRefresh, useNotificationsRefresh } from '../../src/hooks/useAutoRefresh';
import {
  Live as LiveAPI,
  getActiveLives,
  getAgoraToken,
  formatLiveDuration,
  formatViewerCount,
} from '../../src/services/live';
import { LiveCard } from '../../src/composants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type OngletActif = 'feed' | 'decouvrir' | 'live' | 'messages' | 'entrepreneur';

interface TrendingStartup {
  id: string;
  nom: string;
  secteur: string;
  nouveauxAbonnes: number;
}

// Donnees mock pour Tendances (sera remplace par API plus tard)
const TRENDING_STARTUPS: TrendingStartup[] = [
  { id: '1', nom: 'GreenTech Lyon', secteur: 'CleanTech', nouveauxAbonnes: 124 },
  { id: '2', nom: 'MedIA Diagnostics', secteur: 'HealthTech', nouveauxAbonnes: 98 },
  { id: '3', nom: 'FinFlow Systems', secteur: 'FinTech', nouveauxAbonnes: 76 },
];


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
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  // Socket pour les compteurs en temps réel
  const {
    isConnected: socketConnected,
    unreadMessages: socketUnreadMessages,
    unreadNotifications: socketUnreadNotifications,
    unreadDemandesAmis: socketUnreadDemandesAmis,
    onNewMessage,
    onNewNotification,
    onDemandeAmi,
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
  const publicationLayoutsRef = useRef<Map<string, number>>(new Map());
  const [publicationCiblee, setPublicationCiblee] = useState<string | null>(null);

  const [rafraichissement, setRafraichissement] = useState(false);
  const [ongletActif, setOngletActif] = useState<OngletActif>('feed');
  const [recherche, setRecherche] = useState('');
  const [fabOuvert, setFabOuvert] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [afficherScrollTop, setAfficherScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  // Video viewability tracking with debounce
  // Only change active video when a post is dominant (>70% visible) for >150ms
  const activePostIdRef = useRef<string | null>(null);
  const pendingActivePostRef = useRef<string | null>(null);
  const viewabilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const VIEWABILITY_THRESHOLD = 0.7; // 70% visible (stricter to avoid false positives)
  const VIEWABILITY_DELAY_MS = 150; // 150ms minimum view time (faster response)

  // Publications API
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modalCreerPost, setModalCreerPost] = useState(false);
  const [nouveauPostContenu, setNouveauPostContenu] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  // Multi-média: support jusqu'à 10 médias par publication
  const [mediasSelectionnes, setMediasSelectionnes] = useState<Array<{
    uri: string;
    type: 'image' | 'video';
    base64?: string;
    mimeType?: string;
  }>>([]);
  const MAX_MEDIAS = 10;

  // Video player modal
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPostId, setVideoPostId] = useState<string | null>(null);
  const [videoInitialPosition, setVideoInitialPosition] = useState<number>(0);
  const [videoInitialShouldPlay, setVideoInitialShouldPlay] = useState<boolean>(true);
  // États pour interactions fullscreen (Instagram-like)
  const [videoLiked, setVideoLiked] = useState(false);
  const [videoLikesCount, setVideoLikesCount] = useState(0);
  const [videoCommentsCount, setVideoCommentsCount] = useState(0);
  const videoOnLikeRef = useRef<(() => void) | null>(null);
  const videoOnCommentsRef = useRef<(() => void) | null>(null);
  const videoOnShareRef = useRef<(() => void) | null>(null);
  const setVideoOnLike = (fn: () => void) => { videoOnLikeRef.current = fn; };
  const setVideoOnComments = (fn: () => void) => { videoOnCommentsRef.current = fn; };
  const setVideoOnShare = (fn: () => void) => { videoOnShareRef.current = fn; };

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
    setVideoUrl(params.videoUrl);
    setVideoPostId(publication._id);
    setVideoInitialPosition(params.positionMillis);
    setVideoInitialShouldPlay(params.isPlaying);
    // Stocker les infos pour le modal fullscreen
    setVideoLiked(liked);
    setVideoLikesCount(nbLikes);
    setVideoCommentsCount(nbComments);
    setVideoOnLike(handlers.onLike);
    setVideoOnComments(handlers.onComments);
    setVideoOnShare(handlers.onShare);
    setVideoModalVisible(true);
  }, []);

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

  const closeVideoModal = (finalPositionMillis?: number) => {
    // VideoPlayerModal gère tout en interne (y compris les commentaires)
    setVideoModalVisible(false);
    setVideoUrl(null);
    setVideoInitialPosition(0);
    setVideoInitialShouldPlay(true);
  };

  // Messagerie
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [rechercheMessage, setRechercheMessage] = useState('');
  const [modalNouvelleConversation, setModalNouvelleConversation] = useState(false);
  const [destinataireRecherche, setDestinataireRecherche] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState<UtilisateurAPI[]>([]);
  const [messageContenu, setMessageContenu] = useState('');
  const [destinataireSelectionne, setDestinataireSelectionne] = useState<UtilisateurAPI | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [conversationActive, setConversationActive] = useState<{ userId: string; participant: UtilisateurAPI } | null>(null);
  const [messagesConversation, setMessagesConversation] = useState<MessageAPI[]>([]);
  const [chargementMessages, setChargementMessages] = useState(false);

  // Projets (startups) API - Decouvrir
  const [projets, setProjets] = useState<Projet[]>([]);
  const [projetsTendance, setProjetsTendance] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);
  const [categorieFiltre, setCategorieFiltre] = useState<CategorieProjet | 'all'>('all');
  const [rechercheProjet, setRechercheProjet] = useState('');
  const [rechercheProjetDebounced, setRechercheProjetDebounced] = useState('');

  // Debounce recherche projet (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setRechercheProjetDebounced(rechercheProjet);
    }, 400);
    return () => clearTimeout(timer);
  }, [rechercheProjet]);

  // Lancer la recherche quand le texte debounced change
  useEffect(() => {
    chargerProjets(categorieFiltre, rechercheProjetDebounced);
  }, [rechercheProjetDebounced]);

  // Projets Entrepreneur (mes projets)
  const [mesProjetsEntrepreneur, setMesProjetsEntrepreneur] = useState<Projet[]>([]);
  const [statsEntrepreneur, setStatsEntrepreneur] = useState<StatsEntrepreneur | null>(null);
  const [chargementMesProjets, setChargementMesProjets] = useState(false);

  // Evenements (lives) API
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargementEvenements, setChargementEvenements] = useState(false);

  // Notifications
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);

  // Demandes d'amis en attente
  const [demandesAmisEnAttente, setDemandesAmisEnAttente] = useState(0);

  // Recherche utilisateurs
  const [rechercheUtilisateurs, setRechercheUtilisateurs] = useState<ProfilUtilisateur[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const rechercheInputRef = useRef<TextInput>(null);

  // Historique de recherche
  const [historiqueRecherche, setHistoriqueRecherche] = useState<string[]>([]);

  // Stories
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);
  const [storiesAVisionner, setStoriesAVisionner] = useState<Story[]>([]);
  const [storyUserName, setStoryUserName] = useState('');
  const [storyUserAvatar, setStoryUserAvatar] = useState<string | undefined>();
  const [pendingStoryIndex, setPendingStoryIndex] = useState<number | null>(null);
  const pendingStoryRestoreRef = useRef(false);

  // Lives
  const [lives, setLives] = useState<LiveAPI[]>([]);
  const [chargementLives, setChargementLives] = useState(false);
  const [rechercheLive, setRechercheLive] = useState('');
  const [triLive, setTriLive] = useState<'populaire' | 'recent'>('populaire');
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
        chargerProjets(),
        chargerEvenements(),
        chargerMesProjetsEntrepreneur(),
      ]);
    }, []),
    pollingInterval: 60000, // 60 secondes
    refreshOnFocus: true,
    minRefreshInterval: 15000, // 15 secondes minimum entre refreshes
    enabled: true,
  });

  // Charger l'historique de recherche au montage
  useEffect(() => {
    chargerHistoriqueRecherche();
  }, []);

  // Charger les lives quand l'onglet live est actif
  useEffect(() => {
    if (ongletActif === 'live') {
      chargerLives();
    }
  }, [ongletActif]);

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
        const layoutY = publicationLayoutsRef.current.get(publicationCiblee);
        if (layoutY !== undefined && scrollViewRef.current) {
          // Scroller vers la publication avec un offset pour le header
          scrollViewRef.current.scrollTo({
            y: Math.max(0, layoutY - 100),
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

  // Fonctions pour l'historique de recherche
  const chargerHistoriqueRecherche = async () => {
    try {
      const data = await AsyncStorage.getItem(HISTORIQUE_RECHERCHE_KEY);
      if (data) {
        setHistoriqueRecherche(JSON.parse(data));
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const ajouterAHistorique = async (terme: string) => {
    try {
      const termeTrim = terme.trim();
      if (termeTrim.length < 2) return;

      // Éviter les doublons et limiter la taille
      const nouvelHistorique = [
        termeTrim,
        ...historiqueRecherche.filter(t => t.toLowerCase() !== termeTrim.toLowerCase()),
      ].slice(0, MAX_HISTORIQUE);

      setHistoriqueRecherche(nouvelHistorique);
      await AsyncStorage.setItem(HISTORIQUE_RECHERCHE_KEY, JSON.stringify(nouvelHistorique));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  };

  const supprimerDeHistorique = async (terme: string) => {
    try {
      const nouvelHistorique = historiqueRecherche.filter(t => t !== terme);
      setHistoriqueRecherche(nouvelHistorique);
      await AsyncStorage.setItem(HISTORIQUE_RECHERCHE_KEY, JSON.stringify(nouvelHistorique));
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  const viderHistorique = async () => {
    try {
      setHistoriqueRecherche([]);
      await AsyncStorage.removeItem(HISTORIQUE_RECHERCHE_KEY);
    } catch (error) {
      console.error('Erreur vidage historique:', error);
    }
  };

  const chargerDonnees = async () => {
    await Promise.all([
      chargerPublications(),
      chargerConversations(),
      chargerProjets(),
      chargerEvenements(),
      chargerNotifications(),
      chargerMesProjetsEntrepreneur(),
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

  // Recherche utilisateurs avec debounce
  useEffect(() => {
    const delai = setTimeout(async () => {
      if (recherche.trim().length >= 2) {
        setChargementRecherche(true);
        try {
          const reponse = await rechercherUtilisateursAPI(recherche.trim());
          if (reponse.succes && reponse.data) {
            setRechercheUtilisateurs(reponse.data.utilisateurs);
          }
        } catch (error) {
          console.error('Erreur recherche utilisateurs:', error);
        } finally {
          setChargementRecherche(false);
        }
      } else {
        setRechercheUtilisateurs([]);
      }
    }, 300);

    return () => clearTimeout(delai);
  }, [recherche]);

  // Ouvrir la recherche plein écran
  const ouvrirRecherche = () => {
    setRechercheOuverte(true);
  };

  // Fermer la recherche plein écran
  const fermerRecherche = () => {
    setRechercheOuverte(false);
    setRecherche('');
    setRechercheUtilisateurs([]);
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

  const chargerProjets = async (filtreCategorie?: CategorieProjet | 'all', filtreRecherche?: string) => {
    try {
      setChargementProjets(true);
      const cat = filtreCategorie ?? categorieFiltre;
      const q = filtreRecherche ?? rechercheProjet;
      const filtres: Record<string, any> = { limit: 20 };
      if (cat !== 'all') filtres.categorie = cat;
      if (q.trim()) filtres.q = q.trim();

      const [projetsRes, tendanceRes] = await Promise.all([
        getProjets(filtres),
        getProjetsTendance(5),
      ]);
      if (projetsRes.succes && projetsRes.data) {
        setProjets(projetsRes.data.projets);
      }
      if (tendanceRes.succes && tendanceRes.data) {
        setProjetsTendance(tendanceRes.data.projets);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement projets:', error);
    } finally {
      setChargementProjets(false);
    }
  };

  // Charger les projets de l'entrepreneur connecte
  const chargerMesProjetsEntrepreneur = async () => {
    if (utilisateur?.statut !== 'entrepreneur') return;
    try {
      setChargementMesProjets(true);
      const reponse = await getMesProjetsEntrepreneur();
      if (reponse.succes && reponse.data) {
        setMesProjetsEntrepreneur(reponse.data.projets);
        setStatsEntrepreneur(reponse.data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement projets entrepreneur:', error);
    } finally {
      setChargementMesProjets(false);
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

  // TODO: Passer a false pour retirer le mock et utiliser les vrais lives
  const MOCK_LIVES_ENABLED = true;

  const chargerLives = async () => {
    try {
      setChargementLives(true);

      if (MOCK_LIVES_ENABLED) {
        // Mock data pour preview UI
        const now = new Date();
        const mockLives: LiveAPI[] = [
          {
            _id: 'mock-1',
            channelName: 'ch-mock-1',
            title: 'Pitch deck review en direct',
            startedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
            viewerCount: 142,
            host: { _id: 'u1', prenom: 'Sarah', nom: 'Martin', avatar: undefined },
          },
          {
            _id: 'mock-2',
            channelName: 'ch-mock-2',
            title: 'Live coding React Native',
            startedAt: new Date(now.getTime() - 22 * 60000).toISOString(),
            viewerCount: 89,
            host: { _id: 'u2', prenom: 'Thomas', nom: 'Dubois', avatar: undefined },
          },
          {
            _id: 'mock-3',
            channelName: 'ch-mock-3',
            title: 'Q&A startup financement',
            startedAt: new Date(now.getTime() - 8 * 60000).toISOString(),
            viewerCount: 67,
            host: { _id: 'u3', prenom: 'Amina', nom: 'Keita', avatar: undefined },
          },
          {
            _id: 'mock-4',
            channelName: 'ch-mock-4',
            title: 'Design UI/UX tips',
            startedAt: new Date(now.getTime() - 3 * 60000).toISOString(),
            viewerCount: 34,
            host: { _id: 'u4', prenom: 'Lucas', nom: 'Bernard', avatar: undefined },
          },
          {
            _id: 'mock-5',
            channelName: 'ch-mock-5',
            title: undefined,
            startedAt: new Date(now.getTime() - 95 * 60000).toISOString(),
            viewerCount: 213,
            host: { _id: 'u5', prenom: 'Emma', nom: 'Laurent', avatar: undefined },
          },
        ];
        setLives(mockLives);
        setChargementLives(false);
        return;
      }

      const reponse = await getActiveLives();
      if (reponse.succes && reponse.data) {
        // Filtrer les lives fantomes (> 12h = clairement perime/jamais termine)
        const MAX_LIVE_DURATION = 12 * 60 * 60 * 1000;
        const now = Date.now();
        const livesActifs = reponse.data.lives.filter(l => {
          const duree = now - new Date(l.startedAt).getTime();
          return duree < MAX_LIVE_DURATION;
        });
        setLives(livesActifs);
      }
    } catch (error) {
      console.error('Erreur chargement lives:', error);
    } finally {
      setChargementLives(false);
    }
  };

  const handleSuivreProjet = async (projetId: string) => {
    try {
      const reponse = await toggleSuivreProjet(projetId);
      if (reponse.succes && reponse.data) {
        setProjets(prev => prev.map(p =>
          p._id === projetId
            ? { ...p, estSuivi: reponse.data!.estSuivi, nbFollowers: reponse.data!.nbFollowers }
            : p
        ));
      }
    } catch (error) {
      console.error('Erreur suivre projet:', error);
    }
  };

  const handleRechercheDestinataire = async (texte: string) => {
    setDestinataireRecherche(texte);
    if (texte.length < 2) {
      setResultatsRecherche([]);
      return;
    }
    try {
      const reponse = await rechercherUtilisateurs(texte);
      if (reponse.succes && reponse.data) {
        setResultatsRecherche(reponse.data.utilisateurs);
      }
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
    }
  };

  const handleEnvoyerMessage = async () => {
    if (!destinataireSelectionne || !messageContenu.trim() || envoiEnCours) return;

    try {
      setEnvoiEnCours(true);
      const reponse = await envoyerMessage(messageContenu.trim(), { destinataireId: destinataireSelectionne._id });
      if (reponse.succes) {
        setMessageContenu('');
        setDestinataireSelectionne(null);
        setDestinataireRecherche('');
        setModalNouvelleConversation(false);
        await chargerConversations();
        Alert.alert('Succes', 'Message envoye !');
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible d\'envoyer le message');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const handleOuvrirConversation = async (conv: Conversation) => {
    // Rediriger vers le nouvel ecran de conversation
    router.push({
      pathname: '/(app)/conversation/[id]',
      params: { id: conv._id },
    });
  };

  const handleEnvoyerMessageConversation = async () => {
    if (!conversationActive || !messageContenu.trim() || envoiEnCours) return;

    try {
      setEnvoiEnCours(true);
      const reponse = await envoyerMessage(messageContenu.trim(), { destinataireId: conversationActive.userId });
      if (reponse.succes && reponse.data) {
        setMessagesConversation(prev => [...prev, reponse.data!.message]);
        setMessageContenu('');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const handleRafraichissement = async () => {
    setRafraichissement(true);
    await chargerDonnees();
    setRafraichissement(false);
  };

  const handleCreerPost = async () => {
    if ((!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) || creationEnCours) return;

    try {
      setCreationEnCours(true);

      // Préparer les médias en base64
      let mediasData: string[] | undefined;
      if (mediasSelectionnes.length > 0) {
        mediasData = mediasSelectionnes.map((m) => {
          if (m.base64) {
            const mimeType = m.mimeType || (m.type === 'video' ? 'video/mp4' : 'image/jpeg');
            return `data:${mimeType};base64,${m.base64}`;
          }
          return m.uri;
        });
      }

      const reponse = await creerPublication(nouveauPostContenu.trim(), mediasData);
      if (reponse.succes && reponse.data) {
        setPublications(prev => [reponse.data!.publication, ...prev]);
        setNouveauPostContenu('');
        setMediasSelectionnes([]);
        setModalCreerPost(false);
        Alert.alert('Succes', 'Publication creee !');
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de creer la publication');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setCreationEnCours(false);
    }
  };

  // Sélection d'images depuis la galerie (multi-sélection)
  const handleSelectImage = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} médias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour ajouter des photos.');
        return;
      }

      const remainingSlots = MAX_MEDIAS - mediasSelectionnes.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMedias = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image' as const,
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        }));
        setMediasSelectionnes(prev => [...prev, ...newMedias].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
    }
  };

  // Sélection d'une vidéo depuis la galerie (ajout au tableau)
  const handleSelectVideo = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} médias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour ajouter des vidéos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Vérifier la taille du fichier (limite à 50MB)
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > 50 * 1024 * 1024) {
          Alert.alert('Vidéo trop volumineuse', 'La vidéo ne doit pas dépasser 50 MB. Essayez une vidéo plus courte.');
          return;
        }

        // Lire la vidéo en base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setMediasSelectionnes(prev => [...prev, {
          uri: asset.uri,
          type: 'video' as const,
          base64: base64,
          mimeType: asset.mimeType || 'video/mp4',
        }].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      console.error('Erreur sélection vidéo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo. Elle est peut-être trop volumineuse.');
    }
  };

  // Prendre une photo avec l'appareil photo (ajout au tableau)
  const handleTakePhoto = async () => {
    try {
      if (mediasSelectionnes.length >= MAX_MEDIAS) {
        Alert.alert('Limite atteinte', `Maximum ${MAX_MEDIAS} médias par publication.`);
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre caméra pour prendre des photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediasSelectionnes(prev => [...prev, {
          uri: asset.uri,
          type: 'image' as const,
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        }].slice(0, MAX_MEDIAS));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Supprimer un média du tableau
  const handleRemoveMedia = (index: number) => {
    setMediasSelectionnes(prev => prev.filter((_, i) => i !== index));
  };

  const handleProfil = () => {
    router.push('/(app)/profil');
  };

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  // Utiliser les compteurs socket si connecté, sinon fallback sur calcul local
  const localUnreadMessages = conversations.reduce((total, conv) => total + conv.messagesNonLus, 0);
  const unreadMessages = socketConnected ? socketUnreadMessages : localUnreadMessages;

  // Compteurs notifications et demandes d'amis avec socket
  const effectiveNotifications = socketConnected ? socketUnreadNotifications : notificationsNonLues;
  const effectiveDemandesAmis = socketConnected ? socketUnreadDemandesAmis : demandesAmisEnAttente;

  // ============ COMPOSANTS LOCAUX ============
  // PublicationCard extrait vers: src/composants/PublicationCard.tsx (optimisation P0)
  // StartupCard et TrendingItem restent inline pour l'instant (Phase 2)

  const ProjetCard = ({ projet }: { projet: Projet }) => {
    // Verifier si c'est le propre projet de l'utilisateur
    const isOwnProject = utilisateur?.id === projet.porteur?._id;

    // State local pour optimistic update + sync avec props
    const [suivi, setSuivi] = useState(projet.estSuivi);
    const [nbFollowers, setNbFollowers] = useState(projet.nbFollowers);
    const [enCours, setEnCours] = useState(false);

    // Sync state local avec props quand le projet change (navigation, refetch)
    // Mais SEULEMENT si on n'est pas en train de faire une action
    useEffect(() => {
      if (!enCours) {
        setSuivi(projet.estSuivi);
        setNbFollowers(projet.nbFollowers);
      }
    }, [projet._id, projet.estSuivi, projet.nbFollowers, enCours]);

    const handleToggleSuivre = async () => {
      if (enCours) return;

      // IMPORTANT: Marquer enCours AVANT tout pour bloquer le useEffect sync
      setEnCours(true);

      // Sauvegarder l'etat precedent pour rollback
      const previousSuivi = suivi;
      const previousNbFollowers = nbFollowers;

      // Optimistic update local
      const newSuivi = !suivi;
      const newNbFollowers = suivi ? nbFollowers - 1 : nbFollowers + 1;
      setSuivi(newSuivi);
      setNbFollowers(newNbFollowers);

      // Optimistic update sur le state parent (source de verite)
      setProjets(prev => prev.map(p =>
        p._id === projet._id
          ? { ...p, estSuivi: newSuivi, nbFollowers: newNbFollowers }
          : p
      ));

      try {
        const reponse = await toggleSuivreProjet(projet._id);

        // Debug: voir ce que l'API renvoie
        if (__DEV__) {
          console.log('🔄 toggleSuivreProjet response:', JSON.stringify(reponse, null, 2));
        }

        if (reponse.succes && reponse.data) {
          // Backend renvoie maintenant estSuivi et nbFollowers
          const apiData = reponse.data as { estSuivi?: boolean; suivi?: boolean; nbFollowers?: number; totalFollowers?: number };
          const apiEstSuivi = apiData.estSuivi ?? apiData.suivi;
          const apiNbFollowers = apiData.nbFollowers ?? apiData.totalFollowers;

          if (__DEV__) {
            console.log('✅ Follow reussi - API:', { apiEstSuivi, apiNbFollowers });
          }

          // Utiliser les valeurs de l'API si disponibles
          if (typeof apiEstSuivi === 'boolean') {
            setSuivi(apiEstSuivi);
            setProjets(prev => prev.map(p =>
              p._id === projet._id ? { ...p, estSuivi: apiEstSuivi } : p
            ));
          }
          if (typeof apiNbFollowers === 'number') {
            setNbFollowers(apiNbFollowers);
            setProjets(prev => prev.map(p =>
              p._id === projet._id ? { ...p, nbFollowers: apiNbFollowers } : p
            ));
          }
        } else if (!reponse.succes) {
          // Rollback si echec explicite
          console.warn('⚠️ toggleSuivreProjet: succes=false ou pas de data');
          setSuivi(previousSuivi);
          setNbFollowers(previousNbFollowers);
          setProjets(prev => prev.map(p =>
            p._id === projet._id
              ? { ...p, estSuivi: previousSuivi, nbFollowers: previousNbFollowers }
              : p
          ));
        }
      } catch (error) {
        console.error('❌ Erreur toggle suivre projet:', error);
        // Rollback en cas d'exception reseau
        setSuivi(previousSuivi);
        setNbFollowers(previousNbFollowers);
        setProjets(prev => prev.map(p =>
          p._id === projet._id
            ? { ...p, estSuivi: previousSuivi, nbFollowers: previousNbFollowers }
            : p
        ));
      } finally {
        setEnCours(false);
      }
    };

    const handleVoirFiche = () => {
      router.push({
        pathname: '/(app)/projet/[id]',
        params: { id: projet._id },
      });
    };

    const handleContacter = () => {
      router.push({
        pathname: '/(app)/projet/[id]',
        params: { id: projet._id, action: 'contact' },
      });
    };

    // La card n'est PAS un Pressable pour eviter la propagation
    // Seuls les zones cliquables specifiques ont un onPress
    return (
      <View style={styles.startupCard}>
        {/* Zone image cliquable vers fiche */}
        <Pressable onPress={handleVoirFiche}>
          <Image
            source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' }}
            style={styles.startupImage}
          />
        </Pressable>
        <View style={styles.startupContent}>
          {/* Zone header cliquable vers fiche */}
          <Pressable onPress={handleVoirFiche}>
            <View style={styles.startupHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.startupNom}>{projet.nom}</Text>
                <View style={styles.startupLocation}>
                  <Ionicons name="location-outline" size={12} color={couleurs.texteSecondaire} />
                  <Text style={styles.startupVille}>{projet.localisation?.ville || 'France'}</Text>
                </View>
              </View>
              {projet.logo && (
                <Image source={{ uri: projet.logo }} style={styles.startupLogo} />
              )}
            </View>
            <Text style={styles.startupDescription} numberOfLines={2}>{projet.pitch || projet.description}</Text>
            <View style={styles.startupTags}>
              {projet.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.startupTag}>
                  <Text style={styles.startupTagText}>{tag}</Text>
                </View>
              ))}
              {projet.categorie && (
                <View style={[styles.startupTag, { backgroundColor: couleurs.primaire + '20' }]}>
                  <Text style={[styles.startupTagText, { color: couleurs.primaire }]}>{projet.categorie}</Text>
                </View>
              )}
            </View>
            <View style={styles.startupStats}>
              <View style={styles.startupStat}>
                <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={styles.startupStatText}>{nbFollowers} abonnes</Text>
              </View>
              <View style={styles.startupStat}>
                <Ionicons name="trending-up-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={styles.startupStatText}>{projet.maturite}</Text>
              </View>
            </View>
          </Pressable>
          {/* Zone boutons - chacun est independant */}
          <View style={styles.startupActions}>
            {isOwnProject ? (
              <Pressable
                style={[styles.startupBtnPrimary, styles.startupBtnSuivi]}
                onPress={handleVoirFiche}
              >
                <Ionicons name="briefcase" size={18} color={couleurs.primaire} />
                <Text style={[styles.startupBtnPrimaryText, styles.startupBtnSuiviText]}>
                  Mon projet
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.startupBtnPrimary, suivi && styles.startupBtnSuivi, enCours && { opacity: 0.6 }]}
                  onPress={handleToggleSuivre}
                  disabled={enCours}
                >
                  <Ionicons
                    name={suivi ? 'checkmark' : 'add'}
                    size={18}
                    color={suivi ? couleurs.primaire : couleurs.blanc}
                  />
                  <Text style={[styles.startupBtnPrimaryText, suivi && styles.startupBtnSuiviText]}>
                    {suivi ? 'Suivi' : 'Suivre'}
                  </Text>
                </Pressable>
                <Pressable style={styles.startupBtnSecondary} onPress={handleContacter}>
                  <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
                </Pressable>
                <Pressable style={styles.startupBtnSecondary} onPress={handleVoirFiche}>
                  <Ionicons name="eye-outline" size={18} color={couleurs.texte} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const TrendingItem = ({ item, rank }: { item: TrendingStartup; rank: number }) => (
    <Pressable style={styles.trendingItem}>
      <View style={[styles.trendingRank, rank <= 3 && styles.trendingRankTop]}>
        <Text style={[styles.trendingRankText, rank <= 3 && styles.trendingRankTextTop]}>{rank}</Text>
      </View>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingNom}>{item.nom}</Text>
        <Text style={styles.trendingSecteur}>{item.secteur}</Text>
      </View>
      <View style={styles.trendingChange}>
        <Ionicons name="trending-up" size={14} color={couleurs.succes} />
        <Text style={styles.trendingChangeValue}>+{item.nouveauxAbonnes}</Text>
      </View>
    </Pressable>
  );

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
    // Rafraîchir les stories
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

  // Clear active video and viewability state when leaving the feed screen
  useFocusEffect(
    useCallback(() => {
      // On focus: nothing to do (scroll will set active video)
      return () => {
        // On blur: clear active video and viewability tracking
        if (viewabilityTimeoutRef.current) {
          clearTimeout(viewabilityTimeoutRef.current);
          viewabilityTimeoutRef.current = null;
        }
        activePostIdRef.current = null;
        pendingActivePostRef.current = null;
        // Hard stop ALL videos via registry (prevents ghost audio on navigation)
        videoRegistry.stopAll().catch(() => {});
        // Clear active post and video in store
        videoPlaybackStore.setActivePostId(null);
        videoPlaybackStore.setActiveVideo(null);
      };
    }, [])
  );

  const renderStories = () => (
    <StoriesRow
      key={storiesRefreshKey}
      onStoryPress={handleStoryPress}
      onAddStoryPress={handleAddStoryPress}
      refreshing={rafraichissement}
    />
  );

  const renderTrending = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Tendances</Text>
          <Text style={styles.sectionSubtitle}>Startups populaires cette semaine</Text>
        </View>
        <Pressable style={styles.sectionAction} onPress={() => pagerRef.current?.setPage(1)}>
          <Text style={styles.sectionActionText}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={16} color={couleurs.texteSecondaire} />
        </Pressable>
      </View>
      {TRENDING_STARTUPS.map((item, index) => (
        <TrendingItem key={item.id} item={item} rank={index + 1} />
      ))}
    </View>
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
      {renderTrending()}
      <View style={styles.section}>
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
          publications.map((publication, index) => (
            <View
              key={publication._id}
              onLayout={(e) => {
                publicationLayoutsRef.current.set(publication._id, e.nativeEvent.layout.y);
              }}
              style={publicationCiblee === publication._id ? {
                borderWidth: 2,
                borderColor: couleurs.primaire,
                borderRadius: rayons.lg,
                backgroundColor: couleurs.primaireLight,
              } : undefined}
            >
              <AnimatedPublicationWrapper index={index}>
                <PublicationCard
                  publication={publication}
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
              </AnimatedPublicationWrapper>
            </View>
          ))
        )}
      </View>
    </>
  );

  // Categories pour les filtres decouvrir
  const DECOUVRIR_CATEGORIES: { value: CategorieProjet | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { value: 'all', label: 'Tout', icon: 'apps', color: couleurs.primaire },
    { value: 'tech', label: 'Tech', icon: 'hardware-chip', color: '#3B82F6' },
    { value: 'food', label: 'Food', icon: 'restaurant', color: '#F97316' },
    { value: 'sante', label: 'Sante', icon: 'medkit', color: '#EF4444' },
    { value: 'education', label: 'Education', icon: 'school', color: '#8B5CF6' },
    { value: 'energie', label: 'Energie', icon: 'flash', color: '#F59E0B' },
    { value: 'culture', label: 'Culture', icon: 'color-palette', color: '#EC4899' },
    { value: 'environnement', label: 'Eco', icon: 'leaf', color: '#10B981' },
  ];

  const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
    idee: { label: 'Idee', color: '#9CA3AF' },
    prototype: { label: 'Prototype', color: '#F59E0B' },
    lancement: { label: 'Lancement', color: '#3B82F6' },
    croissance: { label: 'Croissance', color: '#10B981' },
  };

  const handleCategorieChange = (cat: CategorieProjet | 'all') => {
    setCategorieFiltre(cat);
    chargerProjets(cat, rechercheProjetDebounced);
  };

  const handleRechercheProjetSubmit = () => {
    // Bypass debounce — recherche immediate sur submit clavier
    setRechercheProjetDebounced(rechercheProjet);
    chargerProjets(categorieFiltre, rechercheProjet);
  };

  const renderDecouvrirContent = () => (
    <>
      {/* Barre de recherche projet */}
      <View style={styles.decouvrirSearchSection}>
        <View style={styles.decouvrirSearchBar}>
          <Ionicons name="search" size={16} color={couleurs.texteMuted} />
          <TextInput
            style={styles.decouvrirSearchInput}
            placeholder="Rechercher un projet..."
            placeholderTextColor={couleurs.texteMuted}
            value={rechercheProjet}
            onChangeText={setRechercheProjet}
            onSubmitEditing={handleRechercheProjetSubmit}
            returnKeyType="search"
          />
          {rechercheProjet.length > 0 && (
            <Pressable onPress={() => { setRechercheProjet(''); setRechercheProjetDebounced(''); chargerProjets(categorieFiltre, ''); }}>
              <Ionicons name="close-circle" size={18} color={couleurs.texteMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtres categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.decouvrirCategoriesContainer}
        style={styles.decouvrirCategoriesScroll}
      >
        {DECOUVRIR_CATEGORIES.map((cat) => {
          const isActive = categorieFiltre === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => handleCategorieChange(cat.value)}
              style={[
                styles.decouvrirCategorieChip,
                isActive
                  ? { backgroundColor: cat.color + '20', borderColor: cat.color }
                  : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
              ]}
            >
              <Ionicons name={cat.icon} size={14} color={isActive ? cat.color : couleurs.texteMuted} />
              <Text style={[
                styles.decouvrirCategorieText,
                { color: isActive ? cat.color : couleurs.texteSecondaire },
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section Trending */}
      {projetsTendance.length > 0 && categorieFiltre === 'all' && !rechercheProjet && (
        <View style={styles.decouvrirSection}>
          <View style={styles.decouvrirSectionHeader}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={styles.decouvrirSectionTitle}>Tendances</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.decouvrirTrendingScroll}>
            {projetsTendance.map((projet, index) => {
              const mat = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
              const catConf = DECOUVRIR_CATEGORIES.find(c => c.value === projet.categorie);
              return (
                <Pressable
                  key={projet._id}
                  style={styles.decouvrirTrendingCard}
                  onPress={() => router.push({ pathname: '/(app)/projet/[id]', params: { id: projet._id } })}
                >
                  {projet.image ? (
                    <Image source={{ uri: projet.image }} style={styles.decouvrirTrendingImage} />
                  ) : (
                    <LinearGradient
                      colors={[catConf?.color || couleurs.primaire, couleurs.fondSecondaire]}
                      style={styles.decouvrirTrendingImagePlaceholder}
                    >
                      <Ionicons name={catConf?.icon || 'rocket'} size={28} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.decouvrirTrendingOverlay}
                  >
                    <View style={styles.decouvrirTrendingRankBadge}>
                      <Text style={styles.decouvrirTrendingRankText}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.decouvrirTrendingNom} numberOfLines={1}>{projet.nom}</Text>
                    <Text style={styles.decouvrirTrendingPitch} numberOfLines={1}>{projet.pitch}</Text>
                    <View style={styles.decouvrirTrendingMeta}>
                      <View style={[styles.decouvrirMaturiteBadge, { backgroundColor: mat.color + '30' }]}>
                        <Text style={[styles.decouvrirMaturiteText, { color: mat.color }]}>{mat.label}</Text>
                      </View>
                      <View style={styles.decouvrirTrendingStat}>
                        <Ionicons name="people" size={11} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.decouvrirTrendingStatText}>{projet.nbFollowers}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Section liste des projets */}
      <View style={styles.decouvrirSection}>
        <View style={styles.decouvrirSectionHeader}>
          <Ionicons name="compass" size={18} color={couleurs.primaire} />
          <Text style={styles.decouvrirSectionTitle}>
            {categorieFiltre !== 'all'
              ? DECOUVRIR_CATEGORIES.find(c => c.value === categorieFiltre)?.label || 'Projets'
              : 'Tous les projets'}
          </Text>
          <Text style={styles.decouvrirSectionCount}>{projets.length}</Text>
        </View>

        {chargementProjets ? (
          <SkeletonList type="post" count={3} />
        ) : projets.length === 0 ? (
          <View style={styles.decouvrirEmptyState}>
            <View style={styles.decouvrirEmptyIcon}>
              <Ionicons name="rocket-outline" size={40} color={couleurs.primaire} />
            </View>
            <Text style={styles.decouvrirEmptyTitle}>
              {rechercheProjet ? `Aucun resultat pour "${rechercheProjet}"` : 'Aucun projet pour le moment'}
            </Text>
            <Text style={styles.decouvrirEmptySubtitle}>
              {rechercheProjet
                ? 'Essayez avec d\'autres mots-cles'
                : 'Les projets publies par les entrepreneurs apparaitront ici.'}
            </Text>
            {rechercheProjet ? (
              <Pressable
                style={styles.decouvrirEmptyBtn}
                onPress={() => { setRechercheProjet(''); setRechercheProjetDebounced(''); chargerProjets(categorieFiltre, ''); }}
              >
                <Text style={styles.decouvrirEmptyBtnText}>Effacer la recherche</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          projets.map((projet) => (
            <ProjetCard key={projet._id} projet={projet} />
          ))
        )}
      </View>
    </>
  );

  const rejoindreUnLive = async (live: LiveAPI) => {
    try {
      // Obtenir un token Agora pour le viewer
      const tokenRes = await getAgoraToken(live.channelName, 'subscriber');
      if (!tokenRes.succes || !tokenRes.data) {
        Alert.alert('Erreur', 'Impossible de rejoindre le live');
        return;
      }
      const creds = tokenRes.data;
      router.push({
        pathname: '/live/viewer',
        params: {
          liveId: live._id,
          channelName: creds.channelName,
          appId: creds.appId,
          token: creds.token,
          uid: creds.uid.toString(),
          hostPrenom: live.host.prenom,
          hostNom: live.host.nom,
          hostAvatar: live.host.avatar || '',
          title: live.title || '',
          viewerCount: live.viewerCount.toString(),
        },
      });
    } catch (error) {
      console.error('Erreur rejoindre live:', error);
      Alert.alert('Erreur', 'Impossible de rejoindre le live');
    }
  };

  const renderLiveContent = () => {
    // Filtrer par recherche
    const livesFiltres = rechercheLive.length >= 2
      ? lives.filter(l =>
          `${l.host?.prenom} ${l.host?.nom}`.toLowerCase().includes(rechercheLive.toLowerCase()) ||
          (l.title || '').toLowerCase().includes(rechercheLive.toLowerCase())
        )
      : lives;

    // Trier
    const livesTries = [...livesFiltres].sort((a, b) =>
      triLive === 'populaire'
        ? b.viewerCount - a.viewerCount
        : new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Stats reelles uniquement
    const totalViewers = lives.reduce((sum, l) => sum + l.viewerCount, 0);
    const featuredLive = livesTries[0];
    const autresLives = livesTries.slice(1);

    return (
      <View style={styles.liveContainer}>
        {/* ====== HEADER ====== */}
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            <Text style={styles.sectionTitle}>Live</Text>
            {lives.length > 0 && (
              <View style={styles.liveCountBadge}>
                <View style={styles.liveCountDot} />
                <Text style={styles.liveCountText}>{lives.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/live/start')}
            style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <View style={styles.goLiveBtn}>
              <Ionicons name="radio" size={15} color={couleurs.blanc} />
              <Text style={styles.goLiveBtnText}>Go Live</Text>
            </View>
          </Pressable>
        </View>

        {chargementLives ? (
          <SkeletonList type="post" count={3} />
        ) : lives.length === 0 ? (
          /* ====== EMPTY STATE ====== */
          <View style={styles.liveEmptyState}>
            <LinearGradient
              colors={[couleurs.primaireDark, couleurs.primaire, `${couleurs.primaireLight}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveEmptyHero}
            >
              <View style={styles.liveEmptyIconRing}>
                <Ionicons name="videocam" size={32} color={couleurs.primaireLight} />
              </View>
              <Text style={styles.liveEmptyTitle}>Personne n'est en direct</Text>
              <Text style={styles.liveEmptySubtitle}>
                Soyez le premier a diffuser en direct{'\n'}et partagez un moment avec la communaute
              </Text>
              <Pressable
                onPress={() => router.push('/live/start')}
                style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              >
                <View style={styles.liveEmptyCTABtn}>
                  <Ionicons name="radio" size={18} color={couleurs.blanc} />
                  <Text style={styles.liveEmptyCTAText}>Lancer mon live</Text>
                </View>
              </Pressable>
            </LinearGradient>

            {/* Divider */}
            <View style={styles.liveDivider} />

            {/* Comment ca marche */}
            <View style={styles.liveHowToSection}>
              <View style={styles.liveSectionHeader}>
                <Ionicons name="help-circle" size={18} color={couleurs.primaire} />
                <Text style={styles.liveSectionTitle}>Comment ca marche</Text>
              </View>
              <View style={styles.liveHowToSteps}>
                {[
                  { num: '1', title: 'Lancez', desc: 'Appuyez sur Go Live', color: couleurs.erreur },
                  { num: '2', title: 'Diffusez', desc: 'En video ou audio', color: couleurs.primaire },
                  { num: '3', title: 'Interagissez', desc: 'Avec votre audience', color: couleurs.secondaire },
                ].map((step) => (
                  <View key={step.num} style={styles.liveHowToStep}>
                    <View style={[styles.liveHowToStepNum, { backgroundColor: `${step.color}20` }]}>
                      <Text style={[styles.liveHowToStepNumText, { color: step.color }]}>{step.num}</Text>
                    </View>
                    <Text style={styles.liveHowToStepTitle}>{step.title}</Text>
                    <Text style={styles.liveHowToStepDesc}>{step.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* ====== LIVES ACTIFS ====== */
          <View style={styles.livesActiveContainer}>
            {/* Barre de recherche */}
            <View style={styles.liveSearchBar}>
              <Ionicons name="search" size={16} color={couleurs.texteSecondaire} />
              <TextInput
                style={styles.liveSearchInput}
                placeholder="Rechercher un live..."
                placeholderTextColor={couleurs.texteMuted}
                value={rechercheLive}
                onChangeText={setRechercheLive}
                returnKeyType="search"
              />
              {rechercheLive.length > 0 && (
                <Pressable onPress={() => setRechercheLive('')}>
                  <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
                </Pressable>
              )}
            </View>

            {/* Tri + stats */}
            <View style={styles.liveSortRow}>
              <Pressable
                style={[styles.liveSortChip, triLive === 'populaire' && styles.liveSortChipActive]}
                onPress={() => setTriLive('populaire')}
              >
                <Ionicons name="flame" size={13} color={triLive === 'populaire' ? couleurs.blanc : couleurs.texteSecondaire} />
                <Text style={[styles.liveSortChipText, triLive === 'populaire' && styles.liveSortChipTextActive]}>Tendances</Text>
              </Pressable>
              <Pressable
                style={[styles.liveSortChip, triLive === 'recent' && styles.liveSortChipActive]}
                onPress={() => setTriLive('recent')}
              >
                <Ionicons name="time" size={13} color={triLive === 'recent' ? couleurs.blanc : couleurs.texteSecondaire} />
                <Text style={[styles.liveSortChipText, triLive === 'recent' && styles.liveSortChipTextActive]}>Recents</Text>
              </Pressable>
              <View style={styles.liveStatsCompact}>
                <Ionicons name="eye" size={12} color={couleurs.texteSecondaire} />
                <Text style={styles.liveStatsCompactText}>{formatViewerCount(totalViewers)}</Text>
              </View>
            </View>

            {/* Resultats */}
            {livesFiltres.length === 0 && rechercheLive.length >= 2 ? (
              <View style={styles.liveNoResults}>
                <Ionicons name="search-outline" size={36} color={couleurs.texteMuted} />
                <Text style={styles.liveNoResultsText}>Aucun live pour "{rechercheLive}"</Text>
              </View>
            ) : (
              <>
                {/* Section A la une */}
                {featuredLive && (
                  <View style={styles.liveSection}>
                    <View style={styles.liveSectionHeader}>
                      <Ionicons name="flame" size={18} color={couleurs.accent} />
                      <Text style={styles.liveSectionTitle}>A la une</Text>
                    </View>
                    <LiveCard
                      live={featuredLive}
                      onPress={() => rejoindreUnLive(featuredLive)}
                      variant="featured"
                      index={0}
                    />
                  </View>
                )}

                {/* Divider */}
                {autresLives.length > 0 && <View style={styles.liveDivider} />}

                {/* Section En direct - scroll horizontal */}
                {autresLives.length > 0 && (
                  <View style={styles.liveSection}>
                    <View style={styles.liveSectionHeader}>
                      <Ionicons name="radio" size={18} color={couleurs.erreur} />
                      <Text style={styles.liveSectionTitle}>En direct</Text>
                      <Text style={styles.liveSectionCount}>{autresLives.length}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.liveTrendingScroll}
                    >
                      {autresLives.map((live, i) => (
                        <LiveCard
                          key={live._id}
                          live={live}
                          onPress={() => rejoindreUnLive(live)}
                          variant="card"
                          index={i + 1}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMessagesContent = () => {
    const conversationsFiltrees = conversations.filter(conv =>
      rechercheMessage.length < 2 ||
      (conv.participant && `${conv.participant.prenom} ${conv.participant.nom}`.toLowerCase().includes(rechercheMessage.toLowerCase()))
    );

    // Vue conversation active
    if (conversationActive) {
      return (
        <View style={styles.section}>
          <View style={styles.messagesCard}>
            <View style={styles.messagesHeader}>
              <Pressable onPress={() => { setConversationActive(null); setMessagesConversation([]); }}>
                <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
              </Pressable>
              <View style={styles.conversationHeaderInfo}>
                <Image
                  source={{ uri: conversationActive.participant.avatar || 'https://api.dicebear.com/7.x/thumbs/png?seed=default&backgroundColor=6366f1&size=128' }}
                  style={styles.conversationHeaderAvatar}
                />
                <Text style={styles.messagesHeaderTitle}>
                  {conversationActive.participant.prenom} {conversationActive.participant.nom}
                </Text>
              </View>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.messagesConversation} contentContainerStyle={{ paddingVertical: espacements.md }}>
              {chargementMessages ? (
                <Text style={styles.chargementText}>Chargement...</Text>
              ) : messagesConversation.length === 0 ? (
                <Text style={styles.messagesEmptyText}>Aucun message. Commencez la conversation !</Text>
              ) : (
                messagesConversation.map((msg) => (
                  <View key={msg._id} style={[styles.messageBubble, msg.estMoi ? styles.messageBubbleMoi : styles.messageBubbleAutre]}>
                    <Text style={[styles.messageBubbleText, msg.estMoi && styles.messageBubbleTextMoi]}>{msg.contenu}</Text>
                    <Text style={[styles.messageBubbleTime, msg.estMoi && styles.messageBubbleTimeMoi]}>
                      {new Date(msg.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Votre message..."
                placeholderTextColor={couleurs.texteSecondaire}
                value={messageContenu}
                onChangeText={setMessageContenu}
                multiline
              />
              <Pressable
                style={[styles.sendButton, (!messageContenu.trim() || envoiEnCours) && styles.sendButtonDisabled]}
                onPress={handleEnvoyerMessageConversation}
                disabled={!messageContenu.trim() || envoiEnCours}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.messagesCard}>
          <View style={styles.messagesHeader}>
            <Text style={styles.messagesHeaderTitle}>Conversations</Text>
            <Pressable style={styles.messagesNewBtn} onPress={() => setModalNouvelleConversation(true)}>
              <Ionicons name="create-outline" size={20} color={couleurs.primaire} />
            </Pressable>
          </View>

          {/* Barre de recherche */}
          <View style={styles.messagesSearchContainer}>
            <Ionicons name="search" size={18} color={couleurs.texteSecondaire} />
            <TextInput
              style={styles.messagesSearchInput}
              placeholder="Rechercher une conversation..."
              placeholderTextColor={couleurs.texteSecondaire}
              value={rechercheMessage}
              onChangeText={setRechercheMessage}
            />
            {rechercheMessage.length > 0 && (
              <Pressable onPress={() => setRechercheMessage('')}>
                <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
              </Pressable>
            )}
          </View>

          <View style={styles.messagesList}>
            {conversationsFiltrees.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Ionicons name="chatbubbles-outline" size={48} color={couleurs.texteSecondaire} />
                <Text style={styles.emptyMessagesText}>
                  {rechercheMessage.length > 0 ? 'Aucune conversation trouvee' : 'Aucune conversation'}
                </Text>
                <Pressable style={styles.startConversationBtn} onPress={() => setModalNouvelleConversation(true)}>
                  <Text style={styles.startConversationBtnText}>Demarrer une conversation</Text>
                </Pressable>
              </View>
            ) : (
              conversationsFiltrees.map((conv) => (
                <Pressable
                  key={conv._id}
                  style={[styles.messageRow, conv.messagesNonLus > 0 && styles.messageRowUnread]}
                  onPress={() => handleOuvrirConversation(conv)}
                >
                  <Image
                    source={{ uri: conv.participant?.avatar || 'https://api.dicebear.com/7.x/thumbs/png?seed=default&backgroundColor=6366f1&size=128' }}
                    style={styles.messageAvatar}
                  />
                  <View style={styles.messageContent}>
                    <Text style={[styles.messageExpediteur, conv.messagesNonLus > 0 && styles.messageExpediteurUnread]}>
                      {conv.estGroupe ? conv.nomGroupe : `${conv.participant?.prenom || ''} ${conv.participant?.nom || ''}`}
                    </Text>
                    <Text style={styles.messageDernier} numberOfLines={1}>
                      {conv.dernierMessage?.contenu || 'Aucun message'}
                    </Text>
                  </View>
                  <View style={styles.messageMeta}>
                    <Text style={styles.messageDate}>
                      {conv.dernierMessage ? new Date(conv.dernierMessage.dateCreation).toLocaleDateString('fr-FR') : ''}
                    </Text>
                    {conv.messagesNonLus > 0 && (
                      <View style={styles.messageUnreadBadge}>
                        <Text style={styles.messageUnreadBadgeText}>{conv.messagesNonLus}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Modal nouvelle conversation */}
        <Modal
          visible={modalNouvelleConversation}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalNouvelleConversation(false);
            setDestinataireSelectionne(null);
            setDestinataireRecherche('');
            setMessageContenu('');
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle conversation</Text>
                <Pressable onPress={() => {
                  setModalNouvelleConversation(false);
                  setDestinataireSelectionne(null);
                  setDestinataireRecherche('');
                  setMessageContenu('');
                }}>
                  <Ionicons name="close" size={24} color={couleurs.texte} />
                </Pressable>
              </View>

              {!destinataireSelectionne ? (
                <>
                  <View style={styles.modalSearchContainer}>
                    <Ionicons name="search" size={18} color={couleurs.texteSecondaire} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Rechercher un utilisateur..."
                      placeholderTextColor={couleurs.texteSecondaire}
                      value={destinataireRecherche}
                      onChangeText={handleRechercheDestinataire}
                      autoFocus
                    />
                  </View>
                  <ScrollView style={styles.searchResults}>
                    {resultatsRecherche.map((user) => (
                      <Pressable
                        key={user._id}
                        style={styles.searchResultItem}
                        onPress={() => setDestinataireSelectionne(user)}
                      >
                        <Avatar
                          uri={user.avatar}
                          prenom={user.prenom}
                          nom={user.nom}
                          taille={40}
                        />
                        <Text style={styles.searchResultName}>{user.prenom} {user.nom}</Text>
                      </Pressable>
                    ))}
                    {destinataireRecherche.length >= 2 && resultatsRecherche.length === 0 && (
                      <Text style={styles.noResultsText}>Aucun utilisateur trouve</Text>
                    )}
                  </ScrollView>
                </>
              ) : (
                <>
                  <View style={styles.selectedDestinataireContainer}>
                    <Avatar
                      uri={destinataireSelectionne.avatar}
                      prenom={destinataireSelectionne.prenom}
                      nom={destinataireSelectionne.nom}
                      taille={36}
                    />
                    <Text style={styles.selectedDestinataireName}>
                      {destinataireSelectionne.prenom} {destinataireSelectionne.nom}
                    </Text>
                    <Pressable onPress={() => setDestinataireSelectionne(null)}>
                      <Ionicons name="close-circle" size={20} color={couleurs.texteSecondaire} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.modalMessageInput}
                    placeholder="Votre message..."
                    placeholderTextColor={couleurs.texteSecondaire}
                    value={messageContenu}
                    onChangeText={setMessageContenu}
                    multiline
                    numberOfLines={4}
                  />
                  <Pressable
                    style={[styles.sendMessageBtn, (!messageContenu.trim() || envoiEnCours) && styles.sendMessageBtnDisabled]}
                    onPress={handleEnvoyerMessage}
                    disabled={!messageContenu.trim() || envoiEnCours}
                  >
                    <Text style={styles.sendMessageBtnText}>
                      {envoiEnCours ? 'Envoi...' : 'Envoyer'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  // Contenu de l'onglet Entrepreneur
  const renderEntrepreneurContent = () => {
    const hasProjects = mesProjetsEntrepreneur.length > 0;

    return (
      <View style={styles.entrepreneurContainer}>
        {/* Header Entrepreneur */}
        <View style={styles.entrepreneurHeader}>
          <View>
            <Text style={[styles.entrepreneurTitle, { color: couleurs.texte }]}>
              Mes Projets
            </Text>
            <Text style={[styles.entrepreneurSubtitle, { color: couleurs.texteSecondaire }]}>
              {statsEntrepreneur
                ? `${statsEntrepreneur.published} publie${statsEntrepreneur.published > 1 ? 's' : ''} · ${statsEntrepreneur.drafts} brouillon${statsEntrepreneur.drafts > 1 ? 's' : ''}`
                : 'Gerez vos startups et projets'}
            </Text>
          </View>
          <Pressable
            style={[styles.entrepreneurCreateBtn, { backgroundColor: couleurs.primaire }]}
            onPress={() => router.push('/entrepreneur/nouveau-projet')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.entrepreneurCreateBtnText}>Creer</Text>
          </Pressable>
        </View>

        {/* Liste des projets */}
        <ScrollView
          style={styles.entrepreneurList}
          contentContainerStyle={styles.entrepreneurListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={chargementMesProjets}
              onRefresh={chargerMesProjetsEntrepreneur}
              tintColor={couleurs.primaire}
            />
          }
        >
          {chargementMesProjets && !hasProjects ? (
            <View style={styles.entrepreneurLoading}>
              <Text style={[styles.entrepreneurLoadingText, { color: couleurs.texteSecondaire }]}>
                Chargement...
              </Text>
            </View>
          ) : hasProjects ? (
            <>
              {mesProjetsEntrepreneur.map((projet) => (
                <Pressable
                  key={projet._id}
                  style={[styles.entrepreneurProjectCard, { backgroundColor: couleurs.fondSecondaire }]}
                  onPress={() => router.push({ pathname: '/(app)/entrepreneur/[id]', params: { id: projet._id } })}
                >
                  {projet.image ? (
                    <Image source={{ uri: projet.image }} style={styles.entrepreneurProjectImage} />
                  ) : (
                    <View style={[styles.entrepreneurProjectImagePlaceholder, { backgroundColor: couleurs.bordure }]}>
                      <Ionicons name="briefcase-outline" size={24} color={couleurs.texteSecondaire} />
                    </View>
                  )}
                  <View style={styles.entrepreneurProjectInfo}>
                    <View style={styles.entrepreneurProjectHeader}>
                      <Text style={[styles.entrepreneurProjectName, { color: couleurs.texte }]} numberOfLines={1}>
                        {projet.nom}
                      </Text>
                      <View style={[
                        styles.entrepreneurProjectStatus,
                        projet.statut === 'published' ? styles.entrepreneurStatusPublished : styles.entrepreneurStatusDraft
                      ]}>
                        <Text style={styles.entrepreneurProjectStatusText}>
                          {projet.statut === 'published' ? 'Publie' : 'Brouillon'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.entrepreneurProjectPitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
                      {projet.pitch}
                    </Text>
                    <View style={styles.entrepreneurProjectMeta}>
                      <View style={styles.entrepreneurProjectMetaItem}>
                        <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
                        <Text style={[styles.entrepreneurProjectMetaText, { color: couleurs.texteSecondaire }]}>
                          {projet.nbFollowers ?? projet.followers?.length ?? 0}
                        </Text>
                      </View>
                      <View style={styles.entrepreneurProjectMetaItem}>
                        <Ionicons name="location-outline" size={14} color={couleurs.texteSecondaire} />
                        <Text style={[styles.entrepreneurProjectMetaText, { color: couleurs.texteSecondaire }]}>
                          {projet.localisation?.ville || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
                </Pressable>
              ))}
            </>
          ) : (
            <View style={[styles.entrepreneurEmptyState, { backgroundColor: couleurs.fondSecondaire }]}>
              <Ionicons name="briefcase-outline" size={64} color={couleurs.texteSecondaire} />
              <Text style={[styles.entrepreneurEmptyTitle, { color: couleurs.texte }]}>
                Commencez votre aventure
              </Text>
              <Text style={[styles.entrepreneurEmptyText, { color: couleurs.texteSecondaire }]}>
                Creez votre premier projet et partagez votre vision avec la communaute LPP
              </Text>
              <Pressable
                style={[styles.entrepreneurEmptyBtn, { backgroundColor: couleurs.primaire }]}
                onPress={() => router.push('/entrepreneur/nouveau-projet')}
              >
                <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
                <Text style={styles.entrepreneurEmptyBtnText}>Creer mon premier projet</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (ongletActif) {
      case 'feed': return renderFeedContent();
      case 'decouvrir': return renderDecouvrirContent();
      case 'live': return renderLiveContent();
      case 'messages': return renderMessagesContent();
      case 'entrepreneur': return renderEntrepreneurContent();
      default: return renderFeedContent();
    }
  };

  // Actions FAB
  const FAB_ACTIONS = [
    { id: 1, icon: 'create-outline' as const, label: 'Publier', color: '#6366F1', action: () => setModalCreerPost(true) },
    { id: 2, icon: 'videocam-outline' as const, label: 'Go Live', color: '#EF4444', action: () => router.push('/live/start') },
    { id: 3, icon: 'camera-outline' as const, label: 'Story', color: '#10B981', action: () => setStoryCreatorVisible(true) },
    { id: 4, icon: 'rocket-outline' as const, label: 'Startup', color: '#F59E0B', action: () => Alert.alert('Startup', 'Bientot disponible !') },
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

  // Gestion du scroll pour afficher/masquer le bouton scroll-to-top + viewability vidéos
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const seuil = 300; // Afficher le bouton après 300px de scroll

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

    // === VIDEO VIEWABILITY TRACKING (debounced) ===
    // Only change active video when a post is dominant (>50% visible) for >250ms
    if (ongletActif !== 'feed' || publications.length === 0) {
      return;
    }

    const viewportTop = scrollY;
    const viewportBottom = scrollY + SCREEN_HEIGHT;
    let dominantPostId: string | null = null;
    let maxVisibility = 0;

    // Find the post with highest visibility (>50% threshold)
    for (const publication of publications) {
      const pubY = publicationLayoutsRef.current.get(publication._id);
      if (pubY === undefined) continue;

      // Check if this post has a video
      const hasVideo = publication.medias?.some(m => m.type === 'video');
      if (!hasVideo) continue;

      // Approximate post height (media posts are roughly square + some padding)
      const postHeight = SCREEN_WIDTH + 150; // media height + header/actions
      const postTop = pubY;
      const postBottom = pubY + postHeight;

      // Calculate visibility percentage
      const visibleTop = Math.max(postTop, viewportTop);
      const visibleBottom = Math.min(postBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = visibleHeight / postHeight;

      // Track the most visible video post
      if (visibilityRatio > maxVisibility && visibilityRatio >= VIEWABILITY_THRESHOLD) {
        maxVisibility = visibilityRatio;
        dominantPostId = publication._id;
      }
    }

    // Debounced update: only change active video after 250ms of same dominant post
    if (dominantPostId !== pendingActivePostRef.current) {
      // New dominant post detected - start debounce timer
      pendingActivePostRef.current = dominantPostId;

      // Clear any existing timeout
      if (viewabilityTimeoutRef.current) {
        clearTimeout(viewabilityTimeoutRef.current);
        viewabilityTimeoutRef.current = null;
      }

      // Only set timeout if there's a new dominant post (or clearing to null)
      viewabilityTimeoutRef.current = setTimeout(() => {
        // After delay, if the pending post is still the same, make it active
        if (pendingActivePostRef.current === dominantPostId) {
          // Only update if actually different from current active
          if (activePostIdRef.current !== dominantPostId) {
            activePostIdRef.current = dominantPostId;

            // CRITICAL: Hard stop all videos except the new active post
            // This prevents ghost audio from recycled FlatList cells
            videoRegistry.stopAllExcept(dominantPostId).catch(() => {});

            // Set active post ID (SOURCE OF TRUTH for shouldPlay)
            videoPlaybackStore.setActivePostId(dominantPostId);

            // Find the video URL for this post (for session management)
            let videoUrl: string | null = null;
            if (dominantPostId) {
              const post = publications.find(p => p._id === dominantPostId);
              const video = post?.medias?.find(m => m.type === 'video');
              videoUrl = video?.url || null;
            }

            // Update global store (secondary, for fullscreen support)
            videoPlaybackStore.setActiveVideo(videoUrl);
          }
        }
        viewabilityTimeoutRef.current = null;
      }, VIEWABILITY_DELAY_MS);
    }
  };

  /**
   * KILL-SWITCH: Stop ALL videos immediately when scroll begins
   * This prevents ghost audio by stopping everything before viewability recalculation
   */
  const handleScrollBegin = () => {
    // Clear any pending viewability timeout
    if (viewabilityTimeoutRef.current) {
      clearTimeout(viewabilityTimeoutRef.current);
      viewabilityTimeoutRef.current = null;
    }

    // Clear active post tracking
    activePostIdRef.current = null;
    pendingActivePostRef.current = null;

    // Clear global active post ID (SOURCE OF TRUTH) and video URL FIRST
    videoPlaybackStore.setActivePostId(null);
    videoPlaybackStore.setActiveVideo(null);

    // THEN hard stop all videos via registry
    videoRegistry.stopAll().catch(() => {});
  };

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
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                      <RefreshControl
                        refreshing={rafraichissement}
                        onRefresh={handleRafraichissement}
                        tintColor={couleurs.primaire}
                      />
                    }
                  >
                    {renderDecouvrirContent()}
                    <View style={styles.footer}>
                      <Text style={styles.footerLogo}>LPP</Text>
                      <Text style={styles.footerText}>La Premiere Pierre</Text>
                      <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
                    </View>
                  </ScrollView>
                </View>
              );
            }
            if (onglet.key === 'live') {
              return (
                <View key="live" style={styles.pageContainer}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                      <RefreshControl
                        refreshing={rafraichissement}
                        onRefresh={handleRafraichissement}
                        tintColor={couleurs.primaire}
                      />
                    }
                  >
                    {renderLiveContent()}
                    <View style={styles.footer}>
                      <Text style={styles.footerLogo}>LPP</Text>
                      <Text style={styles.footerText}>La Premiere Pierre</Text>
                      <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
                    </View>
                  </ScrollView>
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
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                      <RefreshControl
                        refreshing={rafraichissement}
                        onRefresh={handleRafraichissement}
                        tintColor={couleurs.primaire}
                      />
                    }
                  >
                    {renderEntrepreneurContent()}
                    <View style={styles.footer}>
                      <Text style={styles.footerLogo}>LPP</Text>
                      <Text style={styles.footerText}>La Premiere Pierre</Text>
                      <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
                    </View>
                  </ScrollView>
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

      {/* Modal creer publication */}
      <Modal
        visible={modalCreerPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalCreerPost(false);
          setMediasSelectionnes([]);
          setNouveauPostContenu('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle publication</Text>
              <Pressable onPress={() => {
                setModalCreerPost(false);
                setMediasSelectionnes([]);
                setNouveauPostContenu('');
              }} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalAuthor}>
                <Avatar
                  uri={utilisateur?.avatar}
                  prenom={utilisateur?.prenom}
                  nom={utilisateur?.nom}
                  taille={40}
                  onPress={() => naviguerVersProfil(utilisateur?.id)}
                />
                <Text style={styles.modalAuthorName}>
                  {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Vous'}
                </Text>
              </View>

              <TextInput
                style={styles.modalTextInput}
                placeholder="Quoi de neuf ? Partagez vos idees..."
                placeholderTextColor={couleurs.texteSecondaire}
                value={nouveauPostContenu}
                onChangeText={setNouveauPostContenu}
                multiline
                maxLength={5000}
                autoFocus
              />

              {/* Aperçu des médias sélectionnés (multi-média) */}
              {mediasSelectionnes.length > 0 && (
                <View style={styles.mediasPreviewRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {mediasSelectionnes.map((media, index) => (
                      <View key={`media-${index}`} style={styles.mediaPreviewItem}>
                        <Image
                          source={{ uri: media.uri }}
                          style={styles.mediaPreviewThumb}
                          resizeMode="cover"
                        />
                        {media.type === 'video' && (
                          <View style={styles.mediaVideoIndicatorSmall}>
                            <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.9)" />
                          </View>
                        )}
                        <Pressable style={styles.mediaRemoveBtnSmall} onPress={() => handleRemoveMedia(index)}>
                          <Ionicons name="close-circle" size={20} color={couleurs.blanc} />
                        </Pressable>
                        <View style={styles.mediaIndexBadge}>
                          <Text style={styles.mediaIndexText}>{index + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <Text style={styles.mediasCount}>{mediasSelectionnes.length}/{MAX_MEDIAS} médias</Text>
                </View>
              )}

              <Text style={styles.modalCharCount}>
                {nouveauPostContenu.length}/5000
              </Text>
            </ScrollView>

            {/* Barre d'actions médias */}
            <View style={styles.modalMediaBar}>
              <Pressable style={styles.modalMediaBtn} onPress={handleSelectImage}>
                <Ionicons name="image-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Photo</Text>
              </Pressable>
              <Pressable style={styles.modalMediaBtn} onPress={handleSelectVideo}>
                <Ionicons name="videocam-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Video</Text>
              </Pressable>
              <Pressable style={styles.modalMediaBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={24} color={couleurs.primaire} />
                <Text style={styles.modalMediaBtnText}>Camera</Text>
              </Pressable>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[
                  styles.modalPublishBtn,
                  ((!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) || creationEnCours) && styles.modalPublishBtnDisabled,
                ]}
                onPress={handleCreerPost}
                disabled={(!nouveauPostContenu.trim() && mediasSelectionnes.length === 0) || creationEnCours}
              >
                {creationEnCours ? (
                  <Text style={styles.modalPublishBtnText}>Publication...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={couleurs.blanc} />
                    <Text style={styles.modalPublishBtnText}>Publier</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recherche plein écran */}
      <Modal
        visible={rechercheOuverte}
        animationType="slide"
        transparent={false}
        onRequestClose={fermerRecherche}
      >
        <View style={[styles.fullSearchContainer, { paddingTop: insets.top }]}>
          {/* Header de recherche */}
          <View style={styles.fullSearchHeader}>
            <View style={styles.fullSearchInputContainer}>
              <Ionicons name="search" size={18} color={couleurs.texteSecondaire} />
              <TextInput
                ref={rechercheInputRef}
                style={styles.fullSearchInput}
                placeholder="Rechercher..."
                placeholderTextColor={couleurs.texteSecondaire}
                value={recherche}
                onChangeText={setRecherche}
                autoFocus
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {recherche.length > 0 && (
                <Pressable onPress={() => setRecherche('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={fermerRecherche} style={styles.fullSearchCancel}>
              <Text style={styles.fullSearchCancelText}>Annuler</Text>
            </Pressable>
          </View>

          {/* Contenu de recherche */}
          <View style={styles.fullSearchContent}>
            {recherche.length < 2 ? (
              historiqueRecherche.length > 0 ? (
                <ScrollView
                  style={styles.fullSearchResults}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={() => Keyboard.dismiss()}
                >
                  <View style={styles.historiqueHeader}>
                    <Text style={styles.historiqueTitle}>Recherches récentes</Text>
                    <Pressable onPress={viderHistorique} hitSlop={8}>
                      <Text style={styles.historiqueClear}>Effacer</Text>
                    </Pressable>
                  </View>
                  {historiqueRecherche.map((terme, index) => (
                    <Pressable
                      key={`${terme}-${index}`}
                      style={({ pressed }) => [
                        styles.historiqueItem,
                        pressed && styles.fullSearchResultItemPressed,
                      ]}
                      onPress={() => setRecherche(terme)}
                    >
                      <View style={styles.historiqueIconContainer}>
                        <Ionicons name="time-outline" size={18} color={couleurs.texteSecondaire} />
                      </View>
                      <Text style={styles.historiqueText} numberOfLines={1}>{terme}</Text>
                      <Pressable
                        onPress={() => supprimerDeHistorique(terme)}
                        hitSlop={8}
                        style={styles.historiqueDeleteBtn}
                      >
                        <Ionicons name="close" size={18} color={couleurs.texteMuted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.fullSearchHint}>
                  <View style={styles.fullSearchHintIcon}>
                    <Ionicons name="search" size={40} color={couleurs.primaire} />
                  </View>
                  <Text style={styles.fullSearchHintTitle}>Rechercher sur LPP</Text>
                  <Text style={styles.fullSearchHintText}>
                    Trouvez des membres, startups, projets et bien plus encore
                  </Text>
                </View>
              )
            ) : chargementRecherche ? (
                <View style={styles.fullSearchLoading}>
                  <View style={styles.fullSearchLoadingDots}>
                    <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.primaire }]} />
                    <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.secondaire }]} />
                    <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.primaire }]} />
                  </View>
                  <Text style={styles.fullSearchLoadingText}>Recherche en cours...</Text>
                </View>
              ) : rechercheUtilisateurs.length === 0 ? (
                <View style={styles.fullSearchEmpty}>
                  <View style={styles.fullSearchEmptyIcon}>
                    <Ionicons name="person-outline" size={48} color={couleurs.texteSecondaire} />
                  </View>
                  <Text style={styles.fullSearchEmptyTitle}>Aucun résultat</Text>
                  <Text style={styles.fullSearchEmptyText}>
                    Aucun utilisateur ne correspond à "{recherche}"
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.fullSearchResults}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={() => Keyboard.dismiss()}
                >
                  <Text style={styles.fullSearchResultsCount}>
                    {rechercheUtilisateurs.length} résultat{rechercheUtilisateurs.length > 1 ? 's' : ''}
                  </Text>
                  {rechercheUtilisateurs.map((user) => (
                    <Pressable
                      key={user._id}
                      style={({ pressed }) => [
                        styles.fullSearchResultItem,
                        pressed && styles.fullSearchResultItemPressed,
                      ]}
                      onPress={() => {
                        // Ajouter le nom à l'historique
                        ajouterAHistorique(`${user.prenom} ${user.nom}`);
                        fermerRecherche();
                        router.push({
                          pathname: '/(app)/utilisateur/[id]',
                          params: { id: user._id },
                        });
                      }}
                    >
                      <Avatar
                        uri={user.avatar}
                        prenom={user.prenom}
                        nom={user.nom}
                        taille={44}
                      />
                      <View style={styles.fullSearchResultInfo}>
                        <Text style={styles.fullSearchResultName}>
                          {user.prenom} {user.nom}
                        </Text>
                        {user.nbAmis !== undefined && (
                          <Text style={styles.fullSearchResultSub}>
                            {user.nbAmis} ami{user.nbAmis > 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={couleurs.texteMuted} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
          </View>
        </View>
      </Modal>

      {/* Modal Lecteur Vidéo - Composant factorisé */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoUrl={videoUrl}
        postId={videoPostId || undefined}
        onClose={closeVideoModal}
        initialPositionMillis={videoInitialPosition}
        initialShouldPlay={videoInitialShouldPlay}
        origin="feed"
        // Props Instagram-like
        liked={videoLiked}
        likesCount={videoLikesCount}
        commentsCount={videoCommentsCount}
        onLike={videoOnLikeRef.current || undefined}
        onComments={videoPostId ? () => openCommentsSheet(videoPostId, videoCommentsCount) : undefined}
        onShare={videoOnShareRef.current || undefined}
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
    </SafeAreaView>
  );
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // StoryCreator en arriere-plan (fixe, visible quand contenu principal glisse)
  storyCreatorBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  // Contenu principal qui glisse a droite pour reveler StoryCreator
  mainContentSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: couleurs.fond,
  },

  // PagerView styles
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.sm + 2,
    paddingVertical: espacements.xs + 2,
    gap: espacements.xs,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: couleurs.texteMuted,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifBadgeDemandes: {
    backgroundColor: couleurs.primaire,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: rayons.full,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarTexte: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.blanc,
  },

  // Navigation avec indicateur animé
  navigation: {
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    paddingHorizontal: espacements.lg,
  },
  navContent: {
    flexDirection: 'row',
    position: 'relative',
  },
  navIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: couleurs.primaire,
    borderRadius: 2,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    position: 'relative',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  navTabTextActive: {
    color: couleurs.primaire,
    fontWeight: '700',
  },
  navBadge: {
    backgroundColor: couleurs.erreur,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: espacements.xs,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.blanc,
  },
  navBadgeDemandes: {
    backgroundColor: couleurs.primaire,
  },

  // Stories
  storiesSection: {
    paddingVertical: espacements.md,
  },
  storiesScroll: {
    paddingHorizontal: espacements.lg,
    gap: espacements.md,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyItemAdd: {
    alignItems: 'center',
    width: 70,
  },
  storyAddIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: couleurs.primaire,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.xs,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    marginBottom: espacements.xs,
  },
  storyRingActive: {
    borderColor: couleurs.primaire,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storyNom: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },

  // Section
  section: {
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: espacements.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.xs,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  sectionActionText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },

  // Trending
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: rayons.sm,
    backgroundColor: couleurs.fondTertiaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacements.md,
  },
  trendingRankTop: {
    backgroundColor: couleurs.primaire,
  },
  trendingRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: couleurs.texteSecondaire,
  },
  trendingRankTextTop: {
    color: couleurs.blanc,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingNom: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },
  trendingSecteur: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  trendingChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  trendingChangeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.succes,
  },

  // Post
  postCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    marginBottom: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    gap: espacements.md,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: espacements.md,
  },
  postAuteurContainer: {
    flex: 1,
  },
  postAuteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    flexWrap: 'wrap',
  },
  postAuteur: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startupBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.sm,
  },
  startupBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.sm,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  adminBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: rayons.xs,
    gap: 2,
    marginLeft: 4,
  },
  adminBadgeSmallText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.sm,
    gap: 4,
  },
  statutBadgeEntrepreneur: {
    backgroundColor: '#F59E0B',
  },
  statutBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  statutBadgeSmall: {
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: rayons.xs,
    marginLeft: 4,
  },
  statutBadgeSmallEntrepreneur: {
    backgroundColor: '#F59E0B',
  },
  statutBadgeSmallText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
  },
  commentAuteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postTimestamp: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  postMore: {
    padding: espacements.sm,
  },
  postContenu: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
    paddingHorizontal: espacements.md,
    marginBottom: espacements.md,
  },
  postMediaContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: couleurs.fondTertiaire,
  },
  postImage: {
    width: '100%',
    height: 280,
    minHeight: 200,
    maxHeight: 400,
  },
  postVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  postVideoPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
    height: Platform.OS === 'ios' ? 160 : 200, // Android: plus haut pour couvrir les contrôles
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
    paddingBottom: Platform.OS === 'ios' ? 44 : 72, // Android: espace pour barre de navigation système
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
  videoDurationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // ========== VISIONNEUSE IMAGE - Style Instagram ==========
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  imageModalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  postStats: {
    flexDirection: 'row',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.lg,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  postStatText: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  postAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    gap: espacements.xs,
  },
  postActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },

  // Comments Section
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    padding: espacements.md,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  commentInput: {
    flex: 1,
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: 14,
    color: couleurs.texte,
    maxHeight: 100,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {
    backgroundColor: couleurs.fondTertiaire,
  },
  commentItem: {
    flexDirection: 'row',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.lg,
    padding: espacements.sm,
    paddingHorizontal: espacements.md,
  },
  commentAuteur: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 2,
  },
  commentTexte: {
    fontSize: 13,
    color: couleurs.texte,
    lineHeight: 18,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
    marginTop: espacements.xs,
    paddingHorizontal: espacements.sm,
  },
  commentTime: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  commentLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  commentReplyBtn: {
    paddingVertical: 2,
  },
  commentReplyText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: espacements.lg,
    gap: espacements.sm,
  },
  noCommentsText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  commentBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentActionsMenu: {
    flexDirection: 'row',
    gap: 8,
  },
  commentActionBtn: {
    padding: 4,
  },
  commentModified: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  editCommentContainer: {
    flex: 1,
  },
  editCommentInput: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: 13,
    color: couleurs.texte,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editCommentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espacements.sm,
    marginTop: espacements.sm,
  },
  editCancelBtn: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
  },
  editCancelText: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  editSaveBtn: {
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  editSaveBtnDisabled: {
    opacity: 0.5,
  },
  editSaveText: {
    fontSize: 12,
    color: couleurs.blanc,
    fontWeight: '600',
  },

  // Notification banner
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    marginBottom: espacements.sm,
    gap: espacements.sm,
  },
  notificationSucces: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  notificationErreur: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  notificationText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  notificationTextSucces: {
    color: '#10b981',
  },
  notificationTextErreur: {
    color: '#ef4444',
  },

  // Bottom Sheet Menu
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: couleurs.fondCard,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    paddingTop: espacements.sm,
    paddingBottom: espacements.xl,
    paddingHorizontal: espacements.lg,
    maxHeight: '85%',
  },
  bottomSheetScroll: {
    maxHeight: 400,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: couleurs.bordure,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: espacements.lg,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.lg,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: espacements.md,
  },
  staffBadgeText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  bottomSheetItemPressed: {
    opacity: 0.7,
  },
  bottomSheetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetTextContainer: {
    flex: 1,
  },
  bottomSheetItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
  },
  bottomSheetItemSubtext: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  bottomSheetSeparator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: espacements.sm,
  },
  bottomSheetCancelBtn: {
    marginTop: espacements.lg,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    alignItems: 'center',
  },
  bottomSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },

  // Edit post
  editPostContainer: {
    marginBottom: espacements.md,
  },
  editPostInput: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 14,
    color: couleurs.texte,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editPostActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espacements.sm,
    marginTop: espacements.sm,
  },

  // Comment input avatar image
  commentInputAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  // Hero
  heroSection: {
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.lg,
  },
  heroCard: {
    borderRadius: rayons.xl,
    padding: espacements.xl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    marginBottom: espacements.md,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.secondaire,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: couleurs.blanc,
    marginBottom: espacements.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: espacements.lg,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: espacements.lg,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.blanc,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: espacements.xs,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // ========== DECOUVRIR REFONTE ==========
  decouvrirSearchSection: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.sm,
    paddingBottom: espacements.xs,
  },
  decouvrirSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  decouvrirSearchInput: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
    paddingVertical: 0,
  },
  decouvrirCategoriesScroll: {
    maxHeight: 50,
  },
  decouvrirCategoriesContainer: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    gap: 8,
  },
  decouvrirCategorieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  decouvrirCategorieText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  decouvrirSection: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
  },
  decouvrirSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: espacements.md,
  },
  decouvrirSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: couleurs.texte,
    flex: 1,
  },
  decouvrirSectionCount: {
    fontSize: 13,
    color: couleurs.texteMuted,
    fontWeight: '500' as const,
  },
  // Trending cards
  decouvrirTrendingScroll: {
    gap: 12,
    paddingBottom: espacements.sm,
  },
  decouvrirTrendingCard: {
    width: SCREEN_WIDTH * 0.52,
    height: 180,
    borderRadius: rayons.lg,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  decouvrirTrendingImage: {
    width: '100%',
    height: '100%',
  },
  decouvrirTrendingImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decouvrirTrendingOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 40,
  },
  decouvrirTrendingRankBadge: {
    position: 'absolute' as const,
    top: -28,
    left: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  decouvrirTrendingRankText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800' as const,
  },
  decouvrirTrendingNom: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  decouvrirTrendingPitch: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 8,
  },
  decouvrirTrendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decouvrirMaturiteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  decouvrirMaturiteText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  decouvrirTrendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  decouvrirTrendingStatText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  // Empty state decouvrir
  decouvrirEmptyState: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    paddingHorizontal: espacements.lg,
  },
  decouvrirEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: couleurs.primaire + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.md,
  },
  decouvrirEmptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: couleurs.texte,
    marginBottom: espacements.xs,
    textAlign: 'center',
  },
  decouvrirEmptySubtitle: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },
  decouvrirEmptyBtn: {
    marginTop: espacements.md,
    backgroundColor: couleurs.primaire,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  decouvrirEmptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },

  // Startup Card
  startupCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    marginBottom: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  startupImage: {
    width: '100%',
    height: 140,
  },
  startupContent: {
    padding: espacements.lg,
  },
  startupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: espacements.sm,
  },
  startupLogo: {
    width: 40,
    height: 40,
    borderRadius: rayons.sm,
    marginLeft: espacements.sm,
  },
  startupNom: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  startupLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginTop: espacements.xs,
  },
  startupVille: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  startupDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginBottom: espacements.sm,
  },
  startupTags: {
    flexDirection: 'row',
    gap: espacements.xs,
    marginBottom: espacements.md,
    flexWrap: 'wrap',
  },
  startupTag: {
    backgroundColor: couleurs.fondTertiaire,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  startupTagText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  startupStats: {
    flexDirection: 'row',
    gap: espacements.lg,
    marginBottom: espacements.md,
  },
  startupStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  startupStatText: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  startupActions: {
    flexDirection: 'row',
    gap: espacements.md,
  },
  startupBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: espacements.xs,
  },
  startupBtnSuivi: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: couleurs.primaire,
  },
  startupBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  startupBtnSuiviText: {
    color: couleurs.primaire,
  },
  startupBtnSecondary: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
  },

  // ============ LIVE TAB ============
  liveContainer: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.lg,
    marginBottom: espacements.xl,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.md,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  liveCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.erreur,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveCountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.blanc,
  },
  liveCountText: {
    color: couleurs.blanc,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  goLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: couleurs.erreur,
  },
  goLiveBtnText: {
    color: couleurs.blanc,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  // Section pattern (matches decouvrir)
  liveSection: {
    paddingTop: espacements.md,
  },
  liveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: espacements.md,
  },
  liveSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: couleurs.texte,
    flex: 1,
  },
  liveSectionCount: {
    fontSize: 13,
    color: couleurs.texteMuted,
    fontWeight: '500' as const,
  },
  liveDivider: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: espacements.sm,
  },
  // Horizontal scroll (matches decouvrir trending)
  liveTrendingScroll: {
    gap: 12,
    paddingBottom: espacements.sm,
  },
  // Search bar
  liveSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: espacements.sm,
  },
  liveSearchInput: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
    paddingVertical: 4,
  },
  // Sort chips
  liveSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  liveSortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: couleurs.fondSecondaire,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  liveSortChipActive: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  liveSortChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: couleurs.texteSecondaire,
  },
  liveSortChipTextActive: {
    color: couleurs.blanc,
  },
  liveStatsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: couleurs.fondSecondaire,
  },
  liveStatsCompactText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: couleurs.texteSecondaire,
  },
  // No results
  liveNoResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.xxl,
    gap: espacements.md,
  },
  liveNoResultsText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center' as const,
  },
  // Active lives container
  livesActiveContainer: {
    gap: espacements.md,
  },
  // Empty state
  liveEmptyState: {
    gap: espacements.lg,
  },
  liveEmptyHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: espacements.xl,
    gap: espacements.md,
    borderRadius: rayons.xl,
  },
  liveEmptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: `${couleurs.primaireLight}40`,
    backgroundColor: `${couleurs.primaireLight}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.xs,
  },
  liveEmptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: couleurs.blanc,
    textAlign: 'center' as const,
  },
  liveEmptySubtitle: {
    fontSize: 14,
    color: `${couleurs.blanc}99`,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  liveEmptyCTABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: couleurs.erreur,
    marginTop: espacements.sm,
  },
  liveEmptyCTAText: {
    color: couleurs.blanc,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  // How-to section
  liveHowToSection: {
    gap: espacements.md,
  },
  liveHowToSteps: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  liveHowToStep: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.sm,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 6,
  },
  liveHowToStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHowToStepNumText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  liveHowToStepTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: couleurs.texte,
  },
  liveHowToStepDesc: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    textAlign: 'center' as const,
  },

  // Messages
  messagesCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: espacements.lg,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  messagesHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  messagesNewBtn: {
    width: 36,
    height: 36,
    borderRadius: rayons.md,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: espacements.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    borderRadius: rayons.md,
  },
  messageRowUnread: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  messageAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: espacements.md,
  },
  messageContent: {
    flex: 1,
  },
  messageExpediteur: {
    fontSize: 14,
    color: couleurs.texte,
  },
  messageExpediteurUnread: {
    fontWeight: '600',
  },
  messageDernier: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  messageMeta: {
    alignItems: 'flex-end',
  },
  messageDate: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  messageUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.primaire,
    marginTop: espacements.xs,
  },
  messageUnreadBadge: {
    backgroundColor: couleurs.primaire,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: espacements.xs,
  },
  messageUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  messagesSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    marginHorizontal: espacements.md,
    marginBottom: espacements.sm,
    gap: espacements.sm,
  },
  messagesSearchInput: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
    padding: 0,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    gap: espacements.md,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  messagesEmptyText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    paddingVertical: espacements.lg,
  },
  chargementText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    paddingVertical: espacements.lg,
  },
  startConversationBtn: {
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
  },
  startConversationBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  conversationHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messagesConversation: {
    flex: 1,
    maxHeight: 400,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: espacements.md,
    borderRadius: rayons.lg,
    marginBottom: espacements.sm,
    marginHorizontal: espacements.md,
  },
  messageBubbleMoi: {
    alignSelf: 'flex-end',
    backgroundColor: couleurs.primaire,
    borderBottomRightRadius: 4,
  },
  messageBubbleAutre: {
    alignSelf: 'flex-start',
    backgroundColor: couleurs.fondTertiaire,
    borderBottomLeftRadius: 4,
  },
  messageBubbleText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
  },
  messageBubbleTextMoi: {
    color: couleurs.blanc,
  },
  messageBubbleTime: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginTop: espacements.xs,
    alignSelf: 'flex-end',
  },
  messageBubbleTimeMoi: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    gap: espacements.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: 14,
    color: couleurs.texte,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: couleurs.fondTertiaire,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    marginBottom: espacements.md,
    gap: espacements.sm,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
    padding: 0,
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    gap: espacements.md,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: couleurs.texte,
  },
  noResultsText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    paddingVertical: espacements.lg,
  },
  selectedDestinataireContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.md,
    gap: espacements.sm,
  },
  selectedDestinataireAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectedDestinataireName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: couleurs.texte,
  },
  modalMessageInput: {
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    fontSize: 14,
    color: couleurs.texte,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: espacements.md,
  },
  sendMessageBtn: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
  },
  sendMessageBtnDisabled: {
    backgroundColor: couleurs.fondTertiaire,
  },
  sendMessageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.blanc,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    paddingHorizontal: espacements.lg,
  },
  footerLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: couleurs.primaire,
    marginBottom: espacements.xs,
  },
  footerText: {
    fontSize: 14,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  footerSubtext: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 100,
  },
  fabGradientWrapper: {
    borderRadius: 28,
    shadowColor: couleurs.primaire,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 90,
  },
  scrollTopBtn: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 99,
  },
  scrollTopBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondSecondaire,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 95,
    alignItems: 'flex-end',
    gap: espacements.md,
  },
  fabActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
  },
  fabAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabActionLabel: {
    backgroundColor: couleurs.fondSecondaire,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Reply styles
  replyingToBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    marginBottom: espacements.md,
  },
  replyingToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  replyingToText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  replyingToName: {
    fontWeight: '600',
    color: couleurs.primaire,
  },
  cancelReplyBtn: {
    padding: espacements.xs,
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginTop: espacements.sm,
    paddingHorizontal: espacements.sm,
  },
  viewRepliesText: {
    fontSize: 12,
    color: couleurs.primaire,
    fontWeight: '500',
  },
  replyItem: {
    flexDirection: 'row',
    gap: espacements.sm,
    marginLeft: 20,
    marginBottom: espacements.sm,
    paddingLeft: espacements.md,
  },
  replyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 16,
    width: 2,
    backgroundColor: couleurs.bordure,
    borderRadius: 1,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  replyBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: rayons.lg,
    padding: espacements.sm,
    paddingHorizontal: espacements.md,
    borderLeftWidth: 2,
    borderLeftColor: couleurs.primaire,
  },

  // Loading & Empty states
  loadingContainer: {
    padding: espacements.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  emptyContainer: {
    padding: espacements.xxl,
    alignItems: 'center',
    gap: espacements.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  emptySubtext: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },

  // Modal creer publication
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: couleurs.fond,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: espacements.lg,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: espacements.lg,
  },
  modalAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
    marginBottom: espacements.lg,
  },
  modalAuthorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAuthorAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalAuthorAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.blanc,
  },
  modalAuthorName: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  modalTextInput: {
    fontSize: 16,
    color: couleurs.texte,
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  modalCharCount: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    marginTop: espacements.sm,
  },
  modalFooter: {
    padding: espacements.lg,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  modalPublishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: espacements.sm,
  },
  modalPublishBtnDisabled: {
    backgroundColor: couleurs.fondTertiaire,
  },
  modalPublishBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.blanc,
  },

  // Media Preview dans Modal
  mediaPreviewContainer: {
    position: 'relative',
    marginTop: espacements.md,
    borderRadius: rayons.md,
    overflow: 'hidden',
    backgroundColor: couleurs.fondTertiaire,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: rayons.md,
  },
  mediaVideoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: espacements.sm,
    right: espacements.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },

  // Multi-média preview row
  mediasPreviewRow: {
    marginTop: espacements.md,
  },
  mediaPreviewItem: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: espacements.sm,
    borderRadius: rayons.sm,
    overflow: 'hidden',
  },
  mediaPreviewThumb: {
    width: '100%',
    height: '100%',
  },
  mediaVideoIndicatorSmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaRemoveBtnSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  mediaIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: rayons.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mediaIndexText: {
    color: couleurs.blanc,
    fontSize: 10,
    fontWeight: '600',
  },
  mediasCount: {
    color: couleurs.texteSecondaire,
    fontSize: 12,
    marginTop: espacements.xs,
  },

  // Barre d'actions médias dans Modal
  modalMediaBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingVertical: espacements.sm,
    paddingHorizontal: espacements.lg,
  },
  modalMediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.xs,
    paddingVertical: espacements.sm,
  },
  modalMediaBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: couleurs.primaire,
  },

  // Full Screen Search
  fullSearchContainer: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  fullSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  fullSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.sm + 2,
    paddingVertical: espacements.xs + 3,
    gap: espacements.xs,
  },
  fullSearchInput: {
    flex: 1,
    fontSize: 15,
    color: couleurs.texte,
    paddingVertical: 0,
  },
  fullSearchCancel: {
    paddingHorizontal: espacements.xs,
    paddingVertical: espacements.xs,
  },
  fullSearchCancelText: {
    fontSize: 15,
    color: couleurs.primaire,
    fontWeight: '500',
  },
  fullSearchContent: {
    flex: 1,
  },
  fullSearchHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.xl,
    paddingBottom: 80,
  },
  fullSearchHintIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.primaireLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  fullSearchHintTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
    textAlign: 'center',
  },
  fullSearchHintText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },
  fullSearchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  fullSearchLoadingDots: {
    flexDirection: 'row',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  fullSearchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fullSearchLoadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  fullSearchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.xl,
    paddingBottom: 80,
  },
  fullSearchEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  fullSearchEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  fullSearchEmptyText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
  fullSearchResults: {
    flex: 1,
  },
  fullSearchResultsCount: {
    fontSize: 12,
    color: couleurs.texteMuted,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
    paddingBottom: espacements.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fullSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.sm,
    paddingHorizontal: espacements.md,
    gap: espacements.sm,
  },
  fullSearchResultItemPressed: {
    backgroundColor: couleurs.fondSecondaire,
  },
  fullSearchResultInfo: {
    flex: 1,
  },
  fullSearchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 1,
  },
  fullSearchResultSub: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  fullSearchResultArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Historique de recherche
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  historiqueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historiqueClear: {
    fontSize: 13,
    color: couleurs.primaire,
    fontWeight: '500',
  },
  historiqueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.lg,
    gap: espacements.md,
  },
  historiqueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historiqueText: {
    flex: 1,
    fontSize: 15,
    color: couleurs.texte,
  },
  historiqueDeleteBtn: {
    padding: espacements.xs,
  },
  // ================ STYLES ENTREPRENEUR ================
  entrepreneurContainer: {
    flex: 1,
    paddingTop: espacements.md,
  },
  entrepreneurHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.lg,
  },
  entrepreneurTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  entrepreneurSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  entrepreneurCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    gap: 6,
  },
  entrepreneurCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  entrepreneurList: {
    flex: 1,
  },
  entrepreneurListContent: {
    paddingHorizontal: espacements.lg,
    paddingBottom: 100,
  },
  entrepreneurEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: espacements.xl,
    borderRadius: rayons.lg,
    marginTop: espacements.xl,
  },
  entrepreneurEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: espacements.lg,
    textAlign: 'center',
  },
  entrepreneurEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: espacements.sm,
    lineHeight: 20,
  },
  entrepreneurEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    marginTop: espacements.xl,
    gap: 8,
  },
  entrepreneurEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  entrepreneurLoading: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  entrepreneurLoadingText: {
    fontSize: 14,
  },
  entrepreneurProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    borderRadius: rayons.lg,
    marginBottom: espacements.sm,
  },
  entrepreneurProjectImage: {
    width: 60,
    height: 60,
    borderRadius: rayons.md,
  },
  entrepreneurProjectImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: rayons.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrepreneurProjectInfo: {
    flex: 1,
    marginLeft: espacements.md,
    marginRight: espacements.sm,
  },
  entrepreneurProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entrepreneurProjectName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: espacements.sm,
  },
  entrepreneurProjectStatus: {
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.full,
  },
  entrepreneurStatusPublished: {
    backgroundColor: '#10B98120',
  },
  entrepreneurStatusDraft: {
    backgroundColor: '#F59E0B20',
  },
  entrepreneurProjectStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  entrepreneurProjectPitch: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  entrepreneurProjectMeta: {
    flexDirection: 'row',
    gap: espacements.md,
  },
  entrepreneurProjectMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entrepreneurProjectMetaText: {
    fontSize: 12,
  },
});
