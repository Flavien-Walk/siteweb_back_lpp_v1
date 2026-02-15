import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Image, Lock, ShieldAlert,
  Save, Upload, Trash2, Eye, EyeOff, AlertTriangle,
  Globe, LockKeyhole, Shield, History, Rocket, Compass,
  Headset, Plus, Send, MessageCircle, Filter, CheckCircle2,
  Clock, ArrowRight, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  modifierProfil,
  modifierAvatar,
  modifierMotDePasse,
  modifierStatut,
  getAvatarsDefaut,
  supprimerCompte,
  getMySanctions,
  getModerationStatus,
} from '../services/auth';
import type { SanctionItem, ModerationStatus, StatutUtilisateur } from '../services/auth';
import {
  creerTicket, listerMesTickets, getMonTicket, ajouterMessage,
  CATEGORY_LABELS, STATUS_LABELS,
  type SupportTicket, type TicketCategory, type TicketStatus,
} from '../services/support';
import { couleurs } from '../styles/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Section = 'profil' | 'avatar' | 'securite' | 'sanctions' | 'confidentialite' | 'support';

interface SidebarItem {
  key: Section;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const sidebarItems: SidebarItem[] = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'avatar', label: 'Avatar', icon: Image },
  { key: 'securite', label: 'Securite', icon: Lock },
  { key: 'sanctions', label: 'Sanctions', icon: Shield },
  { key: 'confidentialite', label: 'Confidentialite', icon: ShieldAlert },
  { key: 'support', label: 'Support', icon: Headset },
];

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  en_attente: { bg: 'rgba(255, 189, 89, 0.15)', text: '#FFBD59' },
  en_cours: { bg: 'rgba(45, 126, 230, 0.15)', text: '#2D7EE6' },
  termine: { bg: 'rgba(0, 214, 143, 0.15)', text: '#00D68F' },
};

