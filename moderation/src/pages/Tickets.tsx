import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { ticketsService, type TicketListParams } from '@/services/tickets'
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
  Headphones,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { TicketStatus, TicketCategory, TicketPriority } from '@/types'

const statusLabels: Record<TicketStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
}

const categoryLabels: Record<TicketCategory, string> = {
  bug: 'Bug',
  compte: 'Compte',
  contenu: 'Contenu',
  signalement: 'Signalement',
  suggestion: 'Suggestion',
  autre: 'Autre',
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const variants: Record<TicketStatus, string> = {
    en_attente: 'warning',
    en_cours: 'default',
    termine: 'success',
  }
  return (
    <Badge variant={variants[status] as never}>
      {statusLabels[status] || status}
    </Badge>
  )
}

function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const variants: Record<TicketPriority, string> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
  }
  return (
    <Badge variant={variants[priority] as never} className="text-xs">
      {priorityLabels[priority]}
    </Badge>
  )
}

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const { user: currentUser, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canRespond = hasPermission('tickets:respond' as never)

  const assignMutation = useMutation({
    mutationFn: (ticketId: string) => ticketsService.assignTicket(ticketId, currentUser!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Ticket pris en charge')
    },
    onError: (error: Error) => {
      toast.error('Erreur', { description: error.message })
    },
  })

  const params: TicketListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    status: (searchParams.get('status') as TicketStatus | 'active') || 'active',
    category: (searchParams.get('category') as TicketCategory) || undefined,
    priority: (searchParams.get('priority') as TicketPriority) || undefined,
    sort: searchParams.get('sort') || 'dateMiseAJour',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsService.getTickets(params),
  })

  const updateParams = (updates: Partial<TicketListParams>) => {
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

  const hasActiveFilters = (params.status && params.status !== 'active') || params.category || params.priority

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headphones className="h-6 w-6" />
              Tickets Support
            </h1>
            <p className="text-muted-foreground">
              {data?.totalCount ?? 0} ticket(s) au total
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
                  <label className="mb-1 block text-sm font-medium">Statut</label>
                  <Select
                    value={params.status || 'active'}
                    onChange={(e) => updateParams({ status: (e.target.value || 'active') as TicketStatus | 'active' })}
                  >
                    <option value="active">Actifs</option>
                    <option value="">Tous</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Catégorie</label>
                  <Select
                    value={params.category || ''}
                    onChange={(e) => updateParams({ category: e.target.value as TicketCategory || undefined })}
                  >
                    <option value="">Toutes</option>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Priorité</label>
                  <Select
                    value={params.priority || ''}
                    onChange={(e) => updateParams({ priority: e.target.value as TicketPriority || undefined })}
                  >
                    <option value="">Toutes</option>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tri</label>
                  <Select
                    value={`${params.sort}-${params.order}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split('-')
                      updateParams({ sort, order: order as 'asc' | 'desc' })
                    }}
                  >
                    <option value="dateMiseAJour-desc">Dernière MAJ</option>
                    <option value="dateCreation-desc">Plus récents</option>
                    <option value="dateCreation-asc">Plus anciens</option>
                    <option value="priority-desc">Priorité (haute)</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Erreur lors du chargement des tickets</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </CardContent>
          </Card>
        )}

        {/* Tickets table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sujet</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Dernière MAJ</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-16 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-16 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-8 w-10 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Aucun ticket trouvé
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((ticket) => (
                  <TableRow key={ticket._id}>
                    <TableCell className="max-w-[200px]">
                      <Link to={`/tickets/${ticket._id}`} className="text-sm font-medium hover:text-primary transition-colors">
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ticket.user?.avatar ? (
                          <img src={ticket.user.avatar} alt="" className="h-6 w-6 rounded-full" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">
                            {ticket.user?.prenom?.[0]}
                          </div>
                        )}
                        <span className="text-sm">
                          {ticket.user?.prenom} {ticket.user?.nom?.[0]}.
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryLabels[ticket.category] || ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <TicketPriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {ticket.assignedTo ? (
                        <span className={ticket.assignedTo._id === currentUser?._id ? 'text-primary font-medium' : 'text-muted-foreground'}>
                          {ticket.assignedTo.prenom} {ticket.assignedTo.nom?.[0]}.
                          {ticket.assignedTo._id === currentUser?._id && ' (moi)'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(ticket.dateMiseAJour)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canRespond && !ticket.assignedTo && ticket.status !== 'termine' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Prendre le ticket"
                            onClick={(e) => {
                              e.preventDefault()
                              assignMutation.mutate(ticket._id)
                            }}
                            disabled={assignMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Link to={`/tickets/${ticket._id}`}>
                          <Button variant="ghost" size="icon" title="Voir détails">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.currentPage} sur {data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateParams({ page: data.currentPage - 1 })}
                  disabled={data.currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateParams({ page: data.currentPage + 1 })}
                  disabled={data.currentPage >= data.totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}

export default TicketsPage
