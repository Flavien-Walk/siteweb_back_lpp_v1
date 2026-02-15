/**
 * Écran d'inscription
 * Design moderne et épuré pour les 18-25 ans
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bouton, ChampTexte, KeyboardView } from '../../src/composants';
import { couleurs, espacements, typographie, rayons } from '../../src/constantes/theme';
import { inscription } from '../../src/services/auth';
import { useAuth } from '../../src/contextes/AuthContexte';

export default function Inscription() {
  const { setUtilisateur } = useAuth();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const valider = (): boolean => {
    const nouvellesErreurs: Record<string, string> = {};

    if (!prenom.trim()) {
      nouvellesErreurs.prenom = 'Le prénom est requis';
    } else if (prenom.trim().length < 2) {
      nouvellesErreurs.prenom = 'Minimum 2 caractères';
    }

    if (!nom.trim()) {
      nouvellesErreurs.nom = 'Le nom est requis';
    } else if (nom.trim().length < 2) {
      nouvellesErreurs.nom = 'Minimum 2 caractères';
    }

    if (!email.trim()) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nouvellesErreurs.email = 'Email invalide';
    }

    if (!motDePasse) {
      nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
    } else if (motDePasse.length < 8) {
      nouvellesErreurs.motDePasse = 'Minimum 8 caractères';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(motDePasse)) {
      nouvellesErreurs.motDePasse = '1 majuscule, 1 minuscule, 1 chiffre requis';
    }

    if (motDePasse !== confirmationMdp) {
      nouvellesErreurs.confirmationMdp = 'Les mots de passe ne correspondent pas';
    }

    if (!cguAcceptees) {
      nouvellesErreurs.cgu = 'Tu dois accepter les CGU';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleInscription = async () => {
    if (!valider()) return;

    setChargement(true);
    setErreur('');

    try {
      const reponse = await inscription({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.toLowerCase().trim(),
        motDePasse,
        confirmationMotDePasse: confirmationMdp,
        cguAcceptees,
      });

      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
        // Rediriger vers la vérification email si pas encore vérifié
        if (!reponse.data.utilisateur.emailVerifie) {
          router.replace('/(auth)/verification-email');
        } else {
          router.replace('/(app)/choix-statut');
        }
      } else {
        setErreur(reponse.message || 'Erreur lors de l\'inscription');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardView style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.retour}
              onPress={() => router.back()}
            >
              <Text style={styles.retourTexte}>← Retour</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={[...couleurs.gradientPrimaire]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoContainer}
            >
              <Text style={styles.logoTexte}>LPP</Text>
            </LinearGradient>

            <Text style={styles.titre}>Créer un compte</Text>
            <Text style={styles.sousTitre}>
              Rejoins la communauté La Première Pierre
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.formulaire}>
            {erreur ? (
              <View style={styles.erreurGlobale}>
                <Text style={styles.erreurGlobaleTexte}>{erreur}</Text>
              </View>
            ) : null}

            {/* Prénom et Nom sur la même ligne */}
            <View style={styles.row}>
              <View style={styles.demiChamp}>
                <ChampTexte
                  label="Prénom"
                  placeholder="Prénom"
                  valeur={prenom}
                  onChangeText={setPrenom}
                  autoCapitalize="words"
                  autoComplete="name"
                  erreur={erreurs.prenom}
                />
              </View>
              <View style={styles.demiChamp}>
                <ChampTexte
                  label="Nom"
                  placeholder="Nom"
                  valeur={nom}
                  onChangeText={setNom}
                  autoCapitalize="words"
                  autoComplete="name"
                  erreur={erreurs.nom}
                />
              </View>
            </View>

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
              placeholder="Min. 8 caractères"
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

            <ChampTexte
              label="Confirmer le mot de passe"
              placeholder="••••••••"
              valeur={confirmationMdp}
              onChangeText={setConfirmationMdp}
              secureTextEntry={!afficherMdp}
              erreur={erreurs.confirmationMdp}
            />

            {/* CGU */}
            <TouchableOpacity
              style={styles.cguContainer}
              onPress={() => setCguAcceptees(!cguAcceptees)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, cguAcceptees && styles.checkboxChecked]}>
                {cguAcceptees && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.cguTexte}>
                J'accepte les{' '}
                <Text style={styles.cguLien}>conditions générales d'utilisation</Text>
              </Text>
            </TouchableOpacity>
            {erreurs.cgu && <Text style={styles.erreurCgu}>{erreurs.cgu}</Text>}

            <Bouton
              titre="Créer mon compte"
              onPress={handleInscription}
              chargement={chargement}
              taille="lg"
              style={styles.boutonInscription}
            />
          </View>

          {/* Séparateur */}
          <View style={styles.separateur}>
            <View style={styles.ligne} />
            <Text style={styles.separateurTexte}>ou</Text>
            <View style={styles.ligne} />
          </View>

          {/* Lien connexion */}
          <View style={styles.footer}>
            <Text style={styles.footerTexte}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLien}>Se connecter</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: espacements.lg,
    paddingBottom: espacements.xl,
  },
  retour: {
    alignSelf: 'flex-start',
    marginBottom: espacements.lg,
  },
  retourTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typographie.tailles.base,
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
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.extrabold,
    color: couleurs.blanc,
  },
  titre: {
    fontSize: typographie.tailles.xxl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
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
  row: {
    flexDirection: 'row',
    gap: espacements.md,
  },
  demiChamp: {
    flex: 1,
  },
  afficherMdp: {
    color: couleurs.primaire,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  cguContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: rayons.sm,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    marginRight: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  checkmark: {
    color: couleurs.blanc,
    fontSize: 14,
    fontWeight: typographie.poids.bold,
  },
  cguTexte: {
    flex: 1,
    color: couleurs.texteSecondaire,
    fontSize: typographie.tailles.sm,
  },
  cguLien: {
    color: couleurs.primaire,
    fontWeight: typographie.poids.medium,
  },
  erreurCgu: {
    color: couleurs.danger,
    fontSize: typographie.tailles.xs,
    marginBottom: espacements.md,
    marginLeft: 34,
  },
  boutonInscription: {
    marginTop: espacements.lg,
  },
  separateur: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacements.xl,
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
});
