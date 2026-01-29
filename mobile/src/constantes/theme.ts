/**
 * Thème LPP - La Première Pierre
 * Design system pour l'application mobile
 */

export const couleurs = {
  // Couleurs principales
  primaire: '#7C5CFF',
  primaireLight: 'rgba(124, 92, 255, 0.15)',
  primaireDark: '#5B3FD9',

  secondaire: '#2DE2E6',
  secondaireLight: 'rgba(45, 226, 230, 0.15)',

  accent: '#FFBD59',
  accentLight: 'rgba(255, 189, 89, 0.15)',

  // Feedback
  succes: '#00D68F',
  succesLight: 'rgba(0, 214, 143, 0.15)',

  danger: '#FF4D6D',
  dangerLight: 'rgba(255, 77, 109, 0.15)',

  warning: '#FFBD59',

  // Fond (mode sombre)
  fond: '#0D0D12',
  fondElevated: '#13131A',
  fondCard: '#1A1A24',
  fondInput: '#0D0D12',

  // Texte
  texte: '#E8E8ED',
  texteSecondaire: '#9494A3',
  texteMuted: '#6B6B7A',
  textePlaceholder: '#4A4A57',

  // Bordures
  bordure: '#2A2A36',
  bordureHover: '#3A3A4A',
  bordureFocus: '#7C5CFF',

  // Blanc/Noir
  blanc: '#FFFFFF',
  noir: '#000000',

  // Gradient
  gradientPrimaire: ['#7C5CFF', '#2DE2E6'] as const,
  gradientCard: ['rgba(124, 92, 255, 0.08)', 'rgba(45, 226, 230, 0.04)'] as const,
};

export const espacements = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const rayons = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typographie = {
  // Tailles
  tailles: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },

  // Poids
  poids: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  hauteurLigne: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const ombres = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const animations = {
  rapide: 150,
  normale: 250,
  lente: 400,
};

// Export par défaut
const theme = {
  couleurs,
  espacements,
  rayons,
  typographie,
  ombres,
  animations,
};

export default theme;
