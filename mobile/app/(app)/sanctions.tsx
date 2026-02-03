/**
 * Ecran Mes Sanctions - Historique des sanctions utilisateur
 * Affiche toutes les sanctions (ban, suspend, warn) et leurs levees
 *
 * IMPORTANT: Attend que le token soit pret (tokenReady) avant d'appeler l'API
 * pour eviter les erreurs "Token manquant" apres login/unban
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
import { useUser } from '../../src/contexts/UserContext';
import { getMySanctions, SanctionHistoryItem } from '../../src/services/auth';
import { espacements, rayons, typographie, couleurs as defaultCouleurs } from '../../src/constantes/theme';

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

// Styles statiques
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  backButton: {
    padding: espacements.xs,
    marginRight: espacements.md,
  },
  headerTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.lg,
  },
  emptyTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    marginBottom: espacements.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typographie.tailles.sm,
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
    textAlign: 'center',
    marginBottom: espacements.lg,
  },
  retryButton: {
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    borderRadius: rayons.lg,
  },
  retryButtonText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
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

export default function SanctionsScreen() {
  const { couleurs } = useTheme();
  const colors = couleurs || defaultCouleurs;
  const { tokenReady, userHydrated, isAuthenticated } = useUser();

  const [sanctions, setSanctions] = useState<SanctionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flag: hydratation complete = tokenReady ET userHydrated
  const isHydrated = tokenReady && userHydrated;

  const fetchSanctions = useCallback(async () => {
    console.log('[SanctionsScreen] fetchSanctions - tokenReady:', tokenReady, 'userHydrated:', userHydrated, 'isAuthenticated:', isAuthenticated);

    // IMPORTANT: Ne pas appeler l'API tant que l'hydratation n'est pas complete
    if (!isHydrated) {
      console.log('[SanctionsScreen] Hydratation incomplete, attente...');
      return;
    }

    // Si l'utilisateur n'est pas authentifie apres hydratation, afficher erreur
    if (!isAuthenticated) {
      console.log('[SanctionsScreen] User non authentifie apres hydratation');
      setError('Vous devez etre connecte pour voir vos sanctions.');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('[SanctionsScreen] Appel getMySanctions()...');
      const response = await getMySanctions();

      // NE PLUS REDIRIGER vers login sur AUTH_MISSING_TOKEN
      // C'est une erreur, pas une deconnexion volontaire
      if (response.erreurs?.code === 'AUTH_MISSING_TOKEN') {
        console.warn('[SanctionsScreen] AUTH_MISSING_TOKEN recu - affichage erreur (PAS de redirect)');
        setError('Session non disponible. Reessayez dans quelques instants.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (response.succes && response.data) {
        console.log('[SanctionsScreen] Sanctions recues:', response.data.sanctions?.length || 0);
        setSanctions(response.data.sanctions || []);
      } else {
        console.log('[SanctionsScreen] Echec:', response.message);
        setError(response.message || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[SanctionsScreen] Erreur:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isHydrated, isAuthenticated, tokenReady, userHydrated]);

  // Charger les sanctions quand l'hydratation est complete
  useEffect(() => {
    console.log('[SanctionsScreen] useEffect - isHydrated:', isHydrated);
    if (isHydrated) {
      fetchSanctions();
    }
  }, [isHydrated, fetchSanctions]);

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
  const getTypeColors = (colorType: 'danger' | 'warning' | 'success') => {
    switch (colorType) {
      case 'danger':
        return { main: colors.erreur || defaultCouleurs.danger, light: 'rgba(255, 77, 109, 0.15)' };
      case 'warning':
        return { main: colors.attention || defaultCouleurs.warning, light: 'rgba(255, 189, 89, 0.15)' };
      case 'success':
        return { main: colors.succes || defaultCouleurs.succes, light: 'rgba(0, 214, 143, 0.15)' };
    }
  };

  const renderSanctionCard = (sanction: SanctionHistoryItem, index: number) => {
    const config = sanctionConfig[sanction.type] || sanctionConfig.warn;
    const typeColors = getTypeColors(config.colorType);

    return (
      <View
        key={`${sanction.type}-${sanction.createdAt}-${index}`}
        style={[styles.sanctionCard, { backgroundColor: colors.fondCard, borderColor: colors.bordure }]}
      >
        {/* Header avec icone et type */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeColors.light }]}>
            <Ionicons name={config.icon} size={24} color={typeColors.main} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.sanctionType, { color: typeColors.main }]}>
                {config.label}
              </Text>
              {config.isPositive && (
                <View style={[styles.positiveBadge, { backgroundColor: typeColors.light }]}>
                  <Text style={[styles.positiveBadgeText, { color: typeColors.main }]}>
                    Levee
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sanctionDate, { color: colors.texteSecondaire }]}>
              {formatDate(sanction.createdAt)}
            </Text>
          </View>
        </View>

        {/* Titre de la notification */}
        {sanction.titre && (
          <Text style={[styles.sanctionTitle, { color: colors.texte }]}>
            {sanction.titre}
          </Text>
        )}

        {/* Raison */}
        {sanction.reason && (
          <View style={styles.reasonContainer}>
            <View style={styles.reasonHeader}>
              <Ionicons name="document-text-outline" size={14} color={typeColors.main} />
              <Text style={[styles.reasonLabel, { color: typeColors.main }]}>Motif</Text>
            </View>
            <Text style={[styles.reasonText, { color: colors.texteSecondaire }]}>
              {sanction.reason}
            </Text>
          </View>
        )}

        {/* Date de fin de suspension */}
        {sanction.suspendedUntil && (
          <View style={[styles.suspendedUntilContainer, { backgroundColor: typeColors.light }]}>
            <Ionicons name="hourglass-outline" size={16} color={typeColors.main} />
            <Text style={[styles.suspendedUntilText, { color: colors.texte }]}>
              Jusqu'au {formatDate(sanction.suspendedUntil)}
            </Text>
          </View>
        )}

        {/* Role du staff */}
        {sanction.actorRole && (
          <View style={styles.actorContainer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.texteMuted} />
            <Text style={[styles.actorText, { color: colors.texteMuted }]}>
              Par : {getRoleLabel(sanction.actorRole)}
            </Text>
          </View>
        )}

        {/* Post concerne */}
        {sanction.postSnapshot && (
          <View style={[styles.postContainer, { borderColor: colors.bordure }]}>
            <View style={styles.postHeader}>
              <Ionicons name="image-outline" size={14} color={colors.texteMuted} />
              <Text style={[styles.postLabel, { color: colors.texteMuted }]}>
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
              <Text style={[styles.postContent, { color: colors.texteSecondaire }]} numberOfLines={3}>
                "{sanction.postSnapshot.contenu}"
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Contenu principal - afficher loader si hydratation incomplete OU chargement en cours
  if (!isHydrated || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.fond }]}>
        <LinearGradient
          colors={[colors.fond, colors.fondSecondaire, colors.fond]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.texte} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.texte }]}>Mes sanctions</Text>
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primaire} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.fond }]}>
        <LinearGradient
          colors={[colors.fond, colors.fondSecondaire, colors.fond]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.texte} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.texte }]}>Mes sanctions</Text>
          </View>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.erreur || defaultCouleurs.danger} />
            </View>
            <Text style={[styles.errorText, { color: colors.erreur || defaultCouleurs.danger }]}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: colors.primaire }]} onPress={fetchSanctions}>
              <Text style={[styles.retryButtonText, { color: colors.blanc || '#FFFFFF' }]}>Reessayer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.fond }]}>
      <LinearGradient
        colors={[colors.fond, colors.fondSecondaire, colors.fond]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.texte} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.texte }]}>Mes sanctions</Text>
        </View>

        {sanctions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: 'rgba(0, 214, 143, 0.15)' }]}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.succes || defaultCouleurs.succes} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.texte }]}>Aucune sanction</Text>
            <Text style={[styles.emptyText, { color: colors.texteSecondaire }]}>
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
                tintColor={colors.primaire}
                colors={[colors.primaire]}
              />
            }
          >
            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.fondCard }]}>
              <Ionicons name="information-circle-outline" size={24} color={colors.texteSecondaire} />
              <Text style={[styles.infoText, { color: colors.texteSecondaire }]}>
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
