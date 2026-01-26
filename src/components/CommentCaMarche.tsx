import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  HiSearch,
  HiHeart,
  HiTrendingUp,
  HiLightBulb,
  HiDocumentText,
  HiUserGroup
} from 'react-icons/hi';

type UserType = 'explorateur' | 'entrepreneur';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const stepsExplorateur: Step[] = [
  {
    icon: <HiSearch />,
    title: 'Explore les projets',
    description: 'Parcours les startups locales vérifiées. Filtre par ville, secteur ou impact.',
  },
  {
    icon: <HiHeart />,
    title: 'Soutiens ceux qui te parlent',
    description: 'Suis les projets, interagis avec les fondateurs, montre ton intérêt.',
  },
  {
    icon: <HiTrendingUp />,
    title: 'Suis leur évolution',
    description: 'Reçois des updates régulières et participe à la communauté.',
  },
];

const stepsEntrepreneur: Step[] = [
  {
    icon: <HiLightBulb />,
    title: 'Présente ton projet',
    description: 'Crée ta page projet en quelques minutes. Simple, guidé, efficace.',
  },
  {
    icon: <HiDocumentText />,
    title: 'Valide ton profil',
    description: 'Notre équipe vérifie ton projet pour garantir la qualité.',
  },
  {
    icon: <HiUserGroup />,
    title: 'Rencontre ta communauté',
    description: 'Connecte-toi avec des soutiens locaux motivés par ton impact.',
  },
];

const CommentCaMarche = () => {
  const [activeTab, setActiveTab] = useState<UserType>('explorateur');
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const steps = activeTab === 'explorateur' ? stepsExplorateur : stepsEntrepreneur;

  return (
    <section className="fonctionnement section" id="fonctionnement">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Comment ça marche ?</h2>
          <p className="section-subtitle">
            Que tu veuilles découvrir des projets ou lancer le tien, c'est simple.
          </p>
        </motion.div>

        <div className="fonctionnement-tabs" role="tablist" aria-label="Type d'utilisateur">
          <button
            role="tab"
            aria-selected={activeTab === 'explorateur'}
            aria-controls="panel-explorateur"
            className={`tab-btn ${activeTab === 'explorateur' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorateur')}
          >
            Je découvre des projets
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'entrepreneur'}
            aria-controls="panel-entrepreneur"
            className={`tab-btn ${activeTab === 'entrepreneur' ? 'active' : ''}`}
            onClick={() => setActiveTab('entrepreneur')}
          >
            Je suis entrepreneur
          </button>
        </div>

        <div className="fonctionnement-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="steps-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  className="step-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <span className="step-number" aria-hidden="true">{index + 1}</span>
                  <div className="step-icon" aria-hidden="true">
                    {step.icon}
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default CommentCaMarche;
