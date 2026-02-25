import { StyleSheet, Platform } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../../constantes/theme';

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    gap: espacements.sm,
  },
  headerBack: {
    padding: espacements.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
  },
  headerTexts: {
    flex: 1,
  },
  headerNom: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  headerSousTitre: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  headerAction: {
    padding: espacements.sm,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: espacements.md,
    paddingBottom: espacements.md,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
  },
  emptyMessagesText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
    textAlign: 'center',
  },
  dateSeparator: {
    textAlign: 'center',
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    marginVertical: espacements.md,
    textTransform: 'capitalize',
  },
  messageSysteme: {
    alignSelf: 'center',
    backgroundColor: couleurs.fondCard,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    marginVertical: espacements.sm,
  },
  messageSystemeText: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  // Swipeable container
  swipeableContainer: {
    position: 'relative',
  },
  swipeReplyIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -10,
    zIndex: -1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: espacements.sm,
    alignItems: 'flex-end',
  },
  messageRowMoi: {
    justifyContent: 'flex-end',
  },
  messageAvatarContainer: {
    marginRight: espacements.xs,
  },
  messageAvatarSpacer: {
    width: 36,
    marginLeft: espacements.xs,
  },
  // Message content wrapper - alignement sans maxWidth
  messageContentWrapper: {
    flexShrink: 1,
    maxWidth: '80%',
  },
  messageContentWrapperMoi: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  messageBubbleMoi: {
    backgroundColor: couleurs.primaire,
    borderBottomRightRadius: rayons.xs,
  },
  messageBubbleAutre: {
    backgroundColor: couleurs.fondCard,
    borderBottomLeftRadius: rayons.xs,
  },
  messageBubbleMedia: {
    padding: 0,
    overflow: 'hidden',
  },
  messageAuteur: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
    marginBottom: 2,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
  },
  messageTexte: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    lineHeight: 22,
  },
  messageTexteMoi: {
    color: couleurs.blanc,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: rayons.lg,
  },
  messageVideoContainer: {
    width: 220,
    height: 220,
    borderRadius: rayons.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageFooterMedia: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rayons.sm,
  },
  messageModifie: {
    fontSize: 10,
    fontStyle: 'italic',
    color: couleurs.texteMuted,
  },
  messageModifieMoi: {
    color: 'rgba(255,255,255,0.6)',
  },
  messageHeure: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
  },
  messageHeureMoi: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageHeureMedia: {
    color: couleurs.blanc,
  },
  messageCheckmark: {
    marginLeft: 2,
  },
  // Reply preview dans la bulle
  replyToPreview: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: rayons.md,
    padding: espacements.sm,
    marginBottom: espacements.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyToPreviewMoi: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyToBar: {
    width: 3,
    height: 32,
    backgroundColor: couleurs.primaire,
    borderRadius: 2,
    marginRight: espacements.sm,
  },
  replyToContent: {
    flex: 1,
  },
  replyToAuthor: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  replyToAuthorMoi: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyToText: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  // Réactions sous la bulle
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionsContainerMoi: {
    justifyContent: 'flex-end',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginLeft: 2,
  },
  // Bottom area (reply + draft + input)
  bottomArea: {
    backgroundColor: couleurs.fond,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  // Reply bar au-dessus de l'input
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCard,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarIndicator: {
    width: 3,
    height: 36,
    backgroundColor: couleurs.primaire,
    borderRadius: 2,
    marginRight: espacements.sm,
  },
  replyBarInfo: {
    flex: 1,
  },
  replyBarAuthor: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.primaire,
  },
  replyBarText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  replyBarClose: {
    padding: espacements.xs,
  },
  // Draft média preview
  draftPreview: {
    backgroundColor: couleurs.fondCard,
    padding: espacements.md,
    alignItems: 'center',
  },
  draftMediaContainer: {
    position: 'relative',
    borderRadius: rayons.md,
    overflow: 'hidden',
  },
  draftMediaImage: {
    width: 150,
    height: 150,
    borderRadius: rayons.md,
  },
  draftVideoContainer: {
    position: 'relative',
  },
  draftVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: rayons.md,
  },
  draftVideoDuration: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    marginTop: 4,
  },
  draftCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: rayons.full,
  },
  draftHint: {
    marginTop: espacements.sm,
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.sm,
  },
  inputAction: {
    padding: espacements.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.xl,
    paddingHorizontal: espacements.md,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    paddingVertical: Platform.OS === 'ios' ? espacements.sm : espacements.xs,
    paddingTop: Platform.OS === 'android' ? espacements.sm : undefined,
    minHeight: 24,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: couleurs.primaire,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  // Modal d'édition
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacements.lg,
  },
  modalContent: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  modalSubtitle: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    padding: espacements.md,
    fontSize: typographie.tailles.base,
    color: couleurs.texte,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: espacements.lg,
    gap: espacements.md,
  },
  modalCancelBtn: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
  },
  modalCancelText: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
  },
  modalSaveBtn: {
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  // Picker réactions
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    width: '90%',
    maxWidth: 350,
  },
  reactionPickerContent: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.md,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: espacements.sm,
  },
  reactionPickerItem: {
    padding: espacements.sm,
    borderRadius: rayons.full,
  },
  reactionPickerItemSelected: {
    backgroundColor: couleurs.fondCard,
  },
  reactionPickerEmoji: {
    fontSize: 28,
  },
  reactionPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
    marginTop: espacements.sm,
  },
  reactionPickerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.sm,
    gap: espacements.xs,
  },
  reactionPickerActionText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
  },
  // Typing indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.xs,
    backgroundColor: couleurs.fond,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: espacements.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.texteMuted,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteMuted,
    fontStyle: 'italic',
  },
});

export default createStyles;
