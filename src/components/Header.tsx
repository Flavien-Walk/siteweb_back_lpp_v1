import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMenu, HiX } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import logoLpp from '../assets/logo-lpp.svg';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { estConnecte, chargement } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: '#projets', label: 'Projets' },
    { href: '#fonctionnement', label: 'Comment ça marche' },
    { href: '#communaute', label: 'Communauté' },
    { href: '#securite', label: 'Sécurité' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Gérer les liens d'ancrage sur la page d'accueil
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location.pathname !== '/') {
      // Si on n'est pas sur la page d'accueil, on laisse le lien normal
      return;
    }
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    closeMobileMenu();
  };

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <Link to="/" className="header-logo" aria-label="La Première Pierre - Accueil">
          <img src={logoLpp} alt="La Première Pierre" width={40} height={40} />
          <span>La Première Pierre</span>
        </Link>

        <nav className="header-nav" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={location.pathname === '/' ? link.href : `/${link.href}`}
              onClick={(e) => handleAnchorClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          {chargement ? (
            <span className="header-link" style={{ opacity: 0.5 }}>Chargement...</span>
          ) : estConnecte ? (
            <Link to="/espace" className="btn btn-primary header-cta">
              Mon espace
            </Link>
          ) : (
            <>
              <Link to="/connexion" className="header-link">
                Connexion
              </Link>
              <Link to="/inscription" className="btn btn-primary header-cta">
                Créer un compte
              </Link>
            </>
          )}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="mobile-menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-menu"
              className="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              aria-label="Navigation mobile"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={location.pathname === '/' ? link.href : `/${link.href}`}
                  onClick={(e) => handleAnchorClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mobile-menu-cta">
                {chargement ? (
                  <span style={{ opacity: 0.5, textAlign: 'center', display: 'block' }}>
                    Chargement...
                  </span>
                ) : estConnecte ? (
                  <Link
                    to="/espace"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeMobileMenu}
                  >
                    Mon espace
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/connexion"
                      className="btn btn-secondary"
                      style={{ width: '100%', marginBottom: '12px' }}
                      onClick={closeMobileMenu}
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/inscription"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={closeMobileMenu}
                    >
                      Créer un compte
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
