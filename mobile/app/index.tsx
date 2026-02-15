/**
 * Point d'entrée - Redirection selon l'état de connexion
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contextes/AuthContexte';
import { Chargement } from '../src/composants';

export default function Index() {
  const { estConnecte, chargement, utilisateur } = useAuth();

  // Debug log
  if (__DEV__) {
    console.log('[INDEX] Render - chargement:', chargement, 'estConnecte:', estConnecte, 'user:', utilisateur?.email || 'null');
  }

  // Afficher le chargement pendant la vérification de l'auth
  if (chargement) {
    if (__DEV__) console.log('[INDEX] -> Affichage Chargement');
    return <Chargement pleinEcran message="Chargement..." />;
  }

  // Rediriger vers l'écran approprié
  if (estConnecte) {
    if (utilisateur && !utilisateur.emailVerifie) {
      if (__DEV__) console.log('[INDEX] -> Redirect vers verification-email');
      return <Redirect href="/(auth)/verification-email" />;
    }
    if (__DEV__) console.log('[INDEX] -> Redirect vers accueil');
    return <Redirect href="/(app)/accueil" />;
  }

  if (__DEV__) console.log('[INDEX] -> Redirect vers connexion');
  return <Redirect href="/(auth)/connexion" />;
}
