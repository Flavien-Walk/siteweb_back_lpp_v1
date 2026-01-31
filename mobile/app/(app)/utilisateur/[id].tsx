/**
 * Page Profil Utilisateur - Design épuré et moderne
 * Inspiré d'Instagram avec une hiérarchie visuelle claire
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useUser } from '../../../src/contexts/UserContext';
import { Avatar } from '../../../src/composants';
import {
  getProfilUtilisateur,
  envoyerDemandeAmi,
  annulerDemandeAmi,
  accepterDemandeAmi,
  supprimerAmi,
  ProfilUtilisateur,
} from '../../../src/services/utilisateurs';
import { getOuCreerConversationPrivee } from '../../../src/services/messagerie';
import { getPublicationsUtilisateur, Publication } from '../../../src/services/publications';

export default function ProfilUtilisateurPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur: moi } = useUser();

  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [chargementPublications, setChargementPublications] = useState(false);

  // Ref pour tracker si le profil a déjà été chargé
  const profilChargeRef = useRef(false);
  const idPrecedentRef = useRef<string | undefined>(undefined);

  // Charger les publications de l'utilisateur
  const chargerPublications = useCallback(async () => {
    if (!id) return;
    setChargementPublications(true);
    try {
      const reponse = await getPublicationsUtilisateur(id);
      if (reponse.succes && reponse.data) {
        setPublications(reponse.data.publications);
      }
    } catch (error) {
      console.error('Erreur chargement publications:', error);
    } finally {
      setChargementPublications(false);
    }
  }, [id]);

  // Charger le profil
  const chargerProfil = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const [reponse] = await Promise.all([
        getProfilUtilisateur(id),
        chargerPublications(),
      ]);
      if (reponse.succes && reponse.data) {
        setProfil(reponse.data.utilisateur);
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de charger le profil');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id, chargerPublications]);

  // Charger le profil uniquement quand l'ID change ou au premier montage
  useEffect(() => {
    if (idPrecedentRef.current !== id) {
      idPrecedentRef.current = id;
      profilChargeRef.current = false;
      setProfil(null);
      setChargement(true);
    }

    if (!profilChargeRef.current && id) {
      profilChargeRef.current = true;
      chargerProfil();
    }
  }, [id, chargerProfil]);

  // Envoyer un message
  const handleEnvoyerMessage = async () => {
    if (!id) return;

    setActionEnCours(true);
    try {
      const reponse = await getOuCreerConversationPrivee(id);
      if (reponse.succes && reponse.data) {
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.conversation._id },
        });
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de créer la conversation');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setActionEnCours(false);
    }
  };

  // Gérer les demandes d'ami
  const handleDemandeAmi = async () => {
    if (!id || !profil) return;

    setActionEnCours(true);
    try {
      if (profil.estAmi) {
        Alert.alert(
          'Retirer des amis',
          `Voulez-vous vraiment retirer ${profil.prenom} de vos amis ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => setActionEnCours(false) },
            {
              text: 'Retirer',
              style: 'destructive',
              onPress: async () => {
                const reponse = await supprimerAmi(id);
                if (reponse.succes) {
                  setProfil({ ...profil, estAmi: false });
                } else {
                  Alert.alert('Erreur', reponse.message || 'Erreur');
                }
                setActionEnCours(false);
              },
            },
          ]
        );
        return;
      }

      if (profil.demandeEnvoyee) {
        const reponse = await annulerDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, demandeEnvoyee: false });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else if (profil.demandeRecue) {
        const reponse = await accepterDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, estAmi: true, demandeRecue: false });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else {
        const reponse = await envoyerDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, demandeEnvoyee: true });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setActionEnCours(false);
    }
  };

  // Configuration du bouton ami
  const getBoutonAmiConfig = () => {
    if (!profil) return { texte: 'Ajouter', icon: 'person-add-outline' as const, style: 'primary' };
    if (profil.estAmi) return { texte: 'Amis', icon: 'checkmark-circle' as const, style: 'success' };
    if (profil.demandeEnvoyee) return { texte: 'En attente', icon: 'time-outline' as const, style: 'pending' };
    if (profil.demandeRecue) return { texte: 'Accepter', icon: 'checkmark' as const, style: 'received' };
    return { texte: 'Ajouter', icon: 'person-add-outline' as const, style: 'primary' };
  };

  // Configuration du statut (avec gestion du rôle admin)
  const getStatutConfig = (role?: string, statut?: string) => {
    // Admin en priorité
    if (role === 'admin') {
      return { label: 'Admin LPP', icon: 'shield-checkmark' as const, color: '#dc2626' };
    }
    // Sinon statut utilisateur
    switch (statut) {
      case 'entrepreneur':
        return { label: 'Entrepreneur', icon: 'rocket' as const, color: couleurs.primaire };
      case 'visiteur':
      default:
        return { label: 'Visiteur', icon: 'compass' as const, color: couleurs.texteSecondaire };
    }
  };

  // Formater la date d'inscription
  const formatDateInscription = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // État de chargement
  if (chargement) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      </View>
    );
  }

  // Profil non trouvé
  if (!profil) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <Ionicons name="person-outline" size={48} color={couleurs.texteSecondaire} />
          </View>
          <Text style={styles.errorTitle}>Utilisateur introuvable</Text>
          <Text style={styles.errorText}>Ce profil n'existe pas ou a été supprimé</Text>
          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const estMonProfil = moi?.id === profil._id;
  const boutonConfig = getBoutonAmiConfig();
  const statutConfig = getStatutConfig(profil.role, profil.statut);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header simple et propre */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profil.prenom} {profil.nom}
        </Text>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texte} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => chargerProfil(true)}
            tintColor={couleurs.primaire}
            colors={[couleurs.primaire]}
          />
        }
      >
        {/* Section profil - Layout horizontal style Instagram */}
        <View style={styles.profilHeader}>
          {/* Avatar avec gradient */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[couleurs.primaire, couleurs.secondaire, couleurs.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarInner}>
                <Avatar
                  uri={profil.avatar}
                  prenom={profil.prenom}
                  nom={profil.nom}
                  taille={86}
                />
              </View>
            </LinearGradient>
          </View>

          {/* Stats horizontales */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profil.nbAmis || 0}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profil.projetsSuivis || 0}</Text>
              <Text style={styles.statLabel}>Projets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Publications</Text>
            </View>
          </View>
        </View>

        {/* Informations utilisateur */}
        <View style={styles.infoSection}>
          {/* Nom complet */}
          <Text style={styles.nomComplet}>{profil.prenom} {profil.nom}</Text>

          {/* Badge statut */}
          <View style={[styles.statutBadge, { backgroundColor: `${statutConfig.color}15` }]}>
            <Ionicons name={statutConfig.icon} size={14} color={statutConfig.color} />
            <Text style={[styles.statutText, { color: statutConfig.color }]}>
              {statutConfig.label}
            </Text>
          </View>

          {/* Bio */}
          {profil.bio ? (
            <Text style={styles.bioText}>{profil.bio}</Text>
          ) : null}

          {/* Date d'inscription */}
          <Text style={styles.dateInscription}>
            Membre depuis {formatDateInscription(profil.dateInscription)}
          </Text>
        </View>

        {/* Boutons d'action */}
        {!estMonProfil ? (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                boutonConfig.style === 'primary' && styles.actionBtnPrimary,
                boutonConfig.style === 'success' && styles.actionBtnSuccess,
                boutonConfig.style === 'pending' && styles.actionBtnOutline,
                boutonConfig.style === 'received' && styles.actionBtnSuccess,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleDemandeAmi}
              disabled={actionEnCours}
            >
              {actionEnCours ? (
                <ActivityIndicator
                  size="small"
                  color={boutonConfig.style === 'pending' ? couleurs.texte : couleurs.blanc}
                />
              ) : (
                <>
                  <Ionicons
                    name={boutonConfig.icon}
                    size={18}
                    color={boutonConfig.style === 'pending' ? couleurs.texte : couleurs.blanc}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      boutonConfig.style === 'pending' && styles.actionBtnTextDark,
                    ]}
                  >
                    {boutonConfig.texte}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnOutline,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleEnvoyerMessage}
              disabled={actionEnCours}
            >
              <Ionicons name="chatbubble-outline" size={18} color={couleurs.texte} />
              <Text style={styles.actionBtnTextDark}>Message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnOutline,
                { flex: 1 },
                pressed && styles.actionBtnPressed,
              ]}
              onPress={() => router.push('/(app)/profil')}
            >
              <Ionicons name="pencil-outline" size={18} color={couleurs.texte} />
              <Text style={styles.actionBtnTextDark}>Modifier le profil</Text>
            </Pressable>
          </View>
        )}

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Section activité */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Activité</Text>

          {chargementPublications ? (
            <View style={styles.emptyActivity}>
              <ActivityIndicator size="large" color={couleurs.primaire} />
            </View>
          ) : publications.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="grid-outline" size={32} color={couleurs.bordure} />
              </View>
              <Text style={styles.emptyTitle}>Aucune publication</Text>
              <Text style={styles.emptyText}>
                Les publications de {profil.prenom} apparaîtront ici
              </Text>
            </View>
          ) : (
            <View style={styles.publicationsGrid}>
              {publications.map((pub) => (
                <Pressable
                  key={pub._id}
                  style={styles.publicationItem}
                  onPress={() => {/* TODO: ouvrir le détail */}}
                >
                  {pub.media ? (
                    <Image
                      source={{ uri: pub.media }}
                      style={styles.publicationImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.publicationTextOnly}>
                      <Text style={styles.publicationTextContent} numberOfLines={4}>
                        {pub.contenu}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: couleurs.fond,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginHorizontal: espacements.sm,
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

  // Scroll
  scrollContent: {
    paddingBottom: espacements.xxxl,
  },

  // Profil Header - Layout Instagram
  profilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.xl,
  },
  avatarSection: {
    marginRight: espacements.xl,
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
  },
  nomComplet: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espacements.xs,
    paddingHorizontal: espacements.sm,
    paddingVertical: 4,
    borderRadius: rayons.sm,
    marginBottom: espacements.sm,
  },
  statutText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  bioText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    lineHeight: 20,
    marginBottom: espacements.sm,
  },
  dateInscription: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },

  // Actions Section
  actionsSection: {
    flexDirection: 'row',
    gap: espacements.sm,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.sm + 2,
    borderRadius: rayons.md,
    gap: espacements.xs,
  },
  actionBtnPrimary: {
    backgroundColor: couleurs.primaire,
  },
  actionBtnSuccess: {
    backgroundColor: couleurs.succes,
  },
  actionBtnOutline: {
    backgroundColor: couleurs.fondCard,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  actionBtnTextDark: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },

  // Separator
  separator: {
    height: 8,
    backgroundColor: couleurs.fondCard,
    marginVertical: espacements.md,
  },

  // Activity Section
  activitySection: {
    paddingHorizontal: espacements.lg,
  },
  sectionTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.lg,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.md,
  },
  emptyTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  emptyText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
  publicationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  publicationItem: {
    width: '32.5%',
    aspectRatio: 1,
    backgroundColor: couleurs.fondCard,
  },
  publicationImage: {
    width: '100%',
    height: '100%',
  },
  publicationTextOnly: {
    flex: 1,
    padding: espacements.sm,
    backgroundColor: couleurs.fondElevated,
    justifyContent: 'center',
  },
  publicationTextContent: {
    fontSize: 11,
    color: couleurs.texte,
    lineHeight: 14,
  },
});
