/**
 * Ecran Creation de Service — La Premiere Pierre
 * Formulaire multi-etapes (3 steps) pour publier un service marketplace
 *
 * Step 1: Informations de base (nom, description, categorie, prix, delai)
 * Step 2: Medias et tags (image principale, gallery, tags)
 * Step 3: Options, FAQ et preview avant publication
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, SafeAreaView, Platform, Alert, Image, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { espacements } from '../../src/constantes/theme';
import createStyles from '../../src/features/boutique/creer-service.styles';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import { creerServiceMarketplace, modifierServiceMarketplace, viewMarketplaceProduct, MarketplaceCategory } from '../../src/services/boutique';

// ============ CONSTANTES ============
const CATEGORIES = [
  { id: 'service' as MarketplaceCategory, label: 'Service', icon: 'construct-outline' as const },
  { id: 'formation' as MarketplaceCategory, label: 'Formation', icon: 'school-outline' as const },
  { id: 'produit' as MarketplaceCategory, label: 'Produit', icon: 'cube-outline' as const },
  { id: 'outil' as MarketplaceCategory, label: 'Outil', icon: 'hardware-chip-outline' as const },
  { id: 'accompagnement' as MarketplaceCategory, label: 'Accompagnement', icon: 'people-outline' as const },
];
const STEP_LABELS = ['Informations', 'Medias & tags', 'Options & FAQ'];
const MAX_TAGS = 8;
const MAX_GALLERY = 4;

interface OptionItem { label: string; description: string; prix: string }
interface FaqItem { question: string; answer: string }

const pickImage = async (aspect: [number, number] = [16, 9]): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8, base64: true,
  });
  if (!result.canceled && result.assets[0]) {
    return `data:image/jpeg;base64,${result.assets[0].base64}`;
  }
  return null;
};

// ============ ECRAN PRINCIPAL ============
export default function CreerServiceScreen() {
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs);

  const isEditMode = !!serviceId;
  const [loading, setLoading] = useState(isEditMode);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Step 1
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState<MarketplaceCategory | ''>('');
  const [prix, setPrix] = useState('');
  const [surDevis, setSurDevis] = useState(false);
  const [delaiNombre, setDelaiNombre] = useState('');
  const [delaiUnite, setDelaiUnite] = useState<'heures' | 'jours' | 'semaines'>('jours');
  // Step 2
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [galleryUris, setGalleryUris] = useState<(string | null)[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // Step 3
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);

  // Charger les donnees en mode edition
  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      const res = await viewMarketplaceProduct(serviceId);
      if (res.succes && res.data) {
        const p = res.data.product;
        setNom(p.nom);
        setDescription(p.descriptionLongue || p.description || '');
        setCategorie((p.categorie || '') as MarketplaceCategory);
        if (p.prix === null || p.prix === undefined) { setSurDevis(true); } else { setPrix(String(p.prix)); }
        if (p.delaiLivraison) {
          const match = p.delaiLivraison.match(/^(\d+)\s*(heures?|jours?|semaines?)$/i);
          if (match) {
            setDelaiNombre(match[1]);
            const u = match[2].toLowerCase();
            setDelaiUnite(u.startsWith('heure') ? 'heures' : u.startsWith('semaine') ? 'semaines' : 'jours');
          } else {
            setDelaiNombre(p.delaiLivraison.replace(/\D/g, '') || p.delaiLivraison);
          }
        }
        if (p.image) setImageUri(p.image);
        if (p.gallery?.length) setGalleryUris(p.gallery);
        if (p.tags?.length) setTags(p.tags);
        if (p.options?.length) setOptions(p.options.map(o => ({ label: o.label, description: o.description || '', prix: String(o.prix) })));
        if (p.faq?.length) setFaqItems(p.faq);
      }
      setLoading(false);
    })();
  }, [serviceId]);

  // Validation
  const delaiLivraison = delaiNombre.trim() ? `${delaiNombre} ${delaiUnite}` : '';

  const isStep1Valid = useCallback(() => (
    nom.trim().length > 0 && description.trim().length > 0 &&
    categorie !== '' && delaiNombre.trim().length > 0 && !isNaN(Number(delaiNombre)) &&
    (surDevis || (prix.trim().length > 0 && !isNaN(parseFloat(prix))))
  ), [nom, description, categorie, prix, surDevis, delaiNombre]);

  const isStep2Valid = useCallback(() => !!imageUri, [imageUri]);

  // Image handlers
  const handlePickMainImage = useCallback(async () => { const uri = await pickImage(); if (uri) setImageUri(uri); }, []);
  const handleRemoveMainImage = useCallback(() => setImageUri(null), []);
  const handlePickGalleryImage = useCallback(async () => {
    if (galleryUris.length >= MAX_GALLERY) return;
    const uri = await pickImage([4, 3]);
    if (uri) setGalleryUris(prev => [...prev, uri]);
  }, [galleryUris.length]);
  const handleRemoveGalleryImage = useCallback((i: number) => setGalleryUris(prev => prev.filter((_, idx) => idx !== i)), []);

  // Tag handlers
  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && tags.length < MAX_TAGS && !tags.includes(trimmed)) { setTags(prev => [...prev, trimmed]); setTagInput(''); }
  }, [tagInput, tags]);
  const handleRemoveTag = useCallback((i: number) => setTags(prev => prev.filter((_, idx) => idx !== i)), []);

  // Options handlers
  const handleAddOption = useCallback(() => setOptions(prev => [...prev, { label: '', description: '', prix: '' }]), []);
  const handleUpdateOption = useCallback((i: number, f: keyof OptionItem, v: string) => setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [f]: v } : o)), []);
  const handleRemoveOption = useCallback((i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i)), []);

  // FAQ handlers
  const handleAddFaq = useCallback(() => setFaqItems(prev => [...prev, { question: '', answer: '' }]), []);
  const handleUpdateFaq = useCallback((i: number, f: keyof FaqItem, v: string) => setFaqItems(prev => prev.map((fq, idx) => idx === i ? { ...fq, [f]: v } : fq)), []);
  const handleRemoveFaq = useCallback((i: number) => setFaqItems(prev => prev.filter((_, idx) => idx !== i)), []);

  // Navigation
  const canProceed = step === 0 ? isStep1Valid() : step === 1 ? isStep2Valid() : true;

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!imageUri) return;
    setSubmitting(true);
    try {
      const descCourte = description.length > 200 ? description.slice(0, 197) + '...' : description;
      const payload = {
        nom, description: descCourte, descriptionLongue: description, categorie: categorie as string,
        prix: surDevis ? null : parseFloat(prix), image: imageUri,
        gallery: galleryUris.filter(Boolean) as string[], tags, delaiLivraison,
        options: options.filter(o => o.label.trim()).map(o => ({ label: o.label, description: o.description, prix: parseFloat(o.prix) || 0 })),
        faq: faqItems.filter(f => f.question.trim() && f.answer.trim()),
      };
      const res = isEditMode
        ? await modifierServiceMarketplace(serviceId!, payload)
        : await creerServiceMarketplace(payload);
      if (res.succes) {
        Alert.alert('Succes', isEditMode ? 'Service mis a jour !' : 'Votre service a ete publie !', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Erreur', res.message || 'Erreur lors de la publication.');
      }
    } catch { Alert.alert('Erreur', 'Erreur lors de la publication.'); } finally { setSubmitting(false); }
  }, [nom, description, categorie, prix, surDevis, imageUri, galleryUris, tags, delaiLivraison, options, faqItems, router, isEditMode, serviceId]);

  // ============ RENDER HELPERS ============

  const renderStepIndicator = () => (
    <View>
      <View style={s.stepIndicator}>
        {STEP_LABELS.map((_, i) => <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />)}
      </View>
      <Text style={s.stepLabel}>Etape {step + 1}/{STEP_LABELS.length} — {STEP_LABELS[step]}</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Informations de base</Text>
      <Text style={s.sectionSubtitle}>Decrivez votre service en detail</Text>

      <Text style={s.inputLabel}>Nom du service *</Text>
      <TextInput style={s.input} value={nom} onChangeText={setNom} placeholder="Ex: Coaching business personnalise" placeholderTextColor={couleurs.texteMuted} maxLength={80} />
      <Text style={s.inputHelper}>{nom.length}/80 caracteres</Text>

      <Text style={s.inputLabel}>Description *</Text>
      <TextInput style={[s.input, s.inputMultiline, { minHeight: 120 }]} value={description} onChangeText={setDescription} placeholder="Decrivez en detail ce que comprend votre service..." placeholderTextColor={couleurs.texteMuted} multiline maxLength={2000} />
      <Text style={s.inputHelper}>{description.length}/2000 caracteres</Text>

      <Text style={s.inputLabel}>Categorie *</Text>
      <View style={s.categoryGrid}>
        {CATEGORIES.map(cat => (
          <Pressable key={cat.id} style={[s.categoryChip, categorie === cat.id && s.categoryChipSelected]} onPress={() => setCategorie(cat.id)}>
            <Ionicons name={cat.icon} size={16} color={categorie === cat.id ? '#7C5CFF' : couleurs.texteMuted} style={s.categoryChipIcon} />
            <Text style={[s.categoryChipText, categorie === cat.id && { color: '#7C5CFF', fontWeight: '600' }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.inputLabel}>Prix (EUR)</Text>
      <Pressable style={s.checkboxRow} onPress={() => setSurDevis(!surDevis)}>
        <View style={[s.checkbox, surDevis && s.checkboxChecked]}>
          {surDevis && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={s.checkboxLabel}>Sur devis (prix non affiche)</Text>
      </Pressable>
      {!surDevis && (
        <TextInput style={s.input} value={prix} onChangeText={setPrix} placeholder="Ex: 150" placeholderTextColor={couleurs.texteMuted} keyboardType="decimal-pad" />
      )}

      <Text style={s.inputLabel}>Delai de livraison *</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacements.sm }}>
        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={delaiNombre} onChangeText={setDelaiNombre} placeholder="Ex: 3" placeholderTextColor={couleurs.texteMuted} keyboardType="number-pad" maxLength={4} />
        {(['heures', 'jours', 'semaines'] as const).map(u => (
          <Pressable key={u} style={[s.categoryChip, delaiUnite === u && s.categoryChipSelected, { paddingVertical: 10, paddingHorizontal: 14 }]} onPress={() => setDelaiUnite(u)}>
            <Text style={[s.categoryChipText, delaiUnite === u && { color: '#7C5CFF', fontWeight: '600' }]}>{u}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Medias et tags</Text>
      <Text style={s.sectionSubtitle}>Ajoutez des visuels et mots-cles</Text>

      <Text style={s.inputLabel}>Image principale *</Text>
      <Pressable style={s.imagePickerBox} onPress={handlePickMainImage}>
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={s.imagePreview} resizeMode="cover" />
            <Pressable style={s.imageRemoveBtn} onPress={handleRemoveMainImage}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </>
        ) : (
          <View style={s.imagePickerPlaceholder}>
            <Ionicons name="image-outline" size={36} color={couleurs.texteMuted} />
            <Text style={s.imagePickerText}>Appuyez pour ajouter une image</Text>
            <Text style={[s.imagePickerText, { fontSize: 11 }]}>Format 16:9 recommande</Text>
          </View>
        )}
      </Pressable>

      <Text style={s.inputLabel}>Images supplementaires (optionnel, max {MAX_GALLERY})</Text>
      <View style={s.galleryRow}>
        {galleryUris.map((uri, i) => (
          <View key={i} style={s.galleryItem}>
            <Image source={{ uri: uri! }} style={{ width: 80, height: 80 }} resizeMode="cover" />
            <Pressable style={[s.imageRemoveBtn, { top: 4, right: 4, width: 22, height: 22, borderRadius: 11 }]} onPress={() => handleRemoveGalleryImage(i)}>
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>
        ))}
        {galleryUris.length < MAX_GALLERY && (
          <Pressable style={s.galleryAdd} onPress={handlePickGalleryImage}>
            <Ionicons name="add" size={24} color={couleurs.texteMuted} />
          </Pressable>
        )}
      </View>

      <Text style={s.inputLabel}>Tags (max {MAX_TAGS})</Text>
      <View style={s.tagInput}>
        <TextInput style={{ flex: 1, fontSize: 14, color: couleurs.texte, paddingVertical: 4 }} value={tagInput} onChangeText={setTagInput} placeholder="Ajouter un tag..." placeholderTextColor={couleurs.texteMuted} onSubmitEditing={handleAddTag} returnKeyType="done" />
        <Pressable onPress={handleAddTag}><Ionicons name="add-circle" size={22} color="#7C5CFF" /></Pressable>
      </View>
      {tags.length > 0 && (
        <View style={s.tagRow}>
          {tags.map((tag, i) => (
            <View key={i} style={s.tagChip}>
              <Text style={s.tagChipText}>{tag}</Text>
              <Pressable style={s.tagRemoveBtn} onPress={() => handleRemoveTag(i)}><Ionicons name="close-circle" size={14} color="#7C5CFF" /></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Options et FAQ</Text>
      <Text style={s.sectionSubtitle}>Ajoutez des options et questions frequentes</Text>

      <Text style={s.inputLabel}>Options supplementaires</Text>
      {options.map((opt, i) => (
        <View key={i} style={s.optionCard}>
          <Pressable style={s.optionRemoveBtn} onPress={() => handleRemoveOption(i)}><Ionicons name="trash-outline" size={18} color="#EF4444" /></Pressable>
          <TextInput style={[s.input, { marginBottom: espacements.sm }]} value={opt.label} onChangeText={v => handleUpdateOption(i, 'label', v)} placeholder="Nom de l'option" placeholderTextColor={couleurs.texteMuted} />
          <TextInput style={[s.input, { marginBottom: espacements.sm }]} value={opt.description} onChangeText={v => handleUpdateOption(i, 'description', v)} placeholder="Description (optionnel)" placeholderTextColor={couleurs.texteMuted} />
          <TextInput style={s.input} value={opt.prix} onChangeText={v => handleUpdateOption(i, 'prix', v)} placeholder="Prix (EUR)" placeholderTextColor={couleurs.texteMuted} keyboardType="decimal-pad" />
        </View>
      ))}
      <Pressable style={s.addButton} onPress={handleAddOption}>
        <Ionicons name="add-circle-outline" size={18} color="#7C5CFF" />
        <Text style={s.addButtonText}>Ajouter une option</Text>
      </Pressable>

      <Text style={s.inputLabel}>Foire aux questions</Text>
      {faqItems.map((faq, i) => (
        <View key={i} style={s.faqCard}>
          <Pressable style={s.faqRemoveBtn} onPress={() => handleRemoveFaq(i)}><Ionicons name="trash-outline" size={18} color="#EF4444" /></Pressable>
          <TextInput style={[s.input, { marginBottom: espacements.sm }]} value={faq.question} onChangeText={v => handleUpdateFaq(i, 'question', v)} placeholder="Question" placeholderTextColor={couleurs.texteMuted} />
          <TextInput style={[s.input, s.inputMultiline]} value={faq.answer} onChangeText={v => handleUpdateFaq(i, 'answer', v)} placeholder="Reponse" placeholderTextColor={couleurs.texteMuted} multiline />
        </View>
      ))}
      <Pressable style={s.addButton} onPress={handleAddFaq}>
        <Ionicons name="add-circle-outline" size={18} color="#7C5CFF" />
        <Text style={s.addButtonText}>Ajouter une question</Text>
      </Pressable>

      <Text style={[s.inputLabel, { marginTop: espacements.lg }]}>Recapitulatif</Text>
      <View style={s.previewCard}>
        {[
          ['Nom', nom || '—'],
          ['Categorie', CATEGORIES.find(c => c.id === categorie)?.label || '—'],
          ['Prix', surDevis ? 'Sur devis' : prix ? `${prix} EUR` : '—'],
          ['Delai', delaiLivraison || '—'],
          ['Image', imageUri ? 'Ajoutee' : 'Manquante'],
          ['Gallery', `${galleryUris.length} image(s)`],
          ['Tags', `${tags.length} tag(s)`],
          ['Options', `${options.filter(o => o.label.trim()).length} option(s)`],
          ['FAQ', `${faqItems.filter(f => f.question.trim()).length} question(s)`],
        ].map(([label, value], i, arr) => (
          <View key={label} style={[s.previewRow, i === arr.length - 1 && { marginBottom: 0 }]}>
            <Text style={s.previewLabel}>{label}</Text>
            <Text style={[s.previewValue, label === 'Image' && imageUri ? { color: '#10B981' } : {}]} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ============ RENDER ============
  return (
    <SwipeableScreen edgeWidth={50}>
      <SafeAreaView style={s.container}>
        <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + espacements.sm : espacements.sm }]}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={s.headerTitle}>{isEditMode ? 'Modifier le service' : 'Creer un service'}</Text>
          <View style={s.headerSpacer} />
        </View>

        {renderStepIndicator()}

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={couleurs.primaire} />
          </View>
        ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
            {step === 0 && renderStep1()}
            {step === 1 && renderStep2()}
            {step === 2 && renderStep3()}
          </ScrollView>

          <View style={[s.ctaBar, { paddingBottom: Math.max(insets.bottom, espacements.lg) }]}>
            {step > 0 ? (
              <Pressable style={s.prevButton} onPress={() => setStep(p => p - 1)}><Text style={s.prevButtonText}>Precedent</Text></Pressable>
            ) : <View />}
            {step < 2 ? (
              <Pressable style={[s.ctaButton, !canProceed && s.ctaButtonDisabled]} onPress={() => setStep(p => p + 1)} disabled={!canProceed}>
                <Text style={s.ctaButtonText}>Suivant</Text>
              </Pressable>
            ) : (
              <Pressable style={[s.ctaButton, submitting && s.ctaButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.ctaButtonText}>{isEditMode ? 'Mettre a jour' : 'Publier le service'}</Text>}
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </SwipeableScreen>
  );
}
