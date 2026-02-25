/**
 * EmojiPicker - Sélecteur d'emoji pour les stories
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { espacements, rayons, typographie } from '../../../constantes/theme';
import { useTheme, ThemeCouleurs } from '../../../contexts/ThemeContext';

// Emojis populaires par catégorie
const EMOJI_CATEGORIES = {
  recent: ['😊', '❤️', '🔥', '👍', '😂', '🎉', '✨', '💪'],
  smileys: ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '🤩', '😘', '😗', '😚', '🙂', '🤗', '🤭', '😉', '😌', '😋', '🤪', '😜', '😝', '🤑', '🤓', '😎', '🥳'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💝', '💘', '💕', '💞', '💓', '💗', '💟'],
  gestures: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '☝️', '✋', '🖐️', '🖖', '👋', '🤙', '💪'],
  nature: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🌈', '☀️', '🌙', '⭐', '✨', '🔥', '💧', '🌊', '🍀', '🌿', '🌲', '🌴'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '☕', '🧋', '🍷', '🍹', '🥂', '🍾'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎯', '🎮', '🎸', '🎹', '🎤', '🎧', '🎬', '📷', '🎨', '🎭'],
  objects: ['💎', '👑', '💍', '🎁', '🎀', '🎈', '🎊', '🎉', '🏆', '🥇', '🎖️', '📱', '💻', '⌚', '📸', '💡', '🔑', '🗝️'],
  symbols: ['❤️‍🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗯️', '💭', '💤', '🎵', '🎶', '✅', '❌', '⭕', '❗', '❓', '⚡'],
};

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const categories: { key: keyof typeof EMOJI_CATEGORIES; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'smileys', label: 'Smileys', icon: 'happy-outline' },
    { key: 'hearts', label: 'Coeurs', icon: 'heart-outline' },
    { key: 'gestures', label: 'Gestes', icon: 'hand-left-outline' },
    { key: 'nature', label: 'Nature', icon: 'leaf-outline' },
    { key: 'food', label: 'Food', icon: 'fast-food-outline' },
    { key: 'activities', label: 'Activites', icon: 'football-outline' },
    { key: 'objects', label: 'Objets', icon: 'gift-outline' },
    { key: 'symbols', label: 'Symboles', icon: 'shapes-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: couleurs.fond }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: couleurs.texte }]}>
              Choisir un emoji
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={couleurs.texte} />
            </Pressable>
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat.key && {
                    backgroundColor: couleurs.primaire,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={selectedCategory === cat.key ? couleurs.blanc : couleurs.texteSecondaire}
                />
              </Pressable>
            ))}
          </ScrollView>

          {/* Emoji grid */}
          <ScrollView style={styles.emojiScroll}>
            <View style={styles.emojiGrid}>
              {EMOJI_CATEGORIES[selectedCategory].map((emoji, index) => (
                <Pressable
                  key={`${emoji}-${index}`}
                  style={styles.emojiButton}
                  onPress={() => handleSelect(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    height: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
  },
  categoryScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryContent: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    gap: espacements.xs,
  },
  categoryTab: {
    width: 40,
    height: 36,
    borderRadius: rayons.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiScroll: {
    flex: 1,
    padding: espacements.md,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
});

export default EmojiPicker;
