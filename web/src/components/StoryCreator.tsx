import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image, Film, Clock, Timer, Sparkles, Send } from 'lucide-react';
import { creerStory } from '../services/stories';
import { couleurs } from '../styles/theme';

const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'warm', label: 'Chaud', css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'cool', label: 'Froid', css: 'saturate(0.8) hue-rotate(15deg) brightness(1.05)' },
  { id: 'bw', label: 'N&B', css: 'grayscale(1)' },
  { id: 'contrast', label: 'Contraste', css: 'contrast(1.3) brightness(1.05)' },
  { id: 'vignette', label: 'Vintage', css: 'sepia(0.2) contrast(1.1) brightness(0.95) saturate(1.2)' },
];

const DURATIONS = [
  { value: 5, label: '5s' },
  { value: 7, label: '7s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
];

const EXPIRATIONS = [
  { value: 7, label: '7 min' },
  { value: 15, label: '15 min' },
  { value: 60, label: '1h' },
  { value: 360, label: '6h' },
  { value: 1440, label: '24h' },
];

interface StoryCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function StoryCreator({ onClose, onCreated }: StoryCreatorProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [filter, setFilter] = useState('normal');
  const [duration, setDuration] = useState(7);
  const [expiration, setExpiration] = useState(1440);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'photo');
    setMediaFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const handlePublish = async () => {
    if (!mediaFile) return;
    setPublishing(true);
    setError('');

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(mediaFile);
      });

      const res = await creerStory(base64, mediaType, {
        durationSec: duration,
        filterPreset: filter,
        expirationMinutes: expiration,
      });

      if (res.succes) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Erreur lors de la publication');
      }
    } catch {
      setError('Erreur lors de la publication');
    }
    setPublishing(false);
  };

  const currentFilter = FILTERS.find((f) => f.id === filter);

  return (
    <AnimatePresence>
      <motion.div
        style={s.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={s.modal}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={s.header}>
            <h2 style={s.title}>Creer une story</h2>
            <button style={s.closeBtn} onClick={onClose}>
              <X size={22} color={couleurs.texte} />
            </button>
          </div>

          <div style={s.body}>
            {!preview ? (
              /* Upload zone */
              <button style={s.uploadZone} onClick={() => fileInputRef.current?.click()}>
                <Upload size={48} color={couleurs.texteMuted} strokeWidth={1.5} />
                <span style={s.uploadTitle}>Selectionner un media</span>
                <span style={s.uploadSubtitle}>Image ou video</span>
                <div style={s.uploadBtns}>
                  <span style={s.uploadBtnLabel}><Image size={16} /> Photo</span>
                  <span style={s.uploadBtnLabel}><Film size={16} /> Video</span>
                </div>
              </button>
            ) : (
              /* Preview + settings */
              <div style={s.previewSection}>
                <div style={s.previewContainer}>
                  {mediaType === 'video' ? (
                    <video
                      src={preview}
                      style={{ ...s.previewMedia, filter: currentFilter?.css }}
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={preview}
                      alt=""
                      style={{ ...s.previewMedia, filter: currentFilter?.css }}
                    />
                  )}
                </div>

                {/* Filters */}
                <div style={s.settingsSection}>
                  <div style={s.settingsLabel}>
                    <Sparkles size={14} color={couleurs.primaire} />
                    <span>Filtre</span>
                  </div>
                  <div style={s.filterRow}>
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        style={{
                          ...s.filterBtn,
                          borderColor: filter === f.id ? couleurs.primaire : couleurs.bordure,
                          backgroundColor: filter === f.id ? `${couleurs.primaire}15` : 'transparent',
                        }}
                        onClick={() => setFilter(f.id)}
                      >
                        <div style={{ ...s.filterPreview, filter: f.css }}>
                          {preview && <img src={preview} alt="" style={s.filterPreviewImg} />}
                        </div>
                        <span style={{
                          fontSize: '0.6875rem',
                          color: filter === f.id ? couleurs.primaire : couleurs.texteSecondaire,
                          fontWeight: filter === f.id ? '600' : '400',
                        }}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div style={s.settingsSection}>
                  <div style={s.settingsLabel}>
                    <Timer size={14} color={couleurs.primaire} />
                    <span>Duree d'affichage</span>
                  </div>
                  <div style={s.optionRow}>
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        style={{
                          ...s.optionBtn,
                          backgroundColor: duration === d.value ? couleurs.primaire : 'transparent',
                          color: duration === d.value ? couleurs.blanc : couleurs.texteSecondaire,
                          borderColor: duration === d.value ? couleurs.primaire : couleurs.bordure,
                        }}
                        onClick={() => setDuration(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div style={s.settingsSection}>
                  <div style={s.settingsLabel}>
                    <Clock size={14} color={couleurs.primaire} />
                    <span>Expiration</span>
                  </div>
                  <div style={s.optionRow}>
                    {EXPIRATIONS.map((e) => (
                      <button
                        key={e.value}
                        style={{
                          ...s.optionBtn,
                          backgroundColor: expiration === e.value ? couleurs.primaire : 'transparent',
                          color: expiration === e.value ? couleurs.blanc : couleurs.texteSecondaire,
                          borderColor: expiration === e.value ? couleurs.primaire : couleurs.bordure,
                        }}
                        onClick={() => setExpiration(e.value)}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change media */}
                <button style={s.changeMediaBtn} onClick={() => {
                  setPreview('');
                  setMediaFile(null);
                  setFilter('normal');
                }}>
                  Changer le media
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={s.error}>{error}</div>
          )}

          {/* Footer */}
          {preview && (
            <div style={s.footer}>
              <motion.button
                style={{
                  ...s.publishBtn,
                  opacity: publishing ? 0.6 : 1,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePublish}
                disabled={publishing}
              >
                <Send size={18} />
                {publishing ? 'Publication...' : 'Publier la story'}
              </motion.button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1500,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    backgroundColor: couleurs.fondElevated,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: `1px solid ${couleurs.bordure}`,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: couleurs.texte,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 8,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  uploadZone: {
    width: '100%',
    padding: '60px 24px',
    border: `2px dashed ${couleurs.bordure}`,
    borderRadius: 16,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  uploadTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  uploadSubtitle: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
  uploadBtns: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
  },
  uploadBtnLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: couleurs.primaire,
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 360,
  },
  previewMedia: {
    width: '100%',
    maxHeight: 360,
    objectFit: 'contain',
    display: 'block',
  },
  settingsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  settingsLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
  },
  filterBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 10,
    border: '2px solid',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    minWidth: 64,
  },
  filterPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: couleurs.fondInput,
  },
  filterPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  optionRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  changeMediaBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: couleurs.primaire,
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: '8px 0',
    textAlign: 'center' as const,
  },
  error: {
    padding: '8px 24px',
    color: couleurs.danger,
    fontSize: '0.8125rem',
  },
  footer: {
    padding: '16px 24px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  publishBtn: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '1rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
};
