import { cn } from '@/lib/utils'
import { ShieldAlert, ShieldCheck, AlertTriangle, Flame } from 'lucide-react'

interface RiskBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function getRiskLevel(score: number): { label: string; color: string; bgColor: string; Icon: typeof ShieldCheck } {
  if (score >= 70) return { label: 'Critique', color: 'text-red-400', bgColor: 'bg-red-500/15 border-red-500/30', Icon: Flame }
  if (score >= 40) return { label: 'Elevé', color: 'text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/30', Icon: AlertTriangle }
  if (score >= 20) return { label: 'Modéré', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15 border-yellow-500/30', Icon: ShieldAlert }
  return { label: 'Faible', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/30', Icon: ShieldCheck }
}

export function RiskBadge({ score, showLabel = true, size = 'sm', className }: RiskBadgeProps) {
  const { label, color, bgColor, Icon } = getRiskLevel(score)
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        bgColor,
        color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
      title={`Score de risque: ${score}/100`}
    >
      <Icon className={iconSize} />
      <span>{score}</span>
      {showLabel && <span className="opacity-75">- {label}</span>}
    </div>
  )
}

export function RiskScoreBar({ score, className }: { score: number; className?: string }) {
  const getBarColor = (s: number) => {
    if (s >= 70) return 'bg-red-500'
    if (s >= 40) return 'bg-amber-500'
    if (s >= 20) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(score))}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 tabular-nums w-7 text-right">{score}</span>
    </div>
  )
}
