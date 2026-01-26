import { motion } from 'framer-motion';
import {
  HiOfficeBuilding,
  HiAcademicCap,
  HiGlobe,
  HiLightningBolt,
  HiCube
} from 'react-icons/hi';

const partners = [
  { name: 'TechHub France', icon: <HiCube /> },
  { name: 'Université Lyon 3', icon: <HiAcademicCap /> },
  { name: 'BPI Startups', icon: <HiOfficeBuilding /> },
  { name: 'Green Initiative', icon: <HiGlobe /> },
  { name: 'FrenchTech', icon: <HiLightningBolt /> },
  { name: 'InnoLab Paris', icon: <HiCube /> },
  { name: 'École 42', icon: <HiAcademicCap /> },
  { name: 'Impact Hub', icon: <HiOfficeBuilding /> },
];

const Marquee = () => {
  const duplicatedPartners = [...partners, ...partners];

  return (
    <section className="marquee-section" aria-label="Nos partenaires">
      <p className="marquee-label">Ils nous font confiance</p>
      <div style={{ overflow: 'hidden' }}>
        <motion.div
          className="marquee-track"
          initial={{ x: 0 }}
          animate={{ x: '-50%' }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {duplicatedPartners.map((partner, index) => (
            <div key={`${partner.name}-${index}`} className="marquee-item">
              {partner.icon}
              <span>{partner.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Marquee;
