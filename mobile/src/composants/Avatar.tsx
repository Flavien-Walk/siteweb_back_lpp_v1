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
import { typographie } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';

interface AvatarProps {
  uri?: string | null;
  prenom?: string;
  nom?: string;
  taille?: number;
  style?: ViewStyle;
  gradientColors?: readonly [string, string];
  /** Callback appel\u00e9 au clic sur l'avatar (rend l'avatar cliquable) */
  onPress?: () => void;
}

/**
 * Composant Avatar avec fallback automatique
 * G\u00e8re les erreurs de chargement iOS (URLs Google, CORS, etc.)
 */
const Avatar: React.FC<AvatarProps> = ({
  uri,
  prenom = '',
  nom = '',
  taille = 50,
  style,
  gradientColors,
  onPress,
}) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const resolvedGradientColors = gradientColors ?? [couleurs.primaire, couleurs.primaireDark];

  const [erreurImage, setErreurImage] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  // Reset l'\u00e9tat d'erreur quand l'URI change
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

  // Callback pour g\u00e9rer les erreurs de chargement
  const handleError = useCallback(() => {
    console.log('Avatar: Erreur chargement image:', uri);
    setErreurImage(true);
  }, [uri]);

  // Callback pour g\u00e9rer le chargement r\u00e9ussi
  const handleLoad = useCallback(() => {
    setErreurImage(false);
  }, []);

  // V\u00e9rifier si l'URL est valide (pas un fichier local temporaire)
  const isValidUrl = (url: unknown): boolean => {
    // V\u00e9rification de type robuste (url peut \u00eatre un objet Story, null, undefined, etc.)
    if (!url || typeof url !== 'string' || url.length === 0) return false;
    // Les fichiers locaux temporaires (file://) ne sont pas persistants
    if (url.startsWith('file://')) return false;
    // Accepter http://, https://, et data: (base64)
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  };

  // V\u00e9rifier si on doit afficher l'image
  const afficherImage = isValidUrl(uri) && !erreurImage;

  // Normaliser l'URL pour iOS (certaines URLs n\u00e9cessitent des ajustements)
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

    // Pour les URLs Google, ajouter des param\u00e8tres pour \u00e9viter les probl\u00e8mes de cache
    if (normalizedUri.includes('googleusercontent.com')) {
      // Forcer une taille d'image appropri\u00e9e
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
      colors={[...resolvedGradientColors]}
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

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
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
