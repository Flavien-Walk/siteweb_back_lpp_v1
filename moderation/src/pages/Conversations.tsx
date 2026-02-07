import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { conversationsService, type ConversationListParams } from '@/services/conversations'
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
  MessagesSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  AlertTriangle,
  Users,
  User,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const params: ConversationListParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    type: (searchParams.get('type') as 'groupe' | 'prive') || undefined,
    participantId: searchParams.get('participantId') || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', params],
    queryFn: () => conversationsService.getConversations(params),
  })

  const updateParams = (updates: Partial<ConversationListParams>) => {
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

  const hasActiveFilters = params.type || params.participantId

  return (
    <PageTransition>
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessagesSquare className="h-6 w-6" />
            Conversations
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount ?? 0} conversation(s) au total
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
                  onChange={(e) => updateParams({ type: (e.target.value as 'groupe' | 'prive') || undefined })}
                >
                  <option value="">Toutes</option>
                  <option value="prive">Privées</option>
                  <option value="groupe">Groupes</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ID Participant</label>
                <Input
                  placeholder="ID d'un participant"
                  value={params.participantId || ''}
                  onChange={(e) => updateParams({ participantId: e.target.value || undefined })}
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
              <MessagesSquare className="h-8 w-8 mb-2" />
              <p>Aucune conversation trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Dernier message</TableHead>
                  <TableHead>Mise à jour</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((conv) => (
                  <TableRow key={conv._id}>
                    <TableCell>
                      {conv.estGroupe ? (
                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          Groupe
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <User className="mr-1 h-3 w-3" />
                          Privée
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {conv.estGroupe && conv.nomGroupe && (
                          <span className="font-medium text-sm">{conv.nomGroupe}</span>
                        )}
                        <div className="flex -space-x-2">
                          {conv.participants.slice(0, 5).map((p) => (
                            <Link key={p._id} to={`/users/${p._id}`} title={`${p.prenom} ${p.nom}`}>
                              {p.avatar ? (
                                <img src={p.avatar} alt="" className="w-7 h-7 rounded-full border-2 border-background" />
                              ) : (
                                <div className="w-7 h-7 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                                  {p.prenom?.[0]}{p.nom?.[0]}
                                </div>
                              )}
                            </Link>
                          ))}
                          {conv.participants.length > 5 && (
                            <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px]">
                              +{conv.participants.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.participants.length} participant(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-[200px] truncate text-muted-foreground">
                        {conv.dernierMessage?.contenuCrypte || '(aucun message)'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(conv.dateMiseAJour)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(conv.dateCreation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/conversations/${conv._id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
