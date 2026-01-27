import { useState } from 'react';
import { HiUser, HiMail, HiShieldCheck, HiLogout } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';

const Parametres = () => {
  const { utilisateur, deconnexion } = useAuth();
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifProjets, setNotifProjets] = useState(true);
  const [notifLive, setNotifLive] = useState(true);

  const handleDeconnexion = () => {
    deconnexion();
    window.location.href = '/';
  };

  return (
    <div className="parametres">
      <h2 className="espace-titre">Paramètres</h2>

      <section className="parametres-section">
        <h3 className="parametres-section-titre">
          <HiUser /> Profil
        </h3>
        <div className="parametres-card">
          <div className="parametres-avatar">
            {utilisateur?.avatar ? (
              <img src={utilisateur.avatar} alt="Avatar" />
            ) : (
              <span>{utilisateur?.prenom?.charAt(0) || 'U'}</span>
            )}
          </div>
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
              <span style={{ textTransform: 'capitalize' }}>{utilisateur?.provider || 'local'}</span>
            </div>
          </div>
        </div>
      </section>

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

      <section className="parametres-section">
        <h3 className="parametres-section-titre">
          <HiShieldCheck /> Confidentialité
        </h3>
        <div className="parametres-card">
          <p className="parametres-texte">
            Tes données sont protégées conformément au RGPD. Tu peux demander la suppression de ton compte à tout moment.
          </p>
        </div>
      </section>

      <div className="parametres-actions">
        <button className="btn btn-secondary" onClick={handleDeconnexion}>
          <HiLogout style={{ marginRight: '8px' }} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Parametres;
