/**
 * Écran d'accueil - Page principale après connexion
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bouton } from '../../src/composants';
import { useAuth } from '../../src/contextes/AuthContexte';
import { couleurs, espacements, typographie, rayons } from '../../src/constantes/theme';

export default function Accueil() {
  const { utilisateur, deconnexion } = useAuth();

  const handleDeconnexion = async () => {
    await deconnexion();
    router.replace('/(auth)/connexion');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[...couleurs.gradientPrimaire]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Text style={styles.logoTexte}>LPP</Text>
          </LinearGradient>
        </View>

        {/* Contenu principal */}
        <View style={styles.main}>
          <Text style={styles.titre}>Accueil</Text>

          <View style={styles.card}>
            <Text style={styles.bienvenue}>
              Bienvenue{utilisateur?.prenom ? `, ${utilisateur.prenom}` : ''} !
            </Text>
            <Text style={styles.description}>
              Tu es maintenant connecté à La Première Pierre.
            </Text>
          </View>

          {/* Indicateur de succès */}
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>Connexion réussie</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Bouton
            titre="Se déconnecter"
            onPress={handleDeconnexion}
            variante="outline"
            taille="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  content: {
    flex: 1,
    paddingHorizontal: espacements.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: espacements.xl,
    paddingBottom: espacements.lg,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: rayons.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTexte: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.extrabold,
    color: couleurs.blanc,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titre: {
    fontSize: typographie.tailles.display,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
    marginBottom: espacements.xxl,
  },
  card: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.xl,
    padding: espacements.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  bienvenue: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: typographie.tailles.base,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.succesLight,
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.lg,
    borderRadius: rayons.full,
    marginTop: espacements.xxl,
    gap: espacements.sm,
  },
  successIcon: {
    fontSize: typographie.tailles.lg,
    color: couleurs.succes,
    fontWeight: typographie.poids.bold,
  },
  successText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.succes,
    fontWeight: typographie.poids.medium,
  },
  footer: {
    paddingVertical: espacements.xxl,
  },
});
