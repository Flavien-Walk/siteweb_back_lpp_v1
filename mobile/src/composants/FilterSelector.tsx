/**
 * FilterSelector - Sélecteur de filtres visuels pour stories
 * Carousel horizontal avec previews instantanées via overlays CSS
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { espacements, typographie, rayons } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import {
  FilterPreset,
  FILTER_LABELS,
  FILTER_ORDER,
  getFilterOverlay,
} from '../utils/imageFilters';

const PREVIEW_SIZE = 72;

interface FilterSelectorProps {
  imageUri: string;
  value: FilterPreset;
  onChange: (filter: FilterPreset) => void;
}

const FilterSelector: React.FC<FilterSelectorProps> = ({
  imageUri,
  value,
  onChange,
}) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: couleurs.texteSecondaire }]}>
        Filtre
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_ORDER.map((filter) => {
          const isSelected = value === filter;
          const overlay = getFilterOverlay(filter);

          return (
            <Pressable
              key={filter}
              style={[
                styles.filterItem,
                isSelected && styles.filterItemSelected,
              ]}
              onPress={() => onChange(filter)}
            >
              {/* Preview image avec overlay */}
              <View
                style={[
                  styles.previewContainer,
                  {
                    borderColor: isSelected
                      ? couleurs.primaire
                      : couleurs.bordure,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {/* Overlay pour simuler le filtre */}
                {overlay.overlayColor && (
                  <View
                    style={[
                      styles.filterOverlay,
                      {
                        backgroundColor: overlay.overlayColor,
                        opacity: overlay.overlayOpacity || 0.2,
                      },
                    ]}
                  />
                )}
                {/* Effet spécial pour N&B */}
                {filter === 'bw' && (
                  <View style={styles.bwOverlay} />
                )}
                {/* Effet vignette */}
                {filter === 'vignette' && (
                  <View style={styles.vignetteOverlay} />
                )}
              </View>

              {/* Label du filtre */}
              <Text
                style={[
                  styles.filterLabel,
                  {
                    color: isSelected ? couleurs.primaire : couleurs.texte,
                    fontWeight: isSelected
                      ? typographie.poids.semibold
                      : typographie.poids.normal,
                  },
                ]}
              >
                {FILTER_LABELS[filter]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    marginVertical: espacements.md,
  },
  label: {
    fontSize: typographie.tailles.sm,
    marginBottom: espacements.sm,
    marginLeft: espacements.xs,
  },
  scrollContent: {
    paddingHorizontal: espacements.xs,
    gap: espacements.md,
  },
  filterItem: {
    alignItems: 'center',
    gap: espacements.xs,
  },
  filterItemSelected: {
    // Animation ou effet de sélection si besoin
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: rayons.md,
    overflow: 'hidden',
    backgroundColor: couleurs.noir,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bwOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#808080',
    opacity: 0.6,
    // Note: Ce n'est pas un vrai filtre N&B mais une simulation visuelle
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Simuler une vignette avec un dégradé radial n'est pas possible en RN pur
    // On utilise un simple assombrissement des bords
    borderWidth: 8,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  filterLabel: {
    fontSize: typographie.tailles.xs,
    textAlign: 'center',
  },
});

export default FilterSelector;
