import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaDiscord
} from 'react-icons/fa';
import logoLpp from '../assets/logo-lpp.svg';

const Footer = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const currentYear = new Date().getFullYear();

  const footerLinks = {
    plateforme: [
      { label: 'Découvrir les projets', href: '#projets' },
      { label: 'Comment ça marche', href: '#fonctionnement' },
      { label: 'Publier un projet', href: '#fonctionnement' },
    ],
    communaute: [
      { label: 'Témoignages', href: '#communaute' },
      { label: 'Blog', href: '#' },
      { label: 'Événements', href: '#' },
    ],
    support: [
      { label: 'Centre d\'aide', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'FAQ', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: <FaTwitter />, href: '#', label: 'Twitter' },
    { icon: <FaLinkedinIn />, href: '#', label: 'LinkedIn' },
    { icon: <FaInstagram />, href: '#', label: 'Instagram' },
    { icon: <FaDiscord />, href: '#', label: 'Discord' },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <motion.div
          ref={ref}
          className="footer-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="footer-brand">
            <a href="#" className="footer-logo" aria-label="La Première Pierre - Accueil">
              <img src={logoLpp} alt="LPP Logo" width={32} height={32} />
              <span>La Première Pierre</span>
            </a>
            <p className="footer-description">
              Une plateforme pour découvrir et suivre des projets concrets.
Transparence, communauté, impact.
            </p>
            <div className="footer-social">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="social-link"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-column">
            <h4>Plateforme</h4>
            <ul className="footer-links">
              {footerLinks.plateforme.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h4>Communauté</h4>
            <ul className="footer-links">
              {footerLinks.communaute.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <ul className="footer-links">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} La Première Pierre. Tous droits réservés.
          </p>
          <div className="footer-legal">
            <a href="#">Mentions légales</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">CGU</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
