/**
 * Page Profil - Gestion du compte utilisateur
 * RGPD : modification, deconnexion, suppression de compte
 * Theme : choix clair/sombre avec persistance
 */

import { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { espacements, rayons } from '../../src/constantes/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  deconnexion,
  getUtilisateurLocal,
  Utilisateur,
  modifierProfil,
  modifierMotDePasse,
  supprimerCompte,
  getAvatarsDefaut,
  modifierAvatar,
} from '../../src/services/auth';

type Section = 'profil' | 'apparence' | 'securite' | 'confidentialite';

export default function Profil() {
  const { couleurs, mode, toggleTheme, isDark } = useTheme();
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [sectionActive, setSectionActive] = useState<Section>('profil');
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  // Champs profil
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');

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

  useEffect(() => {
    chargerUtilisateur();
  }, []);

  const chargerUtilisateur = async () => {
    const user = await getUtilisateurLocal();
    if (user) {
      setUtilisateur(user);
      setPrenom(user.prenom);
      setNom(user.nom);
      setEmail(user.email);
    }
  };

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
        setUtilisateur(reponse.data.utilisateur);
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

  const afficherMessage = (type: 'succes' | 'erreur', texte: string) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 4000);
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
            await deconnexion();
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
    const reponse = await modifierProfil({ prenom, nom, email });
    setChargement(false);

    if (reponse.succes) {
      afficherMessage('succes', 'Profil mis a jour avec succes');
      chargerUtilisateur();
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
              await deconnexion();
              router.replace('/(auth)/connexion');
            } else {
              afficherMessage('erreur', reponse.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const getInitiales = () => {
    if (!utilisateur) return 'U';
    return `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();
  };

  // Styles dynamiques
  const styles = createStyles(couleurs, isDark);

  const renderMenuItem = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    section: Section,
    description: string
  ) => (
    <Pressable
      style={[styles.menuItem, sectionActive === section && styles.menuItemActive]}
      onPress={() => setSectionActive(section)}
    >
      <View style={[styles.menuIcon, sectionActive === section && styles.menuIconActive]}>
        <Ionicons
          name={icon}
          size={20}
          color={sectionActive === section ? couleurs.blanc : couleurs.texteSecondaire}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, sectionActive === section && styles.menuLabelActive]}>
          {label}
        </Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={sectionActive === section ? couleurs.primaire : couleurs.texteSecondaire}
      />
    </Pressable>
  );

  const renderProfilSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Informations personnelles</Text>
      <Text style={styles.sectionDescription}>
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
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Apparence</Text>
      <Text style={styles.sectionDescription}>
        Personnalisez l'apparence de l'application selon vos preferences. Le theme choisi sera sauvegarde automatiquement.
      </Text>

      {/* Theme Toggle */}
      <View style={styles.themeCard}>
        <View style={styles.themeHeader}>
          <Ionicons name="color-palette-outline" size={24} color={couleurs.primaire} />
          <Text style={styles.themeTitle}>Theme de l'application</Text>
        </View>

        <View style={styles.themeOptions}>
          {/* Option Sombre */}
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

          {/* Option Clair */}
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

        {/* Quick Toggle */}
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

      <View style={styles.themeNote}>
        <Ionicons name="information-circle-outline" size={18} color={couleurs.texteSecondaire} />
        <Text style={styles.themeNoteText}>
          Votre preference de theme est sauvegardee localement et sera appliquee automatiquement a chaque ouverture de l'application.
        </Text>
      </View>
    </View>
  );

  const renderSecuriteSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Modifier le mot de passe</Text>
      <Text style={styles.sectionDescription}>
        Choisissez un mot de passe fort avec au moins 8 caracteres, incluant chiffres et caracteres speciaux.
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
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Confidentialite et RGPD</Text>
      <Text style={styles.sectionDescription}>
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
          La suppression de votre compte est definitive. Toutes vos donnees personnelles seront effacees conformement au RGPD.
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

  const renderSectionContent = () => {
    switch (sectionActive) {
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

  return (
    <SafeAreaView style={styles.container}>
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Avatar et infos */}
          <View style={styles.profileHeader}>
            <Pressable style={styles.avatarContainer} onPress={handleOuvrirModalAvatar}>
              {utilisateur?.avatar ? (
                <Image source={{ uri: utilisateur.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getInitiales()}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={couleurs.blanc} />
              </View>
            </Pressable>
            <Text style={styles.profileName}>
              {utilisateur?.prenom} {utilisateur?.nom}
            </Text>
            <Text style={styles.profileEmail}>{utilisateur?.email}</Text>
          </View>

          {/* Menu */}
          <View style={styles.menu}>
            {renderMenuItem('person-outline', 'Profil', 'profil', 'Modifiez vos informations')}
            {renderMenuItem('color-palette-outline', 'Apparence', 'apparence', 'Theme et personnalisation')}
            {renderMenuItem('lock-closed-outline', 'Securite', 'securite', 'Mot de passe et connexion')}
            {renderMenuItem('shield-checkmark-outline', 'Confidentialite', 'confidentialite', 'RGPD et suppression')}
          </View>

          {/* Section active */}
          <View style={styles.sectionCard}>
            {renderSectionContent()}
          </View>
        </ScrollView>

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
                  <ScrollView contentContainerStyle={styles.avatarGrid}>
                    {/* Option pour supprimer l'avatar */}
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

                    {/* Avatars par defaut */}
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
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: espacements.lg,
    marginTop: espacements.md,
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

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: espacements.xl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.md,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: couleurs.blanc,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: espacements.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  profileEmail: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },

  // Menu
  menu: {
    marginHorizontal: espacements.lg,
    marginBottom: espacements.lg,
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

  // Section Card
  sectionCard: {
    marginHorizontal: espacements.lg,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  sectionContent: {
    padding: espacements.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  sectionDescription: {
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
  themeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.sm,
    padding: espacements.md,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.08)',
    borderRadius: rayons.md,
  },
  themeNoteText: {
    flex: 1,
    fontSize: 12,
    color: couleurs.texteSecondaire,
    lineHeight: 16,
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
});
