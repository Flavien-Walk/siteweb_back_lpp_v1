/**
 * Écran de connexion
 * Design moderne et épuré pour les 18-25 ans
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bouton, ChampTexte } from '../../src/composants';
import { couleurs, espacements, typographie, rayons } from '../../src/constantes/theme';
import { connexion } from '../../src/services/auth';
import { connexionGoogle, connexionApple } from '../../src/services/oauth';
import { useAuth } from '../../src/contextes/AuthContexte';

const { width } = Dimensions.get('window');

export default function Connexion() {
  const { setUtilisateur } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementOAuth, setChargementOAuth] = useState<'google' | 'apple' | null>(null);
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const valider = (): boolean => {
    const nouvellesErreurs: Record<string, string> = {};

    if (!email.trim()) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nouvellesErreurs.email = 'Email invalide';
    }

    if (!motDePasse) {
      nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleConnexion = async () => {
    if (!valider()) return;

    setChargement(true);
    setErreur('');

    try {
      const reponse = await connexion({ email: email.toLowerCase().trim(), motDePasse });

      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
        router.replace('/(app)/accueil');
      } else {
        setErreur(reponse.message || 'Erreur de connexion');
        if (reponse.erreurs) {
          setErreurs(reponse.erreurs);
        }
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setChargementOAuth(provider);
    setErreur('');

    try {
      const result = provider === 'google'
        ? await connexionGoogle()
        : await connexionApple();

      if (result.succes && result.utilisateur) {
        setUtilisateur(result.utilisateur);
        router.replace('/(app)/accueil');
      } else {
        setErreur(result.message || 'Erreur de connexion');
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargementOAuth(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header avec logo/titre */}
          <View style={styles.header}>
            <LinearGradient
              colors={[...couleurs.gradientPrimaire]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoContainer}
            >
              <Text style={styles.logoTexte}>LPP</Text>
            </LinearGradient>

            <Text style={styles.titre}>Bon retour !</Text>
            <Text style={styles.sousTitre}>
              Connecte-toi pour accéder à ton espace
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.formulaire}>
            {erreur ? (
              <View style={styles.erreurGlobale}>
                <Text style={styles.erreurGlobaleTexte}>{erreur}</Text>
              </View>
            ) : null}

            <ChampTexte
              label="Email"
              placeholder="ton@email.com"
              valeur={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              erreur={erreurs.email}
            />

            <ChampTexte
              label="Mot de passe"
              placeholder="••••••••"
              valeur={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry={!afficherMdp}
              autoComplete="password"
              erreur={erreurs.motDePasse}
              iconeDroite={
                <TouchableOpacity onPress={() => setAfficherMdp(!afficherMdp)}>
                  <Text style={styles.afficherMdp}>
                    {afficherMdp ? 'Masquer' : 'Afficher'}
                  </Text>
                </TouchableOpacity>
              }
            />

            <TouchableOpacity style={styles.mdpOublie}>
              <Text style={styles.mdpOublieTexte}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Bouton
              titre="Se connecter"
              onPress={handleConnexion}
              chargement={chargement}
              taille="lg"
              style={styles.boutonConnexion}
            />
          </View>

          {/* Séparateur */}
          <View style={styles.separateur}>
            <View style={styles.ligne} />
            <Text style={styles.separateurTexte}>ou continue avec</Text>
            <View style={styles.ligne} />
          </View>

          {/* Boutons OAuth */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={[styles.oauthButton, styles.googleButton]}
              onPress={() => handleOAuth('google')}
              disabled={chargementOAuth !== null || chargement}
            >
              {chargementOAuth === 'google' ? (
                <ActivityIndicator size="small" color={couleurs.texte} />
              ) : (
                <>
                  <Text style={styles.oauthIcon}>G</Text>
                  <Text style={styles.oauthText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.oauthButton, styles.appleButton]}
                onPress={() => handleOAuth('apple')}
                disabled={chargementOAuth !== null || chargement}
              >
                {chargementOAuth === 'apple' ? (
                  <ActivityIndicator size="small" color={couleurs.blanc} />
                ) : (
                  <>
                    <Text style={styles.oauthIconApple}></Text>
                    <Text style={styles.oauthTextApple}>Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Lien inscription */}
          <View style={styles.footer}>
            <Text style={styles.footerTexte}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/inscription')}>
              <Text style={styles.footerLien}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: rayons.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.xl,
  },
  logoTexte: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.extrabold,
    color: couleurs.blanc,
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
  },
  formulaire: {
    flex: 1,
  },
  erreurGlobale: {
    backgroundColor: couleurs.dangerLight,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.lg,
  },
  erreurGlobaleTexte: {
    color: couleurs.danger,
    fontSize: typographie.tailles.sm,
    textAlign: 'center',
  },
  afficherMdp: {
    color: couleurs.primaire,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  mdpOublie: {
    alignSelf: 'flex-end',
    marginTop: -espacements.sm,
    marginBottom: espacements.xl,
  },
  mdpOublieTexte: {
    color: couleurs.primaire,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  boutonConnexion: {
    marginTop: espacements.md,
  },
  separateur: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacements.xxl,
  },
  ligne: {
    flex: 1,
    height: 1,
    backgroundColor: couleurs.bordure,
  },
  separateurTexte: {
    color: couleurs.texteMuted,
    fontSize: typographie.tailles.sm,
    paddingHorizontal: espacements.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.xs,
    paddingBottom: espacements.xl,
  },
  footerTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typographie.tailles.base,
  },
  footerLien: {
    color: couleurs.primaire,
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
  },
  oauthContainer: {
    flexDirection: 'row',
    gap: espacements.md,
    marginBottom: espacements.xxl,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.md,
    borderRadius: rayons.lg,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: couleurs.fondCard,
    borderColor: couleurs.bordure,
  },
  appleButton: {
    backgroundColor: couleurs.blanc,
    borderColor: couleurs.blanc,
  },
  oauthIcon: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  oauthIconApple: {
    fontSize: typographie.tailles.lg,
    color: couleurs.noir,
  },
  oauthText: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.texte,
  },
  oauthTextApple: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
    color: couleurs.noir,
  },
});
