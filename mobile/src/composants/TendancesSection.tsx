/**
 * TendancesSection — Section complete "Tendances"
 * Classement global des projets par score algorithmique
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../constantes/theme';
import { getProjetsTendanceV2, getProjetsTendance, ProjetTendance, CategorieProjet } from '../services/projets';
import CarteProjetTendance from './CarteProjetTendance';
import SkeletonTendances from './SkeletonTendances';
import EtatVideTendances from './EtatVideTendances';

interface Props {
  isActive: boolean;
}

const CATEGORIES: { value: CategorieProjet | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'tech', label: 'Tech' },
  { value: 'food', label: 'Food' },
  { value: 'sante', label: 'Sante' },
  { value: 'education', label: 'Education' },
  { value: 'energie', label: 'Energie' },
  { value: 'culture', label: 'Culture' },
  { value: 'environnement', label: 'Environnement' },
];

const TendancesSection: React.FC<Props> = ({ isActive }) => {
  const { couleurs } = useTheme();
  const [projets, setProjets] = useState<ProjetTendance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [categorie, setCategorie] = useState<CategorieProjet | 'all'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const chargerTendances = useCallback(async (pageNum = 1, cat?: CategorieProjet | 'all', refresh = false) => {
    try {
      if (refresh) setRafraichissement(true);
      else if (pageNum === 1) setChargement(true);
      setErreur(false);

      const catFiltre = cat ?? categorie;
      const reponse = await getProjetsTendanceV2(
        pageNum,
        20,
        catFiltre !== 'all' ? catFiltre : undefined
      );

      if (reponse.succes && reponse.data) {
        const newProjets = reponse.data.projets;
        if (pageNum === 1) {
          setProjets(newProjets);
        } else {
          setProjets(prev => [...prev, ...newProjets]);
        }
        setHasMore(newProjets.length >= 20);
        setPage(pageNum);
      } else {
        // Fallback sur l'ancien endpoint
        if (pageNum === 1) {
          const fallback = await getProjetsTendance(20);
          if (fallback.succes && fallback.data) {
            setProjets(fallback.data.projets.map(p => ({
              ...p,
              trendingScore: 0,
              trendingRank: 0,
            })));
          } else {
            setErreur(true);
          }
        }
      }
    } catch {
      if (page === 1) setErreur(true);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [categorie]);

  // Charger au premier affichage
  useEffect(() => {
    if (isActive && projets.length === 0 && chargement) {
      chargerTendances(1);
    }
  }, [isActive]);

  const handleRefresh = useCallback(() => {
    chargerTendances(1, undefined, true);
  }, [chargerTendances]);

  const handleCategorieChange = useCallback((cat: CategorieProjet | 'all') => {
    setCategorie(cat);
    setProjets([]);
    chargerTendances(1, cat);
  }, [chargerTendances]);

  const handleFollowChange = useCallback((projetId: string, estSuivi: boolean, nbFollowers: number) => {
    setProjets(prev => prev.map(p =>
      p._id === projetId ? { ...p, estSuivi, nbFollowers } : p
    ));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !chargement && !rafraichissement) {
      chargerTendances(page + 1);
    }
  }, [hasMore, chargement, rafraichissement, page, chargerTendances]);

  const maxScore = projets.length > 0
    ? Math.max(...projets.map(p => p.trendingScore || 0))
    : 1;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={handleRefresh}
          tintColor="#F59E0B"
        />
      }
      onScroll={({ nativeEvent }) => {
        const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
        if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) {
          handleEndReached();
        }
      }}
      scrollEventThrottle={400}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flame" size={18} color="#F59E0B" />
        <Text style={[styles.headerTitle, { color: couleurs.texte }]}>Tendances</Text>
      </View>

      {/* Filtres categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map(cat => {
          const isActive = categorie === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => handleCategorieChange(cat.value)}
              style={[
                styles.categoryChip,
                isActive
                  ? { backgroundColor: '#F59E0B' + '20', borderColor: '#F59E0B' }
                  : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
              ]}
            >
              <Text style={[
                styles.categoryText,
                { color: isActive ? '#F59E0B' : couleurs.texteSecondaire },
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenu */}
      <View style={styles.content}>
        {chargement && projets.length === 0 ? (
          <SkeletonTendances count={5} />
        ) : erreur && projets.length === 0 ? (
          <EtatVideTendances
            message="Impossible de charger les tendances"
            onRetry={() => chargerTendances(1)}
          />
        ) : projets.length === 0 ? (
          <EtatVideTendances onRetry={() => chargerTendances(1)} />
        ) : (
          projets.map((projet, index) => (
            <CarteProjetTendance
              key={projet._id}
              projet={projet}
              rang={index + 1}
              maxScore={maxScore}
              onFollowChange={handleFollowChange}
            />
          ))
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerLogo, { color: couleurs.primaire }]}>LPP</Text>
        <Text style={[styles.footerText, { color: couleurs.texteSecondaire }]}>La Premiere Pierre</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
  },
  headerTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
  },
  categoriesScroll: {
    marginBottom: espacements.sm,
  },
  categoriesContainer: {
    paddingHorizontal: espacements.md,
    gap: espacements.sm,
  },
  categoryChip: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  content: {
    paddingHorizontal: espacements.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
  },
  footerLogo: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.extrabold,
  },
  footerText: {
    fontSize: typographie.tailles.xs,
    marginTop: espacements.xs,
  },
});

export default React.memo(TendancesSection);
