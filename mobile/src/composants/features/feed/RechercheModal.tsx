/**
 * RechercheModal - Modal de recherche plein ecran
 * Extrait de accueil.tsx pour modularisation
 * Recherche d'utilisateurs avec historique AsyncStorage
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Avatar from '../../Avatar';
import {
  rechercherUtilisateurs as rechercherUtilisateursAPI,
  ProfilUtilisateur,
} from '../../../services/utilisateurs';

// --- Constantes ---
const HISTORIQUE_RECHERCHE_KEY = '@lpp_historique_recherche';
const MAX_HISTORIQUE = 10;

// --- Props ---
interface RechercheModalProps {
  visible: boolean;
  onClose: () => void;
  couleurs: any;
  styles: any;
  insets: { top: number };
}

const RechercheModal: React.FC<RechercheModalProps> = ({
  visible,
  onClose,
  couleurs,
  styles,
  insets,
}) => {
  // --- State ---
  const [recherche, setRecherche] = useState('');
  const [rechercheUtilisateurs, setRechercheUtilisateurs] = useState<ProfilUtilisateur[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [historiqueRecherche, setHistoriqueRecherche] = useState<string[]>([]);

  const rechercheInputRef = useRef<TextInput>(null);

  // --- Chargement historique au montage ---
  useEffect(() => {
    if (visible) {
      chargerHistoriqueRecherche();
    }
  }, [visible]);

  // --- Recherche utilisateurs avec debounce (300ms) ---
  useEffect(() => {
    const delai = setTimeout(async () => {
      if (recherche.trim().length >= 2) {
        setChargementRecherche(true);
        try {
          const reponse = await rechercherUtilisateursAPI(recherche.trim());
          if (reponse.succes && reponse.data) {
            setRechercheUtilisateurs(reponse.data.utilisateurs);
          }
        } catch (error) {
          console.error('Erreur recherche utilisateurs:', error);
        } finally {
          setChargementRecherche(false);
        }
      } else {
        setRechercheUtilisateurs([]);
      }
    }, 300);

    return () => clearTimeout(delai);
  }, [recherche]);

  // --- Fonctions historique ---
  const chargerHistoriqueRecherche = async () => {
    try {
      const data = await AsyncStorage.getItem(HISTORIQUE_RECHERCHE_KEY);
      if (data) {
        setHistoriqueRecherche(JSON.parse(data));
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const ajouterAHistorique = async (terme: string) => {
    try {
      const termeTrim = terme.trim();
      if (termeTrim.length < 2) return;

      // Eviter les doublons et limiter la taille
      const nouvelHistorique = [
        termeTrim,
        ...historiqueRecherche.filter(t => t.toLowerCase() !== termeTrim.toLowerCase()),
      ].slice(0, MAX_HISTORIQUE);

      setHistoriqueRecherche(nouvelHistorique);
      await AsyncStorage.setItem(HISTORIQUE_RECHERCHE_KEY, JSON.stringify(nouvelHistorique));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  };

  const supprimerDeHistorique = async (terme: string) => {
    try {
      const nouvelHistorique = historiqueRecherche.filter(t => t !== terme);
      setHistoriqueRecherche(nouvelHistorique);
      await AsyncStorage.setItem(HISTORIQUE_RECHERCHE_KEY, JSON.stringify(nouvelHistorique));
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  const viderHistorique = async () => {
    try {
      setHistoriqueRecherche([]);
      await AsyncStorage.removeItem(HISTORIQUE_RECHERCHE_KEY);
    } catch (error) {
      console.error('Erreur vidage historique:', error);
    }
  };

  // --- Fermeture : reset state + callback parent ---
  const fermerRecherche = () => {
    setRecherche('');
    setRechercheUtilisateurs([]);
    onClose();
  };

  // --- Rendu ---
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={fermerRecherche}
    >
      <View style={[styles.fullSearchContainer, { paddingTop: insets.top }]}>
        {/* Header de recherche */}
        <View style={styles.fullSearchHeader}>
          <View style={styles.fullSearchInputContainer}>
            <Ionicons name="search" size={18} color={couleurs.texteSecondaire} />
            <TextInput
              ref={rechercheInputRef}
              style={styles.fullSearchInput}
              placeholder="Rechercher..."
              placeholderTextColor={couleurs.texteSecondaire}
              value={recherche}
              onChangeText={setRecherche}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {recherche.length > 0 && (
              <Pressable onPress={() => setRecherche('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={fermerRecherche} style={styles.fullSearchCancel}>
            <Text style={styles.fullSearchCancelText}>Annuler</Text>
          </Pressable>
        </View>

        {/* Contenu de recherche */}
        <View style={styles.fullSearchContent}>
          {recherche.length < 2 ? (
            historiqueRecherche.length > 0 ? (
              <ScrollView
                style={styles.fullSearchResults}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => Keyboard.dismiss()}
              >
                <View style={styles.historiqueHeader}>
                  <Text style={styles.historiqueTitle}>Recherches recentes</Text>
                  <Pressable onPress={viderHistorique} hitSlop={8}>
                    <Text style={styles.historiqueClear}>Effacer</Text>
                  </Pressable>
                </View>
                {historiqueRecherche.map((terme, index) => (
                  <Pressable
                    key={`${terme}-${index}`}
                    style={({ pressed }) => [
                      styles.historiqueItem,
                      pressed && styles.fullSearchResultItemPressed,
                    ]}
                    onPress={() => setRecherche(terme)}
                  >
                    <View style={styles.historiqueIconContainer}>
                      <Ionicons name="time-outline" size={18} color={couleurs.texteSecondaire} />
                    </View>
                    <Text style={styles.historiqueText} numberOfLines={1}>{terme}</Text>
                    <Pressable
                      onPress={() => supprimerDeHistorique(terme)}
                      hitSlop={8}
                      style={styles.historiqueDeleteBtn}
                    >
                      <Ionicons name="close" size={18} color={couleurs.texteMuted} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.fullSearchHint}>
                <View style={styles.fullSearchHintIcon}>
                  <Ionicons name="search" size={40} color={couleurs.primaire} />
                </View>
                <Text style={styles.fullSearchHintTitle}>Rechercher sur LPP</Text>
                <Text style={styles.fullSearchHintText}>
                  Trouvez des membres, startups, projets et bien plus encore
                </Text>
              </View>
            )
          ) : chargementRecherche ? (
              <View style={styles.fullSearchLoading}>
                <View style={styles.fullSearchLoadingDots}>
                  <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.primaire }]} />
                  <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.secondaire }]} />
                  <Animated.View style={[styles.fullSearchDot, { backgroundColor: couleurs.primaire }]} />
                </View>
                <Text style={styles.fullSearchLoadingText}>Recherche en cours...</Text>
              </View>
            ) : rechercheUtilisateurs.length === 0 ? (
              <View style={styles.fullSearchEmpty}>
                <View style={styles.fullSearchEmptyIcon}>
                  <Ionicons name="person-outline" size={48} color={couleurs.texteSecondaire} />
                </View>
                <Text style={styles.fullSearchEmptyTitle}>Aucun resultat</Text>
                <Text style={styles.fullSearchEmptyText}>
                  Aucun utilisateur ne correspond a "{recherche}"
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.fullSearchResults}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => Keyboard.dismiss()}
              >
                <Text style={styles.fullSearchResultsCount}>
                  {rechercheUtilisateurs.length} resultat{rechercheUtilisateurs.length > 1 ? 's' : ''}
                </Text>
                {rechercheUtilisateurs.map((user) => (
                  <Pressable
                    key={user._id}
                    style={({ pressed }) => [
                      styles.fullSearchResultItem,
                      pressed && styles.fullSearchResultItemPressed,
                    ]}
                    onPress={() => {
                      // Ajouter le nom a l'historique
                      ajouterAHistorique(`${user.prenom} ${user.nom}`);
                      fermerRecherche();
                      router.push({
                        pathname: '/(app)/utilisateur/[id]',
                        params: { id: user._id },
                      });
                    }}
                  >
                    <Avatar
                      uri={user.avatar}
                      prenom={user.prenom}
                      nom={user.nom}
                      taille={44}
                    />
                    <View style={styles.fullSearchResultInfo}>
                      <Text style={styles.fullSearchResultName}>
                        {user.prenom} {user.nom}
                      </Text>
                      {user.nbAmis !== undefined && (
                        <Text style={styles.fullSearchResultSub}>
                          {user.nbAmis} ami{user.nbAmis > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={couleurs.texteMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
        </View>
      </View>
    </Modal>
  );
};

export default RechercheModal;
