import { View } from 'react-native';

/**
 * Catch-all pour les routes non matchees (deep links OAuth, etc.)
 * Affiche un ecran vide au lieu de "Unmatched Route".
 * Le flow OAuth gere la navigation via openAuthSessionAsync.
 */
export default function NotFound() {
  return <View style={{ flex: 1, backgroundColor: '#0D0D12' }} />;
}
