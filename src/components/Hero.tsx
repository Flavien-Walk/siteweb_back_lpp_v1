import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const Hero = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="hero" id="hero">
      <motion.div
        ref={ref}
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        <motion.div className="hero-badge" variants={itemVariants}>
          <span className="hero-badge-dot" aria-hidden="true" />
          <span>Plateforme de mise en relation</span>
        </motion.div>

        <motion.h1 className="hero-title" variants={itemVariants}>
  Engage-toi dans des projets<br />
  <span className="hero-title-highlight">concrets.</span>
</motion.h1>

<motion.p className="hero-subtitle" variants={itemVariants}>
   La Première Pierre est une plateforme ouverte
  pour découvrir, soutenir et suivre des projets concrets,
  au sein d’une communauté transparente.
</motion.p>


        <motion.div className="hero-cta" variants={itemVariants}>
          <a href="#projets" className="btn btn-primary btn-lg">
            Découvrir des projets
          </a>
          <a href="#fonctionnement" className="btn btn-secondary btn-lg">
            Je présente mon projet
          </a>
        </motion.div>

        <motion.p className="hero-microcopy" variants={itemVariants}>
          2 minutes pour explorer. Aucun engagement.
        </motion.p>
      </motion.div>

      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        aria-hidden="true"
      >
        <div className="scroll-indicator-icon" />
        <span>Scroll</span>
      </motion.div>
    </section>
  );
};

export default Hero;
