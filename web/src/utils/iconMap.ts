/**
 * Mapping Ionicons (backend/mobile) → Lucide React (web)
 * Utilise pour convertir les noms d'icones stockes en base.
 */

import {
  Rocket,
  Flame,
  Star,
  Eye,
  Heart,
  MessageCircle,
  Users,
  Briefcase,
  Lightbulb,
  Compass,
  Trophy,
  CheckCircle,
  ChevronRight,
  BookOpen,
  Flag,
  Send,
  UserPlus,
  Pencil,
  Zap,
  Target,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  // Noms exacts
  'rocket': Rocket,
  'rocket-outline': Rocket,
  'flame': Flame,
  'flame-outline': Flame,
  'star': Star,
  'star-outline': Star,
  'eye': Eye,
  'eye-outline': Eye,
  'heart': Heart,
  'heart-outline': Heart,
  'chatbubble': MessageCircle,
  'chatbubble-outline': MessageCircle,
  'chatbubbles': MessageCircle,
  'chatbubbles-outline': MessageCircle,
  'people': Users,
  'people-outline': Users,
  'person-add': UserPlus,
  'person-add-outline': UserPlus,
  'briefcase': Briefcase,
  'briefcase-outline': Briefcase,
  'bulb': Lightbulb,
  'bulb-outline': Lightbulb,
  'compass': Compass,
  'compass-outline': Compass,
  'trophy': Trophy,
  'trophy-outline': Trophy,
  'checkmark-circle': CheckCircle,
  'checkmark-circle-outline': CheckCircle,
  'chevron-forward': ChevronRight,
  'chevron-forward-outline': ChevronRight,
  'book': BookOpen,
  'book-outline': BookOpen,
  'flag': Flag,
  'flag-outline': Flag,
  'send': Send,
  'send-outline': Send,
  'pencil': Pencil,
  'pencil-outline': Pencil,
  'flash': Zap,
  'flash-outline': Zap,
  'target': Target,
  'navigate': Compass,
  'navigate-outline': Compass,
};

/**
 * Resoudre un nom d'icone Ionicons vers un composant Lucide.
 * Retourne Star par defaut si non trouve.
 */
export function getIcon(ionName: string): LucideIcon {
  return ICON_MAP[ionName] || Star;
}
