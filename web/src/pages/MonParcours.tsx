/**
 * Page Mon Parcours — Gamification web
 * Deux onglets : En cours / Realisees (meme structure que mobile).
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Trophy,
  Flame,
  Star,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useGamification } from '../contexts/GamificationContext';
import LevelBadge from '../components/LevelBadge';
import { getIcon } from '../utils/iconMap';
import { couleurs, rayons } from '../styles/theme';

type TabId = 'en_cours' | 'realisees';

export default function MonParcours() {
  const { state, isLoading } = useGamification();
  const [activeTab, setActiveTab] = useState<TabId>('en_cours');

  const completedQuests = useMemo(() => {
    if (!state) return { quick: [], chapter: [] };
    return {
      quick: state.quickQuests.filter(q => q.isCompleted),
      chapter: state.quests.filter(q => q.isCompleted),
    };
  }, [state]);

  const activeQuests = useMemo(() => {
    if (!state) return { quick: [], chapter: [] };
    return {
      quick: state.quickQuests.filter(q => !q.isCompleted),
      chapter: state.quests.filter(q => !q.isCompleted),
    };
  }, [state]);

  const chaptersBySection = useMemo(() => {
    const quests = activeTab === 'en_cours' ? state?.quests : completedQuests.chapter;
    if (!quests) return {};
    const grouped: Record<string, typeof quests> = {};
    for (const q of quests) {
      const section = q.chapter || 'Autres';
      if (!grouped[section]) grouped[section] = [];
      if (activeTab === 'realisees' ? q.isCompleted : true) {
        grouped[section].push(q);
      }
    }
    return grouped;
  }, [state, activeTab, completedQuests]);

  const totalCompletedCount = completedQuests.quick.length + completedQuests.chapter.length;
  const totalXpEarned = useMemo(() => {
    return [...completedQuests.quick, ...completedQuests.chapter]
      .reduce((sum, q) => sum + q.xpReward, 0);
  }, [completedQuests]);

  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={{ color: couleurs.texteSecondaire, fontSize: '0.875rem' }}>
            Chargement...
          </span>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyContainer}>
          <Rocket size={48} color={couleurs.texteMuted} />
          <p style={{ color: couleurs.texteSecondaire }}>
            Connecte-toi pour voir ton parcours
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Mon Parcours</h1>
        <div style={styles.statsRow}>
          {(state.streakDays || 0) > 0 && (
            <div style={{ ...styles.statChip, backgroundColor: 'rgba(255,77,109,0.12)' }}>
              <Flame size={14} color={couleurs.danger} />
              <span style={{ ...styles.statChipText, color: couleurs.danger }}>
                {state.streakDays}j
              </span>
            </div>
          )}
          <div style={{ ...styles.statChip, backgroundColor: couleurs.succesLight }}>
            <CheckCircle size={14} color={couleurs.succes} />
            <span style={{ ...styles.statChipText, color: couleurs.succes }}>
              {totalCompletedCount} completees
            </span>
          </div>
          <div style={{ ...styles.statChip, backgroundColor: couleurs.primaireLight }}>
            <Star size={14} color={couleurs.primaire} />
            <span style={{ ...styles.statChipText, color: couleurs.primaire }}>
              {state.xp} XP
            </span>
          </div>
        </div>
      </div>

      {/* Level badge */}
      <div style={styles.levelCard}>
        <LevelBadge
          level={state.level}
          levelName={state.levelName}
          levelIcon={state.levelIcon}
          xpInLevel={state.xpInLevel}
          xpForNextLevel={state.xpForNextLevel}
          size="md"
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'en_cours' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('en_cours')}
        >
          <Rocket size={16} />
          En cours
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'realisees' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('realisees')}
        >
          <Trophy size={16} />
          Realisees
          {totalCompletedCount > 0 && (
            <span style={styles.tabBadge}>{totalCompletedCount}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'en_cours' ? (
            <EnCoursTab quickQuests={activeQuests.quick} chaptersBySection={chaptersBySection} />
          ) : (
            <RealiseesTab
              quickQuests={completedQuests.quick}
              chaptersBySection={chaptersBySection}
              totalXp={totalXpEarned}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// === EN COURS TAB ===

function EnCoursTab({
  quickQuests,
  chaptersBySection,
}: {
  quickQuests: import('../services/gamification').QuestProgress[];
  chaptersBySection: Record<string, import('../services/gamification').QuestProgress[]>;
}) {
  return (
    <div style={styles.tabContent}>
      {/* Quetes rapides */}
      {quickQuests.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quetes rapides</h3>
          <div style={styles.questList}>
            {quickQuests.map((quest, i) => (
              <QuestCard key={quest.questId} quest={quest} delay={i * 60} />
            ))}
          </div>
        </div>
      )}

      {/* Quetes de chapitre */}
      {Object.entries(chaptersBySection).map(([section, quests]) => {
        const activeInSection = quests.filter(q => !q.isCompleted);
        const doneInSection = quests.filter(q => q.isCompleted).length;
        if (activeInSection.length === 0 && doneInSection === 0) return null;
        return (
          <div key={section} style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{section}</h3>
              <span style={styles.sectionCount}>
                {doneInSection}/{quests.length}
              </span>
              {doneInSection === quests.length && (
                <CheckCircle size={16} color={couleurs.succes} />
              )}
            </div>
            <div style={styles.questList}>
              {quests.map((quest, i) => (
                <QuestCard key={quest.questId} quest={quest} delay={i * 60} />
              ))}
            </div>
          </div>
        );
      })}

      {quickQuests.length === 0 && Object.keys(chaptersBySection).length === 0 && (
        <div style={styles.emptyTab}>
          <CheckCircle size={40} color={couleurs.succes} />
          <p style={styles.emptyText}>Toutes les quetes sont terminees !</p>
        </div>
      )}
    </div>
  );
}

// === REALISEES TAB ===

function RealiseesTab({
  quickQuests,
  chaptersBySection,
  totalXp,
}: {
  quickQuests: import('../services/gamification').QuestProgress[];
  chaptersBySection: Record<string, import('../services/gamification').QuestProgress[]>;
  totalXp: number;
}) {
  const hasContent = quickQuests.length > 0 || Object.keys(chaptersBySection).length > 0;

  if (!hasContent) {
    return (
      <div style={styles.emptyTab}>
        <Trophy size={40} color={couleurs.texteMuted} />
        <p style={styles.emptyText}>Aucune quete terminee pour le moment</p>
        <p style={{ color: couleurs.texteMuted, fontSize: '0.8125rem' }}>
          Complete des quetes pour les voir ici !
        </p>
      </div>
    );
  }

  return (
    <div style={styles.tabContent}>
      {/* XP Summary */}
      <div style={styles.xpSummary}>
        <Star size={20} color={couleurs.accent} />
        <span style={styles.xpSummaryText}>
          {totalXp} XP gagnes grace a {quickQuests.length + Object.values(chaptersBySection).flat().length} quetes
        </span>
      </div>

      {/* Quick quests completees */}
      {quickQuests.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quetes rapides</h3>
          <div style={styles.questList}>
            {quickQuests.map((quest, i) => (
              <QuestCard key={quest.questId} quest={quest} delay={i * 60} />
            ))}
          </div>
        </div>
      )}

      {/* Chapter quests completees */}
      {Object.entries(chaptersBySection).map(([section, quests]) => (
        <div key={section} style={styles.section}>
          <h3 style={styles.sectionTitle}>{section}</h3>
          <div style={styles.questList}>
            {quests.map((quest, i) => (
              <QuestCard key={quest.questId} quest={quest} delay={i * 60} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// === QUEST CARD ===

function QuestCard({ quest, delay }: {
  quest: import('../services/gamification').QuestProgress;
  delay: number;
}) {
  const Icon = getIcon(quest.icon);
  const progress = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
      style={{
        ...styles.questCard,
        ...(quest.isCompleted ? styles.questCardDone : {}),
      }}
    >
      <div style={{
        ...styles.questIcon,
        backgroundColor: quest.color + '18',
      }}>
        {quest.isCompleted ? (
          <CheckCircle size={18} color={couleurs.succes} />
        ) : (
          <Icon size={18} color={quest.color} />
        )}
      </div>

      <div style={styles.questInfo}>
        <div style={styles.questTopRow}>
          <span style={{
            ...styles.questTitle,
            ...(quest.isCompleted ? { textDecoration: 'line-through', color: couleurs.texteSecondaire } : {}),
          }}>
            {quest.title}
          </span>
          <span style={{
            ...styles.xpChip,
            backgroundColor: quest.isCompleted ? couleurs.succesLight : quest.color + '18',
            color: quest.isCompleted ? couleurs.succes : quest.color,
          }}>
            +{quest.xpReward}
          </span>
        </div>
        {quest.description && (
          <span style={styles.questDesc}>{quest.description}</span>
        )}
        <div style={styles.progressRow}>
          <div style={styles.progressBg}>
            <div style={{
              ...styles.progressFill,
              width: `${progress * 100}%`,
              backgroundColor: quest.isCompleted ? couleurs.succes : quest.color,
            }} />
          </div>
          <span style={{
            ...styles.progressText,
            color: quest.isCompleted ? couleurs.succes : couleurs.texteMuted,
          }}>
            {quest.progress}/{quest.target}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// === STYLES ===

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '0 16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    gap: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `3px solid ${couleurs.bordure}`,
    borderTopColor: couleurs.primaire,
    animation: 'spin 0.8s linear infinite',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    gap: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: couleurs.texte,
    marginBottom: 12,
  },
  statsRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 10,
  },
  statChipText: {
    fontSize: '0.8125rem',
    fontWeight: '700',
  },

  levelCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 20,
  },

  // Tabs
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 12,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondCard,
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  tabActive: {
    backgroundColor: couleurs.primaireLight,
    borderColor: couleurs.primaire,
    color: couleurs.primaire,
  },
  tabBadge: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    backgroundColor: couleurs.succes,
    color: couleurs.blanc,
    padding: '1px 6px',
    borderRadius: 8,
    minWidth: 18,
    textAlign: 'center',
  },

  // Content
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: couleurs.texte,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sectionCount: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.texteMuted,
  },
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  // Quest card
  questCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
  },
  questCardDone: {
    borderColor: couleurs.succes + '30',
    opacity: 0.8,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  questInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  questTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  questDesc: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  xpChip: {
    fontSize: '0.6875rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: 8,
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  progressBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: couleurs.fondElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 500ms ease',
  },
  progressText: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },

  // Empty states
  emptyTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    gap: 12,
  },
  emptyText: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },

  // XP summary
  xpSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    backgroundColor: couleurs.accentLight,
    border: `1px solid ${couleurs.accent}30`,
  },
  xpSummaryText: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: couleurs.accent,
  },
};
