/**
 * CarteCommande — Card pour la liste des commandes (achats/ventes)
 */
import React, { memo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import type { MarketplaceOrder, OrderStatut } from '../../types/boutique';
import { formatPrice } from '../../constantes/boutique';

const STATUT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: '#F59E0B', bg: '#F59E0B15' },
  acceptee: { label: 'Acceptee', color: '#10B981', bg: '#10B98115' },
  refusee: { label: 'Refusee', color: '#EF4444', bg: '#EF444415' },
  en_cours: { label: 'En cours', color: '#3B82F6', bg: '#3B82F615' },
  livre: { label: 'Livre', color: '#8B5CF6', bg: '#8B5CF615' },
  termine: { label: 'Termine', color: '#10B981', bg: '#10B98115' },
  annule: { label: 'Annule', color: '#6B7280', bg: '#6B728015' },
  litige: { label: 'Litige', color: '#EF4444', bg: '#EF444415' },
};

interface Props {
  commande: MarketplaceOrder;
  isVente: boolean;
  onPress: (commande: MarketplaceOrder) => void;
  couleurs: ThemeCouleurs;
}

function formatMiniDeadline(remainingSeconds: number): string {
  if (remainingSeconds >= 86400) return `${Math.ceil(remainingSeconds / 86400)}j`;
  if (remainingSeconds >= 3600) return `${Math.ceil(remainingSeconds / 3600)}h`;
  return `${Math.ceil(remainingSeconds / 60)}m`;
}

function CarteCommande({ commande, isVente, onPress, couleurs }: Props) {
  const s = createStyles(couleurs);
  const statutStyle = STATUT_STYLE[commande.statut] || STATUT_STYLE.en_attente;
  const autrePersonne = isVente ? commande.acheteur : commande.vendeur;
  const prenomAutre = autrePersonne?.prenom || '';
  const nomInitiale = autrePersonne?.nom ? autrePersonne.nom.charAt(0) + '.' : '';
  const image = commande.serviceSnapshot?.image || commande.service?.image;
  const dateStr = new Date(commande.dateCreation).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  // Mini deadline badge
  const dl = commande.deadline;
  const showDeadlineBadge = dl && dl.deadlineActive;
  const dlIsLate = dl?.isLate || (dl?.remainingSeconds != null && dl.remainingSeconds <= 0);
  const dlLabel = dlIsLate ? 'EN RETARD' : dl ? formatMiniDeadline(dl.remainingSeconds) : '';
  const dlColor = dlIsLate ? '#EF4444' : '#F59E0B';
  const dlBg = dlIsLate ? '#EF444415' : '#F59E0B15';

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => onPress(commande)}>
      {/* Image */}
      {image ? (
        <Image source={{ uri: image }} style={s.image} resizeMode="cover" />
      ) : (
        <View style={[s.image, s.imageFallback]}>
          <Ionicons name="cube-outline" size={24} color={couleurs.texteMuted} />
        </View>
      )}

      {/* Content */}
      <View style={s.content}>
        <Text style={s.nom} numberOfLines={1}>{commande.serviceSnapshot?.nom || 'Service'}</Text>
        <View style={s.metaRow}>
          <Text style={s.meta}>
            {isVente ? 'Acheteur' : 'Vendeur'} : {prenomAutre} {nomInitiale}
          </Text>
          <Text style={s.date}>{dateStr}</Text>
        </View>
        <View style={s.bottomRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[s.statutBadge, { backgroundColor: statutStyle.bg }]}>
              <Text style={[s.statutText, { color: statutStyle.color }]}>{statutStyle.label}</Text>
            </View>
            {showDeadlineBadge && (
              <View style={[s.statutBadge, { backgroundColor: dlBg }]}>
                <Text style={[s.statutText, { color: dlColor }]}>{dlLabel}</Text>
              </View>
            )}
          </View>
          <Text style={s.prix}>
            {(commande.montantTotal ?? 0) > 0 ? formatPrice(commande.montantTotal) : 'Sur devis'}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={couleurs.texteMuted} />
    </Pressable>
  );
}

export default memo(CarteCommande);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      padding: espacements.md,
      marginBottom: espacements.sm,
      gap: espacements.md,
    },
    image: { width: 56, height: 56, borderRadius: rayons.md },
    imageFallback: {
      backgroundColor: couleurs.fond,
      justifyContent: 'center', alignItems: 'center',
    },
    content: { flex: 1 },
    nom: { fontSize: 14, fontWeight: '600', color: couleurs.texte, marginBottom: 3 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    meta: { fontSize: 12, color: couleurs.texteMuted },
    date: { fontSize: 11, color: couleurs.texteMuted },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statutBadge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8 },
    statutText: { fontSize: 11, fontWeight: '700' },
    prix: { fontSize: 14, fontWeight: '700', color: '#7C5CFF' },
  });
