/**
 * CarteProjetTendance — Carte trending avec rang et score visuel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../constantes/theme';
import { ProjetTendance, toggleSuivreProjet } from '../services/projets';
import { trackClick, trackImpression } from '../services/engagement';
import { useGamification } from '../contexts/GamificationContext';

interface Props {
  projet: ProjetTendance;
  rang: number;
  maxScore?: number;
  onFollowChange?: (projetId: string, estSuivi: boolean, nbFollowers: number) => void;
}

const RANG_COLORS: Record<number, string> = {
  1: '#FFD700', // Or
  2: '#C0C0C0', // Argent
  3: '#CD7F32', // Bronze
};

const CarteProjetTendance: React.FC<Props> = ({ projet, rang, maxScore = 1, onFollowChange }) => {
  const { couleurs } = useTheme();
  const { applyDelta } = useGamification();
  const [suivi, setSuivi] = useState(projet.estSuivi);
  const [nbFollowers, setNbFollowers] = useState(projet.nbFollowers);
  const [enCours, setEnCours] = useState(false);
  const [impressionTracked, setImpressionTracked] = useState(false);

  useEffect(() => {
    if (!enCours) {
      setSuivi(projet.estSuivi);
      setNbFollowers(projet.nbFollowers);
    }
  }, [projet._id, projet.estSuivi, projet.nbFollowers, enCours]);

  const handleLayout = useCallback(() => {
    if (!impressionTracked) {
      trackImpression(projet._id);
      setImpressionTracked(true);
    }
  }, [projet._id, impressionTracked]);

  const handlePress = () => {
    trackClick(projet._id);
    router.push({ pathname: '/(app)/projet/[id]', params: { id: projet._id } });
  };

  const handleToggleSuivre = async () => {
    if (enCours) return;
    setEnCours(true);
    const prevSuivi = suivi;
    const prevNbFollowers = nbFollowers;
    const newSuivi = !suivi;
    const newNbFollowers = suivi ? nbFollowers - 1 : nbFollowers + 1;
    setSuivi(newSuivi);
    setNbFollowers(newNbFollowers);

    try {
      const reponse = await toggleSuivreProjet(projet._id);
      if (reponse.succes && reponse.data) {
        const apiData = reponse.data as any;
        const apiEstSuivi = apiData.estSuivi ?? apiData.suivi;
        const apiNbFollowers = apiData.nbFollowers ?? apiData.totalFollowers;
        if (typeof apiEstSuivi === 'boolean') setSuivi(apiEstSuivi);
        if (typeof apiNbFollowers === 'number') setNbFollowers(apiNbFollowers);
        if (reponse.gamification) applyDelta(reponse.gamification);
        onFollowChange?.(projet._id, apiEstSuivi ?? newSuivi, apiNbFollowers ?? newNbFollowers);
      } else {
        setSuivi(prevSuivi);
        setNbFollowers(prevNbFollowers);
      }
    } catch {
      setSuivi(prevSuivi);
      setNbFollowers(prevNbFollowers);
    } finally {
      setEnCours(false);
    }
  };

  const rangColor = RANG_COLORS[rang] || couleurs.texteMuted;
  const scoreRatio = maxScore > 0 ? (projet.trendingScore || 0) / maxScore : 0;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}
      onPress={handlePress}
      onLayout={handleLayout}
    >
      {/* Rang badge */}
      <View style={[styles.rangBadge, { backgroundColor: rangColor + '20', borderColor: rangColor }]}>
        <Text style={[styles.rangText, { color: rangColor }]}>#{rang}</Text>
      </View>

      {/* Image */}
      <Image
        source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' }}
        style={styles.image}
      />

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={[styles.nom, { color: couleurs.texte }]} numberOfLines={1}>{projet.nom}</Text>
        <Text style={[styles.pitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
          {projet.pitch || projet.description}
        </Text>

        {/* Barre de tendance */}
        <View style={[styles.trendBar, { backgroundColor: couleurs.bordure }]}>
          <View
            style={[
              styles.trendBarFill,
              {
                width: `${Math.max(5, scoreRatio * 100)}%`,
                backgroundColor: rang <= 3 ? rangColor : couleurs.primaire,
              },
            ]}
          />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={13} color={couleurs.texteSecondaire} />
            <Text style={[styles.statText, { color: couleurs.texteSecondaire }]}>{nbFollowers}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="flame" size={13} color="#F59E0B" />
            <Text style={[styles.statText, { color: couleurs.texteSecondaire }]}>
              {Math.round((projet.trendingScore || 0) * 10) / 10}
            </Text>
          </View>
          {projet.tags?.slice(0, 2).map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: couleurs.fondSecondaire }]}>
              <Text style={[styles.tagText, { color: couleurs.texteSecondaire }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Bouton suivre */}
        <Pressable
          style={[
            styles.btnSuivre,
            suivi
              ? { backgroundColor: couleurs.primaire + '15', borderColor: couleurs.primaire }
              : { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
            enCours && { opacity: 0.6 },
          ]}
          onPress={(e) => { e.stopPropagation(); handleToggleSuivre(); }}
          disabled={enCours}
        >
          <Ionicons
            name={suivi ? 'checkmark' : 'add'}
            size={14}
            color={suivi ? couleurs.primaire : '#FFFFFF'}
          />
          <Text style={[styles.btnSuivreText, { color: suivi ? couleurs.primaire : '#FFFFFF' }]}>
            {suivi ? 'Suivi' : 'Suivre'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: rayons.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: espacements.md,
  },
  rangBadge: {
    position: 'absolute',
    top: espacements.sm,
    left: espacements.sm,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: rayons.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangText: {
    fontSize: 13,
    fontWeight: typographie.poids.bold,
  },
  image: {
    width: 130,
    height: '100%',
    minHeight: 160,
  },
  content: {
    flex: 1,
    padding: espacements.md,
    justifyContent: 'space-between',
  },
  nom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.bold,
    marginBottom: 2,
  },
  pitch: {
    fontSize: typographie.tailles.xs,
    lineHeight: typographie.tailles.xs * typographie.hauteurLigne.normal,
    marginBottom: espacements.sm,
  },
  trendBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: espacements.sm,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rayons.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: typographie.poids.medium,
  },
  btnSuivre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.xs,
    paddingVertical: 6,
    borderRadius: rayons.sm,
    borderWidth: 1,
  },
  btnSuivreText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
  },
});

export default React.memo(CarteProjetTendance);
