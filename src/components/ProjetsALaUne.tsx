import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { HiLocationMarker, HiStar } from 'react-icons/hi';

// Import project images
import greenboxImg from '../assets/projects/greenbox.svg';
import miamLocalImg from '../assets/projects/miam-local.svg';
import mediconnectImg from '../assets/projects/mediconnect.svg';
import codementorImg from '../assets/projects/codementor.svg';
import artlocalImg from '../assets/projects/artlocal.svg';
import energyshareImg from '../assets/projects/energyshare.svg';

interface Projet {
  id: number;
  nom: string;
  pitch: string;
  secteur: string;
  image: string;
  ville: string;
  progression: number;
  objectif: string;
}

const projets: Projet[] = [
  {
    id: 1,
    nom: 'GreenBox',
    pitch: 'Composteurs connectés pour immeubles urbains. Réduisez vos déchets, gagnez des récompenses.',
    secteur: 'Green',
    image: greenboxImg,
    ville: 'Lyon',
    progression: 72,
    objectif: '150 soutiens',
  },
  {
    id: 2,
    nom: 'Miam Local',
    pitch: 'App de livraison 100% producteurs locaux. Circuit court, zéro intermédiaire.',
    secteur: 'Foodtech',
    image: miamLocalImg,
    ville: 'Nantes',
    progression: 89,
    objectif: '200 soutiens',
  },
  {
    id: 3,
    nom: 'MediConnect',
    pitch: 'Téléconsultation simplifiée pour les déserts médicaux ruraux.',
    secteur: 'Santé',
    image: mediconnectImg,
    ville: 'Toulouse',
    progression: 45,
    objectif: '300 soutiens',
  },
  {
    id: 4,
    nom: 'CodeMentor',
    pitch: 'Plateforme de mentorat tech entre étudiants et professionnels.',
    secteur: 'SaaS',
    image: codementorImg,
    ville: 'Paris',
    progression: 63,
    objectif: '180 soutiens',
  },
  {
    id: 5,
    nom: 'ArtLocal',
    pitch: 'Galerie virtuelle pour artistes émergents de ta région.',
    secteur: 'Culture',
    image: artlocalImg,
    ville: 'Bordeaux',
    progression: 34,
    objectif: '120 soutiens',
  },
  {
    id: 6,
    nom: 'EnergyShare',
    pitch: 'Partage d\'énergie solaire entre voisins. Économies garanties.',
    secteur: 'Green',
    image: energyshareImg,
    ville: 'Marseille',
    progression: 81,
    objectif: '250 soutiens',
  },
];

const ProjetCard = ({ projet, index }: { projet: Projet; index: number }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.article
      ref={ref}
      className="projet-card"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="projet-image">
        <img src={projet.image} alt={`Illustration ${projet.nom}`} />
      </div>

      <div className="projet-header">
        <h3 className="projet-title">{projet.nom}</h3>
        <span className="projet-tag">
          {projet.secteur}
        </span>
      </div>

      <p className="projet-pitch">{projet.pitch}</p>

      <div className="projet-location">
        <HiLocationMarker aria-hidden="true" />
        <span>{projet.ville}</span>
      </div>

      <div className="projet-progress">
        <div className="projet-progress-bar">
          <motion.div
            className="projet-progress-fill"
            initial={{ width: 0 }}
            animate={inView ? { width: `${projet.progression}%` } : {}}
            transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
          />
        </div>
        <div className="projet-progress-text">
          <span>{projet.progression}% atteint</span>
          <span>{projet.objectif}</span>
        </div>
      </div>

      <div className="projet-actions">
        <a href="#" className="btn btn-primary">
          Voir le projet
        </a>
        <button className="btn btn-follow" aria-label={`Suivre ${projet.nom}`}>
          <HiStar aria-hidden="true" /> Suivre
        </button>
      </div>
    </motion.article>
  );
};

const ProjetsALaUne = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="projets section" id="projets">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Projets à la une</h2>
          <p className="section-subtitle">
            Découvre les projets qui font bouger les lignes près de chez toi. Transparence totale, impact local.
          </p>
        </motion.div>

        <div className="projets-grid">
          {projets.map((projet, index) => (
            <ProjetCard key={projet.id} projet={projet} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjetsALaUne;
