/**
 * Centre de Notifications - Style Instagram
 * Avec actions rapides pour demandes d'amis
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';

import { couleurs, espacements, rayons, typographie } from '../../src/constantes/theme';
import { Avatar, AnimatedPressable, SkeletonList } from '../../src/composants';
import { ANIMATION_CONFIG } from '../../src/hooks/useAnimations';
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

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  // Rafraîchir quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      chargerNotifications(false);
    }, [chargerNotifications])
  );

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
    } else if ((notif.type === 'nouveau_commentaire' || notif.type === 'like_commentaire') && notif.data?.publicationId) {
      // Naviguer vers le feed avec la publication concernée
      router.push({
        pathname: '/(app)/accueil',
        params: { publicationId: notif.data.publicationId },
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
      case 'systeme':
      default:
        return 'notifications';
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
      default:
        return couleurs.texteSecondaire;
    }
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

  // Render swipe action (supprimer)
  const renderRightActions = (notifId: string, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.swipeActionDelete}
          onPress={() => handleSupprimer(notifId)}
        >
          <Ionicons name="trash-outline" size={22} color={couleurs.blanc} />
        </Pressable>
      </Animated.View>
    );
  };

  // Render notification item
  const renderNotification = ({ item }: { item: Notification }) => {
    const estEnCours = actionsEnCours.has(item._id);
    const estDemandeAmi = item.type === 'demande_ami';

    return (
      <Swipeable
        renderRightActions={(progress) => renderRightActions(item._id, progress)}
        overshootRight={false}
        friction={2}
      >
        <AnimatedPressable
          style={[
            styles.notifItem,
            !item.lue && styles.notifItemNonLue,
          ]}
          onPress={() => handleNotificationPress(item)}
          scaleOnPress={0.98}
        >
          {/* Avatar ou icône */}
          <View style={styles.notifIconContainer}>
            {item.data?.userPrenom ? (
              <Avatar
                uri={item.data.userAvatar}
                prenom={item.data.userPrenom}
                nom={item.data.userNom}
                taille={48}
                gradientColors={[getNotifColor(item.type), couleurs.primaireDark]}
              />
            ) : (
              <View style={[styles.notifIconBg, { backgroundColor: getNotifColor(item.type) + '20' }]}>
                <Ionicons
                  name={getNotifIcon(item.type)}
                  size={22}
                  color={getNotifColor(item.type)}
                />
              </View>
            )}
            {/* Badge type */}
            <View style={[styles.notifTypeBadge, { backgroundColor: getNotifColor(item.type) }]}>
              <Ionicons name={getNotifIcon(item.type)} size={10} color={couleurs.blanc} />
            </View>
          </View>

          {/* Contenu */}
          <View style={styles.notifContent}>
            <Text style={[styles.notifMessage, !item.lue && styles.notifMessageNonLu]}>
              {item.message}
            </Text>
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
      </Swipeable>
    );
  };

  // Compter les non lues
  const nbNonLues = notifications.filter(n => !n.lue).length;

  return (
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
        {nbNonLues > 0 && (
          <Pressable onPress={handleMarquerToutesLues} style={styles.headerAction}>
            <Ionicons name="checkmark-done-outline" size={22} color={couleurs.primaire} />
          </Pressable>
        )}
        {nbNonLues === 0 && <View style={{ width: 40 }} />}
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
  notifDate: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginTop: 4,
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
  // Swipe action
  swipeAction: {
    width: 80,
  },
  swipeActionDelete: {
    flex: 1,
    backgroundColor: couleurs.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
