import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityService } from '@/services/security'
import type {
  SecurityDashboardData,
  SecurityEvent,
  SuspiciousIP,
  OffenderIP,
  BlockedIP,
} from '@/services/security'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  XCircle,
  Ban,
  Search,
  Monitor,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  Fingerprint,
  Clock,
  TrendingUp,
  BarChart3,
  ShieldOff,
  Unlock,
  ExternalLink,
  Loader2,
  AlertOctagon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'

// ============================================
// CONSTANTES & LABELS (100% FRANCAIS)
// ============================================

const NIVEAUX_MENACE = {
  normal: {
    titre: 'Niveau de menace : Normal',
    description: 'Aucune activite suspecte detectee. Votre serveur est securise.',
    conseil: 'Continuez a surveiller regulierement les journaux de securite.',
    bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', fill: '#10b981',
    badge: 'SECURISE',
  },
  elevated: {
    titre: 'Niveau de menace : Eleve',
    description: 'Activite inhabituelle detectee. Des tentatives suspectes ont ete enregistrees.',
    conseil: 'Verifiez les IPs suspectes et renforcez la surveillance.',
    bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', fill: '#f59e0b',
    badge: 'SURVEILLANCE',
  },
  high: {
    titre: 'Niveau de menace : Haut',
    description: 'Plusieurs tentatives d\'intrusion detectees. Une investigation est necessaire.',
    conseil: 'Bloquez les IPs offensantes et verifiez vos logs d\'acces.',
    bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', fill: '#f97316',
    badge: 'ATTENTION',
  },
  critical: {
    titre: 'Niveau de menace : Critique',
    description: 'Attaques actives detectees. Des mesures immediates sont necessaires.',
    conseil: 'Bloquez immediatement les IPs malveillantes et analysez les evenements critiques.',
    bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', fill: '#ef4444',
    badge: 'ALERTE CRITIQUE',
  },
} as const

const TYPES_ATTAQUE: Record<string, { label: string; description: string; icon: typeof Shield; color: string }> = {
  brute_force: { label: 'Force brute', description: 'Tentatives repetees de connexion avec differents mots de passe', icon: Lock, color: '#ef4444' },
  injection_attempt: { label: 'Injection', description: 'Tentative d\'injecter du code malveillant (SQL, NoSQL, XSS, commandes)', icon: Bug, color: '#f97316' },
  rate_limit_hit: { label: 'Limite atteinte', description: 'Trop de requetes envoyees en peu de temps (possible DDoS)', icon: Zap, color: '#f59e0b' },
  unauthorized_access: { label: 'Acces non autorise', description: 'Tentative d\'acceder sans authentification valide', icon: ShieldX, color: '#8b5cf6' },
  forbidden_access: { label: 'Permission refusee', description: 'Tentative d\'acceder a une ressource sans les droits necessaires', icon: XCircle, color: '#ec4899' },
  token_forgery: { label: 'Token falsifie', description: 'Utilisation d\'un jeton d\'authentification invalide ou expire', icon: ShieldAlert, color: '#ef4444' },
  suspicious_signup: { label: 'Inscription suspecte', description: 'Creation de compte avec un comportement de bot (pas de navigateur, scripts)', icon: Eye, color: '#f97316' },
  cors_violation: { label: 'Violation CORS', description: 'Requete provenant d\'une origine non autorisee', icon: Globe, color: '#6366f1' },
  ip_blocked: { label: 'IP bloquee', description: 'Requete provenant d\'une IP qui a ete bannie', icon: Ban, color: '#dc2626' },
  anomaly: { label: 'Anomalie', description: 'Comportement inhabituel detecte (trafic anormal, erreurs en masse)', icon: Activity, color: '#14b8a6' },
}

const SEVERITE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  critical: { label: 'Critique', color: '#ef4444', description: 'Menace immediate necessitant une action urgente' },
  high: { label: 'Haute', color: '#f97316', description: 'Menace serieuse a traiter rapidement' },
  medium: { label: 'Moyenne', color: '#f59e0b', description: 'Activite suspecte a surveiller' },
  low: { label: 'Basse', color: '#6b7280', description: 'Evenement mineur, informatif' },
}

