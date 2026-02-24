/**
 * Hook useProjetDetail
 * Encapsule le chargement des données, la gestion d'état et les handlers
 * pour la page de détail d'un projet.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { useGamification } from '../../contexts/GamificationContext';
import {
  Projet,
  Porteur,
  getProjet,
  toggleSuivreProjet,
  getRepresentantsProjet,
} from '../../services/projets';
import { getOuCreerConversationPrivee } from '../../services/messagerie';

// Type pour les onglets
export type TabKey = 'vision' | 'market' | 'docs';

export interface UseProjetDetailReturn {
  // Données
  projet: Projet | null;
  representants: Porteur[];

  // États de chargement
  chargement: boolean;
  rafraichissement: boolean;
  actionEnCours: boolean;
  chargementRepresentants: boolean;

  // États UI (données-driven)
  estSuivi: boolean;
  nbFollowers: number;
  showDetails: boolean;
  activeTab: TabKey;
  showContactModal: boolean;

  // Dérivés
  isOwnerOrMember: boolean;
  progressionFinancement: number;

  // Actions
  chargerProjet: (estRefresh?: boolean) => Promise<void>;
  handleToggleSuivre: () => Promise<void>;
  openContactModal: () => Promise<void>;
  handleContacterRepresentant: (representant: Porteur) => Promise<void>;
  naviguerVersProfil: (userId: string) => void;

  // Setters exposés pour la couche UI
  setShowDetails: (v: boolean) => void;
  setActiveTab: (tab: TabKey) => void;
  setShowContactModal: (v: boolean) => void;
}

export function useProjetDetail(): UseProjetDetailReturn {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const router = useRouter();
  const { utilisateur } = useUser();
  const { applyDelta } = useGamification();

  // -------------------------------------------------------------------------
  // États
  // -------------------------------------------------------------------------

  const [projet, setProjet] = useState<Projet | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);

  const [estSuivi, setEstSuivi] = useState(false);
  const [nbFollowers, setNbFollowers] = useState(0);

  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('vision');

  const [showContactModal, setShowContactModal] = useState(false);
  const [representants, setRepresentants] = useState<Porteur[]>([]);
  const [chargementRepresentants, setChargementRepresentants] = useState(false);

  // Ref pour éviter l'écrasement optimiste pendant une action en cours
  const actionEnCoursRef = useRef(false);

  // -------------------------------------------------------------------------
  // Dérivés
  // -------------------------------------------------------------------------

  const progressionFinancement = useMemo(() => {
    if (!projet?.objectifFinancement || projet.objectifFinancement === 0) return 0;
    const montantLeve = projet.montantLeve || 0;
    return Math.min((montantLeve / projet.objectifFinancement) * 100, 100);
  }, [projet]);

  const isOwnerOrMember = useMemo(() => {
    if (!utilisateur || !projet) return false;
    const isOwner = projet.porteur?._id === utilisateur.id;
    const isMember = projet.equipe?.some(
      (membre) => membre.utilisateur?._id === utilisateur.id
    );
    return isOwner || isMember;
  }, [utilisateur, projet]);

  // -------------------------------------------------------------------------
  // Chargement des données
  // -------------------------------------------------------------------------

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
        if (!actionEnCoursRef.current) {
          setEstSuivi(reponse.data.projet.estSuivi);
          setNbFollowers(reponse.data.projet.nbFollowers);
        }
        if (!estRefresh && reponse.gamification) {
          applyDelta(reponse.gamification);
        }
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id, applyDelta]);

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

  // -------------------------------------------------------------------------
  // Effets
  // -------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      chargerProjet();
    }, [chargerProjet])
  );

  // Ouvrir le modal contact si action=contact dans les paramètres de navigation
  useEffect(() => {
    if (action === 'contact' && projet && !chargement) {
      openContactModal();
    }
    // openContactModal est stable (défini ci-dessous sans dépendances changeantes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, projet, chargement]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggleSuivre = async () => {
    if (!id || actionEnCours) return;

    setActionEnCours(true);
    actionEnCoursRef.current = true;

    const previousEstSuivi = estSuivi;
    const previousNbFollowers = nbFollowers;

    // Mise à jour optimiste
    const newEstSuivi = !estSuivi;
    const newNbFollowers = estSuivi ? nbFollowers - 1 : nbFollowers + 1;
    setEstSuivi(newEstSuivi);
    setNbFollowers(newNbFollowers);

    try {
      const reponse = await toggleSuivreProjet(id);

      if (reponse.succes && reponse.data) {
        const apiData = reponse.data as {
          estSuivi?: boolean;
          suivi?: boolean;
          nbFollowers?: number;
          totalFollowers?: number;
        };
        const apiEstSuivi = apiData.estSuivi ?? apiData.suivi;
        const apiNbFollowers = apiData.nbFollowers ?? apiData.totalFollowers;

        if (typeof apiEstSuivi === 'boolean') {
          setEstSuivi(apiEstSuivi);
        }
        if (typeof apiNbFollowers === 'number') {
          setNbFollowers(apiNbFollowers);
        }
        if (reponse.gamification) applyDelta(reponse.gamification);
      } else if (!reponse.succes) {
        setEstSuivi(previousEstSuivi);
        setNbFollowers(previousNbFollowers);
      }
    } catch (error) {
      console.error('Erreur toggle suivre:', error);
      setEstSuivi(previousEstSuivi);
      setNbFollowers(previousNbFollowers);
    } finally {
      setActionEnCours(false);
      actionEnCoursRef.current = false;
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
        router.push({
          pathname: '/(app)/conversation/[id]',
          params: { id: reponse.data.conversation._id },
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

  // -------------------------------------------------------------------------
  // Retour
  // -------------------------------------------------------------------------

  return {
    projet,
    representants,
    chargement,
    rafraichissement,
    actionEnCours,
    chargementRepresentants,
    estSuivi,
    nbFollowers,
    showDetails,
    activeTab,
    showContactModal,
    isOwnerOrMember,
    progressionFinancement,
    chargerProjet,
    handleToggleSuivre,
    openContactModal,
    handleContacterRepresentant,
    naviguerVersProfil,
    setShowDetails,
    setActiveTab,
    setShowContactModal,
  };
}
