import { useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Activity,
  Zap, Globe, Lock, ShieldX, Eye, Bug, XCircle, Ban, Search, Monitor,
  ChevronDown, ChevronUp, Info, Target, Fingerprint, Clock, TrendingUp,
  BarChart3, ShieldOff, Unlock, ExternalLink, Loader2, AlertOctagon,
  Lightbulb, Server, Database, Cpu, HardDrive, CheckCircle2, XOctagon,
  Wrench, FileWarning, Chrome, Smartphone, Laptop, Tablet, Trash2, Archive, History,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'

// ============================================
// CONSTANTES & LABELS
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
    conseil: 'Bloquez immediatement les IPs malveillantes et analysez les alertes critiques.',
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

/**
 * Vulgarise les details techniques d'une alerte en description comprehensible
 */
function vulgariserAlerte(details: string, type: string, path?: string): { simple: string; technique: string } {
  const technique = details

  // Path traversal
  if (details.includes('Traversee de chemin') || details.includes('Path traversal')) {
    if (details.includes('.env') || (path && path.includes('.env'))) {
      return { simple: 'Quelqu\'un a tente d\'acceder au fichier de configuration secret (.env) de votre serveur. Ce fichier contient vos mots de passe et cles API.', technique }
    }
    if (details.includes('..') || (path && path.includes('..'))) {
      return { simple: 'Quelqu\'un a tente de remonter dans les dossiers du serveur pour acceder a des fichiers proteges auxquels il n\'a pas acces.', technique }
    }
    if (details.includes('etc/passwd') || details.includes('proc/self')) {
      return { simple: 'Quelqu\'un a tente d\'acceder aux fichiers systeme du serveur (mots de passe, processus). C\'est une attaque grave.', technique }
    }
    return { simple: 'Quelqu\'un a tente d\'acceder a des fichiers proteges en exploitant une faille de navigation dans les dossiers.', technique }
  }

  // NoSQL injection
  if (details.includes('Injection NoSQL') || details.includes('injection NoSQL')) {
    return { simple: 'Quelqu\'un a tente d\'envoyer des commandes malveillantes a la base de donnees pour voler ou modifier des informations.', technique }
  }

  // XSS
  if (details.includes('XSS') || details.includes('Attaque XSS')) {
    return { simple: 'Quelqu\'un a tente d\'injecter du code JavaScript malveillant qui pourrait voler les sessions des utilisateurs.', technique }
  }

  // SQL injection
  if (details.includes('Injection SQL') || details.includes('injection SQL')) {
    return { simple: 'Quelqu\'un a tente de manipuler la base de donnees avec des commandes SQL pour extraire ou supprimer des donnees.', technique }
  }

  // Command injection
  if (details.includes('Injection de commande') || details.includes('injection de commande')) {
    return { simple: 'Quelqu\'un a tente d\'executer des commandes systeme sur le serveur. C\'est l\'une des attaques les plus dangereuses.', technique }
  }

  // Brute force
  if (type === 'brute_force' || details.includes('Echec login')) {
    return { simple: 'Quelqu\'un essaie de deviner un mot de passe en testant plusieurs combinaisons rapidement.', technique }
  }

  // Token forgery
  if (type === 'token_forgery' || details.includes('Token invalide')) {
    return { simple: 'Quelqu\'un a utilise un faux jeton d\'authentification pour tenter de se faire passer pour un utilisateur connecte.', technique }
  }

  // Rate limit
  if (type === 'rate_limit_hit' || details.includes('Rate limit')) {
    return { simple: 'Quelqu\'un envoie enormement de requetes en peu de temps, ce qui pourrait surcharger le serveur (possible attaque DDoS).', technique }
  }

  // Suspicious signup
  if (type === 'suspicious_signup' || details.includes('Inscription suspecte')) {
    return { simple: 'Un compte a ete cree avec un comportement de robot (pas de navigateur web normal, script automatise).', technique }
  }

  // Anomaly
  if (type === 'anomaly' || details.includes('Trafic anormal')) {
    return { simple: 'Un volume de requetes anormalement eleve a ete detecte depuis une adresse IP. Cela peut indiquer une attaque automatisee.', technique }
  }

  // IP blocked
  if (type === 'ip_blocked') {
    return { simple: 'Une adresse IP qui a ete bannie a tente de nouveau d\'acceder au serveur. La requete a ete bloquee.', technique }
  }

  // CORS
  if (type === 'cors_violation') {
    return { simple: 'Un site web non autorise a tente d\'envoyer des requetes a votre API. Cela peut etre une tentative de vol de donnees.', technique }
  }

  // Forbidden
  if (type === 'forbidden_access') {
    return { simple: 'Quelqu\'un a tente d\'acceder a une fonctionnalite pour laquelle il n\'a pas les permissions necessaires.', technique }
  }

  // Unauthorized
  if (type === 'unauthorized_access') {
    return { simple: 'Quelqu\'un a tente d\'acceder a une ressource protegee sans etre authentifie.', technique }
  }

  return { simple: details, technique }
}

/**
 * Genere des recommandations basees sur les donnees de securite
 */
interface CompteConcerne {
  email: string
  ip: string
  userId?: string
  date: string
}

interface Recommandation {
  priorite: 'critique' | 'haute' | 'moyenne' | 'info'
  titre: string
  description: string
  action: string
  comptes?: CompteConcerne[]
}

/**
 * Extrait les comptes/IPs concernes depuis les evenements de securite (dedupliques)
 */
function extraireComptes(events: SecurityEvent[], type: string): CompteConcerne[] {
  const seen = new Set<string>()
  return events
    .filter(e => e.type === type)
    .reduce<CompteConcerne[]>((acc, e) => {
      const email = (e.metadata?.email as string) || ''
      const key = email || e.ip
      if (seen.has(key)) return acc
      seen.add(key)
      acc.push({ email, ip: e.ip, userId: e.userId, date: e.dateCreation })
      return acc
    }, [])
}

function genererRecommandations(data: SecurityDashboardData): Recommandation[] {
  const recs: Recommandation[] = []
  const allEvents = [...data.recentEvents, ...data.criticalEvents]

  // Injections detectees
  if ((data.attackTypes.injection_attempt || 0) > 0) {
    const count = data.attackTypes.injection_attempt
    recs.push({
      priorite: count > 10 ? 'critique' : 'haute',
      titre: `${count} tentative(s) d'injection detectee(s)`,
      description: 'Des attaquants tentent d\'injecter du code malveillant dans votre application. Verifiez que toutes les entrees utilisateur sont correctement validees.',
      action: 'Verifier les routes ciblees, mettre a jour les dependances, renforcer la validation Zod',
      comptes: extraireComptes(allEvents, 'injection_attempt'),
    })
  }

  // Brute force
  if ((data.attackTypes.brute_force || 0) > 5) {
    recs.push({
      priorite: 'haute',
      titre: `${data.attackTypes.brute_force} tentatives de force brute`,
      description: 'Plusieurs tentatives de connexion echouees detectees. Un attaquant essaie de deviner des mots de passe.',
      action: 'Verifier les comptes cibles, envisager le blocage des IPs recidivistes, activer le 2FA',
      comptes: extraireComptes(allEvents, 'brute_force'),
    })
  }

  // Inscriptions suspectes
  if ((data.attackTypes.suspicious_signup || 0) > 0) {
    recs.push({
      priorite: 'moyenne',
      titre: `${data.attackTypes.suspicious_signup} inscription(s) suspecte(s)`,
      description: 'Des comptes ont ete crees avec un comportement automatise (bots). Verifiez ces comptes manuellement.',
      action: 'Ajouter un CAPTCHA a l\'inscription, verifier les comptes recemment crees',
      comptes: extraireComptes(allEvents, 'suspicious_signup'),
    })
  }

  // Token forgery
  if ((data.attackTypes.token_forgery || 0) > 0) {
    recs.push({
      priorite: 'haute',
      titre: `${data.attackTypes.token_forgery} token(s) falsifie(s)`,
      description: 'Des jetons d\'authentification invalides ont ete utilises. Cela peut indiquer une tentative de vol de session.',
      action: 'Verifier la rotation des cles JWT, controler les tokens blacklistes',
      comptes: extraireComptes(allEvents, 'token_forgery'),
    })
  }

  // Rate limits
  if ((data.attackTypes.rate_limit_hit || 0) > 20) {
    recs.push({
      priorite: 'moyenne',
      titre: `${data.attackTypes.rate_limit_hit} depassements de limite`,
      description: 'Le systeme de rate limiting a bloque de nombreuses requetes. Si c\'est normal, ajustez les limites.',
      action: 'Verifier si les limites sont adequates, bloquer les IPs les plus agressives',
      comptes: extraireComptes(allEvents, 'rate_limit_hit'),
    })
  }

  // IPs non bloquees qui attaquent
  const criticalIPs = data.topOffenderIPs.filter(ip => ip.criticalCount > 0)
  if (criticalIPs.length > 0) {
    recs.push({
      priorite: 'critique',
      titre: `${criticalIPs.length} IP(s) dangereuse(s) non bloquee(s)`,
      description: `Les IPs suivantes ont genere des evenements critiques : ${criticalIPs.slice(0, 3).map(ip => ip.ip).join(', ')}`,
      action: 'Bloquer ces IPs immediatement via l\'outil de blocage',
    })
  }

  // Anomalies
  if ((data.attackTypes.anomaly || 0) > 0) {
    recs.push({
      priorite: 'moyenne',
      titre: `${data.attackTypes.anomaly} anomalie(s) de trafic`,
      description: 'Un volume de requetes anormal a ete detecte. Cela peut indiquer une attaque DDoS ou un scraping.',
      action: 'Analyser les patterns de trafic, envisager un WAF ou CDN avec protection DDoS',
      comptes: extraireComptes(allEvents, 'anomaly'),
    })
  }

  // Tout va bien
  if (recs.length === 0) {
    recs.push({
      priorite: 'info',
      titre: 'Aucune menace active detectee',
      description: 'Votre serveur fonctionne normalement. Continuez a surveiller les logs regulierement.',
      action: 'Maintenir la surveillance, verifier les mises a jour de securite',
    })
  }

  return recs.sort((a, b) => {
    const order = { critique: 0, haute: 1, moyenne: 2, info: 3 }
    return order[a.priorite] - order[b.priorite]
  })
}

// ============================================
// COMPOSANTS DE BASE
// ============================================

function BadgeSeverite({ severity }: { severity: string }) {
  const config = SEVERITE_LABELS[severity]
  if (!config) return <Badge variant="outline">{severity}</Badge>
  return (
    <Tooltip content={config.description}>
      <span>
        <Badge className="text-[10px] font-bold border-0" style={{ backgroundColor: config.color + '20', color: config.color }}>
          {config.label}
        </Badge>
      </span>
    </Tooltip>
  )
}

function CarteStats({ label, value, icon: Icon, color, detail }: {
  label: string; value: number; icon: typeof Shield; color: string; detail?: string
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

function BanniereMenace({ level, onVoirCritiques }: {
  level: SecurityDashboardData['threatLevel']; onVoirCritiques: () => void
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
            <Info className="h-4 w-4 mr-1" /> Detail
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
                    <Eye className="h-3.5 w-3.5 mr-1" /> Voir les alertes critiques
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
// GRAPHIQUES
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
          <Target className="h-4 w-4" /> Types d'attaques (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.map((entry) => {
          const pct = total > 0 ? (entry.count / total) * 100 : 0
          const Icon = entry.icon
          const expanded = expandedType === entry.type
          return (
            <div key={entry.type}>
              <button onClick={() => setExpandedType(expanded ? null : entry.type)} className="w-full text-left hover:bg-zinc-800/50 rounded-lg p-2 transition-colors">
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
                <div className="mx-2 mb-2 p-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-400">{entry.description}</div>
              )}
            </div>
          )
        })}
        {total === 0 && <p className="text-xs text-zinc-600 text-center py-4">Aucune attaque detectee</p>}
      </CardContent>
    </Card>
  )
}

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
          <BarChart3 className="h-4 w-4" /> Repartition par severite (7 jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Legend formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: any, name: any) => [`${value} evenements (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`, name]}
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

