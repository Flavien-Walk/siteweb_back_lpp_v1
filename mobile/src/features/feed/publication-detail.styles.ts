import { StyleSheet, Dimensions } from 'react-native';
import { espacements, rayons, typographie } from '../../constantes/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const createStyles = (couleurs: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
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
    headerTitle: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: espacements.xxl,
    },
    errorText: {
      fontSize: typographie.tailles.base,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      marginTop: espacements.md,
    },
    retryBtn: {
      marginTop: espacements.lg,
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.md,
    },
    retryBtnText: {
      color: couleurs.blanc,
      fontWeight: typographie.poids.semibold,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: espacements.xxl,
    },

    // Auteur
    authorSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: espacements.md,
      gap: espacements.md,
    },
    authorInfo: {
      flex: 1,
    },
    authorNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
    },
    authorName: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    adminBadge: {
      backgroundColor: '#dc2626',
      borderRadius: 4,
      padding: 2,
    },
    postDate: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },

    // Media
    mediaContainer: {
      width: SCREEN_WIDTH,
      backgroundColor: couleurs.fondCard,
    },
    mediaImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
    },
    videoThumbnailContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
      position: 'relative',
    },
    videoPlayOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    videoPlayButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },

    // Contenu
    postContent: {
      fontSize: typographie.tailles.base,
      color: couleurs.texte,
      lineHeight: 22,
      padding: espacements.md,
    },

    // Stats et actions
    statsRow: {
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    statsText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },
    actionsRow: {
      flexDirection: 'row',
      paddingVertical: espacements.sm,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.xs,
      paddingVertical: espacements.sm,
    },
    actionText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
      fontWeight: typographie.poids.medium,
    },

    // Commentaires
    commentsSection: {
      padding: espacements.md,
    },
    commentsSectionTitle: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
      marginBottom: espacements.md,
    },
    composerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    composerTitle: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.medium,
      color: couleurs.texteSecondaire,
    },
    closeComposerBtn: {
      padding: espacements.xs,
    },
    replyingToContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      flex: 1,
    },
    replyingToText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
    },
    replyingToName: {
      fontWeight: typographie.poids.semibold,
      color: couleurs.primaire,
    },
    bottomInputWrapper: {
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
      backgroundColor: couleurs.fond,
      paddingHorizontal: espacements.md,
      paddingTop: espacements.sm,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    commentInput: {
      flex: 1,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      maxHeight: 100,
    },
    commentSendBtn: {
      padding: espacements.sm,
    },
    commentSendBtnDisabled: {
      opacity: 0.5,
    },
    noComments: {
      alignItems: 'center',
      paddingVertical: espacements.xl,
      gap: espacements.sm,
    },
    noCommentsText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },

    // Comment item
    commentItem: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
    },
    commentBubbleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    commentAuteur: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    commentActionsMenu: {
      flexDirection: 'row',
      gap: espacements.xs,
    },
    commentActionBtn: {
      padding: 4,
    },
    commentTexte: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      lineHeight: 18,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginTop: espacements.xs,
      paddingLeft: espacements.sm,
    },
    commentTime: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
    },
    commentModified: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
      fontStyle: 'italic',
    },
    commentReplyBtn: {
      paddingVertical: 2,
    },
    commentReplyText: {
      fontSize: typographie.tailles.xs,
      color: couleurs.primaire,
      fontWeight: typographie.poids.medium,
    },
    viewRepliesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginTop: espacements.sm,
    },
    viewRepliesText: {
      fontSize: typographie.tailles.xs,
      color: couleurs.primaire,
    },

    // Replies
    replyItem: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginTop: espacements.sm,
      marginLeft: espacements.md,
    },
    replyLine: {
      width: 2,
      backgroundColor: couleurs.bordure,
      marginRight: espacements.sm,
    },
    replyBubble: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
    },

    // Edit comment
    editCommentContainer: {
      gap: espacements.sm,
    },
    editCommentInput: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      borderWidth: 1,
      borderColor: couleurs.primaire,
    },
    editCommentActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: espacements.sm,
    },
    editCancelBtn: {
      paddingVertical: espacements.xs,
      paddingHorizontal: espacements.md,
    },
    editCancelText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },
    editSaveBtn: {
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.sm,
      paddingVertical: espacements.xs,
      paddingHorizontal: espacements.md,
    },
    editSaveBtnDisabled: {
      opacity: 0.5,
    },
    editSaveText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.blanc,
      fontWeight: typographie.poids.medium,
    },
  });
