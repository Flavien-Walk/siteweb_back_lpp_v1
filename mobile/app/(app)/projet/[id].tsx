/**
 * Page Fiche Projet Publique
 * Affiche les details d'un projet publie
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

import { espacements, rayons } from '../../../src/constantes/theme';
import { useTheme, ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { useUser } from '../../../src/contexts/UserContext';
import Avatar from '../../../src/composants/Avatar';
import {
  Projet,
  Porteur,
  getProjet,
  toggleSuivreProjet,
  getRepresentantsProjet,
} from '../../../src/services/projets';
import { getOuCreerConversationPrivee } from '../../../src/services/messagerie';

export default function ProjetDetailPage() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const styles = createStyles(couleurs);

  const [projet, setProjet] = useState<Projet | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);

  // Suivre
  const [estSuivi, setEstSuivi] = useState(false);
  const [nbFollowers, setNbFollowers] = useState(0);

  // Contacter - Modal representants
  const [showContactModal, setShowContactModal] = useState(false);
  const [representants, setRepresentants] = useState<Porteur[]>([]);
  const [chargementRepresentants, setChargementRepresentants] = useState(false);

  // Charger le projet
  const chargerProjet = useCallback(async (estRefresh = false) => {
    if (!id) return;

    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const reponse = await getProjet(id);
      if (reponse.succes && reponse.data) {
        setProjet(reponse.data.projet);
        setEstSuivi(reponse.data.projet.estSuivi);
        setNbFollowers(reponse.data.projet.nbFollowers);
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id]);

  // Charger les representants
  const chargerRepresentants = useCallback(async () => {
    if (!id) return;
    setChargementRepresentants(true);
    try {
      const reponse = await getRepresentantsProjet(id);
      if (reponse.succes && reponse.data) {
        setRepresentants(reponse.data.representants);
      }
    } catch (error) {
      console.error('Erreur chargement representants:', error);
    } finally {
      setChargementRepresentants(false);
    }
  }, [id]);

  useEffect(() => {
    chargerProjet();
  }, [chargerProjet]);

  // Ouvrir le modal contact si action=contact
  useEffect(() => {
    if (action === 'contact' && projet && !chargement) {
      openContactModal();
    }
  }, [action, projet, chargement]);

  const handleToggleSuivre = async () => {
    if (!id || actionEnCours) return;
    try {
      setActionEnCours(true);
      const reponse = await toggleSuivreProjet(id);
      if (reponse.succes && reponse.data) {
        setEstSuivi(reponse.data.estSuivi);
        setNbFollowers(reponse.data.nbFollowers);
      }
    } catch (error) {
      console.error('Erreur toggle suivre:', error);
    } finally {
      setActionEnCours(false);
    }
  };

  const openContactModal = async () => {
    setShowContactModal(true);
    await chargerRepresentants();
  };

  const handleContacterRepresentant = async (representant: Porteur) => {
    try {
      setActionEnCours(true);
      const reponse = await getOuCreerConversationPrivee(representant._id);
      if (reponse.succes && reponse.data) {
        setShowContactModal(false);
        // Naviguer vers la messagerie avec cette conversation
        router.push({
          pathname: '/(app)/accueil',
          params: { tab: 'messages', conversationId: reponse.data.conversation._id },
        });
      }
    } catch (error) {
      console.error('Erreur creation conversation:', error);
    } finally {
      setActionEnCours(false);
    }
  };

  const naviguerVersProfil = (userId: string) => {
    if (utilisateur?.id === userId) {
      router.push('/(app)/profil');
    } else {
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: userId },
      });
    }
  };

  if (chargement) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={couleurs.primaire} />
      </View>
    );
  }

  if (!projet) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color={couleurs.texteSecondaire} />
        <Text style={styles.errorText}>Projet introuvable</Text>
        <Pressable style={styles.retourBtn} onPress={() => router.back()}>
          <Text style={styles.retourBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec image de fond */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => chargerProjet(true)}
            tintColor={couleurs.primaire}
          />
        }
      >
        {/* Image de couverture */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: projet.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop' }}
            style={styles.coverImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverGradient}
          />
          {/* Bouton retour */}
          <Pressable
            style={[styles.backButton, { top: insets.top + espacements.sm }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          {/* Logo */}
          {projet.logo && (
            <View style={styles.logoContainer}>
              <Image source={{ uri: projet.logo }} style={styles.logo} />
            </View>
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {/* Header info */}
          <View style={styles.headerInfo}>
            <Text style={styles.nom}>{projet.nom}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.location}>{projet.localisation?.ville || 'France'}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{nbFollowers}</Text>
              <Text style={styles.statLabel}>Abonnes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{projet.maturite}</Text>
              <Text style={styles.statLabel}>Maturite</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{projet.categorie}</Text>
              <Text style={styles.statLabel}>Secteur</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionBtn, estSuivi && styles.actionBtnSuivi]}
              onPress={handleToggleSuivre}
              disabled={actionEnCours}
            >
              <Ionicons
                name={estSuivi ? 'checkmark' : 'add'}
                size={20}
                color={estSuivi ? couleurs.primaire : '#fff'}
              />
              <Text style={[styles.actionBtnText, estSuivi && styles.actionBtnTextSuivi]}>
                {estSuivi ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
            <Pressable style={styles.actionBtnSecondary} onPress={openContactModal}>
              <Ionicons name="chatbubble-outline" size={20} color={couleurs.texte} />
              <Text style={styles.actionBtnSecondaryText}>Contacter</Text>
            </Pressable>
          </View>

          {/* Pitch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pitch</Text>
            <Text style={styles.pitch}>{projet.pitch || projet.description}</Text>
          </View>

          {/* Tags */}
          {projet.tags && projet.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {projet.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Proposition de valeur */}
          {(projet.probleme || projet.solution) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Proposition de valeur</Text>
              {projet.probleme && (
                <View style={styles.valueCard}>
                  <View style={styles.valueIconContainer}>
                    <Ionicons name="warning-outline" size={20} color={couleurs.erreur} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.valueLabel}>Probleme</Text>
                    <Text style={styles.valueText}>{projet.probleme}</Text>
                  </View>
                </View>
              )}
              {projet.solution && (
                <View style={styles.valueCard}>
                  <View style={[styles.valueIconContainer, { backgroundColor: couleurs.succes + '20' }]}>
                    <Ionicons name="bulb-outline" size={20} color={couleurs.succes} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.valueLabel}>Solution</Text>
                    <Text style={styles.valueText}>{projet.solution}</Text>
                  </View>
                </View>
              )}
              {projet.avantageConcurrentiel && (
                <View style={styles.valueCard}>
                  <View style={[styles.valueIconContainer, { backgroundColor: couleurs.primaire + '20' }]}>
                    <Ionicons name="trophy-outline" size={20} color={couleurs.primaire} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.valueLabel}>Avantage concurrentiel</Text>
                    <Text style={styles.valueText}>{projet.avantageConcurrentiel}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Equipe */}
          {projet.equipe && projet.equipe.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipe</Text>
              {/* Porteur */}
              {projet.porteur && (
                <Pressable
                  style={styles.teamMember}
                  onPress={() => naviguerVersProfil(projet.porteur!._id)}
                >
                  <Avatar
                    uri={projet.porteur.avatar}
                    nom={projet.porteur.nom}
                    prenom={projet.porteur.prenom}
                    taille={48}
                  />
                  <View style={styles.teamMemberInfo}>
                    <Text style={styles.teamMemberName}>
                      {projet.porteur.prenom} {projet.porteur.nom}
                    </Text>
                    <Text style={styles.teamMemberRole}>Fondateur</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
                </Pressable>
              )}
              {/* Autres membres */}
              {projet.equipe.map((membre, i) => (
                <Pressable
                  key={i}
                  style={styles.teamMember}
                  onPress={() => membre.utilisateur && naviguerVersProfil(membre.utilisateur._id)}
                  disabled={!membre.utilisateur}
                >
                  <Avatar
                    uri={membre.photo || membre.utilisateur?.avatar}
                    nom={membre.nom}
                    prenom=""
                    taille={48}
                  />
                  <View style={styles.teamMemberInfo}>
                    <Text style={styles.teamMemberName}>
                      {membre.utilisateur
                        ? `${membre.utilisateur.prenom} ${membre.utilisateur.nom}`
                        : membre.nom}
                    </Text>
                    <Text style={styles.teamMemberRole}>{membre.titre || membre.role}</Text>
                  </View>
                  {membre.utilisateur && (
                    <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Metriques */}
          {projet.metriques && projet.metriques.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Metriques cles</Text>
              <View style={styles.metricsGrid}>
                {projet.metriques.map((metrique, i) => (
                  <View key={i} style={styles.metricCard}>
                    {metrique.icone && (
                      <Ionicons name={metrique.icone as any} size={24} color={couleurs.primaire} />
                    )}
                    <Text style={styles.metricValue}>{metrique.valeur}</Text>
                    <Text style={styles.metricLabel}>{metrique.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Business Model */}
          {projet.businessModel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Model</Text>
              <Text style={styles.businessModel}>{projet.businessModel}</Text>
            </View>
          )}

          {/* Galerie */}
          {projet.galerie && projet.galerie.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Galerie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {projet.galerie.map((media, i) => (
                  <Image
                    key={i}
                    source={{ uri: media.thumbnailUrl || media.url }}
                    style={styles.galleryImage}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Contacter */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contacter le projet</Text>
              <Pressable onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Selectionnez un membre de l'equipe pour demarrer une conversation
            </Text>
            {chargementRepresentants ? (
              <ActivityIndicator size="small" color={couleurs.primaire} style={{ marginVertical: 20 }} />
            ) : representants.length === 0 ? (
              <Text style={styles.noRepresentants}>Aucun representant disponible</Text>
            ) : (
              <FlatList
                data={representants}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.representantItem}
                    onPress={() => handleContacterRepresentant(item)}
                    disabled={actionEnCours}
                  >
                    <Avatar
                      uri={item.avatar}
                      nom={item.nom}
                      prenom={item.prenom}
                      taille={48}
                    />
                    <View style={styles.representantInfo}>
                      <Text style={styles.representantName}>
                        {item.prenom} {item.nom}
                      </Text>
                      <Text style={styles.representantRole}>Membre de l'equipe</Text>
                    </View>
                    <Ionicons name="chatbubble-outline" size={20} color={couleurs.primaire} />
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    errorText: {
      fontSize: 16,
      color: couleurs.texteSecondaire,
      marginTop: espacements.md,
    },
    retourBtn: {
      marginTop: espacements.lg,
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.md,
    },
    retourBtnText: {
      color: '#fff',
      fontWeight: '600',
    },
    // Cover
    coverContainer: {
      height: 250,
      position: 'relative',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
    },
    backButton: {
      position: 'absolute',
      left: espacements.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      position: 'absolute',
      bottom: -30,
      left: espacements.lg,
      borderRadius: rayons.md,
      backgroundColor: couleurs.fond,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    logo: {
      width: 60,
      height: 60,
      borderRadius: rayons.sm,
    },
    // Content
    content: {
      padding: espacements.lg,
      paddingTop: espacements.xl + 20,
    },
    headerInfo: {
      marginBottom: espacements.lg,
    },
    nom: {
      fontSize: 24,
      fontWeight: '700',
      color: couleurs.texte,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginTop: espacements.xs,
    },
    location: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
    },
    // Stats
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      marginBottom: espacements.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
      textTransform: 'capitalize',
    },
    statLabel: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: couleurs.bordure,
    },
    // Actions
    actionsRow: {
      flexDirection: 'row',
      gap: espacements.md,
      marginBottom: espacements.xl,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      backgroundColor: couleurs.primaire,
      paddingVertical: espacements.md,
      borderRadius: rayons.md,
    },
    actionBtnSuivi: {
      backgroundColor: couleurs.primaire + '20',
      borderWidth: 1,
      borderColor: couleurs.primaire,
    },
    actionBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    actionBtnTextSuivi: {
      color: couleurs.primaire,
    },
    actionBtnSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      backgroundColor: couleurs.fondSecondaire,
      paddingVertical: espacements.md,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    actionBtnSecondaryText: {
      color: couleurs.texte,
      fontWeight: '600',
      fontSize: 15,
    },
    // Section
    section: {
      marginBottom: espacements.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.md,
    },
    pitch: {
      fontSize: 15,
      color: couleurs.texteSecondaire,
      lineHeight: 22,
    },
    // Tags
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
      marginBottom: espacements.xl,
    },
    tag: {
      backgroundColor: couleurs.fondTertiaire,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.full,
    },
    tagText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },
    // Value proposition
    valueCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
      gap: espacements.md,
    },
    valueIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    valueLabel: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginBottom: 2,
    },
    valueText: {
      fontSize: 14,
      color: couleurs.texte,
      lineHeight: 20,
    },
    // Team
    teamMember: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    teamMemberInfo: {
      flex: 1,
      marginLeft: espacements.md,
    },
    teamMemberName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    teamMemberRole: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    // Metrics
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.md,
    },
    metricCard: {
      width: (SCREEN_WIDTH - espacements.lg * 2 - espacements.md) / 2,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.lg,
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '700',
      color: couleurs.texte,
      marginTop: espacements.sm,
    },
    metricLabel: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
      textAlign: 'center',
    },
    // Business model
    businessModel: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      lineHeight: 22,
    },
    // Gallery
    galleryImage: {
      width: 200,
      height: 150,
      borderRadius: rayons.md,
      marginRight: espacements.md,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: couleurs.fond,
      borderTopLeftRadius: rayons.xl,
      borderTopRightRadius: rayons.xl,
      padding: espacements.lg,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    modalSubtitle: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      marginBottom: espacements.lg,
    },
    noRepresentants: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      paddingVertical: espacements.xl,
    },
    representantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: espacements.md,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    representantInfo: {
      flex: 1,
      marginLeft: espacements.md,
    },
    representantName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    representantRole: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
  });
