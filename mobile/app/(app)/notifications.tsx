/**
 * Centre de Notifications - Style Instagram
 * Avec actions rapides pour demandes d'amis
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons, typographie } from '../../src/constantes/theme';
import { useUser } from '../../src/contexts/UserContext';
import { useSocket } from '../../src/contexts/SocketContext';
import { Avatar, AnimatedPressable, SkeletonList, SwipeableScreen } from '../../src/composants';
import { ANIMATION_CONFIG } from '../../src/hooks/useAnimations';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import {
  getNotifications,
  marquerNotificationLue,
  marquerToutesLues,
  supprimerNotification,
  Notification,
  TypeNotification,
} from '../../src/services/notifications';
import {
  accepterDemandeAmi,
  refuserDemandeAmi,
} from '../../src/services/utilisateurs';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Swipe gauche uniquement pour supprimer.
 * activeOffsetX={-15} : n'active que les swipes vers la gauche
 * failOffsetX={15}    : echoue si swipe vers la droite → SwipeableScreen prend le relais
 * failOffsetY          : echoue si scroll vertical → FlatList scroll normalement
 */
const SwipeLeftToDelete = ({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const gestureEvent = useMemo(
    () => Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    ),
    [translateX]
  );

  const clampedX = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0],
    outputRange: [-SCREEN_WIDTH, 0],
    extrapolate: 'clamp',
  });

  const onHandlerStateChange = useCallback(({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationX < -80 || nativeEvent.velocityX < -500) {
        Animated.timing(translateX, {
          toValue: -SCREEN_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          onDelete();
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [translateX, onDelete]);

  return (
    <View style={{ overflow: 'hidden' }}>
      <View style={swipeStyles.deleteBg}>
        <Ionicons name="trash-outline" size={22} color={couleurs.blanc} />
      </View>
      <PanGestureHandler
        activeOffsetX={-15}
        failOffsetX={15}
        failOffsetY={[-15, 15]}
        onGestureEvent={gestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[swipeStyles.foreground, { transform: [{ translateX: clampedX }] }]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: couleurs.danger,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: espacements.xl,
  },
  foreground: {
    backgroundColor: couleurs.fond,
  },
});

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useUser();
  const { onNewNotification, onDemandeAmi, isConnected: socketConnected } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionsEnCours, setActionsEnCours] = useState<Set<string>>(new Set());

  // Charger les notifications
  const chargerNotifications = useCallback(async (estRefresh = false) => {
    if (estRefresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }

    try {
      const reponse = await getNotifications();
      if (reponse.succes && reponse.data) {
        setNotifications(reponse.data.notifications);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    chargerNotifications();
  }, [chargerNotifications]);

  // === SOCKET: Écouter les nouvelles notifications en temps réel ===
  useEffect(() => {
    const unsubNotif = onNewNotification(() => {
      console.log('[NOTIFICATIONS] Nouvelle notification reçue via socket');
      chargerNotifications(true);
    });

    const unsubDemande = onDemandeAmi((event) => {
      console.log('[NOTIFICATIONS] Demande ami reçue via socket:', event.type);
      if (event.type === 'received') {
        chargerNotifications(true);
      }
    });

    return () => {
      unsubNotif();
      unsubDemande();
    };
  }, [onNewNotification, onDemandeAmi, chargerNotifications]);

  // Auto-refresh avec gestion focus et AppState
  // Si socket connecté: polling moins fréquent (60s) comme backup
  // Si socket déconnecté: polling fréquent (20s) pour compenser
  useAutoRefresh({
    onRefresh: useCallback(async () => {
      await chargerNotifications(false);
    }, [chargerNotifications]),
    pollingInterval: socketConnected ? 60000 : 20000,
    refreshOnFocus: true,
    minRefreshInterval: socketConnected ? 10000 : 5000,
    enabled: true,
  });

  // Marquer comme lu au clic
  const handleNotificationPress = async (notif: Notification) => {
    // Marquer comme lue si non lue
    if (!notif.lue) {
      try {
        await marquerNotificationLue(notif._id);
        setNotifications(prev =>
          prev.map(n => (n._id === notif._id ? { ...n, lue: true } : n))
        );
      } catch (error) {
        console.error('Erreur marquage:', error);
      }
    }

    // Navigation selon le type
    if (notif.type === 'demande_ami' && notif.data?.userId) {
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: notif.data.userId },
      });
    } else if (notif.type === 'nouveau_message' && notif.data?.conversationId) {
      router.push({
        pathname: '/(app)/conversation/[id]',
        params: { id: notif.data.conversationId },
      });
    } else if ((notif.type === 'nouveau_commentaire' || notif.type === 'like_commentaire' || notif.type === 'nouveau_like') && notif.data?.publicationId) {
      // Naviguer vers le feed avec la publication concernée
      router.push({
        pathname: '/(app)/accueil',
        params: { publicationId: notif.data.publicationId },
      });
    } else if (notif.type === 'support_reponse' && notif.data?.ticketId) {
      router.push({
        pathname: '/(app)/support',
        params: { ticketId: notif.data.ticketId },
      });
    }
  };

  // Marquer toutes comme lues
  const handleMarquerToutesLues = async () => {
    try {
      const reponse = await marquerToutesLues();
      if (reponse.succes) {
        setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
    }
  };

  // Supprimer une notification
  const handleSupprimer = async (notifId: string) => {
    try {
      const reponse = await supprimerNotification(notifId);
      if (reponse.succes) {
        setNotifications(prev => prev.filter(n => n._id !== notifId));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer la notification');
    }
  };

  // Accepter une demande d'ami depuis la notification
  const handleAccepterDemande = async (notif: Notification) => {
    if (!notif.data?.userId) return;

    setActionsEnCours(prev => new Set(prev).add(notif._id));
    try {
      const reponse = await accepterDemandeAmi(notif.data.userId);
      if (reponse.succes) {
        // Supprimer la notification après acceptation
        setNotifications(prev => prev.filter(n => n._id !== notif._id));
        // Rafraîchir les données utilisateur pour mettre à jour nbAmis
        refreshUser();
        Alert.alert('Succès', `Vous êtes maintenant ami avec ${notif.data.userPrenom} !`);
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible d\'accepter la demande');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accepter la demande');
    } finally {
      setActionsEnCours(prev => {
        const newSet = new Set(prev);
        newSet.delete(notif._id);
        return newSet;
      });
    }
  };

  // Refuser une demande d'ami depuis la notification
  const handleRefuserDemande = async (notif: Notification) => {
    if (!notif.data?.userId) return;

    setActionsEnCours(prev => new Set(prev).add(notif._id));
    try {
      const reponse = await refuserDemandeAmi(notif.data.userId);
      if (reponse.succes) {
        // Supprimer la notification après refus
        setNotifications(prev => prev.filter(n => n._id !== notif._id));
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de refuser la demande');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de refuser la demande');
    } finally {
      setActionsEnCours(prev => {
        const newSet = new Set(prev);
        newSet.delete(notif._id);
        return newSet;
      });
    }
  };

  // Obtenir l'icône selon le type de notification
  const getNotifIcon = (type: TypeNotification): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'demande_ami':
        return 'person-add';
      case 'ami_accepte':
        return 'people';
      case 'nouveau_message':
        return 'chatbubble';
      case 'nouveau_commentaire':
        return 'chatbubble-ellipses';
      case 'nouveau_like':
        return 'heart';
      case 'like_commentaire':
        return 'heart';
      case 'projet_update':
        return 'rocket';
      // Types de sanctions
      case 'sanction_ban':
        return 'ban';
      case 'sanction_suspend':
        return 'time';
      case 'sanction_warn':
        return 'warning';
      // Types de levée de sanctions
      case 'sanction_unban':
        return 'checkmark-circle';
      case 'sanction_unsuspend':
        return 'checkmark-circle';
      case 'sanction_unwarn':
        return 'checkmark-circle';
      case 'broadcast':
        return 'megaphone';
      case 'support_reponse':
        return 'headset';
      case 'systeme':
      default:
        return 'notifications';
    }
  };

  // Icône broadcast spécifique selon le badge
  const getBroadcastIconForBadge = (badge?: string): keyof typeof Ionicons.glyphMap => {
    switch (badge) {
      case 'maintenance': return 'construct';
      case 'mise_a_jour': return 'sparkles';
      case 'evenement': return 'calendar';
      case 'important': return 'alert-circle';
      case 'actu':
      default: return 'megaphone';
    }
  };

  // Obtenir la couleur selon le type
  const getNotifColor = (type: TypeNotification): string => {
    switch (type) {
      case 'demande_ami':
        return couleurs.primaire;
      case 'ami_accepte':
        return couleurs.succes;
      case 'nouveau_message':
        return '#3B82F6';
      case 'nouveau_like':
        return couleurs.danger;
      case 'like_commentaire':
        return couleurs.danger;
      case 'nouveau_commentaire':
        return '#8B5CF6';
      case 'projet_update':
        return '#F59E0B';
      // Types de sanctions
      case 'sanction_ban':
        return couleurs.danger;
      case 'sanction_suspend':
        return '#F59E0B'; // Orange/Alerte
      case 'sanction_warn':
        return '#FBBF24'; // Jaune/Warning
      // Types de levée de sanctions (vert/succès)
      case 'sanction_unban':
        return couleurs.succes;
      case 'sanction_unsuspend':
        return couleurs.succes;
      case 'sanction_unwarn':
        return couleurs.succes;
      case 'broadcast':
        return '#7C5CFF'; // Violet primaire
      case 'support_reponse':
        return '#3B82F6'; // Bleu
      default:
        return couleurs.texteSecondaire;
    }
  };

  // Couleur broadcast selon le badge
  const getBroadcastColor = (badge?: string): string => {
    switch (badge) {
      case 'maintenance': return '#F59E0B'; // Amber
      case 'mise_a_jour': return '#10B981'; // Emerald
      case 'evenement': return '#8B5CF6'; // Purple
      case 'important': return '#EF4444'; // Red
      case 'actu':
      default: return '#3B82F6'; // Blue
    }
  };

  // Vérifier si c'est une notification de sanction
  const isSanctionNotif = (type: TypeNotification): boolean => {
    return type.startsWith('sanction_');
  };

  // Formater la date relative
  const formatDateRelative = (dateStr: string) => {
    const date = new Date(dateStr);
    const maintenant = new Date();
    const diff = maintenant.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const heures = Math.floor(diff / (1000 * 60 * 60));
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (heures < 24) return `Il y a ${heures}h`;
    if (jours === 1) return 'Hier';
    if (jours < 7) return `Il y a ${jours}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Label du badge broadcast
  const getBroadcastLabel = (badge?: string): string => {
    switch (badge) {
      case 'maintenance': return 'Maintenance';
      case 'mise_a_jour': return 'Mise à jour';
      case 'evenement': return 'Événement';
      case 'important': return 'Important';
      case 'actu':
      default: return 'Actualité';
    }
  };

  // Long press pour supprimer une notification
  const handleLongPress = (notif: Notification) => {
    Alert.alert(
      'Supprimer',
      'Supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => handleSupprimer(notif._id) },
      ]
    );
  };

  // Render notification item
  const renderNotification = ({ item }: { item: Notification }) => {
    const estEnCours = actionsEnCours.has(item._id);
    const estDemandeAmi = item.type === 'demande_ami';
    const estBroadcast = item.type === 'broadcast';
    const broadcastColor = estBroadcast ? getBroadcastColor(item.data?.broadcastBadge) : getNotifColor(item.type);
    const broadcastIcon = estBroadcast ? getBroadcastIconForBadge(item.data?.broadcastBadge) : getNotifIcon(item.type);

    return (
      <SwipeLeftToDelete onDelete={() => handleSupprimer(item._id)}>
        <AnimatedPressable
          style={[
            styles.notifItem,
            !item.lue && styles.notifItemNonLue,
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => handleLongPress(item)}
          scaleOnPress={0.98}
        >
          {/* Avatar ou icône */}
          <View style={styles.notifIconContainer}>
            {!estBroadcast && item.data?.userPrenom ? (
              <Avatar
                uri={item.data.userAvatar}
                prenom={item.data.userPrenom}
                nom={item.data.userNom}
                taille={48}
                gradientColors={[broadcastColor, couleurs.primaireDark]}
              />
            ) : (
              <View style={[styles.notifIconBg, { backgroundColor: broadcastColor + '20' }]}>
                <Ionicons
                  name={broadcastIcon}
                  size={22}
                  color={broadcastColor}
                />
              </View>
            )}
            {/* Badge type */}
            <View style={[styles.notifTypeBadge, { backgroundColor: broadcastColor }]}>
              <Ionicons name={broadcastIcon} size={10} color={couleurs.blanc} />
            </View>
          </View>

          {/* Contenu */}
          <View style={styles.notifContent}>
            {/* Badge label pour broadcast */}
            {estBroadcast && (
              <View style={[styles.broadcastBadge, { backgroundColor: broadcastColor + '20' }]}>
                <Ionicons name={broadcastIcon} size={10} color={broadcastColor} />
                <Text style={[styles.broadcastBadgeText, { color: broadcastColor }]}>
                  {getBroadcastLabel(item.data?.broadcastBadge)}
                </Text>
              </View>
            )}
            <Text style={[styles.notifMessage, !item.lue && styles.notifMessageNonLu]}>
              {estBroadcast ? item.titre : item.message}
            </Text>
            {estBroadcast && item.message && (
              <Text style={styles.notifSubMessage} numberOfLines={2}>
                {item.message}
              </Text>
            )}
            <Text style={styles.notifDate}>{formatDateRelative(item.dateCreation)}</Text>
          </View>

          {/* Actions rapides pour demande d'ami */}
          {estDemandeAmi && (
            <View style={styles.notifActions}>
              {estEnCours ? (
                <ActivityIndicator size="small" color={couleurs.primaire} />
              ) : (
                <>
                  <Pressable
                    style={styles.actionAccepter}
                    onPress={() => handleAccepterDemande(item)}
                  >
                    <Ionicons name="checkmark" size={18} color={couleurs.blanc} />
                  </Pressable>
                  <Pressable
                    style={styles.actionRefuser}
                    onPress={() => handleRefuserDemande(item)}
                  >
                    <Ionicons name="close" size={18} color={couleurs.blanc} />
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* Indicateur non lu */}
          {!item.lue && <View style={styles.notifIndicateur} />}
        </AnimatedPressable>
      </SwipeLeftToDelete>
    );
  };

  // Compter les non lues
  const nbNonLues = notifications.filter(n => !n.lue).length;

  return (
    <SwipeableScreen edgeWidth={Dimensions.get('window').width}>
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {nbNonLues > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{nbNonLues}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={nbNonLues > 0 ? handleMarquerToutesLues : undefined}
          style={[styles.headerAction, nbNonLues === 0 && styles.headerActionDisabled]}
          disabled={nbNonLues === 0}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={nbNonLues > 0 ? couleurs.primaire : couleurs.texteMuted}
          />
        </Pressable>
      </View>

      {/* Liste des notifications */}
      {chargement ? (
        <View style={styles.loadingContainer}>
          <SkeletonList type="notification" count={5} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color={couleurs.texteMuted} />
          <Text style={styles.emptyText}>Aucune notification</Text>
          <Text style={styles.emptySubtext}>
            Vous recevrez des notifications pour les demandes d'amis et autres interactions.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          windowSize={10}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={() => chargerNotifications(true)}
              tintColor={couleurs.primaire}
              colors={[couleurs.primaire]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
    </SwipeableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  headerTitle: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  headerBadge: {
    backgroundColor: couleurs.danger,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionDisabled: {
    opacity: 0.4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  emptyText: {
    fontSize: typographie.tailles.lg,
    color: couleurs.texteSecondaire,
    marginTop: espacements.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteMuted,
    marginTop: espacements.sm,
    textAlign: 'center',
    paddingHorizontal: espacements.xl,
  },
  listContent: {
    paddingBottom: espacements.xl,
  },
  separator: {
    height: 1,
    backgroundColor: couleurs.bordure,
  },
  // Notification item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
    backgroundColor: couleurs.fond,
  },
  notifItemNonLue: {
    backgroundColor: couleurs.primaireLight,
  },
  notifIconContainer: {
    position: 'relative',
  },
  notifAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  notifAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifAvatarInitiales: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  notifIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    lineHeight: 20,
  },
  notifMessageNonLu: {
    fontWeight: typographie.poids.medium,
  },
  notifSubMessage: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginTop: 2,
  },
  notifDate: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginTop: 4,
  },
  broadcastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  broadcastBadgeText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
  },
  notifIndicateur: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.primaire,
  },
  // Actions rapides
  notifActions: {
    flexDirection: 'row',
    gap: espacements.xs,
  },
  actionAccepter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: couleurs.succes,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRefuser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: couleurs.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
