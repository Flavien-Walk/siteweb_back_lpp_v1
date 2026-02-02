import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersService } from '@/services/users'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UserX,
  Eye,
  AlertTriangle,
  RefreshCw,
  Shield,
  Clock,
  Ban,
  CheckCircle,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { User } from '@/types'

function UserStatusBadge({ user }: { user: User }) {
  if (user.bannedAt) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" />
        Banni
      </Badge>
    )
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Suspendu
      </Badge>
    )
  }
  return <Badge variant="success">Actif</Badge>
}

export function SuspendedUsersPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const [filter, setFilter] = useState<'all' | 'suspended' | 'banned'>('all')

  // Fetch suspended users
  const suspendedQuery = useQuery({
    queryKey: ['users', 'suspended'],
    queryFn: () => usersService.getUsers({ status: 'suspended', limit: 100 }),
  })

  // Fetch banned users
  const bannedQuery = useQuery({
    queryKey: ['users', 'banned'],
    queryFn: () => usersService.getUsers({ status: 'banned', limit: 100 }),
  })

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: (id: string) => usersService.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  // Unsuspend mutation
  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => usersService.unsuspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const isLoading = suspendedQuery.isLoading || bannedQuery.isLoading
  const error = suspendedQuery.error || bannedQuery.error

  const suspendedUsers = suspendedQuery.data?.items || []
  const bannedUsers = bannedQuery.data?.items || []

  // Combine and filter users
  const allUsers = [...suspendedUsers, ...bannedUsers]
  const displayedUsers = filter === 'all'
    ? allUsers
    : filter === 'suspended'
      ? suspendedUsers
      : bannedUsers

  const canUnban = hasPermission('users:unban')
  const canSuspend = hasPermission('users:suspend')

  const refetchAll = () => {
    suspendedQuery.refetch()
    bannedQuery.refetch()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="h-6 w-6" />
            Utilisateurs Suspendus
          </h1>
          <p className="text-muted-foreground">
            {suspendedUsers.length} suspendu(s) · {bannedUsers.length} banni(s)
          </p>
        </div>
        <Button variant="outline" onClick={refetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Tous ({allUsers.length})
        </Button>
        <Button
          variant={filter === 'suspended' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('suspended')}
          className="gap-1"
        >
          <Clock className="h-3.5 w-3.5" />
          Suspendus ({suspendedUsers.length})
        </Button>
        <Button
          variant={filter === 'banned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('banned')}
          className="gap-1"
        >
          <Ban className="h-3.5 w-3.5" />
          Bannis ({bannedUsers.length})
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Erreur lors du chargement des utilisateurs
            </p>
            <Button variant="outline" size="sm" onClick={refetchAll}>
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
              <TableHead>Statut</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fin de suspension</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-10 w-40 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-48 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-8 w-24 animate-pulse rounded bg-muted ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : displayedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 text-success" />
                    <p>Aucun utilisateur {filter === 'suspended' ? 'suspendu' : filter === 'banned' ? 'banni' : 'sanctionné'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedUsers.map((user) => {
                const isBanned = !!user.bannedAt
                const isSuspended = !isBanned && user.suspendedUntil && new Date(user.suspendedUntil) > new Date()

                return (
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
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge user={user} />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-muted-foreground truncate" title={user.banReason || '-'}>
                        {user.banReason || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isBanned && user.bannedAt ? (
                        <div>
                          <div>{formatDate(user.bannedAt)}</div>
                          <div className="text-xs">{formatRelativeTime(user.bannedAt)}</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isSuspended && user.suspendedUntil ? (
                        <div>
                          <div className="text-warning">{formatDate(user.suspendedUntil)}</div>
                          <div className="text-xs text-muted-foreground">{formatRelativeTime(user.suspendedUntil)}</div>
                        </div>
                      ) : isBanned ? (
                        <span className="text-destructive font-medium">Permanent</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/users/${user._id}`}>
                          <Button variant="ghost" size="icon" title="Voir détails">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {isBanned && canUnban && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-success border-success hover:bg-success/10"
                            onClick={() => {
                              if (confirm(`Débannir ${user.prenom} ${user.nom} ?`)) {
                                unbanMutation.mutate(user._id)
                              }
                            }}
                            disabled={unbanMutation.isPending}
                          >
                            <Shield className="h-4 w-4" />
                            Débannir
                          </Button>
                        )}
                        {isSuspended && canSuspend && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-success border-success hover:bg-success/10"
                            onClick={() => {
                              if (confirm(`Lever la suspension de ${user.prenom} ${user.nom} ?`)) {
                                unsuspendMutation.mutate(user._id)
                              }
                            }}
                            disabled={unsuspendMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Lever
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

export default SuspendedUsersPage
