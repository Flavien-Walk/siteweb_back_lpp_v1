import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { couleurs } from '../../styles/theme';
import { Menu, X } from 'lucide-react';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={styles.container}>
      {/* Mobile header */}
      {isMobile && (
        <div style={styles.mobileHeader} className="mobile-header">
          <button style={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} color={couleurs.texte} /> : <Menu size={24} color={couleurs.texte} />}
          </button>
          <span style={styles.mobileTitle}>LPP</span>
          <div style={{ width: 40 }} />
        </div>
      )}

      {/* Sidebar overlay on mobile */}
      {isMobile && sidebarOpen && (
        <div
          style={styles.sidebarOverlay}
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar-desktop ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar />
      </div>

      <main
        style={{
          ...styles.main,
          marginLeft: isMobile ? 0 : 260,
          paddingTop: isMobile ? 72 : 32,
          paddingBottom: isMobile ? 80 : 32,
        }}
        className="main-content"
      >
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: couleurs.fond,
  },
  main: {
    flex: 1,
    minHeight: '100vh',
    padding: '32px 40px',
    maxWidth: 1200,
  },
  mobileHeader: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: couleurs.fondElevated,
    borderBottom: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 150,
  },
  hamburger: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 10,
  },
  mobileTitle: {
    fontSize: '1.125rem',
    fontWeight: '800',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.05em',
  },
  sidebarOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 190,
  },
};
