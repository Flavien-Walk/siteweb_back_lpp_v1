/**
 * Ecran Facturation LPP+
 * Affiche le statut de l'abonnement, permet de resilier/reactiver.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { espacements, rayons } from '../../src/constantes/theme';
import {
  getLppPlusStatus,
  cancelLppPlus,
  reactivateLppPlus,
  LppPlusSubscription,
  CERTIFICATION_PLAN,
} from '../../src/services/boutique';
import SwipeableScreen from '../../src/composants/SwipeableScreen';

const formatDateFr = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function FacturationScreen() {
  const { couleurs } = useTheme();
  const { utilisateur, refreshUser } = useUser();
  const router = useRouter();
  const styles = createStyles(couleurs);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<LppPlusSubscription | null>(null);

  const chargerStatut = useCallback(async () => {
    setLoading(true);
    const res = await getLppPlusStatus();
    if (res.succes && res.data) {
      setSubscription(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    chargerStatut();
  }, [chargerStatut]);

  const handleResilier = () => {
    Alert.alert(
      'Resilier LPP+',
      'Votre abonnement restera actif jusqu\'a la fin de la periode en cours. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Resilier',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const res = await cancelLppPlus();
            if (res.succes) {
              await chargerStatut();
              refreshUser?.();
            } else {
              Alert.alert('Erreur', res.message || 'Impossible de resilier.');
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleReactiver = async () => {
    setActionLoading(true);
    const res = await reactivateLppPlus();
    if (res.succes) {
      await chargerStatut();
      refreshUser?.();
    } else {
      Alert.alert('Erreur', res.message || 'Impossible de reactiver.');
    }
    setActionLoading(false);
  };

  const isActive = subscription?.isActive ?? false;
  const isCanceled = subscription?.cancelAtPeriodEnd ?? false;

  const screenContent = (
    <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: couleurs.texte }]}>Facturation</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={couleurs.primaire} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.content}>
          {/* Statut card */}
          <View style={[styles.statusCard, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: isActive ? couleurs.succes + '15' : couleurs.texteMuted + '15' },
              ]}>
                <Ionicons
                  name={isActive ? 'checkmark-circle' : 'close-circle-outline'}
                  size={16}
                  color={isActive ? couleurs.succes : couleurs.texteMuted}
                />
                <Text style={[
                  styles.statusText,
                  { color: isActive ? couleurs.succes : couleurs.texteMuted },
                ]}>
                  {isActive ? (isCanceled ? 'Resiliation planifiee' : 'Actif') : 'Inactif'}
                </Text>
              </View>
              <Text style={[styles.planName, { color: couleurs.texte }]}>LPP+</Text>
            </View>

            <Text style={[styles.planPrice, { color: couleurs.texte }]}>
              {CERTIFICATION_PLAN.price.toFixed(2).replace('.', ',')} €
              <Text style={[styles.planInterval, { color: couleurs.texteSecondaire }]}> /mois</Text>
            </Text>

            {isActive && subscription?.currentPeriodEnd && (
              <View style={[styles.dateRow, { backgroundColor: couleurs.fondTertiaire }]}>
                <Ionicons name="calendar-outline" size={14} color={couleurs.texteSecondaire} />
                <Text style={[styles.dateText, { color: couleurs.texteSecondaire }]}>
                  {isCanceled ? 'Actif jusqu\'au ' : 'Prochaine echeance : '}
                  {formatDateFr(subscription.currentPeriodEnd)}
                </Text>
              </View>
            )}

            {subscription?.canceledAt && isCanceled && (
              <Text style={[styles.canceledNote, { color: couleurs.texteMuted }]}>
                Resilie le {formatDateFr(subscription.canceledAt)}
              </Text>
            )}
          </View>

          {/* Avantages */}
          <View style={[styles.benefitsCard, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
            <Text style={[styles.benefitsTitle, { color: couleurs.texte }]}>Avantages inclus</Text>
            {CERTIFICATION_PLAN.benefits.map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={isActive ? couleurs.succes : couleurs.texteMuted}
                />
                <Text style={[
                  styles.benefitText,
                  { color: isActive ? couleurs.texte : couleurs.texteSecondaire },
                ]}>
                  {typeof benefit === 'string' ? benefit : benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          {isActive && (
            <View style={styles.actions}>
              {isCanceled ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: couleurs.primaire }]}
                  onPress={handleReactiver}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Reactiver l'abonnement</Text>
                    </>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.cancelBtn, { borderColor: couleurs.erreur + '40' }]}
                  onPress={handleResilier}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={couleurs.erreur} />
                  ) : (
                    <Text style={[styles.cancelBtnText, { color: couleurs.erreur }]}>
                      Resilier l'abonnement
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {/* Disclaimer */}
          <Text style={[styles.disclaimer, { color: couleurs.texteMuted }]}>
            Aucun paiement n'est preleve pour le moment (simulation).
            {'\n'}L'abonnement se renouvelle automatiquement chaque mois.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );

  return Platform.OS === 'android' ? (
    <SwipeableScreen>{screenContent}</SwipeableScreen>
  ) : screenContent;
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingTop: 36,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: espacements.lg, paddingTop: espacements.md },

  // Statut
  statusCard: {
    borderRadius: rayons.xl,
    padding: 20,
    borderWidth: 1,
    marginBottom: espacements.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  planName: { fontSize: 20, fontWeight: '800' },
  planPrice: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  planInterval: { fontSize: 14, fontWeight: '500' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: rayons.sm,
  },
  dateText: { fontSize: 13, fontWeight: '500' },
  canceledNote: { fontSize: 11, fontWeight: '500', marginTop: 8 },

  // Avantages
  benefitsCard: {
    borderRadius: rayons.xl,
    padding: 20,
    borderWidth: 1,
    marginBottom: espacements.lg,
  },
  benefitsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Actions
  actions: { marginBottom: espacements.lg },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: rayons.md,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: rayons.md,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },

  // Disclaimer
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
