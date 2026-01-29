/**
 * Composant Avatar - Gestion robuste des images de profil
 * Compatible iOS et Android avec fallback sur erreur
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, typographie } from '../constantes/theme';

interface AvatarProps {
  uri?: string | null;
  prenom?: string;
  nom?: string;
  taille?: number;
  style?: ViewStyle;
  gradientColors?: readonly [string, string];
}

/**
 * Composant Avatar avec fallback automatique
 * Gère les erreurs de chargement iOS (URLs Google, CORS, etc.)
 */
const Avatar: React.FC<AvatarProps> = ({
  uri,
  prenom = '',
  nom = '',
  taille = 50,
  style,
  gradientColors = [couleurs.primaire, couleurs.primaireDark],
}) => {
  const [erreurImage, setErreurImage] = useState(false);

  // Obtenir les initiales
  const premiereLettre = prenom && prenom.length > 0 ? prenom[0] : '';
  const deuxiemeLettre = nom && nom.length > 0 ? nom[0] : '';
  const initiales = (premiereLettre + deuxiemeLettre).toUpperCase() || '?';

  // Taille de police proportionnelle
  const tailleFonte = taille * 0.4;

  // Callback pour gérer les erreurs de chargement
  const handleError = useCallback(() => {
    setErreurImage(true);
  }, []);

  // Callback pour gérer le chargement réussi
  const handleLoad = useCallback(() => {
    setErreurImage(false);
  }, []);

  // Vérifier si on doit afficher l'image
  const afficherImage = uri && !erreurImage;

  // Normaliser l'URL pour iOS (certaines URLs nécessitent des ajustements)
  const getImageUri = (): string => {
    if (!uri) return '';

    let normalizedUri = uri;

    // S'assurer que l'URL est en HTTPS pour iOS
    if (Platform.OS === 'ios' && uri.startsWith('http://')) {
      normalizedUri = uri.replace('http://', 'https://');
    }

    return normalizedUri;
  };

  // Styles dynamiques
  const containerStyle: ViewStyle = {
    width: taille,
    height: taille,
    borderRadius: taille / 2,
  };

  const imageStyle: ImageStyle = {
    width: taille,
    height: taille,
    borderRadius: taille / 2,
  };

  return (
    <View style={[containerStyle, style]}>
      {afficherImage ? (
        <Image
          source={{
            uri: getImageUri(),
            cache: Platform.OS === 'ios' ? 'force-cache' : 'default',
          }}
          style={[styles.image, imageStyle]}
          onError={handleError}
          onLoad={handleLoad}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[...gradientColors]}
          style={[styles.placeholder, containerStyle]}
        >
          <Text style={[styles.initiales, { fontSize: tailleFonte }]}>
            {initiales}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: couleurs.fondCard,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initiales: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.bold,
  },
});

export default Avatar;
