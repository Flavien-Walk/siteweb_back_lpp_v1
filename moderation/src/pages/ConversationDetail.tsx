import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { conversationsService } from '@/services/conversations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  MessagesSquare,
  Users,
  User,
  Image,
  Video,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export function ConversationDetailPage() {
  const { id } = useParams()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationsService.getConversationMessages(id!, { limit: 100 }),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>Erreur lors du chargement de la conversation</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Réessayer</Button>
      </div>
    )
  }

  const { conversation, messages } = data

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/conversations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Retour aux conversations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessagesSquare className="h-6 w-6" />
              {conversation.estGroupe ? (conversation.nomGroupe || 'Groupe') : 'Conversation privée'}
            </h1>
            <p className="text-muted-foreground">
              {conversation.participants.length} participant(s) - {messages.length} message(s)
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Messages (lecture seule)</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun message</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {[...messages].reverse().map((msg) => (
                    <div key={msg._id} className="flex gap-3">
                      <Link to={`/users/${msg.expediteur._id}`}>
                        {msg.expediteur.avatar ? (
                          <img src={msg.expediteur.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {msg.expediteur.prenom?.[0]}{msg.expediteur.nom?.[0]}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link to={`/users/${msg.expediteur._id}`} className="text-sm font-medium hover:underline">
                            {msg.expediteur.prenom} {msg.expediteur.nom}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(msg.dateCreation)}
                          </span>
                          {msg.type !== 'texte' && (
                            <Badge variant="outline" className="text-xs">
                              {msg.type === 'image' && <><Image className="mr-1 h-3 w-3" />Image</>}
                              {msg.type === 'video' && <><Video className="mr-1 h-3 w-3" />Vidéo</>}
                              {msg.type === 'systeme' && 'Système'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-0.5 break-words">
                          {msg.contenu || msg.contenuCrypte || '(message chiffré)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {conversation.estGroupe ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conversation.participants.map((p) => (
                  <Link key={p._id} to={`/users/${p._id}`} className="flex items-center gap-2 hover:bg-accent rounded-lg p-1 -m-1">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {p.prenom?.[0]}{p.nom?.[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{conversation.estGroupe ? 'Groupe' : 'Privée'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée le</span>
                <span>{formatDate(conversation.dateCreation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mise à jour</span>
                <span>{formatRelativeTime(conversation.dateMiseAJour)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
