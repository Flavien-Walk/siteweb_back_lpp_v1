/**
 * Ecran Quetes - Liste complete par chapitre
 * Affiche toutes les quetes organisees en chapitres avec progression.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons } from '../../src/constantes/theme';
import { SwipeableScreen } from '../../src/composants';
import { useUser } from '../../src/contexts/UserContext';
import { getQuetes, getMonParcours } from '../../src/services/parcours';
import type { Quete, ParcoursData } from '../../src/services/parcours';

// === TYPES ===

interface QueteAvecStatut extends Quete {
  completee: boolean;
}

interface ChapitreData {
  nom: string;
  niveauRequis: number;
  quetes: QueteAvecStatut[];
  completees: number;
  total: number;
  debloque: boolean;
}

// Chapitres dans l'ordre
const CHAPITRES_ORDRE = [
  { nom: 'Decouverte', niveau: 1, icone: 'compass-outline', couleur: '#2DE2E6', description: 'Apprendre les bases' },
  { nom: 'Engagement', niveau: 2, icone: 'flame-outline', couleur: '#FFBD59', description: 'Participer activement' },
  { nom: 'Connexion', niveau: 3, icone: 'people-outline', couleur: '#7C5CFF', description: 'Tisser des liens' },
  { nom: 'Contribution', niveau: 4, icone: 'trending-up-outline', couleur: '#00D68F', description: 'Laisser sa marque' },
  { nom: 'Maitrise', niveau: 5, icone: 'diamond-outline', couleur: '#FF4D6D', description: 'Inspirer les autres' },
];

// === COMPOSANT QUETE CARD ===

const QueteCard = React.memo(({ quete, debloque }: { quete: QueteAvecStatut; debloque: boolean }) => {
  const isCompleted = quete.completee;
  const isLocked = !debloque;

  return (
    <View style={[styles.queteCard, isLocked && styles.queteCardLocked]}>
      {/* Icone */}
      <View style={[
        styles.queteIconContainer,
        isCompleted && styles.queteIconCompleted,
        isLocked && styles.queteIconLocked,
      ]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : isLocked ? (
          <Ionicons name="lock-closed" size={14} color={couleurs.texteMuted} />
        ) : (
          <Ionicons name={(quete.icone || 'flag-outline') as any} size={16} color={couleurs.texte} />
        )}
      </View>

      {/* Infos */}
      <View style={styles.queteInfoContainer}>
        <Text style={[styles.queteTitre, isLocked && styles.queteTextLocked]} numberOfLines={1}>
          {quete.titre}
        </Text>
        <Text style={[styles.queteDesc, isLocked && styles.queteTextLocked]} numberOfLines={1}>
          {quete.description}
        </Text>
      </View>

      {/* XP Badge */}
      <View style={[styles.queteXpBadge, isCompleted && styles.queteXpCompleted]}>
        <Text style={[styles.queteXpText, isCompleted && styles.queteXpTextCompleted]}>
          {isCompleted ? 'OK' : `+${quete.xp}`}
        </Text>
      </View>

      {/* Type badge (entrepreneur only) */}
      {quete.type === 'entrepreneur' && (
        <View style={styles.typeBadge}>
          <Ionicons name="briefcase" size={8} color={couleurs.accent} />
        </View>
      )}
    </View>
  );
});

// === COMPOSANT CHAPITRE SECTION ===

