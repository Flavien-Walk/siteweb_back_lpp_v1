import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { marketplaceService, type LitigeListParams } from '@/services/marketplace'
import { PageTransition } from '@/components/PageTransition'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Gavel,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  User,
} from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import type { MarketplaceOrderAdmin } from '@/types'

function formatEUR(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ============ RESOLUTION DIALOG ============

function ResolutionDialog({
  litige,
  open,
  onClose,
}: {
  litige: MarketplaceOrderAdmin | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<'reprendre' | 'annuler'>('reprendre')

  const mutation = useMutation({
    mutationFn: () => marketplaceService.resoudreLitige(litige!._id, resolution, action),
    onSuccess: () => {
      toast.success(`Litige resolu : commande ${action === 'reprendre' ? 'reprise' : 'annulee'}`)
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-litiges'] })
      setResolution('')
      setAction('reprendre')
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la resolution')
    },
  })

  const canResolve = user?.permissions?.includes('marketplace:manage_disputes')

  if (!litige) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-red-400" /> Litige — {litige.serviceSnapshot?.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                <User className="h-3 w-3" /> Acheteur
              </p>
              <p className="text-sm text-zinc-200">{litige.acheteur?.prenom} {litige.acheteur?.nom}</p>
              <p className="text-xs text-zinc-500">{litige.acheteur?.email}</p>
            </div>
            <div className="p-3 rounded bg-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                <User className="h-3 w-3" /> Vendeur
              </p>
              <p className="text-sm text-zinc-200">{litige.vendeur?.prenom} {litige.vendeur?.nom}</p>
              <p className="text-xs text-zinc-500">{litige.vendeur?.email}</p>
            </div>
          </div>

          {/* Montant */}
          <div className="p-3 rounded bg-zinc-800/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Montant total</span>
            <span className="text-sm font-bold text-zinc-200">{formatEUR(litige.montantTotal)}</span>
          </div>

          {/* Raison du litige */}
          {litige.litigeInfo && (
            <div className="p-4 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Raison du litige
              </p>
              <p className="text-sm text-zinc-200">{litige.litigeInfo.raison}</p>
              <p className="text-xs text-zinc-500 mt-2">
                Ouvert le {formatDate(litige.litigeInfo.dateOuverture)}
              </p>
            </div>
          )}

          {/* Timeline */}
          {litige.historique && litige.historique.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Historique de la commande</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {litige.historique.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-zinc-800/30">
                    <Badge variant="outline" className="text-[10px] shrink-0">{h.de} → {h.vers}</Badge>
                    <span className="text-zinc-500">{formatDate(h.date)}</span>
                    {h.commentaire && <span className="text-zinc-400 ml-auto line-clamp-1 max-w-xs">{h.commentaire}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution form */}
          {canResolve && litige.statut === 'litige' && (
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-sm font-medium text-zinc-200">Resoudre le litige</p>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Resolution (min 10 caracteres)</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Expliquez la resolution du litige..."
                  className="w-full h-24 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-2">Action</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAction('reprendre')}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      action === 'reprendre'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                    Reprendre le travail
                  </button>
                  <button
                    onClick={() => setAction('annuler')}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      action === 'annuler'
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <XCircle className="h-5 w-5 mx-auto mb-1" />
                    Annuler la commande
                  </button>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={resolution.length < 10 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Resolution en cours...' : 'Confirmer la resolution'}
              </Button>
            </div>
          )}

          {litige.statut !== 'litige' && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-sm text-emerald-400">Ce litige a deja ete resolu</p>
              <p className="text-xs text-zinc-500 mt-1">Statut actuel : {litige.statut}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ PAGE PRINCIPALE ============

export default function LitigesPage() {
  const [page, setPage] = useState(1)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [selectedLitige, setSelectedLitige] = useState<MarketplaceOrderAdmin | null>(null)

  const params: LitigeListParams = { page, limit: 20 }
  if (includeResolved) params.includeResolved = 'true'

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-marketplace-litiges', params],
    queryFn: () => marketplaceService.getLitiges(params),
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Gavel className="h-6 w-6 text-red-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Litiges</h1>
          {data && (
            <Badge variant="destructive" className="ml-2">
              {data.totalCount} litige(s)
            </Badge>
          )}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3">
          <Button
            variant={includeResolved ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setIncludeResolved(!includeResolved); setPage(1) }}
          >
            {includeResolved ? 'Tous (y compris resolus)' : 'Actifs uniquement'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Acheteur</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">Chargement...</TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    {includeResolved ? 'Aucun litige trouve' : 'Aucun litige actif'}
                  </TableCell>
                </TableRow>
              ) : data.items.map((l) => (
                <TableRow key={l._id} className="cursor-pointer hover:bg-zinc-800/50" onClick={() => setSelectedLitige(l)}>
                  <TableCell>
                    <span className="text-sm text-zinc-200 line-clamp-1">{l.serviceSnapshot?.nom || l.service?.nom || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {l.acheteur?.avatar && <img src={l.acheteur.avatar} alt="" className="h-5 w-5 rounded-full" />}
                      <span className="text-xs text-zinc-300">{l.acheteur?.prenom} {l.acheteur?.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {l.vendeur?.avatar && <img src={l.vendeur.avatar} alt="" className="h-5 w-5 rounded-full" />}
                      <span className="text-xs text-zinc-300">{l.vendeur?.prenom} {l.vendeur?.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-medium text-zinc-200">{formatEUR(l.montantTotal)}</span></TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-400 line-clamp-1 max-w-[200px]">
                      {l.litigeInfo?.raison || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {l.litigeInfo?.dateOuverture ? formatRelativeTime(l.litigeInfo.dateOuverture) : formatRelativeTime(l.dateMiseAJour)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {l.statut === 'litige' ? (
                      <Badge variant="destructive">En litige</Badge>
                    ) : (
                      <Badge variant="secondary">{l.statut}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Page {data.currentPage} / {data.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!data.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Resolution Dialog */}
        <ResolutionDialog
          litige={selectedLitige}
          open={!!selectedLitige}
          onClose={() => setSelectedLitige(null)}
        />
      </div>
    </PageTransition>
  )
}
