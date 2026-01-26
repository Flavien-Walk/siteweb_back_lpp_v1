import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const CtaFinal = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <section className="cta-final section">
      <div className="container">
        <motion.div
          ref={ref}
          className="cta-final-content"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="cta-final-title">
            Prêt à poser ta première pierre ?
          </h2>

          <div className="cta-final-buttons">
            <a href="#projets" className="btn btn-primary btn-lg">
              Explorer les projets
            </a>
            <a href="#fonctionnement" className="btn btn-secondary btn-lg">
              Publier mon projet
            </a>
          </div>

          <p className="cta-final-text">
            Rejoins une communauté qui soutient des projets concrets.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaFinal;
