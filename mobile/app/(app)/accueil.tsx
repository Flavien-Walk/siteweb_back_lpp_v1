/**
 * Ecran d'accueil - Reseau Social LPP
 * Decouverte de startups et communaute
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Share,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { espacements, rayons } from '../../src/constantes/theme';
import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { Utilisateur } from '../../src/services/auth';
import {
  Publication,
  Commentaire as CommentaireAPI,
  getPublications,
  creerPublication,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  toggleLikeCommentaire,
  supprimerCommentaire,
  modifierCommentaire,
  supprimerPublication,
  modifierPublication,
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
  getProjets,
  toggleSuivreProjet,
} from '../../src/services/projets';
import {
  Evenement,
  getEvenements,
} from '../../src/services/evenements';
import { getNotifications } from '../../src/services/notifications';
import { rechercherUtilisateurs as rechercherUtilisateursAPI, ProfilUtilisateur, getDemandesAmis } from '../../src/services/utilisateurs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Avatar from '../../src/composants/Avatar';

// Clé de stockage pour l'historique de recherche
const HISTORIQUE_RECHERCHE_KEY = '@lpp_historique_recherche';
const MAX_HISTORIQUE = 10;
import LikeButton, { LikeButtonCompact } from '../../src/composants/LikeButton';
import AnimatedPressable from '../../src/composants/AnimatedPressable';
import { SkeletonList } from '../../src/composants/SkeletonLoader';
import { ANIMATION_CONFIG } from '../../src/hooks/useAnimations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type OngletActif = 'feed' | 'decouvrir' | 'live' | 'messages';

interface Startup {
  id: string;
  nom: string;
  ville: string;
  description: string;
  tags: string[];
  image: string;
  abonnes: number;
  posts: number;
}

interface Live {
  id: string;
  titre: string;
  startup: string;
  datetime: string;
  interesse: number;
  enDirect: boolean;
  viewers?: number;
  image: string;
}

interface TrendingStartup {
  id: string;
  nom: string;
  secteur: string;
  nouveauxAbonnes: number;
}

// Donnees mock pour Tendances
const TRENDING_STARTUPS: TrendingStartup[] = [
  { id: '1', nom: 'GreenTech Lyon', secteur: 'CleanTech', nouveauxAbonnes: 124 },
  { id: '2', nom: 'MedIA Diagnostics', secteur: 'HealthTech', nouveauxAbonnes: 98 },
  { id: '3', nom: 'FinFlow Systems', secteur: 'FinTech', nouveauxAbonnes: 76 },
];

// Donnees mock pour Decouvrir
const MOCK_STARTUPS: Startup[] = [
  {
    id: '1',
    nom: 'GreenTech Lyon',
    ville: 'Lyon',
    description: 'Solutions de recyclage intelligent pour les entreprises',
    tags: ['CleanTech', 'B2B', 'Impact'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    abonnes: 1247,
    posts: 89,
  },
  {
    id: '2',
    nom: 'FoodLab Marseille',
    ville: 'Marseille',
    description: 'Alimentation durable et locale pour tous',
    tags: ['FoodTech', 'B2C', 'Local'],
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
    abonnes: 856,
    posts: 42,
  },
  {
    id: '3',
    nom: 'MedIA Diagnostics',
    ville: 'Paris',
    description: 'IA au service du diagnostic medical',
    tags: ['HealthTech', 'IA', 'Sante'],
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop',
    abonnes: 2103,
    posts: 156,
  },
];

// Donnees mock pour Lives
const MOCK_LIVES: Live[] = [
  {
    id: '1',
    titre: 'AMA : Decouvrez notre equipe',
    startup: 'GreenTech Lyon',
    datetime: 'En direct',
    interesse: 342,
    enDirect: true,
    viewers: 1247,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=300&fit=crop',
  },
  {
    id: '2',
    titre: 'Backstage : Notre labo R&D',
    startup: 'MedIA Diagnostics',
    datetime: 'Demain, 18h00',
    interesse: 189,
    enDirect: false,
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&h=300&fit=crop',
  },
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

export default function Accueil() {
  const { couleurs } = useTheme();
  const { utilisateur, needsStatut, refreshUser } = useUser();
  const insets = useSafeAreaInsets();
  const styles = createStyles(couleurs);

  const [rafraichissement, setRafraichissement] = useState(false);
  const [ongletActif, setOngletActif] = useState<OngletActif>('feed');
  const [recherche, setRecherche] = useState('');
  const [fabOuvert, setFabOuvert] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [afficherScrollTop, setAfficherScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  // Publications API
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modalCreerPost, setModalCreerPost] = useState(false);
  const [nouveauPostContenu, setNouveauPostContenu] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [mediaSelectionne, setMediaSelectionne] = useState<{
    uri: string;
    type: 'image' | 'video';
    base64?: string;
    mimeType?: string;
  } | null>(null);

  // Video player modal
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Image viewer modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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

  // Projets (startups) API
  const [projets, setProjets] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);

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

  // Animations FAB
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const action1Anim = useRef(new Animated.Value(0)).current;
  const action2Anim = useRef(new Animated.Value(0)).current;
  const action3Anim = useRef(new Animated.Value(0)).current;
  const action4Anim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const onglets: { key: OngletActif; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'feed', label: 'Feed', icon: 'home-outline' },
    { key: 'decouvrir', label: 'Decouvrir', icon: 'compass-outline' },
    { key: 'live', label: 'Live', icon: 'radio-outline' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles-outline' },
  ];

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

  // Note: les notifications sont chargées via chargerDonnees() au refresh, pas via useFocusEffect
  // pour éviter que le badge se mette à jour quand on revient du centre de notifications

  // Charger l'historique de recherche au montage
  useEffect(() => {
    chargerHistoriqueRecherche();
  }, []);

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

  const chargerProjets = async () => {
    try {
      setChargementProjets(true);
      const reponse = await getProjets({ limit: 10 });
      if (reponse.succes && reponse.data) {
        setProjets(reponse.data.projets);
      }
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setChargementProjets(false);
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
    if ((!nouveauPostContenu.trim() && !mediaSelectionne) || creationEnCours) return;

    try {
      setCreationEnCours(true);

      // Préparer le média en base64 si présent
      let mediaData: string | undefined;
      if (mediaSelectionne?.base64) {
        const mimeType = mediaSelectionne.mimeType || (mediaSelectionne.type === 'video' ? 'video/mp4' : 'image/jpeg');
        mediaData = `data:${mimeType};base64,${mediaSelectionne.base64}`;
      } else if (mediaSelectionne?.uri) {
        mediaData = mediaSelectionne.uri;
      }

      const reponse = await creerPublication(nouveauPostContenu.trim(), mediaData);
      if (reponse.succes && reponse.data) {
        setPublications(prev => [reponse.data!.publication, ...prev]);
        setNouveauPostContenu('');
        setMediaSelectionne(null);
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

  // Sélection d'une image depuis la galerie
  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour ajouter des photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaSelectionne({
          uri: asset.uri,
          type: 'image',
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // Sélection d'une vidéo depuis la galerie
  const handleSelectVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour ajouter des vidéos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30, // Limité à 30s pour éviter les fichiers trop volumineux
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

        setMediaSelectionne({
          uri: asset.uri,
          type: 'video',
          base64: base64,
          mimeType: asset.mimeType || 'video/mp4',
        });
      }
    } catch (error) {
      console.error('Erreur sélection vidéo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo. Elle est peut-être trop volumineuse.');
    }
  };

  // Prendre une photo avec l'appareil photo
  const handleTakePhoto = async () => {
    try {
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
        setMediaSelectionne({
          uri: asset.uri,
          type: 'image',
          base64: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Supprimer le média sélectionné
  const handleRemoveMedia = () => {
    setMediaSelectionne(null);
  };

  const handleProfil = () => {
    router.push('/(app)/profil');
  };

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  const unreadMessages = conversations.reduce((total, conv) => total + conv.messagesNonLus, 0);

  // ============ COMPOSANTS ============

  // Note: Les anciens composants PostCard et StoryItem ont ete supprimes
  // car ils utilisaient des donnees mock. PublicationCard utilise l'API.

  // ============ PUBLICATION CARD (API) ============
  const PublicationCard = ({ publication, onUpdate, onDelete }: { publication: Publication; onUpdate: (pub: Publication) => void; onDelete: (id: string) => void }) => {
    const [liked, setLiked] = useState(publication.aLike);
    const [nbLikes, setNbLikes] = useState(publication.nbLikes);
    const [nbComments, setNbComments] = useState(publication.nbCommentaires);
    const [showComments, setShowComments] = useState(false);
    const [commentaires, setCommentaires] = useState<CommentaireAPI[]>([]);
    const [chargementCommentaires, setChargementCommentaires] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
    const [editingComment, setEditingComment] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [editingPost, setEditingPost] = useState(false);

    // Synchroniser les états locaux avec les props
    useEffect(() => {
      setLiked(publication.aLike);
      setNbLikes(publication.nbLikes);
      setNbComments(publication.nbCommentaires);
    }, [publication.aLike, publication.nbLikes, publication.nbCommentaires, publication._id]);
    const [editingPostContent, setEditingPostContent] = useState(publication.contenu);
    const [showPostMenu, setShowPostMenu] = useState(false);
    const [notification, setNotification] = useState<{ type: 'succes' | 'erreur'; message: string } | null>(null);

    const auteurNom = `${publication.auteur.prenom} ${publication.auteur.nom}`;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'A l\'instant';
      if (minutes < 60) return `Il y a ${minutes}min`;
      if (hours < 24) return `Il y a ${hours}h`;
      if (days < 7) return `Il y a ${days}j`;
      return date.toLocaleDateString('fr-FR');
    };

    const handleLike = async () => {
      try {
        const newLiked = !liked;
        setLiked(newLiked);
        setNbLikes(prev => newLiked ? prev + 1 : prev - 1);

        const reponse = await toggleLikePublication(publication._id);
        if (reponse.succes && reponse.data) {
          setLiked(reponse.data.aLike);
          setNbLikes(reponse.data.nbLikes);
          // Synchroniser l'état parent
          onUpdate({ ...publication, aLike: reponse.data.aLike, nbLikes: reponse.data.nbLikes, nbCommentaires: nbComments });
        }
      } catch (error) {
        setLiked(!liked);
        setNbLikes(publication.nbLikes);
      }
    };

    const chargerCommentaires = async () => {
      try {
        setChargementCommentaires(true);
        const reponse = await getCommentaires(publication._id);
        if (reponse.succes && reponse.data) {
          setCommentaires(reponse.data.commentaires);
        }
      } catch (error) {
        console.error('Erreur chargement commentaires:', error);
      } finally {
        setChargementCommentaires(false);
      }
    };

    const handleToggleComments = () => {
      if (!showComments) {
        chargerCommentaires();
      }
      setShowComments(!showComments);
    };

    const handleAddComment = async () => {
      if (!newComment.trim()) return;

      try {
        const reponse = await ajouterCommentaire(publication._id, newComment.trim(), replyingTo?.id);
        if (reponse.succes && reponse.data) {
          if (replyingTo) {
            setCommentaires(prev => prev.map(c => {
              if (c._id === replyingTo.id) {
                return { ...c, reponses: [...(c.reponses || []), reponse.data!.commentaire] };
              }
              return c;
            }));
            setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
          } else {
            setCommentaires(prev => [reponse.data!.commentaire, ...prev]);
          }
          setNewComment('');
          setReplyingTo(null);
          setNbComments(prev => prev + 1);
          // Note: Ne pas appeler onUpdate ici pour eviter de fermer la section commentaires
          // Le compteur local est mis a jour et sera synchronise au prochain chargement
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
      }
    };

    const handleLikeComment = async (commentId: string) => {
      try {
        const reponse = await toggleLikeCommentaire(publication._id, commentId);
        if (reponse.succes && reponse.data) {
          setCommentaires(prev => prev.map(c => {
            if (c._id === commentId) {
              return { ...c, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes };
            }
            if (c.reponses) {
              return {
                ...c,
                reponses: c.reponses.map(r => r._id === commentId ? { ...r, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes } : r),
              };
            }
            return c;
          }));
        }
      } catch (error) {
        console.error('Erreur like commentaire:', error);
      }
    };

    const handleEditComment = async (commentId: string) => {
      if (!editingContent.trim()) return;
      try {
        const reponse = await modifierCommentaire(publication._id, commentId, editingContent.trim());
        if (reponse.succes && reponse.data) {
          setCommentaires(prev => prev.map(c => {
            if (c._id === commentId) {
              return { ...c, contenu: reponse.data!.commentaire.contenu, modifie: true };
            }
            if (c.reponses) {
              return {
                ...c,
                reponses: c.reponses.map(r => r._id === commentId ? { ...r, contenu: reponse.data!.commentaire.contenu, modifie: true } : r),
              };
            }
            return c;
          }));
          setEditingComment(null);
          setEditingContent('');
        } else {
          Alert.alert('Erreur', reponse.message || 'Impossible de modifier le commentaire');
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de modifier le commentaire');
      }
    };

    const handleDeleteComment = async (commentId: string, isReply = false, parentId?: string) => {
      Alert.alert(
        'Supprimer le commentaire',
        'Voulez-vous vraiment supprimer ce commentaire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                const reponse = await supprimerCommentaire(publication._id, commentId);
                if (reponse.succes) {
                  if (isReply && parentId) {
                    setCommentaires(prev => prev.map(c => {
                      if (c._id === parentId) {
                        return { ...c, reponses: c.reponses?.filter(r => r._id !== commentId) };
                      }
                      return c;
                    }));
                  } else {
                    setCommentaires(prev => prev.filter(c => c._id !== commentId));
                  }
                  setNbComments(prev => Math.max(0, prev - 1));
                  onUpdate({ ...publication, aLike: liked, nbLikes, nbCommentaires: Math.max(0, nbComments - 1) });
                } else {
                  Alert.alert('Erreur', reponse.message || 'Impossible de supprimer le commentaire');
                }
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
              }
            },
          },
        ]
      );
    };

    const startEditComment = (comment: CommentaireAPI) => {
      setEditingComment(comment._id);
      setEditingContent(comment.contenu);
    };

    const cancelEdit = () => {
      setEditingComment(null);
      setEditingContent('');
    };

    const isMyComment = (auteurId: string) => {
      return utilisateur && utilisateur.id === auteurId;
    };

    const isMyPost = () => {
      return utilisateur && utilisateur.id === publication.auteur._id;
    };

    const isAdmin = () => {
      return utilisateur && utilisateur.role === 'admin';
    };

    const canEditDelete = () => {
      return isMyPost() || isAdmin();
    };

    // Navigation vers le profil de l'auteur du post
    const naviguerVersProfilAuteur = () => {
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: publication.auteur._id },
      });
    };

    const showNotification = (type: 'succes' | 'erreur', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    };

    const handleEditPost = async () => {
      if (!editingPostContent.trim()) return;
      try {
        const reponse = await modifierPublication(publication._id, editingPostContent.trim());
        if (reponse.succes && reponse.data) {
          onUpdate(reponse.data.publication);
          setEditingPost(false);
          showNotification('succes', 'Publication modifiee avec succes');
        } else {
          showNotification('erreur', reponse.message || 'Erreur lors de la modification');
        }
      } catch (error) {
        showNotification('erreur', 'Impossible de modifier la publication');
      }
    };

    const handleDeletePost = () => {
      setShowPostMenu(false);
      Alert.alert(
        'Supprimer la publication',
        'Voulez-vous vraiment supprimer cette publication ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                const reponse = await supprimerPublication(publication._id);
                if (reponse.succes) {
                  onDelete(publication._id);
                  showNotification('succes', 'Publication supprimee');
                } else {
                  showNotification('erreur', reponse.message || 'Erreur lors de la suppression');
                }
              } catch (error) {
                showNotification('erreur', 'Impossible de supprimer la publication');
              }
            },
          },
        ]
      );
    };

    const handleShare = async () => {
      try {
        await Share.share({
          message: `Decouvre ce post de ${auteurNom} sur LPP !\n\n"${publication.contenu.substring(0, 100)}${publication.contenu.length > 100 ? '...' : ''}"\n\nTelecharge LPP pour suivre les startups innovantes !`,
          title: `Post de ${auteurNom}`,
        });
      } catch (error) {
        showNotification('erreur', 'Impossible de partager ce contenu');
      }
    };

    const userAvatarUrl = utilisateur?.avatar || `https://api.dicebear.com/7.x/thumbs/png?seed=${utilisateur?.id || 'default'}&backgroundColor=6366f1&size=128`;

    return (
      <View style={styles.postCard}>
        {/* Notification banner */}
        {notification && (
          <View style={[styles.notificationBanner, notification.type === 'succes' ? styles.notificationSucces : styles.notificationErreur]}>
            <Ionicons
              name={notification.type === 'succes' ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={notification.type === 'succes' ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.notificationText, notification.type === 'succes' ? styles.notificationTextSucces : styles.notificationTextErreur]}>
              {notification.message}
            </Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <Pressable onPress={naviguerVersProfilAuteur}>
            <Avatar
              uri={publication.auteur.avatar}
              prenom={publication.auteur.prenom}
              nom={publication.auteur.nom}
              taille={44}
            />
          </Pressable>
          <View style={styles.postAuteurContainer}>
            <View style={styles.postAuteurRow}>
              <Pressable onPress={naviguerVersProfilAuteur}>
                <Text style={styles.postAuteur}>{auteurNom}</Text>
              </Pressable>
              {publication.auteur.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={styles.adminBadgeText}>Admin LPP</Text>
                </View>
              )}
              {publication.auteur.role !== 'admin' && publication.auteur.statut && (
                <View style={[
                  styles.statutBadge,
                  publication.auteur.statut === 'entrepreneur' && styles.statutBadgeEntrepreneur
                ]}>
                  <Ionicons
                    name={publication.auteur.statut === 'entrepreneur' ? 'rocket' : 'compass'}
                    size={10}
                    color="#fff"
                  />
                  <Text style={styles.statutBadgeText}>
                    {publication.auteur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                  </Text>
                </View>
              )}
              {publication.auteurType === 'Projet' && (
                <View style={styles.startupBadge}>
                  <Text style={styles.startupBadgeText}>Startup</Text>
                </View>
              )}
            </View>
            <Text style={styles.postTimestamp}>{formatDate(publication.dateCreation)}</Text>
          </View>
          {canEditDelete() && (
            <Pressable style={styles.postMore} onPress={() => setShowPostMenu(!showPostMenu)}>
              <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          )}
        </View>

        {/* Menu contextuel pour modifier/supprimer */}
        {showPostMenu && canEditDelete() && (
          <View style={styles.postMenu}>
            <Pressable
              style={styles.postMenuItem}
              onPress={() => {
                setShowPostMenu(false);
                setEditingPost(true);
              }}
            >
              <Ionicons name="pencil" size={18} color={couleurs.primaire} />
              <Text style={styles.postMenuItemText}>Modifier</Text>
            </Pressable>
            <Pressable style={styles.postMenuItem} onPress={handleDeletePost}>
              <Ionicons name="trash-outline" size={18} color={couleurs.erreur} />
              <Text style={[styles.postMenuItemText, { color: couleurs.erreur }]}>Supprimer</Text>
            </Pressable>
          </View>
        )}

        {/* Mode edition du post */}
        {editingPost ? (
          <View style={styles.editPostContainer}>
            <TextInput
              style={styles.editPostInput}
              value={editingPostContent}
              onChangeText={setEditingPostContent}
              multiline
              maxLength={5000}
              autoFocus
            />
            <View style={styles.editPostActions}>
              <Pressable style={styles.editCancelBtn} onPress={() => { setEditingPost(false); setEditingPostContent(publication.contenu); }}>
                <Text style={styles.editCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.editSaveBtn, !editingPostContent.trim() && styles.editSaveBtnDisabled]}
                onPress={handleEditPost}
                disabled={!editingPostContent.trim()}
              >
                <Text style={styles.editSaveText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.postContenu}>{publication.contenu}</Text>
        )}
        {publication.media && (() => {
          const isVideo = publication.media.includes('.mp4') ||
            publication.media.includes('.mov') ||
            publication.media.includes('.webm') ||
            publication.media.includes('video');

          // Utiliser thumbnail Cloudinary pour les vidéos
          const thumbnailUri = isVideo
            ? getVideoThumbnail(publication.media)
            : publication.media;

          return (
            <Pressable
              style={styles.postMediaContainer}
              onPress={() => {
                if (isVideo) {
                  setVideoUrl(publication.media!);
                  setVideoModalVisible(true);
                  resetControlsTimeout();
                } else {
                  setImageUrl(publication.media!);
                  setImageModalVisible(true);
                }
              }}
            >
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.postImage}
                resizeMode="cover"
              />
              {isVideo && (
                <View style={styles.postVideoOverlay}>
                  <View style={styles.postVideoPlayBtn}>
                    <Ionicons name="play" size={32} color={couleurs.blanc} />
                  </View>
                  <View style={styles.videoDurationBadge}>
                    <Ionicons name="videocam" size={12} color={couleurs.blanc} />
                  </View>
                </View>
              )}
            </Pressable>
          );
        })()}
        <View style={styles.postStats}>
          <Text style={styles.postStatText}>{nbLikes} j'aime</Text>
          <Pressable onPress={handleToggleComments}>
            <Text style={styles.postStatText}>{nbComments} commentaires</Text>
          </Pressable>
        </View>
        <View style={styles.postActions}>
          <AnimatedPressable style={styles.postAction} onPress={handleLike}>
            <LikeButton
              isLiked={liked}
              count={nbLikes}
              onPress={handleLike}
              size={22}
              showCount={false}
            />
            <Text style={[styles.postActionText, liked && { color: couleurs.danger }]}>J'aime</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.postAction} onPress={handleToggleComments}>
            <Ionicons
              name={showComments ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={showComments ? couleurs.primaire : couleurs.texteSecondaire}
            />
            <Text style={[styles.postActionText, showComments && { color: couleurs.primaire }]}>Commenter</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.postAction} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={couleurs.texteSecondaire} />
            <Text style={styles.postActionText}>Partager</Text>
          </AnimatedPressable>
        </View>

        {showComments && (
          <View style={styles.commentsSection}>
            {replyingTo && (
              <View style={styles.replyingToBanner}>
                <View style={styles.replyingToContent}>
                  <Ionicons name="arrow-undo" size={14} color={couleurs.primaire} />
                  <Text style={styles.replyingToText}>
                    Reponse a <Text style={styles.replyingToName}>{replyingTo.auteur}</Text>
                  </Text>
                </View>
                <Pressable onPress={() => { setReplyingTo(null); setNewComment(''); }} style={styles.cancelReplyBtn}>
                  <Ionicons name="close" size={18} color={couleurs.texteSecondaire} />
                </Pressable>
              </View>
            )}

            <View style={styles.commentInputContainer}>
              <Avatar
                uri={utilisateur?.avatar}
                prenom={utilisateur?.prenom}
                nom={utilisateur?.nom}
                taille={32}
              />
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? `Repondre a ${replyingTo.auteur}...` : 'Ecrire un commentaire...'}
                placeholderTextColor={couleurs.texteSecondaire}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
              />
              <Pressable
                style={[styles.commentSendBtn, !newComment.trim() && styles.commentSendBtnDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={newComment.trim() ? couleurs.primaire : couleurs.texteSecondaire}
                />
              </Pressable>
            </View>

            {chargementCommentaires ? (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>Chargement...</Text>
              </View>
            ) : commentaires.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubbles-outline" size={32} color={couleurs.texteSecondaire} />
                <Text style={styles.noCommentsText}>Soyez le premier a commenter !</Text>
              </View>
            ) : (
              commentaires.map((comment) => {
                const commentAuteur = `${comment.auteur.prenom} ${comment.auteur.nom}`;
                const commentIsAdmin = comment.auteur.role === 'admin';
                const canEditDeleteComment = isMyComment(comment.auteur._id) || isAdmin();
                const isEditing = editingComment === comment._id;
                return (
                  <View key={comment._id}>
                    <View style={styles.commentItem}>
                      <Avatar
                        uri={comment.auteur.avatar}
                        prenom={comment.auteur.prenom}
                        nom={comment.auteur.nom}
                        taille={32}
                      />
                      <View style={styles.commentContent}>
                        {isEditing ? (
                          <View style={styles.editCommentContainer}>
                            <TextInput
                              style={styles.editCommentInput}
                              value={editingContent}
                              onChangeText={setEditingContent}
                              multiline
                              maxLength={1000}
                              autoFocus
                            />
                            <View style={styles.editCommentActions}>
                              <Pressable style={styles.editCancelBtn} onPress={cancelEdit}>
                                <Text style={styles.editCancelText}>Annuler</Text>
                              </Pressable>
                              <Pressable
                                style={[styles.editSaveBtn, !editingContent.trim() && styles.editSaveBtnDisabled]}
                                onPress={() => handleEditComment(comment._id)}
                                disabled={!editingContent.trim()}
                              >
                                <Text style={styles.editSaveText}>Enregistrer</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <>
                            <View style={styles.commentBubble}>
                              <View style={styles.commentBubbleHeader}>
                                <View style={styles.commentAuteurRow}>
                                  <Text style={styles.commentAuteur}>{commentAuteur}</Text>
                                  {commentIsAdmin && (
                                    <View style={styles.adminBadgeSmall}>
                                      <Ionicons name="shield-checkmark" size={10} color="#fff" />
                                      <Text style={styles.adminBadgeSmallText}>Admin</Text>
                                    </View>
                                  )}
                                  {!commentIsAdmin && comment.auteur.statut && (
                                    <View style={[
                                      styles.statutBadgeSmall,
                                      comment.auteur.statut === 'entrepreneur' && styles.statutBadgeSmallEntrepreneur
                                    ]}>
                                      <Text style={styles.statutBadgeSmallText}>
                                        {comment.auteur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                {canEditDeleteComment && (
                                  <View style={styles.commentActionsMenu}>
                                    <Pressable
                                      style={styles.commentActionBtn}
                                      onPress={() => startEditComment(comment)}
                                    >
                                      <Ionicons name="pencil" size={14} color={couleurs.texteSecondaire} />
                                    </Pressable>
                                    <Pressable
                                      style={styles.commentActionBtn}
                                      onPress={() => handleDeleteComment(comment._id)}
                                    >
                                      <Ionicons name="trash-outline" size={14} color={couleurs.erreur} />
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.commentTexte}>{comment.contenu}</Text>
                            </View>
                            <View style={styles.commentMeta}>
                              <Text style={styles.commentTime}>{formatDate(comment.dateCreation)}</Text>
                              {comment.modifie && (
                                <Text style={styles.commentModified}>(modifie)</Text>
                              )}
                              <LikeButtonCompact
                                isLiked={comment.aLike}
                                count={comment.nbLikes}
                                onPress={() => handleLikeComment(comment._id)}
                                size={14}
                              />
                              <Pressable
                                style={styles.commentReplyBtn}
                                onPress={() => setReplyingTo({ id: comment._id, auteur: commentAuteur })}
                              >
                                <Text style={styles.commentReplyText}>Repondre</Text>
                              </Pressable>
                            </View>
                          </>
                        )}
                        {comment.reponses && comment.reponses.length > 0 && (
                          <Pressable
                            style={styles.viewRepliesBtn}
                            onPress={() => setExpandedReplies(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                          >
                            <Ionicons
                              name={expandedReplies[comment._id] ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={couleurs.primaire}
                            />
                            <Text style={styles.viewRepliesText}>
                              {expandedReplies[comment._id] ? 'Masquer' : `Voir ${comment.reponses.length} reponse${comment.reponses.length > 1 ? 's' : ''}`}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {expandedReplies[comment._id] && comment.reponses?.map((reponse) => {
                      const repAuteur = `${reponse.auteur.prenom} ${reponse.auteur.nom}`;
                      const isEditingReply = editingComment === reponse._id;
                      const replyIsAdmin = reponse.auteur.role === 'admin';
                      const canEditDeleteReply = isMyComment(reponse.auteur._id) || isAdmin();
                      return (
                        <View key={reponse._id} style={styles.replyItem}>
                          <View style={styles.replyLine} />
                          <Avatar
                            uri={reponse.auteur.avatar}
                            prenom={reponse.auteur.prenom}
                            nom={reponse.auteur.nom}
                            taille={28}
                          />
                          <View style={styles.commentContent}>
                            {isEditingReply ? (
                              <View style={styles.editCommentContainer}>
                                <TextInput
                                  style={styles.editCommentInput}
                                  value={editingContent}
                                  onChangeText={setEditingContent}
                                  multiline
                                  maxLength={1000}
                                  autoFocus
                                />
                                <View style={styles.editCommentActions}>
                                  <Pressable style={styles.editCancelBtn} onPress={cancelEdit}>
                                    <Text style={styles.editCancelText}>Annuler</Text>
                                  </Pressable>
                                  <Pressable
                                    style={[styles.editSaveBtn, !editingContent.trim() && styles.editSaveBtnDisabled]}
                                    onPress={() => handleEditComment(reponse._id)}
                                    disabled={!editingContent.trim()}
                                  >
                                    <Text style={styles.editSaveText}>Enregistrer</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <>
                                <View style={styles.replyBubble}>
                                  <View style={styles.commentBubbleHeader}>
                                    <View style={styles.commentAuteurRow}>
                                      <Text style={styles.commentAuteur}>{repAuteur}</Text>
                                      {replyIsAdmin && (
                                        <View style={styles.adminBadgeSmall}>
                                          <Ionicons name="shield-checkmark" size={10} color="#fff" />
                                          <Text style={styles.adminBadgeSmallText}>Admin</Text>
                                        </View>
                                      )}
                                      {!replyIsAdmin && reponse.auteur.statut && (
                                        <View style={[
                                          styles.statutBadgeSmall,
                                          reponse.auteur.statut === 'entrepreneur' && styles.statutBadgeSmallEntrepreneur
                                        ]}>
                                          <Text style={styles.statutBadgeSmallText}>
                                            {reponse.auteur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                    {canEditDeleteReply && (
                                      <View style={styles.commentActionsMenu}>
                                        <Pressable
                                          style={styles.commentActionBtn}
                                          onPress={() => startEditComment(reponse)}
                                        >
                                          <Ionicons name="pencil" size={12} color={couleurs.texteSecondaire} />
                                        </Pressable>
                                        <Pressable
                                          style={styles.commentActionBtn}
                                          onPress={() => handleDeleteComment(reponse._id, true, comment._id)}
                                        >
                                          <Ionicons name="trash-outline" size={12} color={couleurs.erreur} />
                                        </Pressable>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.commentTexte}>{reponse.contenu}</Text>
                                </View>
                                <View style={styles.commentMeta}>
                                  <Text style={styles.commentTime}>{formatDate(reponse.dateCreation)}</Text>
                                  {reponse.modifie && (
                                    <Text style={styles.commentModified}>(modifie)</Text>
                                  )}
                                  <LikeButtonCompact
                                    isLiked={reponse.aLike}
                                    count={reponse.nbLikes}
                                    onPress={() => handleLikeComment(reponse._id)}
                                    size={12}
                                  />
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const StartupCard = ({ startup }: { startup: Startup }) => {
    const [suivi, setSuivi] = useState(false);
    return (
      <View style={styles.startupCard}>
        <Image source={{ uri: startup.image }} style={styles.startupImage} />
        <View style={styles.startupContent}>
          <View style={styles.startupHeader}>
            <View>
              <Text style={styles.startupNom}>{startup.nom}</Text>
              <View style={styles.startupLocation}>
                <Ionicons name="location-outline" size={12} color={couleurs.texteSecondaire} />
                <Text style={styles.startupVille}>{startup.ville}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.startupDescription} numberOfLines={2}>{startup.description}</Text>
          <View style={styles.startupTags}>
            {startup.tags.map((tag, i) => (
              <View key={i} style={styles.startupTag}>
                <Text style={styles.startupTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={styles.startupStats}>
            <View style={styles.startupStat}>
              <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
              <Text style={styles.startupStatText}>{startup.abonnes} abonnes</Text>
            </View>
            <View style={styles.startupStat}>
              <Ionicons name="document-text-outline" size={14} color={couleurs.texteSecondaire} />
              <Text style={styles.startupStatText}>{startup.posts} posts</Text>
            </View>
          </View>
          <View style={styles.startupActions}>
            <Pressable
              style={[styles.startupBtnPrimary, suivi && styles.startupBtnSuivi]}
              onPress={() => setSuivi(!suivi)}
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
            <Pressable style={styles.startupBtnSecondary}>
              <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const LiveCard = ({ live }: { live: Live }) => (
    <Pressable style={styles.liveCard}>
      <Image source={{ uri: live.image }} style={styles.liveImage} />
      <View style={styles.liveOverlay}>
        {live.enDirect ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.liveUpcoming}>
            <Text style={styles.liveUpcomingText}>A venir</Text>
          </View>
        )}
        {live.enDirect && live.viewers && (
          <View style={styles.liveViewers}>
            <Ionicons name="eye" size={14} color={couleurs.blanc} />
            <Text style={styles.liveViewersText}>{live.viewers}</Text>
          </View>
        )}
      </View>
      <View style={styles.liveContent}>
        <Text style={styles.liveTitre} numberOfLines={2}>{live.titre}</Text>
        <Text style={styles.liveStartup}>{live.startup}</Text>
        <View style={styles.liveDetails}>
          <View style={styles.liveDetail}>
            <Ionicons name="calendar-outline" size={14} color={couleurs.texteSecondaire} />
            <Text style={styles.liveDetailText}>{live.datetime}</Text>
          </View>
          <View style={styles.liveDetail}>
            <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
            <Text style={styles.liveDetailText}>{live.interesse} interesses</Text>
          </View>
        </View>
        <Pressable style={[styles.liveBtn, live.enDirect && styles.liveBtnActive]}>
          <Text style={[styles.liveBtnText, live.enDirect && styles.liveBtnTextActive]}>
            {live.enDirect ? 'Rejoindre' : 'Me rappeler'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

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
        {(notificationsNonLues > 0 || demandesAmisEnAttente > 0) && (
          <View style={[styles.notifBadge, demandesAmisEnAttente > 0 && styles.notifBadgeDemandes]}>
            <Text style={styles.notifBadgeText}>
              {(() => {
                const total = notificationsNonLues + demandesAmisEnAttente;
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

  const handleOngletPress = (key: OngletActif) => {
    if (key === 'messages') {
      // Ouvrir l'ecran de messagerie full screen
      router.push('/(app)/messages');
    } else {
      setOngletActif(key);
    }
  };

  const renderNavigation = () => (
    <View style={styles.navigation}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContent}>
        {onglets.map((onglet) => (
          <Pressable
            key={onglet.key}
            style={[styles.navTab, ongletActif === onglet.key && styles.navTabActive]}
            onPress={() => handleOngletPress(onglet.key)}
          >
            <Ionicons
              name={onglet.icon}
              size={18}
              color={ongletActif === onglet.key ? couleurs.primaire : couleurs.texteSecondaire}
            />
            <Text style={[styles.navTabText, ongletActif === onglet.key && styles.navTabTextActive]}>
              {onglet.label}
            </Text>
            {onglet.key === 'messages' && unreadMessages > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {unreadMessages}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Stories mock data
  const MOCK_STORIES = [
    { id: '1', nom: 'GreenTech', avatar: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150&h=150&fit=crop', nouveau: true },
    { id: '2', nom: 'MedIA', avatar: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&h=150&fit=crop', nouveau: true },
    { id: '3', nom: 'FinFlow', avatar: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&h=150&fit=crop', nouveau: false },
    { id: '4', nom: 'BioFood', avatar: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=150&h=150&fit=crop', nouveau: false },
    { id: '5', nom: 'TechLab', avatar: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=150&h=150&fit=crop', nouveau: true },
  ];

  const renderStories = () => (
    <View style={styles.storiesSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        <Pressable style={styles.storyItemAdd}>
          <View style={styles.storyAddIcon}>
            <Ionicons name="add" size={24} color={couleurs.primaire} />
          </View>
          <Text style={styles.storyNom}>Votre story</Text>
        </Pressable>
        {MOCK_STORIES.map((story) => (
          <Pressable key={story.id} style={styles.storyItem}>
            <View style={[styles.storyRing, story.nouveau && styles.storyRingActive]}>
              <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
            </View>
            <Text style={styles.storyNom} numberOfLines={1}>{story.nom}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderTrending = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Tendances</Text>
          <Text style={styles.sectionSubtitle}>Startups populaires cette semaine</Text>
        </View>
        <Pressable style={styles.sectionAction} onPress={() => setOngletActif('decouvrir')}>
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
        <Text style={styles.sectionTitle}>Fil d'actualite</Text>
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
            <AnimatedPublicationWrapper key={publication._id} index={index}>
              <PublicationCard
                publication={publication}
                onUpdate={handleUpdatePublication}
                onDelete={handleDeletePublication}
              />
            </AnimatedPublicationWrapper>
          ))
        )}
      </View>
    </>
  );

  const renderDecouvrirContent = () => (
    <>
      <View style={styles.heroSection}>
        <LinearGradient
          colors={[couleurs.primaireDark, '#0F172A']}
          style={styles.heroCard}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={couleurs.secondaire} />
            <Text style={styles.heroBadgeText}>Nouveautes</Text>
          </View>
          <Text style={styles.heroTitle}>Decouvrez les startups de demain</Text>
          <Text style={styles.heroSubtitle}>
            Explorez les projets innovants, suivez leur actualite et echangez avec les fondateurs.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>127</Text>
              <Text style={styles.heroStatLabel}>Startups</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>2.4K</Text>
              <Text style={styles.heroStatLabel}>Membres</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>15</Text>
              <Text style={styles.heroStatLabel}>Secteurs</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Startups a decouvrir</Text>
        </View>
        {MOCK_STARTUPS.map((startup) => (
          <StartupCard key={startup.id} startup={startup} />
        ))}
      </View>
    </>
  );

  const renderLiveContent = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>En direct & A venir</Text>
          <Text style={styles.sectionSubtitle}>Rencontrez les equipes en live</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {MOCK_LIVES.map((live) => (
          <LiveCard key={live.id} live={live} />
        ))}
      </ScrollView>
      <View style={styles.liveInfo}>
        <Ionicons name="information-circle-outline" size={20} color={couleurs.texteSecondaire} />
        <Text style={styles.liveInfoText}>
          Les lives vous permettent de decouvrir les startups et de poser vos questions directement aux fondateurs.
        </Text>
      </View>
    </View>
  );

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

  const renderTabContent = () => {
    switch (ongletActif) {
      case 'feed': return renderFeedContent();
      case 'decouvrir': return renderDecouvrirContent();
      case 'live': return renderLiveContent();
      case 'messages': return renderMessagesContent();
      default: return renderFeedContent();
    }
  };

  // Actions FAB
  const FAB_ACTIONS = [
    { id: 1, icon: 'create-outline' as const, label: 'Publier', color: '#6366F1', action: () => setModalCreerPost(true) },
    { id: 2, icon: 'videocam-outline' as const, label: 'Go Live', color: '#EF4444', action: () => Alert.alert('Go Live', 'Bientot disponible !') },
    { id: 3, icon: 'camera-outline' as const, label: 'Story', color: '#10B981', action: () => Alert.alert('Story', 'Bientot disponible !') },
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

  // Gestion du scroll pour afficher/masquer le bouton scroll-to-top
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
      <LinearGradient
        colors={[couleurs.fond, couleurs.fondSecondaire, couleurs.fond]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {renderHeader()}
          {renderNavigation()}

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={rafraichissement}
                onRefresh={handleRafraichissement}
                tintColor={couleurs.primaire}
              />
            }
          >
            {renderTabContent()}

            <View style={styles.footer}>
              <Text style={styles.footerLogo}>LPP</Text>
              <Text style={styles.footerText}>La Premiere Pierre</Text>
              <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

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

      {/* Modal creer publication */}
      <Modal
        visible={modalCreerPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalCreerPost(false);
          setMediaSelectionne(null);
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
                setMediaSelectionne(null);
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

              {/* Aperçu du média sélectionné */}
              {mediaSelectionne && (
                <View style={styles.mediaPreviewContainer}>
                  <Image
                    source={{ uri: mediaSelectionne.uri }}
                    style={styles.mediaPreview}
                    resizeMode="cover"
                  />
                  {mediaSelectionne.type === 'video' && (
                    <View style={styles.mediaVideoIndicator}>
                      <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                  )}
                  <Pressable style={styles.mediaRemoveBtn} onPress={handleRemoveMedia}>
                    <Ionicons name="close-circle" size={28} color={couleurs.blanc} />
                  </Pressable>
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
                  ((!nouveauPostContenu.trim() && !mediaSelectionne) || creationEnCours) && styles.modalPublishBtnDisabled,
                ]}
                onPress={handleCreerPost}
                disabled={(!nouveauPostContenu.trim() && !mediaSelectionne) || creationEnCours}
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

      {/* Modal Lecteur Vidéo - Style Instagram/LinkedIn */}
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
                onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
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

          {/* Zone de tap pour toggle les contrôles (couvre tout l'écran) */}
          <Pressable
            style={styles.videoCenterControl}
            onPress={handleVideoTap}
          >
            {/* Bouton Play/Pause central - Apparaît au tap */}
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

      {/* Modal Visionneuse Image - Style Instagram */}
      <Modal
        visible={imageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setImageModalVisible(false);
          setImageUrl(null);
        }}
        statusBarTranslucent
      >
        <View style={styles.imageModalContainer}>
          <Pressable
            style={styles.imageModalBackdrop}
            onPress={() => {
              setImageModalVisible(false);
              setImageUrl(null);
            }}
          />
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={styles.imageModalCloseBtn}
            onPress={() => {
              setImageModalVisible(false);
              setImageUrl(null);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={couleurs.blanc} />
          </Pressable>
        </View>
      </Modal>
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

  // Navigation
  navigation: {
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  navContent: {
    paddingHorizontal: espacements.lg,
    gap: espacements.sm,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    gap: espacements.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabActive: {
    borderBottomColor: couleurs.primaire,
  },
  navTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },
  navTabTextActive: {
    color: couleurs.primaire,
    fontWeight: '600',
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

  // Post menu
  postMenu: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    marginBottom: espacements.sm,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.sm,
  },
  postMenuItemText: {
    fontSize: 14,
    color: couleurs.texte,
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
    marginBottom: espacements.sm,
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

  // Live
  horizontalScroll: {
    gap: espacements.md,
  },
  liveCard: {
    width: 260,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  liveImage: {
    width: '100%',
    height: 140,
  },
  liveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: espacements.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    backgroundColor: couleurs.erreur,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.blanc,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.blanc,
  },
  liveUpcoming: {
    backgroundColor: couleurs.fondTertiaire,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  liveUpcomingText: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  liveViewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  liveViewersText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  liveContent: {
    padding: espacements.md,
  },
  liveTitre: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  liveStartup: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  liveDetails: {
    flexDirection: 'row',
    gap: espacements.md,
    marginBottom: espacements.md,
  },
  liveDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  liveDetailText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  liveBtn: {
    alignItems: 'center',
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  liveBtnActive: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  liveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
  },
  liveBtnTextActive: {
    color: couleurs.blanc,
  },
  liveInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.sm,
    backgroundColor: couleurs.fondSecondaire,
    padding: espacements.md,
    borderRadius: rayons.md,
    marginTop: espacements.lg,
  },
  liveInfoText: {
    flex: 1,
    fontSize: 12,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
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
});
