/**
 * Point d'entrée - Redirection selon l'état de connexion
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contextes/AuthContexte';
import { Chargement } from '../src/composants';

export default function Index() {
  const { estConnecte, chargement } = useAuth();

  // Afficher le chargement pendant la vérification de l'auth
  if (chargement) {
    return <Chargement pleinEcran message="Chargement..." />;
  }

  // Rediriger vers l'écran approprié
  if (estConnecte) {
    return <Redirect href="/(app)/accueil" />;
  }

  return <Redirect href="/(auth)/connexion" />;
}
