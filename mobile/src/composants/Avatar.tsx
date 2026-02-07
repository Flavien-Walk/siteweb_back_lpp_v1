/**
 * Composant Avatar - Gestion robuste des images de profil
 * Compatible iOS et Android avec fallback sur erreur
 */

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  ViewStyle,
  ImageStyle,
  Pressable,
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
  /** Callback appelé au clic sur l'avatar (rend l'avatar cliquable) */
  onPress?: () => void;
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
  onPress,
}) => {
  const [erreurImage, setErreurImage] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  // Reset l'état d'erreur quand l'URI change
  useEffect(() => {
    setErreurImage(false);
    setImageKey(prev => prev + 1);
  }, [uri]);

  // Memoize computed values
  const { initiales, tailleFonte, containerStyle, imageStyle } = useMemo(() => {
    const premiereLettre = prenom && prenom.length > 0 ? prenom[0] : '';
    const deuxiemeLettre = nom && nom.length > 0 ? nom[0] : '';
    return {
      initiales: (premiereLettre + deuxiemeLettre).toUpperCase() || '?',
      tailleFonte: taille * 0.4,
      containerStyle: {
        width: taille,
        height: taille,
        borderRadius: taille / 2,
      } as ViewStyle,
      imageStyle: {
        width: taille,
        height: taille,
        borderRadius: taille / 2,
      } as ImageStyle,
    };
  }, [prenom, nom, taille]);

  // Callback pour gérer les erreurs de chargement
  const handleError = useCallback(() => {
    console.log('Avatar: Erreur chargement image:', uri);
    setErreurImage(true);
  }, [uri]);

  // Callback pour gérer le chargement réussi
  const handleLoad = useCallback(() => {
    setErreurImage(false);
  }, []);

  // Vérifier si l'URL est valide (pas un fichier local temporaire)
  const isValidUrl = (url: unknown): boolean => {
    // Vérification de type robuste (url peut être un objet Story, null, undefined, etc.)
    if (!url || typeof url !== 'string' || url.length === 0) return false;
    // Les fichiers locaux temporaires (file://) ne sont pas persistants
    if (url.startsWith('file://')) return false;
    // Accepter http://, https://, et data: (base64)
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  };

  // Vérifier si on doit afficher l'image
  const afficherImage = isValidUrl(uri) && !erreurImage;

  // Normaliser l'URL pour iOS (certaines URLs nécessitent des ajustements)
  const getImageUri = (): string => {
    if (!uri || !isValidUrl(uri)) return '';

    // Les data URLs (base64) n'ont pas besoin de transformation
    if (uri.startsWith('data:')) {
      return uri;
    }

    let normalizedUri = uri;

    // S'assurer que l'URL est en HTTPS pour iOS
    if (Platform.OS === 'ios' && uri.startsWith('http://')) {
      normalizedUri = uri.replace('http://', 'https://');
    }

    // Pour les URLs Google, ajouter des paramètres pour éviter les problèmes de cache
    if (normalizedUri.includes('googleusercontent.com')) {
      // Forcer une taille d'image appropriée
      if (!normalizedUri.includes('=s')) {
        normalizedUri = normalizedUri.replace(/=s\d+/, `=s${taille * 2}`);
        if (!normalizedUri.includes('=s')) {
          normalizedUri += `?sz=${taille * 2}`;
        }
      }
    }

    return normalizedUri;
  };

  // Contenu de l'avatar (image ou initiales)
  const avatarContent = afficherImage ? (
    <Image
      key={`avatar-${imageKey}`}
      source={{
        uri: getImageUri(),
        cache: Platform.OS === 'ios' ? 'reload' : 'default',
        headers: {
          'Accept': 'image/*',
        },
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
  );

  // Si onPress est fourni, rendre l'avatar cliquable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[containerStyle, style]}
        hitSlop={8}
      >
        {avatarContent}
      </Pressable>
    );
  }

  // Sinon, retourner une View simple
  return (
    <View style={[containerStyle, style]}>
      {avatarContent}
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

export default memo(Avatar);
