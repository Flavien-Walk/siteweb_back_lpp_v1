/**
 * DecouvrirTab - Onglet Decouvrir de l'ecran d'accueil
 * Sous-onglets: Pour Toi | Tendances | Explorer
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { espacements, rayons, typographie } from '../../constantes/theme';
import {
  Projet,
  CategorieProjet,
  getProjets,
  getProjetsTendance,
  toggleSuivreProjet,
  getIncubateursActifs,
  IncubateurActif,
} from '../../services/projets';
import { INCUBATEURS_FR } from '../../constantes/incubateurs';
import { SkeletonList } from '../../composants/SkeletonLoader';
import { PourToiSection, TendancesSection } from '../../composants';

// ============ PROPS ============

interface DecouvrirTabProps {
  couleurs: any;
  styles: any;
  utilisateur: any;
  applyDelta: (delta: any) => void;
  rafraichissement: boolean;
  onRefresh: () => void;
}

// ============ CONSTANTES ============

const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idee', color: '#9CA3AF' },
  prototype: { label: 'Prototype', color: '#F59E0B' },
  lancement: { label: 'Lancement', color: '#3B82F6' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

// ============ COMPOSANT PRINCIPAL ============

type DecouvrirSubTab = 'pourtoi' | 'tendances' | 'explorer';

const SUB_TABS: { key: DecouvrirSubTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'pourtoi', label: 'Pour toi', icon: 'sparkles' },
  { key: 'tendances', label: 'Tendances', icon: 'flame' },
  { key: 'explorer', label: 'Explorer', icon: 'compass' },
];

function DecouvrirTab({ couleurs, styles, utilisateur, applyDelta, rafraichissement, onRefresh }: DecouvrirTabProps) {
  // Sub-tab state
  const [decouvrirSubTab, setDecouvrirSubTab] = useState<DecouvrirSubTab>('pourtoi');

  // DECOUVRIR_CATEGORIES utilise couleurs.primaire (dynamique selon le theme)
  const DECOUVRIR_CATEGORIES: { value: CategorieProjet | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { value: 'all', label: 'Tout', icon: 'apps', color: couleurs.primaire },
    { value: 'tech', label: 'Tech', icon: 'hardware-chip', color: '#3B82F6' },
    { value: 'food', label: 'Food', icon: 'restaurant', color: '#F97316' },
    { value: 'sante', label: 'Sante', icon: 'medkit', color: '#EF4444' },
    { value: 'education', label: 'Education', icon: 'school', color: '#8B5CF6' },
    { value: 'energie', label: 'Energie', icon: 'flash', color: '#F59E0B' },
    { value: 'culture', label: 'Culture', icon: 'color-palette', color: '#EC4899' },
    { value: 'environnement', label: 'Eco', icon: 'leaf', color: '#10B981' },
  ];

  // ---- State ----
  const [projets, setProjets] = useState<Projet[]>([]);
  const [projetsTendance, setProjetsTendance] = useState<Projet[]>([]);
  const [chargementProjets, setChargementProjets] = useState(false);

  const [categorieFiltre, setCategorieFiltre] = useState<CategorieProjet | 'all'>('all');
  const [rechercheProjet, setRechercheProjet] = useState('');
  const [rechercheProjetDebounced, setRechercheProjetDebounced] = useState('');
  const [incubateursActifs, setIncubateursActifs] = useState<IncubateurActif[]>([]);
  const [incubateurFiltre, setIncubateurFiltre] = useState<string | null>(null);

  // ---- Debounce recherche projet (400ms) ----
  useEffect(() => {
    const timer = setTimeout(() => {
      setRechercheProjetDebounced(rechercheProjet);
    }, 400);
    return () => clearTimeout(timer);
  }, [rechercheProjet]);

  // Lancer la recherche quand le texte debounced change
  useEffect(() => {
    chargerProjets(categorieFiltre, rechercheProjetDebounced);
  }, [rechercheProjetDebounced]);

  // Charger les donnees au montage
  useEffect(() => {
    chargerProjets();
  }, []);

  // ---- Fonctions de chargement ----
  const chargerProjets = async (filtreCategorie?: CategorieProjet | 'all', filtreRecherche?: string, filtreIncubateur?: string | null) => {
    try {
      setChargementProjets(true);
      const cat = filtreCategorie ?? categorieFiltre;
      const q = filtreRecherche ?? rechercheProjet;
      const inc = filtreIncubateur !== undefined ? filtreIncubateur : incubateurFiltre;
      const filtres: Record<string, any> = { limit: 20 };
      if (cat !== 'all') filtres.categorie = cat;
      if (q.trim()) filtres.q = q.trim();
      if (inc) filtres.incubateur = inc;

      const [projetsRes, tendanceRes, incubateursRes] = await Promise.all([
        getProjets(filtres),
        getProjetsTendance(5),
        getIncubateursActifs(),
      ]);
      if (projetsRes.succes && projetsRes.data) {
        setProjets(projetsRes.data.projets);
      }
      if (tendanceRes.succes && tendanceRes.data) {
        setProjetsTendance(tendanceRes.data.projets);
      }
      if (incubateursRes.succes && incubateursRes.data) {
        setIncubateursActifs(incubateursRes.data.incubateurs);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement projets:', error);
    } finally {
      setChargementProjets(false);
    }
  };

  const handleCategorieChange = (cat: CategorieProjet | 'all') => {
    setCategorieFiltre(cat);
    setIncubateurFiltre(null);
    chargerProjets(cat, rechercheProjetDebounced, null);
  };

  const handleRechercheProjetSubmit = useCallback(() => {
    // Bypass debounce — recherche immediate sur submit clavier
    setRechercheProjetDebounced(rechercheProjet);
    chargerProjets(categorieFiltre, rechercheProjet);
  }, [rechercheProjet, categorieFiltre]);

  // ---- Composant ProjetCard inline (utilise setProjets) ----
  const ProjetCard = ({ projet }: { projet: Projet }) => {
    // Verifier si c'est le propre projet de l'utilisateur
    const isOwnProject = utilisateur?.id === projet.porteur?._id;

    // State local pour optimistic update + sync avec props
    const [suivi, setSuivi] = useState(projet.estSuivi);
    const [nbFollowers, setNbFollowers] = useState(projet.nbFollowers);
    const [enCours, setEnCours] = useState(false);

    // Sync state local avec props quand le projet change (navigation, refetch)
    // Mais SEULEMENT si on n'est pas en train de faire une action
    useEffect(() => {
      if (!enCours) {
        setSuivi(projet.estSuivi);
        setNbFollowers(projet.nbFollowers);
      }
    }, [projet._id, projet.estSuivi, projet.nbFollowers, enCours]);

    const handleToggleSuivre = async () => {
      if (enCours) return;

      // IMPORTANT: Marquer enCours AVANT tout pour bloquer le useEffect sync
      setEnCours(true);

      // Sauvegarder l'etat precedent pour rollback
      const previousSuivi = suivi;
      const previousNbFollowers = nbFollowers;

      // Optimistic update local
      const newSuivi = !suivi;
      const newNbFollowers = suivi ? nbFollowers - 1 : nbFollowers + 1;
      setSuivi(newSuivi);
      setNbFollowers(newNbFollowers);

      // Optimistic update sur le state parent (source de verite)
      setProjets(prev => prev.map(p =>
        p._id === projet._id
          ? { ...p, estSuivi: newSuivi, nbFollowers: newNbFollowers }
          : p
      ));

      try {
        const reponse = await toggleSuivreProjet(projet._id);

        // Debug: voir ce que l'API renvoie
        if (__DEV__) {
          console.log('toggleSuivreProjet response:', JSON.stringify(reponse, null, 2));
        }

        if (reponse.succes && reponse.data) {
          // Backend renvoie maintenant estSuivi et nbFollowers
          const apiData = reponse.data as { estSuivi?: boolean; suivi?: boolean; nbFollowers?: number; totalFollowers?: number };
          const apiEstSuivi = apiData.estSuivi ?? apiData.suivi;
          const apiNbFollowers = apiData.nbFollowers ?? apiData.totalFollowers;

          if (__DEV__) {
            console.log('Follow reussi - API:', { apiEstSuivi, apiNbFollowers });
          }

          // Utiliser les valeurs de l'API si disponibles
          if (typeof apiEstSuivi === 'boolean') {
            setSuivi(apiEstSuivi);
            setProjets(prev => prev.map(p =>
              p._id === projet._id ? { ...p, estSuivi: apiEstSuivi } : p
            ));
          }
          if (typeof apiNbFollowers === 'number') {
            setNbFollowers(apiNbFollowers);
            setProjets(prev => prev.map(p =>
              p._id === projet._id ? { ...p, nbFollowers: apiNbFollowers } : p
            ));
          }
          // Gamification: le backend gere automatiquement via applyGamificationEvent
          if (reponse.gamification) {
            applyDelta(reponse.gamification);
          }
        } else if (!reponse.succes) {
          // Rollback si echec explicite
          console.warn('toggleSuivreProjet: succes=false ou pas de data');
          setSuivi(previousSuivi);
          setNbFollowers(previousNbFollowers);
          setProjets(prev => prev.map(p =>
            p._id === projet._id
              ? { ...p, estSuivi: previousSuivi, nbFollowers: previousNbFollowers }
              : p
          ));
        }
      } catch (error) {
        console.error('Erreur toggle suivre projet:', error);
        // Rollback en cas d'exception reseau
        setSuivi(previousSuivi);
        setNbFollowers(previousNbFollowers);
        setProjets(prev => prev.map(p =>
          p._id === projet._id
            ? { ...p, estSuivi: previousSuivi, nbFollowers: previousNbFollowers }
            : p
        ));
      } finally {
        setEnCours(false);
      }
    };

    const handleVoirFiche = () => {
      router.push({
        pathname: '/(app)/projet/[id]',
        params: { id: projet._id },
      });
    };

    const handleContacter = () => {
      router.push({
        pathname: '/(app)/projet/[id]',
        params: { id: projet._id, action: 'contact' },
      });
    };

    // La card n'est PAS un Pressable pour eviter la propagation
    // Seuls les zones cliquables specifiques ont un onPress
    return (
      <View style={styles.startupCard}>
        {/* Zone image cliquable vers fiche */}
        <Pressable onPress={handleVoirFiche}>
          <Image
            source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' }}
            style={styles.startupImage}
          />
        </Pressable>
        <View style={styles.startupContent}>
          {/* Zone header cliquable vers fiche */}
          <Pressable onPress={handleVoirFiche}>
            <View style={styles.startupHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.startupNom}>{projet.nom}</Text>
                <View style={styles.startupLocation}>
                  <Ionicons name="location-outline" size={12} color={couleurs.texteSecondaire} />
                  <Text style={styles.startupVille}>{projet.localisation?.ville || 'France'}</Text>
                </View>
              </View>
              {projet.logo && (
                <Image source={{ uri: projet.logo }} style={styles.startupLogo} />
              )}
            </View>
            <Text style={styles.startupDescription} numberOfLines={2}>{projet.pitch || projet.description}</Text>
            <View style={styles.startupTags}>
              {projet.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.startupTag}>
                  <Text style={styles.startupTagText}>{tag}</Text>
                </View>
              ))}
              {projet.categorie && (
                <View style={[styles.startupTag, { backgroundColor: couleurs.primaire + '20' }]}>
                  <Text style={[styles.startupTagText, { color: couleurs.primaire }]}>{projet.categorie}</Text>
                </View>
              )}
            </View>
            <View style={styles.startupStats}>
              <View style={styles.startupStat}>
                <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={styles.startupStatText}>{nbFollowers} abonnes</Text>
              </View>
              <View style={styles.startupStat}>
                <Ionicons name="trending-up-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={styles.startupStatText}>{projet.maturite}</Text>
              </View>
            </View>
          </Pressable>
          {/* Zone boutons - chacun est independant */}
          <View style={styles.startupActions}>
            {isOwnProject ? (
              <Pressable
                style={[styles.startupBtnPrimary, styles.startupBtnSuivi]}
                onPress={handleVoirFiche}
              >
                <Ionicons name="briefcase" size={18} color={couleurs.primaire} />
                <Text style={[styles.startupBtnPrimaryText, styles.startupBtnSuiviText]}>
                  Mon projet
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.startupBtnPrimary, suivi && styles.startupBtnSuivi, enCours && { opacity: 0.6 }]}
                  onPress={handleToggleSuivre}
                  disabled={enCours}
                >
                  <Ionicons
                    name={suivi ? 'checkmark' : 'add'}
                    size={18}
                    color={suivi ? couleurs.primaire : couleurs.blanc}
                  />
                  <Text style={[styles.startupBtnPrimaryText, suivi && styles.startupBtnSuiviText]}>
                    {suivi ? 'Suivi' : 'Suivre'}
                  </Text>
                </Pressable>
                <Pressable style={styles.startupBtnSecondary} onPress={handleContacter}>
                  <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
                </Pressable>
                <Pressable style={styles.startupBtnSecondary} onPress={handleVoirFiche}>
                  <Ionicons name="eye-outline" size={18} color={couleurs.texte} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ---- Rendu ----
  return (
    <View style={{ flex: 1 }}>
      {/* Sub-tabs: Pour toi | Tendances | Explorer */}
      <View style={[styles.decouvrirSubTabs || localStyles.decouvrirSubTabs, { borderBottomColor: couleurs.bordure }]}>
        {SUB_TABS.map(tab => {
          const isActiveTab = decouvrirSubTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.decouvrirSubTab || localStyles.decouvrirSubTab,
                isActiveTab && { borderBottomColor: couleurs.primaire, borderBottomWidth: 2 },
              ]}
              onPress={() => setDecouvrirSubTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActiveTab ? couleurs.primaire : couleurs.texteMuted}
              />
              <Text style={[
                styles.decouvrirSubTabText || localStyles.decouvrirSubTabText,
                { color: isActiveTab ? couleurs.primaire : couleurs.texteMuted },
                isActiveTab && { fontWeight: '700' as any },
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sub-tab content */}
      {decouvrirSubTab === 'pourtoi' && (
        <PourToiSection isActive={decouvrirSubTab === 'pourtoi'} />
      )}
      {decouvrirSubTab === 'tendances' && (
        <TendancesSection isActive={decouvrirSubTab === 'tendances'} />
      )}
      {decouvrirSubTab === 'explorer' && (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={onRefresh}
          tintColor={couleurs.primaire}
        />
      }
    >
      {/* Barre de recherche projet */}
      <View style={styles.decouvrirSearchSection}>
        <View style={styles.decouvrirSearchBar}>
          <Ionicons name="search" size={16} color={couleurs.texteMuted} />
          <TextInput
            style={styles.decouvrirSearchInput}
            placeholder="Rechercher un projet..."
            placeholderTextColor={couleurs.texteMuted}
            value={rechercheProjet}
            onChangeText={setRechercheProjet}
            onSubmitEditing={handleRechercheProjetSubmit}
            returnKeyType="search"
          />
          {rechercheProjet.length > 0 && (
            <Pressable onPress={() => { setRechercheProjet(''); setRechercheProjetDebounced(''); chargerProjets(categorieFiltre, ''); }}>
              <Ionicons name="close-circle" size={18} color={couleurs.texteMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtres categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.decouvrirCategoriesContainer}
        style={styles.decouvrirCategoriesScroll}
      >
        {DECOUVRIR_CATEGORIES.map((cat) => {
          const isActive = categorieFiltre === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => handleCategorieChange(cat.value)}
              style={[
                styles.decouvrirCategorieChip,
                isActive
                  ? { backgroundColor: cat.color + '20', borderColor: cat.color }
                  : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
              ]}
            >
              <Ionicons name={cat.icon} size={14} color={isActive ? cat.color : couleurs.texteMuted} />
              <Text style={[
                styles.decouvrirCategorieText,
                { color: isActive ? cat.color : couleurs.texteSecondaire },
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Filtre incubateur actif */}
      {incubateurFiltre && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacements.md, paddingVertical: espacements.xs, backgroundColor: couleurs.primaire + '15', gap: espacements.sm }}>
          <Ionicons name="business" size={16} color={couleurs.primaire} />
          <Text style={{ flex: 1, color: couleurs.primaire, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{incubateurFiltre}</Text>
          <Pressable
            onPress={() => {
              setIncubateurFiltre(null);
              chargerProjets(categorieFiltre, rechercheProjetDebounced, null);
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={couleurs.primaire} />
          </Pressable>
        </View>
      )}

      {/* Section Trending */}
      {projetsTendance.length > 0 && categorieFiltre === 'all' && !rechercheProjet && (
        <View style={styles.decouvrirSection}>
          <View style={styles.decouvrirSectionHeader}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={styles.decouvrirSectionTitle}>Tendances</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.decouvrirTrendingScroll}>
            {projetsTendance.map((projet, index) => {
              const mat = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
              const catConf = DECOUVRIR_CATEGORIES.find(c => c.value === projet.categorie);
              return (
                <Pressable
                  key={projet._id}
                  style={styles.decouvrirTrendingCard}
                  onPress={() => router.push({ pathname: '/(app)/projet/[id]', params: { id: projet._id } })}
                >
                  {projet.image ? (
                    <Image source={{ uri: projet.image }} style={styles.decouvrirTrendingImage} />
                  ) : (
                    <LinearGradient
                      colors={[catConf?.color || couleurs.primaire, couleurs.fondSecondaire]}
                      style={styles.decouvrirTrendingImagePlaceholder}
                    >
                      <Ionicons name={catConf?.icon || 'rocket'} size={28} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.decouvrirTrendingOverlay}
                  >
                    <View style={styles.decouvrirTrendingRankBadge}>
                      <Text style={styles.decouvrirTrendingRankText}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.decouvrirTrendingNom} numberOfLines={1}>{projet.nom}</Text>
                    <Text style={styles.decouvrirTrendingPitch} numberOfLines={1}>{projet.pitch}</Text>
                    <View style={styles.decouvrirTrendingMeta}>
                      <View style={[styles.decouvrirMaturiteBadge, { backgroundColor: mat.color + '30' }]}>
                        <Text style={[styles.decouvrirMaturiteText, { color: mat.color }]}>{mat.label}</Text>
                      </View>
                      <View style={styles.decouvrirTrendingStat}>
                        <Ionicons name="people" size={11} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.decouvrirTrendingStatText}>{projet.nbFollowers}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Section Incubateurs */}
      {categorieFiltre === 'all' && !rechercheProjet && !incubateurFiltre && (
        <View style={styles.decouvrirSection}>
          <View style={styles.decouvrirSectionHeader}>
            <Ionicons name="business" size={18} color="#8B5CF6" />
            <Text style={styles.decouvrirSectionTitle}>Incubateurs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.decouvrirTrendingScroll}>
            {INCUBATEURS_FR.map((inc) => {
              const actif = incubateursActifs.find(a => a.nom === inc.nom);
              const count = actif?.count || 0;
              return (
                <Pressable
                  key={inc.nom}
                  style={styles.decouvrirTrendingCard}
                  onPress={() => {
                    setIncubateurFiltre(inc.nom);
                    chargerProjets(categorieFiltre, rechercheProjetDebounced, inc.nom);
                  }}
                >
                  <Image source={{ uri: inc.image }} style={styles.decouvrirTrendingImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.decouvrirTrendingOverlay}
                  >
                    <Text style={styles.decouvrirTrendingNom} numberOfLines={2}>{inc.nom}</Text>
                    <View style={styles.decouvrirTrendingStat}>
                      <Ionicons name="rocket" size={11} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.decouvrirTrendingStatText}>{count} projet{count > 1 ? 's' : ''}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Section liste des projets */}
      <View style={styles.decouvrirSection}>
        <View style={styles.decouvrirSectionHeader}>
          <Ionicons name="compass" size={18} color={couleurs.primaire} />
          <Text style={styles.decouvrirSectionTitle}>
            {categorieFiltre !== 'all'
              ? DECOUVRIR_CATEGORIES.find(c => c.value === categorieFiltre)?.label || 'Projets'
              : 'Tous les projets'}
          </Text>
          <Text style={styles.decouvrirSectionCount}>{projets.length}</Text>
        </View>

        {chargementProjets ? (
          <SkeletonList type="post" count={3} />
        ) : projets.length === 0 ? (
          <View style={styles.decouvrirEmptyState}>
            <View style={styles.decouvrirEmptyIcon}>
              <Ionicons name="rocket-outline" size={40} color={couleurs.primaire} />
            </View>
            <Text style={styles.decouvrirEmptyTitle}>
              {rechercheProjet ? `Aucun resultat pour "${rechercheProjet}"` : 'Aucun projet pour le moment'}
            </Text>
            <Text style={styles.decouvrirEmptySubtitle}>
              {rechercheProjet
                ? 'Essayez avec d\'autres mots-cles'
                : 'Les projets publies par les entrepreneurs apparaitront ici.'}
            </Text>
            {rechercheProjet ? (
              <Pressable
                style={styles.decouvrirEmptyBtn}
                onPress={() => { setRechercheProjet(''); setRechercheProjetDebounced(''); chargerProjets(categorieFiltre, ''); }}
              >
                <Text style={styles.decouvrirEmptyBtnText}>Effacer la recherche</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          projets.map((projet) => (
            <ProjetCard key={projet._id} projet={projet} />
          ))
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLogo}>LPP</Text>
        <Text style={styles.footerText}>La Premiere Pierre</Text>
        <Text style={styles.footerSubtext}>Reseau social des startups innovantes</Text>
      </View>
    </ScrollView>
      )}
    </View>
  );
}

// Styles locaux pour les sub-tabs (fallback si pas dans styles parent)
const localStyles = {
  decouvrirSubTabs: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    paddingHorizontal: espacements.sm,
  },
  decouvrirSubTab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: espacements.xs,
    paddingVertical: espacements.md,
  },
  decouvrirSubTabText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium as any,
  },
};

export default DecouvrirTab;
