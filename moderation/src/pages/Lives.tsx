import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { livesService, type LiveListParams } from '@/services/lives'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Radio,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Eye,
  Users,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function LivesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const params: LiveListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    status: (searchParams.get('status') as 'live' | 'ended') || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['lives', params],
    queryFn: () => livesService.getLives(params),
  })

  const updateParams = (updates: Partial<LiveListParams>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && String(value) !== '') {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    if (!('page' in updates)) newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const clearFilters = () => setSearchParams({ page: '1', limit: '20' })

  return (
    <PageTransition>
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6" />
            Lives
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} live(s) au total
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
              {params.status && (
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: (e.target.value as 'live' | 'ended') || undefined })}
                >
                  <option value="">Tous</option>
                  <option value="live">En direct</option>
                  <option value="ended">Terminés</option>
                </Select>
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
              <Radio className="h-8 w-8 mb-2" />
              <p>Aucun live trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hôte</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead>Peak</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((live) => (
                  <TableRow key={live._id}>
                    <TableCell>
                      <Link
                        to={`/users/${live.hostUserId._id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {live.hostUserId.avatar ? (
                          <img src={live.hostUserId.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {live.hostUserId.prenom?.[0]}{live.hostUserId.nom?.[0]}
                          </div>
                        )}
                        <span className="font-medium text-sm">
                          {live.hostUserId.prenom} {live.hostUserId.nom}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{live.title || '(sans titre)'}</span>
                    </TableCell>
                    <TableCell>
                      {live.status === 'live' ? (
                        <Badge variant="destructive">
                          <Radio className="mr-1 h-3 w-3" />
                          En direct
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Terminé</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Eye className="h-3 w-3" />
                        {live.viewerCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {live.peakViewerCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(live.startedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {live.endedAt ? formatRelativeTime(live.endedAt) : '-'}
                      </span>
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
    </div>
    </PageTransition>
  )
}
