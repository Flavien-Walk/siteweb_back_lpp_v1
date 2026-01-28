import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUser,
  HiMail,
  HiLockClosed,
  HiShieldCheck,
  HiLogout,
  HiPencil,
  HiCheck,
  HiX,
  HiExclamation,
  HiTrash,
} from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import { modifierProfil, changerMotDePasse, supprimerCompteAvecBody } from '../../services/profil';

type EditMode = 'none' | 'profil' | 'password';

const Parametres = () => {
  const { utilisateur, deconnexion, rafraichirUtilisateur } = useAuth();
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // États pour l'édition du profil
  const [prenom, setPrenom] = useState(utilisateur?.prenom || '');
  const [nom, setNom] = useState(utilisateur?.nom || '');
  const [email, setEmail] = useState(utilisateur?.email || '');

  // États pour le changement de mot de passe
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');

  // États pour la suppression du compte
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Préférences notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifProjets, setNotifProjets] = useState(true);
  const [notifLive, setNotifLive] = useState(true);

  const handleDeconnexion = () => {
    deconnexion();
    window.location.href = '/';
  };

  const resetMessages = () => {
    setErreur('');
    setSucces('');
  };

  const handleEditProfil = () => {
    setPrenom(utilisateur?.prenom || '');
    setNom(utilisateur?.nom || '');
    setEmail(utilisateur?.email || '');
    setEditMode('profil');
    resetMessages();
  };

  const handleEditPassword = () => {
    setMotDePasseActuel('');
    setNouveauMotDePasse('');
    setConfirmationMotDePasse('');
    setEditMode('password');
    resetMessages();
  };

  const handleCancelEdit = () => {
    setEditMode('none');
    resetMessages();
  };

  const handleSaveProfil = async () => {
    resetMessages();
    setChargement(true);

    try {
      const donnees: { prenom?: string; nom?: string; email?: string } = {};
      if (prenom !== utilisateur?.prenom) donnees.prenom = prenom;
      if (nom !== utilisateur?.nom) donnees.nom = nom;
      if (email !== utilisateur?.email) donnees.email = email;

      if (Object.keys(donnees).length === 0) {
        setEditMode('none');
        setChargement(false);
        return;
      }

      const res = await modifierProfil(donnees);
      if (res.succes) {
        setSucces('Profil mis à jour avec succès !');
        await rafraichirUtilisateur();
        setEditMode('none');
      } else {
        setErreur(res.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setErreur('Une erreur est survenue');
    } finally {
      setChargement(false);
    }
  };

  const handleSavePassword = async () => {
    resetMessages();

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreur('Les mots de passe ne correspondent pas');
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setChargement(true);

    try {
      const res = await changerMotDePasse({
        motDePasseActuel,
        nouveauMotDePasse,
        confirmationMotDePasse,
      });

      if (res.succes) {
        setSucces('Mot de passe changé avec succès !');
        setEditMode('none');
      } else {
        setErreur(res.message || 'Erreur lors du changement de mot de passe');
      }
    } catch {
      setErreur('Une erreur est survenue');
    } finally {
      setChargement(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER MON COMPTE') {
      setErreur('Veuillez taper exactement "SUPPRIMER MON COMPTE"');
      return;
    }

    setChargement(true);
    resetMessages();

    try {
      const res = await supprimerCompteAvecBody({
        motDePasse: deletePassword || undefined,
        confirmation: 'SUPPRIMER MON COMPTE',
      });

      if (res.succes) {
        deconnexion();
        window.location.href = '/';
      } else {
        setErreur(res.message || 'Erreur lors de la suppression');
      }
    } catch {
      setErreur('Une erreur est survenue');
    } finally {
      setChargement(false);
    }
  };

  const isLocalAccount = utilisateur?.provider === 'local';

  return (
    <div className="parametres">
      <h2 className="espace-titre">Paramètres</h2>

      {/* Messages */}
      <AnimatePresence>
        {erreur && (
          <motion.div
            className="parametres-message parametres-message-erreur"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <HiExclamation />
            {erreur}
          </motion.div>
        )}
        {succes && (
          <motion.div
            className="parametres-message parametres-message-succes"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <HiCheck />
            {succes}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Profil */}
      <section className="parametres-section">
        <div className="parametres-section-header">
          <h3 className="parametres-section-titre">
            <HiUser /> Profil
          </h3>
          {editMode !== 'profil' && (
            <button className="parametres-edit-btn" onClick={handleEditProfil}>
              <HiPencil /> Modifier
            </button>
          )}
        </div>

        <div className="parametres-card">
          <div className="parametres-avatar">
            {utilisateur?.avatar ? (
              <img src={utilisateur.avatar} alt="Avatar" />
            ) : (
              <span>{utilisateur?.prenom?.charAt(0) || 'U'}</span>
            )}
          </div>

          {editMode === 'profil' ? (
            <div className="parametres-form">
              <div className="parametres-form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Ton prénom"
                />
              </div>
              <div className="parametres-form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ton nom"
                />
              </div>
              <div className="parametres-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                />
              </div>
              <div className="parametres-form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={chargement}
                >
                  <HiX /> Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfil}
                  disabled={chargement}
                >
                  {chargement ? 'Enregistrement...' : <><HiCheck /> Enregistrer</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="parametres-info">
              <div className="parametres-champ">
                <label>Prénom</label>
                <span>{utilisateur?.prenom}</span>
              </div>
              <div className="parametres-champ">
                <label>Nom</label>
                <span>{utilisateur?.nom}</span>
              </div>
              <div className="parametres-champ">
                <label>Email</label>
                <span>{utilisateur?.email}</span>
              </div>
              <div className="parametres-champ">
                <label>Compte</label>
                <span className="parametres-provider-badge">
                  {utilisateur?.provider || 'local'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section Mot de passe (uniquement pour les comptes locaux) */}
      {isLocalAccount && (
        <section className="parametres-section">
          <div className="parametres-section-header">
            <h3 className="parametres-section-titre">
              <HiLockClosed /> Mot de passe
            </h3>
            {editMode !== 'password' && (
              <button className="parametres-edit-btn" onClick={handleEditPassword}>
                <HiPencil /> Modifier
              </button>
            )}
          </div>

          <div className="parametres-card">
            {editMode === 'password' ? (
              <div className="parametres-form">
                <div className="parametres-form-group">
                  <label>Mot de passe actuel</label>
                  <input
                    type="password"
                    value={motDePasseActuel}
                    onChange={(e) => setMotDePasseActuel(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="parametres-form-group">
                  <label>Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    placeholder="Min. 8 caractères"
                  />
                </div>
                <div className="parametres-form-group">
                  <label>Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={confirmationMotDePasse}
                    onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="parametres-form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={chargement}
                  >
                    <HiX /> Annuler
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSavePassword}
                    disabled={chargement}
                  >
                    {chargement ? 'Enregistrement...' : <><HiCheck /> Enregistrer</>}
                  </button>
                </div>
              </div>
            ) : (
              <p className="parametres-texte">
                Ton mot de passe est sécurisé. Tu peux le modifier à tout moment.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Section Notifications */}
      <section className="parametres-section">
        <h3 className="parametres-section-titre">
          <HiMail /> Préférences de notifications
        </h3>
        <div className="parametres-card">
          <label className="parametres-toggle">
            <span>Notifications par email</span>
            <input
              type="checkbox"
              checked={notifEmail}
              onChange={(e) => setNotifEmail(e.target.checked)}
            />
          </label>
          <label className="parametres-toggle">
            <span>Mises à jour des projets suivis</span>
            <input
              type="checkbox"
              checked={notifProjets}
              onChange={(e) => setNotifProjets(e.target.checked)}
            />
          </label>
          <label className="parametres-toggle">
            <span>Rappels de lives</span>
            <input
              type="checkbox"
              checked={notifLive}
              onChange={(e) => setNotifLive(e.target.checked)}
            />
          </label>
        </div>
      </section>

      {/* Section Confidentialité & Suppression */}
      <section className="parametres-section">
        <h3 className="parametres-section-titre">
          <HiShieldCheck /> Confidentialité
        </h3>
        <div className="parametres-card">
          <p className="parametres-texte">
            Tes données sont protégées conformément au RGPD. Tu peux demander la suppression de ton compte à tout moment.
          </p>
          <button
            className="parametres-delete-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            <HiTrash /> Supprimer mon compte
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="parametres-actions">
        <button className="btn btn-secondary" onClick={handleDeconnexion}>
          <HiLogout style={{ marginRight: '8px' }} />
          Se déconnecter
        </button>
      </div>

      {/* Modal de suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="parametres-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              className="parametres-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="parametres-modal-header">
                <HiExclamation className="parametres-modal-icon-danger" />
                <h3>Supprimer ton compte</h3>
              </div>

              <div className="parametres-modal-content">
                <p className="parametres-modal-warning">
                  Cette action est <strong>irréversible</strong>. Toutes tes données seront supprimées définitivement.
                </p>

                {isLocalAccount && (
                  <div className="parametres-form-group">
                    <label>Mot de passe</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Confirme avec ton mot de passe"
                    />
                  </div>
                )}

                <div className="parametres-form-group">
                  <label>Pour confirmer, tape : SUPPRIMER MON COMPTE</label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="SUPPRIMER MON COMPTE"
                  />
                </div>

                {erreur && (
                  <p className="parametres-modal-error">{erreur}</p>
                )}
              </div>

              <div className="parametres-modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmation('');
                    resetMessages();
                  }}
                  disabled={chargement}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={chargement || deleteConfirmation !== 'SUPPRIMER MON COMPTE'}
                >
                  {chargement ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Parametres;
