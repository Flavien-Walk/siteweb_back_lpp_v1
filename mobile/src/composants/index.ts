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

// Composants Publications
export { default as PostMediaCarousel, type VideoFullscreenParams } from './PostMediaCarousel';
export { default as PublicationCard, type PublicationCardProps, type VideoOpenParams } from './PublicationCard';

// Composants Video
export { default as HeartAnimation } from './HeartAnimation';
export { default as VideoActionsOverlay } from './VideoActionsOverlay';

// Composants Commentaires
// UnifiedCommentsSheet = composant unique pour tous les contextes (feed, profil, fullscreen)
export { default as UnifiedCommentsSheet } from './UnifiedCommentsSheet';

// Composants Live (placeholder)
export { default as LiveCard } from './LiveCard';
