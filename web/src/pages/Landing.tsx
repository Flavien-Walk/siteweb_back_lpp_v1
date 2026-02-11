import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, ChevronDown, MapPin, Users,
  Search, Heart, Rocket, Eye, TrendingUp,
  Shield, Lock, Star,
} from 'lucide-react';
import { couleurs } from '../styles/theme';

const API_URL = import.meta.env.VITE_API_URL || 'https://siteweb-back-lpp-v1.onrender.com/api';

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

// ─── Header ──────────────────────────────────────────────────────
function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        ...s.header,
        backgroundColor: scrolled ? 'rgba(13, 13, 18, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${couleurs.bordure}` : '1px solid transparent',
      }}
    >
      <div style={s.headerInner}>
        <Link to="/" style={s.logoLink}>
          <div style={s.logoIcon}>
            <Sparkles size={22} color={couleurs.primaire} />
          </div>
          <span style={s.logoText}>La Première Pierre</span>
        </Link>

        <nav style={s.headerNav}>
          <button onClick={() => scrollToSection('projets')} style={s.navBtn}>Projets</button>
          <button onClick={() => scrollToSection('comment-ca-marche')} style={s.navBtn}>Comment ça marche</button>
          <button onClick={() => scrollToSection('communaute')} style={s.navBtn}>Communauté</button>
        </nav>

        <div style={s.headerActions}>
          <Link to="/connexion" style={s.loginBtn}>Se connecter</Link>
          <Link to="/inscription" style={s.signupBtn}>
            S'inscrire <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={s.heroSection}>
      <div style={s.heroBg} />
      <motion.div
        style={s.heroContent}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          style={s.heroBadge}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles size={14} color={couleurs.primaire} />
          Plateforme d'investissement nouvelle génération
        </motion.div>

        <h1 style={s.heroTitle}>
          Engage-toi dans des{' '}
          <span style={s.heroGradient}>projets concrets.</span>
        </h1>

        <p style={s.heroSubtitle}>
          Connecte les jeunes investisseurs aux startups et projets locaux
          qui façonnent le monde de demain.
        </p>

        <div style={s.heroCtas}>
          <Link to="/inscription" style={s.heroPrimaryBtn}>
            Commencer maintenant <ArrowRight size={18} />
          </Link>
          <button onClick={() => scrollToSection('projets')} style={s.heroSecondaryBtn}>
            Découvrir les projets
          </button>
        </div>
      </motion.div>

      <motion.div
        style={s.scrollIndicator}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown size={24} color={couleurs.texteSecondaire} />
      </motion.div>
    </section>
  );
}

