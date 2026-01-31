/**
 * Contexte de theme - Gestion du theme clair/sombre
 * Persistance via AsyncStorage
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type ThemeMode = 'dark' | 'light';

export interface ThemeCouleurs {
  primaire: string;
  primaireLight: string;
  primaireDark: string;
  secondaire: string;
  secondaireLight: string;
  secondaireDark: string;
  accent: string;
  fond: string;
  fondSecondaire: string;
  fondTertiaire: string;
  fondCard: string;
  texte: string;
  texteSecondaire: string;
  texteMuted: string;
  succes: string;
  erreur: string;
  danger: string;
  attention: string;
  info: string;
  blanc: string;
  noir: string;
  bordure: string;
  bordureLight: string;
  gradientPrimaire: readonly [string, string];
  gradientSecondaire: readonly [string, string];
  gradientSombre: readonly [string, string, string];
  gris: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

interface ThemeContextType {
  mode: ThemeMode;
  couleurs: ThemeCouleurs;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

// Theme Sombre (par defaut)
export const darkTheme: ThemeCouleurs = {
  primaire: '#6366F1',
  primaireLight: '#818CF8',
  primaireDark: '#4F46E5',
  secondaire: '#10B981',
  secondaireLight: '#34D399',
  secondaireDark: '#059669',
  accent: '#F59E0B',
  fond: '#0F0F14',
  fondSecondaire: '#1A1A24',
  fondTertiaire: '#252532',
  fondCard: '#1A1A24',
  texte: '#FFFFFF',
  texteSecondaire: '#A1A1AA',
  texteMuted: '#71717A',
  succes: '#10B981',
  erreur: '#EF4444',
  danger: '#EF4444',
  attention: '#F59E0B',
  info: '#3B82F6',
  blanc: '#FFFFFF',
  noir: '#000000',
  bordure: 'rgba(255, 255, 255, 0.08)',
  bordureLight: 'rgba(255, 255, 255, 0.12)',
  gradientPrimaire: ['#6366F1', '#8B5CF6'] as const,
  gradientSecondaire: ['#10B981', '#14B8A6'] as const,
  gradientSombre: ['#0F0F14', '#1A1A24', '#0F0F14'] as const,
  gris: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
};

// Theme Clair
export const lightTheme: ThemeCouleurs = {
  primaire: '#6366F1',
  primaireLight: '#818CF8',
  primaireDark: '#4F46E5',
  secondaire: '#10B981',
  secondaireLight: '#34D399',
  secondaireDark: '#059669',
  accent: '#F59E0B',
  fond: '#FFFFFF',
  fondSecondaire: '#F8FAFC',
  fondTertiaire: '#F1F5F9',
  fondCard: '#F8FAFC',
  texte: '#0F172A',
  texteSecondaire: '#64748B',
  texteMuted: '#94A3B8',
  succes: '#10B981',
  erreur: '#EF4444',
  danger: '#EF4444',
  attention: '#F59E0B',
  info: '#3B82F6',
  blanc: '#FFFFFF',
  noir: '#000000',
  bordure: 'rgba(0, 0, 0, 0.08)',
  bordureLight: 'rgba(0, 0, 0, 0.12)',
  gradientPrimaire: ['#6366F1', '#8B5CF6'] as const,
  gradientSecondaire: ['#10B981', '#14B8A6'] as const,
  gradientSombre: ['#FFFFFF', '#F8FAFC', '#FFFFFF'] as const,
  gris: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

const THEME_STORAGE_KEY = '@lpp_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger le theme au demarrage
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setMode(savedTheme);
      }
    } catch (error) {
      console.log('Erreur chargement theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveTheme = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.log('Erreur sauvegarde theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    saveTheme(newMode);
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    saveTheme(newMode);
  };

  const couleurs = mode === 'dark' ? darkTheme : lightTheme;
  const isDark = mode === 'dark';

  // Ne pas render tant que le theme n'est pas charge
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, couleurs, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personnalise pour utiliser le theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit etre utilise dans un ThemeProvider');
  }
  return context;
};

export default ThemeContext;
