/**
 * EntrepreneurTab - Onglet Entrepreneur de l'accueil
 * Affiche les projets de l'entrepreneur connecte avec stats et gestion
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Projet,
  getMesProjetsEntrepreneur,
  StatsEntrepreneur,
} from '../../services/projets';

// ============ TYPES ============

interface EntrepreneurTabProps {
  couleurs: any;
  styles: any;
  utilisateur: any;
}

// ============ COMPOSANT ============

const EntrepreneurTab: React.FC<EntrepreneurTabProps> = ({
  couleurs,
  styles,
  utilisateur,
}) => {
  // State propre a l'onglet Entrepreneur
  const [mesProjetsEntrepreneur, setMesProjetsEntrepreneur] = useState<Projet[]>([]);
  const [statsEntrepreneur, setStatsEntrepreneur] = useState<StatsEntrepreneur | null>(null);
  const [chargementMesProjets, setChargementMesProjets] = useState(false);

  // Charger les projets de l'entrepreneur connecte
  const chargerMesProjetsEntrepreneur = useCallback(async () => {
    if (utilisateur?.statut !== 'entrepreneur') return;
    try {
      setChargementMesProjets(true);
      const reponse = await getMesProjetsEntrepreneur();
      if (reponse.succes && reponse.data) {
        setMesProjetsEntrepreneur(reponse.data.projets);
        setStatsEntrepreneur(reponse.data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement projets entrepreneur:', error);
    } finally {
      setChargementMesProjets(false);
    }
  }, [utilisateur?.statut]);

  // Charger les donnees au montage si l'utilisateur est entrepreneur
  useEffect(() => {
    if (utilisateur?.statut === 'entrepreneur') {
      chargerMesProjetsEntrepreneur();
    }
  }, [chargerMesProjetsEntrepreneur]);

  // ============ RENDU ============

  const hasProjects = mesProjetsEntrepreneur.length > 0;

  return (
    <View style={styles.entrepreneurContainer}>
      {/* Header Entrepreneur */}
      <View style={styles.entrepreneurHeader}>
        <View>
          <Text style={[styles.entrepreneurTitle, { color: couleurs.texte }]}>
            Mes Projets
          </Text>
          <Text style={[styles.entrepreneurSubtitle, { color: couleurs.texteSecondaire }]}>
            {statsEntrepreneur
              ? `${statsEntrepreneur.published} publie${statsEntrepreneur.published > 1 ? 's' : ''} · ${statsEntrepreneur.drafts} brouillon${statsEntrepreneur.drafts > 1 ? 's' : ''}`
              : 'Gerez vos startups et projets'}
          </Text>
        </View>
        {hasProjects && (
          <Pressable
            style={[styles.entrepreneurCreateBtn, { backgroundColor: couleurs.primaire }]}
            onPress={() => router.push('/entrepreneur/nouveau-projet')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.entrepreneurCreateBtnText}>Creer</Text>
          </Pressable>
        )}
      </View>

      {/* Liste des projets */}
      <ScrollView
        style={styles.entrepreneurList}
        contentContainerStyle={styles.entrepreneurListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={chargementMesProjets}
            onRefresh={chargerMesProjetsEntrepreneur}
            tintColor={couleurs.primaire}
          />
        }
      >
        {chargementMesProjets && !hasProjects ? (
          <View style={styles.entrepreneurLoading}>
            <Text style={[styles.entrepreneurLoadingText, { color: couleurs.texteSecondaire }]}>
              Chargement...
            </Text>
          </View>
        ) : hasProjects ? (
          <>
            {mesProjetsEntrepreneur.map((projet) => (
              <Pressable
                key={projet._id}
                style={[styles.entrepreneurProjectCard, { backgroundColor: couleurs.fondSecondaire }]}
                onPress={() => router.push({ pathname: '/(app)/entrepreneur/[id]', params: { id: projet._id } })}
              >
                {projet.image ? (
                  <Image source={{ uri: projet.image }} style={styles.entrepreneurProjectImage} />
                ) : (
                  <View style={[styles.entrepreneurProjectImagePlaceholder, { backgroundColor: couleurs.bordure }]}>
                    <Ionicons name="briefcase-outline" size={24} color={couleurs.texteSecondaire} />
                  </View>
                )}
                <View style={styles.entrepreneurProjectInfo}>
                  <View style={styles.entrepreneurProjectHeader}>
                    <Text style={[styles.entrepreneurProjectName, { color: couleurs.texte }]} numberOfLines={1}>
                      {projet.nom}
                    </Text>
                    <View style={[
                      styles.entrepreneurProjectStatus,
                      projet.statut === 'published' ? styles.entrepreneurStatusPublished : styles.entrepreneurStatusDraft
                    ]}>
                      <Text style={styles.entrepreneurProjectStatusText}>
                        {projet.statut === 'published' ? 'Publie' : 'Brouillon'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.entrepreneurProjectPitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
                    {projet.pitch}
                  </Text>
                  <View style={styles.entrepreneurProjectMeta}>
                    <View style={styles.entrepreneurProjectMetaItem}>
                      <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
                      <Text style={[styles.entrepreneurProjectMetaText, { color: couleurs.texteSecondaire }]}>
                        {projet.nbFollowers ?? projet.followers?.length ?? 0}
                      </Text>
                    </View>
                    <View style={styles.entrepreneurProjectMetaItem}>
                      <Ionicons name="location-outline" size={14} color={couleurs.texteSecondaire} />
                      <Text style={[styles.entrepreneurProjectMetaText, { color: couleurs.texteSecondaire }]}>
                        {projet.localisation?.ville || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={couleurs.texteSecondaire} />
              </Pressable>
            ))}
          </>
        ) : (
          <View style={[styles.entrepreneurEmptyState, { backgroundColor: couleurs.fondSecondaire }]}>
            <Ionicons name="briefcase-outline" size={64} color={couleurs.texteSecondaire} />
            <Text style={[styles.entrepreneurEmptyTitle, { color: couleurs.texte }]}>
              Commencez votre aventure
            </Text>
            <Text style={[styles.entrepreneurEmptyText, { color: couleurs.texteSecondaire }]}>
              Creez votre premier projet et partagez votre vision avec la communaute LPP
            </Text>
            <Pressable
              style={[styles.entrepreneurEmptyBtn, { backgroundColor: couleurs.primaire }]}
              onPress={() => router.push('/entrepreneur/nouveau-projet')}
            >
              <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
              <Text style={styles.entrepreneurEmptyBtnText}>Creer mon premier projet</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EntrepreneurTab;
