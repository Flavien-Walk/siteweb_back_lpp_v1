import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiGlobe,
  HiFolder,
  HiNewspaper,
  HiPlay,
  HiCog,
  HiBell,
} from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import DecouvrirProjets from '../components/Espace/DecouvrirProjets';
import MesProjets from '../components/Espace/MesProjets';
import FilActualite from '../components/Espace/FilActualite';
import LivesReplays from '../components/Espace/LivesReplays';
import Parametres from '../components/Espace/Parametres';
import NotificationsPanel from '../components/Espace/NotificationsPanel';
import NotificationDropdown from '../components/Espace/NotificationDropdown';
import logoLpp from '../assets/logo-lpp.svg';
import '../styles/espace.css';

type Onglet = 'decouvrir' | 'mes-projets' | 'fil' | 'lives' | 'notifications' | 'parametres';

const onglets: { id: Onglet; label: string; icon: React.ReactNode }[] = [
  { id: 'decouvrir', label: 'Découvrir', icon: <HiGlobe size={20} /> },
  { id: 'mes-projets', label: 'Mes projets', icon: <HiFolder size={20} /> },
  { id: 'fil', label: 'Actualité', icon: <HiNewspaper size={20} /> },
  { id: 'lives', label: 'Lives', icon: <HiPlay size={20} /> },
  { id: 'notifications', label: 'Notifs', icon: <HiBell size={20} /> },
  { id: 'parametres', label: 'Paramètres', icon: <HiCog size={20} /> },
];

const Espace = () => {
  const { utilisateur } = useAuth();
  const [ongletActif, setOngletActif] = useState<Onglet>('decouvrir');

  const renduOnglet = () => {
    switch (ongletActif) {
      case 'decouvrir':
        return <DecouvrirProjets />;
      case 'mes-projets':
        return <MesProjets />;
      case 'fil':
        return <FilActualite />;
      case 'lives':
        return <LivesReplays />;
      case 'notifications':
        return <NotificationsPanel />;
      case 'parametres':
        return <Parametres />;
    }
  };

  return (
    <div className="espace-page">
      {/* Header Espace */}
      <header className="espace-header">
        <div className="espace-header-gauche">
          <Link to="/" className="espace-logo" aria-label="Accueil">
            <img src={logoLpp} alt="LPP" width={32} height={32} />
          </Link>
          <div className="espace-bienvenue">
            <span className="espace-salut">
              Bonjour{utilisateur ? `, ${utilisateur.prenom}` : ''} !
            </span>
            <span className="espace-sous-titre">Ton espace La Première Pierre</span>
          </div>
        </div>
        <div className="espace-header-droite">
          <NotificationDropdown onVoirTout={() => setOngletActif('notifications')} />
          <div className="espace-avatar-header">
            {utilisateur?.avatar ? (
              <img src={utilisateur.avatar} alt="" />
            ) : (
              <span>{utilisateur?.prenom?.charAt(0) || 'U'}</span>
            )}
          </div>
        </div>
      </header>

      <div className="espace-layout">
        {/* Sidebar desktop */}
        <nav className="espace-sidebar" aria-label="Navigation espace">
          {onglets.map((tab) => (
            <button
              key={tab.id}
              className={`espace-sidebar-item ${ongletActif === tab.id ? 'espace-sidebar-item-actif' : ''}`}
              onClick={() => setOngletActif(tab.id)}
              aria-current={ongletActif === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Contenu principal */}
        <main className="espace-contenu">
          <motion.div
            key={ongletActif}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renduOnglet()}
          </motion.div>
        </main>
      </div>

      {/* Bottom tabs mobile */}
      <nav className="espace-bottom-tabs" aria-label="Navigation mobile">
        {onglets.filter((t) => t.id !== 'notifications').map((tab) => (
          <button
            key={tab.id}
            className={`espace-tab ${ongletActif === tab.id ? 'espace-tab-actif' : ''}`}
            onClick={() => setOngletActif(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Espace;
