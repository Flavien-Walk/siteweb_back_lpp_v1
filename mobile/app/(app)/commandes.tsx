/**
 * Ecran Commandes — Mes achats / Mes ventes
 * Tabs: Achats (tous) | Ventes (entrepreneurs)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, SafeAreaView, ActivityIndicator,
  Platform, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { espacements, rayons } from '../../src/constantes/theme';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import CarteCommande from '../../src/composants/commandes/CarteCommande';
import { getMesAchats, getMesVentes } from '../../src/services/boutique';
import type { MarketplaceOrder, OrderStatut } from '../../src/types/boutique';
import { StyleSheet } from 'react-native';

const FILTRES_ACHATS: { label: string; value: string }[] = [
  { label: 'Toutes', value: '' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Livrees', value: 'livre' },
  { label: 'Terminees', value: 'termine' },
];

const FILTRES_VENTES: { label: string; value: string }[] = [
  { label: 'Toutes', value: '' },
  { label: 'A traiter', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Livrees', value: 'livre' },
  { label: 'Terminees', value: 'termine' },
];

export default function CommandesScreen() {
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs);
  const isEntrepreneur = utilisateur?.statut === 'entrepreneur';

  const [tab, setTab] = useState<'achats' | 'ventes'>('achats');
  const [filtre, setFiltre] = useState('');
  const [commandes, setCommandes] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingVentesCount, setPendingVentesCount] = useState(0);

  const filtres = tab === 'ventes' ? FILTRES_VENTES : FILTRES_ACHATS;

  const loadCommandes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const fetcher = tab === 'ventes' ? getMesVentes : getMesAchats;
      const res = await fetcher(1, 50, filtre || undefined);
      if (res.succes && res.data) {
        setCommandes(res.data.commandes);
      }
      // Compter les ventes en attente (pour le badge)
      if (isEntrepreneur) {
        const pendRes = await getMesVentes(1, 1, 'en_attente');
        if (pendRes.succes && pendRes.data?.pagination) {
          setPendingVentesCount(pendRes.data.pagination.total);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, filtre, isEntrepreneur]);

  useFocusEffect(
    useCallback(() => { loadCommandes(); }, [loadCommandes])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommandes(true);
  }, [loadCommandes]);

  const handleOpenCommande = useCallback((commande: MarketplaceOrder) => {
    router.push(`/(app)/commande/${commande._id}` as any);
  }, [router]);

  const renderEmpty = () => {
    const hasFilter = filtre !== '';
    const icon = tab === 'achats' ? 'bag-outline' : 'storefront-outline';
    let title = '';
    let subtitle = '';

    if (hasFilter) {
      title = 'Aucun resultat';
      subtitle = tab === 'achats'
        ? 'Aucun achat ne correspond a ce filtre.'
        : 'Aucune vente ne correspond a ce filtre.';
    } else if (tab === 'achats') {
      title = 'Aucun achat';
      subtitle = 'Vos achats apparaitront ici apres avoir commande un service sur la marketplace.';
    } else {
      title = 'Aucune vente';
      subtitle = 'Les commandes de vos clients apparaitront ici.';
    }

    return (
      <View style={s.empty}>
        <Ionicons name={icon as any} size={48} color={couleurs.texteMuted} />
        <Text style={s.emptyTitle}>{title}</Text>
        <Text style={s.emptySubtitle}>{subtitle}</Text>
      </View>
    );
  };

  return (
    <SwipeableScreen edgeWidth={50}>
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + espacements.sm : espacements.sm }]}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={s.headerTitle}>Mes commandes</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Tabs achats/ventes */}
        {isEntrepreneur && (
          <View style={s.tabsRow}>
            {(['achats', 'ventes'] as const).map(t => (
              <Pressable key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => { setTab(t); setFiltre(''); }}>
                <Ionicons
                  name={t === 'achats' ? 'bag-outline' : 'storefront-outline'}
                  size={16}
                  color={tab === t ? '#7C5CFF' : couleurs.texteMuted}
                />
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t === 'achats' ? 'Mes achats' : 'Mes ventes'}
                </Text>
                {t === 'ventes' && pendingVentesCount > 0 && (
                  <View style={s.tabBadge}>
                    <Text style={s.tabBadgeText}>{pendingVentesCount}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Filtres statut */}
        <FlatList
          horizontal
          data={filtres}
          keyExtractor={item => item.value || '_all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtresRow}
          renderItem={({ item }) => (
            <Pressable
              style={[s.filtreChip, filtre === item.value && s.filtreChipActive]}
              onPress={() => setFiltre(item.value)}
            >
              <Text style={[s.filtreText, filtre === item.value && s.filtreTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />

        {/* Liste */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={couleurs.primaire} />
          </View>
        ) : (
          <FlatList
            data={commandes}
            keyExtractor={item => item._id}
            contentContainerStyle={s.list}
            ListEmptyComponent={renderEmpty}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={couleurs.primaire} />}
            renderItem={({ item }) => (
              <CarteCommande
                commande={item}
                isVente={tab === 'ventes'}
                onPress={handleOpenCommande}
                couleurs={couleurs}
              />
            )}
          />
        )}
      </SafeAreaView>
    </SwipeableScreen>
  );
}

const createStyles = (couleurs: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: couleurs.fond },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: espacements.lg, paddingBottom: espacements.md,
    },
    backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: couleurs.texte, textAlign: 'center' },
    tabsRow: {
      flexDirection: 'row', marginHorizontal: espacements.lg,
      backgroundColor: couleurs.fondCard, borderRadius: rayons.md,
      padding: 4, marginBottom: espacements.md,
    },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: rayons.sm,
    },
    tabActive: { backgroundColor: couleurs.fond },
    tabText: { fontSize: 14, fontWeight: '500', color: couleurs.texteMuted },
    tabTextActive: { color: '#7C5CFF', fontWeight: '600' },
    tabBadge: {
      minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 4,
    },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    filtresRow: { paddingHorizontal: espacements.lg, gap: 8, marginBottom: espacements.md, paddingVertical: 2 },
    filtreChip: {
      height: 34, paddingHorizontal: 14,
      borderRadius: 17, backgroundColor: couleurs.fondCard,
      borderWidth: 1, borderColor: couleurs.bordure,
      justifyContent: 'center' as const, alignItems: 'center' as const,
    },
    filtreChipActive: { backgroundColor: 'rgba(124,92,255,0.12)', borderColor: '#7C5CFF' },
    filtreText: { fontSize: 13, fontWeight: '500', color: couleurs.texteMuted, lineHeight: 18 },
    filtreTextActive: { color: '#7C5CFF', fontWeight: '600' },
    list: { paddingHorizontal: espacements.lg, paddingBottom: 100, flexGrow: 1 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: couleurs.texte },
    emptySubtitle: { fontSize: 13, color: couleurs.texteMuted, textAlign: 'center', paddingHorizontal: 40 },
  });
