/**
 * LocationPicker - Sélecteur de localisation optionnel pour stories
 * Privacy-first : demande permission uniquement au clic
 * Affiche uniquement le label (ville), pas les coordonnées exactes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';

// Interface pour la localisation story
export interface StoryLocation {
  label: string;
  lat?: number;
  lng?: number;
}

interface LocationPickerProps {
  value: StoryLocation | null;
  onChange: (location: StoryLocation | null) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const { couleurs: themeColors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddLocation = async () => {
    setIsLoading(true);

    try {
      // Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'L\'accès à la localisation est nécessaire pour ajouter votre position.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Obtenir la position actuelle
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding pour obtenir le nom de la ville
      const geocodeResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocodeResults.length > 0) {
        const place = geocodeResults[0];
        // Construire un label lisible (ville ou quartier)
        const label = [place.city, place.subregion, place.region, place.country]
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');

        onChange({
          label: label || 'Position actuelle',
          lat: latitude,
          lng: longitude,
        });
      } else {
        // Fallback si pas de résultat geocoding
        onChange({
          label: 'Position actuelle',
          lat: latitude,
          lng: longitude,
        });
      }
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert(
        'Erreur',
        'Impossible de récupérer votre position. Vérifiez vos paramètres de localisation.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLocation = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
        Localisation (optionnel)
      </Text>

      {value ? (
        // Localisation sélectionnée
        <View
          style={[
            styles.locationBadge,
            {
              backgroundColor: themeColors.fondCard,
              borderColor: couleurs.primaire,
            },
          ]}
        >
          <Ionicons name="location" size={16} color={couleurs.primaire} />
          <Text
            style={[styles.locationText, { color: themeColors.texte }]}
            numberOfLines={1}
          >
            {value.label}
          </Text>
          <Pressable
            style={styles.removeButton}
            onPress={handleRemoveLocation}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={themeColors.texteSecondaire} />
          </Pressable>
        </View>
      ) : (
        // Bouton pour ajouter la localisation
        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: themeColors.fondCard,
              borderColor: themeColors.bordure,
            },
          ]}
          onPress={handleAddLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={couleurs.primaire} />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color={themeColors.texte} />
              <Text style={[styles.addButtonText, { color: themeColors.texte }]}>
                Ajouter une localisation
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: espacements.md,
  },
  label: {
    fontSize: typographie.tailles.sm,
    marginBottom: espacements.sm,
    marginLeft: espacements.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.md,
    paddingHorizontal: espacements.lg,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: typographie.tailles.sm,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.sm,
    paddingLeft: espacements.md,
    paddingRight: espacements.sm,
    borderRadius: rayons.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: typographie.tailles.sm,
    maxWidth: 200,
  },
  removeButton: {
    marginLeft: espacements.xs,
  },
});

export default LocationPicker;
