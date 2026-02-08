/**
 * Live Start - Ecran de preparation avant de lancer un live
 * Interface style Instagram/Twitch avec preview camera, titre, description, parametres
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

  // State
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [chargement, setChargement] = useState(false);

  // Animation pulse badge LIVE
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
    if (texte.length <= MAX_TITRE) {
      setTitre(texte);
    }
  };

  const handleLancerLive = async () => {
    if (chargement) return;

    setChargement(true);
    try {
      const titreAEnvoyer = titre.trim() || undefined;
      const response = await startLive(titreAEnvoyer);

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
        Alert.alert('Erreur', response.message || 'Impossible de lancer le live. Reessayez.');
      }
    } catch (error) {
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
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          disabled={chargement}
        >
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
          <View style={styles.previewContainer}>
            <LinearGradient
              colors={couleurs.gradientSombre as unknown as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewGradient}
            >
              {/* Badge LIVE (haut-gauche) */}
              <View style={styles.liveBadge}>
                <Animated.View style={[styles.liveBadgeDot, { opacity: pulseAnim }]} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>

              {/* Avatar + nom (centre) */}
              <View style={styles.previewCenter}>
                <View style={styles.previewAvatarRing}>
                  <Avatar
                    uri={utilisateur?.avatar}
                    prenom={utilisateur?.prenom || ''}
                    nom={utilisateur?.nom || ''}
                    taille={72}
                  />
                </View>
                <Text style={styles.previewNom}>
                  {utilisateur?.prenom} {utilisateur?.nom}
                </Text>
                {/* Status badges camera/micro off */}
                {(!cameraActive || !micActive) && (
                  <View style={styles.previewStatusRow}>
                    {!cameraActive && (
                      <View style={styles.previewStatusBadge}>
                        <Ionicons name="videocam-off" size={12} color={couleurs.erreur} />
                        <Text style={styles.previewStatusText}>Camera off</Text>
                      </View>
                    )}
                    {!micActive && (
                      <View style={styles.previewStatusBadge}>
                        <Ionicons name="mic-off" size={12} color={couleurs.erreur} />
                        <Text style={styles.previewStatusText}>Micro off</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Controles camera/micro (bas) */}
              <View style={styles.previewControls}>
                <Pressable
                  onPress={() => setCameraActive(v => !v)}
                  style={[
                    styles.controlBtn,
                    cameraActive ? styles.controlBtnActive : styles.controlBtnInactive,
                  ]}
                >
                  <Ionicons
                    name={cameraActive ? 'videocam' : 'videocam-off'}
                    size={22}
                    color={cameraActive ? couleurs.blanc : couleurs.erreur}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setMicActive(v => !v)}
                  style={[
                    styles.controlBtn,
                    micActive ? styles.controlBtnActive : styles.controlBtnInactive,
                  ]}
                >
                  <Ionicons
                    name={micActive ? 'mic' : 'mic-off'}
                    size={22}
                    color={micActive ? couleurs.blanc : couleurs.erreur}
                  />
                </Pressable>
              </View>
            </LinearGradient>
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

          {/* ====== SECTION PARAMETRES ====== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={18} color={couleurs.primaire} />
              <Text style={styles.sectionTitle}>Parametres</Text>
            </View>

            <View style={styles.settingsCard}>
              {/* Camera toggle */}
              <Pressable
                onPress={() => setCameraActive(v => !v)}
                style={styles.settingRow}
              >
                <View style={[
                  styles.settingIcon,
                  { backgroundColor: cameraActive ? `${couleurs.primaire}20` : `${couleurs.erreur}20` },
                ]}>
                  <Ionicons
                    name={cameraActive ? 'videocam' : 'videocam-off'}
                    size={20}
                    color={cameraActive ? couleurs.primaire : couleurs.erreur}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Camera</Text>
                  <Text style={styles.settingSublabel}>
                    {cameraActive ? 'Activee' : 'Desactivee'}
                  </Text>
                </View>
                <View style={[
                  styles.toggleTrack,
                  cameraActive && styles.toggleTrackActive,
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    cameraActive && styles.toggleThumbActive,
                  ]} />
                </View>
              </Pressable>

              <View style={styles.settingSeparator} />

              {/* Micro toggle */}
              <Pressable
                onPress={() => setMicActive(v => !v)}
                style={styles.settingRow}
              >
                <View style={[
                  styles.settingIcon,
                  { backgroundColor: micActive ? `${couleurs.primaire}20` : `${couleurs.erreur}20` },
                ]}>
                  <Ionicons
                    name={micActive ? 'mic' : 'mic-off'}
                    size={20}
                    color={micActive ? couleurs.primaire : couleurs.erreur}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Microphone</Text>
                  <Text style={styles.settingSublabel}>
                    {micActive ? 'Active' : 'Desactive'}
                  </Text>
                </View>
                <View style={[
                  styles.toggleTrack,
                  micActive && styles.toggleTrackActive,
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    micActive && styles.toggleThumbActive,
                  ]} />
                </View>
              </Pressable>
            </View>
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
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
    paddingTop: espacements.sm,
  },
  // Preview camera
  previewContainer: {
    marginHorizontal: espacements.lg,
    borderRadius: rayons.xl,
    overflow: 'hidden',
  },
  previewGradient: {
    aspectRatio: 16 / 9,
    justifyContent: 'space-between',
    padding: espacements.lg,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: couleurs.erreur,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
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
  previewCenter: {
    alignItems: 'center',
    gap: espacements.sm,
  },
  previewAvatarRing: {
    borderRadius: 42,
    borderWidth: 3,
    borderColor: `${couleurs.blanc}30`,
    padding: 3,
  },
  previewNom: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  previewStatusRow: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  previewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${couleurs.erreur}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  previewStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: couleurs.erreur,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacements.lg,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: `${couleurs.blanc}25`,
  },
  controlBtnInactive: {
    backgroundColor: `${couleurs.erreur}25`,
  },
  // Sections
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
  // Settings card
  settingsCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.lg,
    gap: espacements.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: couleurs.texte,
  },
  settingSublabel: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  settingSeparator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginHorizontal: espacements.lg,
  },
  // Toggle switch
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.texteMuted,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: couleurs.primaire,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: couleurs.blanc,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Bottom CTA
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