const ChapitreSection = React.memo(({
  chapitre,
  config,
  index,
}: {
  chapitre: ChapitreData;
  config: typeof CHAPITRES_ORDRE[0];
  index: number;
}) => {
  const [expanded, setExpanded] = useState(chapitre.debloque && chapitre.completees < chapitre.total);
  const heightAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(heightAnim, {
      toValue: next ? 1 : 0,
      friction: 12,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const progress = chapitre.total > 0 ? chapitre.completees / chapitre.total : 0;
  const isFullyCompleted = chapitre.completees === chapitre.total && chapitre.total > 0;

  return (
    <View style={styles.chapitreContainer}>
      {/* Header cliquable */}
      <Pressable style={styles.chapitreHeader} onPress={toggleExpand}>
        {/* Numero + Icone */}
        <View style={[
          styles.chapitreIconContainer,
          { backgroundColor: chapitre.debloque ? config.couleur + '20' : couleurs.fondCard },
        ]}>
          {chapitre.debloque ? (
            isFullyCompleted ? (
              <Ionicons name="checkmark-circle" size={20} color={config.couleur} />
            ) : (
              <Ionicons name={config.icone as any} size={18} color={config.couleur} />
            )
          ) : (
            <Ionicons name="lock-closed" size={16} color={couleurs.texteMuted} />
          )}
        </View>

        {/* Infos chapitre */}
        <View style={styles.chapitreInfo}>
          <View style={styles.chapitreTitleRow}>
            <Text style={[styles.chapitreNom, !chapitre.debloque && styles.chapitreNomLocked]}>
              Ch.{config.niveau} · {config.nom}
            </Text>
            {isFullyCompleted && (
              <View style={[styles.completeBadge, { backgroundColor: config.couleur + '20' }]}>
                <Text style={[styles.completeBadgeText, { color: config.couleur }]}>Termine</Text>
              </View>
            )}
          </View>
          <Text style={styles.chapitreDesc}>{config.description}</Text>

          {/* Mini barre de progression */}
          {chapitre.debloque && (
            <View style={styles.chapitreProgressRow}>
              <View style={styles.chapitreProgressBg}>
                <View style={[
                  styles.chapitreProgressFill,
                  { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: config.couleur },
                ]} />
              </View>
              <Text style={[styles.chapitreProgressText, { color: config.couleur }]}>
                {chapitre.completees}/{chapitre.total}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={couleurs.texteSecondaire}
        />
      </Pressable>

      {/* Liste des quetes (collapsible) */}
      {expanded && (
        <View style={styles.quetesList}>
          {chapitre.quetes.map((quete) => (
            <QueteCard key={quete.id} quete={quete} debloque={chapitre.debloque} />
          ))}
        </View>
      )}
    </View>
  );
});

// === ECRAN PRINCIPAL ===

export default function QuetesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [chapitres, setChapitres] = useState<ChapitreData[]>([]);
  const [parcours, setParcours] = useState<ParcoursData | null>(null);
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const chargerDonnees = useCallback(async () => {
    try {
      const [quetesRes, parcoursRes] = await Promise.all([
        getQuetes(),
        getMonParcours(),
      ]);

      if (parcoursRes.succes && parcoursRes.data) {
        setParcours(parcoursRes.data.parcours);
      }

      const niveauActuel = parcoursRes.data?.parcours?.niveau ?? 1;
      const quetesCompletees = parcoursRes.data?.parcours?.quetesCompletees ?? [];

      if (quetesRes.succes && quetesRes.data) {
        const toutesQuetes = quetesRes.data.quetes;

        // Grouper par chapitre
        const chapitresMap: ChapitreData[] = CHAPITRES_ORDRE.map((config) => {
          const quetesChapitre = toutesQuetes
            .filter((q: QueteAvecStatut) => q.chapitre === config.nom)
            .filter((q: QueteAvecStatut) => {
              if (q.type === 'tous') return true;
              return q.type === (user?.statut || 'visiteur');
            });

          const completees = quetesChapitre.filter((q: QueteAvecStatut) => q.completee).length;

          return {
            nom: config.nom,
            niveauRequis: config.niveau,
            quetes: quetesChapitre,
            completees,
            total: quetesChapitre.length,
            debloque: niveauActuel >= config.niveau,
          };
        });

        setChapitres(chapitresMap);
      }
    } catch (err) {
      console.warn('[Quetes] Erreur chargement:', err);
    } finally {
      setChargement(false);
      setRefreshing(false);
    }
  }, [user?.statut]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerDonnees();
  }, [chargerDonnees]);

  // Stats globales
  const totalQuetes = chapitres.reduce((acc, c) => acc + c.total, 0);
  const totalCompletees = chapitres.reduce((acc, c) => acc + c.completees, 0);
  const progressGlobal = totalQuetes > 0 ? totalCompletees / totalQuetes : 0;

  const content = (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Quetes</Text>
        <View style={styles.headerRight} />
      </View>

      {chargement ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={couleurs.primaire}
              colors={[couleurs.primaire]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Resume global */}
          <View style={styles.resumeCard}>
            <LinearGradient
              colors={['rgba(124, 92, 255, 0.12)', 'rgba(45, 226, 230, 0.06)', 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.resumeHeader}>
              <View>
                <Text style={styles.resumeTitle}>Ta progression</Text>
                <Text style={styles.resumeSubtitle}>
                  {parcours ? `${parcours.niveauNom} · Niveau ${parcours.niveau}` : 'Chargement...'}
                </Text>
              </View>
              <View style={styles.resumeXpBadge}>
                <Text style={styles.resumeXpText}>{parcours?.xp ?? 0} XP</Text>
              </View>
            </View>

            {/* Barre de progression globale */}
            <View style={styles.resumeProgressContainer}>
              <View style={styles.resumeProgressBg}>
                <View style={[styles.resumeProgressFill, { width: `${Math.min(progressGlobal * 100, 100)}%` }]} />
              </View>
              <Text style={styles.resumeProgressText}>
                {totalCompletees}/{totalQuetes} quetes completees
              </Text>
            </View>
          </View>

          {/* Chapitres */}
          {chapitres.map((chapitre, index) => (
            <ChapitreSection
              key={chapitre.nom}
              chapitre={chapitre}
              config={CHAPITRES_ORDRE[index]}
              index={index}
            />
          ))}

          {/* Legende */}
          <View style={styles.legende}>
            <View style={styles.legendeItem}>
              <Ionicons name="briefcase" size={10} color={couleurs.accent} />
              <Text style={styles.legendeText}>= Quete entrepreneur uniquement</Text>
            </View>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      )}
    </View>
  );

  return Platform.OS === 'android' ? (
    <SwipeableScreen>{content}</SwipeableScreen>
  ) : (
    content
  );
}

// === STYLES ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  headerRight: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: espacements.lg,
    gap: espacements.md,
  },

  // Resume global
  resumeCard: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: espacements.md,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  resumeSubtitle: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  resumeXpBadge: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rayons.md,
  },
  resumeXpText: {
    fontSize: 14,
    fontWeight: '700',
    color: couleurs.primaire,
  },
  resumeProgressContainer: {
    gap: 6,
  },
  resumeProgressBg: {
    height: 6,
    backgroundColor: couleurs.fondCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  resumeProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: couleurs.primaire,
  },
  resumeProgressText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },

  // Chapitre
  chapitreContainer: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  chapitreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    gap: espacements.md,
  },
  chapitreIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapitreInfo: {
    flex: 1,
  },
  chapitreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chapitreNom: {
    fontSize: 15,
    fontWeight: '700',
    color: couleurs.texte,
  },
  chapitreNomLocked: {
    color: couleurs.texteMuted,
  },
  chapitreDesc: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  completeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chapitreProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  chapitreProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: couleurs.fondCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  chapitreProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chapitreProgressText: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 24,
  },

  // Liste quetes
  quetesList: {
    paddingHorizontal: espacements.md,
    paddingBottom: espacements.md,
    gap: 6,
  },
  queteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    padding: espacements.sm,
    gap: espacements.sm,
  },
  queteCardLocked: {
    opacity: 0.5,
  },
  queteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: couleurs.fondElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queteIconCompleted: {
    backgroundColor: couleurs.succes,
  },
  queteIconLocked: {
    backgroundColor: couleurs.fondCard,
  },
  queteInfoContainer: {
    flex: 1,
  },
  queteTitre: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
  },
  queteDesc: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  queteTextLocked: {
    color: couleurs.texteMuted,
  },
  queteXpBadge: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  queteXpCompleted: {
    backgroundColor: couleurs.succesLight,
  },
  queteXpText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.primaire,
  },
  queteXpTextCompleted: {
    color: couleurs.succes,
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },

  // Legende
  legende: {
    paddingVertical: espacements.sm,
    paddingHorizontal: espacements.xs,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendeText: {
    fontSize: 10,
    color: couleurs.texteMuted,
  },
});
