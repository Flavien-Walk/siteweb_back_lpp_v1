/**
 * Export de tous les composants
 */

export { default as Avatar } from './Avatar';
export { default as Bouton } from './Bouton';
export { default as ChampTexte } from './ChampTexte';
export { default as Chargement } from './Chargement';
export { default as SplashScreen } from './SplashScreen';

// Nouveaux composants animés
export { default as AnimatedPressable, AnimatedBounceButton, AnimatedListItem } from './AnimatedPressable';
export { default as Skeleton, SkeletonAvatar, SkeletonText, SkeletonPost, SkeletonConversation, SkeletonNotification, SkeletonProfile, SkeletonProjectCard, SkeletonList } from './SkeletonLoader';
export { default as LikeButton, LikeButtonCompact, DoubleTapLike } from './LikeButton';
export { default as AnimatedCounter, StatCounter, NotificationBadge, ChangeCounter } from './AnimatedCounter';

// Composants Stories
export { default as StoryCircle } from './StoryCircle';
export { default as StoriesRow } from './StoriesRow';
export { default as StoryViewer } from './StoryViewer';
export { default as StoryCreator } from './StoryCreator';
export { default as VideoPlayerModal, type VideoOrigin } from './VideoPlayerModal';

// Composants Modération
export { default as StaffActions } from './StaffActions';
export { default as MoreActionsSheet } from './MoreActionsSheet';

// Composants Publications
export { default as PostMediaCarousel, type VideoFullscreenParams } from './PostMediaCarousel';
export { default as PublicationCard, type PublicationCardProps, type VideoOpenParams } from './PublicationCard';
export { default as AdCard } from './AdCard';

// Composants Video & Image Fullscreen
export { default as HeartAnimation } from './HeartAnimation';
export { default as VideoActionsOverlay } from './VideoActionsOverlay';
export { default as ImageViewerModal } from './ImageViewerModal';

// Reels (feed video vertical)
export { default as ReelsVideoPage } from './ReelsVideoPage';
export { default as ReelsAdPage } from './ReelsAdPage';

// Composants Commentaires
// UnifiedCommentsSheet = composant unique pour tous les contextes (feed, profil, fullscreen)
export { default as UnifiedCommentsSheet } from './UnifiedCommentsSheet';

// Composants Live (placeholder)
export { default as LiveCard } from './LiveCard';

// Navigation et UX
export { default as SwipeableScreen } from './SwipeableScreen';
export { default as StorySwipeOverlay } from './StorySwipeOverlay';


// Onglets intégrés
export { default as MessagesTab } from './MessagesTab';

// Keyboard
export { default as KeyboardView } from './KeyboardView';

// Error handling
export { default as ErrorBoundary } from './ErrorBoundary';

// Boutique / Marketplace
export { default as SubscriptionHeroCard } from './SubscriptionHeroCard';
export { default as BoostGoalCard } from './BoostGoalCard';
export { default as BundleCard } from './BundleCard';
export { default as BoostFlowSheet } from './BoostFlowSheet';
export { default as MarketplaceProductCard } from './MarketplaceProductCard';
export { default as ProductDetailSheet } from './ProductDetailSheet';
export { default as CategoryFilterBar } from './CategoryFilterBar';

// Gamification
export { default as QuickQuests } from './QuickQuests';
export { default as OnboardingGuide } from './OnboardingGuide';
export { default as XpToast } from './XpToast';
export { default as NextAction } from './NextAction';

// Badge unifie
export { default as AppBadge } from './AppBadge';
export type { AppBadgeProps } from './AppBadge';
