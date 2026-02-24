/**
 * LiveTab - Contenu de l'onglet Live extrait de accueil.tsx
 * Gere l'affichage des lives en cours, recherche, tri, et navigation vers un live
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LiveCard } from '../../composants';
import { SkeletonList } from '../../composants/SkeletonLoader';
import {
  Live as LiveAPI,
  getActiveLives,
  getAgoraToken,
  formatLiveDuration,
  formatViewerCount,
} from '../../services/live';

// ============ PROPS ============

interface LiveTabProps {
  couleurs: any;
  styles: any;
  isActive: boolean; // declenche le chargement quand l'onglet devient actif
}

// ============ COMPOSANT ============

const LiveTab: React.FC<LiveTabProps> = ({ couleurs, styles, isActive }) => {
  // --- State ---
  const [lives, setLives] = useState<LiveAPI[]>([]);
  const [chargementLives, setChargementLives] = useState(false);
  const [rechercheLive, setRechercheLive] = useState('');
  const [triLive, setTriLive] = useState<'populaire' | 'recent'>('populaire');

  // TODO: Passer a false pour retirer le mock et utiliser les vrais lives
  const MOCK_LIVES_ENABLED = true;

  // --- Chargement des lives ---
  const chargerLives = useCallback(async () => {
    try {
      setChargementLives(true);

      if (MOCK_LIVES_ENABLED) {
        // Mock data pour preview UI
        const now = new Date();
        const mockLives: LiveAPI[] = [
          {
            _id: 'mock-1',
            channelName: 'ch-mock-1',
            title: 'Pitch NovaPay — le paiement mobile en Afrique',
            thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop&q=80',
            startedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
            viewerCount: 142,
            host: { _id: 'u1', prenom: 'Yasmine', nom: 'Belkacem', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&q=80' },
          },
          {
            _id: 'mock-2',
            channelName: 'ch-mock-2',
            title: 'Live coding React Native — tips performance',
            thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop&q=80',
            startedAt: new Date(now.getTime() - 22 * 60000).toISOString(),
            viewerCount: 89,
            host: { _id: 'u2', prenom: 'Hugo', nom: 'Carpentier', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&q=80' },
          },
          {
            _id: 'mock-3',
            channelName: 'ch-mock-3',
            title: 'Q&A Business Angel — vos questions levee de fonds',
            thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&q=80',
            startedAt: new Date(now.getTime() - 8 * 60000).toISOString(),
            viewerCount: 67,
            host: { _id: 'u5', prenom: 'Maxime', nom: 'Leroy', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face&q=80' },
          },
          {
            _id: 'mock-4',
            channelName: 'ch-mock-4',
            title: 'Design review — refonte UX d\'une app sante',
            thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop&q=80',
            startedAt: new Date(now.getTime() - 3 * 60000).toISOString(),
            viewerCount: 34,
            host: { _id: 'u3', prenom: 'Clara', nom: 'Fontaine', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80' },
          },
          {
            _id: 'mock-5',
            channelName: 'ch-mock-5',
            title: 'AMA — De Amazon a ma startup velo cargo',
            thumbnail: 'https://images.unsplash.com/photo-1616432043562-3671ea2e5242?w=600&h=400&fit=crop&q=80',
            startedAt: new Date(now.getTime() - 95 * 60000).toISOString(),
            viewerCount: 213,
            host: { _id: 'u4', prenom: 'Antoine', nom: 'Roche', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80' },
          },
        ];
        setLives(mockLives);
        setChargementLives(false);
        return;
      }

      const reponse = await getActiveLives();
      if (reponse.succes && reponse.data) {
        // Filtrer les lives fantomes (> 12h = clairement perime/jamais termine)
        const MAX_LIVE_DURATION = 12 * 60 * 60 * 1000;
        const now = Date.now();
        const livesActifs = reponse.data.lives.filter(l => {
          const duree = now - new Date(l.startedAt).getTime();
          return duree < MAX_LIVE_DURATION;
        });
        setLives(livesActifs);
      }
    } catch (error) {
      console.error('Erreur chargement lives:', error);
    } finally {
      setChargementLives(false);
    }
  }, []);

  // --- Rejoindre un live ---
  const rejoindreUnLive = useCallback(async (live: LiveAPI) => {
    try {
      // Obtenir un token Agora pour le viewer
      const tokenRes = await getAgoraToken(live.channelName, 'subscriber');
      if (!tokenRes.succes || !tokenRes.data) {
        Alert.alert('Erreur', 'Impossible de rejoindre le live');
        return;
      }
      const creds = tokenRes.data;
      router.push({
        pathname: '/live/viewer',
        params: {
          liveId: live._id,
          channelName: creds.channelName,
          appId: creds.appId,
          token: creds.token,
          uid: creds.uid.toString(),
          hostPrenom: live.host.prenom,
          hostNom: live.host.nom,
          hostAvatar: live.host.avatar || '',
          title: live.title || '',
          viewerCount: live.viewerCount.toString(),
        },
      });
    } catch (error) {
      console.error('Erreur rejoindre live:', error);
      Alert.alert('Erreur', 'Impossible de rejoindre le live');
    }
  }, []);

  // --- Memoized computations ---
  const { livesFiltres, livesTries, totalViewers, featuredLive, autresLives } = useMemo(() => {
    const filtres = rechercheLive.length >= 2
      ? lives.filter(l =>
          `${l.host?.prenom} ${l.host?.nom}`.toLowerCase().includes(rechercheLive.toLowerCase()) ||
          (l.title || '').toLowerCase().includes(rechercheLive.toLowerCase())
        )
      : lives;
    const tries = [...filtres].sort((a, b) =>
      triLive === 'populaire'
        ? b.viewerCount - a.viewerCount
        : new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    return {
      livesFiltres: filtres,
      livesTries: tries,
      totalViewers: lives.reduce((sum, l) => sum + l.viewerCount, 0),
      featuredLive: tries[0],
      autresLives: tries.slice(1),
    };
  }, [lives, rechercheLive, triLive]);

  // --- Charger les lives quand l'onglet devient actif ---
  useEffect(() => {
    if (isActive) {
      chargerLives();
    }
  }, [isActive, chargerLives]);

  // --- Rendu ---
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={chargementLives}
          onRefresh={chargerLives}
          tintColor={couleurs.primaire}
          colors={[couleurs.primaire]}
        />
      }
    >
      <View style={styles.liveContainer}>
        {/* ====== HEADER ====== */}
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            <Text style={styles.sectionTitle}>Live</Text>
            {lives.length > 0 && (
              <View style={styles.liveCountBadge}>
                <View style={styles.liveCountDot} />
                <Text style={styles.liveCountText}>{lives.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/live/start')}
            style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <View style={styles.goLiveBtn}>
              <Ionicons name="radio" size={15} color={couleurs.blanc} />
              <Text style={styles.goLiveBtnText}>Go Live</Text>
            </View>
          </Pressable>
        </View>

        {chargementLives ? (
          <SkeletonList type="post" count={3} />
        ) : lives.length === 0 ? (
          /* ====== EMPTY STATE ====== */
          <View style={styles.liveEmptyState}>
            <LinearGradient
              colors={[couleurs.primaireDark, couleurs.primaire, `${couleurs.primaireLight}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveEmptyHero}
            >
              <View style={styles.liveEmptyIconRing}>
                <Ionicons name="videocam" size={32} color={couleurs.primaireLight} />
              </View>
              <Text style={styles.liveEmptyTitle}>Personne n'est en direct</Text>
              <Text style={styles.liveEmptySubtitle}>
                Soyez le premier a diffuser en direct{'\n'}et partagez un moment avec la communaute
              </Text>
              <Pressable
                onPress={() => router.push('/live/start')}
                style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              >
                <View style={styles.liveEmptyCTABtn}>
                  <Ionicons name="radio" size={18} color={couleurs.blanc} />
                  <Text style={styles.liveEmptyCTAText}>Lancer mon live</Text>
                </View>
              </Pressable>
            </LinearGradient>

            {/* Divider */}
            <View style={styles.liveDivider} />

            {/* Comment ca marche */}
            <View style={styles.liveHowToSection}>
              <View style={styles.liveSectionHeader}>
                <Ionicons name="help-circle" size={18} color={couleurs.primaire} />
                <Text style={styles.liveSectionTitle}>Comment ca marche</Text>
              </View>
              <View style={styles.liveHowToSteps}>
                {[
                  { num: '1', title: 'Lancez', desc: 'Appuyez sur Go Live', color: couleurs.erreur },
                  { num: '2', title: 'Diffusez', desc: 'En video ou audio', color: couleurs.primaire },
                  { num: '3', title: 'Interagissez', desc: 'Avec votre audience', color: couleurs.secondaire },
                ].map((step) => (
                  <View key={step.num} style={styles.liveHowToStep}>
                    <View style={[styles.liveHowToStepNum, { backgroundColor: `${step.color}20` }]}>
                      <Text style={[styles.liveHowToStepNumText, { color: step.color }]}>{step.num}</Text>
                    </View>
                    <Text style={styles.liveHowToStepTitle}>{step.title}</Text>
                    <Text style={styles.liveHowToStepDesc}>{step.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* ====== LIVES ACTIFS ====== */
          <View style={styles.livesActiveContainer}>
            {/* Barre de recherche */}
            <View style={styles.liveSearchBar}>
              <Ionicons name="search" size={16} color={couleurs.texteSecondaire} />
              <TextInput
                style={styles.liveSearchInput}
                placeholder="Rechercher un live..."
                placeholderTextColor={couleurs.texteMuted}
                value={rechercheLive}
                onChangeText={setRechercheLive}
                returnKeyType="search"
              />
              {rechercheLive.length > 0 && (
                <Pressable onPress={() => setRechercheLive('')}>
                  <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
                </Pressable>
              )}
            </View>

            {/* Tri + stats */}
            <View style={styles.liveSortRow}>
              <Pressable
                style={[styles.liveSortChip, triLive === 'populaire' && styles.liveSortChipActive]}
                onPress={() => setTriLive('populaire')}
              >
                <Ionicons name="flame" size={13} color={triLive === 'populaire' ? couleurs.blanc : couleurs.texteSecondaire} />
                <Text style={[styles.liveSortChipText, triLive === 'populaire' && styles.liveSortChipTextActive]}>Tendances</Text>
              </Pressable>
              <Pressable
                style={[styles.liveSortChip, triLive === 'recent' && styles.liveSortChipActive]}
                onPress={() => setTriLive('recent')}
              >
                <Ionicons name="time" size={13} color={triLive === 'recent' ? couleurs.blanc : couleurs.texteSecondaire} />
                <Text style={[styles.liveSortChipText, triLive === 'recent' && styles.liveSortChipTextActive]}>Recents</Text>
              </Pressable>
              <View style={styles.liveStatsCompact}>
                <Ionicons name="eye" size={12} color={couleurs.texteSecondaire} />
                <Text style={styles.liveStatsCompactText}>{formatViewerCount(totalViewers)}</Text>
              </View>
            </View>

            {/* Resultats */}
            {livesFiltres.length === 0 && rechercheLive.length >= 2 ? (
              <View style={styles.liveNoResults}>
                <Ionicons name="search-outline" size={36} color={couleurs.texteMuted} />
                <Text style={styles.liveNoResultsText}>Aucun live pour "{rechercheLive}"</Text>
              </View>
            ) : (
              <>
                {/* Section A la une */}
                {featuredLive && (
                  <View style={styles.liveSection}>
                    <View style={styles.liveSectionHeader}>
                      <Ionicons name="flame" size={18} color={couleurs.accent} />
                      <Text style={styles.liveSectionTitle}>A la une</Text>
                    </View>
                    <LiveCard
                      live={featuredLive}
                      onPress={() => rejoindreUnLive(featuredLive)}
                      variant="featured"
                      index={0}
                    />
                  </View>
                )}

                {/* Divider */}
                {autresLives.length > 0 && <View style={styles.liveDivider} />}

                {/* Section En direct - scroll horizontal */}
                {autresLives.length > 0 && (
                  <View style={styles.liveSection}>
                    <View style={styles.liveSectionHeader}>
                      <Ionicons name="radio" size={18} color={couleurs.erreur} />
                      <Text style={styles.liveSectionTitle}>En direct</Text>
                      <Text style={styles.liveSectionCount}>{autresLives.length}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.liveTrendingScroll}
                    >
                      {autresLives.map((live, i) => (
                        <LiveCard
                          key={live._id}
                          live={live}
                          onPress={() => rejoindreUnLive(live)}
                          variant="card"
                          index={i + 1}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default LiveTab;
