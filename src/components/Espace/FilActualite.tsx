import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineHeart, HiNewspaper } from 'react-icons/hi';
import { getFeed, type Publication } from '../../services/feed';
import { MOCK_PUBLICATIONS } from '../../data/mockData';

const FILTRES = [
  { value: '', label: 'Tout' },
  { value: 'suivis', label: 'Projets suivis' },
  { value: 'annonces', label: 'Annonces LPP' },
];

const labelType: Record<string, string> = {
  annonce: 'Annonce',
  update: 'Mise à jour',
  editorial: 'Éditorial',
  'live-extrait': 'Extrait live',
};

const couleurType: Record<string, string> = {
  annonce: 'var(--primary)',
  update: 'var(--secondary)',
  editorial: 'var(--accent)',
  'live-extrait': 'var(--danger)',
};

const FilActualite = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [filtre, setFiltre] = useState('');
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, [filtre]);

  const charger = async () => {
    setChargement(true);
    const params: Record<string, string> = {};
    if (filtre) params.type = filtre;
    const res = await getFeed(params);
    if (res.succes && res.data && res.data.publications.length > 0) {
      setPublications(res.data.publications);
    } else {
      let mock = [...MOCK_PUBLICATIONS];
      if (filtre === 'annonces') mock = mock.filter((p) => p.type === 'annonce');
      setPublications(mock);
    }
    setChargement(false);
  };

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const heures = Math.floor(diff / 3600000);
    if (heures < 1) return 'À l\'instant';
    if (heures < 24) return `Il y a ${heures}h`;
    const jours = Math.floor(heures / 24);
    if (jours < 7) return `Il y a ${jours}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fil-actu">
      <h2 className="espace-titre">Fil d'actualité</h2>

      <div className="fil-actu-filtres">
        {FILTRES.map((f) => (
          <button
            key={f.value}
            className={`fil-actu-filtre ${filtre === f.value ? 'fil-actu-filtre-actif' : ''}`}
            onClick={() => setFiltre(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {chargement ? (
        <div className="espace-loading">Chargement du fil...</div>
      ) : publications.length === 0 ? (
        <div className="espace-vide-container">
          <HiNewspaper className="espace-vide-icon" />
          <h3>Rien pour le moment</h3>
          <p>Suis des projets pour voir leurs actualités ici.</p>
        </div>
      ) : (
        <div className="fil-actu-liste">
          {publications.map((pub, i) => (
            <motion.article
              key={pub._id}
              className="fil-actu-carte"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="fil-actu-carte-header">
                <div className="fil-actu-auteur">
                  <div className="fil-actu-avatar">
                    {pub.auteur.nom.charAt(0)}
                  </div>
                  <div>
                    <span className="fil-actu-nom">{pub.auteur.nom}</span>
                    <span className="fil-actu-date">{formatDate(pub.dateCreation)}</span>
                  </div>
                </div>
                <span className="fil-actu-type" style={{ color: couleurType[pub.type] }}>
                  {labelType[pub.type]}
                </span>
              </div>

              <p className="fil-actu-contenu">{pub.contenu}</p>

              {pub.projet && (
                <div className="fil-actu-projet-ref">
                  Projet : <strong>{pub.projet.nom}</strong>
                </div>
              )}

              <div className="fil-actu-actions">
                <button className="fil-actu-like">
                  <HiOutlineHeart /> {pub.likes.length}
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilActualite;
