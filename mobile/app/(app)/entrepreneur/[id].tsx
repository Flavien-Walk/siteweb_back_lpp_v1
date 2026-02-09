/**
 * Ecran de gestion d'un projet entrepreneur
 * Design moderne avec aperçu et actions rapides
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import {
  Projet,
  Porteur,
  LienProjet,
  TypeLien,
  getProjet,
  publierProjet,
  depublierProjet,
  supprimerProjet,
} from '../../../src/services/projets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Labels pour la maturité
const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idée', color: '#9CA3AF' },
  prototype: { label: 'Prototype', color: '#F59E0B' },
  lancement: { label: 'Lancement', color: '#3B82F6' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

// Labels pour les catégories
const CATEGORIE_LABELS: Record<string, string> = {
  tech: 'Tech',
  food: 'Food',
  sante: 'Santé',
  education: 'Education',
  energie: 'Energie',
  culture: 'Culture',
  environnement: 'Environnement',
  autre: 'Autre',
};

// Labels pour les liens
const LIEN_LABELS: Record<TypeLien, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  site: { label: 'Site web', icon: 'globe-outline', color: '#3B82F6' },
  fundraising: { label: 'Levée de fonds', icon: 'cash-outline', color: '#10B981' },
  linkedin: { label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  twitter: { label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  instagram: { label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
  discord: { label: 'Discord', icon: 'logo-discord', color: '#5865F2' },
  youtube: { label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  doc: { label: 'Document', icon: 'document-outline', color: '#6B7280' },
  email: { label: 'Email', icon: 'mail-outline', color: '#F59E0B' },
  other: { label: 'Autre', icon: 'link-outline', color: '#8B5CF6' },
};

export default function ProjetEntrepreneurScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const styles = createStyles(couleurs);

  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showMediasModal, setShowMediasModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);

  const chargerProjet = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getProjet(id);
      if (response.succes && response.data?.projet) {
        setProjet(response.data.projet);
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      Alert.alert('Erreur', 'Impossible de charger le projet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    chargerProjet();
  }, [chargerProjet]);

  const onRefresh = () => {
    setRefreshing(true);
    chargerProjet();
  };

  const handlePublish = async () => {
    if (!id) return;
    Alert.alert(
      'Publier le projet',
      'Votre projet sera visible par tous les utilisateurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await publierProjet(id);
              if (response.succes) {
                Alert.alert('Succès', 'Votre projet est maintenant en ligne !');
                chargerProjet();
              } else {
                Alert.alert('Erreur', response.message || 'Impossible de publier');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUnpublish = async () => {
    if (!id) return;
    Alert.alert(
      'Dépublier le projet',
      'Le projet ne sera plus visible par les utilisateurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dépublier',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await depublierProjet(id);
              if (response.succes) {
                Alert.alert('Succès', 'Projet repassé en brouillon');
                chargerProjet();
              } else {
                Alert.alert('Erreur', response.message || 'Impossible de dépublier');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    Alert.alert(
      'Supprimer le projet',
      'Cette action est irréversible. Toutes les données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await supprimerProjet(id);
              if (response.succes) {
                Alert.alert('Succès', 'Projet supprimé', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Erreur', response.message || 'Impossible de supprimer');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const voirCommeVisiteur = () => {
    router.push(`/projet/${id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </View>
    );
  }

  if (!projet) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={64} color={couleurs.texteSecondaire} />
        <Text style={styles.errorText}>Projet non trouvé</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const isPublished = projet.statut === 'published';
  const maturiteInfo = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
  const categorieLabel = CATEGORIE_LABELS[projet.categorie] || 'Autre';

  // Calcul de la complétude du projet
  const completionItems = [
    !!projet.nom,
    !!projet.pitch,
    !!projet.description,
    !!projet.image,
    !!projet.localisation?.ville,
    !!projet.probleme,
    !!projet.solution,
    projet.equipe && projet.equipe.length > 0,
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <View style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header avec image */}
      <View style={styles.headerContainer}>
        {projet.image ? (
          <Image source={{ uri: projet.image }} style={styles.headerImage} />
        ) : (
          <View style={[styles.headerImage, styles.headerImagePlaceholder]}>
            <Ionicons name="image-outline" size={48} color={couleurs.texteSecondaire} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        />

        {/* Navigation */}
        <View style={[styles.headerNav, { paddingTop: insets.top + espacements.xs }]}>
          <Pressable style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={voirCommeVisiteur}>
            <Ionicons name="eye-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Status badge */}
        <View style={styles.headerContent}>
          <View style={[styles.statusBadge, isPublished ? styles.statusPublished : styles.statusDraft]}>
            <View style={[styles.statusDot, { backgroundColor: isPublished ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.statusText, { color: isPublished ? '#10B981' : '#F59E0B' }]}>
              {isPublished ? 'En ligne' : 'Brouillon'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + espacements.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.primaire} />
        }
      >
        {/* Titre et infos */}
        <View style={styles.titleSection}>
          <Text style={styles.projetNom}>{projet.nom}</Text>
          <Text style={styles.projetPitch} numberOfLines={2}>{projet.pitch}</Text>

          <View style={styles.tagsRow}>
            <View style={[styles.tagChip, { backgroundColor: maturiteInfo.color + '20' }]}>
              <Text style={[styles.tagText, { color: maturiteInfo.color }]}>{maturiteInfo.label}</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>{categorieLabel}</Text>
            </View>
            {projet.localisation?.ville && (
              <View style={styles.tagChip}>
                <Ionicons name="location" size={12} color={couleurs.texteSecondaire} />
                <Text style={styles.tagText}>{projet.localisation.ville}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats rapides - cliquables */}
        <View style={styles.statsGrid}>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
            onPress={() => setShowFollowersModal(true)}
          >
            <Ionicons name="people" size={24} color={couleurs.primaire} />
            <Text style={styles.statValue}>{projet.nbFollowers || projet.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
            <View style={styles.statCardIndicator}>
              <Ionicons name="chevron-forward" size={12} color={couleurs.texteSecondaire} />
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
            onPress={() => setShowMediasModal(true)}
          >
            <Ionicons name="images" size={24} color={couleurs.secondaire} />
            <Text style={styles.statValue}>{projet.galerie?.length || 0}</Text>
            <Text style={styles.statLabel}>Médias</Text>
            <View style={styles.statCardIndicator}>
              <Ionicons name="chevron-forward" size={12} color={couleurs.texteSecondaire} />
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
            onPress={() => setShowLinksModal(true)}
          >
            <Ionicons name="link" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{projet.liens?.length || 0}</Text>
            <Text style={styles.statLabel}>Liens</Text>
            <View style={styles.statCardIndicator}>
              <Ionicons name="chevron-forward" size={12} color={couleurs.texteSecondaire} />
            </View>
          </Pressable>
        </View>

        {/* Barre de complétude */}
        <View style={styles.completionSection}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionTitle}>Complétude du profil</Text>
            <Text style={[styles.completionPercent, { color: completionPercent === 100 ? '#10B981' : couleurs.primaire }]}>
              {completionPercent}%
            </Text>
          </View>
          <View style={styles.completionBarBg}>
            <View style={[styles.completionBarFill, { width: `${completionPercent}%` }]} />
          </View>
          {completionPercent < 100 && (
            <Text style={styles.completionHint}>
              Complétez votre profil pour attirer plus de visiteurs
            </Text>
          )}
        </View>

        {/* Actions principales */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push(`/entrepreneur/modifier-projet?id=${id}`)}
          >
            <View style={[styles.actionIcon, { backgroundColor: couleurs.primaire + '15' }]}>
              <Ionicons name="create-outline" size={22} color={couleurs.primaire} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Modifier le projet</Text>
              <Text style={styles.actionDesc}>Mettre à jour les informations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
          </Pressable>

          <Pressable style={styles.actionCard} onPress={voirCommeVisiteur}>
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="eye-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Voir comme visiteur</Text>
              <Text style={styles.actionDesc}>Prévisualiser la page publique</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
          </Pressable>

          {isPublished ? (
            <Pressable
              style={styles.actionCard}
              onPress={handleUnpublish}
              disabled={actionLoading}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="eye-off-outline" size={22} color="#F59E0B" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Dépublier</Text>
                <Text style={styles.actionDesc}>Masquer le projet aux visiteurs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.actionCard}
              onPress={handlePublish}
              disabled={actionLoading}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="rocket-outline" size={22} color="#10B981" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Publier le projet</Text>
                <Text style={styles.actionDesc}>Rendre visible aux utilisateurs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          )}
        </View>

        {/* Zone danger */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Zone de danger</Text>
          <Pressable
            style={styles.dangerBtn}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Supprimer le projet</Text>
          </Pressable>
        </View>
      </ScrollView>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      )}

      {/* Modal Abonnés */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowFollowersModal(false)} style={styles.modalBackBtn}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.modalTitle}>Abonnés</Text>
            <View style={styles.modalHeaderRight}>
              <Text style={styles.modalCount}>{projet.nbFollowers || projet.followers?.length || 0}</Text>
            </View>
          </View>

          {projet.followers && projet.followers.length > 0 ? (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {projet.followers.map((follower) => (
                <Pressable
                  key={follower._id}
                  style={styles.listItem}
                  onPress={() => {
                    setShowFollowersModal(false);
                    router.push(`/profil/${follower._id}` as any);
                  }}
                >
                  {follower.avatar ? (
                    <Image source={{ uri: follower.avatar }} style={styles.listItemAvatar} />
                  ) : (
                    <View style={[styles.listItemAvatar, styles.listItemAvatarPlaceholder]}>
                      <Ionicons name="person" size={20} color={couleurs.texteSecondaire} />
                    </View>
                  )}
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{follower.prenom} {follower.nom}</Text>
                    {follower.statut && (
                      <Text style={styles.listItemSubtitle}>{follower.statut}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="people-outline" size={48} color={couleurs.primaire} />
              </View>
              <Text style={styles.emptyStateText}>Aucun abonné pour l'instant</Text>
              <Text style={styles.emptyStateSubtext}>
                Publiez votre projet pour attirer des abonnés
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Médias */}
      <Modal
        visible={showMediasModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMediasModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowMediasModal(false)} style={styles.modalBackBtn}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.modalTitle}>Médias</Text>
            <View style={styles.modalHeaderRight}>
              <Text style={styles.modalCount}>{projet.galerie?.length || 0}</Text>
            </View>
          </View>

          {projet.galerie && projet.galerie.length > 0 ? (
            <>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.mediaGrid}>
                  {projet.galerie.map((media, index) => (
                    <View key={media._id || index} style={styles.mediaItem}>
                      <Image source={{ uri: media.thumbnailUrl || media.url }} style={styles.mediaThumbnail} />
                      {media.type === 'video' && (
                        <View style={styles.mediaVideoOverlay}>
                          <Ionicons name="play-circle" size={32} color="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { paddingBottom: insets.bottom + espacements.md }]}>
                <Pressable
                  style={styles.modalEditBtn}
                  onPress={() => {
                    setShowMediasModal(false);
                    router.push(`/entrepreneur/modifier-projet?id=${id}`);
                  }}
                >
                  <LinearGradient
                    colors={[couleurs.gradientPrimaire[0], couleurs.gradientPrimaire[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalEditBtnGradient}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.modalEditBtnText}>Modifier les médias</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="images-outline" size={48} color={couleurs.secondaire} />
              </View>
              <Text style={styles.emptyStateText}>Aucun média</Text>
              <Text style={styles.emptyStateSubtext}>
                Ajoutez des photos et vidéos à votre projet
              </Text>
              <Pressable
                style={styles.emptyStateBtn}
                onPress={() => {
                  setShowMediasModal(false);
                  router.push(`/entrepreneur/modifier-projet?id=${id}`);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyStateBtnText}>Ajouter des médias</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Liens */}
      <Modal
        visible={showLinksModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLinksModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowLinksModal(false)} style={styles.modalBackBtn}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.modalTitle}>Liens</Text>
            <View style={styles.modalHeaderRight}>
              <Text style={styles.modalCount}>{projet.liens?.length || 0}</Text>
            </View>
          </View>

          {projet.liens && projet.liens.length > 0 ? (
            <>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {projet.liens.map((lien, index) => {
                  const lienInfo = LIEN_LABELS[lien.type] || LIEN_LABELS.other;
                  return (
                    <Pressable
                      key={lien._id || index}
                      style={styles.listItem}
                      onPress={() => Linking.openURL(lien.url)}
                    >
                      <View style={[styles.listItemIcon, { backgroundColor: lienInfo.color + '20' }]}>
                        <Ionicons name={lienInfo.icon} size={20} color={lienInfo.color} />
                      </View>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{lien.label || lienInfo.label}</Text>
                        <Text style={styles.listItemSubtitle} numberOfLines={1}>{lien.url}</Text>
                      </View>
                      <Ionicons name="open-outline" size={18} color={couleurs.texteSecondaire} />
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={[styles.modalFooter, { paddingBottom: insets.bottom + espacements.md }]}>
                <Pressable
                  style={styles.modalEditBtn}
                  onPress={() => {
                    setShowLinksModal(false);
                    router.push(`/entrepreneur/modifier-projet?id=${id}`);
                  }}
                >
                  <LinearGradient
                    colors={[couleurs.gradientPrimaire[0], couleurs.gradientPrimaire[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalEditBtnGradient}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.modalEditBtnText}>Modifier les liens</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="link-outline" size={48} color="#8B5CF6" />
              </View>
              <Text style={styles.emptyStateText}>Aucun lien</Text>
              <Text style={styles.emptyStateSubtext}>
                Ajoutez des liens vers vos réseaux et ressources
              </Text>
              <Pressable
                style={styles.emptyStateBtn}
                onPress={() => {
                  setShowLinksModal(false);
                  router.push(`/entrepreneur/modifier-projet?id=${id}`);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyStateBtnText}>Ajouter des liens</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  headerContainer: {
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: couleurs.fondSecondaire,
  },
  headerImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  headerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    position: 'absolute',
    bottom: espacements.md,
    left: espacements.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    gap: espacements.xs,
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentInner: {
    paddingTop: espacements.lg,
  },

  // Title section
  titleSection: {
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.lg,
  },
  projetNom: {
    fontSize: 24,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  projetPitch: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    lineHeight: 22,
    marginBottom: espacements.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: espacements.lg,
    marginBottom: espacements.lg,
    gap: espacements.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: espacements.xs,
  },
  statLabel: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  statCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  statCardIndicator: {
    position: 'absolute',
    top: espacements.xs,
    right: espacements.xs,
    opacity: 0.5,
  },

  // Completion
  completionSection: {
    marginHorizontal: espacements.lg,
    marginBottom: espacements.xl,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.lg,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },
  completionPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  completionBarBg: {
    height: 8,
    backgroundColor: couleurs.fond,
    borderRadius: rayons.full,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.full,
  },
  completionHint: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacements.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  actionDesc: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Danger zone
  dangerSection: {
    marginHorizontal: espacements.lg,
    marginBottom: espacements.xl,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.md,
    borderWidth: 1,
    borderColor: '#EF444430',
    borderRadius: rayons.md,
    backgroundColor: '#EF444408',
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
  },
  backBtn: {
    marginTop: espacements.lg,
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal styles - Unified design
  modalContainer: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
    textAlign: 'center',
  },
  modalHeaderRight: {
    width: 40,
    alignItems: 'center',
  },
  modalCount: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: espacements.lg,
  },
  modalFooter: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },

  // List items - unified for followers and links
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  listItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: espacements.md,
  },
  listItemAvatarPlaceholder: {
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacements.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Media grid
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: espacements.md,
    gap: espacements.sm,
  },
  mediaItem: {
    width: (SCREEN_WIDTH - espacements.lg * 2 - espacements.sm * 2) / 3,
    aspectRatio: 1,
    borderRadius: rayons.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: couleurs.fondSecondaire,
  },
  mediaVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal edit button
  modalEditBtn: {
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  modalEditBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.md,
  },
  modalEditBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.xl,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.md,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginTop: espacements.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: espacements.xs,
    lineHeight: 20,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginTop: espacements.xl,
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.full,
  },
  emptyStateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
