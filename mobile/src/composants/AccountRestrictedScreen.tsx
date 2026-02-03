/**
 * Ecran de compte restreint (banni ou suspendu)
 * Affiche un message et empeche l'acces a l'app
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountRestrictionInfo } from '../services/api';
import { couleurs, typographie, espacements } from '../constantes/theme';

interface AccountRestrictedScreenProps {
  restriction: AccountRestrictionInfo;
  onDismiss: () => void;
}

const AccountRestrictedScreen: React.FC<AccountRestrictedScreenProps> = ({
  restriction,
  onDismiss,
}) => {
  const isBanned = restriction.type === 'ACCOUNT_BANNED';

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

  return (
    <LinearGradient
      colors={[couleurs.fond, '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
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

          {/* Raison du ban (si fournie) */}
          {isBanned && restriction.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Raison :</Text>
              <Text style={styles.reasonText}>{restriction.reason}</Text>
            </View>
          )}

          {/* Date de fin de suspension */}
          {!isBanned && restriction.suspendedUntil && (
            <View style={styles.suspensionContainer}>
              <Ionicons name="calendar-outline" size={20} color={couleurs.texteSecondaire} />
              <Text style={styles.suspensionText}>
                Suspension levee le {formatSuspendedUntil(restriction.suspendedUntil)}
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
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
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
  suspensionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: espacements.md,
    marginBottom: espacements.lg,
    gap: espacements.sm,
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
