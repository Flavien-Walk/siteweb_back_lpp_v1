/**
 * Page Liste d'Amis - Affiche les amis d'un utilisateur
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { Avatar } from '../../../src/composants';
import { getAmisUtilisateur, ProfilUtilisateur } from '../../../src/services/utilisateurs';

export default function ListeAmisPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [utilisateur, setUtilisateur] = useState<{ prenom: string; nom: string } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerAmis = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }
    setErreur(null);

    try {
      const reponse = await getAmisUtilisateur(id);
      if (reponse.succes && reponse.data) {
        setAmis(reponse.data.amis);
        setUtilisateur(reponse.data.utilisateur);
      } else {
        setErreur(reponse.message || 'Impossible de charger la liste');
      }
    } catch (error) {
      setErreur('Erreur de connexion');
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id]);

  useEffect(() => {
    chargerAmis();
  }, [chargerAmis]);

  const naviguerVersProfil = (userId: string) => {
    router.push({
      pathname: '/(app)/utilisateur/[id]',
      params: { id: userId },
    });
  };

  const renderAmi = ({ item }: { item: ProfilUtilisateur }) => (
    <Pressable
      style={({ pressed }) => [
        styles.amiItem,
        pressed && styles.amiItemPressed,
      ]}
      onPress={() => naviguerVersProfil(item._id)}
    >
      <Avatar
        uri={item.avatar}
        prenom={item.prenom}
        nom={item.nom}
        taille={50}
      />
      <View style={styles.amiInfo}>
        <Text style={styles.amiNom}>{item.prenom} {item.nom}</Text>
        {item.statut && (
          <View style={styles.amiStatutContainer}>
            <Ionicons
              name={item.statut === 'entrepreneur' ? 'rocket' : 'compass'}
              size={12}
              color={item.statut === 'entrepreneur' ? couleurs.primaire : couleurs.texteSecondaire}
            />
            <Text style={[
              styles.amiStatut,
              item.statut === 'entrepreneur' && styles.amiStatutEntrepreneur,
            ]}>
              {item.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
    </Pressable>
  );

  // Chargement
  if (chargement) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={styles.headerTitle}>Amis</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      </View>
    );
  }

  // Erreur
  if (erreur) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={styles.headerTitle}>Amis</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <Ionicons name="lock-closed-outline" size={48} color={couleurs.texteSecondaire} />
          </View>
          <Text style={styles.errorTitle}>Acces restreint</Text>
          <Text style={styles.errorText}>{erreur}</Text>
          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {utilisateur ? `Amis de ${utilisateur.prenom}` : 'Amis'}
          </Text>
          <Text style={styles.headerSubtitle}>{amis.length} ami{amis.length > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Liste des amis */}
      {amis.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="people-outline" size={48} color={couleurs.texteSecondaire} />
          </View>
          <Text style={styles.emptyTitle}>Aucun ami</Text>
          <Text style={styles.emptyText}>
            {utilisateur?.prenom} n'a pas encore d'amis
          </Text>
        </View>
      ) : (
        <FlatList
          data={amis}
          renderItem={renderAmi}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={() => chargerAmis(true)}
              tintColor={couleurs.primaire}
              colors={[couleurs.primaire]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  headerSubtitle: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xxl,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  errorTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  errorText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.xl,
  },
  errorButton: {
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  errorButtonText: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
    fontSize: typographie.tailles.sm,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xxl,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  emptyTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  emptyText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },

  // List
  listContent: {
    paddingVertical: espacements.sm,
  },
  separator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginLeft: espacements.lg + 50 + espacements.md,
  },

  // Ami item
  amiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  amiItemPressed: {
    backgroundColor: couleurs.fondCard,
  },
  amiInfo: {
    flex: 1,
  },
  amiNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texte,
  },
  amiStatutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  amiStatut: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  amiStatutEntrepreneur: {
    color: couleurs.primaire,
  },
});