const CATEGORIES: TicketCategory[] = ['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre'];

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

  // --- Sanctions state ---
  const [sanctions, setSanctions] = useState<SanctionItem[]>([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);
  const [sanctionsLoaded, setSanctionsLoaded] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);

  // --- Confidentialite state ---
  const [profilPublic, setProfilPublic] = useState(true);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState('');
  const [motDePasseSuppression, setMotDePasseSuppression] = useState('');
  const [suppressionLoading, setSuppressionLoading] = useState(false);
  const [suppressionMessage, setSuppressionMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);

  // --- Support state ---
  const [supportView, setSupportView] = useState<'list' | 'create' | 'detail'>('list');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportLoaded, setSupportLoaded] = useState(false);
  const [supportFilter, setSupportFilter] = useState<TicketStatus | 'all'>('all');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory | null>(null);
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [supportError, setSupportError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Statut state ---
  const [statutSelectionne, setStatutSelectionne] = useState<StatutUtilisateur>(utilisateur?.statut || 'visiteur');
  const [showModalStatut, setShowModalStatut] = useState(false);
  const [raisonCloture, setRaisonCloture] = useState('');
  const [statutLoading, setStatutLoading] = useState(false);
  const [statutMessage, setStatutMessage] = useState<{ type: 'succes' | 'erreur'; text: string } | null>(null);

  // Initialize profil fields from user
  useEffect(() => {
    if (utilisateur) {
      setPrenom(utilisateur.prenom || '');
      setNom(utilisateur.nom || '');
      setBio(utilisateur.bio || '');
      setProfilPublic(utilisateur.profilPublic ?? true);
      setStatutSelectionne(utilisateur.statut || 'visiteur');
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

    // Changement de statut si different
    if (statutSelectionne !== utilisateur?.statut) {
      try {
        const resStatut = await modifierStatut(statutSelectionne);
        if (resStatut.succes) {
          await rafraichirUtilisateur();
        } else {
          // Si erreur RAISON_REQUISE → ouvrir la modale
          if (resStatut.erreurs?.code === 'RAISON_REQUISE') {
            setShowModalStatut(true);
            setProfilLoading(false);
            return;
          }
          setProfilMessage({ type: 'erreur', text: resStatut.message || 'Erreur lors du changement de statut.' });
          setProfilLoading(false);
          return;
        }
      } catch {
        setProfilMessage({ type: 'erreur', text: 'Impossible de contacter le serveur.' });
        setProfilLoading(false);
        return;
      }
    }

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

  // Load sanctions when section becomes active
  useEffect(() => {
    if (activeSection !== 'sanctions' || sanctionsLoaded) return;
    (async () => {
      setSanctionsLoading(true);
      try {
        const [sanctionsRes, statusRes] = await Promise.all([
          getMySanctions(),
          getModerationStatus(),
        ]);
        if (sanctionsRes.succes && sanctionsRes.data) {
          setSanctions(sanctionsRes.data.sanctions);
        }
        if (statusRes.succes && statusRes.data) {
          setModerationStatus(statusRes.data);
        }
        setSanctionsLoaded(true);
      } catch {
        // silently ignore
      } finally {
        setSanctionsLoading(false);
      }
    })();
  }, [activeSection, sanctionsLoaded]);

  // Load support tickets when section becomes active
  const fetchSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await listerMesTickets();
      if (res.succes && res.data) {
        setSupportTickets(res.data.tickets || []);
      } else {
        setSupportError(res.message || 'Erreur lors du chargement');
      }
    } catch {
      setSupportError('Erreur de connexion');
    } finally {
      setSupportLoading(false);
      setSupportLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeSection !== 'support' || supportLoaded) return;
    fetchSupportTickets();
  }, [activeSection, supportLoaded, fetchSupportTickets]);

  const handleOpenTicket = async (ticketId: string) => {
    setSupportLoading(true);
    try {
      const res = await getMonTicket(ticketId);
      if (res.succes && res.data) {
        setSelectedTicket(res.data.ticket);
        setSupportView('detail');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {
      setSupportError('Erreur de connexion');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketCategory || !ticketMessage.trim()) return;
    setTicketSubmitting(true);
    setSupportError(null);
    try {
      const res = await creerTicket({ subject: ticketSubject.trim(), category: ticketCategory, message: ticketMessage.trim() });
      if (res.succes) {
        setTicketSubject('');
        setTicketCategory(null);
        setTicketMessage('');
        setSupportView('list');
        fetchSupportTickets();
      } else {
        setSupportError(res.message || 'Erreur lors de la creation');
      }
    } catch {
      setSupportError('Erreur de connexion');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setTicketSubmitting(true);
    try {
      const res = await ajouterMessage(selectedTicket._id, replyMessage.trim());
      if (res.succes && res.data) {
        setSelectedTicket(res.data.ticket);
        setReplyMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {
      setSupportError('Erreur de connexion');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleSupportBack = () => {
    if (supportView === 'create' || supportView === 'detail') {
      setSupportView('list');
      setSelectedTicket(null);
      setSupportError(null);
      fetchSupportTickets();
    }
  };

  const formatSupportDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatSupportDateTime = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const handleToggleProfilPublic = async () => {
    const newValue = !profilPublic;
    setProfilPublic(newValue);
    setPrivacyLoading(true);
    try {
      const res = await modifierProfil({ profilPublic: newValue });
      if (res.succes) {
        await rafraichirUtilisateur();
      } else {
        setProfilPublic(!newValue);
      }
    } catch {
      setProfilPublic(!newValue);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleChangerStatut = (nouveauStatut: StatutUtilisateur) => {
    setStatutSelectionne(nouveauStatut);
    setStatutMessage(null);
  };

  const handleConfirmerSwitchVisiteur = async () => {
    if (raisonCloture.trim().length < 10) {
      setStatutMessage({ type: 'erreur', text: 'La raison doit contenir au moins 10 caracteres.' });
      return;
    }

    setStatutLoading(true);
    setStatutMessage(null);
    try {
      const res = await modifierStatut('visiteur', raisonCloture.trim());
      if (res.succes) {
        await rafraichirUtilisateur();
        setStatutSelectionne('visiteur');
        setShowModalStatut(false);
        setRaisonCloture('');
        setProfilMessage({ type: 'succes', text: res.message || 'Statut mis a jour !' });
      } else {
        setStatutMessage({ type: 'erreur', text: res.message || 'Erreur lors du changement.' });
      }
    } catch {
      setStatutMessage({ type: 'erreur', text: 'Impossible de contacter le serveur.' });
    } finally {
      setStatutLoading(false);
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

      {/* Statut entrepreneur / visiteur */}
      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <label style={styles.label}>Statut</label>
        <p style={{ fontSize: '0.8125rem', color: couleurs.texteSecondaire, marginBottom: 12, marginTop: 0 }}>
          Choisis ton profil sur la plateforme.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => handleChangerStatut('visiteur')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 16px',
              borderRadius: 12,
              border: `2px solid ${statutSelectionne === 'visiteur' ? '#10B981' : couleurs.bordure}`,
              backgroundColor: statutSelectionne === 'visiteur' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Compass size={18} color={statutSelectionne === 'visiteur' ? '#10B981' : couleurs.texteSecondaire} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: statutSelectionne === 'visiteur' ? '#10B981' : couleurs.texteSecondaire }}>
              Visiteur
            </span>
          </button>
          <button
            onClick={() => handleChangerStatut('entrepreneur')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 16px',
              borderRadius: 12,
              border: `2px solid ${statutSelectionne === 'entrepreneur' ? '#F59E0B' : couleurs.bordure}`,
              backgroundColor: statutSelectionne === 'entrepreneur' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Rocket size={18} color={statutSelectionne === 'entrepreneur' ? '#F59E0B' : couleurs.texteSecondaire} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: statutSelectionne === 'entrepreneur' ? '#F59E0B' : couleurs.texteSecondaire }}>
              Entrepreneur
            </span>
          </button>
        </div>
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

      {/* Modale confirmation switch entrepreneur → visiteur */}
      {showModalStatut && (
        <div style={styles.modalOverlay} onClick={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ ...styles.sectionTitle, marginBottom: 12 }}>Changer de statut</h3>

            <div style={{
              backgroundColor: couleurs.dangerLight,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              border: '1px solid rgba(255, 77, 109, 0.2)',
            }}>
              <p style={{ color: couleurs.danger, fontSize: '0.8125rem', fontWeight: 600, margin: '0 0 6px 0', lineHeight: 1.5 }}>
                Attention, cette action est irreversible pour tes projets publies :
              </p>
              <ul style={{ color: couleurs.danger, fontSize: '0.8rem', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Tous tes projets publies seront definitivement supprimes</li>
                <li>Chaque abonne recevra une notification avec la raison que tu vas ecrire ci-dessous</li>
                <li>Tes brouillons seront conserves et reapparaitront si tu repasses entrepreneur</li>
              </ul>
            </div>

            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}>
              <p style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                Le message que tu ecris sera envoye tel quel a tous les abonnes de tes projets. Il sera visible publiquement. Fais attention a ce que tu ecris et donne une vraie raison.
              </p>
            </div>

            <label style={styles.label}>Raison de la cloture (min. 10 caracteres)</label>
            <textarea
              value={raisonCloture}
              onChange={(e) => { if (e.target.value.length <= 500) setRaisonCloture(e.target.value); }}
              style={{ ...styles.textarea, marginTop: 6 }}
              placeholder="Explique pourquoi tu clotures tes projets..."
              rows={4}
            />
            <span style={styles.charCount}>{raisonCloture.length}/500</span>

            {statutMessage?.type === 'erreur' && (
              <div style={{
                ...styles.message,
                backgroundColor: couleurs.dangerLight,
                color: couleurs.danger,
                marginBottom: 12,
              }}>
                {statutMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowModalStatut(false); setRaisonCloture(''); setStatutMessage(null); setStatutSelectionne(utilisateur?.statut || 'visiteur'); }}
                style={{ ...styles.secondaryBtn, flex: 1, justifyContent: 'center' }}
              >
                Annuler
              </button>
              <motion.button
                onClick={handleConfirmerSwitchVisiteur}
                disabled={statutLoading}
                style={{ ...styles.dangerBtn, flex: 1, width: 'auto', opacity: statutLoading ? 0.6 : 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {statutLoading ? 'Confirmation...' : 'Confirmer'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
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

        {/* Toggle profil public/prive */}
        <div style={styles.rgpdCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {profilPublic ? <Globe size={20} color={couleurs.primaire} /> : <LockKeyhole size={20} color={couleurs.primaire} />}
            <h3 style={styles.rgpdTitle}>Visibilite du profil</h3>
          </div>
          <p style={{ ...styles.rgpdText, marginBottom: 16 }}>
            {profilPublic
              ? 'Votre profil est public. Tout le monde peut voir vos publications, amis et projets suivis.'
              : 'Votre profil est prive. Seuls vos amis peuvent voir vos publications, amis et projets suivis.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: couleurs.texte, fontSize: '0.875rem', fontWeight: '500' }}>
              Profil public
            </span>
            <motion.button
              onClick={handleToggleProfilPublic}
              disabled={privacyLoading}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                backgroundColor: profilPublic ? couleurs.primaire : couleurs.bordure,
                border: 'none',
                cursor: privacyLoading ? 'wait' : 'pointer',
                position: 'relative' as const,
                transition: 'background-color 200ms ease',
                padding: 0,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ x: profilPublic ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: couleurs.blanc,
                  position: 'absolute' as const,
                  top: 2,
                }}
              />
            </motion.button>
          </div>
        </div>

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

  const sanctionColor = (type: SanctionItem['type']) => {
    switch (type) {
      case 'warn': return '#FFBD59';
      case 'suspend': return '#FF8C42';
      case 'ban': return '#FF4D6D';
      case 'unwarn': case 'unsuspend': case 'unban': return '#00D68F';
      default: return couleurs.texteSecondaire;
    }
  };

  const sanctionLabel = (type: SanctionItem['type']) => {
    switch (type) {
      case 'warn': return 'Avertissement';
      case 'unwarn': return 'Retrait avertissement';
      case 'suspend': return 'Suspension';
      case 'unsuspend': return 'Levee de suspension';
      case 'ban': return 'Bannissement';
      case 'unban': return 'Levee de bannissement';
      default: return type;
    }
  };

  const actorRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'Fondateur';
      case 'admin_modo': case 'admin': return 'Admin';
      case 'modo': return 'Moderateur';
      case 'modo_test': return 'Modo Test';
      case 'system': return 'Systeme';
      default: return role || 'Systeme';
    }
  };

  const warnCount = moderationStatus?.warnCountSinceLastAutoSuspension ?? 0;

  const renderSanctions = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="sanctions">
      <h2 style={styles.sectionTitle}>Mes sanctions</h2>
      <p style={styles.sectionDesc}>Consultez votre historique de moderation.</p>

      {warnCount > 0 && (
        <div style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: 'rgba(255, 189, 89, 0.08)',
          border: '1px solid rgba(255, 189, 89, 0.25)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <AlertTriangle size={20} color="#FFBD59" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#FFBD59', margin: 0, marginBottom: 2 }}>
              Avertissements actifs : {warnCount} / 3
            </p>
            <p style={{ fontSize: '0.8125rem', color: couleurs.texteSecondaire, margin: 0 }}>
              Prochain avertissement = {moderationStatus?.nextAutoAction === 'ban' ? 'bannissement' : 'suspension'}
            </p>
          </div>
        </div>
      )}

      {sanctionsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
      ) : sanctions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {sanctions.map((sanction, idx) => {
            const color = sanctionColor(sanction.type);
            return (
              <motion.div
                key={idx}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: couleurs.fond,
                  border: `1px solid ${couleurs.bordure}`,
                  borderLeft: `3px solid ${color}`,
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, backgroundColor: `${color}20`,
                  }}>
                    <History size={16} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color }}>{sanctionLabel(sanction.type)}</span>
                      <span style={{ fontSize: '0.75rem', color: couleurs.texteMuted }}>
                        {format(new Date(sanction.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {sanction.titre && (
                      <p style={{ fontSize: '0.8125rem', color: couleurs.texte, margin: '4px 0 0', lineHeight: 1.4 }}>{sanction.titre}</p>
                    )}
                  </div>
                </div>
                {sanction.reason && (
                  <p style={{ fontSize: '0.8125rem', color: couleurs.texteSecondaire, margin: '8px 0 0 42px', lineHeight: 1.4 }}>
                    Raison : {sanction.reason}
                  </p>
                )}
                {sanction.suspendedUntil && (
                  <p style={{ fontSize: '0.75rem', color: '#FF8C42', margin: '4px 0 0 42px' }}>
                    Suspendu jusqu'au {format(new Date(sanction.suspendedUntil), 'dd MMM yyyy, HH:mm', { locale: fr })}
                  </p>
                )}
                {sanction.actorRole && (
                  <p style={{ fontSize: '0.75rem', color: couleurs.texteMuted, margin: '4px 0 0 42px' }}>
                    Par : {actorRoleLabel(sanction.actorRole)}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12, padding: '40px 20px' }}>
          <Shield size={40} color={couleurs.succes} />
          <p style={{ fontSize: '1rem', fontWeight: '600', color: couleurs.texte, margin: 0 }}>Aucune sanction</p>
          <p style={{ fontSize: '0.875rem', color: couleurs.texteSecondaire, margin: 0 }}>Votre historique est vierge.</p>
        </div>
      )}
    </motion.div>
  );

  const STATUS_FILTERS: { key: TicketStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Actifs' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'termine', label: 'Termines' },
  ];

  const filteredTickets = supportFilter === 'all'
    ? supportTickets.filter((t) => t.status !== 'termine')
    : supportTickets.filter((t) => t.status === supportFilter);

  const renderSupport = () => {
    // Create ticket view
    if (supportView === 'create') {
      const canSubmit = ticketSubject.trim().length > 0 && ticketCategory !== null && ticketMessage.trim().length > 0;
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="support-create">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <motion.button
              style={{ ...styles.backBtn, padding: 8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSupportBack}
            >
              <ChevronLeft size={18} />
            </motion.button>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Nouveau ticket</h2>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Sujet</label>
            <input
              type="text"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              style={styles.input}
              placeholder="Decrivez brievement votre probleme"
              maxLength={200}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Categorie</label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: `1px solid ${ticketCategory === cat ? couleurs.primaire : couleurs.bordure}`,
                    backgroundColor: ticketCategory === cat ? couleurs.primaireLight : 'transparent',
                    color: ticketCategory === cat ? couleurs.primaire : couleurs.texteSecondaire,
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTicketCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Message</label>
            <textarea
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              style={styles.textarea}
              placeholder="Decrivez votre probleme en detail..."
              rows={5}
              maxLength={2000}
            />
          </div>

          {supportError && (
            <div style={{ ...styles.message, backgroundColor: couleurs.dangerLight, color: couleurs.danger }}>
              {supportError}
            </div>
          )}

          <motion.button
            style={{ ...styles.primaryBtn, opacity: canSubmit && !ticketSubmitting ? 1 : 0.5 }}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            onClick={handleCreateTicket}
            disabled={!canSubmit || ticketSubmitting}
          >
            <Send size={16} />
            {ticketSubmitting ? 'Envoi...' : 'Envoyer'}
          </motion.button>
        </motion.div>
      );
    }

    // Detail view
    if (supportView === 'detail' && selectedTicket) {
      const isClosed = selectedTicket.status === 'termine';
      const statusColor = STATUS_COLORS[selectedTicket.status];

      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="support-detail">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <motion.button
              style={{ ...styles.backBtn, padding: 8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSupportBack}
            >
              <ChevronLeft size={18} />
            </motion.button>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 0, flex: 1, fontSize: '1.1rem' }}>{selectedTicket.subject}</h2>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: statusColor.bg,
              color: statusColor.text,
            }}>
              {STATUS_LABELS[selectedTicket.status]}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: '500',
              border: `1px solid ${couleurs.bordure}`,
              color: couleurs.texteSecondaire,
            }}>
              {CATEGORY_LABELS[selectedTicket.category]}
            </span>
            {selectedTicket.assignedTo && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.75rem',
                color: couleurs.texteSecondaire,
                border: `1px solid ${couleurs.bordure}`,
              }}>
                Pris en charge par {selectedTicket.assignedTo.prenom} {selectedTicket.assignedTo.nom}
              </span>
            )}
          </div>

          {/* Messages */}
          <div style={{
            maxHeight: 400,
            overflowY: 'auto' as const,
            padding: 16,
            borderRadius: 14,
            backgroundColor: couleurs.fond,
            border: `1px solid ${couleurs.bordure}`,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 10,
          }}>
            {selectedTicket.messages.map((msg) => {
              const isUser = msg.senderRole === 'user';
              return (
                <div
                  key={msg._id}
                  style={{
                    maxWidth: '80%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    backgroundColor: isUser ? couleurs.primaire : couleurs.fondCard,
                    borderRadius: 16,
                    borderBottomRightRadius: isUser ? 4 : 16,
                    borderBottomLeftRadius: isUser ? 16 : 4,
                    padding: '10px 14px',
                  }}
                >
                  {!isUser && (
                    <p style={{ fontSize: '0.7rem', fontWeight: '600', color: couleurs.primaire, margin: '0 0 2px 0' }}>
                      {msg.sender?.prenom} {msg.sender?.nom}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8125rem', color: isUser ? '#FFFFFF' : couleurs.texte, margin: 0, lineHeight: 1.5 }}>
                    {msg.content}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: isUser ? 'rgba(255,255,255,0.6)' : couleurs.texteMuted, margin: '4px 0 0', textAlign: 'right' as const }}>
                    {formatSupportDateTime(msg.dateCreation)}
                  </p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input or closed banner */}
          {isClosed ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 14,
              borderRadius: 12,
              backgroundColor: 'rgba(0, 214, 143, 0.08)',
              border: '1px solid rgba(0, 214, 143, 0.2)',
            }}>
              <CheckCircle2 size={16} color="#00D68F" />
              <span style={{ fontSize: '0.8125rem', color: '#00D68F', fontWeight: '500' }}>Ce ticket est termine</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Ecrire un message..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              />
              <motion.button
                style={{
                  ...styles.primaryBtn,
                  width: 44,
                  padding: 0,
                  opacity: replyMessage.trim() && !ticketSubmitting ? 1 : 0.5,
                }}
                whileHover={replyMessage.trim() ? { scale: 1.05 } : {}}
                whileTap={replyMessage.trim() ? { scale: 0.95 } : {}}
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || ticketSubmitting}
              >
                <Send size={16} />
              </motion.button>
            </div>
          )}
        </motion.div>
      );
    }

    // List view (default)
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="support-list">
        <h2 style={styles.sectionTitle}>Support</h2>
        <p style={styles.sectionDesc}>Besoin d'aide ? Creez un ticket et notre equipe vous repondra.</p>

        <motion.button
          style={{ ...styles.primaryBtn, marginBottom: 20 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setSupportView('create'); setSupportError(null); }}
        >
          <Plus size={16} />
          Nouveau ticket
        </motion.button>

        {supportLoading && !supportLoaded ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : supportTickets.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12, padding: '40px 20px' }}>
            <Headset size={40} color={couleurs.texteMuted} />
            <p style={{ fontSize: '1rem', fontWeight: '600', color: couleurs.texte, margin: 0 }}>Aucun ticket</p>
            <p style={{ fontSize: '0.875rem', color: couleurs.texteSecondaire, margin: 0 }}>Vous n'avez pas encore cree de ticket.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
              {STATUS_FILTERS.map((f) => {
                const isActive = supportFilter === f.key;
                const filterColor = f.key !== 'all' ? STATUS_COLORS[f.key as TicketStatus] : null;
                return (
                  <motion.button
                    key={f.key}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: `1px solid ${isActive ? (filterColor?.text || couleurs.primaire) : couleurs.bordure}`,
                      backgroundColor: isActive ? (filterColor?.bg || couleurs.primaireLight) : 'transparent',
                      color: isActive ? (filterColor?.text || couleurs.primaire) : couleurs.texteSecondaire,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSupportFilter(f.key)}
                  >
                    {f.label}
                    {f.key !== 'all' && (
                      <span style={{ opacity: 0.7 }}>
                        {supportTickets.filter((t) => t.status === f.key).length}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Ticket list */}
            {filteredTickets.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, padding: '30px 20px' }}>
                <Filter size={24} color={couleurs.texteMuted} />
                <p style={{ fontSize: '0.8125rem', color: couleurs.texteMuted, margin: 0 }}>
                  Aucun ticket {supportFilter !== 'all' ? STATUS_LABELS[supportFilter].toLowerCase() : 'actif'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {filteredTickets.map((ticket) => {
                  const sc = STATUS_COLORS[ticket.status];
                  return (
                    <motion.div
                      key={ticket._id}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        backgroundColor: couleurs.fond,
                        border: `1px solid ${couleurs.bordure}`,
                        cursor: 'pointer',
                      }}
                      whileHover={{ x: 4, borderColor: couleurs.primaire }}
                      onClick={() => handleOpenTicket(ticket._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: '600', color: couleurs.texte, flex: 1, marginRight: 12 }}>
                          {ticket.subject}
                        </span>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 8,
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          backgroundColor: sc.bg,
                          color: sc.text,
                          whiteSpace: 'nowrap' as const,
                        }}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          border: `1px solid ${couleurs.bordure}`,
                          color: couleurs.texteSecondaire,
                        }}>
                          {CATEGORY_LABELS[ticket.category]}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: couleurs.texteMuted }}>
                          {formatSupportDate(ticket.dateMiseAJour)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: couleurs.texteMuted }}>
                          <MessageCircle size={11} />
                          {ticket.messages?.length || 0}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
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
      case 'sanctions':
        return renderSanctions();
      case 'confidentialite':
        return renderConfidentialite();
      case 'support':
        return renderSupport();
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    padding: 28,
    border: `1px solid ${couleurs.bordure}`,
  },
};
