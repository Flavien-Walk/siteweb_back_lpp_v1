/**
 * PourToiSection — Section complete "Pour Toi" avec infinite scroll
 * Feed personnalise de recommandations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { espacements, typographie } from '../constantes/theme';
import { getRecommandations, getProjets, ProjetRecommande, Projet } from '../services/projets';
import CarteProjetPourToi from './CarteProjetPourToi';
import SkeletonPourToi from './SkeletonPourToi';
import EtatVideRecommandations from './EtatVideRecommandations';

interface Props {
  isActive: boolean;
}

const PourToiSection: React.FC<Props> = ({ isActive }) => {
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const [projets, setProjets] = useState<ProjetRecommande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const chargerRecommandations = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRafraichissement(true);
      else if (pageNum === 1) setChargement(true);
      setErreur(false);

      const reponse = await getRecommandations(pageNum, 20);

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
        // Fallback sur getProjets chronologique
        if (pageNum === 1) {
          const fallback = await getProjets({ limit: 20 });
          if (fallback.succes && fallback.data) {
            setProjets(fallback.data.projets.map(p => ({
              ...p,
              recommendationScore: 0,
              recommendationSource: 'fallback',
              recommendationLabel: 'Recommande pour vous',
              followersCount: p.nbFollowers,
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
  }, []);

  // Charger au premier affichage
  useEffect(() => {
    if (isActive && projets.length === 0 && chargement) {
      chargerRecommandations(1);
    }
  }, [isActive]);

  const handleRefresh = useCallback(() => {
    chargerRecommandations(1, true);
  }, [chargerRecommandations]);

  const handleFollowChange = useCallback((projetId: string, estSuivi: boolean, nbFollowers: number) => {
    setProjets(prev => prev.map(p =>
      p._id === projetId ? { ...p, estSuivi, nbFollowers } : p
    ));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !chargement && !rafraichissement) {
      chargerRecommandations(page + 1);
    }
  }, [hasMore, chargement, rafraichissement, page, chargerRecommandations]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={handleRefresh}
          tintColor={couleurs.primaire}
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
        <Ionicons name="sparkles" size={18} color={couleurs.primaire} />
        <Text style={[styles.headerTitle, { color: couleurs.texte }]}>Pour Toi</Text>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {chargement && projets.length === 0 ? (
          <SkeletonPourToi count={3} />
        ) : erreur && projets.length === 0 ? (
          <EtatVideRecommandations
            message="Impossible de charger les recommandations"
            onRetry={() => chargerRecommandations(1)}
          />
        ) : projets.length === 0 ? (
          <EtatVideRecommandations onRetry={() => chargerRecommandations(1)} />
        ) : (
          projets.map(projet => (
            <CarteProjetPourToi
              key={projet._id}
              projet={projet}
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

export default React.memo(PourToiSection);
