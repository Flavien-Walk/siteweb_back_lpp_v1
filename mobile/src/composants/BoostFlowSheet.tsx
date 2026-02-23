/**
 * BoostFlowSheet — Bottom sheet multi-etapes pour la mise en avant
 * Flow : Intensite → Recapitulatif → Confirmation
 *
 * Etape 1 : Choix de l'intensite (Decouverte / Croissance / Impact)
 * Etape 2 : Recapitulatif + prix + reductions + CTA
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import ShopBottomSheet from './ShopBottomSheet';
import type { BoostGoal, BoostIntensity, PriceBreakdown } from '../services/boutique';
import { formatPrice, calculatePrice, purchaseBoost } from '../services/boutique';

interface BoostFlowSheetProps {
  visible: boolean;
  goal: BoostGoal | null;
  isFirstBoost: boolean;
  isLppPlus: boolean;
  onClose: () => void;
  couleurs: ThemeCouleurs;
}

type FlowStep = 'intensity' | 'recap' | 'result';

export default function BoostFlowSheet({
  visible,
  goal,
  isFirstBoost,
  isLppPlus,
  onClose,
  couleurs,
}: BoostFlowSheetProps) {
  const s = createStyles(couleurs);
  const [step, setStep] = useState<FlowStep>('intensity');
  const [selectedIntensity, setSelectedIntensity] = useState<BoostIntensity | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const priceBreakdown: PriceBreakdown | null = useMemo(() => {
    if (!selectedIntensity) return null;
    return calculatePrice(selectedIntensity.prix, isFirstBoost, isLppPlus);
  }, [selectedIntensity, isFirstBoost, isLppPlus]);

  const handleSelectIntensity = useCallback((intensity: BoostIntensity) => {
    setSelectedIntensity(intensity);
    setStep('recap');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'recap') {
      setStep('intensity');
    }
  }, [step]);

  const handleConfirm = useCallback(async () => {
    if (!selectedIntensity) return;
    setPurchasing(true);
    const result = await purchaseBoost(selectedIntensity.id);
    setPurchasing(false);
    setResultMessage(result.message || 'Bientot disponible.');
    setStep('result');
  }, [selectedIntensity]);

  const handleClose = useCallback(() => {
    setStep('intensity');
    setSelectedIntensity(null);
    setResultMessage(null);
    setPurchasing(false);
    onClose();
  }, [onClose]);

  if (!goal) return null;

  return (
    <ShopBottomSheet visible={visible} onClose={handleClose}>
      <View style={s.body}>
        {/* Header commun */}
        <View style={s.header}>
          {step === 'recap' && (
            <Pressable onPress={handleBack} style={s.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color={couleurs.texte} />
            </Pressable>
          )}
          <View style={[s.goalIcon, { backgroundColor: `${goal.color}15` }]}>
            <Ionicons name={goal.icon as any} size={22} color={goal.color} />
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>{goal.titre}</Text>
            <Text style={s.headerSubtitle}>
              {step === 'intensity' && 'Choisissez votre visibilite'}
              {step === 'recap' && 'Recapitulatif'}
              {step === 'result' && ''}
            </Text>
          </View>
        </View>

        {/* Step progress */}
        {step !== 'result' && (
          <View style={s.progress}>
            <View style={[s.progressDot, step === 'intensity' && { backgroundColor: goal.color }]} />
            <View style={[s.progressLine, step === 'recap' && { backgroundColor: goal.color }]} />
            <View style={[s.progressDot, step === 'recap' && { backgroundColor: goal.color }]} />
          </View>
        )}

        {/* === STEP: INTENSITY === */}
        {step === 'intensity' && (
          <View style={s.intensityList}>
            {goal.intensities.map(intensity => (
              <Pressable
                key={intensity.id}
                style={({ pressed }) => [
                  s.intensityCard,
                  intensity.recommended && [s.intensityRecommended, { borderColor: `${goal.color}40` }],
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => handleSelectIntensity(intensity)}
              >
                {intensity.recommended && (
                  <View style={[s.recommendedBadge, { backgroundColor: goal.color }]}>
                    <Text style={s.recommendedText}>Recommande</Text>
                  </View>
                )}
                <View style={s.intensityRow}>
                  <View style={s.intensityInfo}>
                    <Text style={s.intensityName}>{intensity.name}</Text>
                    <Text style={s.intensityLabel}>{intensity.label}</Text>
                    <Text style={s.intensityDuree}>{intensity.duree}</Text>
                  </View>
                  <View style={s.intensityPriceBlock}>
                    {isFirstBoost && (
                      <Text style={s.intensityPrixBarre}>
                        {formatPrice(intensity.prix)}
                      </Text>
                    )}
                    <Text style={[s.intensityPrix, { color: goal.color }]}>
                      {formatPrice(
                        isFirstBoost
                          ? Math.round(intensity.prix * 0.5 * 100) / 100
                          : intensity.prix
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={s.intensityEstimate}>{intensity.estimateLabel}</Text>
              </Pressable>
            ))}

            {isFirstBoost && (
              <View style={s.welcomeBanner}>
                <Ionicons name="gift-outline" size={14} color={goal.color} />
                <Text style={[s.welcomeText, { color: goal.color }]}>
                  -50% sur votre premiere mise en avant
                </Text>
              </View>
            )}

            {!isLppPlus && (
              <Text style={s.lppHint}>
                Avec LPP+, beneficiez de -10% supplementaires sur toutes les mises en avant.
              </Text>
            )}
          </View>
        )}

        {/* === STEP: RECAP === */}
        {step === 'recap' && selectedIntensity && priceBreakdown && (
          <View style={s.recapContainer}>
            {/* Resume */}
            <View style={s.recapSection}>
              <View style={s.recapRow}>
                <Text style={s.recapLabel}>Objectif</Text>
                <Text style={s.recapValue}>{goal.titre}</Text>
              </View>
              <View style={s.recapRow}>
                <Text style={s.recapLabel}>Intensite</Text>
                <Text style={s.recapValue}>{selectedIntensity.name} ({selectedIntensity.duree})</Text>
              </View>
            </View>

            {/* Prix */}
            <View style={s.priceSection}>
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>Prix de base</Text>
                <Text style={s.priceValue}>{formatPrice(priceBreakdown.base)}</Text>
              </View>
              {priceBreakdown.hasWelcome && (
                <View style={s.priceRow}>
                  <View style={s.discountRow}>
                    <Ionicons name="gift-outline" size={13} color="#10B981" />
                    <Text style={s.discountLabel}>Offre bienvenue -50%</Text>
                  </View>
                  <Text style={s.discountValue}>-{formatPrice(priceBreakdown.welcomeDiscount)}</Text>
                </View>
              )}
              {priceBreakdown.hasLppPlus && (
                <View style={s.priceRow}>
                  <View style={s.discountRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#7C5CFF" />
                    <Text style={s.discountLabel}>Avantage LPP+</Text>
                  </View>
                  <Text style={s.discountValue}>-{formatPrice(priceBreakdown.lppPlusDiscount)}</Text>
                </View>
              )}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={[s.totalValue, { color: goal.color }]}>{formatPrice(priceBreakdown.total)}</Text>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={s.disclaimer}>
              <Text style={s.disclaimerText}>
                Sans engagement. N'affecte pas l'algorithme.
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: goal.color },
                pressed && { opacity: 0.85 },
                purchasing && { opacity: 0.6 },
              ]}
              onPress={handleConfirm}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.ctaText}>Confirmer — {formatPrice(priceBreakdown.total)}</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* === STEP: RESULT === */}
        {step === 'result' && (
          <View style={s.resultContainer}>
            <View style={[s.resultIcon, { backgroundColor: `${goal.color}15` }]}>
              <Ionicons name="time-outline" size={32} color={goal.color} />
            </View>
            <Text style={s.resultTitle}>Bientot disponible</Text>
            <Text style={s.resultMessage}>{resultMessage}</Text>
            <Pressable
              style={({ pressed }) => [
                s.cta,
                s.ctaFullWidth,
                { backgroundColor: goal.color },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleClose}
            >
              <Text style={s.ctaText}>Compris</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ShopBottomSheet>
  );
}

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: espacements.xl,
      paddingBottom: espacements.md,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginBottom: espacements.lg,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: couleurs.fond,
      justifyContent: 'center',
      alignItems: 'center',
    },
    goalIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: couleurs.texte,
    },
    headerSubtitle: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 1,
    },

    // Progress
    progress: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginBottom: espacements.xl,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: couleurs.bordure,
    },
    progressLine: {
      width: 40,
      height: 2,
      backgroundColor: couleurs.bordure,
      borderRadius: 1,
    },

    // Intensity cards
    intensityList: {
      gap: espacements.sm,
    },
    intensityCard: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.lg,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      padding: espacements.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    intensityRecommended: {
      borderWidth: 2,
    },
    recommendedBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      borderBottomLeftRadius: rayons.sm,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    recommendedText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    intensityRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    intensityInfo: {
      flex: 1,
    },
    intensityName: {
      fontSize: 16,
      fontWeight: '700',
      color: couleurs.texte,
    },
    intensityLabel: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    intensityDuree: {
      fontSize: 11,
      color: couleurs.texteMuted,
      marginTop: 3,
    },
    intensityPriceBlock: {
      alignItems: 'flex-end',
    },
    intensityPrixBarre: {
      fontSize: 12,
      color: couleurs.texteMuted,
      textDecorationLine: 'line-through',
    },
    intensityPrix: {
      fontSize: 18,
      fontWeight: '800',
    },
    intensityEstimate: {
      fontSize: 11,
      color: couleurs.texteMuted,
      marginTop: 6,
    },
    welcomeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.sm,
      paddingHorizontal: espacements.md,
    },
    welcomeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    lppHint: {
      fontSize: 11,
      color: couleurs.texteMuted,
      textAlign: 'center',
      paddingTop: espacements.sm,
      lineHeight: 16,
    },

    // Recap
    recapContainer: {
      gap: espacements.lg,
    },
    recapSection: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      gap: espacements.md,
    },
    recapRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    recapLabel: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },
    recapValue: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
      textAlign: 'right',
      flexShrink: 1,
    },

    // Price breakdown
    priceSection: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      gap: espacements.sm,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priceLabel: {
      fontSize: 14,
      color: couleurs.texte,
    },
    priceValue: {
      fontSize: 14,
      color: couleurs.texte,
    },
    discountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    discountLabel: {
      fontSize: 13,
      color: '#10B981',
    },
    discountValue: {
      fontSize: 13,
      color: '#10B981',
      fontWeight: '600',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
      paddingTop: espacements.sm,
      marginTop: espacements.xs,
    },
    totalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.texte,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '800',
    },

    // Disclaimer
    disclaimer: {
      alignItems: 'center',
    },
    disclaimerText: {
      fontSize: 11,
      color: couleurs.texteMuted,
      textAlign: 'center',
    },

    // CTA
    cta: {
      borderRadius: rayons.full,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaFullWidth: {
      alignSelf: 'stretch',
    },
    ctaText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },

    // Result
    resultContainer: {
      alignItems: 'center',
      paddingVertical: espacements.xl,
    },
    resultIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    resultTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.sm,
    },
    resultMessage: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: espacements.xl,
      paddingHorizontal: espacements.lg,
    },
  });
