import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiHome, HiLightBulb, HiUserGroup, HiShieldCheck, HiUser } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import HeaderNotificationBell from './Espace/HeaderNotificationBell';
import logoLpp from '../assets/logo-lpp.svg';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { estConnecte, chargement } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#projets', label: 'Projets' },
    { href: '#fonctionnement', label: 'Comment ça marche' },
    { href: '#communaute', label: 'Communauté' },
    { href: '#securite', label: 'Sécurité' },
  ];

  // Liens pour la navbar mobile en bas
  const mobileNavLinks = [
    { href: '#hero', label: 'Accueil', icon: HiHome },
    { href: '#projets', label: 'Projets', icon: HiLightBulb },
    { href: '#communaute', label: 'Communauté', icon: HiUserGroup },
    { href: '#securite', label: 'Sécurité', icon: HiShieldCheck },
    { href: estConnecte ? '/espace' : '/connexion', label: estConnecte ? 'Espace' : 'Compte', icon: HiUser, isRoute: true },
  ];

  // Gérer les liens d'ancrage sur la page d'accueil
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isRoute?: boolean) => {
    if (isRoute) return; // Laisser React Router gérer les routes

    if (location.pathname !== '/') {
      // Si on n'est pas sur la page d'accueil, naviguer vers accueil + ancre
      return;
    }
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
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
              <>
                <HeaderNotificationBell />
                <Link to="/espace" className="btn btn-primary header-cta">
                  Mon espace
                </Link>
              </>
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
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - visible uniquement sur mobile */}
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        {mobileNavLinks.map((link) => {
          const Icon = link.icon;
          const isActive = link.isRoute
            ? location.pathname === link.href
            : location.hash === link.href || (link.href === '#hero' && !location.hash);

          if (link.isRoute) {
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="mobile-bottom-nav-icon" />
                <span>{link.label}</span>
              </Link>
            );
          }

          return (
            <a
              key={link.href}
              href={location.pathname === '/' ? link.href : `/${link.href}`}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="mobile-bottom-nav-icon" />
              <span>{link.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
};

export default Header;
