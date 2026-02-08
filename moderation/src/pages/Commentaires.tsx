import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { commentairesService, type CommentaireListParams } from '@/services/commentaires'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  MessageCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  Heart,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function CommentairesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    commentaireId: string
    reason: string
  } | null>(null)

  const params: CommentaireListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    publicationId: searchParams.get('publicationId') || undefined,
    auteurId: searchParams.get('auteurId') || undefined,
    search: searchParams.get('search') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['commentaires', params],
    queryFn: () => commentairesService.getCommentaires(params),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      commentairesService.deleteCommentaire(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaires'] })
      setConfirmDelete(null)
      toast.success('Commentaire supprimé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression du commentaire', { description: error.message })
    },
  })

  const updateParams = (updates: Partial<CommentaireListParams>) => {
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

  const hasActiveFilters = params.publicationId || params.auteurId || params.search || params.dateFrom || params.dateTo

  return (
    <PageTransition>
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Commentaires
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} commentaire(s) au total
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

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
                <label className="mb-1 block text-sm font-medium">Recherche</label>
                <Input
                  placeholder="Rechercher dans le contenu..."
                  value={params.search || ''}
                  onChange={(e) => updateParams({ search: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ID Publication</label>
                <Input
                  placeholder="ID de la publication"
                  value={params.publicationId || ''}
                  onChange={(e) => updateParams({ publicationId: e.target.value || undefined })}
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
              <MessageCircle className="h-8 w-8 mb-2" />
              <p>Aucun commentaire trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((com) => (
                  <TableRow key={com._id}>
                    <TableCell>
                      <Link
                        to={`/users/${com.auteur._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {com.auteur.avatar ? (
                          <img src={com.auteur.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {com.auteur.prenom?.[0]}{com.auteur.nom?.[0]}
                          </div>
                        )}
                        <span className="font-medium text-sm">
                          {com.auteur.prenom} {com.auteur.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-[300px] truncate">{com.contenu}</p>
                    </TableCell>
                    <TableCell>
                      {typeof com.publication === 'string' ? (
                        <Link to={`/publications/${com.publication}`} className="text-sm hover:underline text-primary">
                          Voir
                        </Link>
                      ) : (
                        <Link to={`/publications/${com.publication._id}`} className="text-sm hover:underline text-primary">
                          {com.publication.contenu ? com.publication.contenu.substring(0, 30) + '...' : 'Voir'}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        {com.likesCount ?? com.likes?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(com.dateCreation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ commentaireId: com._id, reason: '' })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Supprimer le commentaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cette action est irréversible. Le commentaire sera définitivement supprimé.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Raison *</label>
                  <Input
                    placeholder="Entrez une raison..."
                    value={confirmDelete.reason}
                    onChange={(e) => setConfirmDelete({ ...confirmDelete, reason: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate({ id: confirmDelete.commentaireId, reason: confirmDelete.reason })}
                    disabled={confirmDelete.reason.length < 5 || deleteMutation.isPending}
                  >
                    Supprimer
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

export default CommentairesPage
