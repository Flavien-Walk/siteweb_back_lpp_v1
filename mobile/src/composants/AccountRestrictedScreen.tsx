/**
 * Ecran de compte restreint (banni ou suspendu)
 * Affiche un message et empeche l'acces a l'app
 * Charge les details de la sanction (raison, post concerne) depuis l'API
 *
 * IMPORTANT: Deux actions possibles:
 * - "Reessayer": verifie si unban/unsuspend a ete fait (NE supprime PAS le token)
 * - "Se deconnecter": action volontaire qui supprime le token
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AccountRestrictionInfo } from '../services/api';
import { getSanctionInfo, SanctionInfo } from '../services/auth';
import { couleurs, typographie, espacements, rayons } from '../constantes/theme';

// Mapping des rôles vers des labels lisibles
const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur Test',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur', // Legacy
};

interface AccountRestrictedScreenProps {
  restriction: AccountRestrictionInfo;
  /** Reessayer pour verifier si la restriction a ete levee (ne supprime pas le token) */
  onRetry: () => Promise<boolean>;
  /** Se deconnecter volontairement (supprime le token) */
  onLogout: () => Promise<void>;
}

const AccountRestrictedScreen: React.FC<AccountRestrictedScreenProps> = ({
  restriction,
  onRetry,
  onLogout,
}) => {
  const [sanctionDetails, setSanctionDetails] = useState<SanctionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const isBanned = restriction.type === 'ACCOUNT_BANNED';

  // Couleurs selon le type de sanction
  const statusColor = isBanned ? couleurs.danger : couleurs.warning;
  const statusColorLight = isBanned ? couleurs.dangerLight : couleurs.accentLight;

  // Charger les details de la sanction au montage
  useEffect(() => {
    const fetchSanctionDetails = async () => {
      try {
        const response = await getSanctionInfo();
        if (response.succes && response.data) {
          setSanctionDetails(response.data);
        }
      } catch (error) {
        console.log('[AccountRestrictedScreen] Erreur chargement details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSanctionDetails();
  }, []);

  // Formater une date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
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

  // Formater la date de fin de suspension
  const formatSuspendedUntil = (dateStr?: string): string => {
    if (!dateStr) return '';
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

  // Obtenir le label lisible du rôle
  const getRoleLabel = (role?: string): string => {
    if (!role) return '';
    return roleLabels[role] || role;
  };

  // Utiliser les données des details si disponible, sinon celle de la restriction
  const reason = sanctionDetails?.reason || restriction.reason;
  const suspendedUntil = sanctionDetails?.suspendedUntil || restriction.suspendedUntil;
  const postSnapshot = sanctionDetails?.postSnapshot;
  const sanctionDate = sanctionDetails?.notificationDate || sanctionDetails?.bannedAt;
  const actorRole = sanctionDetails?.actorRole;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[couleurs.fond, couleurs.fondElevated, couleurs.fond]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header avec gradient */}
            <LinearGradient
              colors={[statusColorLight, 'transparent']}
              style={styles.headerGradient}
            />

            {/* Icone */}
            <View style={[styles.iconContainer, { backgroundColor: statusColorLight }]}>
              <Ionicons
                name={isBanned ? 'ban' : 'time-outline'}
                size={56}
                color={statusColor}
              />
            </View>

            {/* Badge status */}
            <View style={[styles.statusBadge, { backgroundColor: statusColorLight }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {isBanned ? 'BANNI' : 'SUSPENDU'}
              </Text>
            </View>

            {/* Titre */}
            <Text style={styles.title}>
              {isBanned ? 'Compte suspendu' : 'Acces temporairement restreint'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {restriction.message}
            </Text>

            {/* Loading indicator */}
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={couleurs.texteSecondaire}
                style={styles.loader}
              />
            )}

            {/* Card principale avec les details */}
            {!isLoading && (reason || sanctionDate || actorRole || postSnapshot) && (
              <View style={styles.detailsCard}>
                {/* Infos de la sanction (date et role) */}
                {(sanctionDate || actorRole) && (
                  <View style={styles.metaSection}>
                    {sanctionDate && (
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={couleurs.texteMuted}
                        />
                        <Text style={styles.metaText}>
                          {formatDate(sanctionDate)}
                        </Text>
                      </View>
                    )}
                    {actorRole && (
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color={couleurs.texteMuted}
                        />
                        <Text style={styles.metaText}>
                          Decision par : {getRoleLabel(actorRole)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Separateur */}
                {(sanctionDate || actorRole) && reason && (
                  <View style={styles.separator} />
                )}

                {/* Raison de la sanction */}
                {reason && (
                  <View style={styles.reasonSection}>
                    <View style={styles.reasonHeader}>
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color={statusColor}
                      />
                      <Text style={[styles.reasonLabel, { color: statusColor }]}>
                        Motif de la sanction
                      </Text>
                    </View>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                )}

                {/* Post concerne (si disponible) */}
                {postSnapshot && (
                  <>
                    <View style={styles.separator} />
                    <View style={styles.postSection}>
                      <View style={styles.postHeader}>
                        <Ionicons
                          name="image-outline"
                          size={16}
                          color={couleurs.texteMuted}
                        />
                        <Text style={styles.postLabel}>Contenu concerne</Text>
                      </View>
                      {postSnapshot.mediaUrl && (
                        <Image
                          source={{ uri: postSnapshot.mediaUrl }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      )}
                      {postSnapshot.contenu && (
                        <Text style={styles.postContent} numberOfLines={3}>
                          "{postSnapshot.contenu}"
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Date de fin de suspension */}
            {!isBanned && suspendedUntil && (
              <View style={styles.suspensionCard}>
                <Ionicons
                  name="hourglass-outline"
                  size={20}
                  color={couleurs.warning}
                />
                <View style={styles.suspensionTextContainer}>
                  <Text style={styles.suspensionLabel}>Fin de suspension</Text>
                  <Text style={styles.suspensionDate}>
                    {formatSuspendedUntil(suspendedUntil)}
                  </Text>
                </View>
              </View>
            )}

            {/* Info contact */}
            <Text style={styles.contactInfo}>
              Si vous pensez qu'il s'agit d'une erreur, contactez le support.
            </Text>

            {/* Message de retry */}
            {retryMessage && (
              <Text style={styles.retryMessage}>{retryMessage}</Text>
            )}

            {/* Bouton Reessayer - verifie si unban/unsuspend a ete fait */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.retryButton,
                pressed && styles.buttonPressed,
                isRetrying && styles.buttonDisabled,
              ]}
              onPress={async () => {
                if (isRetrying) return;
                setIsRetrying(true);
                setRetryMessage(null);
                console.log('[RESTRICTION_REFRESH] start');
                try {
                  const success = await onRetry();
                  console.log('[RESTRICTION_REFRESH] onRetry result:', success);
                  if (success) {
                    // IMPORTANT: Navigation explicite vers accueil apres unsuspend/unban
                    // Sans ca, l'app peut revenir sur index.tsx qui redirige vers login
                    console.log('[NAV] redirect to (app)/accueil after restriction lifted');
                    router.replace('/(app)/accueil');
                  } else {
                    setRetryMessage('Votre compte est toujours restreint.');
                  }
                } catch (err) {
                  console.log('[RESTRICTION_REFRESH] error:', err);
                  setRetryMessage('Erreur de connexion. Reessayez.');
                } finally {
                  setIsRetrying(false);
                }
              }}
              disabled={isRetrying}
            >
              <View style={styles.retryButtonInner}>
                {isRetrying ? (
                  <ActivityIndicator size="small" color={couleurs.primaire} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={20} color={couleurs.primaire} />
                    <Text style={styles.retryButtonText}>Actualiser mon statut</Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Bouton Se deconnecter - action volontaire */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={onLogout}
            >
              <LinearGradient
                colors={couleurs.gradientPrimaire}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="log-out-outline" size={20} color={couleurs.blanc} />
                <Text style={styles.buttonText}>Se deconnecter</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.xxl,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    opacity: 0.5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    marginBottom: espacements.lg,
    gap: espacements.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.bold,
    letterSpacing: 1,
  },
  title: {
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: espacements.sm,
  },
  message: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: espacements.xl,
  },
  loader: {
    marginBottom: espacements.lg,
  },
  detailsCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  metaSection: {
    gap: espacements.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  metaText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteMuted,
  },
  separator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: espacements.md,
  },
  reasonSection: {
    gap: espacements.sm,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  reasonLabel: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
  reasonText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    lineHeight: 20,
  },
  postSection: {
    gap: espacements.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  postLabel: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
    color: couleurs.texteMuted,
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: rayons.md,
  },
  postContent: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  suspensionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.accentLight,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.lg,
    gap: espacements.md,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 189, 89, 0.3)',
  },
  suspensionTextContainer: {
    flex: 1,
  },
  suspensionLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginBottom: 2,
  },
  suspensionDate: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    fontWeight: typographie.poids.medium,
  },
  contactInfo: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    textAlign: 'center',
    marginBottom: espacements.lg,
  },
  retryMessage: {
    fontSize: typographie.tailles.sm,
    color: couleurs.warning,
    textAlign: 'center',
    marginBottom: espacements.md,
  },
  button: {
    width: '100%',
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  retryButton: {
    backgroundColor: couleurs.fondCard,
    borderWidth: 1,
    borderColor: couleurs.primaire,
    marginBottom: espacements.md,
  },
  retryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.xl,
    gap: espacements.sm,
    minHeight: 52,
  },
  retryButtonText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.xl,
    gap: espacements.sm,
  },
  buttonText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
});

export default AccountRestrictedScreen;
