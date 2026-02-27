/**
 * TimelineStatut — Timeline visuelle des statuts d'une commande
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements } from '../../constantes/theme';
import type { OrderStatut, OrderHistorique } from '../../types/boutique';

const STATUT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  en_attente: { label: 'En attente', icon: 'time-outline', color: '#F59E0B' },
  acceptee: { label: 'Acceptee', icon: 'checkmark-circle-outline', color: '#10B981' },
  refusee: { label: 'Refusee', icon: 'close-circle-outline', color: '#EF4444' },
  en_cours: { label: 'En cours', icon: 'construct-outline', color: '#3B82F6' },
  livre: { label: 'Livre', icon: 'gift-outline', color: '#8B5CF6' },
  termine: { label: 'Termine', icon: 'checkmark-done-circle-outline', color: '#10B981' },
  annule: { label: 'Annule', icon: 'ban-outline', color: '#6B7280' },
  litige: { label: 'Litige', icon: 'warning-outline', color: '#EF4444' },
};

// Ordre logique des etapes normales
const ETAPES_NORMALES: OrderStatut[] = ['en_attente', 'en_cours', 'livre', 'termine'];

interface Props {
  statut: OrderStatut;
  historique: OrderHistorique[];
  couleurs: ThemeCouleurs;
}

function TimelineStatut({ statut, historique, couleurs }: Props) {
  const s = createStyles(couleurs);
  const config = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;

  // Determiner quelle etape on est dans le flux normal
  const indexCourant = ETAPES_NORMALES.indexOf(statut);
  const isEtatFinal = ['refusee', 'annule', 'litige'].includes(statut);

  return (
    <View style={s.container}>
      {/* Badge statut courant */}
      <View style={[s.badge, { backgroundColor: config.color + '20', borderColor: config.color }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[s.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>

      {/* Timeline etapes */}
      <View style={s.timeline}>
        {ETAPES_NORMALES.map((etape, i) => {
          const etapeConfig = STATUT_CONFIG[etape];
          const isPast = indexCourant >= 0 ? i <= indexCourant : false;
          const isCurrent = etape === statut || (statut === 'acceptee' && etape === 'en_cours');
          const dotColor = isPast ? '#10B981' : isCurrent ? config.color : couleurs.bordure;

          return (
            <View key={etape} style={s.step}>
              {i > 0 && <View style={[s.line, isPast && { backgroundColor: '#10B981' }]} />}
              <View style={[s.dot, { backgroundColor: dotColor }]}>
                {isPast && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              <Text style={[s.stepLabel, isPast && { color: couleurs.texte, fontWeight: '600' }]}>
                {etapeConfig.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Etat special (litige, annule, refuse) */}
      {isEtatFinal && (
        <View style={[s.specialBadge, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon as any} size={14} color={config.color} />
          <Text style={[s.specialText, { color: config.color }]}>
            {statut === 'litige' ? 'Un litige est en cours'
              : statut === 'annule' ? 'Commande annulee'
              : 'Commande refusee par le vendeur'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default memo(TimelineStatut);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: { marginBottom: espacements.lg },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start',
      borderWidth: 1, borderRadius: 20,
      paddingVertical: 6, paddingHorizontal: 12,
      marginBottom: espacements.lg,
    },
    badgeText: { fontSize: 13, fontWeight: '700' },
    timeline: {
      flexDirection: 'row', alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.sm,
    },
    step: { alignItems: 'center', flex: 1, position: 'relative' },
    dot: {
      width: 20, height: 20, borderRadius: 10,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 6,
    },
    line: {
      position: 'absolute', top: 9, right: '50%',
      width: '100%', height: 2,
      backgroundColor: couleurs.bordure,
      zIndex: -1,
    },
    stepLabel: { fontSize: 10, color: couleurs.texteMuted, textAlign: 'center' },
    specialBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: espacements.md, borderRadius: 8, marginTop: espacements.md,
    },
    specialText: { fontSize: 13, fontWeight: '600' },
  });
