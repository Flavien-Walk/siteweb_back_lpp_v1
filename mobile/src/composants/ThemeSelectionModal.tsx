/**
 * ThemeSelectionModal - Choix du theme a la premiere connexion
 * Affiche deux previews (sombre/clair) pour que l'utilisateur choisisse
 * Ne s'affiche qu'une seule fois (stocke dans AsyncStorage)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeMode, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { rayons } from '../constantes/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 72) / 2;
const STORAGE_KEY = '@lpp_theme_chosen';

interface ThemeSelectionModalProps {
  /** Delai avant apparition (ms) */
  delay?: number;
  /** Forcer l'affichage (debug) */
  forceShow?: boolean;
}

const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  delay = 600,
  forceShow = false,
}) => {
  const { setTheme, couleurs, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ThemeMode | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (forceShow) {
      setTimeout(() => showModal(), delay);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== 'done') {
        setTimeout(() => showModal(), delay);
      }
    });
  }, []);

  const showModal = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  };

  // Previsualiser un theme sans confirmer
  const handlePreview = useCallback((mode: ThemeMode) => {
    setSelected(mode);
    setTheme(mode);
  }, [setTheme]);

  // Confirmer le choix et fermer le modal
  const handleConfirm = useCallback(async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
    await AsyncStorage.setItem(STORAGE_KEY, 'done');
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="color-palette" size={28} color="#7C5CFF" />
            </View>
            <Text style={styles.title}>Choisis ton apparence</Text>
            <Text style={styles.subtitle}>
              Tu pourras la changer a tout moment dans les parametres
            </Text>
          </View>

          {/* Theme options */}
          <View style={styles.optionsRow}>
            {/* Dark theme */}
            <Pressable
              style={[
                styles.optionCard,
                { backgroundColor: '#1A1A24' },
                selected === 'dark' && styles.optionSelected,
              ]}
              onPress={() => handlePreview('dark')}
            >
              <PhonePreview mode="dark" isSelected={selected === 'dark'} />
              <View style={styles.optionLabelRow}>
                <Ionicons name="moon" size={16} color="#818CF8" />
                <Text style={[styles.optionLabel, { color: '#FFFFFF' }]}>Sombre</Text>
              </View>
              {selected === 'dark' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {/* Light theme */}
            <Pressable
              style={[
                styles.optionCard,
                { backgroundColor: '#F8FAFC' },
                selected === 'light' && styles.optionSelected,
              ]}
              onPress={() => handlePreview('light')}
            >
              <PhonePreview mode="light" isSelected={selected === 'light'} />
              <View style={styles.optionLabelRow}>
                <Ionicons name="sunny" size={16} color="#F59E0B" />
                <Text style={[styles.optionLabel, { color: '#0F172A' }]}>Clair</Text>
              </View>
              {selected === 'light' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Bouton de confirmation */}
          <Pressable
            style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={styles.confirmBtnText}>
              {selected ? 'Confirmer' : 'Choisis un theme'}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

/**
 * Mini preview d'un ecran d'app dans le theme donne
 */
const PhonePreview: React.FC<{ mode: ThemeMode; isSelected: boolean }> = ({ mode, isSelected }) => {
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[previewStyles.phone, { backgroundColor: theme.fond }]}>
      {/* Status bar mockup */}
      <View style={previewStyles.statusBar}>
        <View style={[previewStyles.statusDot, { backgroundColor: theme.texteSecondaire }]} />
        <View style={[previewStyles.statusLine, { backgroundColor: theme.texteSecondaire }]} />
      </View>

      {/* Header mockup */}
      <View style={previewStyles.appHeader}>
        <View style={[previewStyles.headerLogo, { backgroundColor: theme.primaire }]}>
          <Text style={previewStyles.headerLogoText}>L</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={[previewStyles.headerLine, { backgroundColor: theme.texte, width: '60%' }]} />
          <View style={[previewStyles.headerLineSm, { backgroundColor: theme.texteSecondaire, width: '40%' }]} />
        </View>
      </View>

      {/* Stories row mockup */}
      <View style={previewStyles.storiesRow}>
        {[theme.primaire, '#10B981', '#F59E0B', '#EF4444'].map((color, i) => (
          <View key={i} style={[previewStyles.storyCircle, { borderColor: color }]}>
            <View style={[previewStyles.storyAvatar, { backgroundColor: color + '30' }]} />
          </View>
        ))}
      </View>

      {/* Post card mockup */}
      <View style={[previewStyles.postCard, { backgroundColor: theme.fondCard }]}>
        <View style={previewStyles.postHeader}>
          <View style={[previewStyles.postAvatar, { backgroundColor: theme.primaire + '30' }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={[previewStyles.postLine, { backgroundColor: theme.texte }]} />
            <View style={[previewStyles.postLineSm, { backgroundColor: theme.texteSecondaire }]} />
          </View>
        </View>
        <View style={[previewStyles.postImage, { backgroundColor: theme.fondTertiaire }]}>
          <Ionicons name="image-outline" size={16} color={theme.texteSecondaire} />
        </View>
        <View style={previewStyles.postActions}>
          <Ionicons name="heart-outline" size={12} color={theme.texteSecondaire} />
          <Ionicons name="chatbubble-outline" size={11} color={theme.texteSecondaire} />
          <Ionicons name="share-outline" size={12} color={theme.texteSecondaire} />
        </View>
      </View>

      {/* Tab bar mockup */}
      <View style={[previewStyles.tabBar, { backgroundColor: theme.fondSecondaire, borderTopColor: theme.bordure }]}>
        {['home', 'compass', 'radio', 'chatbubble', 'person'].map((icon, i) => (
          <Ionicons
            key={i}
            name={(i === 0 ? icon : `${icon}-outline`) as any}
            size={12}
            color={i === 0 ? theme.primaire : theme.texteSecondaire}
          />
        ))}
      </View>
    </View>
  );
};

// === STYLES ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: '#1E1E2E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 92, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#7C5CFF',
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: '#7C5CFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(124, 92, 255, 0.3)',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

const previewStyles = StyleSheet.create({
  phone: {
    width: '100%',
    aspectRatio: 0.55,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 6,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusLine: {
    height: 2,
    width: 20,
    borderRadius: 1,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  headerLogo: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerLine: {
    height: 3,
    borderRadius: 1.5,
  },
  headerLineSm: {
    height: 2,
    borderRadius: 1,
  },
  storiesRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  storyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  postCard: {
    borderRadius: 8,
    padding: 6,
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  postAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  postLine: {
    height: 2.5,
    borderRadius: 1,
    width: '70%',
  },
  postLineSm: {
    height: 2,
    borderRadius: 1,
    width: '50%',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  postActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    borderTopWidth: 0.5,
    marginTop: 4,
    borderRadius: 0,
  },
});

export default ThemeSelectionModal;
