/**
 * Types pour le système de widgets de stories
 * Permet d'ajouter des éléments interactifs sur les stories (liens, texte, emoji, etc.)
 */

// Types de widgets disponibles
export type StoryWidgetType = 'link' | 'location' | 'emoji' | 'text' | 'time' | 'mention';

// Position et transformation d'un widget
export interface WidgetTransform {
  x: number;        // 0-1 position X (% de la largeur)
  y: number;        // 0-1 position Y (% de la hauteur)
  scale: number;    // Échelle (défaut 1)
  rotation: number; // Rotation en degrés
}

// Interface de base pour tous les widgets
export interface StoryWidgetBase {
  id: string;
  type: StoryWidgetType;
  transform: WidgetTransform;
  zIndex: number;
}

// Widget Lien - ouvre une URL au clic
export interface LinkWidget extends StoryWidgetBase {
  type: 'link';
  data: {
    url: string;
    label?: string;
    style: 'pill' | 'arrow' | 'swipe';
  };
}

// Widget Texte - texte stylé
export interface TextWidget extends StoryWidgetBase {
  type: 'text';
  data: {
    text: string;
    fontSize: 'small' | 'medium' | 'large';
    fontStyle: 'default' | 'serif' | 'mono' | 'handwritten';
    color: string;
    backgroundColor?: string;
    textAlign: 'left' | 'center' | 'right';
  };
}

// Widget Heure - affiche l'heure
export interface TimeWidget extends StoryWidgetBase {
  type: 'time';
  data: {
    format: '12h' | '24h';
    style: 'minimal' | 'badge' | 'digital';
    showDate?: boolean;
  };
}

// Widget Emoji
export interface EmojiWidget extends StoryWidgetBase {
  type: 'emoji';
  data: {
    emoji: string;
  };
}

// Widget Location - badge de lieu
export interface LocationWidget extends StoryWidgetBase {
  type: 'location';
  data: {
    label: string;
    lat?: number;
    lng?: number;
  };
}

// Widget Mention - @utilisateur
export interface MentionWidget extends StoryWidgetBase {
  type: 'mention';
  data: {
    userId: string;
    username: string;
    displayName: string;
  };
}

// Type union pour tous les widgets
export type StoryWidget =
  | LinkWidget
  | TextWidget
  | TimeWidget
  | EmojiWidget
  | LocationWidget
  | MentionWidget;

// Fonction helper pour créer un widget avec des valeurs par défaut
export const createDefaultTransform = (): WidgetTransform => ({
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
});

// Styles par défaut pour le widget texte
export const TEXT_STYLES = {
  default: { fontFamily: undefined },
  serif: { fontFamily: 'serif' },
  mono: { fontFamily: 'monospace' },
  handwritten: { fontFamily: undefined, fontStyle: 'italic' as const },
};

// Couleurs prédéfinies pour les widgets
export const WIDGET_COLORS = [
  '#FFFFFF', // Blanc
  '#000000', // Noir
  '#FF4D6D', // Rouge/Rose
  '#4ECDC4', // Turquoise
  '#FFE66D', // Jaune
  '#95E1D3', // Vert menthe
  '#F38181', // Corail
  '#AA96DA', // Violet
  '#4A90D9', // Bleu
  '#FF6B35', // Orange
];

// Tailles de police pour le widget texte
export const TEXT_FONT_SIZES = {
  small: 16,
  medium: 24,
  large: 36,
};
