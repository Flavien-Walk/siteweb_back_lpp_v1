/**
 * ProductDetailSheet — Fiche produit plein ecran style ComeUp / Fiverr
 *
 * Modal fullscreen avec :
 * - Header fixe (back + titre tronque)
 * - ScrollView contenu complet
 * - Barre CTA sticky en bas (prix + bouton contacter)
 *
 * Sections :
 * 1. Image principale + galerie
 * 2. Titre + note + commandes + delai
 * 3. Tags
 * 4. Separateur
 * 5. Profil vendeur (avatar, stats, note)
 * 6. Description longue (expandable)
 * 7. Options / paliers (upsells)
 * 8. FAQ vendeur (accordion)
 * 9. Avis clients (etoiles + commentaires)
 */

import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { MarketplaceProduct, ProductReview } from '../services/boutique';
import { formatPrice, formatProductPrice } from '../services/boutique';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 600;

interface ProductDetailSheetProps {
  visible: boolean;
  product: MarketplaceProduct | null;
  onClose: () => void;
  couleurs: ThemeCouleurs;
}

// ============ SUB-COMPONENTS ============

const StarRating = memo(({ note, size = 14, color = '#F59E0B' }: { note: number; size?: number; color?: string }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(note)) {
      stars.push(<Ionicons key={i} name="star" size={size} color={color} />);
    } else if (i - note < 1 && i - note > 0) {
      stars.push(<Ionicons key={i} name="star-half" size={size} color={color} />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={size} color={color} />);
    }
  }
  return <View style={{ flexDirection: 'row', gap: 1 }}>{stars}</View>;
});

const ReviewCard = memo(({ review, couleurs }: { review: ProductReview; couleurs: ThemeCouleurs }) => {
  const s = reviewStyles(couleurs);
  return (
    <View style={s.card}>
      <View style={s.header}>
        {review.avatar ? (
          <Image source={{ uri: review.avatar }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitial}>{review.auteur[0]}</Text>
          </View>
        )}
        <View style={s.headerInfo}>
          <Text style={s.auteur}>{review.auteur}</Text>
          <Text style={s.date}>
            {new Date(review.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <StarRating note={review.note} size={12} />
      </View>
      <Text style={s.commentaire}>{review.commentaire}</Text>
    </View>
  );
});

const reviewStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    card: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginBottom: espacements.sm,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#7C5CFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    headerInfo: {
      flex: 1,
    },
    auteur: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
    },
    date: {
      fontSize: 11,
      color: couleurs.texteMuted,
    },
    commentaire: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      lineHeight: 19,
    },
  });

// ============ MAIN COMPONENT ============

