/**
 * MoreActionsSheet - Bottom sheet factorise pour signalement / actions
 *
 * Utilise partout : PublicationCard (feed), AdCard (feed), ReelsVideoPage (plein ecran)
 * Adapte le titre et les options selon contentType ('post' | 'ad')
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useStaff } from '../hooks/useStaff';
import { signalerContenu, RaisonSignalement } from '../services/publications';
import { espacements, rayons } from '../constantes/theme';

// ============ TYPES ============

interface MoreActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  contentType: 'post' | 'ad';
  contentId: string;
  // Post-specific (ignores pour ads)
  isOwnPost?: boolean;
  onEditPost?: () => void;
  onDeletePost?: () => void;
  onStaffModerate?: () => void;
  onStaffSanction?: () => void;
  // Feedback
  onReport?: (success: boolean, message: string) => void;
}

// ============ CONSTANTES ============

const RAISONS_SIGNALEMENT: { value: RaisonSignalement; label: string; icon: string }[] = [
  { value: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { value: 'harcelement', label: 'Harcèlement', icon: 'warning-outline' },
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié', icon: 'eye-off-outline' },
  { value: 'fausse_info', label: 'Fausse information', icon: 'information-circle-outline' },
  { value: 'autre', label: 'Autre', icon: 'flag-outline' },
];

// ============ COMPONENT ============

const MoreActionsSheet: React.FC<MoreActionsSheetProps> = ({
  visible,
  onClose,
  contentType,
  contentId,
  isOwnPost = false,
  onEditPost,
  onDeletePost,
  onStaffModerate,
  onStaffSanction,
  onReport,
}) => {
  const { couleurs } = useTheme();
  const staff = useStaff();

  // ---- Titre adaptatif ----
  const title = useMemo(() => {
    if (contentType === 'ad') return 'Signaler cette publicité';
    if (isOwnPost) return 'Options du post';
    if (staff.isStaff) return 'Actions disponibles';
    return 'Signaler ce post';
  }, [contentType, isOwnPost, staff.isStaff]);

  // ---- Sous-titre report ----
  const reportSubtitle = useMemo(() => {
    if (contentType === 'ad') return 'Pourquoi signalez-vous cette publicité ?';
    if (staff.isStaff) return 'Ou signaler manuellement :';
    return 'Pourquoi signalez-vous cette publication ?';
  }, [contentType, staff.isStaff]);

  // ---- Report handler ----
  const handleReport = useCallback(async (raison: RaisonSignalement) => {
    onClose();
    try {
      const reponse = await signalerContenu(contentType, contentId, raison);
      if (reponse.succes) {
        onReport?.(true, 'Merci, signalement envoyé');
      } else {
        onReport?.(false, reponse.message || 'Erreur lors du signalement');
      }
    } catch {
      onReport?.(false, 'Impossible de signaler ce contenu');
    }
  }, [contentType, contentId, onClose, onReport]);

  // ---- Afficher la section staff ? ----
  const showStaffSection = contentType === 'post' && staff.isStaff && !isOwnPost;

  // ---- Afficher les raisons de signalement ? ----
  const showReportReasons = contentType === 'ad' || !isOwnPost;

  // ---- Styles dynamiques ----
  const dynamicStyles = useMemo(() => createStyles(couleurs), [couleurs]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={dynamicStyles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={dynamicStyles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Poignee */}
          <View style={dynamicStyles.handle} />

          <ScrollView
            style={dynamicStyles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Titre */}
            <Text style={dynamicStyles.title}>{title}</Text>

            {/* ---- Options proprietaire (post uniquement) ---- */}
            {contentType === 'post' && isOwnPost && (
              <>
                <Pressable
                  style={({ pressed }) => [
                    dynamicStyles.item,
                    pressed && dynamicStyles.itemPressed,
                  ]}
                  onPress={onEditPost}
                >
                  <View style={[dynamicStyles.iconContainer, { backgroundColor: couleurs.primaireLight }]}>
                    <Ionicons name="pencil" size={20} color={couleurs.primaire} />
                  </View>
                  <View style={dynamicStyles.textContainer}>
                    <Text style={dynamicStyles.itemText}>Modifier</Text>
                    <Text style={dynamicStyles.itemSubtext}>Éditer le contenu de votre publication</Text>
                  </View>
                </Pressable>

                <View style={dynamicStyles.separator} />

                <Pressable
                  style={({ pressed }) => [
                    dynamicStyles.item,
                    pressed && dynamicStyles.itemPressed,
                  ]}
                  onPress={onDeletePost}
                >
                  <View style={[dynamicStyles.iconContainer, { backgroundColor: 'rgba(255, 77, 109, 0.15)' }]}>
                    <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
                  </View>
                  <View style={dynamicStyles.textContainer}>
                    <Text style={[dynamicStyles.itemText, { color: couleurs.danger }]}>Supprimer</Text>
                    <Text style={dynamicStyles.itemSubtext}>Cette action est irréversible</Text>
                  </View>
                </Pressable>
              </>
            )}

            {/* ---- Section staff (post uniquement, pas son propre post) ---- */}
            {showStaffSection && (
              <>
                <View style={dynamicStyles.staffBadge}>
                  <Ionicons name="shield" size={14} color="#6366f1" />
                  <Text style={dynamicStyles.staffBadgeText}>MODÉRATION</Text>
                </View>

                {(staff.canHideContent || staff.canDeleteContent) && (
                  <Pressable
                    style={({ pressed }) => [
                      dynamicStyles.item,
                      pressed && dynamicStyles.itemPressed,
                    ]}
                    onPress={onStaffModerate}
                  >
                    <View style={[dynamicStyles.iconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                    </View>
                    <View style={dynamicStyles.textContainer}>
                      <Text style={dynamicStyles.itemText}>Modérer ce contenu</Text>
                      <Text style={dynamicStyles.itemSubtext}>Masquer ou supprimer la publication</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                  </Pressable>
                )}

                {(staff.canWarnUsers || staff.canSuspendUsers || staff.canBanUsers) && (
                  <Pressable
                    style={({ pressed }) => [
                      dynamicStyles.item,
                      pressed && dynamicStyles.itemPressed,
                    ]}
                    onPress={onStaffSanction}
                  >
                    <View style={[dynamicStyles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="person-outline" size={20} color="#ef4444" />
                    </View>
                    <View style={dynamicStyles.textContainer}>
                      <Text style={dynamicStyles.itemText}>Sanctionner l'auteur</Text>
                      <Text style={dynamicStyles.itemSubtext}>Avertir, suspendre ou bannir</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                  </Pressable>
                )}

                <View style={dynamicStyles.separator} />
              </>
            )}

            {/* ---- Raisons de signalement ---- */}
            {showReportReasons && (
              <>
                <Text style={[
                  dynamicStyles.subtitle,
                  showStaffSection && { marginTop: 8 },
                ]}>
                  {reportSubtitle}
                </Text>

                {RAISONS_SIGNALEMENT.map((raison, index) => (
                  <Pressable
                    key={raison.value}
                    style={({ pressed }) => [
                      dynamicStyles.item,
                      pressed && dynamicStyles.itemPressed,
                      index === RAISONS_SIGNALEMENT.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleReport(raison.value)}
                  >
                    <View style={[dynamicStyles.iconContainer, { backgroundColor: 'rgba(255, 189, 89, 0.15)' }]}>
                      <Ionicons name={raison.icon as any} size={20} color={couleurs.accent} />
                    </View>
                    <View style={dynamicStyles.textContainer}>
                      <Text style={dynamicStyles.itemText}>{raison.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>

          {/* Bouton Annuler */}
          <Pressable
            style={({ pressed }) => [
              dynamicStyles.cancelBtn,
              pressed && dynamicStyles.itemPressed,
            ]}
            onPress={onClose}
          >
            <Text style={dynamicStyles.cancelText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============ STYLES ============

const createStyles = (couleurs: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: couleurs.fondCard,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    paddingTop: espacements.sm,
    paddingBottom: espacements.xl,
    paddingHorizontal: espacements.lg,
    maxHeight: '85%',
  },
  scroll: {
    maxHeight: 400,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: couleurs.bordure,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: espacements.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  subtitle: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.lg,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: espacements.md,
  },
  staffBadgeText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    gap: espacements.md,
  },
  itemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
  },
  itemSubtext: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: espacements.sm,
  },
  cancelBtn: {
    marginTop: espacements.lg,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
});

export default MoreActionsSheet;
