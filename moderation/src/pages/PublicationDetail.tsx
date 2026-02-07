import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { publicationsService } from '@/services/publications'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, EyeOff, Trash2, RefreshCw, AlertTriangle, Heart, MessageCircle, Image, Video, User, Clock } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const typeLabels: Record<string, string> = {
  post: 'Post',
  annonce: 'Annonce',
  update: 'Update',
  editorial: 'Éditorial',
  'live-extrait': 'Extrait Live',
}

export function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    reason: string
  } | null>(null)

  // Fetch publication details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publication', id],
    queryFn: () => publicationsService.getPublication(id!),
    enabled: !!id,
  })

  // Mutations
  const hideMutation = useMutation({
    mutationFn: (reason: string) => publicationsService.hidePublication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication', id] })
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication masquée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du masquage de la publication', { description: error.message })
    },
  })

  const unhideMutation = useMutation({
    mutationFn: (reason?: string) => publicationsService.unhidePublication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication', id] })
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication réactivée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la réactivation de la publication', { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => publicationsService.deletePublication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication', id] })
      queryClient.invalidateQueries({ queryKey: ['publications'] })
      setConfirmAction(null)
      toast.success('Publication supprimée')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression de la publication', { description: error.message })
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
        <p className="text-lg mb-4">Publication non trouvée</p>
        <Link to="/publications">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux publications
          </Button>
        </Link>
      </div>
    )
  }

  const { publication, commentaires, auditHistory } = data

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/publications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Détail de la publication</h1>
            <p className="text-muted-foreground text-sm">
              ID: {publication._id}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Publication Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informations</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {typeLabels[publication.type] || publication.type}
                  </Badge>
                  {publication.isHidden ? (
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Author */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Link to={`/users/${publication.auteur._id}`}>
                  {publication.auteur.avatar ? (
                    <img
                      src={publication.auteur.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                      {publication.auteur.prenom?.[0]}
                      {publication.auteur.nom?.[0]}
                    </div>
                  )}
                </Link>
                <div>
                  <Link
                    to={`/users/${publication.auteur._id}`}
                    className="font-semibold hover:underline"
                  >
                    {publication.auteur.prenom} {publication.auteur.nom}
                  </Link>
                  {publication.auteur.email && (
                    <p className="text-sm text-muted-foreground">{publication.auteur.email}</p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Contenu</h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{publication.contenu || '(vide)'}</p>
                </div>
              </div>

              {/* Media */}
              {publication.medias && publication.medias.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Médias ({publication.medias.length})
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {publication.medias.map((media, index) => (
                      <div key={index} className="rounded-lg overflow-hidden bg-muted">
                        {media.type === 'video' ? (
                          <div className="relative">
                            <video
                              src={media.url}
                              controls
                              className="w-full aspect-video object-contain"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary">
                                <Video className="mr-1 h-3 w-3" />
                                Vidéo
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={media.url}
                              alt={`Média ${index + 1}`}
                              className="w-full aspect-video object-contain"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary">
                                <Image className="mr-1 h-3 w-3" />
                                Image
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="font-medium">{publication.likesCount ?? publication.likes?.length ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commentaires</p>
                    <p className="font-medium">{publication.nbCommentaires ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Créée</p>
                    <p className="font-medium">{formatRelativeTime(publication.dateCreation)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(publication.dateCreation)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mise à jour</p>
                    <p className="font-medium">{formatRelativeTime(publication.dateMiseAJour)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(publication.dateMiseAJour)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Projet link */}
              {publication.projet && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-muted rounded-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Projet associé</p>
                    <p className="font-medium">{publication.projet.nom}</p>
                  </div>
                </div>
              )}

              {/* Hidden info */}
              {publication.isHidden && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Publication masquée
                  </h4>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Commentaires ({commentaires.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commentaires.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun commentaire sur cette publication
                </p>
              ) : (
                <div className="space-y-4">
                  {commentaires.map((comment: any) => (
                    <div
                      key={comment._id}
                      className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div>
                        {comment.auteur?.avatar ? (
                          <img
                            src={comment.auteur.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {comment.auteur?.prenom?.[0]}
                            {comment.auteur?.nom?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Link
                            to={`/users/${comment.auteur?._id}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {comment.auteur?.prenom} {comment.auteur?.nom}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.dateCreation)}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.contenu}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
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
                  {auditHistory.map((log: any) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="p-2 bg-background rounded-lg">
                        <Clock className="h-4 w-4 text-muted-foreground" />
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

        {/* Actions Sidebar - Right column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publication.isHidden ? (
                <Button
                  className="w-full"
                  onClick={() => setConfirmAction({ type: 'unhide', reason: '' })}
                  disabled={unhideMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Réafficher
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setConfirmAction({ type: 'hide', reason: '' })}
                  disabled={hideMutation.isPending}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Masquer
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmAction({ type: 'delete', reason: '' })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </CardContent>
          </Card>

          {/* Author Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Auteur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Link to={`/users/${publication.auteur._id}`}>
                  {publication.auteur.avatar ? (
                    <img
                      src={publication.auteur.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {publication.auteur.prenom?.[0]}
                      {publication.auteur.nom?.[0]}
                    </div>
                  )}
                </Link>
                <div>
                  <Link
                    to={`/users/${publication.auteur._id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {publication.auteur.prenom} {publication.auteur.nom}
                  </Link>
                  {publication.auteur.role && (
                    <p className="text-xs text-muted-foreground">{publication.auteur.role}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{typeLabels[publication.type] || publication.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Likes</span>
                <span className="font-medium flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {publication.likesCount ?? publication.likes?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commentaires</span>
                <span className="font-medium flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {publication.nbCommentaires ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médias</span>
                <span className="font-medium flex items-center gap-1">
                  {publication.medias?.some(m => m.type === 'image') && <Image className="h-3 w-3" />}
                  {publication.medias?.some(m => m.type === 'video') && <Video className="h-3 w-3" />}
                  {publication.medias?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                {publication.isHidden ? (
                  <Badge variant="destructive" className="text-xs">Masquée</Badge>
                ) : (
                  <Badge variant="success" className="text-xs">Visible</Badge>
                )}
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créée</span>
                  <span className="font-medium">{formatDate(publication.dateCreation)}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mise à jour</span>
                <span className="font-medium">{formatDate(publication.dateMiseAJour)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                  {confirmAction.type === 'hide' &&
                    "La publication sera masquée et ne sera plus visible par les utilisateurs."}
                  {confirmAction.type === 'unhide' &&
                    "La publication sera de nouveau visible par les utilisateurs."}
                  {confirmAction.type === 'delete' &&
                    "Cette action est irréversible. La publication sera définitivement supprimée."}
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
