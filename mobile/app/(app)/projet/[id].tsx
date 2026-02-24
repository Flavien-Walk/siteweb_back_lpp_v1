/**
 * Page Fiche Projet Premium
 * Design style plateforme d'investissement - V2 Optimisée
 */

import { useRef, useEffect } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 90;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

import { espacements } from '../../../src/constantes/theme';
import { useTheme } from '../../../src/contexts/ThemeContext';
import Avatar from '../../../src/composants/Avatar';
import SwipeableScreen from '../../../src/composants/SwipeableScreen';
import { TypeLien } from '../../../src/services/projets';
import createStyles from '../../../src/features/projets/projet-detail.styles';
import { useProjetDetail, TabKey } from '../../../src/features/projets/useProjetDetail';

// Types pour les onglets
interface TabItem {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { key: 'vision', label: 'Vision', icon: 'bulb-outline' },
  { key: 'market', label: 'Market', icon: 'trending-up-outline' },
  { key: 'docs', label: 'Docs', icon: 'folder-outline' },
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

// Labels et icônes pour les liens externes
const LIEN_LABELS: Record<TypeLien, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  site: { label: 'Site web', icon: 'globe-outline', color: '#3B82F6' },
  fundraising: { label: 'Levée de fonds', icon: 'cash-outline', color: '#10B981' },
  linkedin: { label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  twitter: { label: 'X / Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  instagram: { label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
  youtube: { label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  discord: { label: 'Discord', icon: 'logo-discord', color: '#5865F2' },
  doc: { label: 'Document', icon: 'document-text-outline', color: '#F59E0B' },
  email: { label: 'Email', icon: 'mail-outline', color: '#6366F1' },
  other: { label: 'Lien', icon: 'link-outline', color: '#71717A' },
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const styles = createStyles(couleurs);

  const {
    projet,
    representants,
    chargement,
    rafraichissement,
    actionEnCours,
    chargementRepresentants,
    estSuivi,
    nbFollowers,
    showDetails,
    activeTab,
    showContactModal,
    isOwnerOrMember,
    progressionFinancement,
    chargerProjet,
    handleToggleSuivre,
    openContactModal,
    handleContacterRepresentant,
    naviguerVersProfil,
    setShowDetails,
    setActiveTab,
    setShowContactModal,
  } = useProjetDetail();

  // -------------------------------------------------------------------------
  // Animations (UI-only)
  // -------------------------------------------------------------------------

  const scrollY = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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
    inputRange: [0, HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // -------------------------------------------------------------------------
  // Fonctions de rendu
  // -------------------------------------------------------------------------

  const renderHeader = () => {
    if (!projet) return null;

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
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={styles.headerGradient}
        />

        {/* Navigation */}
        <View style={[styles.headerNav, { paddingTop: insets.top + espacements.xs }]}>
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

          <Pressable style={styles.navButton} onPress={() => {}}>
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

          {/* Nom et location */}
          <View style={styles.headerInfo}>
            <Text style={styles.projectName} numberOfLines={2}>{projet.nom}</Text>
            {projet.localisation?.ville && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.locationText}>{projet.localisation.ville}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderQuickStats = () => {
    if (!projet) return null;

    const maturiteInfo = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
    const categorieInfo = CATEGORIE_LABELS[projet.categorie] || CATEGORIE_LABELS.autre;

    return (
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: couleurs.primaire + '20' }]}>
            <Ionicons name="people" size={16} color={couleurs.primaire} />
          </View>
          <View style={styles.quickStatTextContainer}>
            <Text style={styles.quickStatValue} numberOfLines={1}>{nbFollowers}</Text>
            <Text style={styles.quickStatLabel}>Abonnés</Text>
          </View>
        </View>

        <View style={styles.quickStatDivider} />

        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: maturiteInfo.color + '20' }]}>
            <Ionicons name="rocket" size={16} color={maturiteInfo.color} />
          </View>
          <View style={styles.quickStatTextContainer}>
            <Text style={styles.quickStatValue} numberOfLines={1}>{maturiteInfo.label}</Text>
            <Text style={styles.quickStatLabel}>Maturité</Text>
          </View>
        </View>

        <View style={styles.quickStatDivider} />

        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: couleurs.secondaire + '20' }]}>
            <Ionicons name={categorieInfo.icon} size={16} color={couleurs.secondaire} />
          </View>
          <View style={styles.quickStatTextContainer}>
            <Text style={styles.quickStatValue} numberOfLines={1}>{categorieInfo.label}</Text>
            <Text style={styles.quickStatLabel}>Secteur</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLinks = () => {
    if (!projet?.liens || projet.liens.length === 0) return null;

    return (
      <View style={styles.linksSection}>
        <View style={styles.linksSectionHeader}>
          <Ionicons name="link-outline" size={18} color={couleurs.primaire} />
          <Text style={styles.linksSectionTitle}>Liens</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.linksScrollContent}
        >
          {projet.liens.map((lien, i) => {
            const lienInfo = LIEN_LABELS[lien.type] || LIEN_LABELS.other;
            return (
              <Pressable
                key={i}
                style={styles.linkChip}
                onPress={() => Linking.openURL(lien.url)}
              >
                <View style={[styles.linkChipIcon, { backgroundColor: lienInfo.color + '20' }]}>
                  <Ionicons name={lienInfo.icon} size={16} color={lienInfo.color} />
                </View>
                <Text style={styles.linkChipText} numberOfLines={1}>
                  {lien.label || lienInfo.label}
                </Text>
                <Ionicons name="open-outline" size={14} color={couleurs.texteSecondaire} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderProgressBar = () => {
    if (!projet?.objectifFinancement) return null;

    const montantLeve = projet.montantLeve || 0;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.progressAmountContainer}>
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

        {projet.datePublication && (
          <View style={styles.progressMeta}>
            <Ionicons name="calendar-outline" size={14} color={couleurs.texteSecondaire} />
            <Text style={styles.progressMetaText}>
              Publié le {new Date(projet.datePublication).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {/* Bouton Suivre - masque si proprietaire ou membre */}
      {!isOwnerOrMember && (
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
      )}

      <Pressable
        style={[styles.actionButtonPrimary, isOwnerOrMember && { flex: 1 }]}
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

  const renderShowMoreButton = () => (
    <Pressable
      style={styles.showMoreButton}
      onPress={() => setShowDetails(!showDetails)}
    >
      <Text style={styles.showMoreText}>
        {showDetails ? 'Voir moins' : 'En savoir plus'}
      </Text>
      <Ionicons
        name={showDetails ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={couleurs.primaire}
      />
    </Pressable>
  );

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
            size={16}
            color={activeTab === tab.key ? couleurs.primaire : couleurs.texteSecondaire}
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderVisionTab = () => {
    if (!projet) return null;

    return (
      <View style={styles.detailsContent}>
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
                <View style={[styles.valueIcon, { backgroundColor: couleurs.erreur + '15' }]}>
                  <Ionicons name="alert-circle-outline" size={22} color={couleurs.erreur} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueLabel}>Problème</Text>
                  <Text style={styles.valueText}>{projet.probleme}</Text>
                </View>
              </View>
            )}

            {projet.solution && (
              <View style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: couleurs.succes + '15' }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={couleurs.succes} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueLabel}>Solution</Text>
                  <Text style={styles.valueText}>{projet.solution}</Text>
                </View>
              </View>
            )}

            {projet.avantageConcurrentiel && (
              <View style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: couleurs.primaire + '15' }]}>
                  <Ionicons name="trophy-outline" size={22} color={couleurs.primaire} />
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
            <View style={styles.cibleCard}>
              <Text style={styles.sectionText}>{projet.cible}</Text>
            </View>
          </View>
        )}

        {/* Équipe */}
        {(projet.porteur || (projet.equipe && projet.equipe.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-circle-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Équipe</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.teamScroll}
              contentContainerStyle={styles.teamScrollContent}
            >
              {/* Porteur */}
              {projet.porteur && (
                <Pressable
                  style={styles.teamCard}
                  onPress={() => naviguerVersProfil(projet.porteur!._id)}
                >
                  <View style={styles.teamAvatarContainer}>
                    <Avatar
                      uri={projet.porteur.avatar}
                      nom={projet.porteur.nom}
                      prenom={projet.porteur.prenom}
                      taille={56}
                    />
                    <View style={styles.founderBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {projet.porteur.prenom}
                  </Text>
                  <Text style={styles.teamLastName} numberOfLines={1}>
                    {projet.porteur.nom}
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
                  <View style={styles.teamAvatarContainer}>
                    <Avatar
                      uri={membre.photo || membre.utilisateur?.avatar}
                      nom={membre.nom}
                      prenom=""
                      taille={56}
                    />
                  </View>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {membre.utilisateur ? membre.utilisateur.prenom : membre.nom.split(' ')[0]}
                  </Text>
                  <Text style={styles.teamLastName} numberOfLines={1}>
                    {membre.utilisateur ? membre.utilisateur.nom : membre.nom.split(' ')[1] || ''}
                  </Text>
                  <View style={[styles.teamRoleBadge, styles.teamRoleBadgeMember]}>
                    <Text style={[styles.teamRoleText, styles.teamRoleTextMember]}>
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

  const renderMarketTab = () => {
    if (!projet) return null;

    return (
      <View style={styles.detailsContent}>
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
                    <View style={styles.kpiIconContainer}>
                      <Ionicons name={metrique.icone as keyof typeof Ionicons.glyphMap} size={22} color={couleurs.primaire} />
                    </View>
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

        {/* Galerie */}
        {projet.galerie && projet.galerie.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Galerie</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScrollContent}
            >
              {projet.galerie.map((media, i) => (
                <Pressable key={i} style={styles.galleryImageContainer}>
                  <Image
                    source={{ uri: media.thumbnailUrl || media.url }}
                    style={styles.galleryImage}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderDocsTab = () => {
    if (!projet) return null;

    const hasDocuments = projet.documents && projet.documents.length > 0;
    const hasPitchVideo = projet.pitchVideo;

    if (!hasDocuments && !hasPitchVideo) {
      return (
        <View style={styles.detailsContent}>
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="folder-open-outline" size={48} color={couleurs.texteMuted} />
            </View>
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
      <View style={styles.detailsContent}>
        {/* Pitch Video */}
        {hasPitchVideo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam-outline" size={20} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Pitch vidéo</Text>
            </View>
            <Pressable style={styles.videoCard}>
              <View style={styles.videoPlaceholder}>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={28} color="#fff" />
                </View>
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
                  <Ionicons name={getDocIcon(doc.type)} size={22} color={couleurs.primaire} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{doc.nom}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.type.toUpperCase()} • {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.downloadButton}>
                  <Ionicons name="download-outline" size={18} color={couleurs.primaire} />
                </View>
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

  // -------------------------------------------------------------------------
  // Écrans de chargement et erreur
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Rendu principal
  // -------------------------------------------------------------------------

  const content = (
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
          {renderQuickStats()}
          {renderLinks()}
          {renderProgressBar()}
          {renderActions()}
          {renderShowMoreButton()}

          {showDetails && (
            <>
              {renderTabs()}
              {activeTab === 'vision' && renderVisionTab()}
              {activeTab === 'market' && renderMarketTab()}
              {activeTab === 'docs' && renderDocsTab()}
            </>
          )}
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + espacements.lg }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contacter le projet</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Sélectionnez un membre de l'équipe pour démarrer une conversation
            </Text>
            {chargementRepresentants ? (
              <ActivityIndicator size="small" color={couleurs.primaire} style={{ marginVertical: 24 }} />
            ) : representants.length === 0 ? (
              <View style={styles.noRepresentantsContainer}>
                <Ionicons name="people-outline" size={40} color={couleurs.texteMuted} />
                <Text style={styles.noRepresentants}>Aucun représentant disponible</Text>
              </View>
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
                      taille={52}
                    />
                    <View style={styles.representantInfo}>
                      <Text style={styles.representantName}>
                        {item.prenom} {item.nom}
                      </Text>
                      <Text style={styles.representantRole}>Membre de l'équipe</Text>
                    </View>
                    <View style={styles.representantAction}>
                      <Ionicons name="chatbubble" size={18} color={couleurs.primaire} />
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

  if (Platform.OS === 'android') {
    return <SwipeableScreen>{content}</SwipeableScreen>;
  }

  return content;
}
