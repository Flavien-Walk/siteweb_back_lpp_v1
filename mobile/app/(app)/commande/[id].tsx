/**
 * Ecran detail commande — workflow complet acheteur/vendeur
 * Timeline + brief + avancement + livrables + actions contextuelles
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, SafeAreaView, Platform,
  ActivityIndicator, Alert, Image, TextInput, StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/contexts/ThemeContext';
import { useUser } from '../../../src/contexts/UserContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import SwipeableScreen from '../../../src/composants/SwipeableScreen';
import TimelineStatut from '../../../src/composants/commandes/TimelineStatut';
import BlocBrief from '../../../src/composants/commandes/BlocBrief';
import BlocAvancement from '../../../src/composants/commandes/BlocAvancement';
import BlocLivraison from '../../../src/composants/commandes/BlocLivraison';
import BlocDeadline from '../../../src/composants/commandes/BlocDeadline';
import ModalProlongation from '../../../src/composants/commandes/ModalProlongation';
import { formatPrice } from '../../../src/constantes/boutique';
import {
  getOrderDetail, accepterCommande, refuserCommande,
  livrerCommande, validerCommande, demanderRevision,
  annulerCommande, ouvrirLitige, ajouterProgression,
  contacterVendeur, creerReview, prolongerDeadline,
} from '../../../src/services/boutique';
import type { MarketplaceOrder, OrderStatut } from '../../../src/types/boutique';

export default function CommandeDetailScreen() {
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs);

  const [commande, setCommande] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Livraison inline
  const [showDeliverInput, setShowDeliverInput] = useState(false);
  const [deliverMessage, setDeliverMessage] = useState('');

  // Progression inline
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressPercent, setProgressPercent] = useState('');

  // Review inline
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewNote, setReviewNote] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Delivery files + link
  const [deliverFiles, setDeliverFiles] = useState<{uri: string; name: string; size: number; mimeType: string; base64: string}[]>([]);
  const [deliverLink, setDeliverLink] = useState('');

  // Revision inline
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionMotif, setRevisionMotif] = useState('');

  // Deadline prolongation
  const [showProlongation, setShowProlongation] = useState(false);
  const revisionPrompted = useRef(false);

  const loadCommande = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getOrderDetail(id);
      if (res.succes && res.data) setCommande(res.data.commande);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadCommande(); }, [loadCommande]));

  const isVendeur = useMemo(() => {
    if (!commande || !utilisateur) return false;
    const vendeurId = commande.vendeur._id || (commande.vendeur as any);
    return vendeurId === utilisateur.id;
  }, [commande, utilisateur]);

  const isAcheteur = useMemo(() => {
    if (!commande || !utilisateur) return false;
    const acheteurId = commande.acheteur._id || (commande.acheteur as any);
    return acheteurId === utilisateur.id;
  }, [commande, utilisateur]);

  // === ACTIONS ===
  const doAction = useCallback(async (
    action: () => Promise<any>,
    successMsg: string,
  ) => {
    setActionLoading(true);
    try {
      const res = await action();
      if (res.succes) {
        if (res.data?.commande) setCommande(res.data.commande);
        else await loadCommande();
        Alert.alert('Succes', successMsg);
      } else {
        Alert.alert('Erreur', res.message || 'Une erreur est survenue.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setActionLoading(false);
    }
  }, [loadCommande]);

  const handleAccepter = () => doAction(() => accepterCommande(id!), 'Commande acceptee !');

  const handleRefuser = () => {
    Alert.alert('Refuser la commande', 'Etes-vous sur de vouloir refuser ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => doAction(() => refuserCommande(id!), 'Commande refusee.') },
    ]);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mimeType = file.mimeType || 'application/octet-stream';
      const dataUri = `data:${mimeType};base64,${base64}`;
      setDeliverFiles(prev => [...prev, { uri: file.uri, name: file.name, size: file.size || 0, mimeType, base64: dataUri }]);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le fichier.');
    }
  };

  const handleLivrer = () => {
    if (!deliverMessage.trim() && deliverFiles.length === 0 && !deliverLink.trim()) {
      Alert.alert('Erreur', 'Ajoutez au moins un message, fichier ou lien.');
      return;
    }
    const deliverables: Array<{ type: 'message' | 'file' | 'link'; content?: string; base64?: string; fileName?: string; mimeType?: string }> = [];
    if (deliverMessage.trim()) {
      deliverables.push({ type: 'message', content: deliverMessage.trim() });
    }
    for (const f of deliverFiles) {
      deliverables.push({ type: 'file', base64: f.base64, fileName: f.name, mimeType: f.mimeType });
    }
    if (deliverLink.trim()) {
      deliverables.push({ type: 'link', content: deliverLink.trim() });
    }
    doAction(
      () => livrerCommande(id!, deliverables, true),
      'Commande livree !',
    );
    setDeliverMessage('');
    setDeliverFiles([]);
    setDeliverLink('');
    setShowDeliverInput(false);
  };

  const handleValider = () => doAction(() => validerCommande(id!), 'Commande terminee !');

  const handleRevision = () => {
    if (!revisionMotif.trim() || revisionMotif.trim().length < 5) {
      Alert.alert('Erreur', 'Le motif doit contenir au moins 5 caracteres.');
      return;
    }
    doAction(() => demanderRevision(id!, revisionMotif.trim()), 'Revision demandee.');
    setRevisionMotif('');
    setShowRevisionInput(false);
  };

  const handleAnnuler = () => {
    Alert.alert('Annuler la commande', 'Cette action est irreversible.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Annuler la commande', style: 'destructive', onPress: () => doAction(() => annulerCommande(id!), 'Commande annulee.') },
    ]);
  };

  const handleLitige = () => {
    Alert.alert('Ouvrir un litige', 'Un moderateur LPP interviendra.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ouvrir', style: 'destructive', onPress: () => doAction(() => ouvrirLitige(id!, 'Litige ouvert par l\'utilisateur'), 'Litige ouvert.') },
    ]);
  };

  const handleAddProgress = () => {
    const pct = parseInt(progressPercent, 10);
    if (!progressTitle.trim() || isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Erreur', 'Titre et pourcentage (0-100) requis.');
      return;
    }
    doAction(
      () => ajouterProgression(id!, progressTitle.trim(), '', pct),
      'Avancement ajoute !',
    );
    setProgressTitle('');
    setProgressPercent('');
    setShowProgressInput(false);
  };

  const handleContacter = async () => {
    if (!commande) return;
    const otherId = isVendeur ? commande.acheteur._id : commande.vendeur._id;
    const res = await contacterVendeur(otherId);
    if (res.succes && res.data) {
      router.push(`/(app)/conversation/${res.data.conversation._id}` as any);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Erreur', 'Ajoutez un commentaire.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await creerReview(id!, reviewNote, reviewComment.trim());
      if (res.succes) {
        Alert.alert('Merci !', 'Votre avis a ete publie.');
        setShowReviewForm(false);
        await loadCommande();
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de publier l\'avis.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de publier l\'avis.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProlonger = useCallback(async (secondsAdded: number, reason?: string) => {
    const res = await prolongerDeadline(id!, secondsAdded, reason);
    if (res.succes) {
      if (res.data?.commande) setCommande(res.data.commande);
      else await loadCommande();
      Alert.alert('Succes', 'Delai prolonge !');
    } else {
      throw new Error(res.message || 'Erreur');
    }
  }, [id, loadCommande]);

  if (loading || !commande) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      </SafeAreaView>
    );
  }

  const statut = (commande.statut || 'en_attente') as OrderStatut;
  const image = commande.serviceSnapshot?.image || commande.service?.image;

  return (
    <SwipeableScreen edgeWidth={50}>
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + espacements.sm : espacements.sm }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={s.headerTitle} numberOfLines={1}>Commande</Text>
          <Pressable onPress={handleContacter} style={s.chatBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#7C5CFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Service snapshot */}
          <View style={s.serviceCard}>
            {image ? (
              <Image source={{ uri: image }} style={s.serviceImg} resizeMode="cover" />
            ) : (
              <View style={[s.serviceImg, { backgroundColor: couleurs.fond, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="cube-outline" size={20} color={couleurs.texteMuted} />
              </View>
            )}
            <View style={s.serviceInfo}>
              <Text style={s.serviceName} numberOfLines={2}>{commande.serviceSnapshot?.nom || 'Service'}</Text>
              <Text style={s.servicePrice}>
                {(commande.montantTotal ?? 0) > 0 ? formatPrice(commande.montantTotal) : 'Sur devis'}
              </Text>
              {(commande.optionsSelectionnees?.length ?? 0) > 0 && (
                <Text style={s.serviceOptions}>
                  + {commande.optionsSelectionnees.length} option(s)
                </Text>
              )}
            </View>
          </View>

          {/* Timeline */}
          <TimelineStatut statut={statut} historique={commande.historique || []} couleurs={couleurs} />

          {/* Deadline countdown */}
          {commande.deadline && (commande.deadline.deadlineActive || commande.deadline.isLate) && (
            <BlocDeadline
              deadline={commande.deadline}
              isVendeur={isVendeur}
              onProlonger={() => setShowProlongation(true)}
              couleurs={couleurs}
            />
          )}

          {/* Brief */}
          <BlocBrief brief={commande.buyerBrief} couleurs={couleurs} />

          {/* Avancement */}
          <BlocAvancement updates={commande.progressUpdates || []} couleurs={couleurs} />

          {/* Livrables */}
          <BlocLivraison deliverables={commande.deliverables || []} couleurs={couleurs} />

          {/* === ACTIONS VENDEUR === */}
          {isVendeur && statut === 'en_attente' && (
            <View style={s.actionsCard}>
              <Text style={s.actionsTitle}>Nouvelle demande</Text>
              <Text style={s.actionsSubtitle}>Acceptez ou refusez cette commande</Text>
              <View style={s.actionsRow}>
                <Pressable style={s.refuseBtn} onPress={handleRefuser} disabled={actionLoading}>
                  <Ionicons name="close" size={18} color="#EF4444" />
                  <Text style={s.refuseBtnText}>Refuser</Text>
                </Pressable>
                <Pressable style={s.acceptBtn} onPress={handleAccepter} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={s.acceptBtnText}>Accepter</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {isVendeur && statut === 'en_cours' && (
            <View style={s.actionsCard}>
              <Text style={s.actionsTitle}>Gestion</Text>

              {/* Bandeau revision reçue — proposer d'ajuster le délai */}
              {(() => {
                const lastHist = commande.historique?.[commande.historique.length - 1];
                if (lastHist?.de === 'livre' && lastHist?.vers === 'en_cours' && !revisionPrompted.current) {
                  return (
                    <Pressable
                      style={[s.waitingCard, { backgroundColor: '#F59E0B15', marginBottom: espacements.md }]}
                      onPress={() => { revisionPrompted.current = true; setShowProlongation(true); }}
                    >
                      <Ionicons name="timer-outline" size={18} color="#F59E0B" />
                      <Text style={[s.waitingText, { color: '#F59E0B', fontSize: 13 }]}>
                        Revision recue — Ajuster le delai ?
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
                    </Pressable>
                  );
                }
                return null;
              })()}

              {/* Avancement inline */}
              {!showProgressInput ? (
                <Pressable style={s.outlineBtn} onPress={() => setShowProgressInput(true)}>
                  <Ionicons name="trending-up-outline" size={16} color="#3B82F6" />
                  <Text style={[s.outlineBtnText, { color: '#3B82F6' }]}>Ajouter un avancement</Text>
                </Pressable>
              ) : (
                <View style={s.inlineForm}>
                  <TextInput style={s.inlineInput} value={progressTitle} onChangeText={setProgressTitle} placeholder="Titre (ex: Version 1)" placeholderTextColor={couleurs.texteMuted} />
                  <TextInput style={[s.inlineInput, { width: 80 }]} value={progressPercent} onChangeText={setProgressPercent} placeholder="%" keyboardType="number-pad" placeholderTextColor={couleurs.texteMuted} />
                  <Pressable style={s.inlineSubmit} onPress={handleAddProgress}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </Pressable>
                </View>
              )}

              {/* Livrer inline */}
              {!showDeliverInput ? (
                <Pressable style={s.primaryBtn} onPress={() => setShowDeliverInput(true)}>
                  <Ionicons name="gift-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Livrer la commande</Text>
                </Pressable>
              ) : (
                <View style={{ gap: espacements.sm }}>
                  <TextInput
                    style={[s.inlineInput, { minHeight: 60 }]}
                    value={deliverMessage}
                    onChangeText={setDeliverMessage}
                    placeholder="Message de livraison..."
                    placeholderTextColor={couleurs.texteMuted}
                    multiline
                  />
                  {/* Fichiers joints */}
                  {deliverFiles.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: couleurs.fond, borderRadius: rayons.sm, padding: 8 }}>
                      <Ionicons name="document-outline" size={16} color="#8B5CF6" />
                      <Text style={{ flex: 1, fontSize: 12, color: couleurs.texte }} numberOfLines={1}>{f.name}</Text>
                      <Text style={{ fontSize: 11, color: couleurs.texteMuted }}>{(f.size / 1024).toFixed(0)} Ko</Text>
                      <Pressable onPress={() => setDeliverFiles(prev => prev.filter((_, j) => j !== i))}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[s.outlineBtn, { flex: 1, marginBottom: 0 }]} onPress={handlePickFile}>
                      <Ionicons name="attach-outline" size={16} color="#8B5CF6" />
                      <Text style={[s.outlineBtnText, { color: '#8B5CF6' }]}>Fichier</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={s.inlineInput}
                    value={deliverLink}
                    onChangeText={setDeliverLink}
                    placeholder="Lien (optionnel)"
                    placeholderTextColor={couleurs.texteMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <Pressable style={s.primaryBtn} onPress={handleLivrer} disabled={actionLoading}>
                    {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="paper-plane" size={16} color="#fff" />
                        <Text style={s.primaryBtnText}>Envoyer la livraison</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* === ACTIONS ACHETEUR === */}
          {isAcheteur && statut === 'livre' && (
            <View style={s.actionsCard}>
              <Text style={s.actionsTitle}>Livraison recue</Text>
              <Text style={s.actionsSubtitle}>Verifiez les livrables puis validez</Text>

              {/* Revision inline */}
              {commande.revisionInfo?.peutDemanderRevision !== false ? (
                !showRevisionInput ? (
                  <Pressable style={[s.outlineBtn, { marginBottom: espacements.md }]} onPress={() => setShowRevisionInput(true)}>
                    <Ionicons name="refresh-outline" size={16} color="#F59E0B" />
                    <Text style={[s.outlineBtnText, { color: '#F59E0B' }]}>
                      Revision{commande.revisionInfo ? ` (${commande.revisionInfo.revisionsRestantes}/${commande.revisionInfo.revisionsIncluses})` : ''}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: espacements.sm, marginBottom: espacements.md }}>
                    <TextInput
                      style={[s.inlineInput, { minHeight: 60 }]}
                      value={revisionMotif}
                      onChangeText={setRevisionMotif}
                      placeholder="Motif de la revision (obligatoire)..."
                      placeholderTextColor={couleurs.texteMuted}
                      multiline
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={[s.outlineBtn, { flex: 1, marginBottom: 0 }]} onPress={() => { setShowRevisionInput(false); setRevisionMotif(''); }}>
                        <Text style={[s.outlineBtnText, { color: couleurs.texteMuted }]}>Annuler</Text>
                      </Pressable>
                      <Pressable
                        style={[s.primaryBtn, { flex: 1, backgroundColor: '#F59E0B' }, (!revisionMotif.trim() || revisionMotif.trim().length < 5) && { opacity: 0.5 }]}
                        onPress={handleRevision}
                        disabled={!revisionMotif.trim() || revisionMotif.trim().length < 5 || actionLoading}
                      >
                        {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                          <Text style={s.primaryBtnText}>Envoyer</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )
              ) : (
                <View style={[s.waitingCard, { backgroundColor: '#EF444415', marginBottom: espacements.md }]}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={[s.waitingText, { color: '#EF4444', fontSize: 13 }]}>Revisions epuisees — vous pouvez ouvrir un litige</Text>
                </View>
              )}

              <Pressable style={s.acceptBtn} onPress={handleValider} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={s.acceptBtnText}>Valider la livraison</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {isAcheteur && statut === 'en_attente' && (
            <View style={s.waitingCard}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={s.waitingText}>En attente de validation par le vendeur</Text>
            </View>
          )}

          {isAcheteur && statut === 'en_cours' && (
            <View style={[s.waitingCard, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="construct-outline" size={20} color="#3B82F6" />
              <Text style={[s.waitingText, { color: '#3B82F6' }]}>Le vendeur travaille sur votre commande</Text>
            </View>
          )}

          {/* Actions secondaires */}
          {['en_attente', 'en_cours'].includes(statut) && (
            <Pressable style={s.dangerBtn} onPress={handleAnnuler}>
              <Text style={s.dangerBtnText}>Annuler la commande</Text>
            </Pressable>
          )}
          {['en_cours', 'livre'].includes(statut) && (
            <Pressable style={s.dangerBtn} onPress={handleLitige}>
              <Text style={s.dangerBtnText}>Signaler un probleme</Text>
            </Pressable>
          )}

          {/* === REVIEW (acheteur, commande terminee, pas encore d'avis) === */}
          {isAcheteur && statut === 'termine' && !commande.aReview && (
            <View style={s.actionsCard}>
              {!showReviewForm ? (
                <Pressable style={s.primaryBtn} onPress={() => setShowReviewForm(true)}>
                  <Ionicons name="star-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Laisser un avis</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={s.actionsTitle}>Votre avis</Text>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Pressable key={n} onPress={() => setReviewNote(n)}>
                        <Ionicons
                          name={n <= reviewNote ? 'star' : 'star-outline'}
                          size={28}
                          color="#F59E0B"
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={[s.inlineInput, { minHeight: 60, marginVertical: espacements.md }]}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Votre commentaire..."
                    placeholderTextColor={couleurs.texteMuted}
                    multiline
                  />
                  <Pressable style={s.primaryBtn} onPress={handleSubmitReview} disabled={actionLoading}>
                    {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <Text style={s.primaryBtnText}>Publier l'avis</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {isAcheteur && statut === 'termine' && commande.aReview && (
            <View style={[s.waitingCard, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[s.waitingText, { color: '#10B981' }]}>Avis publie</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal prolongation deadline */}
        <ModalProlongation
          visible={showProlongation}
          onClose={() => setShowProlongation(false)}
          onConfirm={handleProlonger}
          couleurs={couleurs}
        />
      </SafeAreaView>
    </SwipeableScreen>
  );
}

const createStyles = (couleurs: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: couleurs.fond },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: espacements.lg, paddingBottom: espacements.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: couleurs.texte, textAlign: 'center' },
    chatBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(124,92,255,0.1)',
    },
    scroll: { paddingHorizontal: espacements.lg },
    // Service card
    serviceCard: {
      flexDirection: 'row', gap: espacements.md,
      backgroundColor: couleurs.fondCard, borderRadius: rayons.lg,
      padding: espacements.md, marginBottom: espacements.lg,
    },
    serviceImg: { width: 64, height: 64, borderRadius: rayons.md },
    serviceInfo: { flex: 1, justifyContent: 'center' },
    serviceName: { fontSize: 15, fontWeight: '600', color: couleurs.texte },
    servicePrice: { fontSize: 16, fontWeight: '800', color: '#7C5CFF', marginTop: 4 },
    serviceOptions: { fontSize: 12, color: couleurs.texteMuted, marginTop: 2 },
    // Actions card
    actionsCard: {
      backgroundColor: couleurs.fondCard, borderRadius: rayons.lg,
      padding: espacements.lg, marginBottom: espacements.lg,
    },
    actionsTitle: { fontSize: 16, fontWeight: '700', color: couleurs.texte, marginBottom: 4 },
    actionsSubtitle: { fontSize: 13, color: couleurs.texteMuted, marginBottom: espacements.lg },
    actionsRow: { flexDirection: 'row', gap: espacements.md },
    acceptBtn: {
      flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, backgroundColor: '#10B981', borderRadius: rayons.full, paddingVertical: 12,
    },
    acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    refuseBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: rayons.full, paddingVertical: 12,
    },
    refuseBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
    outlineBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, borderWidth: 1.5, borderColor: couleurs.bordure, borderRadius: rayons.full,
      paddingVertical: 10, marginBottom: espacements.md,
    },
    outlineBtnText: { fontSize: 13, fontWeight: '600' },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, backgroundColor: '#7C5CFF', borderRadius: rayons.full,
      paddingVertical: 12,
    },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    // Inline forms
    inlineForm: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: espacements.md,
    },
    inlineInput: {
      flex: 1, backgroundColor: couleurs.fond, borderRadius: rayons.md,
      borderWidth: 1, borderColor: couleurs.bordure,
      paddingHorizontal: 10, paddingVertical: 8,
      fontSize: 13, color: couleurs.texte,
    },
    inlineSubmit: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#7C5CFF', justifyContent: 'center', alignItems: 'center',
    },
    // Waiting
    waitingCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#F59E0B15', borderRadius: rayons.md,
      padding: espacements.lg, marginBottom: espacements.lg,
    },
    waitingText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#F59E0B' },
    // Stars review
    starsRow: { flexDirection: 'row', gap: 4, justifyContent: 'center', marginVertical: espacements.sm },
    // Danger
    dangerBtn: {
      alignItems: 'center', paddingVertical: espacements.md, marginBottom: espacements.sm,
    },
    dangerBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  });
