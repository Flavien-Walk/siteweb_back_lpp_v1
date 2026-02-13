import { useQuery } from '@tanstack/react-query'
import { securityService } from '@/services/security'
import type { SecurityDashboardData, SecurityEvent } from '@/services/security'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Activity,
  Zap,
  Globe,
  Lock,
  ShieldX,
  Eye,
  Bug,
  Wifi,
  Server,
  XCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// ============================================
// CONSTANTES
// ============================================

const THREAT_COLORS = {
  normal: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', fill: '#10b981' },
  elevated: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', fill: '#f59e0b' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', fill: '#f97316' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', fill: '#ef4444' },
} as const

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#6b7280',
}

const ATTACK_TYPE_LABELS: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  brute_force: { label: 'Brute Force', icon: Lock, color: '#ef4444' },
  injection_attempt: { label: 'Injection', icon: Bug, color: '#f97316' },
  rate_limit_hit: { label: 'Rate Limit', icon: Zap, color: '#f59e0b' },
  unauthorized_access: { label: 'Acces non autorise', icon: ShieldX, color: '#8b5cf6' },
  forbidden_access: { label: 'Permission refusee', icon: XCircle, color: '#ec4899' },
  token_forgery: { label: 'Token forge', icon: ShieldAlert, color: '#ef4444' },
  suspicious_signup: { label: 'Inscription suspecte', icon: Eye, color: '#f97316' },
  cors_violation: { label: 'CORS violation', icon: Globe, color: '#6366f1' },
  anomaly: { label: 'Anomalie', icon: Activity, color: '#14b8a6' },
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
}

// ============================================
// COMPOSANTS
// ============================================