// ─── Stats ───────────────────────────────────────────────────────
function StatCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          obs.disconnect();
          let startTime = 0;
          const duration = 2000;
          const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function StatsSection() {
  const stats = [
    { value: 120, suffix: '+', label: 'Projets suivis' },
    { value: 3400, suffix: '+', label: 'Membres actifs' },
    { value: 24, suffix: '', label: 'Villes couvertes' },
    { value: 4.8, suffix: '/5', label: 'Note communauté' },
  ];

  return (
    <section style={s.statsSection}>
      <div style={s.statsGrid}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            style={s.statCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <span style={s.statValue}>
              {stat.value === 4.8 ? (
                <>{stat.value}{stat.suffix}</>
              ) : (
                <StatCounter target={stat.value} suffix={stat.suffix} />
              )}
            </span>
            <span style={s.statLabel}>{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Featured Projects ──────────────────────────────────────────
interface SimpleProject {
  _id: string;
  nom: string;
  pitch: string;
  image?: string;
  logo?: string;
  categorie: string;
  localisation?: { ville: string };
  nbFollowers?: number;
  progression?: number;
}

function FeaturedProjects() {
  const [projets, setProjets] = useState<SimpleProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/projets?limit=6&sort=popular`)
      .then((r) => r.json())
      .then((data) => {
        if (data.succes && data.data?.projets) {
          setProjets(data.data.projets.slice(0, 6));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section id="projets" style={s.section}>
      <motion.div
        style={s.sectionHeader}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={s.sectionTitle}>Projets à la une</h2>
        <p style={s.sectionSubtitle}>Découvre les projets les plus suivis par notre communauté</p>
      </motion.div>

      {projets.length > 0 ? (
        <div style={s.projectGrid}>
          {projets.map((p, i) => (
            <motion.div
              key={p._id}
              style={s.projectCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
            >
              <div style={s.projectImgWrap}>
                <img
                  src={p.image || p.logo || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=300&fit=crop&q=80'}
                  alt={p.nom}
                  style={s.projectImg}
                />
                <div style={s.projectBadge}>{p.categorie}</div>
              </div>
              <div style={s.projectBody}>
                <h3 style={s.projectName}>{p.nom}</h3>
                <p style={s.projectPitch}>{p.pitch}</p>
                <div style={s.projectMeta}>
                  {p.localisation?.ville && (
                    <span style={s.metaItem}><MapPin size={14} /> {p.localisation.ville}</span>
                  )}
                  <span style={s.metaItem}><Users size={14} /> {p.nbFollowers || 0}</span>
                </div>
                {p.progression != null && p.progression > 0 && (
                  <div style={s.progressWrap}>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${Math.min(p.progression, 100)}%` }} />
                    </div>
                    <span style={s.progressText}>{p.progression}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : loaded ? (
        <motion.div
          style={s.emptyProjects}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p style={{ color: couleurs.texteSecondaire, fontSize: '1.0625rem' }}>
            Inscris-toi pour découvrir les projets de notre communauté
          </p>
        </motion.div>
      ) : (
        <div style={s.projectGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          ))}
        </div>
      )}

      <div style={s.sectionCta}>
        <Link to="/inscription" style={s.outlineBtn}>
          Voir tous les projets <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────
const TABS = {
  explorateur: {
    label: 'Explorateur',
    steps: [
      { icon: Search, title: 'Découvre', desc: 'Parcours les projets par catégorie, localisation ou maturité et trouve ceux qui te parlent.' },
      { icon: Heart, title: 'Suis & soutiens', desc: 'Follow les projets qui t\'inspirent, reçois leurs actualités et montre ton soutien.' },
      { icon: Users, title: 'Échange', desc: 'Discute avec les entrepreneurs, pose tes questions et participe aux lives exclusifs.' },
    ],
  },
  entrepreneur: {
    label: 'Entrepreneur',
    steps: [
      { icon: Rocket, title: 'Présente ton projet', desc: 'Crée ta page projet avec pitch, équipe, documents et métriques clés.' },
      { icon: Eye, title: 'Gagne en visibilité', desc: 'Sois mis en avant, interagis avec ta communauté et lance des lives.' },
      { icon: TrendingUp, title: 'Développe-toi', desc: 'Utilise l\'engagement de ta communauté pour convaincre investisseurs et partenaires.' },
    ],
  },
};

