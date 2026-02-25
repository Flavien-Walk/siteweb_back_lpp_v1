/**
 * CarteProjetPourToi — Carte recommandation personnalisee "Pour Toi"
 * Affiche un projet recommande avec label source et bouton suivre
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../constantes/theme';
import { ProjetRecommande, toggleSuivreProjet } from '../services/projets';
import { trackClick, trackImpression } from '../services/engagement';
import { useGamification } from '../contexts/GamificationContext';

interface Props {
  projet: ProjetRecommande;
  onFollowChange?: (projetId: string, estSuivi: boolean, nbFollowers: number) => void;
}

const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idee', color: '#3B82F6' },
  prototype: { label: 'Prototype', color: '#8B5CF6' },
  lancement: { label: 'Lancement', color: '#F59E0B' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

const CarteProjetPourToi: React.FC<Props> = ({ projet, onFollowChange }) => {
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

  const mat = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;

  return (
    <View
      style={[styles.container, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}
      onLayout={handleLayout}
    >
      {/* Label source */}
      {projet.recommendationLabel && (
        <View style={[styles.sourceLabel, { backgroundColor: couleurs.primaire + '12' }]}>
          <Ionicons
            name={projet.recommendationSource === 'exploration' ? 'compass' : 'sparkles'}
            size={12}
            color={couleurs.primaire}
          />
          <Text style={[styles.sourceLabelText, { color: couleurs.primaire }]} numberOfLines={1}>
            {projet.recommendationLabel}
          </Text>
        </View>
      )}

      {/* Image */}
      <Pressable onPress={handlePress}>
        <Image
          source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' }}
          style={styles.image}
        />
      </Pressable>

      {/* Contenu */}
      <View style={styles.content}>
        <Pressable onPress={handlePress}>
          <Text style={[styles.nom, { color: couleurs.texte }]} numberOfLines={1}>{projet.nom}</Text>
          <Text style={[styles.pitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
            {projet.pitch || projet.description}
          </Text>

          {/* Tags */}
          <View style={styles.tags}>
            {projet.tags?.slice(0, 3).map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: couleurs.fondSecondaire }]}>
                <Text style={[styles.tagText, { color: couleurs.texteSecondaire }]}>{tag}</Text>
              </View>
            ))}
            {projet.categorie && (
              <View style={[styles.tag, { backgroundColor: couleurs.primaire + '18' }]}>
                <Text style={[styles.tagText, { color: couleurs.primaire }]}>{projet.categorie}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={13} color={couleurs.texteSecondaire} />
              <Text style={[styles.statText, { color: couleurs.texteSecondaire }]}>{nbFollowers}</Text>
            </View>
            <View style={[styles.maturiteBadge, { backgroundColor: mat.color + '20' }]}>
              <Text style={[styles.maturiteText, { color: mat.color }]}>{mat.label}</Text>
            </View>
          </View>
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.btnSuivre,
              suivi
                ? { backgroundColor: couleurs.primaire + '15', borderColor: couleurs.primaire }
                : { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
              enCours && { opacity: 0.6 },
            ]}
            onPress={handleToggleSuivre}
            disabled={enCours}
          >
            <Ionicons
              name={suivi ? 'checkmark' : 'add'}
              size={16}
              color={suivi ? couleurs.primaire : '#FFFFFF'}
            />
            <Text style={[styles.btnSuivreText, { color: suivi ? couleurs.primaire : '#FFFFFF' }]}>
              {suivi ? 'Suivi' : 'Suivre'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.btnSecondary, { borderColor: couleurs.bordure }]}
            onPress={handlePress}
          >
            <Ionicons name="eye-outline" size={16} color={couleurs.texteSecondaire} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: rayons.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: espacements.md,
  },
  sourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  sourceLabelText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: espacements.md,
  },
  nom: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
    marginBottom: espacements.xs,
  },
  pitch: {
    fontSize: typographie.tailles.sm,
    lineHeight: typographie.tailles.sm * typographie.hauteurLigne.normal,
    marginBottom: espacements.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.xs,
    marginBottom: espacements.sm,
  },
  tag: {
    paddingHorizontal: espacements.sm,
    paddingVertical: 3,
    borderRadius: rayons.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: typographie.poids.medium,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
    marginBottom: espacements.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: typographie.tailles.xs,
  },
  maturiteBadge: {
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.full,
  },
  maturiteText: {
    fontSize: 11,
    fontWeight: typographie.poids.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  btnSuivre: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.xs,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
  },
  btnSuivreText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
  btnSecondary: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.md,
    borderWidth: 1,
  },
});

export default React.memo(CarteProjetPourToi);
