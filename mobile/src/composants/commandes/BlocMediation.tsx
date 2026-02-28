/**
 * BlocMediation — Espace de mediation litige
 * L'utilisateur voit uniquement son canal (acheteur ou vendeur)
 * et peut echanger avec le moderateur LPP
 */
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import { getMediationMessages, envoyerMediationMessage } from '../../services/boutique';
import type { MediationMessage } from '../../types/boutique';

interface Props {
  commandeId: string;
  couleurs: ThemeCouleurs;
  litigeInfo?: {
    raison: string;
    moderateur?: { _id: string; prenom: string; nom: string; avatar?: string } | null;
    datePriseEnCharge?: string | null;
  };
}

const POLL_INTERVAL = 12000; // 12s

function BlocMediation({ commandeId, couleurs, litigeInfo }: Props) {
  const s = createStyles(couleurs);
  const [messages, setMessages] = useState<MediationMessage[]>([]);
  const [canal, setCanal] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getMediationMessages(commandeId);
      if (res.succes && res.data) {
        setMessages(res.data.messages || []);
        if (res.data.canal) setCanal(res.data.canal);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [commandeId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages(true), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const contenu = input.trim();
    if (!contenu || sending) return;

    setSending(true);
    setInput('');
    try {
      const res = await envoyerMediationMessage(commandeId, contenu);
      if (res.succes && res.data?.message) {
        setMessages(prev => [...prev, res.data!.message]);
      } else {
        Alert.alert('Erreur', res.message || "Impossible d'envoyer le message.");
        setInput(contenu); // restore
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'envoyer le message.");
      setInput(contenu);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item: msg }: { item: MediationMessage }) => {
    const isModo = msg.auteurRole === 'moderateur';
    const initiale = msg.auteur?.prenom?.[0]?.toUpperCase() || 'M';

    return (
      <Animated.View
        entering={FadeInDown.duration(250)}
        style={[s.messageBubbleWrap, isModo ? s.bubbleLeft : s.bubbleRight]}
      >
        {/* Avatar */}
        {isModo && (
          <View style={s.avatarWrap}>
            {msg.auteur?.avatar ? (
              <Image source={{ uri: msg.auteur.avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: '#7C5CFF25' }]}>
                <Text style={[s.avatarInitiale, { color: '#7C5CFF' }]}>{initiale}</Text>
              </View>
            )}
          </View>
        )}

        <View style={[s.bubble, isModo ? s.bubbleModo : s.bubbleUser]}>
          {/* Header */}
          <View style={s.bubbleHeader}>
            <Text style={[s.bubbleAuteur, isModo && { color: '#7C5CFF' }]}>
              {isModo ? 'Moderateur LPP' : `${msg.auteur?.prenom || 'Vous'}`}
            </Text>
            {isModo && (
              <View style={s.modoBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#7C5CFF" />
                <Text style={s.modoBadgeText}>Staff</Text>
              </View>
            )}
          </View>

          {/* Contenu */}
          <Text style={s.bubbleText}>{msg.contenu}</Text>

          {/* Date */}
          <Text style={s.bubbleDate}>
            {new Date(msg.dateCreation).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Avatar a droite pour l'user */}
        {!isModo && (
          <View style={s.avatarWrap}>
            {msg.auteur?.avatar ? (
              <Image source={{ uri: msg.auteur.avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: '#10B98125' }]}>
                <Text style={[s.avatarInitiale, { color: '#10B981' }]}>{initiale}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={s.container}>
      {/* Header */}
      <Pressable style={s.header} onPress={() => setCollapsed(!collapsed)}>
        <View style={s.headerIcon}>
          <Ionicons name="shield-half-outline" size={18} color="#EF4444" />
        </View>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Mediation en cours</Text>
          <Text style={s.headerSubtitle}>
            {litigeInfo?.moderateur
              ? `Pris en charge par ${litigeInfo.moderateur.prenom}`
              : 'En attente de prise en charge par un moderateur'}
          </Text>
        </View>
        {messages.length > 0 && (
          <View style={s.counterBadge}>
            <Text style={s.counterText}>{messages.length}</Text>
          </View>
        )}
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={couleurs.texteMuted}
        />
      </Pressable>

      {!collapsed && (
        <>
          {/* Statut prise en charge */}
          <View style={[s.statusBadge, {
            backgroundColor: litigeInfo?.moderateur ? '#10B98115' : '#F59E0B15',
            borderColor: litigeInfo?.moderateur ? '#10B98130' : '#F59E0B30',
          }]}>
            <Ionicons
              name={litigeInfo?.moderateur ? 'checkmark-circle-outline' : 'time-outline'}
              size={15}
              color={litigeInfo?.moderateur ? '#10B981' : '#F59E0B'}
            />
            <Text style={[s.statusBadgeText, {
              color: litigeInfo?.moderateur ? '#10B981' : '#F59E0B',
            }]}>
              {litigeInfo?.moderateur
                ? `Pris en charge par ${litigeInfo.moderateur.prenom}`
                : 'En attente de prise en charge par un moderateur'}
            </Text>
          </View>

          {/* Info card */}
          <View style={s.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color={couleurs.texteMuted} />
            <Text style={s.infoText}>
              Vos messages sont confidentiels. Seul le moderateur peut les voir.
            </Text>
          </View>

          {/* Messages */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#7C5CFF" size="small" />
              <Text style={s.loadingText}>Chargement...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={32} color={couleurs.texteMuted} />
              <Text style={s.emptyText}>Aucun message pour l'instant</Text>
              <Text style={s.emptySubtext}>
                Le moderateur vous contactera bientot, ou envoyez le premier message.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m._id}
              renderItem={renderMessage}
              style={s.messagesList}
              contentContainerStyle={s.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
          >
            <View style={s.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Votre message..."
                placeholderTextColor={couleurs.texteMuted}
                style={s.input}
                multiline
                maxLength={2000}
                editable={!sending}
              />
              <Pressable
                style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </Animated.View>
  );
}

export default memo(BlocMediation);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      marginBottom: espacements.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#EF444430',
    },
    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      padding: espacements.lg, gap: espacements.sm,
    },
    headerIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#EF444415',
      justifyContent: 'center', alignItems: 'center',
    },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
    headerSubtitle: { fontSize: 11, color: couleurs.texteMuted, marginTop: 1 },
    counterBadge: {
      minWidth: 22, height: 22, borderRadius: 11,
      backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 6,
    },
    counterText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    // Status badge
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: espacements.lg,
      marginBottom: espacements.sm,
      paddingVertical: 8, paddingHorizontal: 12,
      borderRadius: rayons.sm,
      borderWidth: 1,
    },
    statusBadgeText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
    // Info card
    infoCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: espacements.lg,
      marginBottom: espacements.md,
      paddingVertical: 8, paddingHorizontal: 12,
      borderRadius: rayons.sm,
      backgroundColor: couleurs.fond,
    },
    infoText: { flex: 1, fontSize: 11, color: couleurs.texteMuted, lineHeight: 15 },
    // Loading
    loadingWrap: {
      alignItems: 'center', paddingVertical: espacements.xl, gap: 8,
    },
    loadingText: { fontSize: 12, color: couleurs.texteMuted },
    // Empty
    emptyWrap: {
      alignItems: 'center', paddingVertical: espacements.xl,
      paddingHorizontal: espacements.lg, gap: 6,
    },
    emptyText: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
    emptySubtext: { fontSize: 12, color: couleurs.texteMuted, textAlign: 'center', lineHeight: 17 },
    // Messages list
    messagesList: { maxHeight: 340 },
    messagesContent: {
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
    },
    // Message bubble
    messageBubbleWrap: {
      flexDirection: 'row', alignItems: 'flex-end',
      marginBottom: espacements.sm, gap: 8,
    },
    bubbleLeft: { justifyContent: 'flex-start' },
    bubbleRight: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '75%', borderRadius: 16,
      paddingHorizontal: 14, paddingVertical: 10,
    },
    bubbleModo: {
      backgroundColor: '#7C5CFF12',
      borderWidth: 1,
      borderColor: '#7C5CFF20',
      borderBottomLeftRadius: 4,
    },
    bubbleUser: {
      backgroundColor: couleurs.fond,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      borderBottomRightRadius: 4,
    },
    bubbleHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginBottom: 3,
    },
    bubbleAuteur: { fontSize: 11, fontWeight: '700', color: couleurs.texte },
    modoBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: '#7C5CFF15', borderRadius: 8,
      paddingHorizontal: 6, paddingVertical: 1,
    },
    modoBadgeText: { fontSize: 9, fontWeight: '700', color: '#7C5CFF' },
    bubbleText: { fontSize: 13, color: couleurs.texte, lineHeight: 19 },
    bubbleDate: { fontSize: 10, color: couleurs.texteMuted, marginTop: 4, textAlign: 'right' },
    // Avatar
    avatarWrap: { marginBottom: 2 },
    avatar: { width: 28, height: 28, borderRadius: 14 },
    avatarPlaceholder: {
      width: 28, height: 28, borderRadius: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarInitiale: { fontSize: 12, fontWeight: '700' },
    // Input
    inputRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
    },
    input: {
      flex: 1, backgroundColor: couleurs.fond,
      borderRadius: 20, borderWidth: 1, borderColor: couleurs.bordure,
      paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 13, color: couleurs.texte,
      maxHeight: 100,
    },
    sendBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#7C5CFF',
      justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
