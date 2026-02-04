import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storiesService, FILTER_LABELS } from '@/services/stories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  MapPin,
  Clock,
  Video,
  Image,
  Calendar,
  Timer,
  Palette,
  AlertTriangle,
  History,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function StoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    reason: string
  } | null>(null)

  // Fetch story details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['story', id],
    queryFn: () => storiesService.getStory(id!),
    enabled: !!id,
  })

  // Mutations
  const hideMutation = useMutation({
    mutationFn: (reason: string) => storiesService.hideStory(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', id] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      setConfirmAction(null)
    },
  })

  const unhideMutation = useMutation({
    mutationFn: (reason?: string) => storiesService.unhideStory(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', id] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      setConfirmAction(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => storiesService.deleteStory(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      navigate('/stories')
    },
  })

  const handleAction = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'hide') {
      hideMutation.mutate(confirmAction.reason)
    } else if (confirmAction.type === 'unhide') {
      unhideMutation.mutate(confirmAction.reason)
    } else if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.reason)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg mb-4">Story non trouvée</p>
        <Button variant="outline" onClick={() => navigate('/stories')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux stories
        </Button>
      </div>
    )
  }

  const { story, auditHistory } = data
  const isExpired = new Date(story.dateExpiration) <= new Date()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/stories')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Détail de la story</h1>
            <p className="text-muted-foreground text-sm">
              ID: {story._id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Media Preview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {story.type === 'video' ? (
                <Video className="h-5 w-5" />
              ) : (
                <Image className="h-5 w-5" />
              )}
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] rounded-lg overflow-hidden bg-muted">
              {story.type === 'video' ? (
                <video
                  src={story.mediaUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={story.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Story Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informations</CardTitle>
              <div className="flex items-center gap-2">
                {story.isHidden ? (
                  <Badge variant="destructive">
                    <EyeOff className="mr-1 h-3 w-3" />
                    Masquée
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    Expirée
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <Eye className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Author */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Link to={`/users/${story.utilisateur._id}`}>
                {story.utilisateur.avatar ? (
                  <img
                    src={story.utilisateur.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                    {story.utilisateur.prenom[0]}
                    {story.utilisateur.nom[0]}
                  </div>
                )}
              </Link>
              <div>
                <Link
                  to={`/users/${story.utilisateur._id}`}
                  className="font-semibold hover:underline"
                >
                  {story.utilisateur.prenom} {story.utilisateur.nom}
                </Link>
                {story.utilisateur.email && (
                  <p className="text-sm text-muted-foreground">{story.utilisateur.email}</p>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {story.type === 'video' ? (
                    <Video className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Image className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{story.type === 'video' ? 'Vidéo' : 'Photo'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Timer className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durée</p>
                  <p className="font-medium">{story.durationSec} secondes</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vues</p>
                  <p className="font-medium">{story.viewersCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filtre</p>
                  <p className="font-medium">
                    {FILTER_LABELS[story.filterPreset || 'normal']}
                  </p>
                </div>
              </div>

              {story.location?.label && (
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Localisation</p>
                    <p className="font-medium">{story.location.label}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créée</p>
                  <p className="font-medium">{formatRelativeTime(story.dateCreation)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(story.dateCreation).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiration</p>
                  <p className="font-medium">
                    {isExpired ? 'Expirée' : formatRelativeTime(story.dateExpiration)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(story.dateExpiration).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden info */}
            {story.isHidden && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Story masquée
                </h4>
                {story.hiddenReason && (
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Raison:</span> {story.hiddenReason}
                  </p>
                )}
                {story.hiddenBy && (
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Par:</span>{' '}
                    {story.hiddenBy.prenom} {story.hiddenBy.nom}
                  </p>
                )}
                {story.hiddenAt && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Le:</span>{' '}
                    {new Date(story.hiddenAt).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {story.isHidden ? (
                <Button
                  onClick={() => setConfirmAction({ type: 'unhide', reason: '' })}
                  disabled={unhideMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Réafficher
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAction({ type: 'hide', reason: '' })}
                  disabled={hideMutation.isPending}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Masquer
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => setConfirmAction({ type: 'delete', reason: '' })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit History */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique d'audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune action de modération enregistrée
              </p>
            ) : (
              <div className="space-y-4">
                {auditHistory.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="p-2 bg-background rounded-lg">
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{log.action}</p>
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Raison: {log.reason}
                        </p>
                      )}
                      {log.actor && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Par: {log.actor.prenom} {log.actor.nom}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
  )
}
