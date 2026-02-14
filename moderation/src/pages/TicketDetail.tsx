import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { ticketsService } from '@/services/tickets'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  Tag,
} from 'lucide-react'
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

function StatusBadge({ status }: { status: TicketStatus }) {
  const colors: Record<TicketStatus, string> = {
    en_attente: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    en_cours: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    termine: 'bg-green-500/10 text-green-400 border-green-500/30',
  }
  return (
    <Badge className={colors[status]}>
      {statusLabels[status]}
    </Badge>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const canRespond = hasPermission('tickets:respond' as never)

  const { data: ticket, isLoading, error, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsService.getTicket(id!),
    enabled: !!id,
  })

  const respondMutation = useMutation({
    mutationFn: (content: string) => ticketsService.respondToTicket(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setReplyContent('')
      toast.success('Réponse envoyée')
    },
    onError: (error: Error) => {
      toast.error('Erreur', { description: error.message })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsService.changeStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Statut mis à jour')
    },
    onError: (error: Error) => {
      toast.error('Erreur', { description: error.message })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    respondMutation.mutate(replyContent.trim())
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted mb-6" />
          <div className="h-96 animate-pulse rounded bg-muted" />
        </div>
      </PageTransition>
    )
  }

  if (error || !ticket) {
    return (
      <PageTransition>
        <div className="p-6">
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Ticket non trouvé ou erreur de chargement</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux tickets
            </Link>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusBadge status={ticket.status} />
              <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
              <Badge variant={ticket.priority === 'high' ? 'destructive' as never : 'secondary' as never} className="text-xs">
                {priorityLabels[ticket.priority]}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Conversation */}
          <Card className="flex flex-col" style={{ minHeight: '500px' }}>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '600px' }}>
              {ticket.messages.map((msg, i) => {
                const isStaff = msg.senderRole === 'staff'
                return (
                  <div key={msg._id || i} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg p-3 ${
                      isStaff
                        ? 'bg-primary/15 border border-primary/20'
                        : 'bg-card border border-border'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt="" className="h-5 w-5 rounded-full" />
                        ) : (
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                            isStaff ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {msg.sender?.prenom?.[0]}
                          </div>
                        )}
                        <span className="text-xs font-medium">
                          {msg.sender?.prenom} {msg.sender?.nom}
                        </span>
                        {isStaff && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Staff</Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(msg.dateCreation).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Reply box */}
            {canRespond && ticket.status !== 'termine' && (
              <div className="border-t p-4">
                <form onSubmit={handleSubmitReply} className="flex gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Écrire une réponse..."
                    rows={2}
                    className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={respondMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!replyContent.trim() || respondMutation.isPending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}

            {ticket.status === 'termine' && (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                Ce ticket est terminé. Aucune réponse supplémentaire possible.
              </div>
            )}

            {!canRespond && ticket.status !== 'termine' && (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                Vous n'avez pas la permission de répondre aux tickets.
              </div>
            )}
          </Card>

          {/* Sidebar info */}
          <div className="space-y-4">
            {/* User info */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={`/users/${ticket.user._id}`} className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
                  {ticket.user.avatar ? (
                    <img src={ticket.user.avatar} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {ticket.user.prenom?.[0]}{ticket.user.nom?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{ticket.user.prenom} {ticket.user.nom}</p>
                    {ticket.user.email && (
                      <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Détails
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Catégorie</p>
                  <Badge variant="outline" className="mt-1">{categoryLabels[ticket.category]}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priorité</p>
                  <Badge variant={ticket.priority === 'high' ? 'destructive' as never : 'secondary' as never} className="mt-1 text-xs">
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigné à</p>
                  <p className="text-sm mt-1">
                    {ticket.assignedTo ? `${ticket.assignedTo.prenom} ${ticket.assignedTo.nom}` : 'Non assigné'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Créé le</p>
                  <p className="text-sm">{new Date(ticket.dateCreation).toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dernière MAJ</p>
                  <p className="text-sm">{new Date(ticket.dateMiseAJour).toLocaleString('fr-FR')}</p>
                </div>
                {ticket.dateFermeture && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fermé le</p>
                    <p className="text-sm">{new Date(ticket.dateFermeture).toLocaleString('fr-FR')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions (only for staff with respond permission) */}
            {canRespond && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Changer le statut</label>
                    <Select
                      value={ticket.status}
                      onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
                      disabled={statusMutation.isPending}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

export default TicketDetailPage
