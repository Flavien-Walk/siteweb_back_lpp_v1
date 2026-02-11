import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Users, ChevronLeft, ChevronRight,
  Check, X, Upload, Link as LinkIcon, BarChart3, FileText, Image,
  Briefcase, Layers, Lightbulb, DollarSign, Camera,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getMesProjetsEntrepreneur,
  creerProjet,
  modifierProjet,
  publierProjet,
  depublierProjet,
  supprimerProjet,
  gererEquipeProjet,
  uploadMediaProjet,
} from '../services/projets';
import type {
  Projet,
  ProjetFormData,
  CategorieProjet,
  MaturiteProjet,
  TypeLien,
  RoleEquipe,
  Metrique,
  LienProjet,
} from '../services/projets';
import { getMesAmis } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { couleurs } from '../styles/theme';

// ─── Constants ───

const CATEGORIES: { value: CategorieProjet; label: string }[] = [
  { value: 'tech', label: 'Tech' },
  { value: 'food', label: 'Food' },
  { value: 'sante', label: 'Sante' },
  { value: 'education', label: 'Education' },
  { value: 'energie', label: 'Energie' },
  { value: 'culture', label: 'Culture' },
  { value: 'environnement', label: 'Environnement' },
  { value: 'autre', label: 'Autre' },
];

const MATURITES: { value: MaturiteProjet; label: string }[] = [
  { value: 'idee', label: 'Idee' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'lancement', label: 'Lancement' },
  { value: 'croissance', label: 'Croissance' },
];

const ROLES_EQUIPE: { value: RoleEquipe; label: string }[] = [
  { value: 'founder', label: 'Fondateur' },
  { value: 'cofounder', label: 'Co-fondateur' },
  { value: 'cto', label: 'CTO' },
  { value: 'cmo', label: 'CMO' },
  { value: 'cfo', label: 'CFO' },
  { value: 'developer', label: 'Developpeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Autre' },
];

