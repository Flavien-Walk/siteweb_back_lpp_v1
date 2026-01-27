import { motion } from 'framer-motion';
import { HiLocationMarker, HiHeart, HiOutlineHeart } from 'react-icons/hi';
import type { Projet } from '../../services/projets';

interface Props {
  projet: Projet;
  estSuivi: boolean;
  onToggleSuivi: (id: string) => void;
}

const CarteProjet = ({ projet, estSuivi, onToggleSuivi }: Props) => {
  const labelMaturite: Record<string, string> = {
    idee: 'Idée',
    prototype: 'Prototype',
    lancement: 'Lancement',
    croissance: 'Croissance',
  };

  return (
    <motion.article
      className="carte-projet"
      whileHover={{ y: -4, borderColor: 'var(--primary)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="carte-projet-image">
        <div className="carte-projet-placeholder">
          <span>{projet.nom.charAt(0)}</span>
        </div>
        <span className="carte-projet-tag">{projet.categorie}</span>
      </div>

      <div className="carte-projet-body">
        <h3 className="carte-projet-nom">{projet.nom}</h3>
        <p className="carte-projet-pitch">{projet.pitch}</p>

        <div className="carte-projet-meta">
          <span className="carte-projet-lieu">
            <HiLocationMarker /> {projet.localisation.ville}
          </span>
          <span className="carte-projet-maturite">
            {labelMaturite[projet.maturite] || projet.maturite}
          </span>
        </div>

        <div className="carte-projet-progression">
          <div className="carte-projet-barre">
            <motion.div
              className="carte-projet-barre-fill"
              initial={{ width: 0 }}
              animate={{ width: `${projet.progression}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="carte-projet-progression-info">
            <span>{projet.progression}%</span>
            <span>{projet.objectif}</span>
          </div>
        </div>

        <button
          className={`carte-projet-suivre ${estSuivi ? 'carte-projet-suivre-actif' : ''}`}
          onClick={() => onToggleSuivi(projet._id)}
        >
          {estSuivi ? <HiHeart /> : <HiOutlineHeart />}
          {estSuivi ? 'Suivi' : 'Suivre'}
        </button>
      </div>
    </motion.article>
  );
};

export default CarteProjet;
