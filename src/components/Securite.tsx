import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  HiShieldCheck,
  HiEye,
  HiUserGroup,
  HiLockClosed
} from 'react-icons/hi';

interface SecurityItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const securityItems: SecurityItem[] = [
  {
    icon: <HiShieldCheck />,
    title: 'Projets vérifiés',
    description: 'Chaque projet passe par notre processus de validation avant publication.',
  },
  {
    icon: <HiEye />,
    title: 'Traçabilité & suivi',
    description: 'Accède à l\'historique complet et aux mises à jour de chaque projet.',
  },
  {
    icon: <HiUserGroup />,
    title: 'Communauté & retours',
    description: 'Les avis et interactions sont visibles pour une transparence totale.',
  },
  {
    icon: <HiLockClosed />,
    title: 'Confidentialité',
    description: 'Tes données personnelles sont protégées et jamais revendues.',
  },
];

const Securite = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="securite section" id="securite">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Sécurité & transparence</h2>
          <p className="section-subtitle">
            Ta confiance est notre priorité. Voici comment on la protège.
          </p>
        </motion.div>

        <div className="securite-grid">
          {securityItems.map((item, index) => (
            <motion.div
              key={item.title}
              className="securite-item"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="securite-icon" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="securite-title">{item.title}</h3>
              <p className="securite-description">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Securite;
