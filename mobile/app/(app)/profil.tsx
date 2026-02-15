/**
 * Page Profil - Structure en deux onglets
 * Onglet 1: Profil public (style Instagram)
 * Onglet 2: Paramètres (modification, theme, securite, RGPD)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
  Image,
  RefreshControl,
  Animated,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { espacements, rayons, typographie } from '../../src/constantes/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import {
  modifierProfil,
  modifierMotDePasse,
  supprimerCompte,
  getAvatarsDefaut,
  modifierAvatar,
  getModerationStatus,
  ModerationStatus,
  modifierStatut,
  StatutUtilisateur,
} from '../../src/services/auth';
import { getPublicationsUtilisateur, Publication } from '../../src/services/publications';
import { getMesStories, Story } from '../../src/services/stories';
import { getMesProjets, Projet } from '../../src/services/projets';
import Avatar from '../../src/composants/Avatar';
import KeyboardView from '../../src/composants/KeyboardView';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import StoryViewer from '../../src/composants/StoryViewer';
import StoryCreator from '../../src/composants/StoryCreator';
import { getUserBadgeConfig } from '../../src/utils/userDisplay';

type Onglet = 'profil-public' | 'parametres';
type SectionParametres = 'profil' | 'apparence' | 'securite' | 'confidentialite';
type OngletActivite = 'publications' | 'projets';

export default function Profil() {
  const { couleurs, toggleTheme, isDark } = useTheme();
  const { utilisateur, updateUser, logout, refreshUser } = useUser();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Calculer la largeur de l'indicateur (moitié de la barre moins les paddings)
  const tabBarPadding = espacements.lg * 2 + 8; // padding horizontal + inner padding
  const tabIndicatorWidth = (screenWidth - tabBarPadding) / 2;

  // Onglet actif
  const [ongletActif, setOngletActif] = useState<Onglet>('profil-public');
  const [sectionParametres, setSectionParametres] = useState<SectionParametres>('profil');

  // États généraux
  const [chargement, setChargement] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  // Champs profil
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Champs mot de passe
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

  // Suppression compte
  const [motDePasseSuppression, setMotDePasseSuppression] = useState('');
  const [confirmationSuppression, setConfirmationSuppression] = useState('');

  // Confidentialite
  const [profilPublic, setProfilPublic] = useState(true);

  // Avatar
  const [modalAvatar, setModalAvatar] = useState(false);
  const [avatarsDefaut, setAvatarsDefaut] = useState<string[]>([]);
  const [chargementAvatar, setChargementAvatar] = useState(false);

  // Modal Bio
  const [modalBio, setModalBio] = useState(false);
  const [bioTemp, setBioTemp] = useState('');

  // Animation de l'indicateur d'onglet
  const [indicatorPosition] = useState(new Animated.Value(0));

  // Publications de l'utilisateur
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargementPublications, setChargementPublications] = useState(false);

  // Onglet actif dans la section activité
  const [ongletActivite, setOngletActivite] = useState<OngletActivite>('publications');

  // Projets suivis
  const [projetsSuivis, setProjetsSuivis] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);

  // Stories
  const [mesStories, setMesStories] = useState<Story[]>([]);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);

  // Statut de moderation (pour afficher les avertissements)
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);

  // Switch statut entrepreneur/visiteur
  const [showModalStatut, setShowModalStatut] = useState(false);
  const [raisonCloture, setRaisonCloture] = useState('');
  const [statutLoading, setStatutLoading] = useState(false);
  const [statutMessage, setStatutMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

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
  const gridItemWidth = (screenWidth - (GRID_GAP * 2)) / 3;

  useEffect(() => {
    if (utilisateur) {
      setPrenom(utilisateur.prenom);
      setNom(utilisateur.nom);
      setEmail(utilisateur.email);
      setBio(utilisateur.bio || '');
      setProfilPublic(utilisateur.profilPublic ?? true);
    }
  }, [utilisateur]);

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
  const isVideo = (mediaUrl?: string): boolean => {
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

  // Charger mes projets suivis
  useEffect(() => {
    const chargerProjetsSuivis = async () => {
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
    };
    chargerProjetsSuivis();
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
    setBioTemp(utilisateur?.bio || '');
    setModalBio(true);
  };

  const handleSauvegarderBio = async () => {
    setChargement(true);
    const reponse = await modifierProfil({
      bio: bioTemp
    });
    setChargement(false);

    if (reponse.succes && reponse.data) {
      updateUser(reponse.data.utilisateur);
      setBio(bioTemp);
      setModalBio(false);
      afficherMessage('succes', 'Bio mise a jour !');
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

  const handleModifierProfil = async () => {
    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      afficherMessage('erreur', 'Tous les champs sont obligatoires');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      afficherMessage('erreur', 'Adresse email invalide');
      return;
    }

    setChargement(true);
    const reponse = await modifierProfil({ prenom, nom, bio });
    setChargement(false);

    if (reponse.succes && reponse.data) {
      afficherMessage('succes', 'Profil mis a jour avec succes');
      updateUser(reponse.data.utilisateur);
    } else {
      afficherMessage('erreur', reponse.message || 'Erreur lors de la mise a jour');
    }
  };

  const handleModifierMotDePasse = async () => {
    if (!motDePasseActuel || !nouveauMotDePasse || !confirmationMotDePasse) {
      afficherMessage('erreur', 'Tous les champs sont obligatoires');
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      afficherMessage('erreur', 'Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      afficherMessage('erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setChargement(true);
    const reponse = await modifierMotDePasse(motDePasseActuel, nouveauMotDePasse);
    setChargement(false);

    if (reponse.succes) {
      afficherMessage('succes', 'Mot de passe modifie avec succes');
      setMotDePasseActuel('');
      setNouveauMotDePasse('');
      setConfirmationMotDePasse('');
    } else {
      afficherMessage('erreur', reponse.message || 'Erreur lors de la modification');
    }
  };

  const handleSupprimerCompte = () => {
    if (confirmationSuppression !== 'SUPPRIMER') {
      afficherMessage('erreur', 'Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    if (!motDePasseSuppression) {
      afficherMessage('erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    Alert.alert(
      'Suppression definitive',
      'Cette action est IRREVERSIBLE. Toutes vos donnees seront supprimees conformement au RGPD. Etes-vous certain de vouloir continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer definitivement',
          style: 'destructive',
          onPress: async () => {
            setChargement(true);
            const reponse = await supprimerCompte(motDePasseSuppression);
            setChargement(false);

            if (reponse.succes) {
              await logout();
              router.replace('/(auth)/connexion');
            } else {
              afficherMessage('erreur', reponse.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    setRafraichissement(true);
    try {
      // Rafraîchir les données utilisateur (dont nbAmis)
      await refreshUser();

      // Charger publications et stories en parallèle
      const [pubResponse, storiesResponse] = await Promise.all([
        utilisateur?.id ? getPublicationsUtilisateur(utilisateur.id) : Promise.resolve(null),
        getMesStories(),
      ]);

      if (pubResponse?.succes && pubResponse.data) {
        // Filtrage frontend de sécurité
        const publicationsFiltrees = pubResponse.data.publications.filter(
          (pub) => pub.auteur._id === utilisateur?.id
        );
        setPublications(publicationsFiltrees);
      }

      if (storiesResponse.succes && storiesResponse.data) {
        setMesStories(storiesResponse.data.stories);
      }
    } catch (error) {
      console.error('Erreur refresh:', error);
    } finally {
      setRafraichissement(false);
    }
  }, [utilisateur?.id]);

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  // Configuration du badge utilisateur (rôle staff ou statut)
  const statutConfig = getUserBadgeConfig(utilisateur?.role, utilisateur?.statut);

  const formatDateInscription = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Styles dynamiques
  const styles = createStyles(couleurs, isDark);

  // =====================
  // ONGLET PROFIL PUBLIC
  // =====================
  const renderProfilPublic = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={handleRefresh}
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
                setStoryViewerVisible(true);
              } else {
                handleOuvrirModalAvatar();
              }
            }}
            onLongPress={handleOuvrirModalAvatar}
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
                    onPress={handleOuvrirModalAvatar}
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
                    onPress={handleOuvrirModalAvatar}
                  />
                </View>
              </View>
            )}
            {/* Badge camera pour modifier avatar */}
            <Pressable
              style={styles.avatarEditBadge}
              onPress={handleOuvrirModalAvatar}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Ionicons name="camera" size={14} color={couleurs.blanc} />
            </Pressable>
          </Pressable>
          {/* Bouton + pour ajouter une story */}
          <Pressable
            style={styles.storyAddBadge}
            onPress={() => setStoryCreatorVisible(true)}
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
        {/* Nom complet et statut */}
        <View style={styles.nameStatusRow}>
          <Text style={styles.nomComplet}>{utilisateur?.prenom} {utilisateur?.nom}</Text>
          <View style={[styles.statutBadge, { backgroundColor: `${statutConfig.color}15` }]}>
            <Ionicons name={statutConfig.icon} size={12} color={statutConfig.color} />
            <Text style={[styles.statutText, { color: statutConfig.color }]}>
              {statutConfig.label}
            </Text>
          </View>
        </View>

        {/* Section Description */}
        <View style={styles.descriptionSection}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Pressable
              onPress={handleOuvrirModalBio}
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
            setOngletActif('parametres');
            setSectionParametres('profil');
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
          onPress={() => setOngletActif('parametres')}
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
              const firstMedia = pub.medias?.[0] || (pub.media ? { type: isVideo(pub.media) ? 'video' : 'image', url: pub.media } : null);
              const mediaIsVideo = firstMedia?.type === 'video';
              const thumbnailUri = firstMedia
                ? (mediaIsVideo ? (firstMedia.thumbnailUrl || getVideoThumbnail(firstMedia.url)) : firstMedia.url)
                : null;
              const hasMultipleMedias = (pub.medias?.length || 0) > 1;

              const handlePress = () => {
                // Naviguer vers la page de detail de la publication
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
    </ScrollView>
  );

  // =====================
  // ONGLET PARAMETRES
  // =====================
  const renderMenuItem = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    section: SectionParametres,
    description: string
  ) => (
    <Pressable
      style={[styles.menuItem, sectionParametres === section && styles.menuItemActive]}
      onPress={() => setSectionParametres(section)}
    >
      <View style={[styles.menuIcon, sectionParametres === section && styles.menuIconActive]}>
        <Ionicons
          name={icon}
          size={20}
          color={sectionParametres === section ? couleurs.blanc : couleurs.texteSecondaire}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, sectionParametres === section && styles.menuLabelActive]}>
          {label}
        </Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={sectionParametres === section ? couleurs.primaire : couleurs.texteSecondaire}
      />
    </Pressable>
  );

  const handleChangerStatut = async (nouveauStatut: StatutUtilisateur) => {
    // Si entrepreneur → visiteur, ouvrir la modale de confirmation
    if (utilisateur?.statut === 'entrepreneur' && nouveauStatut === 'visiteur') {
      setShowModalStatut(true);
      return;
    }

    // Changement direct (visiteur → entrepreneur ou même statut)
    setStatutLoading(true);
    setStatutMessage(null);
    try {
      const reponse = await modifierStatut(nouveauStatut);
      if (reponse.succes && reponse.data) {
        updateUser(reponse.data.utilisateur);
        setStatutMessage({ type: 'succes', texte: 'Statut mis a jour !' });
      } else {
        setStatutMessage({ type: 'erreur', texte: reponse.message || 'Erreur lors du changement.' });
      }
    } catch {
      setStatutMessage({ type: 'erreur', texte: 'Impossible de contacter le serveur.' });
    } finally {
      setStatutLoading(false);
    }
  };

  const handleConfirmerSwitchVisiteur = async () => {
    if (raisonCloture.trim().length < 10) {
      setStatutMessage({ type: 'erreur', texte: 'La raison doit contenir au moins 10 caracteres.' });
      return;
    }

    setStatutLoading(true);
    setStatutMessage(null);
    try {
      const reponse = await modifierStatut('visiteur', raisonCloture.trim());
      if (reponse.succes && reponse.data) {
        updateUser(reponse.data.utilisateur);
        setShowModalStatut(false);
        setRaisonCloture('');
        setStatutMessage({ type: 'succes', texte: reponse.message || 'Statut mis a jour !' });
      } else {
        setStatutMessage({ type: 'erreur', texte: reponse.message || 'Erreur lors du changement.' });
      }
    } catch {
      setStatutMessage({ type: 'erreur', texte: 'Impossible de contacter le serveur.' });
    } finally {
      setStatutLoading(false);
    }
  };

  const renderProfilSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Informations personnelles</Text>
      <Text style={styles.parametresDescription}>
        Modifiez vos informations de profil. Ces donnees sont utilisees pour personnaliser votre experience.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prenom</Text>
        <TextInput
          style={styles.input}
          value={prenom}
          onChangeText={setPrenom}
          placeholder="Votre prenom"
          placeholderTextColor={couleurs.texteSecondaire}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholder="Votre nom"
          placeholderTextColor={couleurs.texteSecondaire}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Adresse email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          placeholderTextColor={couleurs.texteSecondaire}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Statut entrepreneur / visiteur */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Statut</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Pressable
            style={[
              styles.statutCard,
              { borderColor: utilisateur?.statut === 'visiteur' ? '#10B981' : couleurs.bordure },
              utilisateur?.statut === 'visiteur' && { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
            ]}
            onPress={() => handleChangerStatut('visiteur')}
            disabled={statutLoading}
          >
            <Ionicons name="compass-outline" size={22} color={utilisateur?.statut === 'visiteur' ? '#10B981' : couleurs.texteSecondaire} />
            <Text style={[styles.statutCardText, utilisateur?.statut === 'visiteur' && { color: '#10B981' }]}>
              Visiteur
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.statutCard,
              { borderColor: utilisateur?.statut === 'entrepreneur' ? '#F59E0B' : couleurs.bordure },
              utilisateur?.statut === 'entrepreneur' && { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
            ]}
            onPress={() => handleChangerStatut('entrepreneur')}
            disabled={statutLoading}
          >
            <Ionicons name="rocket-outline" size={22} color={utilisateur?.statut === 'entrepreneur' ? '#F59E0B' : couleurs.texteSecondaire} />
            <Text style={[styles.statutCardText, utilisateur?.statut === 'entrepreneur' && { color: '#F59E0B' }]}>
              Entrepreneur
            </Text>
          </Pressable>
        </View>
        {statutLoading && <ActivityIndicator style={{ marginTop: 8 }} color={couleurs.primaire} />}
        {statutMessage && (
          <Text style={{
            marginTop: 8,
            fontSize: 13,
            color: statutMessage.type === 'succes' ? '#10B981' : couleurs.danger,
          }}>
            {statutMessage.texte}
          </Text>
        )}
      </View>

      <Pressable
        style={[styles.btnPrimary, chargement && styles.btnDisabled]}
        onPress={handleModifierProfil}
        disabled={chargement}
      >
        {chargement ? (
          <ActivityIndicator color={couleurs.blanc} />
        ) : (
          <Text style={styles.btnPrimaryText}>Enregistrer les modifications</Text>
        )}
      </Pressable>

      {/* Modale confirmation switch entrepreneur → visiteur */}
      <Modal
        visible={showModalStatut}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: couleurs.fondCard, maxWidth: 420 }]}>
            <Text style={[styles.parametresTitle, { marginBottom: 8 }]}>Changer de statut</Text>

            <View style={{
              backgroundColor: 'rgba(255, 77, 109, 0.1)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255, 77, 109, 0.2)',
            }}>
              <Text style={{ color: couleurs.danger, fontSize: 13, lineHeight: 20 }}>
                Passer en mode Visiteur supprimera tous tes projets et avertira tes abonnes.
              </Text>
            </View>

            <Text style={[styles.inputLabel, { marginBottom: 8 }]}>
              Raison de la cloture (min. 10 caracteres)
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              value={raisonCloture}
              onChangeText={setRaisonCloture}
              placeholder="Explique pourquoi tu clotures tes projets..."
              placeholderTextColor={couleurs.texteSecondaire}
              multiline
              maxLength={500}
            />
            <Text style={{ fontSize: 11, color: couleurs.texteSecondaire, marginTop: 4, marginBottom: 4 }}>
              {raisonCloture.length}/500
            </Text>

            <View style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.2)',
            }}>
              <Text style={{ color: '#F59E0B', fontSize: 12, lineHeight: 18 }}>
                Ce message sera visible par tous les abonnes de tes projets.
              </Text>
            </View>

            {statutMessage?.type === 'erreur' && (
              <Text style={{ color: couleurs.danger, fontSize: 13, marginBottom: 12 }}>
                {statutMessage.texte}
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); }}
              >
                <Text style={styles.btnSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.btnDanger, { flex: 1 }, statutLoading && { opacity: 0.6 }]}
                onPress={handleConfirmerSwitchVisiteur}
                disabled={statutLoading}
              >
                {statutLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnDangerText}>Confirmer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderApparenceSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Apparence</Text>
      <Text style={styles.parametresDescription}>
        Personnalisez l'apparence de l'application selon vos preferences.
      </Text>

      <View style={styles.themeCard}>
        <View style={styles.themeHeader}>
          <Ionicons name="color-palette-outline" size={24} color={couleurs.primaire} />
          <Text style={styles.themeTitle}>Theme de l'application</Text>
        </View>

        <View style={styles.themeOptions}>
          <Pressable
            style={[styles.themeOption, isDark && styles.themeOptionActive]}
            onPress={() => !isDark && toggleTheme()}
          >
            <View style={[styles.themePreview, styles.themePreviewDark]}>
              <View style={styles.themePreviewHeader} />
              <View style={styles.themePreviewContent}>
                <View style={[styles.themePreviewCard, { backgroundColor: '#1A1A24' }]} />
                <View style={[styles.themePreviewCard, { backgroundColor: '#1A1A24' }]} />
              </View>
            </View>
            <View style={styles.themeOptionInfo}>
              <View style={styles.themeOptionRow}>
                <Ionicons name="moon" size={18} color={isDark ? couleurs.primaire : couleurs.texteSecondaire} />
                <Text style={[styles.themeOptionLabel, isDark && styles.themeOptionLabelActive]}>
                  Sombre
                </Text>
              </View>
              {isDark && (
                <View style={styles.themeActiveBadge}>
                  <Ionicons name="checkmark" size={12} color={couleurs.blanc} />
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            style={[styles.themeOption, !isDark && styles.themeOptionActive]}
            onPress={() => isDark && toggleTheme()}
          >
            <View style={[styles.themePreview, styles.themePreviewLight]}>
              <View style={[styles.themePreviewHeader, { backgroundColor: '#F8FAFC' }]} />
              <View style={styles.themePreviewContent}>
                <View style={[styles.themePreviewCard, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.themePreviewCard, { backgroundColor: '#FFFFFF' }]} />
              </View>
            </View>
            <View style={styles.themeOptionInfo}>
              <View style={styles.themeOptionRow}>
                <Ionicons name="sunny" size={18} color={!isDark ? couleurs.primaire : couleurs.texteSecondaire} />
                <Text style={[styles.themeOptionLabel, !isDark && styles.themeOptionLabelActive]}>
                  Clair
                </Text>
              </View>
              {!isDark && (
                <View style={styles.themeActiveBadge}>
                  <Ionicons name="checkmark" size={12} color={couleurs.blanc} />
                </View>
              )}
            </View>
          </Pressable>
        </View>

        <View style={styles.quickToggle}>
          <View style={styles.quickToggleInfo}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={couleurs.texte} />
            <Text style={styles.quickToggleText}>
              Mode {isDark ? 'sombre' : 'clair'} active
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: couleurs.fondTertiaire, true: couleurs.primaire }}
            thumbColor={couleurs.blanc}
          />
        </View>
      </View>
    </View>
  );

  const renderSecuriteSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Modifier le mot de passe</Text>
      <Text style={styles.parametresDescription}>
        Choisissez un mot de passe fort avec au moins 8 caracteres.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mot de passe actuel</Text>
        <View style={styles.inputPassword}>
          <TextInput
            style={styles.inputPasswordField}
            value={motDePasseActuel}
            onChangeText={setMotDePasseActuel}
            placeholder="Votre mot de passe actuel"
            placeholderTextColor={couleurs.texteSecondaire}
            secureTextEntry={!afficherMotDePasse}
          />
          <Pressable onPress={() => setAfficherMotDePasse(!afficherMotDePasse)}>
            <Ionicons
              name={afficherMotDePasse ? 'eye-off' : 'eye'}
              size={20}
              color={couleurs.texteSecondaire}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={nouveauMotDePasse}
          onChangeText={setNouveauMotDePasse}
          placeholder="Nouveau mot de passe"
          placeholderTextColor={couleurs.texteSecondaire}
          secureTextEntry={!afficherMotDePasse}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirmationMotDePasse}
          onChangeText={setConfirmationMotDePasse}
          placeholder="Confirmer le nouveau mot de passe"
          placeholderTextColor={couleurs.texteSecondaire}
          secureTextEntry={!afficherMotDePasse}
        />
      </View>

      <Pressable
        style={[styles.btnPrimary, chargement && styles.btnDisabled]}
        onPress={handleModifierMotDePasse}
        disabled={chargement}
      >
        {chargement ? (
          <ActivityIndicator color={couleurs.blanc} />
        ) : (
          <Text style={styles.btnPrimaryText}>Modifier le mot de passe</Text>
        )}
      </Pressable>
    </View>
  );

  const handleToggleProfilPublic = async (value: boolean) => {
    setProfilPublic(value);
    try {
      const reponse = await modifierProfil({ profilPublic: value });
      if (reponse.succes && reponse.data) {
        updateUser(reponse.data.utilisateur);
        setMessage({ type: 'succes', texte: value ? 'Profil rendu public' : 'Profil rendu prive' });
      } else {
        setProfilPublic(!value);
        setMessage({ type: 'erreur', texte: reponse.message || 'Erreur lors de la modification' });
      }
    } catch {
      setProfilPublic(!value);
      setMessage({ type: 'erreur', texte: 'Erreur reseau' });
    }
  };

  const renderConfidentialiteSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Confidentialite et RGPD</Text>

      <View style={styles.rgpdCard}>
        <View style={styles.rgpdHeader}>
          <Ionicons name={profilPublic ? 'globe-outline' : 'lock-closed-outline'} size={24} color={couleurs.primaire} />
          <Text style={styles.rgpdTitle}>Visibilite du profil</Text>
        </View>
        <Text style={[styles.parametresDescription, { marginBottom: espacements.md }]}>
          {profilPublic
            ? 'Votre profil est public. Tout le monde peut voir vos publications, amis et projets suivis.'
            : 'Votre profil est prive. Seuls vos amis peuvent voir vos publications, amis et projets suivis.'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.inputLabel, { flex: 1 }]}>Profil public</Text>
          <Switch
            value={profilPublic}
            onValueChange={handleToggleProfilPublic}
            trackColor={{ false: couleurs.bordure, true: couleurs.primaire + '80' }}
            thumbColor={profilPublic ? couleurs.primaire : couleurs.texteSecondaire}
          />
        </View>
      </View>

      <Text style={styles.parametresDescription}>
        Conformement au RGPD, vous avez le droit d'acceder a vos donnees, de les modifier ou de les supprimer.
      </Text>

      <View style={styles.rgpdCard}>
        <View style={styles.rgpdHeader}>
          <Ionicons name="document-text-outline" size={24} color={couleurs.primaire} />
          <Text style={styles.rgpdTitle}>Vos droits</Text>
        </View>
        <View style={styles.rgpdItem}>
          <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
          <Text style={styles.rgpdText}>Droit d'acces a vos donnees</Text>
        </View>
        <View style={styles.rgpdItem}>
          <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
          <Text style={styles.rgpdText}>Droit de rectification</Text>
        </View>
        <View style={styles.rgpdItem}>
          <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
          <Text style={styles.rgpdText}>Droit a l'effacement (droit a l'oubli)</Text>
        </View>
        <View style={styles.rgpdItem}>
          <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
          <Text style={styles.rgpdText}>Droit a la portabilite</Text>
        </View>
      </View>

      <View style={styles.dangerZone}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning" size={24} color={couleurs.erreur} />
          <Text style={styles.dangerTitle}>Zone de danger</Text>
        </View>
        <Text style={styles.dangerDescription}>
          La suppression de votre compte est definitive. Toutes vos donnees personnelles seront effacees.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mot de passe pour confirmer</Text>
          <TextInput
            style={styles.input}
            value={motDePasseSuppression}
            onChangeText={setMotDePasseSuppression}
            placeholder="Votre mot de passe"
            placeholderTextColor={couleurs.texteSecondaire}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tapez SUPPRIMER pour confirmer</Text>
          <TextInput
            style={styles.input}
            value={confirmationSuppression}
            onChangeText={setConfirmationSuppression}
            placeholder="SUPPRIMER"
            placeholderTextColor={couleurs.texteSecondaire}
            autoCapitalize="characters"
          />
        </View>

        <Pressable
          style={[styles.btnDanger, chargement && styles.btnDisabled]}
          onPress={handleSupprimerCompte}
          disabled={chargement}
        >
          {chargement ? (
            <ActivityIndicator color={couleurs.blanc} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={couleurs.blanc} />
              <Text style={styles.btnDangerText}>Supprimer mon compte</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderParametresSectionContent = () => {
    switch (sectionParametres) {
      case 'profil':
        return renderProfilSection();
      case 'apparence':
        return renderApparenceSection();
      case 'securite':
        return renderSecuriteSection();
      case 'confidentialite':
        return renderConfidentialiteSection();
      default:
        return renderProfilSection();
    }
  };

  const renderParametres = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      {/* Carte d'avertissements si l'utilisateur a des warnings */}
      {moderationStatus && moderationStatus.warnCountSinceLastAutoSuspension > 0 && (
        <View style={[styles.warningCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF8E1', borderColor: couleurs.attention }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color={couleurs.attention} />
            <Text style={[styles.warningTitle, { color: couleurs.attention }]}>
              Avertissements actifs
            </Text>
          </View>
          <View style={styles.warningContent}>
            <Text style={[styles.warningCount, { color: couleurs.texte }]}>
              {moderationStatus.warnCountSinceLastAutoSuspension} / 3
            </Text>
            <Text style={[styles.warningText, { color: couleurs.texteSecondaire }]}>
              {moderationStatus.warningsBeforeNextSanction === 0
                ? `Prochain avertissement = ${moderationStatus.nextAutoAction === 'ban' ? 'bannissement definitif' : 'suspension de 7 jours'}`
                : `${moderationStatus.warningsBeforeNextSanction} avertissement${moderationStatus.warningsBeforeNextSanction > 1 ? 's' : ''} avant ${moderationStatus.nextAutoAction === 'ban' ? 'bannissement' : 'suspension'}`}
            </Text>
          </View>
        </View>
      )}

      {/* Menu des sections */}
      <View style={styles.menu}>
        {renderMenuItem('person-outline', 'Profil', 'profil', 'Modifiez vos informations')}
        {renderMenuItem('color-palette-outline', 'Apparence', 'apparence', 'Theme et personnalisation')}
        {renderMenuItem('lock-closed-outline', 'Securite', 'securite', 'Mot de passe et connexion')}
        {renderMenuItem('shield-checkmark-outline', 'Confidentialite', 'confidentialite', 'RGPD et suppression')}

        {/* Item navigation vers ecran sanctions */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/sanctions')}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={couleurs.texteSecondaire}
            />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Mes sanctions</Text>
            <Text style={styles.menuDescription}>Historique des sanctions</Text>
          </View>
          {/* Badge compteur avertissements */}
          {moderationStatus && moderationStatus.warnCountSinceLastAutoSuspension > 0 && (
            <View style={[styles.warningBadge, { backgroundColor: couleurs.attention }]}>
              <Text style={styles.warningBadgeText}>
                {moderationStatus.warnCountSinceLastAutoSuspension}/3
              </Text>
            </View>
          )}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={couleurs.texteSecondaire}
          />
        </Pressable>

        {/* Item navigation vers ecran support */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/support')}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={couleurs.texteSecondaire}
            />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Support</Text>
            <Text style={styles.menuDescription}>Contacter le support</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={couleurs.texteSecondaire}
          />
        </Pressable>
      </View>

      {/* Section active */}
      <View style={styles.sectionCard}>
        {renderParametresSectionContent()}
      </View>
    </ScrollView>
  );

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
        {ongletActif === 'profil-public' ? renderProfilPublic() : renderParametres()}

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
        <Modal
          visible={modalBio}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalBio(false)}
        >
          <KeyboardView style={styles.modalOverlay}>
            <Pressable
              style={styles.modalOverlayTouchable}
              onPress={() => setModalBio(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier la bio</Text>
                <Pressable onPress={() => setModalBio(false)}>
                  <Ionicons name="close" size={24} color={couleurs.texte} />
                </Pressable>
              </View>

              <Text style={styles.bioModalDescription}>
                Decrivez-vous en quelques mots pour que les autres membres puissent mieux vous connaitre.
              </Text>

              <TextInput
                style={styles.bioInput}
                value={bioTemp}
                onChangeText={setBioTemp}
                placeholder="Votre bio..."
                placeholderTextColor={couleurs.texteSecondaire}
                multiline
                numberOfLines={4}
                maxLength={150}
              />

              <Text style={styles.bioCharCount}>
                {bioTemp.length}/150 caracteres
              </Text>

              <Pressable
                style={[styles.btnPrimary, chargement && styles.btnDisabled]}
                onPress={handleSauvegarderBio}
                disabled={chargement}
              >
                {chargement ? (
                  <ActivityIndicator color={couleurs.blanc} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </KeyboardView>
        </Modal>

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
                  const progress = locationX / (screenWidth - 32);
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

// Fonction pour creer les styles dynamiques
const createStyles = (couleurs: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
    paddingBottom: espacements.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: espacements.sm + 2,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  tabTextActive: {
    color: couleurs.primaire,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Message
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: espacements.lg,
    marginTop: espacements.sm,
    padding: espacements.md,
    borderRadius: rayons.md,
    gap: espacements.sm,
  },
  messageSucces: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  messageErreur: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
  },
  messageTextSucces: {
    color: couleurs.succes,
  },
  messageTextErreur: {
    color: couleurs.erreur,
  },

  // =====================
  // PROFIL PUBLIC STYLES
  // =====================
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
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  avatarNoStory: {
    borderWidth: 3,
    borderColor: couleurs.bordure,
    backgroundColor: 'transparent',
  },
  storyAddBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: couleurs.secondaire,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
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
    fontWeight: '700',
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  nomComplet: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: espacements.sm,
    paddingVertical: 3,
    borderRadius: rayons.sm,
  },
  statutText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Section Description
  descriptionSection: {
    marginBottom: espacements.lg,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modifierDescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: rayons.sm,
    backgroundColor: `${couleurs.primaire}15`,
  },
  modifierDescriptionBtnPressed: {
    opacity: 0.7,
  },
  modifierDescriptionText: {
    fontSize: 12,
    color: couleurs.primaire,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 22,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    color: couleurs.texteMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  secondaryInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  infoItemText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  // Modal Bio
  bioModalDescription: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    lineHeight: 20,
    marginBottom: espacements.lg,
  },
  bioInput: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 15,
    color: couleurs.texte,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bioCharCount: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    marginTop: espacements.xs,
    marginBottom: espacements.sm,
  },
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
  actionBtnOutline: {
    backgroundColor: couleurs.fondSecondaire,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnTextDark: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },

  // =====================
  // SECTION MES STORIES
  // =====================
  storiesSection: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    marginTop: espacements.sm,
  },
  storiesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.md,
  },
  storiesSectionTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  storiesCount: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  storiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.lg,
  },
  noStoriesHint: {
    flex: 1,
  },
  noStoriesText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  addStoryBtn: {
    borderRadius: rayons.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  addStoryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs + 2,
    gap: espacements.xs,
  },
  addStoryBtnText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
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
  activityTab: {
    flex: 1,
    paddingVertical: espacements.md,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    marginTop: -1,
  },
  activityTabActive: {
    borderTopColor: couleurs.primaire,
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
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  emptyText: {
    fontSize: 14,
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
    backgroundColor: couleurs.fondSecondaire,
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
    backgroundColor: couleurs.fondTertiaire,
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
  multiMediaBadge: {
    position: 'absolute',
    top: espacements.xs,
    right: espacements.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: rayons.xs,
    padding: 4,
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
    fontWeight: '600',
    color: couleurs.blanc,
  },
  // Styles pour les projets suivis
  projetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: espacements.xs,
  },
  projetName: {
    fontSize: 11,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
    marginBottom: 2,
  },
  projetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projetFollowers: {
    fontSize: 10,
    color: couleurs.blanc,
  },
  publicationTextOnly: {
    flex: 1,
    padding: espacements.sm,
    paddingLeft: espacements.md,
    backgroundColor: couleurs.fondCard,
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: couleurs.primaire,
  },
  textQuoteIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    opacity: 0.25,
  },
  textContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: espacements.sm,
  },
  publicationTextContent: {
    fontSize: 13,
    color: couleurs.texte,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  publicationTextStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: espacements.sm,
  },
  textStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${couleurs.primaire}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  publicationTextStatValue: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.primaire,
  },

  // =====================
  // MODALS MÉDIA
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mediaModalImage: {
    width: '100%',
    height: '80%',
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
    width: Dimensions.get('window').width,
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

  // =====================
  // PARAMETRES STYLES
  // =====================
  menu: {
    marginHorizontal: espacements.lg,
    marginVertical: espacements.md,
    gap: espacements.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: espacements.md,
  },
  menuItemActive: {
    borderColor: couleurs.primaire,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.08)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondTertiaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconActive: {
    backgroundColor: couleurs.primaire,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  menuLabelActive: {
    color: couleurs.primaire,
  },
  menuDescription: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Styles pour carte et badge d'avertissements
  warningCard: {
    marginHorizontal: espacements.lg,
    marginBottom: espacements.md,
    padding: espacements.md,
    borderRadius: rayons.lg,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    marginLeft: espacements.md,
    textAlign: 'right',
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rayons.full,
    marginRight: espacements.sm,
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  sectionCard: {
    marginHorizontal: espacements.lg,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  parametresContent: {
    padding: espacements.lg,
  },
  parametresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  parametresDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginBottom: espacements.lg,
  },

  // Theme styles
  themeCard: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.md,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.lg,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: espacements.md,
    marginBottom: espacements.lg,
  },
  themeOption: {
    flex: 1,
    borderRadius: rayons.lg,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  themeOptionActive: {
    borderColor: couleurs.primaire,
  },
  themePreview: {
    height: 80,
    padding: espacements.sm,
  },
  themePreviewDark: {
    backgroundColor: '#0F0F14',
  },
  themePreviewLight: {
    backgroundColor: '#F1F5F9',
  },
  themePreviewHeader: {
    height: 12,
    backgroundColor: '#252532',
    borderRadius: 4,
    marginBottom: espacements.xs,
  },
  themePreviewContent: {
    flex: 1,
    gap: espacements.xs,
  },
  themePreviewCard: {
    flex: 1,
    borderRadius: 4,
  },
  themeOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espacements.md,
    backgroundColor: couleurs.fondSecondaire,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  themeOptionLabelActive: {
    color: couleurs.primaire,
  },
  themeActiveBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.fondSecondaire,
    padding: espacements.md,
    borderRadius: rayons.md,
  },
  quickToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  quickToggleText: {
    fontSize: 14,
    color: couleurs.texte,
  },

  // Inputs
  inputGroup: {
    marginBottom: espacements.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  input: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 15,
    color: couleurs.texte,
  },
  inputBio: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
  },
  inputPasswordField: {
    flex: 1,
    paddingVertical: espacements.md,
    fontSize: 15,
    color: couleurs.texte,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.md,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  btnDanger: {
    backgroundColor: couleurs.erreur,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    marginTop: espacements.md,
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // RGPD Card
  rgpdCard: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    padding: espacements.lg,
    marginBottom: espacements.lg,
  },
  rgpdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  rgpdTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  rgpdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  rgpdText: {
    fontSize: 13,
    color: couleurs.texte,
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: rayons.md,
    padding: espacements.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.erreur,
  },
  dangerDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginBottom: espacements.lg,
  },

  // Modal Avatar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: couleurs.fondSecondaire,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espacements.lg,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    gap: espacements.md,
  },
  modalLoadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espacements.md,
    paddingVertical: espacements.md,
  },
  avatarOption: {
    alignItems: 'center',
    gap: espacements.xs,
    padding: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: couleurs.primaire,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  avatarOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarOptionInitiales: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionInitialesText: {
    fontSize: 20,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  avatarOptionLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.fond,
    borderWidth: 2,
    borderColor: couleurs.primaire,
    borderStyle: 'dashed',
    borderRadius: rayons.lg,
    paddingVertical: espacements.lg,
    marginBottom: espacements.lg,
    gap: espacements.sm,
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  avatarSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginBottom: espacements.md,
    textAlign: 'center',
  },

  // Statut switcher
  statutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: rayons.md,
    borderWidth: 1.5,
    backgroundColor: couleurs.fond,
  },
  statutCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },

  // Boutons secondaires (modale)
  btnSecondary: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
});
