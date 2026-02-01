import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
  History,
  Flag,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { User as UserType } from '@/types'

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Modo Test',
  modo: 'Modérateur',
  admin_modo: 'Admin Modo',
  super_admin: 'Super Admin',
}

function UserStatusBadge({ user }: { user: UserType }) {
  if (user.bannedAt) {
    return <Badge variant="destructive">Banni</Badge>
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return <Badge variant="warning">Suspendu jusqu'au {formatDate(user.suspendedUntil)}</Badge>
  }
  return <Badge variant="success">Actif</Badge>
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission, user: currentUser } = useAuth()

  const [warnReason, setWarnReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState('24')
  const [banReason, setBanReason] = useState('')
  const [newRole, setNewRole] = useState('')

  // Fetch user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getUser(id!),
    enabled: !!id,
  })

  // Warn mutation
  const warnMutation = useMutation({
    mutationFn: (reason: string) => usersService.warnUser(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setWarnReason('')
    },
  })

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: ({ reason, duration }: { reason: string; duration: number }) =>
      usersService.suspendUser(id!, { reason, duration }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSuspendReason('')
    },
  })

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: (reason: string) => usersService.banUser(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setBanReason('')
    },
  })

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: () => usersService.unbanUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Role mutation
  const roleMutation = useMutation({
    mutationFn: (role: string) => usersService.updateRole(id!, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewRole('')
    },
  })

  const canWarn = hasPermission('users:warn')
  const canSuspend = hasPermission('users:suspend')
  const canBan = hasPermission('users:ban')
  const canModifyRole = hasPermission('users:role')

  const isStaffMember = user && ['modo_test', 'modo', 'admin_modo', 'super_admin'].includes(user.role)
  const isSelf = user && currentUser && user._id === currentUser._id

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="h-6 w-6 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="h-48 animate-pulse bg-muted" /></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="h-64 animate-pulse bg-muted" /></Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">Utilisateur non trouvé</p>
            <Button variant="outline" onClick={() => navigate('/users')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux utilisateurs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/users')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-medium">
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {user.prenom} {user.nom}
              <UserStatusBadge user={user} />
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{user._id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rôle</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'user' ? 'secondary' : 'default'}>
                      {roleLabels[user.role]}
                    </Badge>
                    {canModifyRole && !isSelf && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={newRole || user.role}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-32"
                        >
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                        {newRole && newRole !== user.role && (
                          <Button
                            size="sm"
                            onClick={() => roleMutation.mutate(newRole)}
                            disabled={roleMutation.isPending}
                          >
                            Modifier
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inscrit le</p>
                  <p>{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dernière activité</p>
                  <p>{user.lastActive ? formatRelativeTime(user.lastActive) : 'Inconnue'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Avertissements ({user.warnings?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.warnings && user.warnings.length > 0 ? (
                <div className="space-y-3">
                  {user.warnings.map((warning, index) => (
                    <div key={index} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          Par {warning.moderator?.prenom} {warning.moderator?.nom}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(warning.date)}
                        </span>
                      </div>
                      <p className="text-sm">{warning.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun avertissement
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent reports about this user */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Signalements reçus
              </CardTitle>
              <CardDescription>
                Signalements dont cet utilisateur est la cible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Fonctionnalité à venir
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Quick actions */}
          {!isStaffMember && !isSelf && (
            <Card>
              <CardHeader>
                <CardTitle>Actions de modération</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warn */}
                {canWarn && !user.bannedAt && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avertir</label>
                    <Input
                      placeholder="Raison de l'avertissement"
                      value={warnReason}
                      onChange={(e) => setWarnReason(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => warnMutation.mutate(warnReason)}
                      disabled={!warnReason.trim() || warnMutation.isPending}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Envoyer avertissement
                    </Button>
                  </div>
                )}

                {/* Suspend */}
                {canSuspend && !user.bannedAt && (
                  <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-medium">Suspendre</label>
                    <Input
                      placeholder="Raison de la suspension"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                    />
                    <Select
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(e.target.value)}
                    >
                      <option value="1">1 heure</option>
                      <option value="6">6 heures</option>
                      <option value="24">24 heures</option>
                      <option value="72">3 jours</option>
                      <option value="168">7 jours</option>
                      <option value="720">30 jours</option>
                    </Select>
                    <Button
                      className="w-full"
                      variant="warning"
                      onClick={() => suspendMutation.mutate({
                        reason: suspendReason,
                        duration: parseInt(suspendDuration),
                      })}
                      disabled={!suspendReason.trim() || suspendMutation.isPending}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Suspendre
                    </Button>
                  </div>
                )}

                {/* Ban / Unban */}
                {canBan && (
                  <div className="space-y-2 pt-4 border-t">
                    {user.bannedAt ? (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => unbanMutation.mutate()}
                        disabled={unbanMutation.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Débannir
                      </Button>
                    ) : (
                      <>
                        <label className="text-sm font-medium">Bannir définitivement</label>
                        <Input
                          placeholder="Raison du bannissement"
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                        />
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() => banMutation.mutate(banReason)}
                          disabled={!banReason.trim() || banMutation.isPending}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Bannir
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Publications</span>
                <span>{user.publicationsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commentaires</span>
                <span>{user.commentsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signalements émis</span>
                <span>{user.reportsCount ?? 0}</span>
              </div>
              {user.bannedAt && (
                <div className="flex justify-between text-destructive">
                  <span>Banni le</span>
                  <span>{formatDate(user.bannedAt)}</span>
                </div>
              )}
              {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                <div className="flex justify-between text-warning">
                  <span>Suspendu jusqu'au</span>
                  <span>{formatDate(user.suspendedUntil)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff notice */}
          {isStaffMember && (
            <Card className="border-primary">
              <CardContent className="flex items-center gap-3 p-4">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm">
                  Cet utilisateur fait partie de l'équipe de modération.
                  Les actions de modération sont désactivées.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDetailPage
