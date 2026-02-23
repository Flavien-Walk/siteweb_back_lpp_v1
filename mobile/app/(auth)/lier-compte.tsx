/**
 * Écran de liaison de compte Google
 * Affiché quand un compte local existe déjà avec le même email
 * L'utilisateur prouve la propriété (mot de passe ou code email) pour lier Google
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Bouton, ChampTexte, KeyboardView } from '../../src/composants';
import { couleurs, espacements, typographie, rayons } from '../../src/constantes/theme';
import {
  confirmerLiaisonGoogle,
  envoyerCodeLiaison,
  verifierCodeLiaison,
} from '../../src/services/auth';
import { useAuth } from '../../src/contextes/AuthContexte';

const CODE_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

type Mode = 'choice' | 'password' | 'code';

export default function LierCompte() {
  const { setUtilisateur } = useAuth();
  const { linkToken, email } = useLocalSearchParams<{ linkToken: string; email: string }>();

  const [mode, setMode] = useState<Mode>('choice');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown pour le renvoi de code
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // === Handlers code input (même pattern que verification-email.tsx) ===

  const handleCodeChange = (text: string, index: number) => {
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

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  // === Handlers liaison ===

  const handleConfirmPassword = async () => {
    if (!motDePasse.trim()) {
      setErreur('Entre ton mot de passe');
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      const reponse = await confirmerLiaisonGoogle(linkToken, motDePasse);

      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
        router.replace('/(app)/accueil');
      } else {
        setErreur(reponse.message || 'Mot de passe incorrect');
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleSendCode = async () => {
    if (cooldown > 0) return;

    setChargement(true);
    setErreur('');

    try {
      const reponse = await envoyerCodeLiaison(linkToken);

      if (reponse.succes) {
        setCodeEnvoye(true);
        setCooldown(COOLDOWN_SECONDS);
        setSucces('Code envoyé !');
        setTimeout(() => setSucces(''), 3000);
      } else {
        setErreur(reponse.message || 'Erreur lors de l\'envoi du code');
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleVerifyCode = async () => {
    const codeComplet = code.join('');
    if (codeComplet.length !== CODE_LENGTH) {
      setErreur('Entre le code à 6 chiffres');
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      const reponse = await verifierCodeLiaison(linkToken, codeComplet);

      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
        router.replace('/(app)/accueil');
      } else {
        setErreur(reponse.message || 'Code incorrect');
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleRetour = () => {
    if (mode === 'choice') {
      router.back();
    } else {
      setMode('choice');
      setErreur('');
      setSucces('');
      setMotDePasse('');
      setCode(Array(CODE_LENGTH).fill(''));
      setCodeEnvoye(false);
    }
  };

  const codeComplet = code.every((d) => d !== '');

  // === Rendu ===

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[...couleurs.gradientPrimaire]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Text style={styles.iconTexte}>G</Text>
      </LinearGradient>

      <Text style={styles.titre}>Lier ton compte Google</Text>
      <Text style={styles.sousTitre}>
        Un compte existe déjà avec{'\n'}
        <Text style={styles.email}>{email || 'cette adresse'}</Text>
        {'\n'}Pour le lier à Google, prouve que c'est bien toi.
      </Text>
    </View>
  );

  const renderMessages = () => (
    <>
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
    </>
  );

  const renderChoice = () => (
    <View style={styles.choiceContainer}>
      <Bouton
        titre="Avec mon mot de passe"
        onPress={() => { setMode('password'); setErreur(''); }}
        taille="lg"
        style={styles.boutonChoice}
      />

      <Bouton
        titre="Recevoir un code par email"
        onPress={() => { setMode('code'); setErreur(''); }}
        variante="outline"
        taille="lg"
        style={styles.boutonChoice}
      />
    </View>
  );

  const renderPassword = () => (
    <View style={styles.formContainer}>
      <ChampTexte
        label="Mot de passe"
        placeholder="••••••••"
        valeur={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry={!afficherMdp}
        autoComplete="password"
        iconeDroite={
          <TouchableOpacity onPress={() => setAfficherMdp(!afficherMdp)}>
            <Text style={styles.afficherMdp}>
              {afficherMdp ? 'Masquer' : 'Afficher'}
            </Text>
          </TouchableOpacity>
        }
      />

      <Bouton
        titre="Confirmer"
        onPress={handleConfirmPassword}
        chargement={chargement}
        taille="lg"
        style={styles.boutonConfirm}
      />
    </View>
  );

  const renderCode = () => (
    <View style={styles.formContainer}>
      {!codeEnvoye ? (
        <Bouton
          titre="Envoyer le code"
          onPress={handleSendCode}
          chargement={chargement}
          taille="lg"
          style={styles.boutonConfirm}
        />
      ) : (
        <>
          <Text style={styles.codeLabel}>
            Code envoyé à <Text style={styles.email}>{email}</Text>
          </Text>

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
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleCodeKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                selectTextOnFocus
                placeholderTextColor={couleurs.textePlaceholder}
                placeholder="·"
              />
            ))}
          </View>

          <Bouton
            titre="Vérifier"
            onPress={handleVerifyCode}
            chargement={chargement}
            desactive={!codeComplet}
            taille="lg"
            style={styles.boutonConfirm}
          />

          {/* Renvoyer */}
          <TouchableOpacity
            onPress={handleSendCode}
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
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardView style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderHeader()}
          {renderMessages()}

          {mode === 'choice' && renderChoice()}
          {mode === 'password' && renderPassword()}
          {mode === 'code' && renderCode()}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Retour / Annuler */}
          <TouchableOpacity onPress={handleRetour} style={styles.retourContainer}>
            <Text style={styles.retourTexte}>
              {mode === 'choice' ? 'Annuler' : 'Retour'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
    fontWeight: typographie.poids.bold,
    color: couleurs.blanc,
  },
  titre: {
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.sm,
    textAlign: 'center',
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
  choiceContainer: {
    gap: espacements.md,
  },
  boutonChoice: {
    marginBottom: 0,
  },
  formContainer: {
    flex: 1,
  },
  afficherMdp: {
    color: couleurs.primaire,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  boutonConfirm: {
    marginTop: espacements.lg,
  },
  codeLabel: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.lg,
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
  renvoyerContainer: {
    alignItems: 'center',
    marginTop: espacements.lg,
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
  retourContainer: {
    alignItems: 'center',
    paddingVertical: espacements.lg,
  },
  retourTexte: {
    color: couleurs.texteMuted,
    fontSize: typographie.tailles.sm,
  },
});
