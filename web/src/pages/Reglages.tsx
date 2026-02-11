import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Image, Lock, ShieldAlert,
  Save, Upload, Trash2, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  modifierProfil,
  modifierAvatar,
  modifierMotDePasse,
  getAvatarsDefaut,
  supprimerCompte,
} from '../services/auth';
import { couleurs } from '../styles/theme';

type Section = 'profil' | 'avatar' | 'securite' | 'confidentialite';

interface SidebarItem {
  key: Section;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const sidebarItems: SidebarItem[] = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'avatar', label: 'Avatar', icon: Image },
  { key: 'securite', label: 'Securite', icon: Lock },
  { key: 'confidentialite', label: 'Confidentialite', icon: ShieldAlert },
];

export default function Reglages() {
  const { utilisateur, rafraichirUtilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('profil');

  // --- Profil state ---
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [bio, setBio] = useState('');
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilMessage, setProfilMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);

  // --- Avatar state ---
  const [avatarsDefaut, setAvatarsDefaut] = useState<string[]>([]);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Securite state ---
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [showActuel, setShowActuel] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [securiteLoading, setSecuriteLoading] = useState(false);
  const [securiteMessage, setSecuriteMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);

  // --- Confidentialite state ---
  const [confirmationSuppression, setConfirmationSuppression] = useState('');
  const [motDePasseSuppression, setMotDePasseSuppression] = useState('');
  const [suppressionLoading, setSuppressionLoading] = useState(false);
  const [suppressionMessage, setSuppressionMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);

  // Initialize profil fields from user
  useEffect(() => {
    if (utilisateur) {
      setPrenom(utilisateur.prenom || '');
      setNom(utilisateur.nom || '');
      setBio(utilisateur.bio || '');
    }
  }, [utilisateur]);

  // Load default avatars
  const chargerAvatarsDefaut = useCallback(async () => {
    const res = await getAvatarsDefaut();
    if (res.succes && res.data) {
      setAvatarsDefaut(res.data.avatars);
    }
  }, []);

  useEffect(() => {
    chargerAvatarsDefaut();
  }, [chargerAvatarsDefaut]);

  // --- Handlers ---

  const handleSauvegarderProfil = async () => {
    setProfilLoading(true);
    setProfilMessage(null);
    try {
      const res = await modifierProfil({ prenom, nom, bio });
      if (res.succes) {
        await rafraichirUtilisateur();
        setProfilMessage({ type: 'succes', text: 'Profil mis a jour avec succes.' });
      } else {
        setProfilMessage({ type: 'erreur', text: res.message || 'Erreur lors de la mise a jour.' });
      }
    } catch {
      setProfilMessage({ type: 'erreur', text: 'Erreur lors de la mise a jour du profil.' });
    } finally {
      setProfilLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({ type: 'erreur', text: 'L\'image ne doit pas depasser 5 Mo.' });
      return;
    }

    setAvatarLoading(true);
    setAvatarMessage(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
        reader.readAsDataURL(file);
      });

      const res = await modifierAvatar(base64);
      if (res.succes) {
        await rafraichirUtilisateur();
        setAvatarMessage({ type: 'succes', text: 'Avatar mis a jour.' });
      } else {
        setAvatarMessage({ type: 'erreur', text: res.message || 'Erreur lors du changement d\'avatar.' });
      }
    } catch {
      setAvatarMessage({ type: 'erreur', text: 'Erreur lors du changement d\'avatar.' });
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectAvatarDefaut = async (url: string) => {
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      const res = await modifierAvatar(url);
      if (res.succes) {
        await rafraichirUtilisateur();
        setAvatarMessage({ type: 'succes', text: 'Avatar mis a jour.' });
      } else {
        setAvatarMessage({ type: 'erreur', text: res.message || 'Erreur lors du changement d\'avatar.' });
      }
    } catch {
      setAvatarMessage({ type: 'erreur', text: 'Erreur lors du changement d\'avatar.' });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSupprimerAvatar = async () => {
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      const res = await modifierAvatar(null);
      if (res.succes) {
        await rafraichirUtilisateur();
        setAvatarMessage({ type: 'succes', text: 'Avatar supprime.' });
      } else {
        setAvatarMessage({ type: 'erreur', text: res.message || 'Erreur lors de la suppression.' });
      }
    } catch {
      setAvatarMessage({ type: 'erreur', text: 'Erreur lors de la suppression de l\'avatar.' });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleModifierMotDePasse = async () => {
    setSecuriteMessage(null);

    if (nouveauMotDePasse.length < 8) {
      setSecuriteMessage({ type: 'erreur', text: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.' });
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setSecuriteMessage({ type: 'erreur', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setSecuriteLoading(true);
    try {
      const res = await modifierMotDePasse(motDePasseActuel, nouveauMotDePasse);
      if (res.succes) {
        setSecuriteMessage({ type: 'succes', text: 'Mot de passe modifie avec succes.' });
        setMotDePasseActuel('');
        setNouveauMotDePasse('');
        setConfirmationMotDePasse('');
      } else {
        setSecuriteMessage({ type: 'erreur', text: res.message || 'Erreur lors de la modification.' });
      }
    } catch {
      setSecuriteMessage({ type: 'erreur', text: 'Erreur lors de la modification du mot de passe.' });
    } finally {
      setSecuriteLoading(false);
    }
  };

  const handleSupprimerCompte = async () => {
    setSuppressionMessage(null);
    setSuppressionLoading(true);
    try {
      const res = await supprimerCompte(motDePasseSuppression);
      if (res.succes) {
        deconnexion();
        navigate('/connexion');
      } else {
        setSuppressionMessage({ type: 'erreur', text: res.message || 'Erreur lors de la suppression du compte.' });
      }
    } catch {
      setSuppressionMessage({ type: 'erreur', text: 'Erreur lors de la suppression du compte.' });
    } finally {
      setSuppressionLoading(false);
    }
  };

  if (!utilisateur) return null;

  const initiale = utilisateur.prenom?.[0]?.toUpperCase() || '?';

  // --- Render sections ---

  const renderProfil = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="profil">
      <h2 style={styles.sectionTitle}>Informations personnelles</h2>
      <p style={styles.sectionDesc}>Modifiez vos informations de profil visibles par les autres utilisateurs.</p>

      <div style={styles.formGroup}>
        <label style={styles.label}>Prenom</label>
        <input
          type="text"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          style={styles.input}
          placeholder="Votre prenom"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Nom</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          style={styles.input}
          placeholder="Votre nom"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => {
            if (e.target.value.length <= 150) setBio(e.target.value);
          }}
          style={styles.textarea}
          placeholder="Parlez de vous en quelques mots..."
          rows={4}
        />
        <span style={styles.charCount}>{bio.length}/150</span>
      </div>

      {profilMessage && (
        <div style={{
          ...styles.message,
          backgroundColor: profilMessage.type === 'succes' ? couleurs.succesLight : couleurs.dangerLight,
          color: profilMessage.type === 'succes' ? couleurs.succes : couleurs.danger,
        }}>
          {profilMessage.text}
        </div>
      )}

      <motion.button
        style={{
          ...styles.primaryBtn,
          opacity: profilLoading ? 0.6 : 1,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSauvegarderProfil}
        disabled={profilLoading}
      >
        <Save size={16} />
        {profilLoading ? 'Sauvegarde...' : 'Sauvegarder'}
      </motion.button>
    </motion.div>
  );

  const renderAvatar = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="avatar">
      <h2 style={styles.sectionTitle}>Avatar</h2>
      <p style={styles.sectionDesc}>Personnalisez votre photo de profil.</p>

      <div style={styles.avatarPreviewSection}>
        <div style={styles.avatarPreviewContainer}>
          {utilisateur.avatar ? (
            <img src={utilisateur.avatar} alt="Avatar" style={styles.avatarPreview} />
          ) : (
            <div style={styles.avatarPreviewPlaceholder}>
              <span style={styles.avatarPreviewLetter}>{initiale}</span>
            </div>
          )}
        </div>
        <div style={styles.avatarActions}>
          <motion.button
            style={styles.secondaryBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
          >
            <Upload size={16} />
            Choisir depuis la galerie
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          {utilisateur.avatar && (
            <motion.button
              style={styles.dangerBtnOutline}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSupprimerAvatar}
              disabled={avatarLoading}
            >
              <Trash2 size={16} />
              Supprimer l&apos;avatar
            </motion.button>
          )}
        </div>
      </div>

      {avatarMessage && (
        <div style={{
          ...styles.message,
          backgroundColor: avatarMessage.type === 'succes' ? couleurs.succesLight : couleurs.dangerLight,
          color: avatarMessage.type === 'succes' ? couleurs.succes : couleurs.danger,
        }}>
          {avatarMessage.text}
        </div>
      )}

      {avatarsDefaut.length > 0 && (
        <>
          <h3 style={styles.subTitle}>Avatars par defaut</h3>
          <div style={styles.avatarsGrid}>
            {avatarsDefaut.map((url, i) => (
              <motion.button
                key={i}
                style={{
                  ...styles.avatarGridItem,
                  borderColor: utilisateur.avatar === url ? couleurs.primaire : couleurs.bordure,
                  borderWidth: utilisateur.avatar === url ? 2 : 1,
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectAvatarDefaut(url)}
                disabled={avatarLoading}
              >
                <img src={url} alt={`Avatar ${i + 1}`} style={styles.avatarGridImg} />
              </motion.button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );

  const renderSecurite = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="securite">
      <h2 style={styles.sectionTitle}>Modifier le mot de passe</h2>
      <p style={styles.sectionDesc}>Choisissez un mot de passe fort d&apos;au moins 8 caracteres.</p>

      <div style={styles.formGroup}>
        <label style={styles.label}>Mot de passe actuel</label>
        <div style={styles.passwordWrapper}>
          <input
            type={showActuel ? 'text' : 'password'}
            value={motDePasseActuel}
            onChange={(e) => setMotDePasseActuel(e.target.value)}
            style={styles.passwordInput}
            placeholder="Mot de passe actuel"
          />
          <button
            type="button"
            style={styles.eyeBtn}
            onClick={() => setShowActuel(!showActuel)}
          >
            {showActuel ? <EyeOff size={16} color={couleurs.texteSecondaire} /> : <Eye size={16} color={couleurs.texteSecondaire} />}
          </button>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Nouveau mot de passe</label>
        <div style={styles.passwordWrapper}>
          <input
            type={showNouveau ? 'text' : 'password'}
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            style={styles.passwordInput}
            placeholder="Minimum 8 caracteres"
          />
          <button
            type="button"
            style={styles.eyeBtn}
            onClick={() => setShowNouveau(!showNouveau)}
          >
            {showNouveau ? <EyeOff size={16} color={couleurs.texteSecondaire} /> : <Eye size={16} color={couleurs.texteSecondaire} />}
          </button>
        </div>
        {nouveauMotDePasse.length > 0 && nouveauMotDePasse.length < 8 && (
          <span style={styles.validationHint}>Minimum 8 caracteres requis</span>
        )}
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Confirmer le nouveau mot de passe</label>
        <div style={styles.passwordWrapper}>
          <input
            type={showConfirmation ? 'text' : 'password'}
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
            style={styles.passwordInput}
            placeholder="Confirmez le mot de passe"
          />
          <button
            type="button"
            style={styles.eyeBtn}
            onClick={() => setShowConfirmation(!showConfirmation)}
          >
            {showConfirmation ? <EyeOff size={16} color={couleurs.texteSecondaire} /> : <Eye size={16} color={couleurs.texteSecondaire} />}
          </button>
        </div>
        {confirmationMotDePasse.length > 0 && confirmationMotDePasse !== nouveauMotDePasse && (
          <span style={styles.validationHint}>Les mots de passe ne correspondent pas</span>
        )}
      </div>

      {securiteMessage && (
        <div style={{
          ...styles.message,
          backgroundColor: securiteMessage.type === 'succes' ? couleurs.succesLight : couleurs.dangerLight,
          color: securiteMessage.type === 'succes' ? couleurs.succes : couleurs.danger,
        }}>
          {securiteMessage.text}
        </div>
      )}

      <motion.button
        style={{
          ...styles.primaryBtn,
          opacity: securiteLoading || !motDePasseActuel || nouveauMotDePasse.length < 8 || nouveauMotDePasse !== confirmationMotDePasse ? 0.6 : 1,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleModifierMotDePasse}
        disabled={securiteLoading || !motDePasseActuel || nouveauMotDePasse.length < 8 || nouveauMotDePasse !== confirmationMotDePasse}
      >
        <Lock size={16} />
        {securiteLoading ? 'Modification...' : 'Modifier le mot de passe'}
      </motion.button>
    </motion.div>
  );

  const renderConfidentialite = () => {
    const canDelete = confirmationSuppression === 'SUPPRIMER' && motDePasseSuppression.length > 0;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="confidentialite">
        <h2 style={styles.sectionTitle}>Confidentialite & RGPD</h2>

        <div style={styles.rgpdCard}>
          <h3 style={styles.rgpdTitle}>Vos droits</h3>
          <p style={styles.rgpdText}>
            Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez d&apos;un droit
            d&apos;acces, de rectification, de portabilite et de suppression de vos donnees personnelles.
            Vous pouvez exercer ces droits a tout moment depuis cette page ou en nous contactant directement.
          </p>
          <p style={styles.rgpdText}>
            Vos donnees sont stockees de maniere securisee et ne sont jamais partagees avec des tiers
            sans votre consentement explicite.
          </p>
        </div>

        <div style={styles.dangerZone}>
          <div style={styles.dangerHeader}>
            <AlertTriangle size={20} color={couleurs.danger} />
            <h3 style={styles.dangerTitle}>Supprimer mon compte</h3>
          </div>

          <div style={styles.dangerWarning}>
            <p style={styles.dangerWarningText}>
              Cette action est irreversible. Toutes vos donnees, publications, messages et connexions
              seront definitivement supprimees. Cette operation ne peut pas etre annulee.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <input
              type="text"
              value={confirmationSuppression}
              onChange={(e) => setConfirmationSuppression(e.target.value)}
              style={{
                ...styles.input,
                borderColor: confirmationSuppression.length > 0 && confirmationSuppression !== 'SUPPRIMER'
                  ? couleurs.danger
                  : couleurs.bordure,
              }}
              placeholder="SUPPRIMER"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={motDePasseSuppression}
              onChange={(e) => setMotDePasseSuppression(e.target.value)}
              style={styles.input}
              placeholder="Votre mot de passe"
            />
          </div>

          {suppressionMessage && (
            <div style={{
              ...styles.message,
              backgroundColor: couleurs.dangerLight,
              color: couleurs.danger,
            }}>
              {suppressionMessage.text}
            </div>
          )}

          <motion.button
            style={{
              ...styles.dangerBtn,
              opacity: canDelete && !suppressionLoading ? 1 : 0.5,
              cursor: canDelete && !suppressionLoading ? 'pointer' : 'not-allowed',
            }}
            whileHover={canDelete && !suppressionLoading ? { scale: 1.02 } : {}}
            whileTap={canDelete && !suppressionLoading ? { scale: 0.98 } : {}}
            onClick={handleSupprimerCompte}
            disabled={!canDelete || suppressionLoading}
          >
            <Trash2 size={16} />
            {suppressionLoading ? 'Suppression...' : 'Supprimer definitivement mon compte'}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profil':
        return renderProfil();
      case 'avatar':
        return renderAvatar();
      case 'securite':
        return renderSecurite();
      case 'confidentialite':
        return renderConfidentialite();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <motion.button
          style={styles.backBtn}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profil')}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h1 style={styles.pageTitle}>Reglages</h1>
      </div>

      <div style={styles.layout}>
        <nav style={styles.sidebar}>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <motion.button
                key={item.key}
                style={{
                  ...styles.sidebarItem,
                  backgroundColor: isActive ? couleurs.primaireLight : 'transparent',
                  color: isActive ? couleurs.primaire : couleurs.texteSecondaire,
                  borderColor: isActive ? 'rgba(124, 92, 255, 0.2)' : 'transparent',
                }}
                whileHover={{ backgroundColor: isActive ? couleurs.primaireLight : couleurs.fondCard }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <main style={styles.content}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  backBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  layout: {
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: 8,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    position: 'sticky' as const,
    top: 24,
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: 'none',
    fontSize: '0.9375rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    textAlign: 'left' as const,
    width: '100%',
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: 28,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  subTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginTop: 28,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 20,
    position: 'relative' as const,
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box' as const,
  },
  charCount: {
    position: 'absolute' as const,
    bottom: -18,
    right: 0,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  passwordWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '12px 44px 12px 14px',
    borderRadius: 10,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box' as const,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationHint: {
    display: 'block',
    marginTop: 6,
    fontSize: '0.75rem',
    color: couleurs.danger,
  },
  message: {
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: 20,
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    backgroundColor: couleurs.primaire,
    border: 'none',
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    borderRadius: 10,
    backgroundColor: couleurs.primaireLight,
    border: 'none',
    color: couleurs.primaire,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dangerBtnOutline: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    borderRadius: 10,
    backgroundColor: 'transparent',
    border: `1px solid ${couleurs.danger}`,
    color: couleurs.danger,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dangerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    backgroundColor: couleurs.danger,
    border: 'none',
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    transition: 'opacity 150ms ease',
  },
  avatarPreviewSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 14,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
  },
  avatarPreviewContainer: {
    flexShrink: 0,
  },
  avatarPreview: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: `3px solid ${couleurs.primaire}`,
  },
  avatarPreviewPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `3px solid ${couleurs.primaireDark}`,
  },
  avatarPreviewLetter: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: couleurs.blanc,
  },
  avatarActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  avatarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
    gap: 12,
  },
  avatarGridItem: {
    padding: 4,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fond,
    cursor: 'pointer',
    overflow: 'hidden',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGridImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    objectFit: 'cover' as const,
  },
  rgpdCard: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 32,
  },
  rgpdTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 10,
  },
  rgpdText: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  dangerZone: {
    padding: 24,
    borderRadius: 14,
    border: `1px solid ${couleurs.danger}`,
    backgroundColor: couleurs.dangerLight,
  },
  dangerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dangerTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: couleurs.danger,
  },
  dangerWarning: {
    padding: '14px 16px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 77, 109, 0.12)',
    border: `1px solid rgba(255, 77, 109, 0.25)`,
    marginBottom: 20,
  },
  dangerWarningText: {
    fontSize: '0.8125rem',
    color: couleurs.danger,
    lineHeight: 1.6,
    fontWeight: '500',
  },
};
