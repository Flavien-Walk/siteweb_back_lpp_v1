/**
 * Ecran de compte restreint (banni ou suspendu)
 * Affiche un message et empeche l'acces a l'app
 * Charge les details de la sanction (raison, post concerne) depuis l'API
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountRestrictionInfo } from '../services/api';
import { getSanctionInfo, SanctionInfo } from '../services/auth';
import { couleurs, typographie, espacements } from '../constantes/theme';

interface AccountRestrictedScreenProps {
  restriction: AccountRestrictionInfo;
  onDismiss: () => void;
}

const AccountRestrictedScreen: React.FC<AccountRestrictedScreenProps> = ({
  restriction,
  onDismiss,
}) => {
  const [sanctionDetails, setSanctionDetails] = useState<SanctionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isBanned = restriction.type === 'ACCOUNT_BANNED';

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

  // Utiliser la raison des details si disponible, sinon celle de la restriction
  const reason = sanctionDetails?.reason || restriction.reason;
  const suspendedUntil = sanctionDetails?.suspendedUntil || restriction.suspendedUntil;
  const postSnapshot = sanctionDetails?.postSnapshot;

  return (
    <LinearGradient
      colors={[couleurs.fond, '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Icone */}
            <View style={[styles.iconContainer, isBanned ? styles.bannedIcon : styles.suspendedIcon]}>
              <Ionicons
                name={isBanned ? 'ban' : 'time'}
                size={64}
                color={isBanned ? couleurs.erreur : couleurs.alerte}
              />
            </View>

            {/* Titre */}
            <Text style={styles.title}>
              {isBanned ? 'Compte suspendu' : 'Compte temporairement suspendu'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {restriction.message}
            </Text>

            {/* Loading indicator */}
            {isLoading && (
              <ActivityIndicator size="small" color={couleurs.texteSecondaire} style={styles.loader} />
            )}

            {/* Raison de la sanction (si fournie) */}
            {reason && (
              <View style={[styles.reasonContainer, !isBanned && styles.suspendedReasonContainer]}>
                <Text style={[styles.reasonLabel, !isBanned && styles.suspendedReasonLabel]}>Raison :</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            )}

            {/* Post concerne (si disponible) */}
            {postSnapshot && (
              <View style={styles.postContainer}>
                <Text style={styles.postLabel}>Contenu concerne :</Text>
                {postSnapshot.mediaUrl && (
                  <Image
                    source={{ uri: postSnapshot.mediaUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
                {postSnapshot.contenu && (
                  <Text style={styles.postContent} numberOfLines={3}>
                    {postSnapshot.contenu}
                  </Text>
                )}
              </View>
            )}

            {/* Date de fin de suspension */}
            {!isBanned && suspendedUntil && (
              <View style={styles.suspensionContainer}>
                <Ionicons name="calendar-outline" size={20} color={couleurs.texteSecondaire} />
                <Text style={styles.suspensionText}>
                  Suspension levee le {formatSuspendedUntil(suspendedUntil)}
                </Text>
              </View>
            )}

            {/* Info contact */}
            <Text style={styles.contactInfo}>
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.
            </Text>

            {/* Bouton retour connexion */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDismiss}
            >
              <Text style={styles.buttonText}>Retour a la connexion</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: espacements.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.xl,
  },
  bannedIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  suspendedIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
    textAlign: 'center',
    marginBottom: espacements.md,
  },
  message: {
    fontSize: 16,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: espacements.lg,
  },
  loader: {
    marginBottom: espacements.lg,
  },
  reasonContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: espacements.md,
    marginBottom: espacements.lg,
    width: '100%',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: typographie.poids.semiBold,
    color: couleurs.erreur,
    marginBottom: espacements.xs,
  },
  reasonText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    lineHeight: 20,
  },
  suspendedReasonContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  suspendedReasonLabel: {
    color: couleurs.alerte,
  },
  postContainer: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    borderRadius: 12,
    padding: espacements.md,
    marginBottom: espacements.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
  },
  postLabel: {
    fontSize: 12,
    fontWeight: typographie.poids.semiBold,
    color: couleurs.texteDesactive,
    marginBottom: espacements.sm,
    textTransform: 'uppercase',
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: espacements.sm,
  },
  postContent: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  suspensionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: espacements.md,
    marginBottom: espacements.lg,
    gap: espacements.sm,
    width: '100%',
  },
  suspensionText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    flex: 1,
  },
  contactInfo: {
    fontSize: 13,
    color: couleurs.texteDesactive,
    textAlign: 'center',
    marginBottom: espacements.xl,
  },
  button: {
    backgroundColor: couleurs.primaire,
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.xl,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: typographie.poids.semiBold,
    color: couleurs.blanc,
    textAlign: 'center',
  },
});

export default AccountRestrictedScreen;
