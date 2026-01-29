/**
 * Ecran de choix du statut utilisateur
 * Affiche apres l'inscription pour choisir entre Visiteur et Entrepreneur
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { espacements, rayons } from '../../src/constantes/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { modifierStatut, StatutUtilisateur } from '../../src/services/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatutOption {
  id: StatutUtilisateur;
  titre: string;
  description: string;
  icone: keyof typeof Ionicons.glyphMap;
  couleur: string;
  couleurLight: string;
}

const OPTIONS_STATUT: StatutOption[] = [
  {
    id: 'visiteur',
    titre: 'Visiteur',
    description: 'Je decouvre des projets innovants et je soutiens les entrepreneurs',
    icone: 'compass-outline',
    couleur: '#10B981',
    couleurLight: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'entrepreneur',
    titre: 'Entrepreneur',
    description: 'Je porte un projet et je cherche a developper ma communaute',
    icone: 'rocket-outline',
    couleur: '#F59E0B',
    couleurLight: 'rgba(245, 158, 11, 0.15)',
  },
];

export default function ChoixStatut() {
  const { couleurs } = useTheme();
  const { utilisateur, updateUser } = useUser();
  const [selection, setSelection] = useState<StatutUtilisateur | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleValider = async () => {
    if (!selection) return;

    setChargement(true);
    setErreur('');

    try {
      const reponse = await modifierStatut(selection);
      if (reponse.succes && reponse.data) {
        await updateUser(reponse.data.utilisateur);
        router.replace('/(app)/accueil');
      } else {
        setErreur(reponse.message || 'Erreur lors de la mise a jour');
      }
    } catch {
      setErreur('Une erreur est survenue. Reessaie.');
    } finally {
      setChargement(false);
    }
  };

  const styles = createStyles(couleurs);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={couleurs.gradientPrimaire as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Text style={styles.logoTexte}>LPP</Text>
          </LinearGradient>

          <Text style={styles.titre}>Bienvenue {utilisateur?.prenom} !</Text>
          <Text style={styles.sousTitre}>
            Choisis ton profil pour personnaliser ton experience sur LPP
          </Text>
        </View>

        {/* Options de statut */}
        <View style={styles.optionsContainer}>
          {OPTIONS_STATUT.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.optionCard,
                selection === option.id && styles.optionCardSelected,
                selection === option.id && { borderColor: option.couleur },
              ]}
              onPress={() => setSelection(option.id)}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: option.couleurLight },
                ]}
              >
                <Ionicons name={option.icone} size={32} color={option.couleur} />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitre}>{option.titre}</Text>
                  {selection === option.id && (
                    <View style={[styles.checkmark, { backgroundColor: option.couleur }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Message d'erreur */}
        {erreur ? (
          <View style={styles.erreurContainer}>
            <Ionicons name="alert-circle" size={18} color={couleurs.erreur} />
            <Text style={styles.erreurTexte}>{erreur}</Text>
          </View>
        ) : null}

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={18} color={couleurs.texteSecondaire} />
          <Text style={styles.infoTexte}>
            Tu pourras changer ce statut plus tard dans les parametres
          </Text>
        </View>

        {/* Bouton valider */}
        <Pressable
          style={[
            styles.boutonValider,
            !selection && styles.boutonValiderDisabled,
          ]}
          onPress={handleValider}
          disabled={!selection || chargement}
        >
          {chargement ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.boutonValiderTexte}>Continuer</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (couleurs: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    content: {
      flex: 1,
      padding: espacements.xl,
    },
    header: {
      alignItems: 'center',
      marginBottom: espacements.xxxl,
    },
    logoContainer: {
      width: 64,
      height: 64,
      borderRadius: rayons.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: espacements.lg,
    },
    logoTexte: {
      fontSize: 24,
      fontWeight: '800',
      color: '#fff',
    },
    titre: {
      fontSize: 26,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.xs,
      textAlign: 'center',
    },
    sousTitre: {
      fontSize: 15,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: espacements.md,
    },
    optionsContainer: {
      gap: espacements.lg,
      marginBottom: espacements.xl,
    },
    optionCard: {
      flexDirection: 'row',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      backgroundColor: couleurs.fondTertiaire,
    },
    optionIconContainer: {
      width: 56,
      height: 56,
      borderRadius: rayons.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: espacements.md,
    },
    optionContent: {
      flex: 1,
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: espacements.xs,
    },
    optionTitre: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    checkmark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionDescription: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      lineHeight: 19,
    },
    erreurContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.md,
      marginBottom: espacements.md,
      gap: espacements.sm,
    },
    erreurTexte: {
      flex: 1,
      color: couleurs.erreur,
      fontSize: 13,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginBottom: espacements.xl,
    },
    infoTexte: {
      flex: 1,
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },
    boutonValider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: couleurs.primaire,
      paddingVertical: espacements.lg,
      borderRadius: rayons.lg,
      gap: espacements.sm,
      marginTop: 'auto',
    },
    boutonValiderDisabled: {
      backgroundColor: couleurs.gris[600],
    },
    boutonValiderTexte: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });
