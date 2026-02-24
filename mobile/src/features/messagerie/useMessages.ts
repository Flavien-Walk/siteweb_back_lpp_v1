/**
 * useMessages — logique métier de l'écran Messages
 *
 * Encapsule : état des données, chargement, effets socket/polling/focus,
 * handlers d'action (recherche, filtre onglets, nouvelle conversation, groupe,
 * suppression). Le composant screen conserve uniquement les fonctions render
 * et le JSX.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { useUser } from '../../contexts/UserContext';
import { useSocket } from '../../contexts/SocketContext';
import {
  getConversations,
  rechercherUtilisateurs,
  getOuCreerConversationPrivee,
  creerGroupe,
  supprimerConversation,
  Conversation,
  Utilisateur,
} from '../../services/messagerie';
import {
  getMesAmis,
  ProfilUtilisateur,
} from '../../services/utilisateurs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OngletType = 'messages' | 'demandes';

export interface CompteurOnglets {
  messagesAmis: number;
  demandesNonAmis: number;
}

export interface UseMessagesReturn {
  // Refs
  swipeableRefs: React.MutableRefObject<Map<string, Swipeable | null>>;

  // État conversations
  conversations: Conversation[];
  chargement: boolean;
  rafraichissement: boolean;
  recherche: string;
  setRecherche: (v: string) => void;
  ongletActif: OngletType;
  setOngletActif: (v: OngletType) => void;

  // État modal nouvelle conversation
  modalNouveauVisible: boolean;
  setModalNouveauVisible: (v: boolean) => void;
  rechercheUtilisateur: string;
  setRechercheUtilisateur: (v: string) => void;
  utilisateursTrouves: Utilisateur[];
  chargementRecherche: boolean;

  // État groupe
  modeGroupe: boolean;
  participantsSelectionnes: Utilisateur[];
  nomGroupe: string;
  setNomGroupe: (v: string) => void;

  // État amis
  mesAmis: ProfilUtilisateur[];
  chargementAmis: boolean;
  amisIds: Set<string>;

  // Données dérivées
  contactsExistants: Utilisateur[];
  conversationsFiltrees: Conversation[];
  compteurOnglets: CompteurOnglets;

  // Handlers
  chargerConversations: (estRefresh?: boolean, silencieux?: boolean) => Promise<void>;
  ouvrirConversation: (conv: Conversation) => void;
  handleSupprimerConversation: (convId: string) => void;
  demarrerConversation: (user: Utilisateur) => Promise<void>;
  handleCreerGroupe: () => Promise<void>;
  activerModeGroupe: () => Promise<void>;
  resetModalState: () => void;
  formatDate: (dateStr: string) => string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMessages(): UseMessagesReturn {
  const router = useRouter();
  const { utilisateur } = useUser();
  const { onNewMessage } = useSocket();

  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  // ── État conversations ────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [ongletActif, setOngletActif] = useState<OngletType>('messages');

  // ── État modal nouvelle conversation ─────────────────────────────────────
  const [modalNouveauVisible, setModalNouveauVisible] = useState(false);
  const [rechercheUtilisateur, setRechercheUtilisateur] = useState('');
  const [utilisateursTrouves, setUtilisateursTrouves] = useState<Utilisateur[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);

  // ── État groupe ───────────────────────────────────────────────────────────
  const [modeGroupe, setModeGroupe] = useState(false);
  const [participantsSelectionnes, setParticipantsSelectionnes] = useState<Utilisateur[]>([]);
  const [nomGroupe, setNomGroupe] = useState('');

  // ── État amis ─────────────────────────────────────────────────────────────
  const [mesAmis, setMesAmis] = useState<ProfilUtilisateur[]>([]);
  const [chargementAmis, setChargementAmis] = useState(false);
  const [amisIds, setAmisIds] = useState<Set<string>>(new Set());

  // ── Données dérivées ──────────────────────────────────────────────────────

  // Contacts existants extraits des conversations (utilisés comme suggestions)
  const contactsExistants = React.useMemo<Utilisateur[]>(() => {
    const contacts: Utilisateur[] = [];
    const idsVus = new Set<string>();

    conversations.forEach((conv) => {
      if (!conv.estGroupe && conv.participant && !idsVus.has(conv.participant._id)) {
        contacts.push(conv.participant);
        idsVus.add(conv.participant._id);
      }
      if (conv.participants) {
        conv.participants.forEach((p) => {
          if (!idsVus.has(p._id)) {
            contacts.push(p);
            idsVus.add(p._id);
          }
        });
      }
    });

    return contacts;
  }, [conversations]);

  // Conversations filtrées selon l'onglet actif et la recherche
  const conversationsFiltrees = React.useMemo<Conversation[]>(() => {
    return conversations.filter((conv) => {
      // Exclure les conversations sans message (créées mais annulées)
      if (!conv.dernierMessage) return false;

      // Filtrage par onglet (Messages = amis, Demandes = non-amis)
      if (!conv.estGroupe && conv.participant) {
        const estAmi = amisIds.has(conv.participant._id);
        if (ongletActif === 'messages' && !estAmi) return false;
        if (ongletActif === 'demandes' && estAmi) return false;
      }
      // Les groupes n'apparaissent que dans l'onglet Messages
      if (conv.estGroupe && ongletActif === 'demandes') return false;

      // Filtrage par recherche
      if (recherche.length < 2) return true;
      const rechercheMin = recherche.toLowerCase();

      if (conv.estGroupe) {
        return conv.nomGroupe?.toLowerCase().includes(rechercheMin);
      }

      return `${conv.participant?.prenom} ${conv.participant?.nom}`
        .toLowerCase()
        .includes(rechercheMin);
    });
  }, [conversations, ongletActif, amisIds, recherche]);

  // Compteur de messages non lus par onglet
  const compteurOnglets = React.useMemo<CompteurOnglets>(() => {
    let messagesAmis = 0;
    let demandesNonAmis = 0;

    conversations.forEach((conv) => {
      if (conv.estGroupe) {
        messagesAmis += conv.messagesNonLus || 0;
      } else if (conv.participant) {
        const estAmi = amisIds.has(conv.participant._id);
        if (estAmi) {
          messagesAmis += conv.messagesNonLus || 0;
        } else {
          demandesNonAmis += conv.messagesNonLus || 0;
        }
      }
    });

    return { messagesAmis, demandesNonAmis };
  }, [conversations, amisIds]);

  // ── Chargement des données ────────────────────────────────────────────────

  const chargerConversations = useCallback(
    async (estRefresh = false, silencieux = false) => {
      if (estRefresh) {
        setRafraichissement(true);
      } else if (!silencieux) {
        setChargement(true);
      }

      try {
        const reponse = await getConversations();
        if (reponse.succes && reponse.data) {
          setConversations(reponse.data.conversations);
        }
      } catch (error) {
        console.error('Erreur chargement conversations:', error);
      } finally {
        setChargement(false);
        setRafraichissement(false);
      }
    },
    []
  );

  const chargerAmisInitial = useCallback(async () => {
    try {
      const reponse = await getMesAmis();
      if (reponse.succes && reponse.data) {
        const ids = new Set(reponse.data.amis.map((ami) => ami._id));
        setAmisIds(ids);
        setMesAmis(reponse.data.amis.filter((ami) => ami._id !== utilisateur?.id));
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
  }, [utilisateur?.id]);

  const chargerMesAmis = async () => {
    setChargementAmis(true);
    try {
      const reponse = await getMesAmis();
      if (reponse.succes && reponse.data) {
        const amisFiltres = reponse.data.amis.filter(
          (ami) => ami._id !== utilisateur?.id
        );
        setMesAmis(amisFiltres);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    } finally {
      setChargementAmis(false);
    }
  };

  // ── Effets ────────────────────────────────────────────────────────────────

  // Chargement initial
  useEffect(() => {
    chargerConversations();
    chargerAmisInitial();
  }, [chargerConversations, chargerAmisInitial]);

  // Socket : rafraîchir silencieusement à chaque nouveau message reçu
  useEffect(() => {
    const unsubscribe = onNewMessage(() => {
      console.log('[MESSAGES] Nouveau message reçu, rafraîchissement liste');
      chargerConversations(false, true);
    });
    return unsubscribe;
  }, [onNewMessage, chargerConversations]);

  // Polling toutes les 15 secondes (économie batterie vs. 3s)
  // TODO: Remplacer par WebSocket pour temps réel optimal
  useEffect(() => {
    const interval = setInterval(() => {
      chargerConversations(false, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [chargerConversations]);

  // Rafraîchir au retour sur l'écran
  useFocusEffect(
    useCallback(() => {
      chargerConversations(false, true);
      chargerAmisInitial();
    }, [chargerConversations, chargerAmisInitial])
  );

  // Recherche utilisateurs avec debounce (300 ms)
  useEffect(() => {
    const delai = setTimeout(async () => {
      if (rechercheUtilisateur.trim().length >= 2) {
        setChargementRecherche(true);
        try {
          const reponse = await rechercherUtilisateurs(rechercheUtilisateur.trim());
          if (reponse.succes && reponse.data) {
            setUtilisateursTrouves(reponse.data.utilisateurs);
          }
        } catch (error) {
          console.error('Erreur recherche:', error);
        } finally {
          setChargementRecherche(false);
        }
      } else {
        setUtilisateursTrouves([]);
      }
    }, 300);

    return () => clearTimeout(delai);
  }, [rechercheUtilisateur]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetModalState = useCallback(() => {
    setRechercheUtilisateur('');
    setUtilisateursTrouves([]);
    setModeGroupe(false);
    setParticipantsSelectionnes([]);
    setNomGroupe('');
  }, []);

  const ouvrirConversation = useCallback(
    (conv: Conversation) => {
      router.push({
        pathname: '/(app)/conversation/[id]',
        params: { id: conv._id },
      });
    },
    [router]
  );

  const handleSupprimerConversation = useCallback(
    (convId: string) => {
      Alert.alert(
        'Supprimer la conversation',
        "Cette conversation sera supprimée de votre liste. L'autre personne conservera la conversation de son côté.",
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => {
              swipeableRefs.current.get(convId)?.close();
            },
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                const reponse = await supprimerConversation(convId);
                if (reponse.succes) {
                  setConversations((prev) => prev.filter((c) => c._id !== convId));
                } else {
                  Alert.alert(
                    'Erreur',
                    reponse.message || 'Impossible de supprimer la conversation'
                  );
                }
              } catch {
                Alert.alert('Erreur', 'Impossible de supprimer la conversation');
              }
            },
          },
        ]
      );
    },
    []
  );

  const demarrerConversation = useCallback(
    async (user: Utilisateur) => {
      if (modeGroupe) {
        // Ajouter/retirer des participants (uniquement amis)
        if (!amisIds.has(user._id)) {
          Alert.alert(
            'Ami requis',
            `${user.prenom} n'est pas dans votre liste d'amis. Ajoutez-le en ami pour l'ajouter au groupe.`
          );
          return;
        }
        const dejaSelectionne = participantsSelectionnes.find((p) => p._id === user._id);
        if (dejaSelectionne) {
          setParticipantsSelectionnes(participantsSelectionnes.filter((p) => p._id !== user._id));
        } else {
          setParticipantsSelectionnes([...participantsSelectionnes, user]);
        }
      } else {
        // Conversation privée directe (les non-amis arrivent en "Demandes")
        try {
          const reponse = await getOuCreerConversationPrivee(user._id);
          if (reponse.succes && reponse.data) {
            setModalNouveauVisible(false);
            setRechercheUtilisateur('');
            router.push({
              pathname: '/(app)/conversation/[id]',
              params: { id: reponse.data.conversation._id },
            });
          }
        } catch {
          Alert.alert('Erreur', 'Impossible de créer la conversation');
        }
      }
    },
    [modeGroupe, amisIds, participantsSelectionnes, router]
  );

  const handleCreerGroupe = useCallback(async () => {
    if (participantsSelectionnes.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un participant');
      return;
    }
    if (!nomGroupe.trim()) {
      Alert.alert('Erreur', 'Entrez un nom pour le groupe');
      return;
    }

    try {
      const reponse = await creerGroupe(
        nomGroupe.trim(),
        participantsSelectionnes.map((p) => p._id)
      );
      if (reponse.succes && reponse.data) {
        setModalNouveauVisible(false);
        resetModalState();
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.groupe._id },
        });
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    }
  }, [participantsSelectionnes, nomGroupe, resetModalState, router]);

  const activerModeGroupe = useCallback(async () => {
    setModeGroupe(true);
    setParticipantsSelectionnes([]);
    await chargerMesAmis();
  }, []);

  // ── Utilitaires ───────────────────────────────────────────────────────────

  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const maintenant = new Date();
    const diff = maintenant.getTime() - date.getTime();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (jours === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (jours === 1) {
      return 'Hier';
    } else if (jours < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }, []);

  // ── Retour ────────────────────────────────────────────────────────────────

  return {
    // Refs
    swipeableRefs,

    // État conversations
    conversations,
    chargement,
    rafraichissement,
    recherche,
    setRecherche,
    ongletActif,
    setOngletActif,

    // État modal
    modalNouveauVisible,
    setModalNouveauVisible,
    rechercheUtilisateur,
    setRechercheUtilisateur,
    utilisateursTrouves,
    chargementRecherche,

    // État groupe
    modeGroupe,
    participantsSelectionnes,
    nomGroupe,
    setNomGroupe,

    // État amis
    mesAmis,
    chargementAmis,
    amisIds,

    // Données dérivées
    contactsExistants,
    conversationsFiltrees,
    compteurOnglets,

    // Handlers
    chargerConversations,
    ouvrirConversation,
    handleSupprimerConversation,
    demarrerConversation,
    handleCreerGroupe,
    activerModeGroupe,
    resetModalState,
    formatDate,
  };
}
