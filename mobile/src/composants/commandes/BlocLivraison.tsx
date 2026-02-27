/**
 * BlocLivraison — Affiche les livrables securises
 */
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import type { OrderDeliverable } from '../../types/boutique';

const ICON_MAP: Record<string, string> = {
  message: 'chatbubble-outline',
  file: 'document-outline',
  link: 'link-outline',
};

interface Props {
  deliverables: OrderDeliverable[];
  couleurs: ThemeCouleurs;
}

function BlocLivraison({ deliverables, couleurs }: Props) {
  const s = createStyles(couleurs);

  if (!deliverables || deliverables.length === 0) return null;

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="gift-outline" size={16} color="#8B5CF6" />
        <Text style={s.title}>Livrables</Text>
        <Text style={s.count}>{deliverables.length}</Text>
      </View>

      {deliverables.map((d, i) => (
        <View key={d._id || i} style={s.item}>
          <View style={s.iconWrap}>
            <Ionicons name={ICON_MAP[d.type] as any || 'document-outline'} size={18} color="#8B5CF6" />
          </View>
          <View style={s.itemContent}>
            {d.type === 'message' && (
              <Text style={s.message}>{d.content}</Text>
            )}
            {d.type === 'link' && (
              <Pressable onPress={() => handleOpenLink(d.content)}>
                <Text style={s.link} numberOfLines={2}>{d.content}</Text>
              </Pressable>
            )}
            {d.type === 'file' && d.file && (
              <Pressable onPress={() => handleOpenLink(d.file!.url)}>
                <Text style={s.fileName}>{d.file.name}</Text>
                <Text style={s.fileSize}>
                  {(d.file.size / 1024).toFixed(0)} Ko
                </Text>
              </Pressable>
            )}
            <Text style={s.date}>
              {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default memo(BlocLivraison);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      marginBottom: espacements.lg,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: espacements.md },
    title: { fontSize: 15, fontWeight: '700', color: couleurs.texte, flex: 1 },
    count: {
      fontSize: 12, fontWeight: '700', color: '#8B5CF6',
      backgroundColor: '#8B5CF615', borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    item: {
      flexDirection: 'row', gap: 10,
      paddingVertical: espacements.md,
      borderTopWidth: 1, borderTopColor: couleurs.bordure,
    },
    iconWrap: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#8B5CF610', justifyContent: 'center', alignItems: 'center',
    },
    itemContent: { flex: 1 },
    message: { fontSize: 13, color: couleurs.texte, lineHeight: 20 },
    link: { fontSize: 13, color: '#3B82F6', textDecorationLine: 'underline' },
    fileName: { fontSize: 13, fontWeight: '600', color: couleurs.texte },
    fileSize: { fontSize: 11, color: couleurs.texteMuted, marginTop: 2 },
    date: { fontSize: 11, color: couleurs.texteMuted, marginTop: 6 },
  });
