/**
 * CarteProjetPourToi — Carte recommandation personnalisee "Pour Toi"
 * Layout identique a Explorer (image + contenu vertical) avec label source
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
import { useUser } from '../contexts/UserContext';
import { CATEGORIE_COLORS, MATURITE_COLORS, MATURITES } from '../constantes/projets';

interface Props {
  projet: ProjetRecommande;
  onFollowChange?: (projetId: string, estSuivi: boolean, nbFollowers: number) => void;
}

const CarteProjetPourToi: React.FC<Props> = ({ projet, onFollowChange }) => {
  const { couleurs } = useTheme();
  const { applyDelta } = useGamification();
  const { utilisateur } = useUser();
  const [suivi, setSuivi] = useState(projet.estSuivi);
  const [nbFollowers, setNbFollowers] = useState(projet.nbFollowers ?? projet.followersCount ?? 0);
  const [enCours, setEnCours] = useState(false);
  const [impressionTracked, setImpressionTracked] = useState(false);

  const isOwnProject = utilisateur?.id === (projet as any).porteur?._id;

  useEffect(() => {
    if (!enCours) {
      setSuivi(projet.estSuivi);
      setNbFollowers(projet.nbFollowers ?? projet.followersCount ?? 0);
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

  const handleContacter = () => {
    router.push({ pathname: '/(app)/projet/[id]', params: { id: projet._id, action: 'contact' } });
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

  const matLabel = MATURITES.find(m => m.value === projet.maturite)?.label || projet.maturite;

  return (
    <View
      style={[styles.card, { backgroundColor: couleurs.fondSecondaire, borderColor: couleurs.bordure }]}
      onLayout={handleLayout}
    >
      {/* Image + badges */}
      <Pressable onPress={handlePress} style={{ position: 'relative' }}>
        <Image
          source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' }}
          style={styles.image}
        />
        {projet.categorie && (
          <View style={[styles.badgeImage, styles.badgeTopRight, { backgroundColor: CATEGORIE_COLORS[projet.categorie] || '#6B7280' }]}>
            <Text style={styles.badgeText}>{projet.categorie}</Text>
          </View>
        )}
        {projet.maturite && (
          <View style={[styles.badgeImage, styles.badgeBottomLeft, { backgroundColor: (MATURITE_COLORS[projet.maturite] || '#9CA3AF') + 'DD' }]}>
            <Text style={styles.badgeText}>{matLabel}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.content}>
        {/* Label source recommandation */}
        {projet.recommendationLabel && (
          <View style={[styles.sourceLabel, { backgroundColor: couleurs.primaire + '12' }]}>
            <Ionicons
              name={projet.recommendationSource === 'exploration' ? 'compass' : 'sparkles'}
              size={11}
              color={couleurs.primaire}
            />
            <Text style={[styles.sourceLabelText, { color: couleurs.primaire }]} numberOfLines={1}>
              {projet.recommendationLabel}
            </Text>
          </View>
        )}

        <Pressable onPress={handlePress}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nom, { color: couleurs.texte }]} numberOfLines={1}>{projet.nom}</Text>
              <View style={styles.location}>
                <Ionicons name="location-outline" size={12} color={couleurs.texteSecondaire} />
                <Text style={[styles.ville, { color: couleurs.texteSecondaire }]}>
                  {(projet as any).localisation?.ville || 'France'}
                </Text>
              </View>
            </View>
            {(projet as any).logo && (
              <Image source={{ uri: (projet as any).logo }} style={styles.logo} />
            )}
          </View>

          <Text style={[styles.description, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
            {projet.pitch || projet.description}
          </Text>

          <View style={styles.tags}>
            {projet.tags?.slice(0, 3).map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: couleurs.fondTertiaire || couleurs.fondSecondaire }]}>
                <Text style={[styles.tagText, { color: couleurs.texteSecondaire }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
              <Text style={[styles.statText, { color: couleurs.texteSecondaire }]}>{nbFollowers} abonnes</Text>
            </View>
          </View>
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          {isOwnProject ? (
            <Pressable
              style={[styles.btnPrimary, { backgroundColor: 'transparent', borderWidth: 1, borderColor: couleurs.primaire }]}
              onPress={handlePress}
            >
              <Ionicons name="briefcase" size={18} color={couleurs.primaire} />
              <Text style={[styles.btnPrimaryText, { color: couleurs.primaire }]}>Mon projet</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={[
                  styles.btnPrimary,
                  { backgroundColor: couleurs.primaire },
                  suivi && { backgroundColor: 'transparent', borderWidth: 1, borderColor: couleurs.primaire },
                  enCours && { opacity: 0.6 },
                ]}
                onPress={handleToggleSuivre}
                disabled={enCours}
              >
                <Ionicons
                  name={suivi ? 'checkmark' : 'add'}
                  size={18}
                  color={suivi ? couleurs.primaire : couleurs.blanc || '#FFFFFF'}
                />
                <Text style={[styles.btnPrimaryText, { color: suivi ? couleurs.primaire : couleurs.blanc || '#FFFFFF' }]}>
                  {suivi ? 'Suivi' : 'Suivre'}
                </Text>
              </Pressable>
              <Pressable style={[styles.btnSecondary, { borderColor: couleurs.bordure }]} onPress={handleContacter}>
                <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
              </Pressable>
              <Pressable style={[styles.btnSecondary, { borderColor: couleurs.bordure }]} onPress={handlePress}>
                <Ionicons name="eye-outline" size={18} color={couleurs.texte} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rayons.lg,
    marginBottom: espacements.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 140,
  },
  badgeImage: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTopRight: {
    top: 8,
    right: 8,
  },
  badgeBottomLeft: {
    bottom: 8,
    left: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: espacements.md,
  },
  sourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espacements.xs,
    paddingHorizontal: espacements.sm,
    paddingVertical: 3,
    borderRadius: rayons.full,
    marginBottom: espacements.xs,
  },
  sourceLabelText: {
    fontSize: 11,
    fontWeight: typographie.poids.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: espacements.xs,
  },
  nom: {
    fontSize: 15,
    fontWeight: '700',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginTop: 2,
  },
  ville: {
    fontSize: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: rayons.sm,
    marginLeft: espacements.sm,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: espacements.sm,
  },
  tags: {
    flexDirection: 'row',
    gap: espacements.xs,
    marginBottom: espacements.sm,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: espacements.sm,
    paddingVertical: 3,
    borderRadius: 50,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    gap: espacements.md,
    marginBottom: espacements.sm,
    paddingBottom: espacements.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  statText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: rayons.md,
    gap: espacements.xs,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnSecondary: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: rayons.md,
  },
});

export default React.memo(CarteProjetPourToi);
