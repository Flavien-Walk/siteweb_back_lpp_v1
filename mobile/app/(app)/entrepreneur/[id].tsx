/**
 * Ecran de detail/edition d'un projet entrepreneur
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import {
  Projet,
  getProjet,
  publierProjet,
  depublierProjet,
  supprimerProjet,
} from '../../../src/services/projets';

export default function ProjetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { couleurs } = useTheme();
  const styles = createStyles(couleurs);

  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
      'Voulez-vous vraiment publier ce projet ? Il sera visible par tous les utilisateurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await publierProjet(id);
              if (response.succes) {
                Alert.alert('Succes', 'Projet publie !');
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
      'Depublier le projet',
      'Le projet repassera en brouillon et ne sera plus visible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Depublier',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await depublierProjet(id);
              if (response.succes) {
                Alert.alert('Succes', 'Projet depublie');
                chargerProjet();
              } else {
                Alert.alert('Erreur', response.message || 'Impossible de depublier');
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
      'Cette action est irreversible. Voulez-vous vraiment supprimer ce projet ?',
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
                Alert.alert('Succes', 'Projet supprime', [
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </SafeAreaView>
    );
  }

  if (!projet) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={64} color={couleurs.texteSecondaire} />
        <Text style={styles.errorText}>Projet non trouve</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isPublished = projet.statut === 'published';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{projet.nom}</Text>
          <View style={[styles.statusBadge, isPublished ? styles.statusPublished : styles.statusDraft]}>
            <Text style={styles.statusText}>
              {isPublished ? 'Publie' : 'Brouillon'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={couleurs.texte} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cover image */}
        {projet.image ? (
          <Image source={{ uri: projet.image }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={48} color={couleurs.texteSecondaire} />
            <Text style={styles.coverPlaceholderText}>Pas d'image</Text>
          </View>
        )}

        {/* Info principale */}
        <View style={styles.infoSection}>
          <Text style={styles.projetNom}>{projet.nom}</Text>
          <Text style={styles.projetPitch}>{projet.pitch}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.metaText}>{projet.localisation?.ville || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.metaText}>{projet.categorie || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="trending-up-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.metaText}>{projet.maturite || 'Idee'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{projet.nbFollowers || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{projet.progression || 0}%</Text>
            <Text style={styles.statLabel}>Progression</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{projet.galerie?.length || 0}</Text>
            <Text style={styles.statLabel}>Medias</Text>
          </View>
        </View>

        {/* Description */}
        {projet.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{projet.description}</Text>
          </View>
        )}

        {/* Proposition de valeur */}
        {(projet.probleme || projet.solution) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proposition de valeur</Text>
            {projet.probleme && (
              <View style={styles.propositionItem}>
                <Text style={styles.propositionLabel}>Probleme</Text>
                <Text style={styles.propositionText}>{projet.probleme}</Text>
              </View>
            )}
            {projet.solution && (
              <View style={styles.propositionItem}>
                <Text style={styles.propositionLabel}>Solution</Text>
                <Text style={styles.propositionText}>{projet.solution}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnEdit]}
            onPress={() => Alert.alert('Edition', 'Fonctionnalite en cours de developpement')}
          >
            <Ionicons name="create-outline" size={20} color={couleurs.primaire} />
            <Text style={[styles.actionBtnText, { color: couleurs.primaire }]}>Modifier</Text>
          </Pressable>

          {isPublished ? (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnWarning]}
              onPress={handleUnpublish}
              disabled={actionLoading}
            >
              <Ionicons name="eye-off-outline" size={20} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Depublier</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnSuccess]}
              onPress={handlePublish}
              disabled={actionLoading}
            >
              <Ionicons name="rocket-outline" size={20} color="#10B981" />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Publier</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Supprimer</Text>
          </Pressable>
        </View>
      </ScrollView>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      )}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: couleurs.texte,
  },
  statusBadge: {
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    borderRadius: rayons.full,
    marginTop: 4,
  },
  statusPublished: {
    backgroundColor: '#10B98120',
  },
  statusDraft: {
    backgroundColor: '#F59E0B20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.texte,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 40,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: couleurs.fondSecondaire,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.lg,
  },
  projetNom: {
    fontSize: 24,
    fontWeight: '700',
    color: couleurs.texte,
  },
  projetPitch: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginTop: espacements.xs,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: espacements.md,
    gap: espacements.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: espacements.lg,
    gap: espacements.md,
    marginBottom: espacements.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: espacements.lg,
    marginBottom: espacements.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  descriptionText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 22,
  },
  propositionItem: {
    marginBottom: espacements.md,
  },
  propositionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.primaire,
    marginBottom: 4,
  },
  propositionText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
  },
  actionsSection: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.lg,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    gap: espacements.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
  },
  actionBtnEdit: {
    backgroundColor: couleurs.primaire + '15',
  },
  actionBtnSuccess: {
    backgroundColor: '#10B98115',
  },
  actionBtnWarning: {
    backgroundColor: '#F59E0B15',
  },
  actionBtnDanger: {
    backgroundColor: '#EF444415',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
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
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
