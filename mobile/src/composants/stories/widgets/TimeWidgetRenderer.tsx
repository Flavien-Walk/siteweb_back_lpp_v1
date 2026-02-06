/**
 * TimeWidgetRenderer - Affiche l'heure actuelle sur la story
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimeWidget } from '../../../types/storyWidgets';
import { couleurs, espacements, rayons, typographie } from '../../../constantes/theme';

interface TimeWidgetRendererProps {
  widget: TimeWidget;
}

const TimeWidgetRenderer: React.FC<TimeWidgetRendererProps> = ({ widget }) => {
  const [time, setTime] = useState(new Date());

  // Mettre à jour l'heure toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    if (widget.data.format === '12h') {
      return time.toLocaleTimeString('fr-FR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    // 24h format
    return time.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = () => {
    return time.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Style Minimal - juste l'heure
  if (widget.data.style === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <Text style={styles.minimalTime}>{formatTime()}</Text>
        {widget.data.showDate && (
          <Text style={styles.minimalDate}>{formatDate()}</Text>
        )}
      </View>
    );
  }

  // Style Badge - avec icône et fond
  if (widget.data.style === 'badge') {
    return (
      <View style={styles.badgeContainer}>
        <Ionicons name="time-outline" size={14} color={couleurs.blanc} />
        <Text style={styles.badgeTime}>{formatTime()}</Text>
        {widget.data.showDate && (
          <Text style={styles.badgeDate}>{formatDate()}</Text>
        )}
      </View>
    );
  }

  // Style Digital - comme un réveil digital
  if (widget.data.style === 'digital') {
    return (
      <View style={styles.digitalContainer}>
        <Text style={styles.digitalTime}>{formatTime()}</Text>
        {widget.data.showDate && (
          <Text style={styles.digitalDate}>{formatDate()}</Text>
        )}
      </View>
    );
  }

  // Default: minimal
  return (
    <View style={styles.minimalContainer}>
      <Text style={styles.minimalTime}>{formatTime()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Style Minimal
  minimalContainer: {
    alignItems: 'center',
  },
  minimalTime: {
    color: couleurs.blanc,
    fontSize: 24,
    fontWeight: typographie.poids.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  minimalDate: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Style Badge
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.xl,
    gap: espacements.xs,
  },
  badgeTime: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  badgeDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typographie.tailles.xs,
  },

  // Style Digital
  digitalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderRadius: rayons.sm,
    alignItems: 'center',
  },
  digitalTime: {
    color: '#00FF00',
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: typographie.poids.bold,
    letterSpacing: 2,
  },
  digitalDate: {
    color: '#00FF00',
    fontSize: typographie.tailles.xs,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});

export default TimeWidgetRenderer;
