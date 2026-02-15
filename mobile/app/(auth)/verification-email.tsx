/**
 * Écran de vérification email
 * Code 6 chiffres envoyé par email après inscription
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bouton, KeyboardView } from '../../src/composants';
import { couleurs, espacements, typographie, rayons } from '../../src/constantes/theme';
import { verifierEmail, renvoyerCodeVerification } from '../../src/services/auth';
import { useAuth } from '../../src/contextes/AuthContexte';

const CODE_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

export default function VerificationEmail() {
  const { utilisateur, setUtilisateur, deconnexion } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown pour le renvoi
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (text: string, index: number) => {
    // Gestion du collage d'un code complet
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setErreur('');

    // Auto-advance
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerifier = async () => {
    const codeComplet = code.join('');
    if (codeComplet.length !== CODE_LENGTH) {
      setErreur('Entre le code à 6 chiffres');
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      const reponse = await verifierEmail(codeComplet);

      if (reponse.succes) {
        setSucces('Email vérifié !');
        // Mettre à jour l'utilisateur local
        if (utilisateur) {
          setUtilisateur({ ...utilisateur, emailVerifie: true });
        }
        // Rediriger après un court délai
        setTimeout(() => {
          if (utilisateur && !utilisateur.statut) {
            router.replace('/(app)/choix-statut');
          } else {
            router.replace('/(app)/accueil');
          }
        }, 800);
      } else {
        setErreur(reponse.message || 'Code invalide');
        // Vider le code
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleRenvoyer = async () => {
    if (cooldown > 0) return;

    setErreur('');
    try {
      const reponse = await renvoyerCodeVerification();
      if (reponse.succes) {
        setSucces('Nouveau code envoyé !');
        setCooldown(COOLDOWN_SECONDS);
        setTimeout(() => setSucces(''), 3000);
      } else {
        setErreur(reponse.message || 'Erreur lors du renvoi');
      }
    } catch {
      setErreur('Une erreur est survenue.');
    }
  };

  const handleDeconnexion = async () => {
    await deconnexion();
    router.replace('/(auth)/connexion');
  };

  const codeComplet = code.every((d) => d !== '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardView style={styles.keyboardView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[...couleurs.gradientPrimaire]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Text style={styles.iconTexte}>✉</Text>
            </LinearGradient>

            <Text style={styles.titre}>Vérifie ton email</Text>
            <Text style={styles.sousTitre}>
              Un code à 6 chiffres a été envoyé à{'\n'}
              <Text style={styles.email}>{utilisateur?.email || 'ton email'}</Text>
            </Text>
          </View>

          {/* Messages */}
          {erreur ? (
            <View style={styles.messageContainer}>
              <Text style={styles.erreurTexte}>{erreur}</Text>
            </View>
          ) : null}
          {succes ? (
            <View style={[styles.messageContainer, styles.succesContainer]}>
              <Text style={styles.succesTexte}>{succes}</Text>
            </View>
          ) : null}

          {/* Code inputs */}
          <View style={styles.codeContainer}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  code[index] ? styles.codeInputFilled : null,
                ]}
                value={code[index]}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                selectTextOnFocus
                placeholderTextColor={couleurs.textePlaceholder}
                placeholder="·"
              />
            ))}
          </View>

          {/* Bouton vérifier */}
          <Bouton
            titre="Vérifier"
            onPress={handleVerifier}
            chargement={chargement}
            desactive={!codeComplet}
            taille="lg"
            style={styles.boutonVerifier}
          />

          {/* Renvoyer */}
          <TouchableOpacity
            onPress={handleRenvoyer}
            disabled={cooldown > 0}
            style={styles.renvoyerContainer}
          >
            <Text style={styles.renvoyerTexte}>
              Tu n'as pas reçu le code ?{' '}
              <Text style={[styles.renvoyerLien, cooldown > 0 && styles.renvoyerDisabled]}>
                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Déconnexion */}
          <TouchableOpacity onPress={handleDeconnexion} style={styles.deconnexionContainer}>
            <Text style={styles.deconnexionTexte}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: espacements.xl,
    paddingBottom: espacements.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: espacements.xxxl,
    paddingBottom: espacements.xxl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: rayons.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.xl,
  },
  iconTexte: {
    fontSize: 32,
  },
  titre: {
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  sousTitre: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: typographie.tailles.base * typographie.hauteurLigne.relaxed,
  },
  email: {
    color: couleurs.primaire,
    fontWeight: typographie.poids.semibold,
  },
  messageContainer: {
    backgroundColor: couleurs.dangerLight,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.lg,
  },
  erreurTexte: {
    color: couleurs.danger,
    fontSize: typographie.tailles.sm,
    textAlign: 'center',
  },
  succesContainer: {
    backgroundColor: couleurs.succesLight,
  },
  succesTexte: {
    color: couleurs.succes,
    fontSize: typographie.tailles.sm,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacements.sm,
    marginBottom: espacements.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: rayons.md,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: couleurs.primaire,
  },
  boutonVerifier: {
    marginBottom: espacements.xl,
  },
  renvoyerContainer: {
    alignItems: 'center',
  },
  renvoyerTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typographie.tailles.sm,
  },
  renvoyerLien: {
    color: couleurs.primaire,
    fontWeight: typographie.poids.semibold,
  },
  renvoyerDisabled: {
    color: couleurs.texteMuted,
  },
  deconnexionContainer: {
    alignItems: 'center',
    paddingVertical: espacements.lg,
  },
  deconnexionTexte: {
    color: couleurs.texteMuted,
    fontSize: typographie.tailles.sm,
  },
});
