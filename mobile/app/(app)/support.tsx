/**
 * Ecran Support - Tickets de support utilisateur
 * 3 vues : liste des tickets, creation de ticket, detail/conversation
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import {
  creerTicket,
  listerMesTickets,
  getMonTicket,
  ajouterMessage,
  CATEGORY_LABELS,
  STATUS_LABELS,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
} from '../../src/services/support';
import { espacements, rayons, typographie, couleurs as defaultCouleurs } from '../../src/constantes/theme';

type ViewMode = 'list' | 'create' | 'detail';

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  en_attente: { bg: 'rgba(255, 189, 89, 0.15)', text: '#FFBD59' },
  en_cours: { bg: 'rgba(45, 126, 230, 0.15)', text: '#2D7EE6' },
  termine: { bg: 'rgba(0, 214, 143, 0.15)', text: '#00D68F' },
};

const CATEGORIES: TicketCategory[] = ['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre'];

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
  },
  backButton: { padding: espacements.xs, marginRight: espacements.md },
  headerTitle: { fontSize: typographie.tailles.lg, fontWeight: typographie.poids.semibold, flex: 1 },
  headerAction: { padding: espacements.xs },

  // List
  listContent: { padding: espacements.lg, paddingBottom: espacements.xxxl },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    padding: espacements.md,
    borderRadius: rayons.lg,
    marginBottom: espacements.lg,
  },
  newTicketText: { fontSize: typographie.tailles.sm, fontWeight: typographie.poids.semibold },
  ticketCard: {
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.md,
    borderWidth: 1,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: espacements.sm },
  ticketSubject: { fontSize: typographie.tailles.base, fontWeight: typographie.poids.semibold, flex: 1, marginRight: espacements.sm },
  statusBadge: { paddingHorizontal: espacements.sm, paddingVertical: 2, borderRadius: rayons.full },
  statusText: { fontSize: typographie.tailles.xs, fontWeight: typographie.poids.medium },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: espacements.md, marginTop: espacements.xs },
  categoryBadge: { paddingHorizontal: espacements.sm, paddingVertical: 2, borderRadius: rayons.sm, borderWidth: 1 },
  categoryText: { fontSize: typographie.tailles.xs },
  dateText: { fontSize: typographie.tailles.xs },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacements.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: espacements.lg },
  emptyTitle: { fontSize: typographie.tailles.lg, fontWeight: typographie.poids.semibold, marginBottom: espacements.sm, textAlign: 'center' },
  emptyText: { fontSize: typographie.tailles.sm, textAlign: 'center', lineHeight: 20 },

  // Create form
  formContent: { padding: espacements.lg },
  formLabel: { fontSize: typographie.tailles.sm, fontWeight: typographie.poids.semibold, marginBottom: espacements.sm, marginTop: espacements.lg },
  input: {
    borderWidth: 1,
    borderRadius: rayons.lg,
    padding: espacements.md,
    fontSize: typographie.tailles.base,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.sm },
  categoryBtn: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.lg,
    borderWidth: 1,
  },
  categoryBtnText: { fontSize: typographie.tailles.sm },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    padding: espacements.md,
    borderRadius: rayons.lg,
    marginTop: espacements.xl,
  },
  submitBtnText: { fontSize: typographie.tailles.base, fontWeight: typographie.poids.semibold },

  // Detail / Conversation
  messagesContainer: { flex: 1, padding: espacements.lg },
  messageBubble: { maxWidth: '80%', borderRadius: rayons.lg, padding: espacements.md, marginBottom: espacements.md },
  messageUser: { alignSelf: 'flex-end' },
  messageStaff: { alignSelf: 'flex-start' },
  messageSender: { fontSize: typographie.tailles.xs, fontWeight: typographie.poids.semibold, marginBottom: 4 },
  messageContent: { fontSize: typographie.tailles.sm, lineHeight: 20 },
  messageDate: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: espacements.md,
    borderTopWidth: 1,
    gap: espacements.sm,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: typographie.tailles.sm,
    maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    padding: espacements.md,
    borderTopWidth: 1,
  },
  closedText: { fontSize: typographie.tailles.sm },

  // Loader
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacements.xl },
  errorIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 77, 109, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: espacements.lg },
  errorText: { fontSize: typographie.tailles.base, textAlign: 'center', marginBottom: espacements.lg },
  retryButton: { paddingHorizontal: espacements.xl, paddingVertical: espacements.md, borderRadius: rayons.lg },
  retryButtonText: { fontSize: typographie.tailles.sm, fontWeight: typographie.poids.semibold },

  detailHeader: {
    padding: espacements.lg,
    borderBottomWidth: 1,
  },
  detailSubject: { fontSize: typographie.tailles.lg, fontWeight: typographie.poids.semibold, marginBottom: espacements.sm },
  detailBadges: { flexDirection: 'row', gap: espacements.sm, flexWrap: 'wrap' },
});

export default function SupportScreen() {
  const { couleurs } = useTheme();
  const colors = couleurs || defaultCouleurs;
  const { tokenReady, userHydrated, isAuthenticated } = useUser();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [message, setMessage] = useState('');

  // Detail message input
  const [replyMessage, setReplyMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const isHydrated = tokenReady && userHydrated;

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!isHydrated || !isAuthenticated) return;
    try {
      setError(null);
      const response = await listerMesTickets();
      if (response.succes && response.data) {
        setTickets(response.data.tickets || []);
      } else {
        setError(response.message || 'Erreur lors du chargement');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    if (isHydrated) fetchTickets();
  }, [isHydrated, fetchTickets]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  // Open ticket detail
  const openTicket = useCallback(async (ticketId: string) => {
    setIsLoading(true);
    try {
      const response = await getMonTicket(ticketId);
      if (response.succes && response.data) {
        setSelectedTicket(response.data.ticket);
        setViewMode('detail');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      } else {
        setError(response.message || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create ticket
  const handleCreateTicket = useCallback(async () => {
    if (!subject.trim() || !category || !message.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await creerTicket({ subject: subject.trim(), category, message: message.trim() });
      if (response.succes && response.data) {
        setSubject('');
        setCategory(null);
        setMessage('');
        setViewMode('list');
        fetchTickets();
      } else {
        setError(response.message || 'Erreur lors de la creation');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  }, [subject, category, message, fetchTickets]);

  // Send reply
  const handleSendReply = useCallback(async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setIsSubmitting(true);
    try {
      const response = await ajouterMessage(selectedTicket._id, replyMessage.trim());
      if (response.succes && response.data) {
        setSelectedTicket(response.data.ticket);
        setReplyMessage('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setError(response.message || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  }, [replyMessage, selectedTicket]);

  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Handle back
  const handleBack = () => {
    if (viewMode === 'create' || viewMode === 'detail') {
      setViewMode('list');
      setSelectedTicket(null);
      setError(null);
      fetchTickets();
    } else {
      router.back();
    }
  };

  // ============ LOADING STATE ============
  if (!isHydrated || (isLoading && viewMode === 'list' && tickets.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.fond }]}>
        <LinearGradient colors={[colors.fond, colors.fondSecondaire || colors.fond, colors.fond]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.texte} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.texte }]}>Support</Text>
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primaire} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============ CREATE VIEW ============
  if (viewMode === 'create') {
    const canSubmit = subject.trim().length > 0 && category !== null && message.trim().length > 0;
    return (
      <View style={[styles.container, { backgroundColor: colors.fond }]}>
        <LinearGradient colors={[colors.fond, colors.fondSecondaire || colors.fond, colors.fond]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={colors.texte} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.texte }]}>Nouveau ticket</Text>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formLabel, { color: colors.texte, marginTop: 0 }]}>Sujet</Text>
              <TextInput
                style={[styles.input, { color: colors.texte, borderColor: colors.bordure, backgroundColor: colors.fondCard }]}
                placeholder="Decrivez brievement votre probleme"
                placeholderTextColor={colors.texteMuted}
                value={subject}
                onChangeText={setSubject}
                maxLength={200}
              />

              <Text style={[styles.formLabel, { color: colors.texte }]}>Categorie</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryBtn,
                      {
                        borderColor: category === cat ? colors.primaire : colors.bordure,
                        backgroundColor: category === cat ? colors.primaireLight || 'rgba(124, 92, 255, 0.15)' : 'transparent',
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryBtnText, { color: category === cat ? colors.primaire : colors.texteSecondaire }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.texte }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.texte, borderColor: colors.bordure, backgroundColor: colors.fondCard }]}
                placeholder="Decrivez votre probleme en detail..."
                placeholderTextColor={colors.texteMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={2000}
              />

              <Pressable
                style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primaire : colors.bordure, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={handleCreateTicket}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.blanc || '#FFF'} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={colors.blanc || '#FFF'} />
                    <Text style={[styles.submitBtnText, { color: colors.blanc || '#FFF' }]}>Envoyer</Text>
                  </>
                )}
              </Pressable>

              {error && (
                <Text style={[styles.errorText, { color: colors.erreur || colors.danger, marginTop: espacements.lg, textAlign: 'center' }]}>
                  {error}
                </Text>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ============ DETAIL VIEW ============
  if (viewMode === 'detail' && selectedTicket) {
    const isClosed = selectedTicket.status === 'termine';
    const statusColor = STATUS_COLORS[selectedTicket.status];

    return (
      <View style={[styles.container, { backgroundColor: colors.fond }]}>
        <LinearGradient colors={[colors.fond, colors.fondSecondaire || colors.fond, colors.fond]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={colors.texte} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.texte }]} numberOfLines={1}>
              {selectedTicket.subject}
            </Text>
          </View>

          {/* Ticket info */}
          <View style={[styles.detailHeader, { borderBottomColor: colors.bordure }]}>
            <View style={styles.detailBadges}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {STATUS_LABELS[selectedTicket.status]}
                </Text>
              </View>
              <View style={[styles.categoryBadge, { borderColor: colors.bordure }]}>
                <Text style={[styles.categoryText, { color: colors.texteSecondaire }]}>
                  {CATEGORY_LABELS[selectedTicket.category]}
                </Text>
              </View>
            </View>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={{ paddingBottom: espacements.lg }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {selectedTicket.messages.map((msg, i) => {
                const isUser = msg.senderRole === 'user';
                return (
                  <View
                    key={msg._id || i}
                    style={[
                      styles.messageBubble,
                      isUser ? styles.messageUser : styles.messageStaff,
                      {
                        backgroundColor: isUser
                          ? colors.primaireLight || 'rgba(124, 92, 255, 0.15)'
                          : colors.fondCard,
                      },
                    ]}
                  >
                    {!isUser && (
                      <Text style={[styles.messageSender, { color: colors.primaire }]}>
                        {msg.sender?.prenom} {msg.sender?.nom} (Staff)
                      </Text>
                    )}
                    <Text style={[styles.messageContent, { color: colors.texte }]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.messageDate, { color: colors.texteMuted }]}>
                      {formatDateTime(msg.dateCreation)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Input bar or closed banner */}
            {isClosed ? (
              <View style={[styles.closedBanner, { borderTopColor: colors.bordure }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.succes || defaultCouleurs.succes} />
                <Text style={[styles.closedText, { color: colors.texteSecondaire }]}>
                  Ce ticket est termine
                </Text>
              </View>
            ) : (
              <View style={[styles.inputBar, { borderTopColor: colors.bordure }]}>
                <TextInput
                  style={[styles.messageInput, { color: colors.texte, borderColor: colors.bordure, backgroundColor: colors.fondCard }]}
                  placeholder="Ecrire un message..."
                  placeholderTextColor={colors.texteMuted}
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  multiline
                  maxLength={2000}
                />
                <Pressable
                  style={[styles.sendBtn, { backgroundColor: replyMessage.trim() ? colors.primaire : colors.bordure }]}
                  onPress={handleSendReply}
                  disabled={!replyMessage.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.blanc || '#FFF'} />
                  ) : (
                    <Ionicons name="send" size={18} color={colors.blanc || '#FFF'} />
                  )}
                </Pressable>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ============ LIST VIEW (default) ============
  return (
    <View style={[styles.container, { backgroundColor: colors.fond }]}>
      <LinearGradient colors={[colors.fond, colors.fondSecondaire || colors.fond, colors.fond]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.bordure }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.texte} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.texte }]}>Support</Text>
        </View>

        {tickets.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaireLight || 'rgba(124, 92, 255, 0.15)' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primaire} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.texte }]}>Aucun ticket</Text>
            <Text style={[styles.emptyText, { color: colors.texteSecondaire }]}>
              Vous n'avez pas encore cree de ticket. Contactez le support si vous avez besoin d'aide !
            </Text>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primaire, marginTop: espacements.xl }]}
              onPress={() => setViewMode('create')}
            >
              <Ionicons name="add" size={20} color={colors.blanc || '#FFF'} />
              <Text style={[styles.submitBtnText, { color: colors.blanc || '#FFF' }]}>Nouveau ticket</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primaire}
                colors={[colors.primaire]}
              />
            }
          >
            {/* New ticket button */}
            <Pressable
              style={[styles.newTicketBtn, { backgroundColor: colors.primaire }]}
              onPress={() => setViewMode('create')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.blanc || '#FFF'} />
              <Text style={[styles.newTicketText, { color: colors.blanc || '#FFF' }]}>Nouveau ticket</Text>
            </Pressable>

            {/* Ticket list */}
            {tickets.map((ticket) => {
              const statusColor = STATUS_COLORS[ticket.status];
              return (
                <Pressable
                  key={ticket._id}
                  style={[styles.ticketCard, { backgroundColor: colors.fondCard, borderColor: colors.bordure }]}
                  onPress={() => openTicket(ticket._id)}
                >
                  <View style={styles.ticketHeader}>
                    <Text style={[styles.ticketSubject, { color: colors.texte }]} numberOfLines={2}>
                      {ticket.subject}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {STATUS_LABELS[ticket.status]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ticketMeta}>
                    <View style={[styles.categoryBadge, { borderColor: colors.bordure }]}>
                      <Text style={[styles.categoryText, { color: colors.texteSecondaire }]}>
                        {CATEGORY_LABELS[ticket.category]}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.texteMuted }]}>
                      {formatDate(ticket.dateMiseAJour)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="chatbubble-outline" size={12} color={colors.texteMuted} />
                      <Text style={[styles.dateText, { color: colors.texteMuted }]}>
                        {ticket.messages?.length || 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
