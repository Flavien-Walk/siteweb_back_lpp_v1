import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { publicationsService, type PublicationListParams } from '@/services/publications'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  Image,
  Video,
  MessageCircle,
  Heart,
  CheckSquare,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

const typeLabels: Record<string, string> = {
  post: 'Post',
  annonce: 'Annonce',
  update: 'Update',
  editorial: 'Éditorial',
  'live-extrait': 'Extrait Live',
}

export function PublicationsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    pubId: string
    reason: string
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<{ type: 'bulk-hide' | 'bulk-delete'; reason: string } | null>(null)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data?.items) return
    if (selectedIds.size === data.items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(data.items.map(p => p._id)))
  }

  const params: PublicationListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    type: searchParams.get('type') || undefined,
    status: (searchParams.get('status') as 'hidden' | 'visible') || undefined,
    search: searchParams.get('search') || undefined,
    auteurId: searchParams.get('auteurId') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publications', params],
    queryFn: () => publicationsService.getPublications(params),
  })

  const hideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      publicationsService.hidePublication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication masquée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du masquage de la publication', { description: error.message })
    },
  })

  const unhideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      publicationsService.unhidePublication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication réactivée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la réactivation de la publication', { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      publicationsService.deletePublication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication supprimée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression de la publication', { description: error.message })
    },
  })

  const bulkHideMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      for (const id of ids) {
        await publicationsService.hidePublication(id, reason)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setBulkAction(null)
      setSelectedIds(new Set())
      toast.success(`${selectedIds.size} publication(s) masquée(s)`)
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      toast.error('Erreur lors du masquage en lot', { description: error.message })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      for (const id of ids) {
        await publicationsService.deletePublication(id, reason)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setBulkAction(null)
      setSelectedIds(new Set())
      toast.success(`${selectedIds.size} publication(s) supprimée(s)`)
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      toast.error('Erreur lors de la suppression en lot', { description: error.message })
    },
  })

  const updateParams = (updates: Partial<PublicationListParams>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    if (!('page' in updates)) newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const clearFilters = () => setSearchParams({ page: '1', limit: '20' })

  const hasActiveFilters = params.type || params.status || params.search || params.auteurId || params.dateFrom || params.dateTo

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Publications
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} publication(s) au total
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Effacer
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <Select
                  value={params.type || ''}
                  onChange={(e) => updateParams({ type: e.target.value || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: (e.target.value as 'hidden' | 'visible') || undefined })}
                >
                  <option value="">Toutes</option>
                  <option value="visible">Visibles</option>
                  <option value="hidden">Masquées</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Recherche</label>
                <Input
                  placeholder="Rechercher dans le contenu..."
                  value={params.search || ''}
                  onChange={(e) => updateParams({ search: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date début</label>
                <Input
                  type="date"
                  value={params.dateFrom || ''}
                  onChange={(e) => updateParams({ dateFrom: e.target.value || undefined })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Erreur lors du chargement</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>Réessayer</Button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p>Aucune publication trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={data?.items?.length ? selectedIds.size === data.items.length : false}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead>Médias</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((pub) => (
                  <TableRow key={pub._id} className={selectedIds.has(pub._id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(pub._id)}
                        onChange={() => toggleSelect(pub._id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/users/${pub.auteur._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {pub.auteur.avatar ? (
                          <img src={pub.auteur.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {pub.auteur.prenom?.[0]}{pub.auteur.nom?.[0]}
                          </div>
                        )}
                        <span className="font-medium text-sm">
                          {pub.auteur.prenom} {pub.auteur.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[pub.type] || pub.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/publications/${pub._id}`} className="hover:underline">
                        <p className="text-sm max-w-[200px] truncate">
                          {pub.contenu || '(vide)'}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {pub.medias && pub.medias.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {pub.medias.some(m => m.type === 'image') && <Image className="h-4 w-4" />}
                          {pub.medias.some(m => m.type === 'video') && <Video className="h-4 w-4" />}
                          <span className="text-xs text-muted-foreground">{pub.medias.length}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" />
                          {pub.likesCount ?? pub.likes?.length ?? 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" />
                          {pub.nbCommentaires ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pub.isHidden ? (
                        <Badge variant="destructive">
                          <EyeOff className="mr-1 h-3 w-3" />
                          Masquée
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Eye className="mr-1 h-3 w-3" />
                          Visible
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(pub.dateCreation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/publications/${pub._id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {pub.isHidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmAction({ type: 'unhide', pubId: pub._id, reason: '' })}
                          >
                            <Eye className="h-4 w-4 text-green-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmAction({ type: 'hide', pubId: pub._id, reason: '' })}
                          >
                            <EyeOff className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'delete', pubId: pub._id, reason: '' })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.currentPage} sur {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!data.hasPrevPage} onClick={() => updateParams({ page: data.currentPage - 1 })}>
              <ChevronLeft className="mr-1 h-4 w-4" />Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => updateParams({ page: data.currentPage + 1 })}>
              Suivant<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-2xl">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} sélectionnée(s)</span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => setBulkAction({ type: 'bulk-hide', reason: '' })}>
            <EyeOff className="mr-1 h-3.5 w-3.5" /> Masquer
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkAction({ type: 'bulk-delete', reason: '' })}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Single action confirm */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === 'hide' ? 'Masquer la publication' :
          confirmAction?.type === 'unhide' ? 'Réafficher la publication' :
          'Supprimer la publication'
        }
        description={confirmAction?.type === 'delete' ? 'Cette action est irréversible.' : undefined}
        variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
        confirmLabel={
          confirmAction?.type === 'hide' ? 'Masquer' :
          confirmAction?.type === 'unhide' ? 'Réafficher' :
          'Supprimer'
        }
        requireReason={confirmAction?.type !== 'unhide'}
        reasonPlaceholder="Entrez une raison..."
        isLoading={hideMutation.isPending || unhideMutation.isPending || deleteMutation.isPending}
        onConfirm={(reason) => {
          if (!confirmAction) return
          if (confirmAction.type === 'hide') hideMutation.mutate({ id: confirmAction.pubId, reason })
          else if (confirmAction.type === 'unhide') unhideMutation.mutate({ id: confirmAction.pubId, reason })
          else if (confirmAction.type === 'delete') deleteMutation.mutate({ id: confirmAction.pubId, reason })
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Bulk action confirm */}
      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction?.type === 'bulk-hide' ? `Masquer ${selectedIds.size} publication(s)` : `Supprimer ${selectedIds.size} publication(s)`}
        description={bulkAction?.type === 'bulk-delete' ? 'Cette action est irréversible pour toutes les publications sélectionnées.' : `${selectedIds.size} publication(s) seront masquées.`}
        variant={bulkAction?.type === 'bulk-delete' ? 'destructive' : 'warning'}
        confirmLabel={bulkAction?.type === 'bulk-hide' ? 'Masquer tout' : 'Supprimer tout'}
        requireReason
        reasonPlaceholder="Raison commune pour toutes les publications..."
        isLoading={bulkHideMutation.isPending || bulkDeleteMutation.isPending}
        onConfirm={(reason) => {
          if (!bulkAction) return
          const ids = Array.from(selectedIds)
          if (bulkAction.type === 'bulk-hide') bulkHideMutation.mutate({ ids, reason })
          else bulkDeleteMutation.mutate({ ids, reason })
        }}
        onCancel={() => setBulkAction(null)}
      />
    </div>
    </PageTransition>
  )
}

export default PublicationsPage