function GraphiqueHoraire({ data }: { data: SecurityDashboardData['hourlyTrend'] }) {
  const chartData = data.map((p) => ({
    heure: `${String(p._id.hour).padStart(2, '0')}h`,
    Total: p.total,
    Critiques: p.critical,
    Bloques: p.blocked,
  }))

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Activite par heure (24h)
          <Tooltip content="Nombre d'alertes de securite detectees chaque heure"><span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span></Tooltip>
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
              formatter={(value: any, name: any) => [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="Total" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="Critiques" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={1.5} />
            <Area type="monotone" dataKey="Bloques" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={1} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function GraphiqueQuotidien({ data }: { data: SecurityDashboardData['dailyTrend'] }) {
  const chartData = data.map((p) => {
    const date = new Date(p._id)
    return { jour: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }), Critiques: p.critical, Hautes: p.high, Moyennes: p.medium, Basses: p.low }
  })

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Tendance quotidienne (7 jours)
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
              formatter={(value: any, name: any) => [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Critiques" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Hautes" stackId="a" fill="#f97316" />
            <Bar dataKey="Moyennes" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Basses" stackId="a" fill="#6b7280" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// EMPREINTE NUMERIQUE AMELIOREE
// ============================================

function StatsEmpreinteNumerique({ deviceStats, recentEvents }: { deviceStats: SecurityDashboardData['deviceStats']; recentEvents: SecurityEvent[] }) {
  const [onglet, setOnglet] = useState<'navigateurs' | 'os' | 'appareils' | 'combinaisons'>('navigateurs')
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#818cf8', '#4f46e5', '#4338ca']

  // Nettoyer les donnees: remplacer les noms null/vides par un label lisible
  const cleanDeviceData = (data: { nom: string; count: number }[], fallback: string) => {
    return data
      .map(d => ({ ...d, nom: d.nom && d.nom !== 'null' ? d.nom : fallback }))
      .reduce((acc, item) => {
        const existing = acc.find(a => a.nom === item.nom)
        if (existing) { existing.count += item.count } else { acc.push({ ...item }) }
        return acc
      }, [] as { nom: string; count: number }[])
      .sort((a, b) => b.count - a.count)
  }

  // Calculer les combinaisons uniques (fingerprint-like)
  const combinaisons = useMemo(() => {
    const comboMap = new Map<string, { navigateur: string; os: string; appareil: string; count: number; ips: Set<string>; userAgents: Set<string> }>()
    recentEvents.forEach((e) => {
      const nav = e.navigateur && e.navigateur !== 'Inconnu' ? e.navigateur : null
      const osVal = e.os && e.os !== 'Inconnu' ? e.os : null
      const app = e.appareil && e.appareil !== 'Inconnu' ? e.appareil : null
      // Garder les events qui ont au moins une info device
      if (!nav && !osVal && !app) return
      const key = `${nav || '?'}|${osVal || '?'}|${app || '?'}`
      const existing = comboMap.get(key)
      if (existing) {
        existing.count++
        existing.ips.add(e.ip)
        if (e.userAgent) existing.userAgents.add(e.userAgent)
      } else {
        comboMap.set(key, {
          navigateur: nav || 'Inconnu',
          os: osVal || 'Inconnu',
          appareil: app || 'Inconnu',
          count: 1,
          ips: new Set([e.ip]),
          userAgents: new Set(e.userAgent ? [e.userAgent] : []),
        })
      }
    })
    return Array.from(comboMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(c => ({ ...c, ipsCount: c.ips.size, uaCount: c.userAgents.size }))
  }, [recentEvents])

  const getIcon = (appareil: string) => {
    if (appareil.includes('Smartphone')) return Smartphone
    if (appareil.includes('Tablette')) return Tablet
    if (appareil.includes('Outil') || appareil.includes('Bot')) return Bug
    return Laptop
  }

  const renderList = () => {
    if (onglet === 'combinaisons') {
      return combinaisons.length === 0 ? (
        <div className="text-center py-6">
          <Fingerprint className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-600">Aucune empreinte identifiable</p>
          <p className="text-[10px] text-zinc-700 mt-1">Les evenements n'ont pas assez de donnees navigateur/OS</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {combinaisons.map((c, i) => {
            const DevIcon = getIcon(c.appareil)
            return (
              <div key={i} className="p-2.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors border border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-indigo-500/10">
                    <DevIcon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-200 truncate font-medium">{c.navigateur}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{c.os} - {c.appareil}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-zinc-300">{c.count} req.</p>
                    <p className="text-[10px] text-zinc-600">{c.ipsCount} IP{c.ipsCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {/* Barre de proportion */}
                <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500/40" style={{ width: `${Math.min(100, (c.count / Math.max(1, combinaisons[0]?.count)) * 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    const rawData = deviceStats[onglet as 'navigateurs' | 'os' | 'appareils']
    const fallbackLabel = onglet === 'navigateurs' ? 'Navigateur non identifie' : onglet === 'os' ? 'OS non identifie' : 'Appareil non identifie'
    const data = cleanDeviceData(rawData, fallbackLabel)
    const total = data.reduce((s, d) => s + d.count, 0)

    return data.length === 0 || total === 0 ? (
      <div className="text-center py-6">
        <Monitor className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-xs text-zinc-600">Aucune donnee disponible</p>
      </div>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data.map((d) => ({ name: d.nom, value: d.count }))} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, percent }) => (percent ?? 0) > 0.08 ? `${(name ?? '').toString().slice(0, 12)}` : ''} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: any, name: any) => [`${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(0) : 0}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1 mt-2">
          {data.slice(0, 8).map((d, i) => (
            <div key={`${d.nom}-${i}`} className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-zinc-300 truncate flex-1 font-medium">{d.nom}</span>
              <span className="font-mono text-zinc-300">{d.count}</span>
              <span className="text-zinc-500 w-10 text-right">{total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Fingerprint className="h-4 w-4" /> Empreinte numerique
          <Tooltip content="Analyse des appareils, navigateurs et systemes utilises lors des attaques. L'onglet 'Empreintes' montre les combinaisons uniques (profils d'attaquants).">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 mb-3">
          {(['navigateurs', 'os', 'appareils', 'combinaisons'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setOnglet(tab)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${onglet === tab ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            >
              {tab === 'navigateurs' ? 'Navigateurs' : tab === 'os' ? 'Systemes' : tab === 'appareils' ? 'Appareils' : 'Empreintes'}
            </button>
          ))}
        </div>
        {renderList()}
      </CardContent>
    </Card>
  )
}

// ============================================
// ALERTES CRITIQUES VULGARISEES
// ============================================

function AlertesCritiques({ events, onInvestigateIP }: {
  events: SecurityEvent[]; onInvestigateIP: (ip: string) => void
}) {
  const [detailTechniqueOuvert, setDetailTechniqueOuvert] = useState<string | null>(null)

  if (events.length === 0) return null

  return (
    <div className="max-h-[400px] overflow-y-auto space-y-2">
      {events.map((e) => {
        const typeInfo = TYPES_ATTAQUE[e.type]
        const { simple, technique } = vulgariserAlerte(e.details, e.type, e.path)
        const showTechnique = detailTechniqueOuvert === e._id

        return (
          <div key={e._id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-red-300">{typeInfo?.label || e.type}</span>
                  {e.blocked && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-0">Bloque</Badge>}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{simple}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
                  <button onClick={() => onInvestigateIP(e.ip)} className="font-mono hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                    <Search className="h-2.5 w-2.5" /> {e.ip}
                  </button>
                  <span>{e.method} {e.path.slice(0, 40)}</span>
                  <span className="ml-auto">{formatDateShort(e.dateCreation)}</span>
                </div>
                <button
                  onClick={() => setDetailTechniqueOuvert(showTechnique ? null : e._id)}
                  className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Wrench className="h-3 w-3" />
                  {showTechnique ? 'Masquer les details techniques' : 'Voir les details techniques'}
                </button>
                {showTechnique && (
                  <div className="mt-2 p-2 rounded bg-zinc-800/60 border border-zinc-700/50">
                    <p className="text-[10px] text-zinc-500 font-mono break-all">{technique}</p>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-zinc-700/50">
                        <p className="text-[10px] text-zinc-600 font-mono">{JSON.stringify(e.metadata, null, 1)}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-1">User-Agent: {e.userAgent || 'N/A'}</p>
                    <p className="text-[10px] text-zinc-600">Navigateur: {e.navigateur} | OS: {e.os} | Appareil: {e.appareil}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// FLUX TEMPS REEL
// ============================================

function FluxTempsReel({ events, onInvestigateIP }: {
  events: SecurityEvent[]; onInvestigateIP: (ip: string) => void
}) {
  const [filtreSeverite, setFiltreSeverite] = useState<string>('')
  const [filtreType, setFiltreType] = useState<string>('')
  const [recherche, setRecherche] = useState('')
  const [filtreBloque, setFiltreBloque] = useState<string>('')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filtreSeverite && e.severity !== filtreSeverite) return false
      if (filtreType && e.type !== filtreType) return false
      if (filtreBloque === 'oui' && !e.blocked) return false
      if (filtreBloque === 'non' && e.blocked) return false
      if (recherche) {
        const q = recherche.toLowerCase()
        return e.ip.includes(q) || e.details.toLowerCase().includes(q) || e.path.toLowerCase().includes(q) || e.navigateur.toLowerCase().includes(q)
      }
      return true
    })
  }, [events, filtreSeverite, filtreType, recherche, filtreBloque])

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            Flux en temps reel
            <Badge variant="outline" className="text-[10px]">{filtered.length}/{events.length}</Badge>
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="Rechercher (IP, chemin, navigateur)..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="h-8 text-xs" />
          </div>
          <select
            value={filtreSeverite} onChange={(e) => setFiltreSeverite(e.target.value)}
            className="h-8 text-xs w-28 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">Severite</option>
            <option value="critical" className="bg-zinc-900 text-red-400">Critique</option>
            <option value="high" className="bg-zinc-900 text-orange-400">Haute</option>
            <option value="medium" className="bg-zinc-900 text-amber-400">Moyenne</option>
            <option value="low" className="bg-zinc-900 text-zinc-400">Basse</option>
          </select>
          <select
            value={filtreType} onChange={(e) => setFiltreType(e.target.value)}
            className="h-8 text-xs w-32 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">Type</option>
            {Object.entries(TYPES_ATTAQUE).map(([key, val]) => (
              <option key={key} value={key} className="bg-zinc-900 text-zinc-300">{val.label}</option>
            ))}
          </select>
          <select
            value={filtreBloque} onChange={(e) => setFiltreBloque(e.target.value)}
            className="h-8 text-xs w-28 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">Statut</option>
            <option value="oui" className="bg-zinc-900 text-emerald-400">Bloque</option>
            <option value="non" className="bg-zinc-900 text-red-400">Non bloque</option>
          </select>
          {(filtreSeverite || filtreType || filtreBloque || recherche) && (
            <button
              onClick={() => { setFiltreSeverite(''); setFiltreType(''); setFiltreBloque(''); setRecherche('') }}
              className="h-8 px-2 text-[10px] text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Reinitialiser
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Aucun resultat</p>
        ) : (
          filtered.slice(0, 50).map((event) => {
            const typeInfo = TYPES_ATTAQUE[event.type]
            const Icon = typeInfo?.icon || Shield
            const { simple } = vulgariserAlerte(event.details, event.type, event.path)

            return (
              <div key={event._id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group">
                <div className="mt-0.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: typeInfo?.color || '#999' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BadgeSeverite severity={event.severity} />
                    <span className="text-xs font-medium text-zinc-300 truncate">{typeInfo?.label || event.type}</span>
                    {event.blocked && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-0">Bloque</Badge>}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{simple}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                    <button onClick={() => onInvestigateIP(event.ip)} className="font-mono hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                      <Search className="h-2.5 w-2.5" /> {event.ip}
                    </button>
                    <span>{event.method} {event.path.slice(0, 40)}</span>
                    {event.navigateur && event.navigateur !== 'Inconnu' && (
                      <span className="text-zinc-700"><Chrome className="h-2.5 w-2.5 inline mr-0.5" />{event.navigateur}</span>
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
// IP COMPONENTS
// ============================================

function TableauIPsSuspectes({ ips, onInvestigate, onBlock }: {
  ips: SuspiciousIP[]; onInvestigate: (ip: string) => void; onBlock: (ip: string) => void
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Globe className="h-4 w-4" /> IPs suspectes (24h)
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
                      {ip.count} alertes
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip content="Enqueter sur cette IP"><span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onInvestigate(ip.ip)}><Search className="h-3.5 w-3.5" /></Button>
                    </span></Tooltip>
                    <Tooltip content="Bloquer cette IP"><span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-400" onClick={() => onBlock(ip.ip)}><Ban className="h-3.5 w-3.5" /></Button>
                    </span></Tooltip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ip.types.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">{TYPES_ATTAQUE[t]?.label || t}</span>
                  ))}
                </div>
                {ip.navigateurs.filter(n => n !== 'Inconnu').length > 0 && (
                  <div className="flex gap-2 mt-1 text-[10px] text-zinc-600">
                    <Monitor className="h-3 w-3 shrink-0" />
                    {ip.navigateurs.filter(n => n !== 'Inconnu').slice(0, 3).join(', ')}
                    {ip.os.filter(o => o !== 'Inconnu').length > 0 && <span>| {ip.os.filter(o => o !== 'Inconnu').join(', ')}</span>}
                  </div>
                )}
                <div className="text-[10px] text-zinc-600 mt-0.5">Dernier vu : {formatDateShort(ip.lastSeen)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TopRecidivistes({ offenders, onInvestigate, onBlock }: {
  offenders: OffenderIP[]; onInvestigate: (ip: string) => void; onBlock: (ip: string) => void
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" /> Recidivistes (30 jours)
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
                  <span className="text-[10px] text-red-400 font-bold">{o.totalEvents} alertes</span>
                  {o.criticalCount > 0 && <span className="text-[10px] text-red-500">{o.criticalCount} crit.</span>}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {o.types.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] text-zinc-600">{TYPES_ATTAQUE[t]?.label || t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onInvestigate(o.ip)}><Search className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-red-400" onClick={() => onBlock(o.ip)}><Ban className="h-3 w-3" /></Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function CheminsAttaques({ paths }: { paths: SecurityDashboardData['topAttackedPaths'] }) {
  const maxCount = paths.length > 0 ? paths[0].count : 1
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Points d'entree cibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {paths.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun chemin attaque</p>
        ) : paths.map((p) => (
          <div key={p.path} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300 truncate flex-1">{p.path}</span>
              <span className="text-xs font-bold text-zinc-400 ml-2">{p.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all" style={{ width: `${(p.count / maxCount) * 100}%` }} />
            </div>
            <div className="flex gap-1">
              {p.types.map((t) => (
                <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500">{TYPES_ATTAQUE[t]?.label || t}</span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function IPsBloquees({ blockedIPs, onUnblock }: { blockedIPs: BlockedIP[]; onUnblock: (id: string) => void }) {
  const actives = blockedIPs.filter((ip) => ip.actif)
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-red-400" /> IPs bloquees ({actives.length})
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
                <Tooltip content="Debloquer cette IP"><span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-emerald-400" onClick={() => onUnblock(ip._id)}><Unlock className="h-3.5 w-3.5" /></Button>
                </span></Tooltip>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// APPAREILS BANNIS (anti IP dynamique)
// ============================================

function AppareilsBannis({ onUnban }: { onUnban: (id: string) => void }) {
  const { data: devices, isLoading } = useQuery({
    queryKey: ['banned-devices'],
    queryFn: () => securityService.getBannedDevices(true),
    refetchInterval: 60000,
  })

  if (isLoading) return null

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-orange-400" /> Appareils bannis ({devices?.length || 0})
          <Tooltip content="Le bannissement par appareil bloque les attaquants meme si leur adresse IP change (IP dynamique). Base sur l'empreinte du navigateur.">
            <span><Info className="h-3 w-3 text-zinc-600 cursor-help" /></span>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto">
        {!devices || devices.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">Aucun appareil banni</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => {
              const DevIcon = d.appareil.includes('Smartphone') ? Smartphone : d.appareil.includes('Tablette') ? Tablet : Laptop
              return (
                <div key={d._id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <DevIcon className="h-4 w-4 text-orange-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-orange-300 font-medium truncate">{d.navigateur} / {d.os}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{d.raison}</p>
                      <div className="text-[10px] text-zinc-600">
                        {d.ipsConnues.length > 0 && <span>{d.ipsConnues.length} IP{d.ipsConnues.length > 1 ? 's' : ''} connue{d.ipsConnues.length > 1 ? 's' : ''} | </span>}
                        {d.bloquePar ? `Par ${d.bloquePar.prenom} ${d.bloquePar.nom}` : 'Systeme'}
                        {d.expireAt && <span className="text-amber-500"> | Expire: {formatDateShort(d.expireAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <Tooltip content="Debannir cet appareil"><span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-emerald-400 shrink-0" onClick={() => onUnban(d._id)}>
                      <Unlock className="h-3.5 w-3.5" />
                    </Button>
                  </span></Tooltip>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// MODALS
// ============================================

function ModalBanDevice({ open, onClose, onConfirm, isLoading, prefill }: {
  open: boolean; onClose: () => void
  onConfirm: (params: { userAgent: string; raison: string; duree?: number; navigateur?: string; os?: string; appareil?: string; ipsConnues?: string[] }) => void
  isLoading: boolean
  prefill?: { userAgent: string; navigateur: string; os: string; appareil: string; ips: string[] }
}) {
  const [raison, setRaison] = useState('')
  const [duree, setDuree] = useState<string>('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-orange-400" /> Bannir un appareil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
            <p className="text-xs text-zinc-400 mb-1">Empreinte de l'appareil</p>
            <p className="text-sm text-zinc-200 font-medium">{prefill?.navigateur || 'Inconnu'} / {prefill?.os || 'Inconnu'}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{prefill?.appareil || 'Inconnu'}{prefill?.ips && prefill.ips.length > 0 ? ` - ${prefill.ips.length} IP(s) connue(s)` : ''}</p>
          </div>
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <p className="text-[11px] text-amber-400">Ce bannissement bloquera cet appareil meme si l'adresse IP change. Utile contre les attaquants avec IP dynamique.</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Raison du bannissement *</label>
            <Input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ex: Attaquant persistant, IP dynamique..." className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Duree</label>
            <select value={duree} onChange={(e) => setDuree(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-3 text-sm">
              <option value="" className="bg-zinc-900">Permanent</option>
              <option value="24" className="bg-zinc-900">24 heures</option>
              <option value="72" className="bg-zinc-900">3 jours</option>
              <option value="168" className="bg-zinc-900">7 jours</option>
              <option value="720" className="bg-zinc-900">30 jours</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => onConfirm({
              userAgent: prefill?.userAgent || '',
              raison,
              duree: duree ? parseInt(duree) : undefined,
              navigateur: prefill?.navigateur,
              os: prefill?.os,
              appareil: prefill?.appareil,
              ipsConnues: prefill?.ips,
            })}
            disabled={!raison.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Smartphone className="h-4 w-4 mr-1" />} Bannir l'appareil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalBlocageIP({ open, onClose, ip, onConfirm, isLoading }: {
  open: boolean; onClose: () => void; ip: string
  onConfirm: (ip: string, raison: string, duree?: number) => void; isLoading: boolean
}) {
  const [raison, setRaison] = useState('')
  const [duree, setDuree] = useState<string>('')
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-400" /> Bloquer une adresse IP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-zinc-400">Adresse IP</label>
            <p className="font-mono text-lg text-zinc-200 mt-1">{ip}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Raison du blocage *</label>
            <Input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ex: Tentatives d'injection repetees..." className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Duree du blocage</label>
            <select value={duree} onChange={(e) => setDuree(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-3 text-sm">
              <option value="" className="bg-zinc-900">Permanent</option>
              <option value="1" className="bg-zinc-900">1 heure</option>
              <option value="6" className="bg-zinc-900">6 heures</option>
              <option value="24" className="bg-zinc-900">24 heures</option>
              <option value="72" className="bg-zinc-900">3 jours</option>
              <option value="168" className="bg-zinc-900">7 jours</option>
              <option value="720" className="bg-zinc-900">30 jours</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={() => onConfirm(ip, raison, duree ? parseInt(duree) : undefined)} disabled={!raison.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />} Bloquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalInvestigationIP({ open, onClose, ip, onBlock, onBanDevice }: {
  open: boolean; onClose: () => void; ip: string; onBlock: (ip: string) => void
  onBanDevice: (prefill: { userAgent: string; navigateur: string; os: string; appareil: string; ips: string[] }) => void
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
          <DialogTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-indigo-400" /> Enquete sur {ip}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="ml-3 text-sm text-zinc-400">Analyse en cours...</span>
          </div>
        ) : data ? (
          <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2">
            <div className={`rounded-lg p-4 border ${dangerColors[data.dangerLevel].border} ${dangerColors[data.dangerLevel].bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Score de danger</p>
                  <p className={`text-3xl font-black ${dangerColors[data.dangerLevel].text}`}>{data.dangerScore}/100</p>
                  <p className={`text-sm font-medium ${dangerColors[data.dangerLevel].text} capitalize`}>Niveau : {data.dangerLevel}</p>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {data.estBloquee ? (
                    <Badge className="bg-red-500/20 text-red-400 border-0">IP deja bloquee</Badge>
                  ) : data.dangerScore >= 50 ? (
                    <Button size="sm" variant="destructive" onClick={() => onBlock(ip)}><Ban className="h-3.5 w-3.5 mr-1" /> Bloquer IP</Button>
                  ) : null}
                  {data.empreinteNumerique.navigateurs.length > 0 && data.derniersEvenements.length > 0 && (
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] h-7" onClick={() => {
                      const lastEvent = data.derniersEvenements[0]
                      onBanDevice({
                        userAgent: lastEvent.userAgent || '',
                        navigateur: data.empreinteNumerique.navigateurs[0]?.nom || lastEvent.navigateur || 'Inconnu',
                        os: data.empreinteNumerique.os[0]?.nom || lastEvent.os || 'Inconnu',
                        appareil: data.empreinteNumerique.appareils[0]?.nom || lastEvent.appareil || 'Inconnu',
                        ips: [ip],
                      })
                    }}>
                      <Smartphone className="h-3 w-3 mr-1" /> Bannir appareil
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase">Total alertes</p>
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
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> Types d'attaques</p>
              <div className="flex flex-wrap gap-1.5">
                {data.repartitionTypes.map((t) => {
                  const info = TYPES_ATTAQUE[t.type]
                  return <span key={t.type} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300" style={{ borderLeft: `3px solid ${info?.color || '#666'}` }}>{info?.label || t.type}: {t.count}</span>
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Empreinte numerique</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Navigateurs</p>
                  {data.empreinteNumerique.navigateurs.length > 0
                    ? data.empreinteNumerique.navigateurs.slice(0, 3).map((n) => <p key={n.nom} className="text-[11px] text-zinc-300 truncate">{n.nom} ({n.count})</p>)
                    : <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Systemes</p>
                  {data.empreinteNumerique.os.length > 0
                    ? data.empreinteNumerique.os.slice(0, 3).map((o) => <p key={o.nom} className="text-[11px] text-zinc-300 truncate">{o.nom} ({o.count})</p>)
                    : <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <p className="text-[10px] text-zinc-500 mb-1">Appareils</p>
                  {data.empreinteNumerique.appareils.length > 0
                    ? data.empreinteNumerique.appareils.slice(0, 3).map((a) => <p key={a.nom} className="text-[11px] text-zinc-300 truncate">{a.nom} ({a.count})</p>)
                    : <p className="text-[10px] text-zinc-600">Inconnu</p>}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Chemins cibles</p>
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
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Derniers evenements</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.derniersEvenements.slice(0, 10).map((e) => {
                  const { simple } = vulgariserAlerte(e.details, e.type, e.path)
                  return (
                    <div key={e._id} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-zinc-800/30">
                      <BadgeSeverite severity={e.severity} />
                      <span className="text-zinc-400 truncate flex-1">{simple.slice(0, 80)}</span>
                      <span className="text-zinc-600 shrink-0">{timeAgo(e.dateCreation)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// RECOMMANDATIONS
// ============================================

function RecommandationsCorrections({ data }: { data: SecurityDashboardData }) {
  const recommandations = useMemo(() => genererRecommandations(data), [data])
  const prioriteConfig = {
    critique: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XOctagon },
    haute: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
    moyenne: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: FileWarning },
    info: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
  }

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" /> Recommandations de securite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommandations.map((rec, i) => {
          const config = prioriteConfig[rec.priorite]
          const Icon = config.icon
          const comptes = rec.comptes?.filter(c => c.email || c.userId || c.ip) || []
          return (
            <div key={i} className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
              <div className="flex items-start gap-2">
                <Icon className={`h-4 w-4 ${config.text} mt-0.5 shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold ${config.text}`}>{rec.titre}</p>
                    <Badge className={`text-[9px] ${config.bg} ${config.text} border-0 uppercase`}>{rec.priorite}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{rec.description}</p>

                  {/* Comptes concernes */}
                  {comptes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Concerne(s) :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {comptes.slice(0, 8).map((c, j) => {
                          const label = c.email || c.ip
                          if (c.userId) {
                            return (
                              <Link
                                key={j}
                                to={`/users/${c.userId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-[11px] text-zinc-300 hover:bg-zinc-700/80 hover:text-white transition-colors"
                                title={`${label} - ${formatDate(c.date)}`}
                              >
                                <Eye className="h-3 w-3 text-indigo-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{label}</span>
                              </Link>
                            )
                          }
                          // Pas de userId : afficher avec l'email/IP cliquable vers la recherche users
                          return (
                            <Link
                              key={j}
                              to={c.email ? `/users?search=${encodeURIComponent(c.email)}` : '#'}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-[11px] text-zinc-300 hover:bg-zinc-700/80 hover:text-white transition-colors"
                              title={`${label} - ${formatDate(c.date)}`}
                            >
                              <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[140px]">{label}</span>
                            </Link>
                          )
                        })}
                        {comptes.length > 8 && (
                          <span className="text-[10px] text-zinc-500 self-center">+{comptes.length - 8} autres</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <Wrench className="h-3 w-3 text-zinc-500" />
                    <p className="text-[11px] text-zinc-500 italic">{rec.action}</p>
                  </div>
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
// HISTORIQUE DES PURGES
// ============================================

function HistoriquePurges({ onViewDetail }: { onViewDetail: (id: string) => void }) {
  const queryClient = useQueryClient()

  const { data: purges, isLoading } = useQuery({
    queryKey: ['purge-history'],
    queryFn: securityService.getPurgeHistory,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => securityService.deletePurge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purge-history'] }),
  })

  if (isLoading) return <div className="text-center py-4 text-zinc-500 text-sm">Chargement...</div>
  if (!purges || purges.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="py-6 text-center">
          <Archive className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Aucune archive de purge</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" /> Historique des purges
          <Badge variant="outline" className="ml-auto text-[10px]">{purges.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {purges.map((p) => (
          <div key={p._id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                {new Date(p.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-zinc-300">{p.stats.events} event{p.stats.events > 1 ? 's' : ''}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-300">{p.stats.blockedIPs} IP{p.stats.blockedIPs > 1 ? 's' : ''}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-300">{p.stats.bannedDevices} appareil{p.stats.bannedDevices > 1 ? 's' : ''}</span>
              </div>
              {p.note && <p className="text-[10px] text-zinc-500 mt-1 truncate">{p.note}</p>}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-indigo-400 hover:text-indigo-300" onClick={() => onViewDetail(p._id)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300"
                onClick={() => { if (confirm('Supprimer definitivement cette archive ?')) deleteMutation.mutate(p._id) }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ModalDetailPurge({ open, onClose, purgeId }: { open: boolean; onClose: () => void; purgeId: string }) {
  const [onglet, setOnglet] = useState<'events' | 'ips' | 'devices'>('events')

  const { data, isLoading } = useQuery({
    queryKey: ['purge-detail', purgeId],
    queryFn: () => securityService.getPurgeDetail(purgeId),
    enabled: open && !!purgeId,
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-200">
            <Archive className="h-5 w-5 text-indigo-400" /> Archive de purge
            {data && (
              <span className="text-xs text-zinc-500 ml-2">
                {new Date(data.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/50">
                <div className="text-lg font-bold text-zinc-200">{data.stats.events}</div>
                <div className="text-[10px] text-zinc-500">Evenements</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/50">
                <div className="text-lg font-bold text-zinc-200">{data.stats.blockedIPs}</div>
                <div className="text-[10px] text-zinc-500">IPs bloquees</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/50">
                <div className="text-lg font-bold text-zinc-200">{data.stats.bannedDevices}</div>
                <div className="text-[10px] text-zinc-500">Appareils bannis</div>
              </div>
            </div>

            {data.note && (
              <p className="text-xs text-zinc-400 bg-zinc-800/30 rounded px-3 py-2 mb-3">Note : {data.note}</p>
            )}

            {/* Onglets */}
            <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1 mb-3">
              {([
                { key: 'events' as const, label: 'Evenements', count: data.archivedEvents.length },
                { key: 'ips' as const, label: 'IPs bloquees', count: data.archivedBlockedIPs.length },
                { key: 'devices' as const, label: 'Appareils', count: data.archivedBannedDevices.length },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setOnglet(key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${onglet === key ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {onglet === 'events' && data.archivedEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 bg-zinc-800/30 rounded-lg px-3 py-2 text-xs border border-zinc-700/30">
                  <Badge variant="outline" className={`text-[9px] ${e.severity === 'critical' ? 'border-red-500/50 text-red-400' : e.severity === 'high' ? 'border-orange-500/50 text-orange-400' : e.severity === 'medium' ? 'border-yellow-500/50 text-yellow-400' : 'border-zinc-600 text-zinc-400'}`}>
                    {e.severity}
                  </Badge>
                  <span className="text-zinc-400 font-mono">{e.ip}</span>
                  <span className="text-zinc-500 truncate flex-1">{e.type} - {e.details?.toString().slice(0, 80)}</span>
                  <span className="text-zinc-600 shrink-0">{new Date(e.dateCreation as string).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {onglet === 'ips' && data.archivedBlockedIPs.map((ip, i) => (
                <div key={i} className="flex items-center gap-3 bg-zinc-800/30 rounded-lg px-3 py-2 text-xs border border-zinc-700/30">
                  <Ban className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="text-zinc-300 font-mono">{ip.ip}</span>
                  <span className="text-zinc-500 truncate flex-1">{ip.raison}</span>
                  <Badge variant="outline" className={`text-[9px] ${ip.actif ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-500'}`}>
                    {ip.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              ))}
              {onglet === 'devices' && data.archivedBannedDevices.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-zinc-800/30 rounded-lg px-3 py-2 text-xs border border-zinc-700/30">
                  <Monitor className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span className="text-zinc-300">{d.navigateur} / {d.os}</span>
                  <span className="text-zinc-500 truncate flex-1">{d.raison}</span>
                  <span className="text-zinc-600">{d.ipsConnues?.length || 0} IP(s)</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-8">Archive introuvable</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// ANALYSEUR BACKEND TEMPS REEL
// ============================================

function AnalyseurBackend() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backend-health'],
    queryFn: securityService.getBackendHealth,
    refetchInterval: 60000,
  })

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          <span className="ml-2 text-sm text-zinc-400">Analyse du backend...</span>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" /> Sante du backend
            <Badge variant="outline" className="text-[10px]">Temps reel</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Analyse en {data.dureeAnalyseMs}ms</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Analyser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score global */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="#27272a" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="35" fill="none"
                stroke={scoreColor(data.score)} strokeWidth="6"
                strokeDasharray={`${(data.score / 100) * 220} 220`}
                strokeLinecap="round" transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black" style={{ color: scoreColor(data.score) }}>{data.score}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-200">
              {data.statut === 'sain' ? 'Serveur en bonne sante' : data.statut === 'degrade' ? 'Performance degradee' : 'Etat critique'}
            </p>
            {data.problemes.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {data.problemes.slice(0, 3).map((p, i) => (
                  <p key={i} className="text-[11px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {p}
                  </p>
                ))}
                {data.problemes.length > 3 && (
                  <p className="text-[10px] text-zinc-500">+ {data.problemes.length - 3} autre(s) probleme(s)</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Base de donnees */}
        <div className="p-3 rounded-lg bg-zinc-800/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-300">Base de donnees</span>
            <Badge className={`text-[9px] border-0 ${data.baseDeDonnees.etat === 'connecte' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {data.baseDeDonnees.etat}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-zinc-500">Ping</p>
              <p className={`text-xs font-bold ${data.baseDeDonnees.pingMs < 100 ? 'text-emerald-400' : data.baseDeDonnees.pingMs < 500 ? 'text-amber-400' : 'text-red-400'}`}>
                {data.baseDeDonnees.pingMs}ms
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Taille</p>
              <p className="text-xs font-bold text-zinc-300">{data.baseDeDonnees.taille}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Collections</p>
              <p className="text-xs font-bold text-zinc-300">{data.baseDeDonnees.collections}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Objets</p>
              <p className="text-xs font-bold text-zinc-300">{data.baseDeDonnees.objets?.toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* Collections */}
        <div className="p-3 rounded-lg bg-zinc-800/30">
          <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-zinc-400" /> Collections ({data.collectionsDetails.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {data.collectionsDetails.map((col) => (
              <div key={col.nom} className="flex items-center justify-between text-[11px] p-1.5 rounded hover:bg-zinc-700/30">
                <div className="flex items-center gap-1.5">
                  {col.statut === 'ok'
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    : <XCircle className="h-3 w-3 text-red-400" />}
                  <span className="text-zinc-300">{col.nom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{col.documents.toLocaleString('fr-FR')} docs</span>
                  <span className={`${col.latenceMs < 50 ? 'text-emerald-400' : col.latenceMs < 200 ? 'text-amber-400' : 'text-red-400'}`}>
                    {col.latenceMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Systeme */}
        <div className="p-3 rounded-lg bg-zinc-800/30">
          <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-zinc-400" /> Systeme
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-zinc-500">Memoire heap</p>
              <p className="text-xs font-bold text-zinc-300">{data.systeme.memoire.heapUsed} / {data.systeme.memoire.heapTotal}</p>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${data.systeme.memoire.heapUsagePct}%`,
                  backgroundColor: data.systeme.memoire.heapUsagePct < 70 ? '#10b981' : data.systeme.memoire.heapUsagePct < 85 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">{data.systeme.memoire.heapUsagePct}% utilise</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">RAM systeme</p>
              <p className="text-xs font-bold text-zinc-300">{data.systeme.memoireSysteme.usagePct}% utilise</p>
              <p className="text-[10px] text-zinc-600">{data.systeme.memoireSysteme.libre} libre</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Uptime</p>
              <p className="text-xs font-bold text-zinc-300">{data.systeme.uptime.formatProcessus}</p>
              <p className="text-[10px] text-zinc-600">Node {data.systeme.nodeVersion}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">CPUs</p>
              <p className="text-xs font-bold text-zinc-300">{data.systeme.cpus} coeurs</p>
              <p className="text-[10px] text-zinc-600">{data.systeme.plateforme} {data.systeme.architecture}</p>
            </div>
          </div>
        </div>

        {/* Variables d'environnement */}
        <div className="p-3 rounded-lg bg-zinc-800/30">
          <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-zinc-400" /> Variables d'environnement
          </p>
          {data.environnement.manquantes.length > 0 && (
            <div className="mb-2 p-2 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-[11px] text-red-400 font-medium">Variables manquantes :</p>
              <p className="text-[11px] text-red-300 font-mono">{data.environnement.manquantes.join(', ')}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {data.environnement.requises.map((v) => (
              <div key={v.nom} className="flex items-center gap-1 text-[11px]">
                {v.present ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                <span className={v.present ? 'text-zinc-400' : 'text-red-300'}>{v.nom}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Integrite */}
        <div className="p-3 rounded-lg bg-zinc-800/30">
          <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> Verification d'integrite
          </p>
          <div className="space-y-1">
            {data.integrite.map((check) => (
              <div key={check.nom} className="flex items-start gap-2 text-[11px] p-1">
                {check.statut === 'ok' ? <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                  : check.statut === 'alerte' ? <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                  : <Info className="h-3 w-3 text-zinc-500 mt-0.5 shrink-0" />}
                <div>
                  <span className="text-zinc-300">{check.nom}</span>
                  <p className="text-[10px] text-zinc-500">{check.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function SecurityPage() {
  const queryClient = useQueryClient()
  const critiquesRef = useRef<HTMLDivElement>(null)

  const [investigatingIP, setInvestigatingIP] = useState<string | null>(null)
  const [blockingIP, setBlockingIP] = useState<string | null>(null)
  const [banningDevice, setBanningDevice] = useState<{ userAgent: string; navigateur: string; os: string; appareil: string; ips: string[] } | null>(null)
  const [critiquesOuvert, setCritiquesOuvert] = useState(false)
  const [ongletPrincipal, setOngletPrincipal] = useState<'securite' | 'backend'>('securite')
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [purgeNote, setPurgeNote] = useState('')
  const [viewingPurge, setViewingPurge] = useState<string | null>(null)

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: securityService.getDashboard,
    refetchInterval: 60000,
  })

  const blockMutation = useMutation({
    mutationFn: ({ ip, raison, duree }: { ip: string; raison: string; duree?: number }) =>
      securityService.blockIP(ip, raison, duree),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      setBlockingIP(null)
    },
  })

  const unblockMutation = useMutation({
    mutationFn: (id: string) => securityService.unblockIP(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-dashboard'] }),
  })

  const banDeviceMutation = useMutation({
    mutationFn: (params: Parameters<typeof securityService.banDevice>[0]) =>
      securityService.banDevice(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-devices'] })
      setBanningDevice(null)
    },
  })

  const unbanDeviceMutation = useMutation({
    mutationFn: (id: string) => securityService.unbanDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banned-devices'] }),
  })

  const purgeMutation = useMutation({
    mutationFn: (note?: string) => securityService.purgeSecurityData(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['banned-devices'] })
      queryClient.invalidateQueries({ queryKey: ['purge-history'] })
      setConfirmPurge(false)
      setPurgeNote('')
    },
  })

  const scrollToCritiques = useCallback(() => {
    setCritiquesOuvert(true)
    setTimeout(() => {
      critiquesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative">
            <Shield className="h-12 w-12 text-indigo-500 animate-pulse" />
            <div className="absolute inset-0 animate-ping"><Shield className="h-12 w-12 text-indigo-500 opacity-20" /></div>
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
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Reessayer</Button>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
              <Shield className="h-7 w-7 text-indigo-400" /> Centre de securite
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Surveillance temps reel, detection d'intrusion et analyse backend</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-zinc-600">Maj: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : '--'}</div>
            <Button variant="outline" size="sm" onClick={() => setConfirmPurge(true)} className="text-red-400 border-red-500/30 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5 mr-1" /> Purger</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser</Button>
          </div>
        </div>

        {/* Onglets principaux */}
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1">
          <button
            onClick={() => setOngletPrincipal('securite')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${ongletPrincipal === 'securite' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Shield className="h-4 w-4" /> Securite & Detection
          </button>
          <button
            onClick={() => setOngletPrincipal('backend')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${ongletPrincipal === 'backend' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Server className="h-4 w-4" /> Analyse backend
          </button>
        </div>

        {ongletPrincipal === 'securite' ? (
          <>
            {/* Banniere menace */}
            <BanniereMenace level={data.threatLevel} onVoirCritiques={scrollToCritiques} />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <CarteStats label="Alertes (1h)" value={data.summary.totalEvents1h} icon={Clock} color="#6366f1" detail="Alertes de securite detectees cette derniere heure" />
              <CarteStats label="Alertes (24h)" value={data.summary.totalEvents24h} icon={Activity} color="#8b5cf6" detail="Total sur les 24 dernieres heures" />
              <CarteStats label="Critiques (24h)" value={data.summary.criticalEvents24h} icon={AlertTriangle} color="#ef4444" detail="Alertes critiques necessitant une action immediate" />
              <CarteStats label="Haute sev. (24h)" value={data.summary.highEvents24h} icon={ShieldAlert} color="#f97316" detail="Alertes de haute severite a verifier" />
              <CarteStats label="Bloques (24h)" value={data.summary.blockedEvents24h} icon={ShieldX} color="#f59e0b" detail="Requetes bloquees par les defenses" />
              <CarteStats label="IPs bloquees" value={data.summary.blockedIPsActifs} icon={Ban} color="#dc2626" detail="Adresses IP actuellement bannies" />
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GraphiqueHoraire data={data.hourlyTrend} />
              <GraphiqueQuotidien data={data.dailyTrend} />
            </div>

            {/* Types + Severite + Empreinte */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RepartitionAttaques attackTypes={data.attackTypes} />
              <GraphiqueSeverite data={data.severityBreakdown} />
              <StatsEmpreinteNumerique deviceStats={data.deviceStats} recentEvents={data.recentEvents} />
            </div>

            {/* Recommandations */}
            <RecommandationsCorrections data={data} />

            {/* Alertes critiques */}
            {data.criticalEvents.length > 0 && (
              <div ref={critiquesRef}>
                <button
                  onClick={() => setCritiquesOuvert(!critiquesOuvert)}
                  className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mb-2"
                >
                  {critiquesOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <AlertOctagon className="h-4 w-4" />
                  Alertes critiques - {data.criticalEvents.length} alerte(s) sur 7 jours
                </button>
                {critiquesOuvert && (
                  <AlertesCritiques events={data.criticalEvents} onInvestigateIP={setInvestigatingIP} />
                )}
              </div>
            )}

            {/* IPs + Recidivistes + Bloquees */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TableauIPsSuspectes ips={data.topSuspiciousIPs} onInvestigate={setInvestigatingIP} onBlock={setBlockingIP} />
              <TopRecidivistes offenders={data.topOffenderIPs} onInvestigate={setInvestigatingIP} onBlock={setBlockingIP} />
              <div className="space-y-4">
                <IPsBloquees blockedIPs={data.blockedIPs} onUnblock={(id) => unblockMutation.mutate(id)} />
                <AppareilsBannis onUnban={(id) => unbanDeviceMutation.mutate(id)} />
                <CheminsAttaques paths={data.topAttackedPaths} />
              </div>
            </div>

            {/* Flux temps reel */}
            <FluxTempsReel events={data.recentEvents} onInvestigateIP={setInvestigatingIP} />

            {/* Historique des purges */}
            <HistoriquePurges onViewDetail={setViewingPurge} />
          </>
        ) : (
          <AnalyseurBackend />
        )}

        {/* Modals */}
        {investigatingIP && (
          <ModalInvestigationIP
            open={!!investigatingIP} onClose={() => setInvestigatingIP(null)} ip={investigatingIP}
            onBlock={(ip) => { setInvestigatingIP(null); setBlockingIP(ip); }}
            onBanDevice={(prefill) => { setInvestigatingIP(null); setBanningDevice(prefill); }}
          />
        )}
        {blockingIP && (
          <ModalBlocageIP
            open={!!blockingIP} onClose={() => setBlockingIP(null)} ip={blockingIP}
            onConfirm={(ip, raison, duree) => blockMutation.mutate({ ip, raison, duree })}
            isLoading={blockMutation.isPending}
          />
        )}
        {banningDevice && (
          <ModalBanDevice
            open={!!banningDevice} onClose={() => setBanningDevice(null)}
            prefill={banningDevice}
            onConfirm={(params) => banDeviceMutation.mutate(params)}
            isLoading={banDeviceMutation.isPending}
          />
        )}

        {/* Dialog purge */}
        <Dialog open={confirmPurge} onOpenChange={(open) => { setConfirmPurge(open); if (!open) setPurgeNote('') }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Trash2 className="h-5 w-5" /> Purger les donnees de securite
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-zinc-300">Les donnees seront archivees avant suppression. Vous pourrez les consulter dans l'historique des purges.</p>
              <ul className="text-sm text-zinc-400 space-y-1 ml-4 list-disc">
                <li>Tous les evenements de securite</li>
                <li>Toutes les IPs bloquees</li>
                <li>Tous les appareils bannis</li>
              </ul>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Note (optionnelle)</label>
                <Input
                  placeholder="Raison de la purge..."
                  value={purgeNote}
                  onChange={(e) => setPurgeNote(e.target.value)}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-amber-400/80 flex items-center gap-1"><Archive className="h-3 w-3" /> Les donnees seront archivees et consultables a tout moment.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmPurge(false)}>Annuler</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => purgeMutation.mutate(purgeNote || undefined)} disabled={purgeMutation.isPending}>
                {purgeMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Archivage et purge...</> : <><Trash2 className="h-3.5 w-3.5 mr-1" /> Archiver et purger</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal detail purge */}
        {viewingPurge && (
          <ModalDetailPurge open={!!viewingPurge} onClose={() => setViewingPurge(null)} purgeId={viewingPurge} />
        )}
      </div>
    </PageTransition>
  )
}
