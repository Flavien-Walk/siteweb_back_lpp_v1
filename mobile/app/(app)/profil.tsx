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
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Image,
  RefreshControl,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
} from '../../src/services/auth';
import Avatar from '../../src/composants/Avatar';

type Onglet = 'profil-public' | 'parametres';
type SectionParametres = 'profil' | 'apparence' | 'securite' | 'confidentialite';

export default function Profil() {
  const { couleurs, toggleTheme, isDark } = useTheme();
  const { utilisateur, updateUser, logout } = useUser();
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

  // Avatar
  const [modalAvatar, setModalAvatar] = useState(false);
  const [avatarsDefaut, setAvatarsDefaut] = useState<string[]>([]);
  const [chargementAvatar, setChargementAvatar] = useState(false);

  // Modal Bio
  const [modalBio, setModalBio] = useState(false);
  const [bioTemp, setBioTemp] = useState('');

  // Animation de l'indicateur d'onglet
  const [indicatorPosition] = useState(new Animated.Value(0));

  useEffect(() => {
    if (utilisateur) {
      setPrenom(utilisateur.prenom);
      setNom(utilisateur.nom);
      setEmail(utilisateur.email);
      setBio(utilisateur.bio || '');
    }
  }, [utilisateur]);

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
      prenom: utilisateur?.prenom || '',
      nom: utilisateur?.nom || '',
      email: utilisateur?.email || '',
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
    const reponse = await modifierProfil({ prenom, nom, email, bio });
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

  const handleRefresh = useCallback(() => {
    setRafraichissement(true);
    // Simuler un refresh (les données viennent du context)
    setTimeout(() => {
      setRafraichissement(false);
    }, 500);
  }, []);

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  // Configuration du statut (avec gestion du rôle admin)
  const getStatutConfig = (role?: string, statut?: string) => {
    if (role === 'admin') {
      return { label: 'Admin LPP', icon: 'shield-checkmark' as const, color: '#dc2626' };
    }
    switch (statut) {
      case 'entrepreneur':
        return { label: 'Entrepreneur', icon: 'rocket' as const, color: couleurs.primaire };
      case 'visiteur':
      default:
        return { label: 'Visiteur', icon: 'compass' as const, color: couleurs.texteSecondaire };
    }
  };

  const formatDateInscription = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Styles dynamiques
  const styles = createStyles(couleurs, isDark);

  const statutConfig = getStatutConfig(utilisateur?.role, utilisateur?.statut);

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
        {/* Avatar avec gradient et bouton modifier */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handleOuvrirModalAvatar}>
            <LinearGradient
              colors={[couleurs.primaire, couleurs.secondaire, couleurs.accent]}
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
                />
              </View>
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color={couleurs.blanc} />
            </View>
          </Pressable>
        </View>

        {/* Stats horizontales */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{utilisateur?.nbAmis || 0}</Text>
            <Text style={styles.statLabel}>Amis</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{utilisateur?.projetsSuivis || 0}</Text>
            <Text style={styles.statLabel}>Projets</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
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

        {/* Bio - cliquable pour modifier */}
        <Pressable onPress={handleOuvrirModalBio} style={styles.bioContainer}>
          {utilisateur?.bio ? (
            <Text style={styles.bioText}>{utilisateur.bio}</Text>
          ) : (
            <View style={styles.ajouterBioBtn}>
              <Ionicons name="add-circle-outline" size={16} color={couleurs.primaire} />
              <Text style={styles.ajouterBioText}>Ajouter une bio</Text>
            </View>
          )}
        </Pressable>

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

      {/* Séparateur */}
      <View style={styles.separator} />

      {/* Section activité */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Mon activité</Text>

        <View style={styles.emptyActivity}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="grid-outline" size={32} color={couleurs.bordure} />
          </View>
          <Text style={styles.emptyTitle}>Aucune publication</Text>
          <Text style={styles.emptyText}>
            Vos publications apparaîtront ici
          </Text>
        </View>
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

  const renderConfidentialiteSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Confidentialite et RGPD</Text>
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Menu des sections */}
      <View style={styles.menu}>
        {renderMenuItem('person-outline', 'Profil', 'profil', 'Modifiez vos informations')}
        {renderMenuItem('color-palette-outline', 'Apparence', 'apparence', 'Theme et personnalisation')}
        {renderMenuItem('lock-closed-outline', 'Securite', 'securite', 'Mot de passe et connexion')}
        {renderMenuItem('shield-checkmark-outline', 'Confidentialite', 'confidentialite', 'RGPD et suppression')}
      </View>

      {/* Section active */}
      <View style={styles.sectionCard}>
        {renderParametresSectionContent()}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[couleurs.fond, couleurs.fondSecondaire, couleurs.fond]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
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
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  bioContainer: {
    marginBottom: espacements.md,
  },
  bioText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
  },
  ajouterBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  ajouterBioText: {
    fontSize: 14,
    color: couleurs.primaire,
    fontWeight: '500',
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
  separator: {
    height: 8,
    backgroundColor: couleurs.fondSecondaire,
    marginVertical: espacements.md,
  },
  activitySection: {
    paddingHorizontal: espacements.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.lg,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  emptyText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
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
});
