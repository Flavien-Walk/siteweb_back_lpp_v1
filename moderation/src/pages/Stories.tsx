import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { storiesService, type StoryListParams } from '@/services/stories'
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
import {
  Camera,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  X,
  MapPin,
  Clock,
  Video,
  Image,
  AlertTriangle,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

type StoryStatus = 'all' | 'active' | 'hidden' | 'expired'

const statusLabels: Record<StoryStatus, string> = {
  all: 'Toutes',
  active: 'Actives',
  hidden: 'Masquées',
  expired: 'Expirées',
}

function StoryStatusBadge({ isHidden, isExpired }: { isHidden: boolean; isExpired: boolean }) {
  if (isHidden) {
    return (
      <Badge variant="destructive">
        <EyeOff className="mr-1 h-3 w-3" />
        Masquée
      </Badge>
    )
  }
  if (isExpired) {
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" />
        Expirée
      </Badge>
    )
  }
  return (
    <Badge variant="success">
      <Eye className="mr-1 h-3 w-3" />
      Active
    </Badge>
  )
}

export function StoriesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    storyId: string
    reason: string
  } | null>(null)

  // Get params from URL
  const params: StoryListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    status: (searchParams.get('status') as StoryStatus) || undefined,
    userId: searchParams.get('userId') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }

  // Fetch stories
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stories', params],
    queryFn: () => storiesService.getStories(params),
  })

  // Hide mutation
  const hideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      storiesService.hideStory(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      setConfirmAction(null)
      toast.success('Story masquée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du masquage de la story', { description: error.message })
    },
  })

  // Unhide mutation
  const unhideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      storiesService.unhideStory(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      setConfirmAction(null)
      toast.success('Story réactivée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la réactivation de la story', { description: error.message })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      storiesService.deleteStory(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      setConfirmAction(null)
      toast.success('Story supprimée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression de la story', { description: error.message })
    },
  })

  // Update URL params
  const updateParams = (updates: Partial<StoryListParams>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    if (!('page' in updates)) {
      newParams.set('page', '1')
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({ page: '1', limit: '20' })
  }

  const hasActiveFilters = params.status || params.userId || params.dateFrom || params.dateTo

  const handleAction = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'hide') {
      hideMutation.mutate({ id: confirmAction.storyId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'unhide') {
      unhideMutation.mutate({ id: confirmAction.storyId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'delete') {
      deleteMutation.mutate({ id: confirmAction.storyId, reason: confirmAction.reason })
    }
  }

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Stories
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} story(ies) au total
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: e.target.value as StoryStatus || undefined })}
                >
                  <option value="">Toutes</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ID Utilisateur</label>
                <Input
                  placeholder="ID de l'utilisateur"
                  value={params.userId || ''}
                  onChange={(e) => updateParams({ userId: e.target.value || undefined })}
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
              <div>
                <label className="mb-1 block text-sm font-medium">Date fin</label>
                <Input
                  type="date"
                  value={params.dateTo || ''}
                  onChange={(e) => updateParams({ dateTo: e.target.value || undefined })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stories Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Erreur lors du chargement des stories</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Camera className="h-8 w-8 mb-2" />
              <p>Aucune story trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Vues</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((story) => (
                  <TableRow key={story._id}>
                    <TableCell>
                      <Link to={`/stories/${story._id}`}>
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                          {story.type === 'video' ? (
                            <div className="flex items-center justify-center h-full">
                              <Video className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={story.thumbnailUrl || story.mediaUrl}
                              alt="Story preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/users/${story.utilisateur._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {story.utilisateur.avatar ? (
                          <img
                            src={story.utilisateur.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {story.utilisateur.prenom[0]}
                            {story.utilisateur.nom[0]}
                          </div>
                        )}
                        <span className="font-medium">
                          {story.utilisateur.prenom} {story.utilisateur.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {story.type === 'video' ? (
                          <Video className="mr-1 h-3 w-3" />
                        ) : (
                          <Image className="mr-1 h-3 w-3" />
                        )}
                        {story.type === 'video' ? 'Vidéo' : 'Photo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {story.durationSec}s
                      </span>
                    </TableCell>
                    <TableCell>
                      {story.location?.label ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {story.location.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{story.viewersCount}</span>
                    </TableCell>
                    <TableCell>
                      <StoryStatusBadge
                        isHidden={story.isHidden}
                        isExpired={story.isExpired || false}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(story.dateCreation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/stories/${story._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {story.isHidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                type: 'unhide',
                                storyId: story._id,
                                reason: '',
                              })
                            }
                            disabled={unhideMutation.isPending}
                          >
                            <Eye className="h-4 w-4 text-green-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                type: 'hide',
                                storyId: story._id,
                                reason: '',
                              })
                            }
                            disabled={hideMutation.isPending}
                          >
                            <EyeOff className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              type: 'delete',
                              storyId: story._id,
                              reason: '',
                            })
                          }
                          disabled={deleteMutation.isPending}
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
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasPrevPage}
              onClick={() => updateParams({ page: data.currentPage - 1 })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasNextPage}
              onClick={() => updateParams({ page: data.currentPage + 1 })}
            >
              Suivant
              <ChevronRight className="ml-1 h-4 w-4" />
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
                {confirmAction.type === 'hide' && 'Masquer la story'}
                {confirmAction.type === 'unhide' && 'Réafficher la story'}
                {confirmAction.type === 'delete' && 'Supprimer la story'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmAction.type === 'hide' &&
                    "La story sera masquée et ne sera plus visible par les utilisateurs."}
                  {confirmAction.type === 'unhide' &&
                    "La story sera de nouveau visible par les utilisateurs."}
                  {confirmAction.type === 'delete' &&
                    "Cette action est irréversible. La story sera définitivement supprimée."}
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Raison {confirmAction.type !== 'unhide' && '*'}
                  </label>
                  <Input
                    placeholder="Entrez une raison..."
                    value={confirmAction.reason}
                    onChange={(e) =>
                      setConfirmAction({ ...confirmAction, reason: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmAction(null)}>
                    Annuler
                  </Button>
                  <Button
                    variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                    onClick={handleAction}
                    disabled={
                      (confirmAction.type !== 'unhide' && confirmAction.reason.length < 5) ||
                      hideMutation.isPending ||
                      unhideMutation.isPending ||
                      deleteMutation.isPending
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
    </PageTransition>
  )
}

export default StoriesPage