export default function ProductDetailSheet({ visible, product, onClose, couleurs }: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs, insets);
  const [imgError, setImgError] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  // Animations
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const startX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      dragX.value = 0;
      overlayOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 25, stiffness: 300, mass: 0.8 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200, easing: Easing.out(Easing.cubic) });
    }
  }, [visible]);

  const toggleOption = useCallback((optId: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optId)) next.delete(optId);
      else next.add(optId);
      return next;
    });
  }, []);

  const totalPrice = useMemo(() => {
    const base = product?.prix ?? 0;
    const optionsTotal = product?.options?.reduce((sum, opt) => {
      return selectedOptions.has(opt.id) ? sum + opt.prix : sum;
    }, 0) ?? 0;
    return base + optionsTotal;
  }, [product?.prix, product?.options, selectedOptions]);

  const resetState = useCallback(() => {
    setImgError(false);
    setExpandedFaq(null);
    setShowAllReviews(false);
    setDescExpanded(false);
    setSelectedOptions(new Set());
  }, []);

  const dismissRight = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const dismissDown = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    overlayOpacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    }, () => {
      runOnJS(onClose)();
    });
  }, [onClose, resetState]);

  // Swipe-right: manualActivation — fail instantly if NOT near left edge
  // → ScrollView receives touch with ZERO delay for non-edge touches
  const EDGE_WIDTH = 50;
  const swipeRightGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      const x = event.allTouches[0]?.absoluteX ?? SCREEN_WIDTH;
      startX.value = x;
      if (x > EDGE_WIDTH) {
        manager.fail(); // Not near edge → release touch instantly
      }
    })
    .onTouchesMove((_event, manager) => {
      if (startX.value <= EDGE_WIDTH) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onUpdate((event) => {
      const clampedX = Math.max(0, event.translationX);
      dragX.value = clampedX;
      overlayOpacity.value = 1 - Math.min(clampedX / SCREEN_WIDTH, 1) * 0.6;
    })
    .onEnd((event) => {
      const shouldDismiss =
        dragX.value > DISMISS_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        overlayOpacity.value = withTiming(0, { duration: 150 });
        dragX.value = withTiming(SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }, () => {
          runOnJS(dismissRight)();
        });
      } else {
        dragX.value = withSpring(0, { damping: 25, stiffness: 300 });
        overlayOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  // Swipe-down: only on header area (not on scroll content)
  const swipeDownGesture = Gesture.Pan()
    .activeOffsetY(15)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      const clampedY = Math.max(0, event.translationY);
      dragY.value = clampedY;
      overlayOpacity.value = 1 - Math.min(clampedY / 400, 1) * 0.5;
    })
    .onEnd((event) => {
      const shouldDismiss =
        dragY.value > DISMISS_THRESHOLD || event.velocityY > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        overlayOpacity.value = withTiming(0, { duration: 150 });
        dragY.value = withTiming(SCREEN_HEIGHT, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }, () => {
          runOnJS(dismissDown)();
        });
      } else {
        dragY.value = withSpring(0, { damping: 25, stiffness: 300 });
        overlayOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: translateY.value + dragY.value },
    ],
  }));

  if (!product) return null;

  const displayedReviews = showAllReviews ? product.reviews : product.reviews.slice(0, 3);
  const DESC_LIMIT = 200;
  const needsTruncation = product.descriptionLongue.length > DESC_LIMIT;
  const displayDesc = descExpanded || !needsTruncation
    ? product.descriptionLongue
    : product.descriptionLongue.slice(0, DESC_LIMIT) + '...';

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={s.gestureRoot}>
        {/* Overlay */}
        <Animated.View style={[s.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Full-screen sheet — swipe-right from left edge */}
        <GestureDetector gesture={swipeRightGesture}>
          <Animated.View style={[s.container, sheetStyle]}>

            {/* ===== HEADER FIXE — swipe-down to dismiss ===== */}
            <GestureDetector gesture={swipeDownGesture}>
              <Animated.View style={s.header}>
                <Pressable
                  style={({ pressed }) => [s.headerBack, pressed && { opacity: 0.6 }]}
                  onPress={handleClose}
                  hitSlop={12}
                >
                  <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
                </Pressable>
                <Text style={s.headerTitle} numberOfLines={1}>
                  {product.nom}
                </Text>
                <View style={s.headerRight}>
                  <Pressable
                    style={({ pressed }) => [s.headerAction, pressed && { opacity: 0.6 }]}
                    hitSlop={8}
                  >
                    <Ionicons name="share-outline" size={20} color={couleurs.texte} />
                  </Pressable>
                </View>
              </Animated.View>
            </GestureDetector>

            {/* ===== SCROLLABLE BODY — free scroll, no gesture interference ===== */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
              bounces={true}
            >
              {/* 1. IMAGE */}
              <View style={s.imageContainer}>
                {!imgError ? (
                  <Image
                    source={{ uri: product.image }}
                    style={s.image}
                    resizeMode="cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <View style={s.imageFallback}>
                    <Ionicons name="image-outline" size={48} color={couleurs.texteMuted} />
                  </View>
                )}
                {product.estNouveau && (
                  <View style={s.newBadge}>
                    <Text style={s.newBadgeText}>Nouveau</Text>
                  </View>
                )}
              </View>

              {/* Gallery thumbnails */}
              {product.gallery && product.gallery.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.gallery}
                  contentContainerStyle={s.galleryContent}
                >
                  <Pressable style={[s.galleryThumb, s.galleryThumbActive]}>
                    <Image source={{ uri: product.image }} style={s.galleryImg} resizeMode="cover" />
                  </Pressable>
                  {product.gallery.map((uri, i) => (
                    <Pressable key={i} style={s.galleryThumb}>
                      <Image source={{ uri }} style={s.galleryImg} resizeMode="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* 2. HEADER: titre + stats */}
              <View style={s.body}>
                <Text style={s.productName}>{product.nom}</Text>

                <View style={s.statsRow}>
                  <View style={s.statChip}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={s.statChipText}>{product.noteGlobale.toFixed(1)}</Text>
                    <Text style={s.statChipMuted}>({product.nombreAvis})</Text>
                  </View>
                  <View style={s.statChip}>
                    <Ionicons name="bag-check-outline" size={13} color={couleurs.texteSecondaire} />
                    <Text style={s.statChipText}>{product.commandesRealisees} ventes</Text>
                  </View>
                  <View style={s.statChip}>
                    <Ionicons name="time-outline" size={13} color={couleurs.texteSecondaire} />
                    <Text style={s.statChipText}>{product.delaiLivraison}</Text>
                  </View>
                </View>

                {/* 3. Tags */}
                <View style={s.tags}>
                  {product.tags.map((tag, i) => (
                    <View key={i} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Separator */}
                <View style={s.separator} />

                {/* 5. VENDEUR */}
                <View style={s.sellerCard}>
                  <View style={s.sellerTop}>
                    {product.createur.avatar ? (
                      <Image source={{ uri: product.createur.avatar }} style={s.sellerAvatar} />
                    ) : (
                      <View style={s.sellerAvatarFallback}>
                        <Text style={s.sellerAvatarInitial}>{product.createur.nom[0]}</Text>
                      </View>
                    )}
                    <View style={s.sellerInfo}>
                      <Text style={s.sellerName}>{product.createur.nom}</Text>
                      <Text style={s.sellerSince}>Membre depuis {product.createur.membreDepuis}</Text>
                    </View>
                    <View style={s.sellerRatingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={s.sellerRatingText}>{product.createur.note.toFixed(1)}</Text>
                    </View>
                  </View>
                  <View style={s.sellerStats}>
                    <View style={s.sellerStatItem}>
                      <Ionicons name="chatbubble-outline" size={14} color="#7C5CFF" />
                      <Text style={s.sellerStatValue}>{product.createur.tempsReponse}</Text>
                      <Text style={s.sellerStatLabel}>Reponse</Text>
                    </View>
                    <View style={s.sellerStatDivider} />
                    <View style={s.sellerStatItem}>
                      <Ionicons name="checkmark-done-outline" size={14} color="#10B981" />
                      <Text style={s.sellerStatValue}>{product.createur.tauxCompletion}%</Text>
                      <Text style={s.sellerStatLabel}>Completion</Text>
                    </View>
                    <View style={s.sellerStatDivider} />
                    <View style={s.sellerStatItem}>
                      <Ionicons name="bag-check-outline" size={14} color="#F59E0B" />
                      <Text style={s.sellerStatValue}>{product.createur.ventesRealisees}</Text>
                      <Text style={s.sellerStatLabel}>Ventes</Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [s.sellerContactBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7C5CFF" />
                    <Text style={s.sellerContactText}>Contacter {product.createur.nom.split(' ')[0]}</Text>
                  </Pressable>
                </View>

                {/* Separator */}
                <View style={s.separator} />

                {/* 6. DESCRIPTION */}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Description</Text>
                  <Text style={s.description}>{displayDesc}</Text>
                  {needsTruncation && (
                    <Pressable onPress={() => setDescExpanded(!descExpanded)} style={s.readMoreBtn}>
                      <Text style={s.readMoreText}>
                        {descExpanded ? 'Voir moins' : 'Lire la suite'}
                      </Text>
                      <Ionicons
                        name={descExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#7C5CFF"
                      />
                    </Pressable>
                  )}
                </View>

                {/* 7. OPTIONS (checkboxes) */}
                {product.options && product.options.length > 0 && (
                  <>
                    <View style={s.separator} />
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>Options disponibles</Text>
                      {product.options.map(opt => {
                        const isSelected = selectedOptions.has(opt.id);
                        return (
                          <Pressable
                            key={opt.id}
                            style={[s.optionCard, isSelected && s.optionCardSelected]}
                            onPress={() => toggleOption(opt.id)}
                          >
                            <View style={[s.optionCheckbox, isSelected && s.optionCheckboxChecked]}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              )}
                            </View>
                            <View style={s.optionInfo}>
                              <Text style={s.optionLabel}>{opt.label}</Text>
                              <Text style={s.optionDesc}>{opt.description}</Text>
                            </View>
                            <Text style={[s.optionPrice, isSelected && s.optionPriceSelected]}>
                              +{formatPrice(opt.prix)}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {selectedOptions.size > 0 && (
                        <View style={s.optionsSummary}>
                          <Text style={s.optionsSummaryLabel}>
                            {selectedOptions.size} option{selectedOptions.size > 1 ? 's' : ''} selectionnee{selectedOptions.size > 1 ? 's' : ''}
                          </Text>
                          <Text style={s.optionsSummaryPrice}>
                            Total : {formatPrice(totalPrice)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* 8. FAQ */}
                {product.faq && product.faq.length > 0 && (
                  <>
                    <View style={s.separator} />
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>Questions frequentes</Text>
                      {product.faq.map((item, i) => (
                        <Pressable
                          key={i}
                          style={[s.faqItem, expandedFaq === i && s.faqItemExpanded]}
                          onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        >
                          <View style={s.faqHeader}>
                            <Text style={s.faqQuestion}>{item.question}</Text>
                            <Ionicons
                              name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={couleurs.texteSecondaire}
                            />
                          </View>
                          {expandedFaq === i && (
                            <Text style={s.faqAnswer}>{item.answer}</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {/* 9. AVIS */}
                <View style={s.separator} />
                <View style={s.section}>
                  <View style={s.reviewsHeader}>
                    <Text style={s.sectionTitle}>Avis clients</Text>
                    <View style={s.reviewsSummary}>
                      <StarRating note={product.noteGlobale} size={16} />
                      <Text style={s.reviewsScore}>{product.noteGlobale.toFixed(1)}</Text>
                      <Text style={s.reviewsCount}>({product.nombreAvis} avis)</Text>
                    </View>
                  </View>

                  {displayedReviews.map(review => (
                    <ReviewCard key={review.id} review={review} couleurs={couleurs} />
                  ))}

                  {product.reviews.length > 3 && !showAllReviews && (
                    <Pressable style={s.showAllBtn} onPress={() => setShowAllReviews(true)}>
                      <Text style={s.showAllText}>
                        Voir les {product.nombreAvis} avis
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#7C5CFF" />
                    </Pressable>
                  )}
                </View>

                {/* Reassurance footer */}
                <View style={s.reassurance}>
                  <View style={s.reassuranceItem}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                    <Text style={s.reassuranceText}>Paiement securise</Text>
                  </View>
                  <View style={s.reassuranceItem}>
                    <Ionicons name="chatbubbles-outline" size={16} color="#10B981" />
                    <Text style={s.reassuranceText}>SAV disponible</Text>
                  </View>
                  <View style={s.reassuranceItem}>
                    <Ionicons name="refresh-outline" size={16} color="#10B981" />
                    <Text style={s.reassuranceText}>Revision incluse</Text>
                  </View>
                </View>

                {/* Spacer for CTA bar */}
                <View style={{ height: 100 }} />
              </View>
            </ScrollView>

            {/* ===== CTA BAR STICKY ===== */}
            <View style={s.ctaBar}>
              <View style={s.ctaPriceBlock}>
                <Text style={s.ctaPriceLabel}>
                  {selectedOptions.size > 0 ? 'Total' : 'A partir de'}
                </Text>
                <Text style={s.ctaPrice}>{formatPrice(totalPrice)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.ctaButton, pressed && { opacity: 0.85 }]}
                onPress={handleClose}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={s.ctaButtonText}>Contacter</Text>
              </Pressable>
            </View>

          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ============ STYLES ============

const createStyles = (couleurs: ThemeCouleurs, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      flex: 1,
      backgroundColor: couleurs.fondCard,
      marginTop: Platform.OS === 'ios' ? 0 : 0,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      paddingHorizontal: espacements.md,
      backgroundColor: couleurs.fondCard,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
      zIndex: 10,
    },
    headerBack: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: couleurs.texte,
      marginHorizontal: espacements.sm,
    },
    headerRight: {
      flexDirection: 'row',
      gap: espacements.sm,
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Scroll
    scrollContent: {
      paddingBottom: 0,
    },

    // Image
    imageContainer: {
      height: 240,
      backgroundColor: couleurs.fond,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newBadge: {
      position: 'absolute',
      top: espacements.md,
      left: espacements.md,
      backgroundColor: '#7C5CFF',
      borderRadius: rayons.full,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    newBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },

    // Gallery
    gallery: {
      paddingVertical: espacements.md,
    },
    galleryContent: {
      paddingHorizontal: espacements.lg,
      gap: espacements.sm,
    },
    galleryThumb: {
      width: 60,
      height: 60,
      borderRadius: rayons.sm,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    galleryThumbActive: {
      borderColor: '#7C5CFF',
    },
    galleryImg: {
      width: '100%',
      height: '100%',
    },

    // Body
    body: {
      paddingHorizontal: espacements.xl,
    },

    // Product name
    productName: {
      fontSize: 22,
      fontWeight: '700',
      color: couleurs.texte,
      lineHeight: 28,
      marginBottom: espacements.md,
    },

    // Stats row — chips
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
      marginBottom: espacements.lg,
    },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: couleurs.fond,
      borderRadius: rayons.full,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    statChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: couleurs.texte,
    },
    statChipMuted: {
      fontSize: 11,
      color: couleurs.texteMuted,
    },

    // Tags
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
      marginBottom: espacements.lg,
    },
    tag: {
      backgroundColor: 'rgba(124, 92, 255, 0.1)',
      borderRadius: rayons.full,
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#7C5CFF',
    },

    // Separator
    separator: {
      height: 1,
      backgroundColor: couleurs.bordure,
      marginVertical: espacements.lg,
    },

    // Seller
    sellerCard: {
      marginBottom: 0,
    },
    sellerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginBottom: espacements.lg,
    },
    sellerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    sellerAvatarFallback: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#7C5CFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sellerAvatarInitial: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
    },
    sellerInfo: {
      flex: 1,
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '700',
      color: couleurs.texte,
    },
    sellerSince: {
      fontSize: 12,
      color: couleurs.texteMuted,
      marginTop: 2,
    },
    sellerRatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderRadius: rayons.full,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    sellerRatingText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#F59E0B',
    },
    sellerStats: {
      flexDirection: 'row',
      backgroundColor: couleurs.fond,
      borderRadius: rayons.lg,
      padding: espacements.md,
      marginBottom: espacements.md,
    },
    sellerStatItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    sellerStatDivider: {
      width: 1,
      backgroundColor: couleurs.bordure,
      marginVertical: 4,
    },
    sellerStatLabel: {
      fontSize: 10,
      color: couleurs.texteMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    sellerStatValue: {
      fontSize: 14,
      fontWeight: '700',
      color: couleurs.texte,
    },
    sellerContactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      borderWidth: 1.5,
      borderColor: '#7C5CFF',
      borderRadius: rayons.full,
      paddingVertical: 10,
    },
    sellerContactText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#7C5CFF',
    },

    // Sections
    section: {
      marginBottom: 0,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.md,
    },
    description: {
      fontSize: 14,
      color: couleurs.texte,
      lineHeight: 22,
    },
    readMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: espacements.sm,
    },
    readMoreText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#7C5CFF',
    },

    // Options (checkbox)
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: '#7C5CFF',
      backgroundColor: 'rgba(124, 92, 255, 0.06)',
    },
    optionCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: couleurs.bordure,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    optionCheckboxChecked: {
      backgroundColor: '#7C5CFF',
      borderColor: '#7C5CFF',
    },
    optionInfo: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
    },
    optionDesc: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    optionPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: couleurs.texteMuted,
      marginLeft: espacements.sm,
    },
    optionPriceSelected: {
      color: '#7C5CFF',
    },
    optionsSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(124, 92, 255, 0.08)',
      borderRadius: rayons.md,
      paddingVertical: espacements.sm,
      paddingHorizontal: espacements.md,
      marginTop: espacements.xs,
    },
    optionsSummaryLabel: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },
    optionsSummaryPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: '#7C5CFF',
    },

    // FAQ
    faqItem: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    faqItemExpanded: {
      borderWidth: 1,
      borderColor: 'rgba(124, 92, 255, 0.2)',
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    faqQuestion: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
      flex: 1,
      marginRight: espacements.sm,
    },
    faqAnswer: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      lineHeight: 20,
      marginTop: espacements.md,
    },

    // Reviews
    reviewsHeader: {
      marginBottom: espacements.lg,
    },
    reviewsSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginTop: espacements.sm,
    },
    reviewsScore: {
      fontSize: 16,
      fontWeight: '700',
      color: couleurs.texte,
    },
    reviewsCount: {
      fontSize: 13,
      color: couleurs.texteMuted,
    },
    showAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      marginTop: espacements.sm,
    },
    showAllText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#7C5CFF',
    },

    // Reassurance
    reassurance: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: espacements.xl,
      marginTop: espacements.lg,
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
    },
    reassuranceItem: {
      alignItems: 'center',
      gap: 6,
    },
    reassuranceText: {
      fontSize: 11,
      fontWeight: '600',
      color: couleurs.texteMuted,
    },

    // CTA Bar
    ctaBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: espacements.xl,
      paddingTop: espacements.md,
      paddingBottom: insets.bottom + espacements.md,
      backgroundColor: couleurs.fondCard,
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
      gap: espacements.lg,
    },
    ctaPriceBlock: {
      gap: 2,
    },
    ctaPriceLabel: {
      fontSize: 11,
      color: couleurs.texteMuted,
    },
    ctaPrice: {
      fontSize: 22,
      fontWeight: '800',
      color: '#7C5CFF',
    },
    ctaButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      backgroundColor: '#7C5CFF',
      borderRadius: rayons.full,
      paddingVertical: 14,
    },
    ctaButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });
