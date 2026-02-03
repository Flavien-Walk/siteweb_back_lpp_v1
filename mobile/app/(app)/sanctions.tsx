/**
 * Ecran Mes Sanctions - Historique des sanctions utilisateur
 * Affiche toutes les sanctions (ban, suspend, warn) et leurs levees
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getMySanctions, SanctionHistoryItem } from '../../src/services/auth';
import { espacements, rayons, typographie } from '../../src/constantes/theme';

// Mapping des roles vers des labels lisibles
const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur Test',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur',
};

// Configuration des types de sanctions
const sanctionConfig: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colorType: 'danger' | 'warning' | 'success';
  isPositive: boolean;
}> = {
  ban: {
    icon: 'ban',
    label: 'Bannissement',
    colorType: 'danger',
    isPositive: false,
  },
  suspend: {
    icon: 'time-outline',
    label: 'Suspension',
    colorType: 'warning',
    isPositive: false,
  },
  warn: {
    icon: 'warning-outline',
    label: 'Avertissement',
    colorType: 'warning',
    isPositive: false,
  },
  unban: {
    icon: 'checkmark-circle-outline',
    label: 'Levee de ban',
    colorType: 'success',
    isPositive: true,
  },
  unsuspend: {
    icon: 'checkmark-circle-outline',
    label: 'Levee de suspension',
    colorType: 'success',
    isPositive: true,
  },
  unwarn: {
    icon: 'checkmark-circle-outline',
    label: 'Levee d\'avertissement',
    colorType: 'success',
    isPositive: true,
  },
};

export default function SanctionsScreen() {
  const { couleurs } = useTheme();
  const [sanctions, setSanctions] = useState<SanctionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSanctions = useCallback(async () => {
    try {
      setError(null);
      const response = await getMySanctions();
      if (response.succes && response.data) {
        setSanctions(response.data.sanctions);
      } else {
        setError(response.erreur || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[SanctionsScreen] Erreur:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSanctions();
  }, [fetchSanctions]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSanctions();
  }, [fetchSanctions]);

  // Formater une date
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Obtenir le label lisible du role
  const getRoleLabel = (role?: string): string => {
    if (!role) return '';
    return roleLabels[role] || role;
  };

  // Obtenir les couleurs selon le type
  const getColors = (colorType: 'danger' | 'warning' | 'success') => {
    switch (colorType) {
      case 'danger':
        return { main: couleurs.erreur, light: 'rgba(255, 77, 109, 0.15)' };
      case 'warning':
        return { main: couleurs.warning || '#FFBD59', light: 'rgba(255, 189, 89, 0.15)' };
      case 'success':
        return { main: couleurs.succes, light: 'rgba(0, 214, 143, 0.15)' };
    }
  };

  const renderSanctionCard = (sanction: SanctionHistoryItem, index: number) => {
    const config = sanctionConfig[sanction.type] || sanctionConfig.warn;
    const colors = getColors(config.colorType);

    return (
      <View
        key={`${sanction.type}-${sanction.createdAt}-${index}`}
        style={[styles.sanctionCard, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}
      >
        {/* Header avec icone et type */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.light }]}>
            <Ionicons name={config.icon} size={24} color={colors.main} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.sanctionType, { color: colors.main }]}>
                {config.label}
              </Text>
              {config.isPositive && (
                <View style={[styles.positiveBadge, { backgroundColor: colors.light }]}>
                  <Text style={[styles.positiveBadgeText, { color: colors.main }]}>
                    Levee
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sanctionDate, { color: couleurs.texteSecondaire }]}>
              {formatDate(sanction.createdAt)}
            </Text>
          </View>
        </View>

        {/* Titre de la notification */}
        {sanction.titre && (
          <Text style={[styles.sanctionTitle, { color: couleurs.texte }]}>
            {sanction.titre}
          </Text>
        )}

        {/* Raison */}
        {sanction.reason && (
          <View style={styles.reasonContainer}>
            <View style={styles.reasonHeader}>
              <Ionicons name="document-text-outline" size={14} color={colors.main} />
              <Text style={[styles.reasonLabel, { color: colors.main }]}>Motif</Text>
            </View>
            <Text style={[styles.reasonText, { color: couleurs.texteSecondaire }]}>
              {sanction.reason}
            </Text>
          </View>
        )}

        {/* Date de fin de suspension */}
        {sanction.suspendedUntil && (
          <View style={[styles.suspendedUntilContainer, { backgroundColor: colors.light }]}>
            <Ionicons name="hourglass-outline" size={16} color={colors.main} />
            <Text style={[styles.suspendedUntilText, { color: couleurs.texte }]}>
              Jusqu'au {formatDate(sanction.suspendedUntil)}
            </Text>
          </View>
        )}

        {/* Role du staff */}
        {sanction.actorRole && (
          <View style={styles.actorContainer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={couleurs.texteMuted} />
            <Text style={[styles.actorText, { color: couleurs.texteMuted }]}>
              Par : {getRoleLabel(sanction.actorRole)}
            </Text>
          </View>
        )}

        {/* Post concerne */}
        {sanction.postSnapshot && (
          <View style={[styles.postContainer, { borderColor: couleurs.bordure }]}>
            <View style={styles.postHeader}>
              <Ionicons name="image-outline" size={14} color={couleurs.texteMuted} />
              <Text style={[styles.postLabel, { color: couleurs.texteMuted }]}>
                Contenu concerne
              </Text>
            </View>
            {sanction.postSnapshot.mediaUrl && (
              <Image
                source={{ uri: sanction.postSnapshot.mediaUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}
            {sanction.postSnapshot.contenu && (
              <Text style={[styles.postContent, { color: couleurs.texteSecondaire }]} numberOfLines={3}>
                "{sanction.postSnapshot.contenu}"
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: espacements.lg,
      paddingVertical: espacements.md,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    backButton: {
      padding: espacements.xs,
      marginRight: espacements.md,
    },
    headerTitle: {
      fontSize: typographie.tailles.lg,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
      flex: 1,
    },
    scrollContent: {
      padding: espacements.lg,
      paddingBottom: espacements.xxxl,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: espacements.xl,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: couleurs.succesLight || 'rgba(0, 214, 143, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    emptyTitle: {
      fontSize: typographie.tailles.lg,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
      marginBottom: espacements.sm,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: espacements.xl,
    },
    errorIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 77, 109, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    errorText: {
      fontSize: typographie.tailles.base,
      color: couleurs.erreur,
      textAlign: 'center',
      marginBottom: espacements.lg,
    },
    retryButton: {
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      borderRadius: rayons.lg,
      backgroundColor: couleurs.primaire,
    },
    retryButtonText: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.semibold,
      color: couleurs.blanc,
    },
    // Sanction card styles
    sanctionCard: {
      borderRadius: rayons.lg,
      padding: espacements.lg,
      marginBottom: espacements.md,
      borderWidth: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: espacements.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    headerText: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    sanctionType: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
    },
    positiveBadge: {
      paddingHorizontal: espacements.sm,
      paddingVertical: 2,
      borderRadius: rayons.full,
    },
    positiveBadgeText: {
      fontSize: typographie.tailles.xs,
      fontWeight: typographie.poids.medium,
    },
    sanctionDate: {
      fontSize: typographie.tailles.xs,
      marginTop: 2,
    },
    sanctionTitle: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.medium,
      marginBottom: espacements.sm,
    },
    reasonContainer: {
      marginTop: espacements.sm,
      gap: espacements.xs,
    },
    reasonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
    },
    reasonLabel: {
      fontSize: typographie.tailles.xs,
      fontWeight: typographie.poids.semibold,
    },
    reasonText: {
      fontSize: typographie.tailles.sm,
      lineHeight: 20,
    },
    suspendedUntilContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.md,
      marginTop: espacements.md,
    },
    suspendedUntilText: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.medium,
    },
    actorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginTop: espacements.md,
    },
    actorText: {
      fontSize: typographie.tailles.xs,
    },
    postContainer: {
      marginTop: espacements.md,
      paddingTop: espacements.md,
      borderTopWidth: 1,
      gap: espacements.sm,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
    },
    postLabel: {
      fontSize: typographie.tailles.xs,
      fontWeight: typographie.poids.medium,
    },
    postImage: {
      width: '100%',
      height: 120,
      borderRadius: rayons.md,
    },
    postContent: {
      fontSize: typographie.tailles.sm,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      padding: espacements.lg,
      borderRadius: rayons.lg,
      marginBottom: espacements.lg,
    },
    infoText: {
      flex: 1,
      fontSize: typographie.tailles.sm,
      lineHeight: 20,
    },
  });

  // Contenu principal
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[couleurs.fond, couleurs.fondSecondaire || couleurs.fondElevated, couleurs.fond]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.headerTitle}>Mes sanctions</Text>
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={couleurs.primaire} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[couleurs.fond, couleurs.fondSecondaire || couleurs.fondElevated, couleurs.fond]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Text style={styles.headerTitle}>Mes sanctions</Text>
          </View>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={40} color={couleurs.erreur} />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchSanctions}>
              <Text style={styles.retryButtonText}>Reessayer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[couleurs.fond, couleurs.fondSecondaire || couleurs.fondElevated, couleurs.fond]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={styles.headerTitle}>Mes sanctions</Text>
        </View>

        {sanctions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={40} color={couleurs.succes} />
            </View>
            <Text style={styles.emptyTitle}>Aucune sanction</Text>
            <Text style={styles.emptyText}>
              Vous n'avez recu aucune sanction. Continuez a respecter les regles de la communaute !
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={couleurs.primaire}
                colors={[couleurs.primaire]}
              />
            }
          >
            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
              <Ionicons name="information-circle-outline" size={24} color={couleurs.texteSecondaire} />
              <Text style={[styles.infoText, { color: couleurs.texteSecondaire }]}>
                Historique complet de vos sanctions et de leurs levees. Les sanctions les plus recentes apparaissent en premier.
              </Text>
            </View>

            {/* Liste des sanctions */}
            {sanctions.map((sanction, index) => renderSanctionCard(sanction, index))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
