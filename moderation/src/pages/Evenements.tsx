import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { evenementsService, type EvenementListParams } from '@/services/evenements'
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
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Clock,
  Video,
  Radio,
  QrCode,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const typeLabels: Record<string, string> = {
  live: 'Live',
  replay: 'Replay',
  qr: 'QR',
}

const statutLabels: Record<string, string> = {
  'a-venir': 'A venir',
  'en-cours': 'En cours',
  'termine': 'Terminé',
}

const typeIcons: Record<string, React.ReactNode> = {
  live: <Radio className="mr-1 h-3 w-3" />,
  replay: <Video className="mr-1 h-3 w-3" />,
  qr: <QrCode className="mr-1 h-3 w-3" />,
}

export function EvenementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const params: EvenementListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    type: (searchParams.get('type') as 'live' | 'replay' | 'qr') || undefined,
    statut: (searchParams.get('statut') as 'a-venir' | 'en-cours' | 'termine') || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['evenements', params],
    queryFn: () => evenementsService.getEvenements(params),
  })

  const updateParams = (updates: Partial<EvenementListParams>) => {
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

  const hasActiveFilters = params.type || params.statut

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Événements
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} événement(s) au total
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <Select
                  value={params.type || ''}
                  onChange={(e) => updateParams({ type: (e.target.value as 'live' | 'replay' | 'qr') || undefined })}
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
                  value={params.statut || ''}
                  onChange={(e) => updateParams({ statut: (e.target.value as 'a-venir' | 'en-cours' | 'termine') || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(statutLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
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
              <Calendar className="h-8 w-8 mb-2" />
              <p>Aucun événement trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((evt) => (
                  <TableRow key={evt._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{evt.titre}</p>
                        <p className="text-xs text-muted-foreground max-w-[250px] truncate">
                          {evt.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeIcons[evt.type]}
                        {typeLabels[evt.type] || evt.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {evt.projet ? (
                        <span className="text-sm">{evt.projet.nom}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(evt.date)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {evt.duree} min
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          evt.statut === 'en-cours' ? 'destructive' :
                          evt.statut === 'a-venir' ? 'default' : 'secondary'
                        }
                      >
                        {statutLabels[evt.statut] || evt.statut}
                      </Badge>
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
  )
}
