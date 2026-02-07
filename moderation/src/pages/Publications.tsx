import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { publicationsService, type PublicationListParams } from '@/services/publications'
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
    },
  })

  const unhideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      publicationsService.unhidePublication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      publicationsService.deletePublication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
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

  const handleAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'hide') {
      hideMutation.mutate({ id: confirmAction.pubId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'unhide') {
      unhideMutation.mutate({ id: confirmAction.pubId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'delete') {
      deleteMutation.mutate({ id: confirmAction.pubId, reason: confirmAction.reason })
    }
  }

  return (
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
                  <TableRow key={pub._id}>
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {confirmAction.type === 'hide' && 'Masquer la publication'}
                {confirmAction.type === 'unhide' && 'Réafficher la publication'}
                {confirmAction.type === 'delete' && 'Supprimer la publication'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmAction.type === 'delete' && "Cette action est irréversible."}
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Raison {confirmAction.type !== 'unhide' && '*'}
                  </label>
                  <Input
                    placeholder="Entrez une raison..."
                    value={confirmAction.reason}
                    onChange={(e) => setConfirmAction({ ...confirmAction, reason: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmAction(null)}>Annuler</Button>
                  <Button
                    variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                    onClick={handleAction}
                    disabled={
                      (confirmAction.type !== 'unhide' && confirmAction.reason.length < 5) ||
                      hideMutation.isPending || unhideMutation.isPending || deleteMutation.isPending
                    }
                  >
                    {confirmAction.type === 'hide' && 'Masquer'}
                    {confirmAction.type === 'unhide' && 'Réafficher'}
                    {confirmAction.type === 'delete' && 'Supprimer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
