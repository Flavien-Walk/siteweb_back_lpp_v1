import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { projetsService } from '@/services/projets'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, EyeOff, Trash2, RefreshCw, AlertTriangle, Briefcase, Users, Clock } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const categorieLabels: Record<string, string> = {
  tech: 'Technologie',
  food: 'Alimentation',
  sante: 'Sant\u00e9',
  education: '\u00c9ducation',
  energie: '\u00c9nergie',
  culture: 'Culture',
  environnement: 'Environnement',
  autre: 'Autre',
}

const maturiteLabels: Record<string, string> = {
  idee: 'Id\u00e9e',
  prototype: 'Prototype',
  lancement: 'Lancement',
  croissance: 'Croissance',
}

const maturiteVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  idee: 'secondary',
  prototype: 'default',
  lancement: 'warning',
  croissance: 'success',
}

export function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    reason: string
  } | null>(null)

  // Fetch projet details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projet', id],
    queryFn: () => projetsService.getProjet(id!),
    enabled: !!id,
  })

  // Hide mutation
  const hideMutation = useMutation({
    mutationFn: (reason: string) => projetsService.hideProjet(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projet', id] })
      queryClient.invalidateQueries({ queryKey: ['projets'] })
      setConfirmAction(null)
      toast.success('Projet masqué')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du masquage du projet', { description: error.message })
    },
  })

  // Unhide mutation
  const unhideMutation = useMutation({
    mutationFn: (reason?: string) => projetsService.unhideProjet(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projet', id] })
      queryClient.invalidateQueries({ queryKey: ['projets'] })
      setConfirmAction(null)
      toast.success('Projet réactivé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la réactivation du projet', { description: error.message })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (reason: string) => projetsService.deleteProjet(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projets'] })
      window.history.back()
      toast.success('Projet supprimé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression du projet', { description: error.message })
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
        <p className="text-lg mb-4">Projet non trouv\u00e9</p>
        <Link to="/projets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux projets
          </Button>
        </Link>
      </div>
    )
  }

  const { projet, auditHistory } = data

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {projet.logo ? (
              <img
                src={projet.logo}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{projet.nom}</h1>
              <p className="text-muted-foreground text-sm">
                ID: {projet._id}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations du projet
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={maturiteVariants[projet.maturite] || 'secondary'}>
                    {maturiteLabels[projet.maturite] || projet.maturite}
                  </Badge>
                  <Badge variant="outline">
                    {categorieLabels[projet.categorie] || projet.categorie}
                  </Badge>
                  <Badge variant={projet.statut === 'published' ? 'success' : 'secondary'}>
                    {projet.statut === 'published' ? 'Publi\u00e9' : 'Brouillon'}
                  </Badge>
                  {projet.isHidden ? (
                    <Badge variant="destructive">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Masqu\u00e9
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
              {/* Description */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{projet.description || 'Aucune description'}</p>
              </div>

              {/* Pitch */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pitch</p>
                <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg italic">
                  {projet.pitch || 'Aucun pitch'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cat\u00e9gorie</p>
                  <p className="font-medium">{categorieLabels[projet.categorie] || projet.categorie}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Maturit\u00e9</p>
                  <p className="font-medium">{maturiteLabels[projet.maturite] || projet.maturite}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cr\u00e9\u00e9 le</p>
                    <p className="text-sm">{formatDate(projet.dateCreation)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mis \u00e0 jour</p>
                    <p className="text-sm">{formatRelativeTime(projet.dateMiseAJour)}</p>
                  </div>
                </div>
              </div>

              {/* Hidden info */}
              {projet.isHidden && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Projet masqu\u00e9
                  </h4>
                  {projet.hiddenReason && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Raison :</span> {projet.hiddenReason}
                    </p>
                  )}
                  {projet.hiddenBy && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Par :</span>{' '}
                      {projet.hiddenBy.prenom} {projet.hiddenBy.nom}
                    </p>
                  )}
                  {projet.hiddenAt && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Le :</span>{' '}
                      {formatDate(projet.hiddenAt)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipe Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                \u00c9quipe ({projet.equipe?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projet.equipe && projet.equipe.length > 0 ? (
                <div className="space-y-3">
                  {projet.equipe.map((membre, index) => (
                    <div
                      key={membre.utilisateur?._id || index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {membre.utilisateur ? (
                          <Link to={`/users/${membre.utilisateur._id}`}>
                            {membre.utilisateur.avatar ? (
                              <img
                                src={membre.utilisateur.avatar}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {membre.utilisateur.prenom?.[0]}
                                {membre.utilisateur.nom?.[0]}
                              </div>
                            )}
                          </Link>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          {membre.utilisateur ? (
                            <Link
                              to={`/users/${membre.utilisateur._id}`}
                              className="font-medium hover:underline"
                            >
                              {membre.utilisateur.prenom} {membre.utilisateur.nom}
                            </Link>
                          ) : (
                            <p className="font-medium">{membre.nom}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{membre.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun membre dans l'\u00e9quipe
                </p>
              )}
            </CardContent>
          </Card>

          {/* Audit History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historique d'audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditHistory && auditHistory.length > 0 ? (
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
                            Raison : {log.reason}
                          </p>
                        )}
                        {log.actor && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Par : {log.actor.prenom} {log.actor.nom}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune action de mod\u00e9ration enregistr\u00e9e
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Porteur Card */}
          <Card>
            <CardHeader>
              <CardTitle>Porteur du projet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Link to={`/users/${projet.porteur._id}`}>
                  {projet.porteur.avatar ? (
                    <img
                      src={projet.porteur.avatar}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                      {projet.porteur.prenom?.[0]}
                      {projet.porteur.nom?.[0]}
                    </div>
                  )}
                </Link>
                <div>
                  <Link
                    to={`/users/${projet.porteur._id}`}
                    className="font-semibold hover:underline"
                  >
                    {projet.porteur.prenom} {projet.porteur.nom}
                  </Link>
                  {projet.porteur.email && (
                    <p className="text-sm text-muted-foreground">{projet.porteur.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Followers
                </span>
                <span className="font-semibold">{projet.followersCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membres
                </span>
                <span className="font-semibold">{projet.equipe?.length ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Cr\u00e9\u00e9 le
                </span>
                <span className="text-xs">{formatDate(projet.dateCreation)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Actions de mod\u00e9ration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projet.isHidden ? (
                <Button
                  className="w-full"
                  onClick={() => setConfirmAction({ type: 'unhide', reason: '' })}
                  disabled={unhideMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  R\u00e9afficher le projet
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setConfirmAction({ type: 'hide', reason: '' })}
                  disabled={hideMutation.isPending}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Masquer le projet
                </Button>
              )}
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => setConfirmAction({ type: 'delete', reason: '' })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer le projet
              </Button>
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
                {confirmAction.type === 'hide' && 'Masquer le projet'}
                {confirmAction.type === 'unhide' && 'R\u00e9afficher le projet'}
                {confirmAction.type === 'delete' && 'Supprimer le projet'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmAction.type === 'hide' &&
                    'Le projet sera masqu\u00e9 et ne sera plus visible par les utilisateurs.'}
                  {confirmAction.type === 'unhide' &&
                    'Le projet sera de nouveau visible par les utilisateurs.'}
                  {confirmAction.type === 'delete' &&
                    'Cette action est irr\u00e9versible. Le projet sera d\u00e9finitivement supprim\u00e9.'}
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
                    {confirmAction.type === 'unhide' && 'R\u00e9afficher'}
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