function HowItWorks() {
  const [tab, setTab] = useState<'explorateur' | 'entrepreneur'>('explorateur');
  const activeTab = TABS[tab];

  return (
    <section id="comment-ca-marche" style={s.section}>
      <motion.div
        style={s.sectionHeader}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={s.sectionTitle}>Comment ça marche ?</h2>
        <p style={s.sectionSubtitle}>Que tu sois investisseur ou porteur de projet, la plateforme s'adapte à toi</p>
      </motion.div>

      <div style={s.tabBar}>
        {(Object.keys(TABS) as Array<keyof typeof TABS>).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              ...s.tabBtn,
              backgroundColor: tab === key ? couleurs.primaire : 'transparent',
              color: tab === key ? couleurs.blanc : couleurs.texteSecondaire,
              borderColor: tab === key ? couleurs.primaire : couleurs.bordure,
            }}
          >
            {TABS[key].label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          style={s.stepsGrid}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab.steps.map((step, i) => (
            <motion.div
              key={i}
              style={s.stepCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <div style={s.stepNumber}>{i + 1}</div>
              <div style={s.stepIconWrap}>
                <step.icon size={28} color={couleurs.primaire} />
              </div>
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────
const TEMOIGNAGES = [
  { nom: 'Inès M.', role: 'Investisseuse', quote: 'J\'ai découvert des projets incroyables près de chez moi. La plateforme rend l\'investissement accessible et transparent.', note: 5 },
  { nom: 'Théo B.', role: 'Entrepreneur', quote: 'Grâce à LPP j\'ai pu présenter mon projet à une communauté engagée. Les retours m\'ont beaucoup aidé à m\'améliorer.', note: 5 },
  { nom: 'Léa K.', role: 'Investisseuse', quote: 'Les lives avec les entrepreneurs sont géniaux. On peut poser nos questions en direct et vraiment comprendre les projets.', note: 5 },
];

function Testimonials() {
  return (
    <section id="communaute" style={s.section}>
      <motion.div
        style={s.sectionHeader}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={s.sectionTitle}>Ce que dit la communauté</h2>
        <p style={s.sectionSubtitle}>Des milliers de membres nous font confiance</p>
      </motion.div>

      <div style={s.testimonialGrid}>
        {TEMOIGNAGES.map((t, i) => (
          <motion.div
            key={i}
            style={s.testimonialCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div style={s.testimonialStars}>
              {Array.from({ length: t.note }).map((_, j) => (
                <Star key={j} size={16} color={couleurs.accent} fill={couleurs.accent} />
              ))}
            </div>
            <p style={s.testimonialQuote}>"{t.quote}"</p>
            <div style={s.testimonialAuthor}>
              <div style={s.testimonialAvatar}>
                {t.nom[0]}
              </div>
              <div>
                <span style={s.testimonialName}>{t.nom}</span>
                <span style={s.testimonialRole}>{t.role}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Security ───────────────────────────────────────────────────
const SECURITE_ITEMS = [
  { icon: Shield, title: 'Projets vérifiés', desc: 'Chaque projet est examiné par notre équipe avant d\'être publié sur la plateforme.' },
  { icon: Eye, title: 'Traçabilité totale', desc: 'Suis l\'avancement des projets en temps réel avec une transparence complète.' },
  { icon: Star, title: 'Communauté & retours', desc: 'Les avis et notes de la communauté t\'aident à faire les bons choix.' },
  { icon: Lock, title: 'Données protégées', desc: 'Tes informations personnelles sont chiffrées et ne sont jamais partagées.' },
];

function SecuritySection() {
  return (
    <section style={s.section}>
      <motion.div
        style={s.sectionHeader}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={s.sectionTitle}>Sécurité & transparence</h2>
        <p style={s.sectionSubtitle}>Ta confiance est notre priorité</p>
      </motion.div>

      <div style={s.securityGrid}>
        {SECURITE_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            style={s.securityCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div style={s.securityIconWrap}>
              <item.icon size={24} color={couleurs.secondaire} />
            </div>
            <h3 style={s.securityTitle}>{item.title}</h3>
            <p style={s.securityDesc}>{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA Final ──────────────────────────────────────────────────
function CtaFinal() {
  return (
    <section style={s.ctaSection}>
      <div style={s.ctaBg} />
      <motion.div
        style={s.ctaContent}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={s.ctaTitle}>Prêt à poser ta première pierre ?</h2>
        <p style={s.ctaSubtitle}>
          Rejoins une communauté de passionnés et participe à des projets qui changent les choses.
        </p>
        <div style={s.ctaBtns}>
          <Link to="/inscription" style={s.heroPrimaryBtn}>
            Créer mon compte <ArrowRight size={18} />
          </Link>
          <Link to="/connexion" style={s.heroSecondaryBtn}>
            Se connecter
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer style={s.footer}>
      <div style={s.footerInner}>
        <div style={s.footerBrand}>
          <div style={s.footerLogo}>
            <Sparkles size={20} color={couleurs.primaire} />
            <span style={s.footerLogoText}>La Première Pierre</span>
          </div>
          <p style={s.footerDesc}>
            La plateforme qui connecte jeunes investisseurs et projets innovants.
          </p>
        </div>

        <div style={s.footerLinks}>
          <div style={s.footerCol}>
            <h4 style={s.footerColTitle}>Plateforme</h4>
            <Link to="/inscription" style={s.footerLink}>S'inscrire</Link>
            <Link to="/connexion" style={s.footerLink}>Se connecter</Link>
          </div>
          <div style={s.footerCol}>
            <h4 style={s.footerColTitle}>Communauté</h4>
            <button onClick={() => scrollToSection('projets')} style={s.footerLinkBtn}>Projets</button>
            <button onClick={() => scrollToSection('communaute')} style={s.footerLinkBtn}>Témoignages</button>
          </div>
          <div style={s.footerCol}>
            <h4 style={s.footerColTitle}>Support</h4>
            <button onClick={() => scrollToSection('comment-ca-marche')} style={s.footerLinkBtn}>Comment ça marche</button>
          </div>
        </div>
      </div>

      <div style={s.footerBottom}>
        <span style={s.footerCopy}>© {new Date().getFullYear()} La Première Pierre. Tous droits réservés.</span>
      </div>
    </footer>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ backgroundColor: couleurs.fond, minHeight: '100vh' }}>
      <LandingHeader />
      <Hero />
      <StatsSection />
      <FeaturedProjects />
      <HowItWorks />
      <Testimonials />
      <SecuritySection />
      <CtaFinal />
      <LandingFooter />
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  // Header
  header: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    transition: 'all 300ms ease',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none' as const,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: couleurs.primaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '1.125rem',
    fontWeight: '700',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerNav: {
    display: 'flex',
    gap: 8,
  },
  navBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'color 150ms ease',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  loginBtn: {
    padding: '8px 20px',
    borderRadius: 10,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none' as const,
    transition: 'opacity 150ms ease',
  },
  signupBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    borderRadius: 10,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.9375rem',
    fontWeight: '600',
    textDecoration: 'none' as const,
  },

  // Hero
  heroSection: {
    position: 'relative' as const,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '120px 32px 80px',
    overflow: 'hidden' as const,
  },
  heroBg: {
    position: 'absolute' as const,
    inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${couleurs.primaireLight} 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, ${couleurs.secondaireLight} 0%, transparent 50%)`,
    pointerEvents: 'none' as const,
  },
  heroContent: {
    position: 'relative' as const,
    zIndex: 1,
    maxWidth: 720,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 20,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    fontWeight: '600',
    marginBottom: 32,
    border: `1px solid rgba(124, 92, 255, 0.2)`,
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: '800',
    color: couleurs.texte,
    lineHeight: 1.15,
    marginBottom: 24,
    letterSpacing: '-0.02em',
  },
  heroGradient: {
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
    marginBottom: 40,
    maxWidth: 560,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  heroCtas: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  heroPrimaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 28px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '1rem',
    fontWeight: '600',
    textDecoration: 'none' as const,
    border: 'none',
    cursor: 'pointer',
    boxShadow: `0 4px 20px rgba(124, 92, 255, 0.3)`,
  },
  heroSecondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 28px',
    borderRadius: 12,
    backgroundColor: 'transparent',
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '1rem',
    fontWeight: '500',
    textDecoration: 'none' as const,
    cursor: 'pointer',
  },
  scrollIndicator: {
    position: 'absolute' as const,
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
  },

  // Stats
  statsSection: {
    padding: '80px 32px',
    borderTop: `1px solid ${couleurs.bordure}`,
    borderBottom: `1px solid ${couleurs.bordure}`,
  },
  statsGrid: {
    maxWidth: 1000,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 32,
    textAlign: 'center' as const,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: couleurs.primaire,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
  },

  // Sections
  section: {
    padding: '96px 32px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionHeader: {
    textAlign: 'center' as const,
    marginBottom: 56,
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: '1.0625rem',
    color: couleurs.texteSecondaire,
    maxWidth: 500,
    margin: '0 auto',
    lineHeight: 1.5,
  },
  sectionCta: {
    textAlign: 'center' as const,
    marginTop: 48,
  },
  outlineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    borderRadius: 12,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none' as const,
    transition: 'border-color 150ms ease',
  },

  // Projects
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 24,
  },
  projectCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden' as const,
    cursor: 'pointer',
    transition: 'box-shadow 300ms ease',
  },
  projectImgWrap: {
    position: 'relative' as const,
    height: 160,
    overflow: 'hidden' as const,
  },
  projectImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  projectBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: 'rgba(13, 13, 18, 0.8)',
    backdropFilter: 'blur(8px)',
    color: couleurs.texte,
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize' as const,
  },
  projectBody: { padding: 16 },
  projectName: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 6,
  },
  projectPitch: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  projectMeta: {
    display: 'flex',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: couleurs.bordure,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
  },
  progressText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.primaire,
  },
  emptyProjects: {
    textAlign: 'center' as const,
    padding: 48,
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
  },

  // How It Works
  tabBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  tabBtn: {
    padding: '10px 24px',
    borderRadius: 10,
    border: '1px solid',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
  },
  stepCard: {
    padding: 32,
    borderRadius: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    textAlign: 'center' as const,
    position: 'relative' as const,
  },
  stepNumber: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: couleurs.primaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 10,
  },
  stepDesc: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
  },

  // Testimonials
  testimonialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
  },
  testimonialCard: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
  },
  testimonialStars: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
  },
  testimonialQuote: {
    fontSize: '0.9375rem',
    color: couleurs.texte,
    lineHeight: 1.6,
    marginBottom: 20,
    fontStyle: 'italic' as const,
  },
  testimonialAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: couleurs.blanc,
    fontWeight: '700',
    fontSize: '0.875rem',
  },
  testimonialName: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  testimonialRole: {
    display: 'block',
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },

  // Security
  securityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 24,
  },
  securityCard: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    textAlign: 'center' as const,
  },
  securityIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: couleurs.secondaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  securityTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 8,
  },
  securityDesc: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
  },

  // CTA
  ctaSection: {
    position: 'relative' as const,
    padding: '96px 32px',
    textAlign: 'center' as const,
    overflow: 'hidden' as const,
  },
  ctaBg: {
    position: 'absolute' as const,
    inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${couleurs.primaireLight} 0%, transparent 60%)`,
    pointerEvents: 'none' as const,
  },
  ctaContent: {
    position: 'relative' as const,
    zIndex: 1,
    maxWidth: 600,
    margin: '0 auto',
  },
  ctaTitle: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: '1.0625rem',
    color: couleurs.texteSecondaire,
    marginBottom: 40,
    lineHeight: 1.5,
  },
  ctaBtns: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  },

  // Footer
  footer: {
    borderTop: `1px solid ${couleurs.bordure}`,
    padding: '64px 32px 32px',
  },
  footerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 48,
    flexWrap: 'wrap' as const,
  },
  footerBrand: {
    maxWidth: 300,
  },
  footerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footerLogoText: {
    fontSize: '1rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  footerDesc: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
  },
  footerLinks: {
    display: 'flex',
    gap: 64,
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  footerColTitle: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    textDecoration: 'none' as const,
    transition: 'color 150ms ease',
  },
  footerLinkBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'color 150ms ease',
  },
  footerBottom: {
    maxWidth: 1200,
    margin: '32px auto 0',
    paddingTop: 24,
    borderTop: `1px solid ${couleurs.bordure}`,
    textAlign: 'center' as const,
  },
  footerCopy: {
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
};
