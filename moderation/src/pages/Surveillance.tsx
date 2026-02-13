import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersService } from '@/services/users'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RiskBadge } from '@/components/RiskBadge'
import { computeRiskScore } from '@/lib/riskScore'
import {
  Eye,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { useState } from 'react'

export function SurveillancePage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['surveillance-users', page],
    queryFn: () => usersService.getSurveillanceUsers({ page, limit: 20 }),
  })

  const { data: atRiskData } = useQuery({
    queryKey: ['at-risk-users'],
    queryFn: () => usersService.getAtRiskUsers(10),
  })

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6 text-amber-400" />
              Surveillance
            </h1>
            <p className="text-muted-foreground">
              {data?.totalCount ?? 0} utilisateur(s) sous surveillance
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main list */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Utilisateurs surveilles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p>Erreur lors du chargement</p>
                  </div>
                ) : data?.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <Eye className="h-8 w-8 mb-2" />
                    <p>Aucun utilisateur sous surveillance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data?.items.map((user) => (
                      <Link
                        key={user._id}
                        to={`/users/${user._id}`}
                        className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-800/30 transition-all"
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-sm font-medium text-amber-400">
                            {user.prenom?.[0]}{user.nom?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.prenom} {user.nom}</p>
                            <Badge variant={user.role as any} className="text-[10px]">
                              {user.role}
                            </Badge>
                          </div>
                          {user.surveillance?.reason && (
                            <p className="text-sm text-zinc-400 mt-0.5">{user.surveillance.reason}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                            <span>{user.warnings?.length || 0} avertissement(s)</span>
                            <span>{user.reportsReceivedCount || 0} signalement(s)</span>
                            {user.surveillance?.addedAt && (
                              <span>Depuis {formatRelativeTime(user.surveillance.addedAt)}</span>
                            )}
                          </div>
                        </div>
                        <RiskBadge score={user.riskScore ?? computeRiskScore(user)} showLabel={false} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.currentPage} sur {data.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={!data.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" />Precedent
                  </Button>
                  <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>
                    Suivant<ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - At risk */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Top utilisateurs a risque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atRiskData && atRiskData.length > 0 ? (
                  <div className="space-y-3">
                    {atRiskData.map((user) => (
                      <Link
                        key={user._id}
                        to={`/users/${user._id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-medium text-red-400">
                            {user.prenom?.[0]}{user.nom?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.prenom} {user.nom}</p>
                          <p className="text-xs text-zinc-500">
                            {user.warnings?.length || 0} warn · {user.reportsReceivedCount || 0} reports
                          </p>
                        </div>
                        <RiskBadge score={user.riskScore ?? computeRiskScore(user)} showLabel={false} size="sm" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur a risque</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

export default SurveillancePage
