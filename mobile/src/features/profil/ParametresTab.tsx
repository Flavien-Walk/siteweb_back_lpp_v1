/**
 * ParametresTab — Onglet Parametres extrait de profil.tsx
 * Sections : Profil, Apparence, Securite, Confidentialite
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  modifierProfil,
  modifierMotDePasse,
  supprimerCompte,
  modifierStatut,
  StatutUtilisateur,
} from '../../services/auth';
import AppBadge from '../../composants/AppBadge';
import { useTheme } from '../../contexts/ThemeContext';

type SectionParametres = 'profil' | 'apparence' | 'securite' | 'confidentialite';

interface ParametresTabProps {
  couleurs: any;
  styles: any;
  isDark: boolean;
  utilisateur: any;
  updateUser: (user: any) => void;
  refreshUser: () => Promise<void>;
  moderationStatus: any;
  gamification: any;
  applyDelta: (delta: any) => void;
  toggleTheme: () => void;
  afficherMessage: (type: 'succes' | 'erreur', texte: string) => void;
  chargement: boolean;
  setChargement: (v: boolean) => void;
  logout: () => Promise<void>;
  onStatutChanged?: () => void;
}

export default function ParametresTab(props: ParametresTabProps) {
  const {
    couleurs,
    styles,
    isDark,
    utilisateur,
    updateUser,
    moderationStatus,
    applyDelta,
    toggleTheme,
    afficherMessage,
    chargement,
    setChargement,
    logout,
    onStatutChanged,
  } = props;

  const { resetTheme } = useTheme();

  // Section active
  const [sectionParametres, setSectionParametres] = useState<SectionParametres>('profil');

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

  // Switch statut entrepreneur/visiteur
  const [statutSelectionne, setStatutSelectionne] = useState<StatutUtilisateur>(
    utilisateur?.statut || 'visiteur'
  );
  const [showModalStatut, setShowModalStatut] = useState(false);
  const [raisonCloture, setRaisonCloture] = useState('');
  const [statutLoading, setStatutLoading] = useState(false);
  const [statutMessage, setStatutMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  // Initialisation des champs depuis utilisateur
  useEffect(() => {
    if (utilisateur) {
      setPrenom(utilisateur.prenom);
      setNom(utilisateur.nom);
      setEmail(utilisateur.email);
      setBio(utilisateur.bio || '');
      setProfilPublic(utilisateur.profilPublic ?? true);
    }
  }, [utilisateur]);

  // Initialisation du statut
  useEffect(() => {
    if (utilisateur?.statut) {
      setStatutSelectionne(utilisateur.statut);
    }
  }, [utilisateur?.statut]);

  // =====================
  // HANDLERS
  // =====================

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
            resetTheme();
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
          if (onStatutChanged) onStatutChanged();
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
      if (emailSuppression.trim().toLowerCase() !== utilisateur?.email?.trim().toLowerCase()) {
        afficherMessage('erreur', 'L\'adresse email ne correspond pas a votre compte');
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
                resetTheme();
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
        if (onStatutChanged) onStatutChanged();
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

  const handleToggleProfilPublic = async (value: boolean) => {
    setProfilPublic(value);
    try {
      const reponse = await modifierProfil({ profilPublic: value });
      if (reponse.succes && reponse.data) {
        updateUser(reponse.data.utilisateur);
        afficherMessage('succes', value ? 'Profil rendu public' : 'Profil rendu prive');
      } else {
        setProfilPublic(!value);
        afficherMessage('erreur', reponse.message || 'Erreur lors de la modification');
      }
    } catch {
      setProfilPublic(!value);
      afficherMessage('erreur', 'Erreur reseau');
    }
  };

  // =====================
  // RENDER HELPERS
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

  const renderConfidentialiteSection = () => (
    <View style={styles.parametresContent}>
      <Text style={styles.parametresTitle}>Confidentialite et RGPD</Text>

      <View style={styles.rgpdCard}>
        <View style={styles.rgpdHeader}>
          <Ionicons name={profilPublic ? 'globe-outline' : 'lock-closed-outline'} size={24} color={couleurs.primaire} />
          <Text style={styles.rgpdTitle}>Visibilite du profil</Text>
        </View>
        <Text style={[styles.parametresDescription, { marginBottom: 12 }]}>
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

  // =====================
  // RENDER PRINCIPAL
  // =====================

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
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
}
