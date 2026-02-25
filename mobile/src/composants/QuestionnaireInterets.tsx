/**
 * QuestionnaireInterets - Modal 2 etapes pour capturer les centres d'interet
 * Etape 1: Selection des categories (multi-select grille 2 colonnes)
 * Etape 2: Selection des maturites (multi-select cartes verticales)
 *
 * Affiche au premier clic sur "Decouvrir" (si onboardingInterets.completedAt est null)
 * Re-editable depuis les parametres du profil
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../constantes/theme';
import { CATEGORIES, MATURITES } from '../constantes/projets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = espacements.sm;
const CARD_WIDTH = (SCREEN_WIDTH - espacements.lg * 2 - CARD_GAP) / 2;

// Couleurs par categorie pour un rendu visuel attractif
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  tech: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' },
  food: { bg: 'rgba(249, 115, 22, 0.12)', color: '#F97316' },
  sante: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
  education: { bg: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' },
  energie: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
  culture: { bg: 'rgba(236, 72, 153, 0.12)', color: '#EC4899' },
  environnement: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' },
  autre: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6B7280' },
};

const MATURITE_COLORS: Record<string, { bg: string; color: string }> = {
  idee: { bg: 'rgba(156, 163, 175, 0.12)', color: '#9CA3AF' },
  prototype: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
  lancement: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' },
  croissance: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' },
};

// Icones pour les maturites
const MATURITE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  idee: 'bulb-outline',
  prototype: 'construct-outline',
  lancement: 'rocket-outline',
  croissance: 'trending-up-outline',
};

interface QuestionnaireInteretsProps {
  visible: boolean;
  onComplete: (categories: string[], maturites: string[]) => Promise<void>;
  onSkip: () => void;
  initialCategories?: string[];
  initialMaturites?: string[];
}

export const QuestionnaireInterets: React.FC<QuestionnaireInteretsProps> = ({
  visible,
  onComplete,
  onSkip,
  initialCategories = [],
  initialMaturites = [],
}) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  const [etape, setEtape] = useState<1 | 2>(1);
  const [categoriesSelectionnees, setCategoriesSelectionnees] = useState<string[]>(initialCategories);
  const [maturitesSelectionnees, setMaturitesSelectionnees] = useState<string[]>(initialMaturites);
  const [chargement, setChargement] = useState(false);

  const toggleCategorie = useCallback((value: string) => {
    setCategoriesSelectionnees(prev =>
      prev.includes(value)
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  }, []);

  const toggleMaturite = useCallback((value: string) => {
    setMaturitesSelectionnees(prev =>
      prev.includes(value)
        ? prev.filter(m => m !== value)
        : [...prev, value]
    );
  }, []);

  const handleSuivant = useCallback(() => {
    setEtape(2);
  }, []);

  const handleRetour = useCallback(() => {
    setEtape(1);
  }, []);

  const handleValider = useCallback(async () => {
    setChargement(true);
    try {
      await onComplete(categoriesSelectionnees, maturitesSelectionnees);
    } finally {
      setChargement(false);
    }
  }, [categoriesSelectionnees, maturitesSelectionnees, onComplete]);

  const canProceedStep1 = categoriesSelectionnees.length > 0;
  const canProceedStep2 = maturitesSelectionnees.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={couleurs.gradientPrimaire as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Text style={styles.logoTexte}>LPP</Text>
          </LinearGradient>

          {/* Indicateur d'etape */}
          <View style={styles.etapeIndicateur}>
            <View style={[styles.etapeDot, etape >= 1 && styles.etapeDotActive]} />
            <View style={[styles.etapeBarre, etape >= 2 && styles.etapeBarreActive]} />
            <View style={[styles.etapeDot, etape >= 2 && styles.etapeDotActive]} />
          </View>
          <Text style={styles.etapeTexte}>Etape {etape}/2</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {etape === 1 ? (
            <>
              {/* Etape 1: Categories */}
              <Text style={styles.titre}>Quels domaines t'interessent ?</Text>
              <Text style={styles.sousTitre}>
                Selectionne au moins une categorie pour personnaliser tes recommandations
              </Text>

              <View style={styles.grille}>
                {CATEGORIES.map((cat) => {
                  const isSelected = categoriesSelectionnees.includes(cat.value);
                  const colors = CATEGORY_COLORS[cat.value] || CATEGORY_COLORS.autre;
                  return (
                    <Pressable
                      key={cat.value}
                      style={[
                        styles.categorieCard,
                        isSelected && { borderColor: colors.color, borderWidth: 2 },
                      ]}
                      onPress={() => toggleCategorie(cat.value)}
                    >
                      <View style={[styles.categorieIconContainer, { backgroundColor: colors.bg }]}>
                        <Ionicons
                          name={cat.icon as keyof typeof Ionicons.glyphMap}
                          size={28}
                          color={colors.color}
                        />
                      </View>
                      <Text style={[styles.categorieLabel, isSelected && { color: colors.color, fontWeight: typographie.poids.semibold as any }]}>
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              {/* Etape 2: Maturites */}
              <Text style={styles.titre}>Quel stade de projet te parle ?</Text>
              <Text style={styles.sousTitre}>
                Tu peux en choisir plusieurs
              </Text>

              <View style={styles.maturitesList}>
                {MATURITES.map((mat) => {
                  const isSelected = maturitesSelectionnees.includes(mat.value);
                  const colors = MATURITE_COLORS[mat.value] || MATURITE_COLORS.idee;
                  const icon = MATURITE_ICONS[mat.value] || 'ellipsis-horizontal';
                  return (
                    <Pressable
                      key={mat.value}
                      style={[
                        styles.maturiteCard,
                        isSelected && { borderColor: colors.color, borderWidth: 2 },
                      ]}
                      onPress={() => toggleMaturite(mat.value)}
                    >
                      <View style={[styles.maturiteIconContainer, { backgroundColor: colors.bg }]}>
                        <Ionicons name={icon} size={24} color={colors.color} />
                      </View>
                      <View style={styles.maturiteContent}>
                        <Text style={[styles.maturiteLabel, isSelected && { color: colors.color }]}>
                          {mat.label}
                        </Text>
                        <Text style={styles.maturiteDescription}>{mat.description}</Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {etape === 1 ? (
            <>
              <Pressable
                style={[styles.boutonPrincipal, !canProceedStep1 && styles.boutonDesactive]}
                onPress={handleSuivant}
                disabled={!canProceedStep1}
              >
                <Text style={[styles.boutonPrincipalTexte, !canProceedStep1 && styles.boutonDesactiveTexte]}>
                  Suivant
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={canProceedStep1 ? '#FFFFFF' : couleurs.texteSecondaire}
                />
              </Pressable>
              <Pressable style={styles.boutonPasser} onPress={onSkip}>
                <Text style={styles.boutonPasserTexte}>Passer</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.footerRow}>
                <Pressable style={styles.boutonRetour} onPress={handleRetour}>
                  <Ionicons name="arrow-back" size={18} color={couleurs.texte} />
                  <Text style={styles.boutonRetourTexte}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[styles.boutonValider, !canProceedStep2 && styles.boutonDesactive]}
                  onPress={handleValider}
                  disabled={!canProceedStep2 || chargement}
                >
                  {chargement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={[styles.boutonPrincipalTexte, !canProceedStep2 && styles.boutonDesactiveTexte]}>
                        Valider
                      </Text>
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={canProceedStep2 ? '#FFFFFF' : couleurs.texteSecondaire}
                      />
                    </>
                  )}
                </Pressable>
              </View>
              <Pressable style={styles.boutonPasser} onPress={onSkip}>
                <Text style={styles.boutonPasserTexte}>Passer</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  header: {
    alignItems: 'center',
    paddingTop: espacements.lg,
    paddingBottom: espacements.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: rayons.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.md,
  },
  logoTexte: {
    fontSize: 18,
    fontWeight: typographie.poids.bold as any,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  etapeIndicateur: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacements.xs,
  },
  etapeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: couleurs.bordure,
  },
  etapeDotActive: {
    backgroundColor: couleurs.primaire,
  },
  etapeBarre: {
    width: 40,
    height: 3,
    backgroundColor: couleurs.bordure,
    marginHorizontal: espacements.xs,
  },
  etapeBarreActive: {
    backgroundColor: couleurs.primaire,
  },
  etapeTexte: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.xl,
  },
  titre: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold as any,
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: espacements.xs,
  },
  sousTitre: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.lg,
    lineHeight: 20,
  },

  // Grille categories (2 colonnes)
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  categorieCard: {
    width: CARD_WIDTH,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categorieIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  categorieLabel: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium as any,
    color: couleurs.texte,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cartes maturite (vertical)
  maturitesList: {
    gap: espacements.sm,
  },
  maturiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  maturiteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacements.md,
  },
  maturiteContent: {
    flex: 1,
  },
  maturiteLabel: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold as any,
    color: couleurs.texte,
    marginBottom: 2,
  },
  maturiteDescription: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
    paddingTop: espacements.sm,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  footerRow: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  boutonPrincipal: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.lg,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.xs,
  },
  boutonPrincipalTexte: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold as any,
    color: '#FFFFFF',
  },
  boutonDesactive: {
    backgroundColor: couleurs.fondSecondaire,
  },
  boutonDesactiveTexte: {
    color: couleurs.texteSecondaire,
  },
  boutonPasser: {
    alignItems: 'center',
    paddingVertical: espacements.sm,
    marginTop: espacements.xs,
  },
  boutonPasserTexte: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  boutonRetour: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.xs,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    paddingVertical: espacements.md,
  },
  boutonRetourTexte: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium as any,
    color: couleurs.texte,
  },
  boutonValider: {
    flex: 2,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.lg,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.xs,
  },
});

export default QuestionnaireInterets;