// ============================================
// UTILITAIRES
// ============================================

const formatDate = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatDateShort = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'A l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

// ============================================
// COMPOSANT : BANNIERE NIVEAU DE MENACE
// ============================================

function BanniereMenace({
  level,
  onVoirCritiques,
}: {
  level: SecurityDashboardData['threatLevel']
  onVoirCritiques: () => void
}) {
  const config = NIVEAUX_MENACE[level]
  const Icon = level === 'normal' ? ShieldCheck : level === 'critical' ? ShieldAlert : AlertTriangle
  const [detailOuvert, setDetailOuvert] = useState(false)

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-5`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
          <Icon className={`h-7 w-7 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold ${config.text}`}>{config.titre}</h2>
          <p className="text-sm text-zinc-400">{config.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {level !== 'normal' && (
            <div className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
              {config.badge}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDetailOuvert(!detailOuvert)}>
            <Info className="h-4 w-4 mr-1" />
            Detail
          </Button>
        </div>
      </div>

      {detailOuvert && (
        <div className="mt-4 pt-4 border-t border-zinc-700/50">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-zinc-300">Que faire ?</p>
              <p className="text-sm text-zinc-400 mt-1">{config.conseil}</p>
              {level !== 'normal' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={onVoirCritiques}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Voir les evenements critiques
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPOSANT : CARTE STATISTIQUE
// ============================================

function CarteStats({
  label,
  value,
  icon: Icon,
  color,
  detail,
}: {
  label: string
  value: number
  icon: typeof Shield
  color: string
  detail?: string
}) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className="flex items-center gap-1">
            {detail && (
              <button onClick={() => setShowDetail(!showDetail)} className="p-1 rounded hover:bg-zinc-800 transition-colors">
                <Info className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: color + '15' }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
          </div>
        </div>
        {showDetail && detail && (
          <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-800">{detail}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : TYPES D'ATTAQUES
// ============================================

function RepartitionAttaques({ attackTypes }: { attackTypes: Record<string, number> }) {
  const entries = Object.entries(attackTypes)
    .map(([key, value]) => ({ type: key, count: value, ...(TYPES_ATTAQUE[key] || { label: key, description: '', icon: Shield, color: '#999' }) }))
    .sort((a, b) => b.count - a.count)

  const total = entries.reduce((s, e) => s + e.count, 0)
  const [expandedType, setExpandedType] = useState<string | null>(null)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Types d'attaques (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.map((entry) => {
          const pct = total > 0 ? (entry.count / total) * 100 : 0
          const Icon = entry.icon
          const expanded = expandedType === entry.type

          return (
            <div key={entry.type}>
              <button
                onClick={() => setExpandedType(expanded ? null : entry.type)}
                className="w-full text-left hover:bg-zinc-800/50 rounded-lg p-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: entry.color }} />
                  <span className="text-xs text-zinc-300 flex-1 truncate">{entry.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: entry.color }}>{entry.count}</span>
                  <span className="text-xs text-zinc-600 w-10 text-right">{pct.toFixed(0)}%</span>
                  {expanded ? <ChevronUp className="h-3 w-3 text-zinc-500" /> : <ChevronDown className="h-3 w-3 text-zinc-500" />}
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: entry.color }} />
                </div>
              </button>
              {expanded && (
                <div className="mx-2 mb-2 p-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-400">
                  {entry.description}
                </div>
              )}
            </div>
          )
        })}
        {total === 0 && <p className="text-xs text-zinc-600 text-center py-4">Aucune attaque detectee</p>}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : GRAPHIQUE SEVERITE (CAMEMBERT)
// ============================================

function GraphiqueSeverite({ data }: { data: SecurityDashboardData['severityBreakdown'] }) {
  const chartData = Object.entries(data)
    .map(([key, value]) => ({ name: SEVERITE_LABELS[key]?.label || key, value, color: SEVERITE_LABELS[key]?.color || '#666' }))
    .filter((d) => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-zinc-300">Severite (7 jours)</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-zinc-600 text-center py-8">Aucune donnee</p></CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Repartition par severite (7 jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
            />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: any, name: any) => [`${value} evenements`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-zinc-400">{d.name}</span>
              <span className="font-mono font-bold text-zinc-300 ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : GRAPHIQUE TENDANCE HORAIRE
// ============================================

function GraphiqueHoraire({ data }: { data: SecurityDashboardData['hourlyTrend'] }) {
  const chartData = data.map((p) => ({
    heure: `${String(p._id.hour).padStart(2, '0')}h`,
    total: p.total,
    critique: p.critical,
    haute: p.high,
    bloques: p.blocked,
  }))

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Activite par heure (24h)
          <Tooltip content="Nombre d'evenements de securite detectes chaque heure"><span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span></Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="heure" tick={{ fontSize: 10, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
              labelFormatter={(l) => `${l}`}
              formatter={(value: any, name: any) => {
                const labels: Record<string, string> = { total: 'Total', critique: 'Critique', haute: 'Haute', bloques: 'Bloques' }
                return [value, labels[name] || name]
              }}
            />
            <Area type="monotone" dataKey="total" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="critique" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={1.5} />
            <Area type="monotone" dataKey="bloques" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={1} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : GRAPHIQUE TENDANCE QUOTIDIENNE
// ============================================

function GraphiqueQuotidien({ data }: { data: SecurityDashboardData['dailyTrend'] }) {
  const chartData = data.map((p) => {
    const date = new Date(p._id)
    return {
      jour: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      total: p.total,
      critique: p.critical,
      haute: p.high,
      moyenne: p.medium,
      basse: p.low,
    }
  })

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Tendance quotidienne (7 jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: any, name: any) => {
                const labels: Record<string, string> = { critique: 'Critique', haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' }
                return [value, labels[name] || name]
              }}
            />
            <Bar dataKey="critique" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="haute" stackId="a" fill="#f97316" />
            <Bar dataKey="moyenne" stackId="a" fill="#f59e0b" />
            <Bar dataKey="basse" stackId="a" fill="#6b7280" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : STATS APPAREILS/NAVIGATEURS/OS
// ============================================

function StatsEmpreinteNumerique({ deviceStats }: { deviceStats: SecurityDashboardData['deviceStats'] }) {
  const [onglet, setOnglet] = useState<'navigateurs' | 'os' | 'appareils'>('navigateurs')
  const data = deviceStats[onglet]
  const total = data.reduce((s, d) => s + d.count, 0)
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#818cf8', '#4f46e5', '#4338ca']

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Fingerprint className="h-4 w-4" />
          Empreinte numerique des attaquants
          <Tooltip content="Informations sur les appareils et navigateurs utilises lors des attaques">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 mb-3">
          {(['navigateurs', 'os', 'appareils'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setOnglet(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${onglet === tab ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            >
              {tab === 'navigateurs' ? 'Navigateurs' : tab === 'os' ? 'Systemes' : 'Appareils'}
            </button>
          ))}
        </div>

        {data.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucune donnee</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data.map((d) => ({ name: d.nom, value: d.count }))} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [`${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(0) : 0}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {data.slice(0, 5).map((d, i) => (
                <div key={d.nom} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-zinc-400 truncate flex-1">{d.nom}</span>
                  <span className="font-mono text-zinc-300">{d.count}</span>
                  <span className="text-zinc-600 w-8 text-right">{total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : BADGE SEVERITE
// ============================================

function BadgeSeverite({ severity }: { severity: string }) {
  const config = SEVERITE_LABELS[severity]
  if (!config) return <Badge variant="outline">{severity}</Badge>

  return (
    <Tooltip content={config.description}>
      <span>
        <Badge
          className="text-[10px] font-bold border-0"
          style={{ backgroundColor: config.color + '20', color: config.color }}
        >
          {config.label}
        </Badge>
      </span>
    </Tooltip>
  )
}

// ============================================
// COMPOSANT : FLUX EN TEMPS REEL
// ============================================

function FluxTempsReel({
  events,
  onSelectEvent,
  onInvestigateIP,
}: {
  events: SecurityEvent[]
  onSelectEvent: (id: string) => void
  onInvestigateIP: (ip: string) => void
}) {
  const [filtreSeverite, setFiltreSeverite] = useState<string>('')
  const [filtreType, setFiltreType] = useState<string>('')
  const [recherche, setRecherche] = useState('')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filtreSeverite && e.severity !== filtreSeverite) return false
      if (filtreType && e.type !== filtreType) return false
      if (recherche) {
        const q = recherche.toLowerCase()
        return e.ip.includes(q) || e.details.toLowerCase().includes(q) || e.path.toLowerCase().includes(q)
      }
      return true
    })
  }, [events, filtreSeverite, filtreType, recherche])

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            Flux en temps reel
            <Badge variant="outline" className="text-[10px]">{filtered.length} evenements</Badge>
          </CardTitle>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <Input
              placeholder="Rechercher (IP, chemin, detail)..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <Select value={filtreSeverite} onChange={(e) => setFiltreSeverite(e.target.value)} className="h-7 text-xs w-28">
            <option value="">Severite</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </Select>
          <Select value={filtreType} onChange={(e) => setFiltreType(e.target.value)} className="h-7 text-xs w-32">
            <option value="">Type</option>
            {Object.entries(TYPES_ATTAQUE).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Aucun evenement</p>
        ) : (
          filtered.slice(0, 50).map((event) => {
            const typeInfo = TYPES_ATTAQUE[event.type]
            const Icon = typeInfo?.icon || Shield

            return (
              <div
                key={event._id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                onClick={() => onSelectEvent(event._id)}
              >
                <div className="mt-0.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: typeInfo?.color || '#999' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BadgeSeverite severity={event.severity} />
                    <span className="text-xs font-medium text-zinc-300 truncate">{typeInfo?.label || event.type}</span>
                    {event.blocked && <Badge className="text-[9px] bg-red-500/20 text-red-400 border-0">Bloque</Badge>}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{event.details}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                    <button
                      onClick={(e) => { e.stopPropagation(); onInvestigateIP(event.ip); }}
                      className="font-mono hover:text-indigo-400 transition-colors flex items-center gap-0.5"
                    >
                      <Search className="h-2.5 w-2.5" />
                      {event.ip}
                    </button>
                    <span>{event.method} {event.path.slice(0, 40)}</span>
                    {event.navigateur && event.navigateur !== 'Inconnu' && (
                      <span className="text-zinc-700">{event.navigateur}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(event.dateCreation)}</span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : TABLEAU IPS SUSPECTES
// ============================================

function TableauIPsSuspectes({
  ips,
  onInvestigate,
  onBlock,
}: {
  ips: SuspiciousIP[]
  onInvestigate: (ip: string) => void
  onBlock: (ip: string) => void
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          IPs les plus suspectes (24h)
          <Tooltip content="Adresses IP ayant genere le plus d'evenements de securite">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto">
        {ips.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucune IP suspecte</p>
        ) : (
          <div className="space-y-2">
            {ips.map((ip) => (
              <div key={ip.ip} className="p-2.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-200 font-bold">{ip.ip}</span>
                    <BadgeSeverite severity={ip.maxSeverity} />
                    <span className="text-xs font-bold" style={{ color: ip.count > 20 ? '#ef4444' : ip.count > 10 ? '#f97316' : '#f59e0b' }}>
                      {ip.count} evt.
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip content="Enqueter sur cette IP">
                      <span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onInvestigate(ip.ip)}>
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip content="Bloquer cette IP">
                      <span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-400" onClick={() => onBlock(ip.ip)}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ip.types.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                      {TYPES_ATTAQUE[t]?.label || t}
                    </span>
                  ))}
                </div>
                {ip.navigateurs.length > 0 && (
                  <div className="flex gap-2 mt-1 text-[10px] text-zinc-600">
                    <Monitor className="h-3 w-3 shrink-0" />
                    {ip.navigateurs.filter(n => n !== 'Inconnu').slice(0, 3).join(', ')}
                    {ip.appareils.filter(a => a !== 'Inconnu').length > 0 && (
                      <span> | {ip.appareils.filter(a => a !== 'Inconnu').join(', ')}</span>
                    )}
                  </div>
                )}
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  Dernier vu : {formatDateShort(ip.lastSeen)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : CHEMINS ATTAQUES
// ============================================

function CheminsAttaques({ paths }: { paths: SecurityDashboardData['topAttackedPaths'] }) {
  const maxCount = paths.length > 0 ? paths[0].count : 1

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Points d'entree cibles (30 jours)
          <Tooltip content="Les URL de votre API les plus souvent visees par des attaques">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {paths.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun chemin attaque</p>
        ) : (
          paths.map((p) => (
            <div key={p.path} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-300 truncate flex-1">{p.path}</span>
                <span className="text-xs font-bold text-zinc-400 ml-2">{p.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                  style={{ width: `${(p.count / maxCount) * 100}%` }}
                />
              </div>
              <div className="flex gap-1">
                {p.types.map((t) => (
                  <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">
                    {TYPES_ATTAQUE[t]?.label || t}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : IPs BLOQUEES
// ============================================

function IPsBloquees({
  blockedIPs,
  onUnblock,
}: {
  blockedIPs: BlockedIP[]
  onUnblock: (id: string) => void
}) {
  const actives = blockedIPs.filter((ip) => ip.actif)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-red-400" />
          IPs bloquees ({actives.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto">
        {actives.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucune IP bloquee</p>
        ) : (
          <div className="space-y-2">
            {actives.map((ip) => (
              <div key={ip._id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <div>
                  <span className="font-mono text-xs text-red-300 font-bold">{ip.ip}</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{ip.raison}</p>
                  <div className="text-[10px] text-zinc-600">
                    {ip.bloquePar ? `Par ${ip.bloquePar.prenom} ${ip.bloquePar.nom}` : 'Systeme'} | {formatDateShort(ip.dateCreation)}
                    {ip.expireAt && <span className="text-amber-500"> | Expire le {formatDateShort(ip.expireAt)}</span>}
                  </div>
                </div>
                <Tooltip content="Debloquer cette IP">
                  <span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-emerald-400" onClick={() => onUnblock(ip._id)}>
                      <Unlock className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : MODAL BLOQUER IP
// ============================================

function ModalBlocageIP({
  open,
  onClose,
  ip,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onClose: () => void
  ip: string
  onConfirm: (ip: string, raison: string, duree?: number) => void
  isLoading: boolean
}) {
  const [raison, setRaison] = useState('')
  const [duree, setDuree] = useState<string>('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-400" />
            Bloquer une adresse IP
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-zinc-400">Adresse IP</label>
            <p className="font-mono text-lg text-zinc-200 mt-1">{ip}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Raison du blocage *</label>
            <Input
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="Ex: Tentatives d'injection repetees..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Duree du blocage</label>
            <Select value={duree} onChange={(e) => setDuree(e.target.value)} className="mt-1">
              <option value="">Permanent</option>
              <option value="1">1 heure</option>
              <option value="6">6 heures</option>
              <option value="24">24 heures</option>
              <option value="72">3 jours</option>
              <option value="168">7 jours</option>
              <option value="720">30 jours</option>
            </Select>
            <p className="text-[10px] text-zinc-600 mt-1">
              Un blocage permanent doit etre retire manuellement. Un blocage temporaire expire automatiquement.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(ip, raison, duree ? parseInt(duree) : undefined)}
            disabled={!raison.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
            Bloquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// COMPOSANT : MODAL INVESTIGATION IP
// ============================================

function ModalInvestigationIP({
  open,
  onClose,
  ip,
  onBlock,
}: {
  open: boolean
  onClose: () => void
  ip: string
  onBlock: (ip: string) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['security-investigate', ip],
    queryFn: () => securityService.investigateIP(ip),
    enabled: open && !!ip,
  })

  const dangerColors = {
    faible: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    moyen: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    eleve: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    critique: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-400" />
            Enquete sur {ip}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="ml-3 text-sm text-zinc-400">Analyse en cours...</span>
          </div>
        ) : data ? (
          <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2">
            {/* Score de danger */}
            <div className={`rounded-lg p-4 border ${dangerColors[data.dangerLevel].border} ${dangerColors[data.dangerLevel].bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Score de danger</p>
                  <p className={`text-3xl font-black ${dangerColors[data.dangerLevel].text}`}>{data.dangerScore}/100</p>
                  <p className={`text-sm font-medium ${dangerColors[data.dangerLevel].text} capitalize`}>
                    Niveau : {data.dangerLevel}
                  </p>
                </div>
                <div className="text-right">
                  {data.estBloquee ? (
                    <Badge className="bg-red-500/20 text-red-400 border-0">IP deja bloquee</Badge>
                  ) : data.dangerScore >= 50 ? (
                    <Button size="sm" variant="destructive" onClick={() => onBlock(ip)}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> Bloquer cette IP
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Resume */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase">Total evenements</p>
                <p className="text-xl font-bold text-zinc-200">{data.resume.totalEvents}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase">Derniere 24h</p>
                <p className="text-xl font-bold text-zinc-200">{data.resume.events24h}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase">Premiere apparition</p>
                <p className="text-sm text-zinc-300">{data.resume.premiereApparition ? formatDate(data.resume.premiereApparition) : 'N/A'}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase">Derniere apparition</p>
                <p className="text-sm text-zinc-300">{data.resume.derniereApparition ? formatDate(data.resume.derniereApparition) : 'N/A'}</p>
              </div>
            </div>

            {/* Types d'attaques */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> Types d'attaques
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.repartitionTypes.map((t) => {
                  const info = TYPES_ATTAQUE[t.type]
                  return (
                    <span key={t.type} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300" style={{ borderLeft: `3px solid ${info?.color || '#666'}` }}>
                      {info?.label || t.type}: {t.count}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Empreinte numerique */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                <Fingerprint className="h-3 w-3" /> Empreinte numerique
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Navigateurs</p>
                  {data.empreinteNumerique.navigateurs.slice(0, 3).map((n) => (
                    <p key={n.nom} className="text-[11px] text-zinc-300 truncate">{n.nom} ({n.count})</p>
                  ))}
                  {data.empreinteNumerique.navigateurs.length === 0 && <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Systemes</p>
                  {data.empreinteNumerique.os.slice(0, 3).map((o) => (
                    <p key={o.nom} className="text-[11px] text-zinc-300 truncate">{o.nom} ({o.count})</p>
                  ))}
                  {data.empreinteNumerique.os.length === 0 && <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Appareils</p>
                  {data.empreinteNumerique.appareils.slice(0, 3).map((a) => (
                    <p key={a.nom} className="text-[11px] text-zinc-300 truncate">{a.nom} ({a.count})</p>
                  ))}
                  {data.empreinteNumerique.appareils.length === 0 && <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
              </div>
            </div>

            {/* Chemins cibles */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Chemins cibles
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.pathsCibles.slice(0, 10).map((p) => (
                  <div key={p.chemin} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-zinc-400 truncate flex-1">{p.chemin}</span>
                    <span className="text-zinc-500 ml-2">{p.methodes.join(', ')}</span>
                    <span className="font-bold text-zinc-300 ml-2">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Derniers evenements */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Derniers evenements
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.derniersEvenements.slice(0, 15).map((e) => (
                  <div key={e._id} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-zinc-800/30">
                    <BadgeSeverite severity={e.severity} />
                    <span className="text-zinc-400 truncate flex-1">{e.details.slice(0, 60)}</span>
                    <span className="text-zinc-600 shrink-0">{timeAgo(e.dateCreation)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// COMPOSANT : TOP OFFENDERS
// ============================================

function TopRecidivistes({
  offenders,
  onInvestigate,
  onBlock,
}: {
  offenders: OffenderIP[]
  onInvestigate: (ip: string) => void
  onBlock: (ip: string) => void
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Recidivistes (30 jours)
          <Tooltip content="IPs ayant genere le plus d'evenements graves sur les 30 derniers jours">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {offenders.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun recidiviste</p>
        ) : (
          offenders.map((o, i) => (
            <div key={o.ip} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-200">{o.ip}</span>
                  <span className="text-[10px] text-red-400 font-bold">{o.totalEvents} evt.</span>
                  {o.criticalCount > 0 && (
                    <span className="text-[10px] text-red-500">{o.criticalCount} crit.</span>
                  )}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {o.types.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] text-zinc-600">{TYPES_ATTAQUE[t]?.label || t}</span>
                  ))}
                </div>
                {o.navigateurs.filter(n => n !== 'Inconnu').length > 0 && (
                  <p className="text-[9px] text-zinc-700 mt-0.5">{o.navigateurs.filter(n => n !== 'Inconnu').join(', ')}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onInvestigate(o.ip)}>
                  <Search className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-red-400" onClick={() => onBlock(o.ip)}>
                  <Ban className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT : ALERTES CRITIQUES
// ============================================

function AlertesCritiques({
  events,
  onInvestigateIP,
}: {
  events: SecurityEvent[]
  onInvestigateIP: (ip: string) => void
}) {
  if (events.length === 0) return null

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 border-red-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4" />
          Alertes critiques (7 jours)
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto space-y-1.5">
        {events.map((e) => {
          const typeInfo = TYPES_ATTAQUE[e.type]
          return (
            <div key={e._id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-red-300">{typeInfo?.label || e.type}</span>
                  {e.blocked && <Badge className="text-[9px] bg-red-500/20 text-red-400 border-0">Bloque</Badge>}
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{e.details}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                  <button
                    onClick={() => onInvestigateIP(e.ip)}
                    className="font-mono hover:text-indigo-400 transition-colors"
                  >
                    {e.ip}
                  </button>
                  <span>{e.method} {e.path.slice(0, 30)}</span>
                  <span className="ml-auto">{formatDateShort(e.dateCreation)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function SecurityPage() {
  const queryClient = useQueryClient()

  // State
  const [investigatingIP, setInvestigatingIP] = useState<string | null>(null)
  const [blockingIP, setBlockingIP] = useState<string | null>(null)
  const [sectionOuverte, setSectionOuverte] = useState<string | null>(null)

  // Query dashboard
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: securityService.getDashboard,
    refetchInterval: 15000,
  })

  // Mutation blocage IP
  const blockMutation = useMutation({
    mutationFn: ({ ip, raison, duree }: { ip: string; raison: string; duree?: number }) =>
      securityService.blockIP(ip, raison, duree),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      setBlockingIP(null)
    },
  })

  // Mutation deblocage IP
  const unblockMutation = useMutation({
    mutationFn: (id: string) => securityService.unblockIP(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative">
            <Shield className="h-12 w-12 text-indigo-500 animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <Shield className="h-12 w-12 text-indigo-500 opacity-20" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-4">Chargement du centre de securite...</p>
        </div>
      </PageTransition>
    )
  }

  if (!data) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ShieldAlert className="h-12 w-12 text-red-400" />
          <p className="text-sm text-zinc-400 mt-4">Impossible de charger les donnees de securite</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reessayer
          </Button>
        </div>
      </PageTransition>
    )
  }

  const toggleSection = (id: string) => {
    setSectionOuverte(sectionOuverte === id ? null : id)
  }

  return (
    <PageTransition>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
              <Shield className="h-7 w-7 text-indigo-400" />
              Centre de securite
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Surveillance en temps reel et detection d'intrusion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-zinc-600">
              Maj: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : '--'}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Banniere menace */}
        <BanniereMenace
          level={data.threatLevel}
          onVoirCritiques={() => toggleSection('critiques')}
        />

        {/* Statistiques principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <CarteStats label="Evenements (1h)" value={data.summary.totalEvents1h} icon={Clock} color="#6366f1" detail="Nombre d'evenements de securite detectes dans la derniere heure" />
          <CarteStats label="Evenements (24h)" value={data.summary.totalEvents24h} icon={Activity} color="#8b5cf6" detail="Total sur les dernieres 24 heures" />
          <CarteStats label="Critiques (24h)" value={data.summary.criticalEvents24h} icon={AlertTriangle} color="#ef4444" detail="Evenements de severite critique necessitant une attention immediate" />
          <CarteStats label="Haute sev. (24h)" value={data.summary.highEvents24h} icon={ShieldAlert} color="#f97316" detail="Evenements de haute severite a verifier" />
          <CarteStats label="Bloques (24h)" value={data.summary.blockedEvents24h} icon={ShieldX} color="#f59e0b" detail="Requetes qui ont ete bloquees par le systeme de defense" />
          <CarteStats label="IPs bloquees" value={data.summary.blockedIPsActifs} icon={Ban} color="#dc2626" detail="Nombre d'adresses IP actuellement bannies" />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GraphiqueHoraire data={data.hourlyTrend} />
          <GraphiqueQuotidien data={data.dailyTrend} />
        </div>

        {/* Types d'attaques + Severite + Appareils */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RepartitionAttaques attackTypes={data.attackTypes} />
          <GraphiqueSeverite data={data.severityBreakdown} />
          <StatsEmpreinteNumerique deviceStats={data.deviceStats} />
        </div>

        {/* Alertes critiques (repliable) */}
        {data.criticalEvents.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('critiques')}
              className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mb-2"
            >
              {sectionOuverte === 'critiques' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <AlertOctagon className="h-4 w-4" />
              Alertes critiques ({data.criticalEvents.length})
            </button>
            {sectionOuverte === 'critiques' && (
              <AlertesCritiques events={data.criticalEvents} onInvestigateIP={setInvestigatingIP} />
            )}
          </div>
        )}

        {/* IPs suspectes + Recidivistes + IPs bloquees */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TableauIPsSuspectes
            ips={data.topSuspiciousIPs}
            onInvestigate={setInvestigatingIP}
            onBlock={setBlockingIP}
          />
          <TopRecidivistes
            offenders={data.topOffenderIPs}
            onInvestigate={setInvestigatingIP}
            onBlock={setBlockingIP}
          />
          <div className="space-y-4">
            <IPsBloquees
              blockedIPs={data.blockedIPs}
              onUnblock={(id) => unblockMutation.mutate(id)}
            />
            <CheminsAttaques paths={data.topAttackedPaths} />
          </div>
        </div>

        {/* Flux temps reel */}
        <FluxTempsReel
          events={data.recentEvents}
          onSelectEvent={(id) => { const ip = data.recentEvents.find(e => e._id === id)?.ip; if (ip) setInvestigatingIP(ip); }}
          onInvestigateIP={setInvestigatingIP}
        />

        {/* Modals */}
        {investigatingIP && (
          <ModalInvestigationIP
            open={!!investigatingIP}
            onClose={() => setInvestigatingIP(null)}
            ip={investigatingIP}
            onBlock={(ip) => { setInvestigatingIP(null); setBlockingIP(ip); }}
          />
        )}

        {blockingIP && (
          <ModalBlocageIP
            open={!!blockingIP}
            onClose={() => setBlockingIP(null)}
            ip={blockingIP}
            onConfirm={(ip, raison, duree) => blockMutation.mutate({ ip, raison, duree })}
            isLoading={blockMutation.isPending}
          />
        )}
      </div>
    </PageTransition>
  )
}
