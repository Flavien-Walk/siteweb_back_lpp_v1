/**
 * Page Fiche Projet Premium
 * Design style plateforme d'investissement
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 320;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

import { espacements, rayons, typographie, ombres } from '../../../src/constantes/theme';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { useUser } from '../../../src/contexts/UserContext';
import Avatar from '../../../src/composants/Avatar';
import {
  Projet,
  Porteur,
  DocumentProjet,
  getProjet,
  toggleSuivreProjet,
  getRepresentantsProjet,
} from '../../../src/services/projets';
import { getOuCreerConversationPrivee } from '../../../src/services/messagerie';

// Types pour les onglets
type TabKey = 'vision' | 'market' | 'docs';

interface TabItem {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { key: 'vision', label: 'Vision', icon: 'bulb-outline' },
  { key: 'market', label: 'Market', icon: 'trending-up-outline' },
  { key: 'docs', label: 'Documents', icon: 'folder-outline' },
];

// Labels pour les rôles
const ROLE_LABELS: Record<string, string> = {
  founder: 'Fondateur',
  cofounder: 'Co-fondateur',
  cto: 'CTO',
  cmo: 'CMO',
  cfo: 'CFO',
  developer: 'Développeur',
  designer: 'Designer',
  marketing: 'Marketing',
  sales: 'Commercial',
  other: 'Membre',
};

// Labels pour la maturité
const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idée', color: '#9CA3AF' },
  prototype: { label: 'Prototype', color: '#F59E0B' },
  lancement: { label: 'Lancement', color: '#3B82F6' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

// Labels pour les catégories
const CATEGORIE_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  tech: { label: 'Tech', icon: 'hardware-chip-outline' },
  food: { label: 'Food', icon: 'restaurant-outline' },
  sante: { label: 'Santé', icon: 'medical-outline' },
  education: { label: 'Education', icon: 'school-outline' },
  energie: { label: 'Energie', icon: 'flash-outline' },
  culture: { label: 'Culture', icon: 'color-palette-outline' },
  environnement: { label: 'Environnement', icon: 'leaf-outline' },
  autre: { label: 'Autre', icon: 'apps-outline' },
};

// Formater les montants
const formatMontant = (montant: number): string => {
  if (montant >= 1000000) {
    return `${(montant / 1000000).toFixed(1)}M €`;
  }
  if (montant >= 1000) {
    return `${(montant / 1000).toFixed(0)}k €`;
  }
  return `${montant} €`;
};

export default function ProjetDetailPage() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const styles = createStyles(couleurs);

  // États principaux
  const [projet, setProjet] = useState<Projet | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);

  // Suivre
  const [estSuivi, setEstSuivi] = useState(false);
  const [nbFollowers, setNbFollowers] = useState(0);

  // Onglets
  const [activeTab, setActiveTab] = useState<TabKey>('vision');

  // Contacter - Modal représentants
  const [showContactModal, setShowContactModal] = useState(false);
  const [representants, setRepresentants] = useState<Porteur[]>([]);
  const [chargementRepresentants, setChargementRepresentants] = useState(false);

  // Simulateur d'investissement
  const [montantInvestissement, setMontantInvestissement] = useState('1000');
  const [showSimulateur, setShowSimulateur] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const actionEnCoursRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculer la progression de financement
  const progressionFinancement = useMemo(() => {
    if (!projet?.objectifFinancement || projet.objectifFinancement === 0) return 0;
    const montantLeve = projet.montantLeve || 0;
    return Math.min((montantLeve / projet.objectifFinancement) * 100, 100);
  }, [projet]);

  // Animation de la barre de progression
  useEffect(() => {
    if (projet && !chargement) {
      Animated.timing(progressAnim, {
        toValue: progressionFinancement,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [progressionFinancement, projet, chargement]);

  // Interpolations pour l'animation du header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const imageTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE - 50, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Charger le projet
  const chargerProjet = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const reponse = await getProjet(id);
      if (reponse.succes && reponse.data) {
        setProjet(reponse.data.projet);
        if (!actionEnCoursRef.current) {
          setEstSuivi(reponse.data.projet.estSuivi);
          setNbFollowers(reponse.data.projet.nbFollowers);
        }
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id]);

  // Charger les représentants
  const chargerRepresentants = useCallback(async () => {
    if (!id) return;
    setChargementRepresentants(true);
    try {
      const reponse = await getRepresentantsProjet(id);
      if (reponse.succes && reponse.data) {
        setRepresentants(reponse.data.representants);
      }
    } catch (error) {
      console.error('Erreur chargement representants:', error);
    } finally {
      setChargementRepresentants(false);
    }
  }, [id]);

  useEffect(() => {
    chargerProjet();
  }, [chargerProjet]);

  // Ouvrir le modal contact si action=contact
  useEffect(() => {
    if (action === 'contact' && projet && !chargement) {
      openContactModal();
    }
  }, [action, projet, chargement]);

  const handleToggleSuivre = async () => {
    if (!id || actionEnCours) return;

    setActionEnCours(true);
    actionEnCoursRef.current = true;

    const previousEstSuivi = estSuivi;
    const previousNbFollowers = nbFollowers;

    const newEstSuivi = !estSuivi;
    const newNbFollowers = estSuivi ? nbFollowers - 1 : nbFollowers + 1;
    setEstSuivi(newEstSuivi);
    setNbFollowers(newNbFollowers);

    try {
      const reponse = await toggleSuivreProjet(id);

      if (reponse.succes && reponse.data) {
        const apiData = reponse.data as { estSuivi?: boolean; suivi?: boolean; nbFollowers?: number; totalFollowers?: number };
        const apiEstSuivi = apiData.estSuivi ?? apiData.suivi;
        const apiNbFollowers = apiData.nbFollowers ?? apiData.totalFollowers;

        if (typeof apiEstSuivi === 'boolean') {
          setEstSuivi(apiEstSuivi);
        }
        if (typeof apiNbFollowers === 'number') {
          setNbFollowers(apiNbFollowers);
        }
      } else if (!reponse.succes) {
        setEstSuivi(previousEstSuivi);
        setNbFollowers(previousNbFollowers);
      }
    } catch (error) {
      console.error('Erreur toggle suivre:', error);
      setEstSuivi(previousEstSuivi);
      setNbFollowers(previousNbFollowers);
    } finally {
      setActionEnCours(false);
      actionEnCoursRef.current = false;
    }
  };

  const openContactModal = async () => {
    setShowContactModal(true);
    await chargerRepresentants();
  };

  const handleContacterRepresentant = async (representant: Porteur) => {
    try {
      setActionEnCours(true);
      const reponse = await getOuCreerConversationPrivee(representant._id);
      if (reponse.succes && reponse.data) {
        setShowContactModal(false);
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.conversation._id },
        });
      }
    } catch (error) {
      console.error('Erreur creation conversation:', error);
    } finally {
      setActionEnCours(false);
    }
  };

  const naviguerVersProfil = (userId: string) => {
    if (utilisateur?.id === userId) {
      router.push('/(app)/profil');
    } else {
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: userId },
      });
    }
  };

  // Rendu du header animé
  const renderHeader = () => {
    if (!projet) return null;

    const maturiteInfo = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
    const categorieInfo = CATEGORIE_LABELS[projet.categorie] || CATEGORIE_LABELS.autre;

    return (
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        {/* Image de fond avec parallax */}
        <Animated.Image
          source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop' }}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [{ translateY: imageTranslate }],
            },
          ]}
        />

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          locations={[0, 0.5, 1]}
          style={styles.headerGradient}
        />

        {/* Bouton retour */}
        <View style={[styles.headerNav, { paddingTop: insets.top + espacements.sm }]}>
          <Pressable
            style={styles.navButton}
            onPress={() => router.back()}
          >
            <View style={styles.blurButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </Pressable>

          {/* Titre condensé (apparaît au scroll) */}
          <Animated.View style={[styles.headerTitleContainer, { opacity: titleOpacity }]}>
            <Text style={styles.headerTitleSmall} numberOfLines={1}>{projet.nom}</Text>
          </Animated.View>

          <Pressable
            style={styles.navButton}
            onPress={() => {/* Share */}}
          >
            <View style={styles.blurButton}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Info du projet sur l'image */}
        <Animated.View style={[styles.headerContent, { opacity: imageOpacity }]}>
          {/* Logo */}
          {projet.logo && (
            <View style={styles.logoWrapper}>
              <Image source={{ uri: projet.logo }} style={styles.logoImage} />
            </View>
          )}

          {/* Nom et badges */}
          <View style={styles.headerInfo}>
            <Text style={styles.projectName}>{projet.nom}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: maturiteInfo.color }]}>
                <Text style={styles.badgeText}>{maturiteInfo.label}</Text>
              </View>
              <View style={styles.badgeOutline}>
                <Ionicons name={categorieInfo.icon} size={12} color="#fff" />
                <Text style={styles.badgeOutlineText}>{categorieInfo.label}</Text>
              </View>
            </View>
            {projet.localisation?.ville && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.locationText}>{projet.localisation.ville}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    );
  };

  // Rendu de la barre de progression de financement
  const renderProgressBar = () => {
    if (!projet?.objectifFinancement) return null;

    const montantLeve = projet.montantLeve || 0;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressAmount}>{formatMontant(montantLeve)}</Text>
            <Text style={styles.progressLabel}>levés sur {formatMontant(projet.objectifFinancement)}</Text>
          </View>
          <View style={styles.progressPercentContainer}>
            <Text style={styles.progressPercent}>{Math.round(progressionFinancement)}%</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[couleurs.gradientPrimaire[0], couleurs.gradientPrimaire[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStatItem}>
            <Ionicons name="people-outline" size={16} color={couleurs.texteSecondaire} />
            <Text style={styles.progressStatText}>{nbFollowers} abonnés</Text>
          </View>
          {projet.datePublication && (
            <View style={styles.progressStatItem}>
              <Ionicons name="calendar-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.progressStatText}>
                Publié le {new Date(projet.datePublication).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Rendu des boutons d'action
  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <Pressable
        style={[styles.actionButton, estSuivi && styles.actionButtonActive]}
        onPress={handleToggleSuivre}
        disabled={actionEnCours}
      >
        <Ionicons
          name={estSuivi ? 'heart' : 'heart-outline'}
          size={20}
          color={estSuivi ? couleurs.primaire : couleurs.texte}
        />
        <Text style={[styles.actionButtonText, estSuivi && styles.actionButtonTextActive]}>
          {estSuivi ? 'Suivi' : 'Suivre'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.actionButtonPrimary}
        onPress={openContactModal}
        disabled={actionEnCours}
      >
        <LinearGradient
          colors={[couleurs.gradientPrimaire[0], couleurs.gradientPrimaire[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionButtonGradient}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonPrimaryText}>Contacter</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // Rendu des onglets
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={activeTab === tab.key ? couleurs.primaire : couleurs.texteSecondaire}
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Rendu du contenu Vision
  const renderVisionTab = () => {
    if (!projet) return null;

    return (
      <View style={styles.tabContent}>
        {/* Pitch */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="megaphone-outline" size={20} color={couleurs.primaire} />
            <Text style={styles.sectionTitle}>Pitch</Text>
          </View>
          <Text style={styles.sectionText}>{projet.pitch || projet.description}</Text>
        </View>

        {/* Problème / Solution */}
        {(projet.probleme || projet.solution) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Proposition de valeur</Text>
            </View>

            {projet.probleme && (
              <View style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: couleurs.erreur + '20' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={couleurs.erreur} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueLabel}>Problème</Text>
                  <Text style={styles.valueText}>{projet.probleme}</Text>
                </View>
              </View>
            )}

            {projet.solution && (
              <View style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: couleurs.succes + '20' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={couleurs.succes} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueLabel}>Solution</Text>
                  <Text style={styles.valueText}>{projet.solution}</Text>
                </View>
              </View>
            )}

            {projet.avantageConcurrentiel && (
              <View style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: couleurs.primaire + '20' }]}>
                  <Ionicons name="trophy-outline" size={20} color={couleurs.primaire} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueLabel}>Avantage concurrentiel</Text>
                  <Text style={styles.valueText}>{projet.avantageConcurrentiel}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Cible */}
        {projet.cible && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Cible</Text>
            </View>
            <Text style={styles.sectionText}>{projet.cible}</Text>
          </View>
        )}

        {/* Équipe */}
        {(projet.porteur || (projet.equipe && projet.equipe.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-circle-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Équipe</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamScroll}>
              {/* Porteur */}
              {projet.porteur && (
                <Pressable
                  style={styles.teamCard}
                  onPress={() => naviguerVersProfil(projet.porteur!._id)}
                >
                  <Avatar
                    uri={projet.porteur.avatar}
                    nom={projet.porteur.nom}
                    prenom={projet.porteur.prenom}
                    taille={64}
                  />
                  <Text style={styles.teamName} numberOfLines={1}>
                    {projet.porteur.prenom} {projet.porteur.nom}
                  </Text>
                  <View style={styles.teamRoleBadge}>
                    <Text style={styles.teamRoleText}>Fondateur</Text>
                  </View>
                </Pressable>
              )}

              {/* Autres membres */}
              {projet.equipe.map((membre, i) => (
                <Pressable
                  key={i}
                  style={styles.teamCard}
                  onPress={() => membre.utilisateur && naviguerVersProfil(membre.utilisateur._id)}
                  disabled={!membre.utilisateur}
                >
                  <Avatar
                    uri={membre.photo || membre.utilisateur?.avatar}
                    nom={membre.nom}
                    prenom=""
                    taille={64}
                  />
                  <Text style={styles.teamName} numberOfLines={1}>
                    {membre.utilisateur
                      ? `${membre.utilisateur.prenom} ${membre.utilisateur.nom}`
                      : membre.nom}
                  </Text>
                  <View style={styles.teamRoleBadge}>
                    <Text style={styles.teamRoleText}>
                      {membre.titre || ROLE_LABELS[membre.role] || membre.role}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tags */}
        {projet.tags && projet.tags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetags-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Tags</Text>
            </View>
            <View style={styles.tagsContainer}>
              {projet.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Rendu du contenu Market
  const renderMarketTab = () => {
    if (!projet) return null;

    return (
      <View style={styles.tabContent}>
        {/* KPIs */}
        {projet.metriques && projet.metriques.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Métriques clés</Text>
            </View>
            <View style={styles.kpiGrid}>
              {projet.metriques.map((metrique, i) => (
                <View key={i} style={styles.kpiCard}>
                  {metrique.icone && (
                    <Ionicons name={metrique.icone as keyof typeof Ionicons.glyphMap} size={24} color={couleurs.primaire} />
                  )}
                  <Text style={styles.kpiValue}>{metrique.valeur}</Text>
                  <Text style={styles.kpiLabel}>{metrique.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Business Model */}
        {projet.businessModel && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Business Model</Text>
            </View>
            <View style={styles.businessModelCard}>
              <Text style={styles.sectionText}>{projet.businessModel}</Text>
            </View>
          </View>
        )}

        {/* Simulateur d'investissement */}
        {projet.objectifFinancement && projet.objectifFinancement > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calculator-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Simulateur</Text>
            </View>
            <View style={styles.simulatorCard}>
              <Text style={styles.simulatorLabel}>Montant d'investissement</Text>
              <View style={styles.simulatorInputRow}>
                <TextInput
                  style={styles.simulatorInput}
                  value={montantInvestissement}
                  onChangeText={setMontantInvestissement}
                  keyboardType="numeric"
                  placeholder="1000"
                  placeholderTextColor={couleurs.texteMuted}
                />
                <Text style={styles.simulatorCurrency}>€</Text>
              </View>
              <View style={styles.simulatorPresets}>
                {['500', '1000', '5000', '10000'].map((preset) => (
                  <Pressable
                    key={preset}
                    style={[
                      styles.simulatorPreset,
                      montantInvestissement === preset && styles.simulatorPresetActive,
                    ]}
                    onPress={() => setMontantInvestissement(preset)}
                  >
                    <Text
                      style={[
                        styles.simulatorPresetText,
                        montantInvestissement === preset && styles.simulatorPresetTextActive,
                      ]}
                    >
                      {parseInt(preset).toLocaleString('fr-FR')} €
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.simulatorResult}>
                <View style={styles.simulatorResultRow}>
                  <Text style={styles.simulatorResultLabel}>Part du capital</Text>
                  <Text style={styles.simulatorResultValue}>
                    {projet.objectifFinancement > 0
                      ? ((parseInt(montantInvestissement) || 0) / projet.objectifFinancement * 100).toFixed(2)
                      : '0'
                    }%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Galerie */}
        {projet.galerie && projet.galerie.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Galerie</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {projet.galerie.map((media, i) => (
                <Image
                  key={i}
                  source={{ uri: media.thumbnailUrl || media.url }}
                  style={styles.galleryImage}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Rendu du contenu Documents
  const renderDocsTab = () => {
    if (!projet) return null;

    const hasDocuments = projet.documents && projet.documents.length > 0;
    const hasPitchVideo = projet.pitchVideo;

    if (!hasDocuments && !hasPitchVideo) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={couleurs.texteMuted} />
            <Text style={styles.emptyStateText}>Aucun document disponible</Text>
            <Text style={styles.emptyStateSubtext}>
              Les documents du projet seront affichés ici
            </Text>
          </View>
        </View>
      );
    }

    const getDocIcon = (type: string): keyof typeof Ionicons.glyphMap => {
      switch (type) {
        case 'pdf': return 'document-text-outline';
        case 'pptx': return 'easel-outline';
        case 'xlsx': return 'grid-outline';
        case 'docx': return 'document-outline';
        case 'image': return 'image-outline';
        default: return 'document-outline';
      }
    };

    return (
      <View style={styles.tabContent}>
        {/* Pitch Video */}
        {hasPitchVideo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Pitch vidéo</Text>
            </View>
            <Pressable style={styles.videoCard}>
              <View style={styles.videoPlaceholder}>
                <Ionicons name="play-circle-outline" size={48} color={couleurs.primaire} />
              </View>
              <Text style={styles.videoLabel}>Voir le pitch vidéo</Text>
            </Pressable>
          </View>
        )}

        {/* Data Room */}
        {hasDocuments && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Data Room</Text>
            </View>
            {projet.documents.filter(doc => doc.visibilite === 'public').map((doc, i) => (
              <Pressable key={i} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <Ionicons name={getDocIcon(doc.type)} size={24} color={couleurs.primaire} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{doc.nom}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.type.toUpperCase()} • {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color={couleurs.texteSecondaire} />
              </Pressable>
            ))}
            {projet.documents.filter(doc => doc.visibilite === 'private').length > 0 && (
              <View style={styles.privateDocsNotice}>
                <Ionicons name="lock-closed-outline" size={16} color={couleurs.texteSecondaire} />
                <Text style={styles.privateDocsText}>
                  {projet.documents.filter(doc => doc.visibilite === 'private').length} document(s) privé(s) réservé(s) aux investisseurs
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Écrans de chargement et erreur
  if (chargement) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </View>
    );
  }

  if (!projet) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color={couleurs.texteSecondaire} />
        <Text style={styles.errorText}>Projet introuvable</Text>
        <Pressable style={styles.retourBtn} onPress={() => router.back()}>
          <Text style={styles.retourBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header animé */}
      {renderHeader()}

      {/* Contenu scrollable */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_MAX_HEIGHT, paddingBottom: insets.bottom + 100 },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => chargerProjet(true)}
            tintColor={couleurs.primaire}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
      >
        <View style={styles.contentCard}>
          {/* Barre de progression */}
          {renderProgressBar()}

          {/* Actions */}
          {renderActions()}

          {/* Onglets */}
          {renderTabs()}

          {/* Contenu de l'onglet actif */}
          {activeTab === 'vision' && renderVisionTab()}
          {activeTab === 'market' && renderMarketTab()}
          {activeTab === 'docs' && renderDocsTab()}
        </View>
      </Animated.ScrollView>

      {/* Modal Contacter */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowContactModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contacter le projet</Text>
              <Pressable onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Sélectionnez un membre de l'équipe pour démarrer une conversation
            </Text>
            {chargementRepresentants ? (
              <ActivityIndicator size="small" color={couleurs.primaire} style={{ marginVertical: 20 }} />
            ) : representants.length === 0 ? (
              <Text style={styles.noRepresentants}>Aucun représentant disponible</Text>
            ) : (
              <FlatList
                data={representants}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.representantItem}
                    onPress={() => handleContacterRepresentant(item)}
                    disabled={actionEnCours}
                  >
                    <Avatar
                      uri={item.avatar}
                      nom={item.nom}
                      prenom={item.prenom}
                      taille={48}
                    />
                    <View style={styles.representantInfo}>
                      <Text style={styles.representantName}>
                        {item.prenom} {item.nom}
                      </Text>
                      <Text style={styles.representantRole}>Membre de l'équipe</Text>
                    </View>
                    <View style={styles.representantAction}>
                      <Ionicons name="chatbubble-outline" size={20} color={couleurs.primaire} />
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    errorText: {
      fontSize: 16,
      color: couleurs.texteSecondaire,
      marginTop: espacements.md,
    },
    retourBtn: {
      marginTop: espacements.lg,
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.md,
    },
    retourBtnText: {
      color: '#fff',
      fontWeight: '600',
    },

    // Header
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      overflow: 'hidden',
      zIndex: 10,
    },
    headerImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_MAX_HEIGHT,
      width: '100%',
      resizeMode: 'cover',
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    headerNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.md,
      zIndex: 2,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    blurButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    headerTitleContainer: {
      flex: 1,
      marginHorizontal: espacements.md,
    },
    headerTitleSmall: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      textAlign: 'center',
    },
    headerContent: {
      position: 'absolute',
      bottom: espacements.lg,
      left: espacements.lg,
      right: espacements.lg,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    logoWrapper: {
      width: 72,
      height: 72,
      borderRadius: rayons.md,
      backgroundColor: couleurs.fond,
      padding: 4,
      marginRight: espacements.md,
      ...ombres.md,
    },
    logoImage: {
      width: '100%',
      height: '100%',
      borderRadius: rayons.sm,
    },
    headerInfo: {
      flex: 1,
    },
    projectName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      marginBottom: espacements.xs,
    },
    badgesRow: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginBottom: espacements.xs,
    },
    badge: {
      paddingHorizontal: espacements.sm,
      paddingVertical: 4,
      borderRadius: rayons.full,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#fff',
    },
    badgeOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: espacements.sm,
      paddingVertical: 4,
      borderRadius: rayons.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    badgeOutlineText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#fff',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
    },

    // Content card
    contentCard: {
      backgroundColor: couleurs.fond,
      borderTopLeftRadius: rayons.xl,
      borderTopRightRadius: rayons.xl,
      marginTop: -espacements.xl,
      paddingTop: espacements.lg,
    },

    // Progress bar
    progressSection: {
      paddingHorizontal: espacements.lg,
      paddingBottom: espacements.lg,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: espacements.md,
    },
    progressAmount: {
      fontSize: 28,
      fontWeight: '700',
      color: couleurs.texte,
    },
    progressLabel: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    progressPercentContainer: {
      backgroundColor: couleurs.primaire + '20',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.md,
    },
    progressPercent: {
      fontSize: 16,
      fontWeight: '700',
      color: couleurs.primaire,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.full,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: rayons.full,
      overflow: 'hidden',
    },
    progressStats: {
      flexDirection: 'row',
      gap: espacements.lg,
      marginTop: espacements.md,
    },
    progressStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
    },
    progressStatText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },

    // Actions
    actionsContainer: {
      flexDirection: 'row',
      gap: espacements.md,
      paddingHorizontal: espacements.lg,
      paddingBottom: espacements.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    actionButtonActive: {
      backgroundColor: couleurs.primaire + '15',
      borderColor: couleurs.primaire,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    actionButtonTextActive: {
      color: couleurs.primaire,
    },
    actionButtonPrimary: {
      flex: 1,
      borderRadius: rayons.md,
      overflow: 'hidden',
    },
    actionButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.md,
    },
    actionButtonPrimaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },

    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
      marginHorizontal: espacements.lg,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.xs,
      paddingVertical: espacements.md,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: couleurs.primaire,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: couleurs.texteSecondaire,
    },
    tabTextActive: {
      color: couleurs.primaire,
      fontWeight: '600',
    },

    // Tab content
    tabContent: {
      paddingTop: espacements.lg,
    },

    // Sections
    section: {
      paddingHorizontal: espacements.lg,
      paddingBottom: espacements.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    sectionText: {
      fontSize: 15,
      color: couleurs.texteSecondaire,
      lineHeight: 22,
    },

    // Value cards
    valueCard: {
      flexDirection: 'row',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    valueIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    valueContent: {
      flex: 1,
    },
    valueLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    valueText: {
      fontSize: 14,
      color: couleurs.texte,
      lineHeight: 20,
    },

    // Team
    teamScroll: {
      marginHorizontal: -espacements.lg,
      paddingHorizontal: espacements.lg,
    },
    teamCard: {
      width: 120,
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.md,
      marginRight: espacements.md,
    },
    teamName: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
      marginTop: espacements.sm,
      textAlign: 'center',
    },
    teamRoleBadge: {
      marginTop: espacements.xs,
      backgroundColor: couleurs.primaire + '20',
      paddingHorizontal: espacements.sm,
      paddingVertical: 4,
      borderRadius: rayons.full,
    },
    teamRoleText: {
      fontSize: 10,
      fontWeight: '600',
      color: couleurs.primaire,
    },

    // Tags
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
    },
    tag: {
      backgroundColor: couleurs.fondSecondaire,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.full,
    },
    tagText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },

    // KPIs
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.md,
    },
    kpiCard: {
      width: (SCREEN_WIDTH - espacements.lg * 2 - espacements.md) / 2,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      alignItems: 'center',
    },
    kpiValue: {
      fontSize: 24,
      fontWeight: '700',
      color: couleurs.texte,
      marginTop: espacements.sm,
    },
    kpiLabel: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 4,
      textAlign: 'center',
    },

    // Business model
    businessModelCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.lg,
    },

    // Simulator
    simulatorCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
    },
    simulatorLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
      marginBottom: espacements.md,
    },
    simulatorInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingHorizontal: espacements.md,
    },
    simulatorInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: couleurs.texte,
      paddingVertical: espacements.md,
    },
    simulatorCurrency: {
      fontSize: 20,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
    },
    simulatorPresets: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginTop: espacements.md,
    },
    simulatorPreset: {
      flex: 1,
      paddingVertical: espacements.sm,
      borderRadius: rayons.md,
      backgroundColor: couleurs.fond,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    simulatorPresetActive: {
      backgroundColor: couleurs.primaire + '20',
      borderColor: couleurs.primaire,
    },
    simulatorPresetText: {
      fontSize: 12,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
    },
    simulatorPresetTextActive: {
      color: couleurs.primaire,
    },
    simulatorResult: {
      marginTop: espacements.lg,
      paddingTop: espacements.lg,
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
    },
    simulatorResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    simulatorResultLabel: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
    },
    simulatorResultValue: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.primaire,
    },

    // Gallery
    galleryImage: {
      width: 200,
      height: 150,
      borderRadius: rayons.md,
      marginRight: espacements.md,
    },

    // Documents
    videoCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      overflow: 'hidden',
    },
    videoPlaceholder: {
      height: 180,
      backgroundColor: couleurs.fond,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
      textAlign: 'center',
      padding: espacements.md,
    },
    documentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    documentIcon: {
      width: 44,
      height: 44,
      borderRadius: rayons.md,
      backgroundColor: couleurs.primaire + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    documentInfo: {
      flex: 1,
    },
    documentName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    documentMeta: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    privateDocsNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.md,
    },
    privateDocsText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      flex: 1,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: espacements.xxxl,
      paddingHorizontal: espacements.xl,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: couleurs.texte,
      marginTop: espacements.lg,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      marginTop: espacements.sm,
      textAlign: 'center',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      flex: 1,
    },
    modalContent: {
      backgroundColor: couleurs.fond,
      borderTopLeftRadius: rayons.xl,
      borderTopRightRadius: rayons.xl,
      padding: espacements.lg,
      maxHeight: '70%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: couleurs.bordure,
      alignSelf: 'center',
      marginBottom: espacements.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    modalSubtitle: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      marginBottom: espacements.lg,
    },
    noRepresentants: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      paddingVertical: espacements.xl,
    },
    representantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: espacements.md,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    representantInfo: {
      flex: 1,
      marginLeft: espacements.md,
    },
    representantName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    representantRole: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    representantAction: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: couleurs.primaire + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
