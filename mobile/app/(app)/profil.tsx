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
import { useGamification } from '../../src/contexts/GamificationContext';
import StoryViewer from '../../src/composants/StoryViewer';
import StoryCreator from '../../src/composants/StoryCreator';
import EditBioModal from '../../src/composants/EditBioModal';
import createStyles from '../../src/features/profil/profil.styles';
import { isUserVerified } from '../../src/utils/userDisplay';
import AppBadge from '../../src/composants/AppBadge';

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
  const [emailSuppression, setEmailSuppression] = useState('');
  const [confirmationSuppression, setConfirmationSuppression] = useState('');
  const estCompteOAuth = utilisateur?.provider !== 'local';

  // Confidentialite
  const [profilPublic, setProfilPublic] = useState(true);

  // Avatar
  const [modalAvatar, setModalAvatar] = useState(false);
  const [avatarsDefaut, setAvatarsDefaut] = useState<string[]>([]);
  const [chargementAvatar, setChargementAvatar] = useState(false);

  // Modal Bio
  const [modalBio, setModalBio] = useState(false);

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

  // Gamification (nouveau systeme)
  const { state: gamification, applyDelta } = useGamification();

  // Switch statut entrepreneur/visiteur
  const [statutSelectionne, setStatutSelectionne] = useState<StatutUtilisateur>(utilisateur?.statut || 'visiteur');
  const [showModalStatut, setShowModalStatut] = useState(false);
  const [raisonCloture, setRaisonCloture] = useState('');
  const [statutLoading, setStatutLoading] = useState(false);
  const [statutMessage, setStatutMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  // Modal visionneuse média
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
      setBio(nouvelleBio);
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

    // Changement de statut si different
    if (statutSelectionne !== utilisateur?.statut) {
      try {
        const reponseStatut = await modifierStatut(statutSelectionne);
        if (reponseStatut.succes && reponseStatut.data) {
          updateUser(reponseStatut.data.utilisateur);
          chargerProjetsSuivis();
        } else {
          // Si erreur RAISON_REQUISE → ouvrir la modale
          if (reponseStatut.erreurs?.code === 'RAISON_REQUISE') {
            setShowModalStatut(true);
            setChargement(false);
            return;
          }
          afficherMessage('erreur', reponseStatut.message || 'Erreur lors du changement de statut');
          setChargement(false);
          return;
        }
      } catch {
        afficherMessage('erreur', 'Impossible de contacter le serveur.');
        setChargement(false);
        return;
      }
    }

    const reponse = await modifierProfil({ prenom, nom, bio });
    setChargement(false);

    if (reponse.succes && reponse.data) {
      afficherMessage('succes', 'Profil mis a jour avec succes');
      updateUser(reponse.data.utilisateur);
      if (reponse.gamification) {
        applyDelta(reponse.gamification);
      }
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

    // Verification selon le type de compte
    if (estCompteOAuth) {
      if (!emailSuppression) {
        afficherMessage('erreur', 'Veuillez entrer votre adresse email');
        return;
      }
    } else {
      if (!motDePasseSuppression) {
        afficherMessage('erreur', 'Veuillez entrer votre mot de passe');
        return;
      }
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
            try {
              const reponse = await supprimerCompte(
                estCompteOAuth
                  ? { emailConfirmation: emailSuppression }
                  : { motDePasse: motDePasseSuppression }
              );

              if (reponse.succes) {
                // Token et donnees locales deja nettoyes par supprimerCompte
                setChargement(false);
                router.replace('/(auth)/connexion');
              } else {
                setChargement(false);
                afficherMessage('erreur', reponse.message || 'Erreur lors de la suppression');
              }
            } catch {
              setChargement(false);
              afficherMessage('erreur', 'Erreur reseau. Reessaie.');
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

      // Charger publications et stories en parallele
      const [pubResponse, storiesResponse] = await Promise.all([
        utilisateur?.id ? getPublicationsUtilisateur(utilisateur.id) : Promise.resolve(null),
        getMesStories(),
      ]);

      if (pubResponse?.succes && pubResponse.data) {
        // Filtrage frontend de securite
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
                if (mediaIsVideo) {
                  // Ouvrir le feed Reels vertical
                  const videoPubs = publications.filter(p =>
                    p.medias?.some(m => m.type === 'video') ||
                    (p.media && isVideo(p.media))
                  );
                  const idx = videoPubs.findIndex(p => p._id === pub._id);
                  router.push({
                    pathname: '/(app)/reels',
                    params: {
                      initialIndex: String(Math.max(0, idx)),
                      videoPublicationIds: JSON.stringify(videoPubs.map(p => p._id)),
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

  const handleChangerStatut = (nouveauStatut: StatutUtilisateur) => {
    setStatutSelectionne(nouveauStatut);
    setStatutMessage(null);
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
        setStatutSelectionne('visiteur');
        setShowModalStatut(false);
        setRaisonCloture('');
        chargerProjetsSuivis();
        afficherMessage('succes', reponse.message || 'Statut mis a jour !');
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
              { borderColor: statutSelectionne === 'visiteur' ? '#10B981' : couleurs.bordure },
              statutSelectionne === 'visiteur' && { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
            ]}
            onPress={() => handleChangerStatut('visiteur')}
          >
            <Ionicons name="compass-outline" size={22} color={statutSelectionne === 'visiteur' ? '#10B981' : couleurs.texteSecondaire} />
            <Text style={[styles.statutCardText, statutSelectionne === 'visiteur' && { color: '#10B981' }]}>
              Visiteur
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.statutCard,
              { borderColor: statutSelectionne === 'entrepreneur' ? '#F59E0B' : couleurs.bordure },
              statutSelectionne === 'entrepreneur' && { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
            ]}
            onPress={() => handleChangerStatut('entrepreneur')}
          >
            <Ionicons name="rocket-outline" size={22} color={statutSelectionne === 'entrepreneur' ? '#F59E0B' : couleurs.texteSecondaire} />
            <Text style={[styles.statutCardText, statutSelectionne === 'entrepreneur' && { color: '#F59E0B' }]}>
              Entrepreneur
            </Text>
          </Pressable>
        </View>
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

      {/* Modale confirmation switch entrepreneur → visiteur (bottom-sheet) */}
      <Modal
        visible={showModalStatut}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalOverlayTouchable}
            onPress={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Passer en mode Visiteur</Text>
              <Pressable onPress={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 480 }}
            >
              <View style={{
                backgroundColor: 'rgba(255, 77, 109, 0.08)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 77, 109, 0.15)',
              }}>
                <Text style={{ color: couleurs.danger, fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: 6 }}>
                  Cette action est irreversible pour tes projets publies :
                </Text>
                <Text style={{ color: couleurs.danger, fontSize: 12.5, lineHeight: 20 }}>
                  {'\u2022'} Tous tes projets publies seront definitivement supprimes{'\n'}
                  {'\u2022'} Chaque abonne sera notifie avec la raison ci-dessous{'\n'}
                  {'\u2022'} Tes brouillons seront conserves
                </Text>
              </View>

              <View style={{
                backgroundColor: 'rgba(245, 158, 11, 0.06)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.2)',
              }}>
                <Text style={{ color: '#D97706', fontSize: 12.5, fontWeight: '600', lineHeight: 18 }}>
                  Le message que tu ecris sera envoye a tous les abonnes de tes projets et sera visible publiquement. Donne une vraie raison.
                </Text>
              </View>

              <Text style={[styles.inputLabel, { marginBottom: 8 }]}>
                Raison de la cloture
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: raisonCloture.trim().length < 10 ? couleurs.texteSecondaire : '#10B981' }}>
                  {raisonCloture.trim().length < 10 ? `Minimum 10 caracteres` : 'OK'}
                </Text>
                <Text style={{ fontSize: 11, color: couleurs.texteSecondaire }}>
                  {raisonCloture.length}/500
                </Text>
              </View>

              {statutMessage?.type === 'erreur' && (
                <Text style={{ color: couleurs.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                  {statutMessage.texte}
                </Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              <Pressable
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}
              >
                <Text style={styles.btnSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.btnDanger, { flex: 1 }, (statutLoading || raisonCloture.trim().length < 10) && { opacity: 0.5 }]}
                onPress={handleConfirmerSwitchVisiteur}
                disabled={statutLoading || raisonCloture.trim().length < 10}
              >
                {statutLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnDangerText}>Confirmer la cloture</Text>
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

        {estCompteOAuth ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirmez votre adresse email</Text>
            <TextInput
              style={styles.input}
              value={emailSuppression}
              onChangeText={setEmailSuppression}
              placeholder="votre@email.com"
              placeholderTextColor={couleurs.texteSecondaire}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        ) : (
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
        )}

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
        <EditBioModal
          visible={modalBio}
          initialValue={utilisateur?.bio || ''}
          onClose={() => setModalBio(false)}
          onSave={handleSauvegarderBio}
          loading={chargement}
        />

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

