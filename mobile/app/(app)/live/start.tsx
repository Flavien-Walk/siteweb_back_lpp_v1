/**
 * Live Start - Ecran de preparation avant de lancer un live
 * Interface style Instagram/Twitch avec preview camera, controles, titre
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, type ThemeCouleurs } from '../../../src/contexts/ThemeContext';
import { useUser } from '../../../src/contexts/UserContext';
import { espacements, rayons } from '../../../src/constantes/theme';
import { Avatar, Bouton, ChampTexte } from '../../../src/composants';
import { startLive } from '../../../src/services/live';

const MAX_TITRE = 100;

export default function LiveStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const styles = createStyles(couleurs);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [chargement, setChargement] = useState(false);

  // Pulse LIVE badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleChangeTitre = (texte: string) => {
    if (texte.length <= MAX_TITRE) setTitre(texte);
  };

  const handleLancerLive = async () => {
    if (chargement) return;
    setChargement(true);
    try {
      const response = await startLive(titre.trim() || undefined);
      if (response.succes && response.data) {
        const { live, agora } = response.data;
        router.replace({
          pathname: '/live/viewer',
          params: {
            liveId: live._id,
            channelName: agora.channelName,
            appId: agora.appId,
            token: agora.token,
            uid: agora.uid.toString(),
            title: live.title || titre || '',
            description: description || '',
            cameraActive: cameraActive.toString(),
            micActive: micActive.toString(),
            isBroadcaster: 'true',
            hostPrenom: utilisateur?.prenom || '',
            hostNom: utilisateur?.nom || '',
            hostAvatar: utilisateur?.avatar || '',
          },
        });
      } else {
        Alert.alert('Erreur', response.message || 'Impossible de lancer le live.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Verifiez votre connexion.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ====== HEADER ====== */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} disabled={chargement}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Nouveau live</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ====== PREVIEW CAMERA ====== */}
          <View style={styles.previewWrapper}>
            <View style={styles.previewCard}>
              <LinearGradient
                colors={[couleurs.fondCard, couleurs.fondSecondaire, couleurs.fondCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewGradient}
              >
                {/* Badge LIVE */}
                <View style={styles.liveBadge}>
                  <Animated.View style={[styles.liveBadgeDot, { opacity: pulseAnim }]} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>

                {/* Avatar + nom */}
                <View style={styles.previewAvatarRing}>
                  <Avatar
                    uri={utilisateur?.avatar}
                    prenom={utilisateur?.prenom || ''}
                    nom={utilisateur?.nom || ''}
                    taille={64}
                  />
                </View>
                <Text style={styles.previewNom}>
                  {utilisateur?.prenom} {utilisateur?.nom}
                </Text>
                <Text style={styles.previewSub}>Votre apercu live</Text>
              </LinearGradient>
            </View>

            {/* ====== CONTROLES CAMERA / MICRO ====== */}
            <View style={styles.controlsRow}>
              <Pressable
                onPress={() => setCameraActive(v => !v)}
                style={styles.controlItem}
              >
                <View style={[
                  styles.controlCircle,
                  { backgroundColor: cameraActive ? `${couleurs.primaire}20` : `${couleurs.erreur}20` },
                ]}>
                  <Ionicons
                    name={cameraActive ? 'videocam' : 'videocam-off'}
                    size={22}
                    color={cameraActive ? couleurs.primaire : couleurs.erreur}
                  />
                </View>
                <Text style={[
                  styles.controlLabel,
                  { color: cameraActive ? couleurs.texte : couleurs.erreur },
                ]}>
                  {cameraActive ? 'Camera' : 'Camera off'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMicActive(v => !v)}
                style={styles.controlItem}
              >
                <View style={[
                  styles.controlCircle,
                  { backgroundColor: micActive ? `${couleurs.primaire}20` : `${couleurs.erreur}20` },
                ]}>
                  <Ionicons
                    name={micActive ? 'mic' : 'mic-off'}
                    size={22}
                    color={micActive ? couleurs.primaire : couleurs.erreur}
                  />
                </View>
                <Text style={[
                  styles.controlLabel,
                  { color: micActive ? couleurs.texte : couleurs.erreur },
                ]}>
                  {micActive ? 'Micro' : 'Micro off'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ====== SECTION DETAILS ====== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={18} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Details du live</Text>
            </View>

            <ChampTexte
              label="Titre"
              placeholder="De quoi parle votre live ?"
              valeur={titre}
              onChangeText={handleChangeTitre}
              autoCapitalize="sentences"
              iconeGauche={<Ionicons name="text-outline" size={18} color={couleurs.texteSecondaire} />}
            />
            <Text style={styles.charCounter}>
              {titre.length}/{MAX_TITRE}
            </Text>

            <ChampTexte
              label="Description (optionnel)"
              placeholder="Ajoutez plus de details..."
              valeur={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              iconeGauche={<Ionicons name="chatbubble-outline" size={18} color={couleurs.texteSecondaire} />}
            />
          </View>

          {/* Spacer pour le bouton fixe */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ====== CTA FIXE EN BAS ====== */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + espacements.sm }]}>
        <LinearGradient
          colors={['transparent', couleurs.fond]}
          style={styles.bottomFade}
          pointerEvents="none"
        />
        <View style={styles.bottomContent}>
          <Bouton
            titre="Lancer le live"
            onPress={handleLancerLive}
            variante="primaire"
            taille="lg"
            chargement={chargement}
            desactive={chargement}
            icone={<Ionicons name="radio" size={20} color={couleurs.blanc} />}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    height: 56,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: couleurs.texte,
  },
  scrollContent: {
    paddingTop: espacements.md,
  },

  // ====== PREVIEW + CONTROLES ======
  previewWrapper: {
    paddingHorizontal: espacements.lg,
    gap: espacements.lg,
  },
  previewCard: {
    borderRadius: rayons.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  previewGradient: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    paddingHorizontal: espacements.lg,
    gap: espacements.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.erreur,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: espacements.sm,
  },
  liveBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.blanc,
  },
  liveBadgeText: {
    color: couleurs.blanc,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewAvatarRing: {
    borderRadius: 40,
    borderWidth: 3,
    borderColor: couleurs.bordureLight,
    padding: 3,
  },
  previewNom: {
    fontSize: 17,
    fontWeight: '700',
    color: couleurs.texte,
  },
  previewSub: {
    fontSize: 13,
    color: couleurs.texteMuted,
    marginTop: -4,
  },

  // ====== CONTROLES ======
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacements.xxl,
  },
  controlItem: {
    alignItems: 'center',
    gap: espacements.sm,
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ====== SECTIONS ======
  section: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: espacements.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: couleurs.texte,
  },
  charCounter: {
    fontSize: 12,
    color: couleurs.texteMuted,
    textAlign: 'right',
    marginTop: -4,
    marginBottom: espacements.sm,
  },

  // ====== BOTTOM CTA ======
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    height: 40,
  },
  bottomContent: {
    paddingHorizontal: espacements.lg,
    backgroundColor: couleurs.fond,
  },
});