const TYPES_LIENS: { value: TypeLien; label: string }[] = [
  { value: 'site', label: 'Site web' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'discord', label: 'Discord' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'doc', label: 'Document' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Autre' },
];

const STEP_LABELS = ['Identite', 'Equipe', 'Proposition', 'Business', 'Medias', 'Recapitulatif'];

const STEP_ICONS = [FileText, Users, Lightbulb, DollarSign, Camera, Check];

// ─── Types ───

interface MembreForm {
  utilisateur?: string;
  nom: string;
  role: RoleEquipe;
  titre: string;
}

interface WizardData {
  nom: string;
  pitch: string;
  description: string;
  categorie: CategorieProjet | '';
  secteur: string;
  tags: string[];
  ville: string;
  equipe: MembreForm[];
  probleme: string;
  solution: string;
  avantageConcurrentiel: string;
  cible: string;
  maturite: MaturiteProjet | '';
  businessModel: string;
  objectifFinancement: string;
  metriques: Metrique[];
  liens: LienProjet[];
  pitchVideo: string;
  coverPreview: string;
  galeriePreview: string[];
}

const emptyWizard: WizardData = {
  nom: '',
  pitch: '',
  description: '',
  categorie: '',
  secteur: '',
  tags: [],
  ville: '',
  equipe: [],
  probleme: '',
  solution: '',
  avantageConcurrentiel: '',
  cible: '',
  maturite: '',
  businessModel: '',
  objectifFinancement: '',
  metriques: [],
  liens: [],
  pitchVideo: '',
  coverPreview: '',
  galeriePreview: [],
};

// ─── Component ───

export default function Entrepreneur() {
  const { utilisateur } = useAuth();

  // Dashboard state
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState('');

  // Wizard state
  const [mode, setMode] = useState<'dashboard' | 'wizard'>('dashboard');
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [step, setStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({ ...emptyWizard });
  const [projetId, setProjetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  // Team friends state
  const [amisEntrepreneurs, setAmisEntrepreneurs] = useState<ProfilUtilisateur[]>([]);
  const [amisLoaded, setAmisLoaded] = useState(false);

  // Guard: only entrepreneur
  if (!utilisateur || utilisateur.statut !== 'entrepreneur') {
    return (
      <div style={styles.accessDenied}>
        <Briefcase size={48} color={couleurs.texteMuted} />
        <h2 style={styles.accessTitle}>Acces reserve aux entrepreneurs</h2>
        <p style={styles.accessText}>
          Cette page est reservee aux utilisateurs avec le statut entrepreneur.
        </p>
      </div>
    );
  }

  // ─── Dashboard logic ───

  const chargerProjets = useCallback(async () => {
    setLoading(true);
    setDashboardError('');
    const res = await getMesProjetsEntrepreneur();
    if (res.succes && res.data) {
      setProjets(res.data.projets);
    } else {
      setDashboardError(res.message || 'Erreur lors du chargement des projets');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mode === 'dashboard') {
      chargerProjets();
    }
  }, [mode, chargerProjets]);

  const handlePublish = async (projet: Projet) => {
    setActionLoading(projet._id);
    const res = projet.statut === 'published'
      ? await depublierProjet(projet._id)
      : await publierProjet(projet._id);
    if (res.succes && res.data) {
      setProjets((prev) => prev.map((p) => (p._id === projet._id ? res.data!.projet : p)));
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    const res = await supprimerProjet(id);
    if (res.succes) {
      setProjets((prev) => prev.filter((p) => p._id !== id));
    }
    setDeleteConfirm(null);
    setActionLoading(null);
  };

  // ─── Wizard logic ───

  const openCreate = () => {
    setEditingProjet(null);
    setProjetId(null);
    setWizardData({ ...emptyWizard });
    setStep(0);
    setErrors({});
    setMode('wizard');
  };

  const openEdit = (projet: Projet) => {
    setEditingProjet(projet);
    setProjetId(projet._id);
    setWizardData({
      nom: projet.nom || '',
      pitch: projet.pitch || '',
      description: projet.description || '',
      categorie: projet.categorie || '',
      secteur: projet.secteur || '',
      tags: projet.tags || [],
      ville: projet.localisation?.ville || '',
      equipe: (projet.equipe || []).map((m) => ({
        utilisateur: m.utilisateur?._id,
        nom: m.nom || (m.utilisateur ? `${m.utilisateur.prenom} ${m.utilisateur.nom}` : ''),
        role: (m.role as RoleEquipe) || 'other',
        titre: m.titre || '',
      })),
      probleme: projet.probleme || '',
      solution: projet.solution || '',
      avantageConcurrentiel: projet.avantageConcurrentiel || '',
      cible: projet.cible || '',
      maturite: projet.maturite || '',
      businessModel: projet.businessModel || '',
      objectifFinancement: projet.objectifFinancement ? String(projet.objectifFinancement) : '',
      metriques: projet.metriques || [],
      liens: projet.liens || [],
      pitchVideo: projet.pitchVideo || '',
      coverPreview: projet.image || '',
      galeriePreview: (projet.galerie || []).map((g) => g.url),
    });
    setStep(0);
    setErrors({});
    setMode('wizard');
  };

  const backToDashboard = () => {
    setMode('dashboard');
    setEditingProjet(null);
    setProjetId(null);
  };

  // Load friends for Step 2
  useEffect(() => {
    if (mode === 'wizard' && step === 1 && !amisLoaded) {
      getMesAmis().then((res) => {
        if (res.succes && res.data) {
          setAmisEntrepreneurs(res.data.amis.filter((a) => a.statut === 'entrepreneur'));
        }
        setAmisLoaded(true);
      });
    }
  }, [mode, step, amisLoaded]);

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!wizardData.nom.trim()) newErrors.nom = 'Le nom est requis';
      if (!wizardData.pitch.trim()) newErrors.pitch = 'Le pitch est requis';
      if (wizardData.pitch.length > 200) newErrors.pitch = 'Le pitch ne doit pas depasser 200 caracteres';
      if (wizardData.description.length > 5000) newErrors.description = 'La description ne doit pas depasser 5000 caracteres';
      if (!wizardData.categorie) newErrors.categorie = 'La categorie est requise';
      if (wizardData.tags.length > 10) newErrors.tags = 'Maximum 10 tags';
    }

    if (step === 2) {
      if (wizardData.probleme.length > 1000) newErrors.probleme = 'Maximum 1000 caracteres';
      if (wizardData.solution.length > 1000) newErrors.solution = 'Maximum 1000 caracteres';
      if (wizardData.avantageConcurrentiel.length > 500) newErrors.avantageConcurrentiel = 'Maximum 500 caracteres';
      if (wizardData.cible.length > 500) newErrors.cible = 'Maximum 500 caracteres';
    }

    if (step === 3) {
      if (wizardData.businessModel.length > 1000) newErrors.businessModel = 'Maximum 1000 caracteres';
      if (wizardData.objectifFinancement && isNaN(Number(wizardData.objectifFinancement))) {
        newErrors.objectifFinancement = 'Doit etre un nombre';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildFormData = (): ProjetFormData => {
    const data: ProjetFormData = {};
    if (wizardData.nom.trim()) data.nom = wizardData.nom.trim();
    if (wizardData.pitch.trim()) data.pitch = wizardData.pitch.trim();
    if (wizardData.description.trim()) data.description = wizardData.description.trim();
    if (wizardData.categorie) data.categorie = wizardData.categorie as CategorieProjet;
    if (wizardData.secteur.trim()) data.secteur = wizardData.secteur.trim();
    if (wizardData.tags.length > 0) data.tags = wizardData.tags;
    if (wizardData.ville.trim()) data.localisation = { ville: wizardData.ville.trim() };
    if (wizardData.probleme.trim()) data.probleme = wizardData.probleme.trim();
    if (wizardData.solution.trim()) data.solution = wizardData.solution.trim();
    if (wizardData.avantageConcurrentiel.trim()) data.avantageConcurrentiel = wizardData.avantageConcurrentiel.trim();
    if (wizardData.cible.trim()) data.cible = wizardData.cible.trim();
    if (wizardData.maturite) data.maturite = wizardData.maturite as MaturiteProjet;
    if (wizardData.businessModel.trim()) data.businessModel = wizardData.businessModel.trim();
    if (wizardData.objectifFinancement) data.objectifFinancement = Number(wizardData.objectifFinancement);
    if (wizardData.metriques.length > 0) data.metriques = wizardData.metriques;
    if (wizardData.liens.length > 0) data.liens = wizardData.liens;
    if (wizardData.pitchVideo.trim()) data.pitchVideo = wizardData.pitchVideo.trim();
    return data;
  };

  const saveStep = async (): Promise<boolean> => {
    if (!validateStep()) return false;
    setSaving(true);
    setErrors({});

    try {
      if (step === 0 && !projetId && !editingProjet) {
        // Create as draft
        const res = await creerProjet(buildFormData());
        if (res.succes && res.data) {
          setProjetId(res.data.projet._id);
          setSaving(false);
          return true;
        }
        setErrors({ general: res.message || 'Erreur lors de la creation' });
        setSaving(false);
        return false;
      }

      const currentId = projetId || editingProjet?._id;
      if (!currentId) {
        setErrors({ general: 'ID du projet manquant' });
        setSaving(false);
        return false;
      }

      // Step 1 (Equipe) uses its own endpoint
      if (step === 1) {
        const membres = wizardData.equipe.map((m) => ({
          utilisateur: m.utilisateur || undefined,
          nom: m.nom,
          role: m.role,
          titre: m.titre || undefined,
        }));
        const res = await gererEquipeProjet(currentId, membres);
        if (!res.succes) {
          setErrors({ general: res.message || 'Erreur lors de la sauvegarde de l\'equipe' });
          setSaving(false);
          return false;
        }
        setSaving(false);
        return true;
      }

      // Other steps use modifierProjet
      const res = await modifierProjet(currentId, buildFormData());
      if (res.succes) {
        setSaving(false);
        return true;
      }
      setErrors({ general: res.message || 'Erreur lors de la sauvegarde' });
      setSaving(false);
      return false;
    } catch {
      setErrors({ general: 'Une erreur est survenue' });
      setSaving(false);
      return false;
    }
  };

  const handleNext = async () => {
    const success = await saveStep();
    if (success && step < 5) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const handlePublishFromWizard = async () => {
    const currentId = projetId || editingProjet?._id;
    if (!currentId) return;
    setSaving(true);
    // Save current data first
    const formData = buildFormData();
    await modifierProjet(currentId, formData);
    const res = await publierProjet(currentId);
    if (res.succes) {
      backToDashboard();
    } else {
      setErrors({ general: res.message || 'Erreur lors de la publication' });
    }
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    const currentId = projetId || editingProjet?._id;
    if (!currentId) return;
    setSaving(true);
    const formData = buildFormData();
    const res = await modifierProjet(currentId, formData);
    if (res.succes) {
      backToDashboard();
    } else {
      setErrors({ general: res.message || 'Erreur lors de la sauvegarde' });
    }
    setSaving(false);
  };

  // Tag management
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && wizardData.tags.length < 10 && !wizardData.tags.includes(tag)) {
      setWizardData({ ...wizardData, tags: [...wizardData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setWizardData({ ...wizardData, tags: wizardData.tags.filter((_, i) => i !== index) });
  };

  // Team management
  const addMembre = (ami: ProfilUtilisateur) => {
    if (wizardData.equipe.some((m) => m.utilisateur === ami._id)) return;
    setWizardData({
      ...wizardData,
      equipe: [
        ...wizardData.equipe,
        { utilisateur: ami._id, nom: `${ami.prenom} ${ami.nom}`, role: 'other', titre: '' },
      ],
    });
  };

  const removeMembre = (index: number) => {
    setWizardData({ ...wizardData, equipe: wizardData.equipe.filter((_, i) => i !== index) });
  };

  const updateMembre = (index: number, field: keyof MembreForm, value: string) => {
    const updated = [...wizardData.equipe];
    updated[index] = { ...updated[index], [field]: value };
    setWizardData({ ...wizardData, equipe: updated });
  };

  // Metriques management
  const addMetrique = () => {
    setWizardData({ ...wizardData, metriques: [...wizardData.metriques, { label: '', valeur: '' }] });
  };

  const removeMetrique = (index: number) => {
    setWizardData({ ...wizardData, metriques: wizardData.metriques.filter((_, i) => i !== index) });
  };

  const updateMetrique = (index: number, field: 'label' | 'valeur', value: string) => {
    const updated = [...wizardData.metriques];
    updated[index] = { ...updated[index], [field]: value };
    setWizardData({ ...wizardData, metriques: updated });
  };

  // Liens management
  const addLien = () => {
    setWizardData({
      ...wizardData,
      liens: [...wizardData.liens, { type: 'site' as TypeLien, url: '', label: '' }],
    });
  };

  const removeLien = (index: number) => {
    setWizardData({ ...wizardData, liens: wizardData.liens.filter((_, i) => i !== index) });
  };

  const updateLien = (index: number, field: keyof LienProjet, value: string) => {
    const updated = [...wizardData.liens];
    updated[index] = { ...updated[index], [field]: value };
    setWizardData({ ...wizardData, liens: updated });
  };

  // File upload helpers
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const currentId = projetId || editingProjet?._id;
    if (!currentId) {
      setErrors({ cover: 'Sauvegardez d\'abord le projet (etape 1) avant d\'uploader des medias' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSaving(true);
      const res = await uploadMediaProjet(currentId, base64, 'image', 'cover');
      if (res.succes && res.data) {
        setWizardData((prev) => ({ ...prev, coverPreview: res.data!.url }));
      } else {
        setErrors({ cover: 'Erreur lors de l\'upload de la couverture' });
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGalerieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const currentId = projetId || editingProjet?._id;
    if (!currentId) {
      setErrors({ galerie: 'Sauvegardez d\'abord le projet (etape 1) avant d\'uploader des medias' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSaving(true);
      const res = await uploadMediaProjet(currentId, base64, 'image', 'galerie');
      if (res.succes && res.data) {
        setWizardData((prev) => ({ ...prev, galeriePreview: [...prev.galeriePreview, res.data!.url] }));
      } else {
        setErrors({ galerie: 'Erreur lors de l\'upload de l\'image' });
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  // ─── Stats ───

  const totalProjets = projets.length;
  const brouillons = projets.filter((p) => p.statut === 'draft').length;
  const publies = projets.filter((p) => p.statut === 'published').length;
  const totalFollowers = projets.reduce((acc, p) => acc + (p.nbFollowers || 0), 0);

  // ─── Render helpers ───

  const renderStepIndicator = () => (
    <div style={styles.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const Icon = STEP_ICONS[i];
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div key={i} style={styles.stepItem}>
            <div
              style={{
                ...styles.stepCircle,
                backgroundColor: isActive ? couleurs.primaire : isDone ? couleurs.succes : couleurs.fondCard,
                borderColor: isActive ? couleurs.primaire : isDone ? couleurs.succes : couleurs.bordure,
              }}
            >
              {isDone ? (
                <Check size={14} color={couleurs.blanc} />
              ) : (
                <Icon size={14} color={isActive ? couleurs.blanc : couleurs.texteSecondaire} />
              )}
            </div>
            <span
              style={{
                ...styles.stepLabel,
                color: isActive ? couleurs.primaire : isDone ? couleurs.succes : couleurs.texteSecondaire,
              }}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  ...styles.stepLine,
                  backgroundColor: isDone ? couleurs.succes : couleurs.bordure,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;
    return <span style={styles.fieldError}>{errors[field]}</span>;
  };

  // ─── Step Renders ───

  const renderStep0 = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Identite du projet</h3>

      <label style={styles.label}>Nom du projet *</label>
      <input
        type="text"
        value={wizardData.nom}
        onChange={(e) => setWizardData({ ...wizardData, nom: e.target.value })}
        placeholder="Le nom de votre projet"
        style={styles.input}
      />
      {renderFieldError('nom')}

      <label style={styles.label}>Pitch * <span style={styles.charCount}>({wizardData.pitch.length}/200)</span></label>
      <textarea
        value={wizardData.pitch}
        onChange={(e) => setWizardData({ ...wizardData, pitch: e.target.value })}
        placeholder="Decrivez votre projet en une phrase percutante"
        style={{ ...styles.input, ...styles.textarea, minHeight: 60 }}
        maxLength={200}
      />
      {renderFieldError('pitch')}

      <label style={styles.label}>Description <span style={styles.charCount}>({wizardData.description.length}/5000)</span></label>
      <textarea
        value={wizardData.description}
        onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
        placeholder="Description detaillee de votre projet"
        style={{ ...styles.input, ...styles.textarea, minHeight: 120 }}
        maxLength={5000}
      />
      {renderFieldError('description')}

      <label style={styles.label}>Categorie *</label>
      <select
        value={wizardData.categorie}
        onChange={(e) => setWizardData({ ...wizardData, categorie: e.target.value as CategorieProjet })}
        style={styles.select}
      >
        <option value="">Choisir une categorie</option>
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>
      {renderFieldError('categorie')}

      <label style={styles.label}>Secteur</label>
      <input
        type="text"
        value={wizardData.secteur}
        onChange={(e) => setWizardData({ ...wizardData, secteur: e.target.value })}
        placeholder="Ex: Fintech, Edtech, Foodtech..."
        style={styles.input}
      />

      <label style={styles.label}>Tags <span style={styles.charCount}>({wizardData.tags.length}/10)</span></label>
      <div style={styles.tagInputRow}>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder="Ajouter un tag et appuyer sur Entree"
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
        />
        <motion.button
          style={styles.btnSmall}
          whileTap={{ scale: 0.95 }}
          onClick={addTag}
          type="button"
        >
          <Plus size={16} />
        </motion.button>
      </div>
      {wizardData.tags.length > 0 && (
        <div style={styles.tagsContainer}>
          {wizardData.tags.map((tag, i) => (
            <span key={i} style={styles.tagChip}>
              {tag}
              <button style={styles.tagRemove} onClick={() => removeTag(i)} type="button">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {renderFieldError('tags')}

      <label style={styles.label}>Ville</label>
      <input
        type="text"
        value={wizardData.ville}
        onChange={(e) => setWizardData({ ...wizardData, ville: e.target.value })}
        placeholder="Ville du projet"
        style={styles.input}
      />
    </div>
  );

  const renderStep1 = () => {
    const availableFriends = amisEntrepreneurs.filter(
      (ami) => !wizardData.equipe.some((m) => m.utilisateur === ami._id)
    );

    return (
      <div style={styles.stepContent}>
        <h3 style={styles.stepTitle}>Equipe</h3>

        {wizardData.equipe.length > 0 && (
          <div style={styles.membresList}>
            {wizardData.equipe.map((membre, i) => (
              <div key={i} style={styles.membreCard}>
                <div style={styles.membreHeader}>
                  <span style={styles.membreNom}>{membre.nom}</span>
                  <button style={styles.membreRemove} onClick={() => removeMembre(i)} type="button">
                    <X size={16} color={couleurs.danger} />
                  </button>
                </div>
                <div style={styles.membreFields}>
                  <select
                    value={membre.role}
                    onChange={(e) => updateMembre(i, 'role', e.target.value)}
                    style={{ ...styles.select, marginBottom: 0, flex: 1 }}
                  >
                    {ROLES_EQUIPE.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={membre.titre}
                    onChange={(e) => updateMembre(i, 'titre', e.target.value)}
                    placeholder="Titre (optionnel)"
                    style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.addMembreSection}>
          <h4 style={styles.subTitle}>Ajouter un membre</h4>
          {!amisLoaded ? (
            <p style={styles.loadingText}>Chargement des amis...</p>
          ) : availableFriends.length > 0 ? (
            <div style={styles.amisList}>
              {availableFriends.map((ami) => (
                <motion.button
                  key={ami._id}
                  style={styles.amiOption}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addMembre(ami)}
                  type="button"
                >
                  <div style={styles.amiAvatar}>
                    {ami.avatar ? (
                      <img src={ami.avatar} alt="" style={styles.amiAvatarImg} />
                    ) : (
                      <span style={styles.amiInitial}>{ami.prenom[0]}</span>
                    )}
                  </div>
                  <span style={styles.amiOptionName}>{ami.prenom} {ami.nom}</span>
                  <Plus size={16} color={couleurs.primaire} />
                </motion.button>
              ))}
            </div>
          ) : (
            <p style={styles.noFriendsText}>
              Seuls vos amis entrepreneurs peuvent etre ajoutes.
              {amisEntrepreneurs.length === 0 && ' Aucun ami entrepreneur trouve.'}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Proposition de valeur</h3>

      <label style={styles.label}>Probleme <span style={styles.charCount}>({wizardData.probleme.length}/1000)</span></label>
      <textarea
        value={wizardData.probleme}
        onChange={(e) => setWizardData({ ...wizardData, probleme: e.target.value })}
        placeholder="Quel probleme resolvez-vous ?"
        style={{ ...styles.input, ...styles.textarea, minHeight: 100 }}
        maxLength={1000}
      />
      {renderFieldError('probleme')}

      <label style={styles.label}>Solution <span style={styles.charCount}>({wizardData.solution.length}/1000)</span></label>
      <textarea
        value={wizardData.solution}
        onChange={(e) => setWizardData({ ...wizardData, solution: e.target.value })}
        placeholder="Comment resolvez-vous ce probleme ?"
        style={{ ...styles.input, ...styles.textarea, minHeight: 100 }}
        maxLength={1000}
      />
      {renderFieldError('solution')}

      <label style={styles.label}>Avantage concurrentiel <span style={styles.charCount}>({wizardData.avantageConcurrentiel.length}/500)</span></label>
      <textarea
        value={wizardData.avantageConcurrentiel}
        onChange={(e) => setWizardData({ ...wizardData, avantageConcurrentiel: e.target.value })}
        placeholder="Qu'est-ce qui vous differencie ?"
        style={{ ...styles.input, ...styles.textarea, minHeight: 80 }}
        maxLength={500}
      />
      {renderFieldError('avantageConcurrentiel')}

      <label style={styles.label}>Cible <span style={styles.charCount}>({wizardData.cible.length}/500)</span></label>
      <textarea
        value={wizardData.cible}
        onChange={(e) => setWizardData({ ...wizardData, cible: e.target.value })}
        placeholder="Qui est votre client ideal ?"
        style={{ ...styles.input, ...styles.textarea, minHeight: 80 }}
        maxLength={500}
      />
      {renderFieldError('cible')}
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Business</h3>

      <label style={styles.label}>Maturite</label>
      <div style={styles.radioGroup}>
        {MATURITES.map((m) => (
          <motion.button
            key={m.value}
            style={{
              ...styles.radioBtn,
              backgroundColor: wizardData.maturite === m.value ? couleurs.primaireLight : 'transparent',
              borderColor: wizardData.maturite === m.value ? couleurs.primaire : couleurs.bordure,
              color: wizardData.maturite === m.value ? couleurs.primaire : couleurs.texteSecondaire,
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setWizardData({ ...wizardData, maturite: m.value })}
            type="button"
          >
            {m.label}
          </motion.button>
        ))}
      </div>

      <label style={styles.label}>Business Model <span style={styles.charCount}>({wizardData.businessModel.length}/1000)</span></label>
      <textarea
        value={wizardData.businessModel}
        onChange={(e) => setWizardData({ ...wizardData, businessModel: e.target.value })}
        placeholder="Comment generez-vous des revenus ?"
        style={{ ...styles.input, ...styles.textarea, minHeight: 100 }}
        maxLength={1000}
      />
      {renderFieldError('businessModel')}

      <label style={styles.label}>Objectif de financement (EUR)</label>
      <input
        type="number"
        value={wizardData.objectifFinancement}
        onChange={(e) => setWizardData({ ...wizardData, objectifFinancement: e.target.value })}
        placeholder="Ex: 50000"
        style={styles.input}
        min={0}
      />
      {renderFieldError('objectifFinancement')}

      <div style={styles.sectionHeader}>
        <label style={styles.label}>Metriques</label>
        <motion.button style={styles.btnSmall} whileTap={{ scale: 0.95 }} onClick={addMetrique} type="button">
          <Plus size={14} /> Ajouter
        </motion.button>
      </div>
      {wizardData.metriques.map((m, i) => (
        <div key={i} style={styles.inlineRow}>
          <input
            type="text"
            value={m.label}
            onChange={(e) => updateMetrique(i, 'label', e.target.value)}
            placeholder="Label (ex: Utilisateurs)"
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          />
          <input
            type="text"
            value={m.valeur}
            onChange={(e) => updateMetrique(i, 'valeur', e.target.value)}
            placeholder="Valeur (ex: 1500)"
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          />
          <button style={styles.removeBtn} onClick={() => removeMetrique(i)} type="button">
            <X size={16} />
          </button>
        </div>
      ))}

      <div style={styles.sectionHeader}>
        <label style={styles.label}>Liens</label>
        <motion.button style={styles.btnSmall} whileTap={{ scale: 0.95 }} onClick={addLien} type="button">
          <LinkIcon size={14} /> Ajouter
        </motion.button>
      </div>
      {wizardData.liens.map((l, i) => (
        <div key={i} style={styles.lienRow}>
          <select
            value={l.type}
            onChange={(e) => updateLien(i, 'type', e.target.value)}
            style={{ ...styles.select, marginBottom: 0, minWidth: 120 }}
          >
            {TYPES_LIENS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="url"
            value={l.url}
            onChange={(e) => updateLien(i, 'url', e.target.value)}
            placeholder="URL"
            style={{ ...styles.input, flex: 2, marginBottom: 0 }}
          />
          <input
            type="text"
            value={l.label || ''}
            onChange={(e) => updateLien(i, 'label', e.target.value)}
            placeholder="Label (optionnel)"
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          />
          <button style={styles.removeBtn} onClick={() => removeLien(i)} type="button">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  const renderStep4 = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Medias</h3>

      <label style={styles.label}>Image de couverture</label>
      {wizardData.coverPreview && (
        <div style={styles.coverPreviewContainer}>
          <img src={wizardData.coverPreview} alt="Cover" style={styles.coverPreviewImg} />
        </div>
      )}
      <label style={styles.uploadLabel}>
        <Upload size={18} />
        <span>{wizardData.coverPreview ? 'Changer la couverture' : 'Uploader une couverture'}</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          style={styles.hiddenInput}
        />
      </label>
      {renderFieldError('cover')}

      <label style={{ ...styles.label, marginTop: 24 }}>Galerie</label>
      {wizardData.galeriePreview.length > 0 && (
        <div style={styles.galerieGrid}>
          {wizardData.galeriePreview.map((url, i) => (
            <div key={i} style={styles.galerieItem}>
              <img src={url} alt={`Galerie ${i + 1}`} style={styles.galerieImg} />
            </div>
          ))}
        </div>
      )}
      <label style={styles.uploadLabel}>
        <Image size={18} />
        <span>Ajouter une image a la galerie</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleGalerieUpload}
          style={styles.hiddenInput}
        />
      </label>
      {renderFieldError('galerie')}

      <label style={{ ...styles.label, marginTop: 24 }}>Video pitch (URL)</label>
      <input
        type="url"
        value={wizardData.pitchVideo}
        onChange={(e) => setWizardData({ ...wizardData, pitchVideo: e.target.value })}
        placeholder="https://youtube.com/watch?v=..."
        style={styles.input}
      />
    </div>
  );

  const renderStep5 = () => {
    const catLabel = CATEGORIES.find((c) => c.value === wizardData.categorie)?.label || wizardData.categorie;
    const matLabel = MATURITES.find((m) => m.value === wizardData.maturite)?.label || wizardData.maturite;

    return (
      <div style={styles.stepContent}>
        <h3 style={styles.stepTitle}>Recapitulatif</h3>

        <div style={styles.recapSection}>
          <h4 style={styles.recapTitle}>Identite</h4>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Nom:</span> <span style={styles.recapValue}>{wizardData.nom || '-'}</span></div>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Pitch:</span> <span style={styles.recapValue}>{wizardData.pitch || '-'}</span></div>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Categorie:</span> <span style={styles.recapValue}>{catLabel || '-'}</span></div>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Secteur:</span> <span style={styles.recapValue}>{wizardData.secteur || '-'}</span></div>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Ville:</span> <span style={styles.recapValue}>{wizardData.ville || '-'}</span></div>
          {wizardData.tags.length > 0 && (
            <div style={styles.recapRow}>
              <span style={styles.recapLabel}>Tags:</span>
              <div style={styles.tagsContainer}>
                {wizardData.tags.map((tag, i) => (
                  <span key={i} style={styles.tagChipSmall}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {wizardData.equipe.length > 0 && (
          <div style={styles.recapSection}>
            <h4 style={styles.recapTitle}>Equipe ({wizardData.equipe.length} membres)</h4>
            {wizardData.equipe.map((m, i) => (
              <div key={i} style={styles.recapRow}>
                <span style={styles.recapLabel}>{m.nom}:</span>
                <span style={styles.recapValue}>
                  {ROLES_EQUIPE.find((r) => r.value === m.role)?.label || m.role}
                  {m.titre ? ` - ${m.titre}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.recapSection}>
          <h4 style={styles.recapTitle}>Proposition</h4>
          {wizardData.probleme && <div style={styles.recapRow}><span style={styles.recapLabel}>Probleme:</span> <span style={styles.recapValue}>{wizardData.probleme}</span></div>}
          {wizardData.solution && <div style={styles.recapRow}><span style={styles.recapLabel}>Solution:</span> <span style={styles.recapValue}>{wizardData.solution}</span></div>}
          {wizardData.avantageConcurrentiel && <div style={styles.recapRow}><span style={styles.recapLabel}>Avantage:</span> <span style={styles.recapValue}>{wizardData.avantageConcurrentiel}</span></div>}
          {wizardData.cible && <div style={styles.recapRow}><span style={styles.recapLabel}>Cible:</span> <span style={styles.recapValue}>{wizardData.cible}</span></div>}
        </div>

        <div style={styles.recapSection}>
          <h4 style={styles.recapTitle}>Business</h4>
          <div style={styles.recapRow}><span style={styles.recapLabel}>Maturite:</span> <span style={styles.recapValue}>{matLabel || '-'}</span></div>
          {wizardData.businessModel && <div style={styles.recapRow}><span style={styles.recapLabel}>Business Model:</span> <span style={styles.recapValue}>{wizardData.businessModel}</span></div>}
          {wizardData.objectifFinancement && <div style={styles.recapRow}><span style={styles.recapLabel}>Objectif:</span> <span style={styles.recapValue}>{Number(wizardData.objectifFinancement).toLocaleString('fr-FR')} EUR</span></div>}
          {wizardData.metriques.length > 0 && wizardData.metriques.map((m, i) => (
            <div key={i} style={styles.recapRow}>
              <span style={styles.recapLabel}>{m.label}:</span>
              <span style={styles.recapValue}>{m.valeur}</span>
            </div>
          ))}
          {wizardData.liens.length > 0 && wizardData.liens.map((l, i) => (
            <div key={i} style={styles.recapRow}>
              <span style={styles.recapLabel}>{TYPES_LIENS.find((t) => t.value === l.type)?.label || l.type}:</span>
              <span style={styles.recapValue}>{l.url}</span>
            </div>
          ))}
        </div>

        <div style={styles.recapSection}>
          <h4 style={styles.recapTitle}>Medias</h4>
          {wizardData.coverPreview && (
            <div style={styles.recapRow}>
              <span style={styles.recapLabel}>Couverture:</span>
              <img src={wizardData.coverPreview} alt="Cover" style={styles.recapImg} />
            </div>
          )}
          {wizardData.galeriePreview.length > 0 && (
            <div style={styles.recapRow}>
              <span style={styles.recapLabel}>Galerie:</span>
              <span style={styles.recapValue}>{wizardData.galeriePreview.length} image(s)</span>
            </div>
          )}
          {wizardData.pitchVideo && <div style={styles.recapRow}><span style={styles.recapLabel}>Video:</span> <span style={styles.recapValue}>{wizardData.pitchVideo}</span></div>}
        </div>

        {errors.general && <span style={styles.fieldError}>{errors.general}</span>}

        <div style={styles.recapActions}>
          <motion.button
            style={styles.btnSecondaryLg}
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveDraft}
            disabled={saving}
            type="button"
          >
            <Layers size={18} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder en brouillon'}
          </motion.button>
          <motion.button
            style={styles.btnPrimaryLg}
            whileTap={{ scale: 0.97 }}
            onClick={handlePublishFromWizard}
            disabled={saving}
            type="button"
          >
            <Eye size={18} />
            {saving ? 'Publication...' : 'Publier'}
          </motion.button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  // ─── Render ───

  if (mode === 'wizard') {
    return (
      <div style={styles.page}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.wizardHeader}
        >
          <motion.button
            style={styles.backBtn}
            whileTap={{ scale: 0.95 }}
            onClick={backToDashboard}
            type="button"
          >
            <ChevronLeft size={20} />
            Retour
          </motion.button>
          <h2 style={styles.wizardTitle}>
            {editingProjet ? `Modifier: ${editingProjet.nom}` : 'Nouveau projet'}
          </h2>
        </motion.div>

        {renderStepIndicator()}

        {errors.general && step !== 5 && (
          <div style={styles.generalError}>{errors.general}</div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>

        {step < 5 && (
          <div style={styles.wizardNav}>
            <motion.button
              style={{ ...styles.navBtn, visibility: step === 0 ? 'hidden' : 'visible' }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePrev}
              type="button"
            >
              <ChevronLeft size={18} /> Precedent
            </motion.button>
            <motion.button
              style={styles.navBtnPrimary}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={saving}
              type="button"
            >
              {saving ? 'Sauvegarde...' : step === 4 ? 'Voir le recapitulatif' : 'Suivant'}
              {!saving && <ChevronRight size={18} />}
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  // ─── Dashboard Render ───

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.dashboardHeader}
      >
        <div>
          <h1 style={styles.pageTitle}>Mes projets</h1>
          <p style={styles.pageSubtitle}>Gerez vos projets entrepreneuriaux</p>
        </div>
        <motion.button
          style={styles.createBtn}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          type="button"
        >
          <Plus size={18} />
          Creer un projet
        </motion.button>
      </motion.div>

      {dashboardError && <div style={styles.generalError}>{dashboardError}</div>}

      {/* Stats */}
      <div style={styles.statsGrid}>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Briefcase size={22} color={couleurs.primaire} />
          <span style={styles.statValue}>{totalProjets}</span>
          <span style={styles.statLabel}>Total projets</span>
        </motion.div>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Layers size={22} color={couleurs.warning} />
          <span style={styles.statValue}>{brouillons}</span>
          <span style={styles.statLabel}>Brouillons</span>
        </motion.div>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Eye size={22} color={couleurs.succes} />
          <span style={styles.statValue}>{publies}</span>
          <span style={styles.statLabel}>Publies</span>
        </motion.div>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Users size={22} color={couleurs.secondaire} />
          <span style={styles.statValue}>{totalFollowers}</span>
          <span style={styles.statLabel}>Followers</span>
        </motion.div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div style={styles.projectsList}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14, marginBottom: 12 }} />
          ))}
        </div>
      ) : projets.length > 0 ? (
        <div style={styles.projectsList}>
          {projets.map((projet, i) => (
            <motion.div
              key={projet._id}
              style={styles.projetCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={styles.projetCardInner}>
                <div style={styles.projetImgBox}>
                  <img
                    src={projet.image || projet.logo || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=120&fit=crop&q=80'}
                    alt={projet.nom}
                    style={styles.projetCardImg}
                  />
                </div>
                <div style={styles.projetCardInfo}>
                  <div style={styles.projetCardTop}>
                    <h3 style={styles.projetCardNom}>{projet.nom}</h3>
                    <span
                      style={{
                        ...styles.statutBadge,
                        backgroundColor: projet.statut === 'published' ? couleurs.succesLight : couleurs.accentLight,
                        color: projet.statut === 'published' ? couleurs.succes : couleurs.accent,
                      }}
                    >
                      {projet.statut === 'published' ? 'Publie' : 'Brouillon'}
                    </span>
                  </div>
                  {projet.pitch && <p style={styles.projetCardPitch}>{projet.pitch}</p>}
                  <div style={styles.projetCardMeta}>
                    <span style={styles.metaSmall}>
                      <Users size={12} /> {projet.nbFollowers || 0} followers
                    </span>
                    <span style={styles.metaSmall}>
                      <BarChart3 size={12} /> {new Date(projet.dateCreation).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div style={styles.projetCardActions}>
                  <motion.button
                    style={styles.actionBtn}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEdit(projet)}
                    title="Modifier"
                    type="button"
                  >
                    <Pencil size={16} color={couleurs.primaire} />
                  </motion.button>
                  <motion.button
                    style={styles.actionBtn}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePublish(projet)}
                    disabled={actionLoading === projet._id}
                    title={projet.statut === 'published' ? 'Depublier' : 'Publier'}
                    type="button"
                  >
                    {projet.statut === 'published' ? (
                      <EyeOff size={16} color={couleurs.warning} />
                    ) : (
                      <Eye size={16} color={couleurs.succes} />
                    )}
                  </motion.button>
                  {deleteConfirm === projet._id ? (
                    <div style={styles.deleteConfirmRow}>
                      <motion.button
                        style={styles.confirmYes}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(projet._id)}
                        disabled={actionLoading === projet._id}
                        type="button"
                      >
                        <Check size={14} />
                      </motion.button>
                      <motion.button
                        style={styles.confirmNo}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(null)}
                        type="button"
                      >
                        <X size={14} />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      style={styles.actionBtn}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirm(projet._id)}
                      title="Supprimer"
                      type="button"
                    >
                      <Trash2 size={16} color={couleurs.danger} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          <Briefcase size={48} color={couleurs.texteMuted} />
          <p style={styles.emptyTitle}>Aucun projet</p>
          <p style={styles.emptySubtext}>Creez votre premier projet pour commencer</p>
          <motion.button
            style={styles.createBtn}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            type="button"
          >
            <Plus size={18} />
            Creer un projet
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  page: {},

  // Access denied
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
    textAlign: 'center',
  },
  accessTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  accessText: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    maxWidth: 400,
  },

  // Dashboard header
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  pageSubtitle: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 20,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },

  // Project list
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  projetCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden',
    transition: 'box-shadow 200ms ease',
  },
  projetCardInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  projetImgBox: {
    width: 80,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  projetCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  projetCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  projetCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  projetCardNom: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  statutBadge: {
    padding: '2px 10px',
    borderRadius: 8,
    fontSize: '0.6875rem',
    fontWeight: '600',
  },
  projetCardPitch: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginBottom: 6,
  },
  projetCardMeta: {
    display: 'flex',
    gap: 16,
  },
  metaSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  projetCardActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
  },
  deleteConfirmRow: {
    display: 'flex',
    gap: 4,
  },
  confirmYes: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: couleurs.dangerLight,
    border: 'none',
    cursor: 'pointer',
    color: couleurs.danger,
  },
  confirmNo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    color: couleurs.texteSecondaire,
  },

  // Empty state
  empty: {
    textAlign: 'center' as const,
    padding: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  emptySubtext: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    marginBottom: 8,
  },

  // General error
  generalError: {
    padding: '12px 16px',
    borderRadius: 10,
    backgroundColor: couleurs.dangerLight,
    color: couleurs.danger,
    fontSize: '0.875rem',
    marginBottom: 16,
  },

  // ─── Wizard styles ───
  wizardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    borderRadius: 10,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  wizardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
  },

  // Step indicator
  stepIndicator: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 32,
    overflowX: 'auto',
    padding: '0 8px',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    minWidth: 80,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
    transition: 'all 200ms ease',
  },
  stepLabel: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    textAlign: 'center',
    transition: 'color 200ms ease',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '60%',
    width: '80%',
    height: 2,
    transition: 'background-color 200ms ease',
  },

  // Step content
  stepContent: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    padding: 24,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 20,
  },
  subTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 12,
  },

  // Form fields
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 6,
    marginTop: 16,
  },
  charCount: {
    fontWeight: '400',
    color: couleurs.texteMuted,
    fontSize: '0.75rem',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    marginBottom: 4,
    boxSizing: 'border-box',
  },
  textarea: {
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    marginBottom: 4,
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  fieldError: {
    display: 'block',
    fontSize: '0.75rem',
    color: couleurs.danger,
    marginTop: 2,
    marginBottom: 4,
  },

  // Tags
  tagInputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    borderRadius: 20,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    fontWeight: '500',
  },
  tagChipSmall: {
    padding: '2px 10px',
    borderRadius: 12,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  tagRemove: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: couleurs.primaire,
    padding: 0,
  },
  btnSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    border: `1px solid ${couleurs.primaire}`,
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    flexShrink: 0,
  },

  // Radio buttons
  radioGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  radioBtn: {
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 150ms ease',
    backgroundColor: 'transparent',
  },

  // Section headers
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },

  // Inline row
  inlineRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  lienRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: couleurs.dangerLight,
    border: 'none',
    cursor: 'pointer',
    color: couleurs.danger,
    flexShrink: 0,
  },

  // Team
  membresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  membreCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
  },
  membreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membreNom: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  membreRemove: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  membreFields: {
    display: 'flex',
    gap: 10,
  },
  addMembreSection: {
    marginTop: 8,
  },
  loadingText: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    padding: 16,
  },
  amisList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 240,
    overflowY: 'auto',
  },
  amiOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  amiAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  amiAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  amiInitial: {
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  amiOptionName: {
    flex: 1,
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: couleurs.texte,
  },
  noFriendsText: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    padding: 16,
    textAlign: 'center',
    backgroundColor: couleurs.fond,
    borderRadius: 10,
    border: `1px solid ${couleurs.bordure}`,
  },

  // Media upload
  uploadLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 20px',
    borderRadius: 12,
    border: `2px dashed ${couleurs.bordure}`,
    backgroundColor: couleurs.fond,
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    marginTop: 8,
    transition: 'border-color 200ms ease',
  },
  hiddenInput: {
    display: 'none',
  },
  coverPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    maxHeight: 200,
  },
  coverPreviewImg: {
    width: '100%',
    height: 200,
    objectFit: 'cover' as const,
    borderRadius: 12,
  },
  galerieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 8,
    marginBottom: 8,
  },
  galerieItem: {
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: '1',
  },
  galerieImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },

  // Recap
  recapSection: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 12,
  },
  recapTitle: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: couleurs.primaire,
    marginBottom: 10,
  },
  recapRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  recapLabel: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    minWidth: 100,
    flexShrink: 0,
  },
  recapValue: {
    fontSize: '0.8125rem',
    color: couleurs.texte,
    flex: 1,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  recapImg: {
    width: 120,
    height: 70,
    objectFit: 'cover' as const,
    borderRadius: 8,
  },
  recapActions: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnSecondaryLg: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPrimaryLg: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // Wizard nav
  wizardNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  navBtnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 24px',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
