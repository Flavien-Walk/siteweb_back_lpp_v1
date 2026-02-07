import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { usersService, type UserListParams } from '@/services/users'
import { PageTransition } from '@/components/PageTransition'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Ban,
  RefreshCw,
  X,
  Shield,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { User } from '@/types'

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Modérateur Test',
  modo: 'Modérateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur', // Legacy
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  banned: 'Banni',
}

function UserStatusBadge({ user }: { user: User }) {
  if (user.bannedAt) {
    return <Badge variant="destructive">Banni</Badge>
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return <Badge variant="warning">Suspendu</Badge>
  }
  return <Badge variant="success">Actif</Badge>
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    user: 'secondary',
    modo_test: 'outline',
    modo: 'default',
    admin_modo: 'warning',
    super_admin: 'destructive',
  }
  return <Badge variant={variants[role] as never}>{roleLabels[role]}</Badge>
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  // Get params from URL
  const params: UserListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    search: searchParams.get('search') || undefined,
    role: searchParams.get('role') || undefined,
    status: (searchParams.get('status') as 'active' | 'suspended' | 'banned') || undefined,
    sort: searchParams.get('sort') || 'createdAt',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  }

  // Fetch users
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.getUsers(params),
  })

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      usersService.banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Utilisateur banni')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du bannissement', { description: error.message })
    },
  })

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: (id: string) => usersService.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Utilisateur débanni')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du débannissement', { description: error.message })
    },
  })

  // Update URL params
  const updateParams = (updates: Partial<UserListParams>) => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search: searchQuery })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSearchParams({ page: '1', limit: '20' })
  }

  const hasActiveFilters = params.search || params.role || params.status

  const canBan = hasPermission('users:ban')

  return (
    <PageTransition>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Utilisateurs
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} utilisateur(s) au total
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recherche
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
                <Filter className="mr-1 h-3 w-3" />
                Filtres
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Rechercher par nom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-4 pt-2 border-t">
              <div>
                <label className="mb-1 block text-sm font-medium">Rôle</label>
                <Select
                  value={params.role || ''}
                  onChange={(e) => updateParams({ role: e.target.value || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <Select
                  value={params.status || ''}
                  onChange={(e) => updateParams({ status: e.target.value as 'active' | 'suspended' | 'banned' || undefined })}
                >
                  <option value="">Tous</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
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
                  <option value="createdAt-desc">Plus récents</option>
                  <option value="createdAt-asc">Plus anciens</option>
                  <option value="nom-asc">Nom (A-Z)</option>
                  <option value="nom-desc">Nom (Z-A)</option>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Erreur lors du chargement des utilisateurs
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead>Avertissements</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-10 w-40 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-8 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-8 w-20 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                          {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{user.prenom} {user.nom}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {user._id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge user={user} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(user.dateCreation)}
                  </TableCell>
                  <TableCell>
                    {user.warnings && user.warnings.length > 0 ? (
                      <Badge variant="warning">{user.warnings.length}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/users/${user._id}`}>
                        <Button variant="ghost" size="icon" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canBan && !user.bannedAt && user.role === 'user' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Bannir"
                          onClick={() => {
                            const reason = prompt('Raison du bannissement:')
                            if (reason) {
                              banMutation.mutate({ id: user._id, reason })
                            }
                          }}
                          disabled={banMutation.isPending}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {canBan && user.bannedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Débannir"
                          onClick={() => unbanMutation.mutate(user._id)}
                          disabled={unbanMutation.isPending}
                        >
                          <Shield className="h-4 w-4 text-success" />
                        </Button>
                      )}
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

export default UsersPage
