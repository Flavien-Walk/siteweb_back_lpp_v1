/**
 * Page Profil Utilisateur - Voir le profil d'un autre utilisateur
 * Avec actions: ajouter ami, envoyer message
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
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

export default function ProfilUtilisateurPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { utilisateur: moi } = useUser();

  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);

  // Charger le profil
  const chargerProfil = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const reponse = await getProfilUtilisateur(id);
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
  }, [id]);

  useEffect(() => {
    chargerProfil();
  }, [chargerProfil]);

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
        // Supprimer l'ami
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
        // Annuler la demande
        const reponse = await annulerDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, demandeEnvoyee: false });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else if (profil.demandeRecue) {
        // Accepter la demande
        const reponse = await accepterDemandeAmi(id);
        if (reponse.succes) {
          setProfil({ ...profil, estAmi: true, demandeRecue: false });
        } else {
          Alert.alert('Erreur', reponse.message || 'Erreur');
        }
      } else {
        // Envoyer une demande
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

  // Obtenir le texte du bouton ami
  const getBoutonAmiTexte = () => {
    if (!profil) return 'Ajouter';
    if (profil.estAmi) return 'Amis';
    if (profil.demandeEnvoyee) return 'Demande envoyée';
    if (profil.demandeRecue) return 'Accepter';
    return 'Ajouter';
  };

  // Obtenir l'icône du bouton ami
  const getBoutonAmiIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!profil) return 'person-add-outline';
    if (profil.estAmi) return 'checkmark-circle';
    if (profil.demandeEnvoyee) return 'hourglass-outline';
    if (profil.demandeRecue) return 'person-add';
    return 'person-add-outline';
  };

  // Formater la date d'inscription
  const formatDateInscription = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Obtenir les initiales
  const getInitiales = () => {
    if (!profil) return '?';
    return `${profil.prenom?.[0] || ''}${profil.nom?.[0] || ''}`.toUpperCase();
  };

  // Obtenir le libellé du statut
  const getStatutLabel = (statut?: string) => {
    switch (statut) {
      case 'investisseur':
        return 'Investisseur';
      case 'porteur':
        return 'Porteur de projet';
      case 'les-deux':
        return 'Investisseur & Porteur';
      default:
        return 'Membre';
    }
  };

  if (chargement) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </View>
    );
  }

  if (!profil) {
    return (
      <View style={[styles.container, styles.errorContainer, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={64} color={couleurs.texteMuted} />
        <Text style={styles.errorText}>Utilisateur non trouvé</Text>
        <Pressable style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  // Vérifier si c'est mon propre profil
  const estMonProfil = moi?.id === profil._id;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable style={styles.headerAction}>
          <Ionicons name="ellipsis-horizontal" size={24} color={couleurs.texte} />
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
        {/* Section profil - Style Instagram */}
        <View style={styles.profilSection}>
          {/* Header avec avatar et stats */}
          <View style={styles.profilHeader}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Avatar
                uri={profil.avatar}
                prenom={profil.prenom}
                nom={profil.nom}
                taille={90}
                style={styles.avatar}
              />
              {/* Badge statut sur l'avatar */}
              {profil.statut && (
                <View style={styles.avatarBadge}>
                  <Ionicons
                    name={profil.statut === 'investisseur' ? 'trending-up' : profil.statut === 'porteur' ? 'rocket' : 'star'}
                    size={12}
                    color={couleurs.blanc}
                  />
                </View>
              )}
            </View>

            {/* Stats à côté de l'avatar - Style Instagram */}
            <View style={styles.statsRow}>
              <Pressable style={styles.statItem}>
                <Text style={styles.statValue}>{profil.nbAmis || 0}</Text>
                <Text style={styles.statLabel}>Amis</Text>
              </Pressable>
              <Pressable style={styles.statItem}>
                <Text style={styles.statValue}>{profil.projetsSuivis || 0}</Text>
                <Text style={styles.statLabel}>Projets</Text>
              </Pressable>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {new Date(profil.dateInscription).getFullYear()}
                </Text>
                <Text style={styles.statLabel}>Membre</Text>
              </View>
            </View>
          </View>

          {/* Nom et username */}
          <View style={styles.nomSection}>
            <Text style={styles.profilNom}>
              {profil.prenom} {profil.nom}
            </Text>
            <View style={styles.statutBadge}>
              <Ionicons
                name={profil.statut === 'investisseur' ? 'trending-up' : profil.statut === 'porteur' ? 'rocket' : 'star'}
                size={12}
                color={couleurs.primaire}
              />
              <Text style={styles.statutText}>{getStatutLabel(profil.statut)}</Text>
            </View>
          </View>

          {/* Bio */}
          {profil.bio ? (
            <Text style={styles.bio}>{profil.bio}</Text>
          ) : (
            <Text style={styles.bioEmpty}>Aucune biographie</Text>
          )}

          {/* Boutons d'action - Style Instagram */}
          {!estMonProfil && (
            <View style={styles.actionsContainer}>
              {/* Bouton Ami */}
              <Pressable
                style={[
                  styles.actionButton,
                  profil.estAmi && styles.actionButtonActive,
                  profil.demandeEnvoyee && styles.actionButtonPending,
                  profil.demandeRecue && styles.actionButtonReceived,
                ]}
                onPress={handleDemandeAmi}
                disabled={actionEnCours}
              >
                {actionEnCours ? (
                  <ActivityIndicator size="small" color={profil.estAmi || profil.demandeRecue ? couleurs.blanc : couleurs.primaire} />
                ) : (
                  <>
                    <Ionicons
                      name={getBoutonAmiIcon()}
                      size={18}
                      color={profil.estAmi || profil.demandeRecue ? couleurs.blanc : couleurs.primaire}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        (profil.estAmi || profil.demandeRecue) && styles.actionButtonTextActive,
                      ]}
                    >
                      {getBoutonAmiTexte()}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Bouton Message */}
              <Pressable
                style={[styles.actionButton, styles.actionButtonMessage]}
                onPress={handleEnvoyerMessage}
                disabled={actionEnCours}
              >
                <Ionicons name="chatbubble-outline" size={18} color={couleurs.blanc} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextActive]}>
                  Message
                </Text>
              </Pressable>

              {/* Bouton Options */}
              <Pressable style={styles.actionButtonSmall}>
                <Ionicons name="ellipsis-horizontal" size={18} color={couleurs.texte} />
              </Pressable>
            </View>
          )}

          {estMonProfil && (
            <Pressable
              style={styles.editProfileButton}
              onPress={() => router.push('/(app)/profil')}
            >
              <Ionicons name="create-outline" size={18} color={couleurs.texte} />
              <Text style={styles.editProfileButtonText}>Modifier le profil</Text>
            </Pressable>
          )}
        </View>

        {/* Grille d'actions rapides */}
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsGrid}>
            <Pressable style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="document-text-outline" size={22} color={couleurs.primaire} />
              </View>
              <Text style={styles.quickActionLabel}>Publications</Text>
            </Pressable>
            <Pressable style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="heart-outline" size={22} color={couleurs.danger} />
              </View>
              <Text style={styles.quickActionLabel}>Favoris</Text>
            </Pressable>
            <Pressable style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="bookmark-outline" size={22} color={couleurs.succes} />
              </View>
              <Text style={styles.quickActionLabel}>Projets</Text>
            </Pressable>
          </View>
        </View>

        {/* Informations supplémentaires */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>À propos</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={18} color={couleurs.primaire} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Membre depuis</Text>
                <Text style={styles.infoValue}>{formatDateInscription(profil.dateInscription)}</Text>
              </View>
            </View>

            {profil.statut && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="briefcase-outline" size={18} color={couleurs.primaire} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  <Text style={styles.infoValue}>{getStatutLabel(profil.statut)}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="people-outline" size={18} color={couleurs.primaire} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Réseau</Text>
                <Text style={styles.infoValue}>{profil.nbAmis || 0} ami{(profil.nbAmis || 0) > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  errorText: {
    fontSize: typographie.tailles.lg,
    color: couleurs.texteSecondaire,
    marginTop: espacements.lg,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: espacements.xl,
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    borderRadius: rayons.full,
  },
  errorButtonText: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
    fontSize: typographie.tailles.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingBottom: espacements.xxl,
  },

  // Section profil - Style Instagram
  profilSection: {
    paddingVertical: espacements.lg,
    paddingHorizontal: espacements.lg,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  profilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacements.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: espacements.xl,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: couleurs.primaire,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: couleurs.primaire,
  },
  avatarInitiales: {
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginTop: 2,
  },
  nomSection: {
    marginBottom: espacements.sm,
  },
  profilNom: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: espacements.sm,
    paddingVertical: 3,
    borderRadius: rayons.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statutText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
    color: couleurs.primaire,
  },
  bio: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    lineHeight: 20,
    marginBottom: espacements.lg,
  },
  bioEmpty: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteMuted,
    fontStyle: 'italic',
    marginBottom: espacements.lg,
  },

  // Actions - Style Instagram
  actionsContainer: {
    flexDirection: 'row',
    gap: espacements.sm,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.primaire,
    gap: espacements.xs,
    minHeight: 36,
  },
  actionButtonActive: {
    backgroundColor: couleurs.succes,
    borderColor: couleurs.succes,
  },
  actionButtonPending: {
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondCard,
  },
  actionButtonReceived: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  actionButtonMessage: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  actionButtonSmall: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondCard,
  },
  actionButtonText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  actionButtonTextActive: {
    color: couleurs.blanc,
  },

  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondCard,
    gap: espacements.xs,
    width: '100%',
  },
  editProfileButtonText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },

  // Quick Actions Grid
  quickActionsSection: {
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
    paddingVertical: espacements.sm,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.xs,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  quickActionLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    fontWeight: typographie.poids.medium,
  },

  // Info section
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.lg,
  },
  infoSectionTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.md,
  },
  infoCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.sm,
    gap: espacements.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: couleurs.primaireLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
  },
  infoValue: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    fontWeight: typographie.poids.medium,
    marginTop: 1,
  },
});