function ThreatLevelBanner({ level }: { level: SecurityDashboardData['threatLevel'] }) {
  const config = THREAT_COLORS[level]
  const labels = {
    normal: { title: 'Niveau de menace : Normal', desc: 'Aucune activite suspecte detectee.' },
    elevated: { title: 'Niveau de menace : Eleve', desc: 'Activite inhabituelle detectee. Surveillance accrue recommandee.' },
    high: { title: 'Niveau de menace : Haut', desc: 'Plusieurs tentatives d\'intrusion detectees. Investigation requise.' },
    critical: { title: 'Niveau de menace : Critique', desc: 'Attaques actives detectees ! Action immediate necessaire.' },
  }
  const { title, desc } = labels[level]
  const Icon = level === 'normal' ? ShieldCheck : level === 'critical' ? ShieldAlert : AlertTriangle

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-5`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${config.bg}`}>
          <Icon className={`h-7 w-7 ${config.text}`} />
        </div>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${config.text}`}>{title}</h2>
          <p className="text-sm text-zinc-400">{desc}</p>
        </div>
        {level !== 'normal' && (
          <div className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
            {level === 'critical' ? 'ALERTE' : level === 'high' ? 'ATTENTION' : 'SURVEILLANCE'}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string
  value: number
  icon: typeof Shield
  color: string
  sub?: string
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: color + '15' }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AttackTypeBreakdown({ attackTypes }: { attackTypes: SecurityDashboardData['attackTypes'] }) {
  const entries = Object.entries(attackTypes)
    .map(([key, value]) => ({
      type: key,
      count: value,
      ...ATTACK_TYPE_LABELS[key],
    }))
    .sort((a, b) => b.count - a.count)

  const total = entries.reduce((s, e) => s + e.count, 0)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Server className="h-4 w-4 text-zinc-500" />
          Types d'attaques (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {entries.map(({ type, count, label, color }) => (
          <div key={type} className="flex items-center gap-3">
            <div className="w-28 text-xs text-zinc-400 truncate">{label}</div>
            <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: total > 0 ? `${Math.max((count / total) * 100, count > 0 ? 4 : 0)}%` : '0%',
                  backgroundColor: color,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-300 w-8 text-right">{count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SeverityPieChart({ breakdown }: { breakdown: SecurityDashboardData['severityBreakdown'] }) {
  const data = [
    { name: 'Critique', value: breakdown.critical, color: SEVERITY_COLORS.critical },
    { name: 'Haute', value: breakdown.high, color: SEVERITY_COLORS.high },
    { name: 'Moyenne', value: breakdown.medium, color: SEVERITY_COLORS.medium },
    { name: 'Basse', value: breakdown.low, color: SEVERITY_COLORS.low },
  ].filter(d => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Severite (7 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
            Aucun evenement
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300">Severite (7 jours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65} strokeWidth={0}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {data.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-zinc-400">{d.name}</span>
                <span className="text-xs font-mono text-zinc-300 ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HourlyChart({ data }: { data: SecurityDashboardData['hourlyTrend'] }) {
  const chartData = data.map(d => ({
    hour: `${String(d._id.hour).padStart(2, '0')}h`,
    total: d.total,
    critical: d.critical,
    high: d.high,
    blocked: d.blocked,
  }))

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Activity className="h-4 w-4 text-zinc-500" />
          Activite horaire (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Aucune donnee</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#gradTotal)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#gradCritical)" strokeWidth={2} name="Critique" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function DailyChart({ data }: { data: SecurityDashboardData['dailyTrend'] }) {
  const chartData = data.map(d => ({
    date: d._id.slice(5), // MM-DD
    critical: d.critical,
    high: d.high,
    medium: d.medium,
    low: d.low,
  }))

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-zinc-500" />
          Tendance 7 jours
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Aucune donnee</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} radius={[0, 0, 0, 0]} name="Critique" />
              <Bar dataKey="high" stackId="a" fill={SEVERITY_COLORS.high} name="Haute" />
              <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLORS.medium} name="Moyenne" />
              <Bar dataKey="low" stackId="a" fill={SEVERITY_COLORS.low} radius={[4, 4, 0, 0]} name="Basse" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function EventSeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  }
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${styles[severity] || styles.low}`}>
      {SEVERITY_LABELS[severity] || severity}
    </Badge>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'a l\'instant'
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function LiveEventsFeed({ events }: { events: SecurityEvent[] }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Evenements en temps reel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Aucun evenement enregistre</div>
          ) : events.map(event => {
            const config = ATTACK_TYPE_LABELS[event.type]
            const Icon = config?.icon || Shield
            return (
              <div
                key={event._id}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors border-l-2"
                style={{ borderLeftColor: config?.color || '#6b7280' }}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: config?.color || '#6b7280' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">
                      {config?.label || event.type}
                    </span>
                    <EventSeverityBadge severity={event.severity} />
                    {event.blocked && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        Bloque
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{event.details}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                    <span className="font-mono">{event.ip}</span>
                    <span>{event.method} {event.path.length > 40 ? event.path.slice(0, 40) + '...' : event.path}</span>
                    <span className="ml-auto">{formatTimeAgo(event.dateCreation)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TopIPsTable({ ips }: { ips: SecurityDashboardData['topSuspiciousIPs'] }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-500" />
          IPs suspectes (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ips.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">Aucune IP suspecte</div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {ips.map((ip, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <span className="text-xs font-mono text-zinc-300 w-32 shrink-0">{ip.ip}</span>
                <div className="flex-1 flex flex-wrap gap-1">
                  {ip.types.map(t => {
                    const conf = ATTACK_TYPE_LABELS[t]
                    return (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (conf?.color || '#6b7280') + '20', color: conf?.color || '#6b7280' }}>
                        {conf?.label || t}
                      </span>
                    )
                  })}
                </div>
                <span className="text-sm font-bold text-zinc-300">{ip.count}</span>
                <EventSeverityBadge severity={ip.maxSeverity} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TopOffenders({ offenders }: { offenders: SecurityDashboardData['topOffenderIPs'] }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          Top menaces (30 jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offenders.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">Aucune menace identifiee</div>
        ) : (
          <div className="space-y-2">
            {offenders.map((o, i) => (
              <div key={i} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-zinc-200">{o.ip}</span>
                  <div className="flex items-center gap-2">
                    {o.criticalCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {o.criticalCount} crit.
                      </span>
                    )}
                    <span className="text-sm font-bold text-zinc-300">{o.totalEvents} events</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex flex-wrap gap-1">
                    {o.types.map(t => {
                      const conf = ATTACK_TYPE_LABELS[t]
                      return (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (conf?.color || '#6b7280') + '20', color: conf?.color || '#6b7280' }}>
                          {conf?.label || t}
                        </span>
                      )
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {formatTimeAgo(o.firstSeen)} - {formatTimeAgo(o.lastSeen)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AttackedPaths({ paths }: { paths: SecurityDashboardData['topAttackedPaths'] }) {
  const max = paths.length > 0 ? paths[0].count : 1

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Server className="h-4 w-4 text-zinc-500" />
          Endpoints cibles (30 jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {paths.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">Aucune donnee</div>
        ) : (
          <div className="space-y-2">
            {paths.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-400 w-48 truncate shrink-0" title={p.path}>
                  {p.path}
                </span>
                <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500/60"
                    style={{ width: `${(p.count / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-300 w-8 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CriticalAlerts({ events }: { events: SecurityEvent[] }) {
  if (events.length === 0) return null

  return (
    <Card className="bg-zinc-900/50 border-red-900/30 border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alertes critiques ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.map(event => {
            const config = ATTACK_TYPE_LABELS[event.type]
            return (
              <div key={event._id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-300">{config?.label || event.type}</span>
                    {event.blocked && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        Bloque
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatTimeAgo(event.dateCreation)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">{event.details}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                  <span className="font-mono">{event.ip}</span>
                  <span>{event.method} {event.path}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function SecurityPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<SecurityDashboardData>({
    queryKey: ['security-dashboard'],
    queryFn: securityService.getDashboard,
    refetchInterval: 15_000, // Refresh toutes les 15s
    retry: 2,
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Shield className="h-10 w-10 text-zinc-600 animate-pulse" />
            <p className="text-zinc-500 text-sm">Chargement du moniteur de securite...</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error || !data) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="h-10 w-10 text-red-400" />
            <p className="text-zinc-400 text-sm">Erreur de chargement du dashboard securite</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Reessayer</Button>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Centre de securite
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Monitoring serveur et detection d'intrusion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600">
              MAJ: {new Date(data.lastUpdated).toLocaleTimeString('fr-FR')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </div>

        {/* Threat Level Banner */}
        <ThreatLevelBanner level={data.threatLevel} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Events 24h" value={data.summary.totalEvents24h} icon={Activity} color="#6366f1" sub={`${data.summary.eventsPerHour}/h`} />
          <StatCard label="Critiques" value={data.summary.criticalEvents24h} icon={AlertTriangle} color="#ef4444" />
          <StatCard label="Hautes" value={data.summary.highEvents24h} icon={ShieldAlert} color="#f97316" />
          <StatCard label="Bloques" value={data.summary.blockedEvents24h} icon={ShieldCheck} color="#10b981" />
          <StatCard label="7 jours" value={data.summary.totalEvents7j} icon={Wifi} color="#8b5cf6" />
          <StatCard label="Brute Force" value={data.attackTypes.brute_force} icon={Lock} color="#ef4444" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HourlyChart data={data.hourlyTrend} />
          <DailyChart data={data.dailyTrend} />
        </div>

        {/* Critical Alerts */}
        <CriticalAlerts events={data.criticalEvents} />

        {/* Main Grid: Attack Types + Severity + Events Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AttackTypeBreakdown attackTypes={data.attackTypes} />
          <SeverityPieChart breakdown={data.severityBreakdown} />
          <div className="lg:col-span-1">
            <AttackedPaths paths={data.topAttackedPaths} />
          </div>
        </div>

        {/* IPs + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopIPsTable ips={data.topSuspiciousIPs} />
          <LiveEventsFeed events={data.recentEvents} />
        </div>

        {/* Top Offenders */}
        <TopOffenders offenders={data.topOffenderIPs} />
      </div>
    </PageTransition>
  )
}
