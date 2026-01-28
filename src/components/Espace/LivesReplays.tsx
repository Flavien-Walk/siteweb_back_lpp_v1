import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPlay, HiStatusOnline, HiCalendar, HiClock } from 'react-icons/hi';
import { getEvenements, type Evenement } from '../../services/evenements';
import { MOCK_EVENEMENTS } from '../../data/mockData';

const labelType: Record<string, string> = { live: 'Live', replay: 'Replay', qr: 'Q/R' };
const iconType: Record<string, React.ReactNode> = { live: <HiStatusOnline />, replay: <HiPlay />, qr: <HiCalendar /> };
const couleurStatut: Record<string, string> = { 'a-venir': 'var(--primary)', 'en-cours': 'var(--success)', termine: 'var(--muted)' };

const LivesReplays = () => {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setChargement(true);
    const res = await getEvenements();
    if (res.succes && res.data && res.data.evenements.length > 0) {
      setEvenements(res.data.evenements);
    } else {
      setEvenements(MOCK_EVENEMENTS);
    }
    setChargement(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const aVenir = evenements.filter((e) => e.statut === 'a-venir' || e.statut === 'en-cours');
  const termines = evenements.filter((e) => e.statut === 'termine');

  if (chargement) return <div className="espace-loading">Chargement des événements...</div>;

  return (
    <div className="lives">
      <h2 className="espace-titre">Lives & Replays</h2>

      {aVenir.length > 0 && (
        <section className="lives-section">
          <h3 className="lives-section-titre"><HiStatusOnline style={{ color: 'var(--success)' }} /> À venir</h3>
          <div className="lives-grille">
            {aVenir.map((evt, i) => (
              <motion.article key={evt._id} className="lives-carte lives-carte-avenir" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="lives-carte-header">
                  <span className="lives-type" style={{ color: couleurStatut[evt.statut] }}>{iconType[evt.type]} {labelType[evt.type]}</span>
                  <span className="lives-duree"><HiClock /> {evt.duree} min</span>
                </div>
                <h4 className="lives-titre">{evt.titre}</h4>
                <p className="lives-desc">{evt.description}</p>
                <div className="lives-date"><HiCalendar /> {formatDate(evt.date)}</div>
                {evt.projet && <span className="lives-projet">Projet : {evt.projet.nom}</span>}
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {termines.length > 0 && (
        <section className="lives-section">
          <h3 className="lives-section-titre"><HiPlay style={{ color: 'var(--muted)' }} /> Replays disponibles</h3>
          <div className="lives-grille">
            {termines.map((evt, i) => (
              <motion.article key={evt._id} className="lives-carte" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="lives-carte-header">
                  <span className="lives-type" style={{ color: couleurStatut[evt.statut] }}>{iconType[evt.type]} {labelType[evt.type]}</span>
                  <span className="lives-duree"><HiClock /> {evt.duree} min</span>
                </div>
                <h4 className="lives-titre">{evt.titre}</h4>
                <p className="lives-desc">{evt.description}</p>
                <div className="lives-date"><HiCalendar /> {formatDate(evt.date)}</div>
                {evt.lienVideo && (
                  <a href={evt.lienVideo} target="_blank" rel="noopener noreferrer" className="btn btn-primary lives-play-btn">
                    <HiPlay /> Regarder le replay
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {evenements.length === 0 && (
        <div className="espace-vide-container">
          <HiPlay className="espace-vide-icon" />
          <h3>Aucun événement</h3>
          <p>Les prochains lives et replays apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
};

export default LivesReplays;
