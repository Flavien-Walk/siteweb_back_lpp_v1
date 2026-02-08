import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { projetsService, type ProjetListParams } from '@/services/projets'
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
  Briefcase,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

const categorieLabels: Record<string, string> = {
  tech: 'Tech',
  food: 'Food',
  sante: 'Santé',
  education: 'Éducation',
  energie: 'Énergie',
  culture: 'Culture',
  environnement: 'Environnement',
  autre: 'Autre',
}

const maturiteLabels: Record<string, string> = {
  idee: 'Idée',
  prototype: 'Prototype',
  lancement: 'Lancement',
  croissance: 'Croissance',
}

export function ProjetsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete'
    projetId: string
    reason: string
  } | null>(null)

  // Get params from URL
  const params: ProjetListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    categorie: searchParams.get('categorie') || undefined,
    statut: (searchParams.get('statut') as 'draft' | 'published') || undefined,
    maturite: searchParams.get('maturite') || undefined,
    status: (searchParams.get('status') as 'hidden' | 'visible') || undefined,
    search: searchParams.get('search') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }

  // Fetch projets
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projets', params],
    queryFn: () => projetsService.getProjets(params),
  })

  // Hide mutation
  const hideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      projetsService.hideProjet(id, reason),
    onSuccess: () => {
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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      projetsService.unhideProjet(id, reason),
    onSuccess: () => {
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      projetsService.deleteProjet(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projets'] })
      setConfirmAction(null)
      toast.success('Projet supprimé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression du projet', { description: error.message })
    },
  })

  // Update URL params
  const updateParams = (updates: Partial<ProjetListParams>) => {
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

  const hasActiveFilters =
    params.categorie || params.statut || params.maturite || params.status || params.search || params.dateFrom || params.dateTo

  const handleAction = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'hide') {
      hideMutation.mutate({ id: confirmAction.projetId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'unhide') {
      unhideMutation.mutate({ id: confirmAction.projetId, reason: confirmAction.reason })
    } else if (confirmAction.type === 'delete') {
      deleteMutation.mutate({ id: confirmAction.projetId, reason: confirmAction.reason })
    }
  }

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Projets
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} projet(s) au total
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
                <label className="mb-1 block text-sm font-medium">Catégorie</label>
                <Select
                  value={params.categorie || ''}
                  onChange={(e) => updateParams({ categorie: e.target.value || undefined })}
                >
                  <option value="">Toutes</option>
                  {Object.entries(categorieLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.statut || ''}
                  onChange={(e) => updateParams({ statut: (e.target.value as 'draft' | 'published') || undefined })}
                >
                  <option value="">Tous</option>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Maturité</label>
                <Select
                  value={params.maturite || ''}
                  onChange={(e) => updateParams({ maturite: e.target.value || undefined })}
                >
                  <option value="">Toutes</option>
                  {Object.entries(maturiteLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Visibilité</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: (e.target.value as 'hidden' | 'visible') || undefined })}
                >
                  <option value="">Toutes</option>
                  <option value="visible">Visibles</option>
                  <option value="hidden">Masqués</option>
                </Select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Recherche</label>
                <Input
                  placeholder="Rechercher un projet..."
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

      {/* Projets Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Erreur lors du chargement des projets</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Briefcase className="h-8 w-8 mb-2" />
              <p>Aucun projet trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo / Nom</TableHead>
                  <TableHead>Porteur</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Maturité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((projet) => (
                  <TableRow key={projet._id}>
                    <TableCell>
                      <Link
                        to={`/projets/${projet._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {projet.logo ? (
                          <img
                            src={projet.logo}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-sm max-w-[150px] truncate">
                          {projet.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/users/${projet.porteur._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {projet.porteur.avatar ? (
                          <img
                            src={projet.porteur.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {projet.porteur.prenom?.[0]}{projet.porteur.nom?.[0]}
                          </div>
                        )}
                        <span className="font-medium text-sm">
                          {projet.porteur.prenom} {projet.porteur.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categorieLabels[projet.categorie] || projet.categorie}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {maturiteLabels[projet.maturite] || projet.maturite}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {projet.statut === 'draft' ? (
                        <Badge variant="secondary">Brouillon</Badge>
                      ) : (
                        <Badge variant="success">Publié</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {projet.isHidden ? (
                        <Badge variant="destructive">
                          <EyeOff className="mr-1 h-3 w-3" />
                          Masqué
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Eye className="mr-1 h-3 w-3" />
                          Visible
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {projet.followersCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(projet.dateCreation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/projets/${projet._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {projet.isHidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                type: 'unhide',
                                projetId: projet._id,
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
                                projetId: projet._id,
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
                              projetId: projet._id,
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
                {confirmAction.type === 'hide' && 'Masquer le projet'}
                {confirmAction.type === 'unhide' && 'Réafficher le projet'}
                {confirmAction.type === 'delete' && 'Supprimer le projet'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmAction.type === 'hide' &&
                    "Le projet sera masqué et ne sera plus visible par les utilisateurs."}
                  {confirmAction.type === 'unhide' &&
                    "Le projet sera de nouveau visible par les utilisateurs."}
                  {confirmAction.type === 'delete' &&
                    "Cette action est irréversible. Le projet sera définitivement supprimé."}
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

export default ProjetsPage
