import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { marketplaceService, type LitigeListParams } from '@/services/marketplace'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Gavel,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Send,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import type { MarketplaceOrderAdmin, MediationMessage, MediationCanal } from '@/types'

function formatEUR(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ============ SIDEBAR ============

function LitigeSidebar({
  litiges,
  selected,
  onSelect,
  isLoading,
  includeResolved,
  onToggleResolved,
  onRefresh,
  totalCount,
}: {
  litiges: MarketplaceOrderAdmin[]
  selected: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  includeResolved: boolean
  onToggleResolved: () => void
  onRefresh: () => void
  totalCount: number
}) {
  return (
    <div className="w-[280px] shrink-0 flex flex-col border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">{totalCount} litige(s)</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRefresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <Button
          variant={includeResolved ? 'default' : 'outline'}
          size="sm"
          className="w-full text-xs h-7"
          onClick={onToggleResolved}
        >
          {includeResolved ? 'Tous' : 'Actifs uniquement'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-zinc-500">Chargement...</div>
        ) : litiges.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500">Aucun litige</div>
        ) : (
          litiges.map((l) => (
            <button
              key={l._id}
              onClick={() => onSelect(l._id)}
              className={`w-full text-left p-3 border-b border-zinc-800/50 transition-colors ${
                selected === l._id
                  ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                  : 'hover:bg-zinc-800/30'
              }`}
            >
              <p className="text-xs font-medium text-zinc-200 line-clamp-1">
                {l.serviceSnapshot?.nom || '—'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-zinc-500">{l.acheteur?.prenom}</span>
                <span className="text-[10px] text-zinc-600">vs</span>
                <span className="text-[10px] text-zinc-500">{l.vendeur?.prenom}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-zinc-500">
                  {formatEUR(l.montantTotal)}
                </span>
                {l.statut === 'litige' ? (
                  l.litigeInfo?.moderateur ? (
                    <Badge variant="default" className="text-[9px] h-4 px-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">En cours</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1">Non attribue</Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{l.statut}</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {l.litigeInfo?.dateOuverture
                  ? formatRelativeTime(l.litigeInfo.dateOuverture)
                  : formatRelativeTime(l.dateMiseAJour)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ============ MEDIATION HEADER ============

function MediationHeader({ litige }: { litige: MarketplaceOrderAdmin }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-bold text-zinc-100 line-clamp-1">
          {litige.serviceSnapshot?.nom || '—'}
        </h2>
        {litige.statut === 'litige' ? (
          <Badge variant="destructive" className="text-[10px]">En litige</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">{litige.statut}</Badge>
        )}
        <span className="text-xs text-zinc-500 ml-auto">{formatEUR(litige.montantTotal)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-zinc-800/50">
          <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
            <User className="h-2.5 w-2.5" /> Acheteur
          </p>
          <p className="text-xs text-zinc-200">{litige.acheteur?.prenom} {litige.acheteur?.nom}</p>
          <p className="text-[10px] text-zinc-500">{litige.acheteur?.email}</p>
        </div>
        <div className="p-2 rounded bg-zinc-800/50">
          <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
            <User className="h-2.5 w-2.5" /> Vendeur
          </p>
          <p className="text-xs text-zinc-200">{litige.vendeur?.prenom} {litige.vendeur?.nom}</p>
          <p className="text-[10px] text-zinc-500">{litige.vendeur?.email}</p>
        </div>
      </div>

      {litige.litigeInfo && (
        <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] font-medium text-red-400 mb-0.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Raison du litige
          </p>
          <p className="text-xs text-zinc-200">{litige.litigeInfo.raison}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Ouvert le {formatDate(litige.litigeInfo.dateOuverture)}
          </p>
        </div>
      )}

      {/* Statut prise en charge */}
      {litige.litigeInfo && (
        <div className={`p-2.5 rounded border ${
          litige.litigeInfo.moderateur
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {litige.litigeInfo.moderateur ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-medium">
                  Pris en charge par {litige.litigeInfo.moderateur.prenom} {litige.litigeInfo.moderateur.nom}
                </span>
                {litige.litigeInfo.datePriseEnCharge && (
                  <span className="text-[10px] text-zinc-500 ml-auto">
                    {formatRelativeTime(litige.litigeInfo.datePriseEnCharge)}
                  </span>
                )}
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium">
                  En attente de prise en charge
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ CHAT PANEL ============

function MediationChatPanel({
  canal,
  partyName,
  messages,
  onSend,
  isSending,
  canSend,
}: {
  canal: 'acheteur' | 'vendeur'
  partyName: string
  messages: MediationMessage[]
  onSend: (contenu: string) => void
  isSending: boolean
  canSend: boolean
}) {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
  }

  return (
    <Card className="flex flex-col h-full bg-zinc-900/50 border-zinc-800">
      <CardHeader className="py-2 px-3 border-b border-zinc-800">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3 text-zinc-400" />
          <span className="text-zinc-300">Canal {canal === 'acheteur' ? 'Acheteur' : 'Vendeur'}</span>
          <span className="text-zinc-500">— {partyName}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ minHeight: '200px', maxHeight: '350px' }}>
        {messages.length === 0 ? (
          <p className="text-center text-[10px] text-zinc-600 py-8">
            Aucun message. Commencez la mediation.
          </p>
        ) : (
          messages.map((msg) => {
            const isModerator = msg.auteurRole === 'moderateur'
            return (
              <div key={msg._id} className={`flex ${isModerator ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-2 ${
                  isModerator
                    ? 'bg-indigo-500/15 border border-indigo-500/20'
                    : 'bg-zinc-800/50 border border-zinc-700/50'
                }`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {msg.auteur?.avatar ? (
                      <img src={msg.auteur.avatar} alt="" className="h-3.5 w-3.5 rounded-full" />
                    ) : (
                      <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-bold ${
                        isModerator ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {msg.auteur?.prenom?.[0]}
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-zinc-300">
                      {msg.auteur?.prenom} {msg.auteur?.nom}
                    </span>
                    {isModerator && (
                      <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 text-indigo-400 border-indigo-500/30">
                        Modo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-200 whitespace-pre-wrap">{msg.contenu}</p>
                  <p className="text-[9px] text-zinc-600 mt-0.5">
                    {new Date(msg.dateCreation).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {canSend && (
        <div className="border-t border-zinc-800 p-2">
          <form onSubmit={handleSend} className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder={`Message a ${partyName}...`}
              rows={1}
              className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || isSending}
              className="self-end h-7 px-2"
            >
              <Send className="h-3 w-3" />
            </Button>
          </form>
        </div>
      )}
    </Card>
  )
}

// ============ RESOLUTION SECTION ============

function ResolutionSection({
  litige,
  canResolve,
  onResolve,
  isPending,
}: {
  litige: MarketplaceOrderAdmin
  canResolve: boolean
  onResolve: (resolution: string, action: 'reprendre' | 'annuler') => void
  isPending: boolean
}) {
  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<'reprendre' | 'annuler'>('reprendre')

  if (litige.statut !== 'litige') {
    return (
      <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
        <p className="text-xs text-emerald-400">Ce litige a deja ete resolu</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">Statut actuel : {litige.statut}</p>
      </div>
    )
  }

  if (!canResolve) return null

  return (
    <div className="border-t border-zinc-800 pt-3 space-y-2.5">
      <p className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
        <Gavel className="h-3.5 w-3.5 text-red-400" /> Resoudre le litige
      </p>

      <div>
        <label className="text-[10px] text-zinc-400 block mb-1">Resolution (min 10 caracteres)</label>
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Expliquez la resolution du litige..."
          className="w-full h-16 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setAction('reprendre')}
          className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
            action === 'reprendre'
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
              : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 mx-auto mb-0.5" />
          Reprendre
        </button>
        <button
          onClick={() => setAction('annuler')}
          className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
            action === 'annuler'
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          <XCircle className="h-4 w-4 mx-auto mb-0.5" />
          Annuler
        </button>
      </div>

      <Button
        className="w-full h-8 text-xs"
        disabled={resolution.length < 10 || isPending}
        onClick={() => {
          onResolve(resolution, action)
          setResolution('')
          setAction('reprendre')
        }}
      >
        {isPending ? 'Resolution en cours...' : 'Confirmer la resolution'}
      </Button>
    </div>
  )
}

// ============ PAGE PRINCIPALE ============

export default function LitigesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [selectedLitigeId, setSelectedLitigeId] = useState<string | null>(null)

  const canManageDisputes = user?.permissions?.includes('marketplace:manage_disputes')

  const params: LitigeListParams = { page, limit: 50 }
  if (includeResolved) params.includeResolved = 'true'

  const { data: litigesData, isLoading: litigesLoading, refetch: refetchLitiges } = useQuery({
    queryKey: ['admin-marketplace-litiges', params],
    queryFn: () => marketplaceService.getLitiges(params),
  })

  const selectedLitige = litigesData?.items.find((l) => l._id === selectedLitigeId) || null

  const { data: mediationData, refetch: refetchMediation } = useQuery({
    queryKey: ['admin-mediation', selectedLitigeId],
    queryFn: () => marketplaceService.getMediationMessages(selectedLitigeId!),
    enabled: !!selectedLitigeId,
    refetchInterval: 15000,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ canal, contenu }: { canal: MediationCanal; contenu: string }) =>
      marketplaceService.sendMediationMessage(selectedLitigeId!, canal, contenu),
    onSuccess: () => {
      refetchMediation()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur envoi message')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: ({ resolution, action }: { resolution: string; action: 'reprendre' | 'annuler' }) =>
      marketplaceService.resoudreLitige(selectedLitigeId!, resolution, action),
    onSuccess: () => {
      toast.success('Litige resolu')
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-litiges'] })
      queryClient.invalidateQueries({ queryKey: ['admin-mediation', selectedLitigeId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur resolution')
    },
  })

  const priseEnChargeMutation = useMutation({
    mutationFn: () => marketplaceService.prendreEnCharge(selectedLitigeId!),
    onSuccess: () => {
      toast.success('Litige pris en charge')
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-litiges'] })
      queryClient.invalidateQueries({ queryKey: ['admin-mediation', selectedLitigeId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur prise en charge')
    },
  })

  const acheteurName = mediationData?.acheteur
    ? `${mediationData.acheteur.prenom} ${mediationData.acheteur.nom}`
    : selectedLitige
      ? `${selectedLitige.acheteur?.prenom || ''} ${selectedLitige.acheteur?.nom || ''}`
      : ''

  const vendeurName = mediationData?.vendeur
    ? `${mediationData.vendeur.prenom} ${mediationData.vendeur.nom}`
    : selectedLitige
      ? `${selectedLitige.vendeur?.prenom || ''} ${selectedLitige.vendeur?.nom || ''}`
      : ''

  return (
    <PageTransition>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Gavel className="h-5 w-5 text-red-400" />
          <h1 className="text-lg font-bold text-zinc-100">Litiges — Mediation</h1>
          {litigesData && (
            <Badge variant="destructive" className="text-[10px]">
              {litigesData.totalCount}
            </Badge>
          )}
        </div>

        {/* Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <LitigeSidebar
            litiges={litigesData?.items || []}
            selected={selectedLitigeId}
            onSelect={setSelectedLitigeId}
            isLoading={litigesLoading}
            includeResolved={includeResolved}
            onToggleResolved={() => { setIncludeResolved(!includeResolved); setPage(1) }}
            onRefresh={() => refetchLitiges()}
            totalCount={litigesData?.totalCount || 0}
          />

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedLitigeId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Gavel className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Selectionnez un litige dans la liste</p>
                </div>
              </div>
            ) : selectedLitige ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Litige info */}
                <MediationHeader litige={selectedLitige} />

                {/* Bouton prise en charge */}
                {canManageDisputes && selectedLitige.statut === 'litige' && !selectedLitige.litigeInfo?.moderateur && (
                  <Button
                    onClick={() => priseEnChargeMutation.mutate()}
                    disabled={priseEnChargeMutation.isPending}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {priseEnChargeMutation.isPending ? 'Prise en charge...' : 'Prendre en charge ce litige'}
                  </Button>
                )}

                {/* Chat panels */}
                <div className="grid grid-cols-2 gap-3">
                  <MediationChatPanel
                    canal="acheteur"
                    partyName={acheteurName}
                    messages={mediationData?.messagesAcheteur || []}
                    onSend={(contenu) => sendMessageMutation.mutate({ canal: 'acheteur', contenu })}
                    isSending={sendMessageMutation.isPending}
                    canSend={!!canManageDisputes && selectedLitige.statut === 'litige' && !!selectedLitige.litigeInfo?.moderateur}
                  />
                  <MediationChatPanel
                    canal="vendeur"
                    partyName={vendeurName}
                    messages={mediationData?.messagesVendeur || []}
                    onSend={(contenu) => sendMessageMutation.mutate({ canal: 'vendeur', contenu })}
                    isSending={sendMessageMutation.isPending}
                    canSend={!!canManageDisputes && selectedLitige.statut === 'litige' && !!selectedLitige.litigeInfo?.moderateur}
                  />
                </div>

                {/* Resolution */}
                <ResolutionSection
                  litige={selectedLitige}
                  canResolve={!!canManageDisputes}
                  onResolve={(resolution, action) => resolveMutation.mutate({ resolution, action })}
                  isPending={resolveMutation.isPending}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
