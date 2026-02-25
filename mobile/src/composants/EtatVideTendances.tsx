/**
 * EtatVideTendances — Etat vide pour la section Tendances
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons, typographie } from '../constantes/theme';

interface Props {
  message?: string;
  onRetry?: () => void;
}

const EtatVideTendances: React.FC<Props> = ({ message, onRetry }) => {
  const { couleurs } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
      <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '15' }]}>
        <Ionicons name="flame-outline" size={40} color="#F59E0B" />
      </View>
      <Text style={[styles.title, { color: couleurs.texte }]}>
        {message || 'Pas encore de tendances'}
      </Text>
      <Text style={[styles.subtitle, { color: couleurs.texteSecondaire }]}>
        Les projets les plus populaires apparaitront ici une fois que la communaute sera active.
      </Text>
      {onRetry && (
        <Pressable
          style={[styles.retryBtn, { backgroundColor: '#F59E0B' }]}
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryText}>Recharger</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: espacements.xxl,
    borderRadius: rayons.lg,
    borderWidth: 1,
    marginVertical: espacements.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  title: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.bold,
    textAlign: 'center',
    marginBottom: espacements.sm,
  },
  subtitle: {
    fontSize: typographie.tailles.sm,
    textAlign: 'center',
    lineHeight: typographie.tailles.sm * typographie.hauteurLigne.relaxed,
    marginBottom: espacements.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
});

export default React.memo(EtatVideTendances);
