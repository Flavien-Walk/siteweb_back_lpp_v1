import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatService } from '@/services/chat'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Send,
  AlertTriangle,
  RefreshCw,
  Flag,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { StaffMessage } from '@/types'

const roleColors: Record<string, string> = {
  modo_test: 'text-blue-500',
  modo: 'text-green-500',
  admin_modo: 'text-amber-500',
  super_admin: 'text-red-500',
}

const roleLabels: Record<string, string> = {
  modo_test: 'Modo Test',
  modo: 'Modérateur',
  admin_modo: 'Admin Modo',
  super_admin: 'Super Admin',
}

function MessageBubble({
  message,
  isOwnMessage,
  onDelete,
  canDelete,
}: {
  message: StaffMessage
  isOwnMessage: boolean
  onDelete?: () => void
  canDelete: boolean
}) {
  return (
    <div className={cn('flex gap-3', isOwnMessage && 'flex-row-reverse')}>
      {/* Avatar */}
      {message.author?.avatar ? (
        <img
          src={message.author.avatar}
          alt=""
          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium flex-shrink-0">
          {message.author?.prenom?.[0]}{message.author?.nom?.[0]}
        </div>
      )}

      {/* Message content */}
      <div className={cn('flex flex-col max-w-[70%]', isOwnMessage && 'items-end')}>
        {/* Author info */}
        <div className={cn('flex items-center gap-2 mb-1', isOwnMessage && 'flex-row-reverse')}>
          <span className={cn('text-sm font-medium', roleColors[message.author?.role || ''])}>
            {message.author?.prenom} {message.author?.nom}
          </span>
          <Badge variant="outline" className="text-xs">
            {roleLabels[message.author?.role || ''] || message.author?.role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Linked report */}
        {message.linkedReport && (
          <Link
            to={`/reports/${message.linkedReport._id}`}
            className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Flag className="h-3 w-3" />
            Signalement #{message.linkedReport._id.slice(-8)}
          </Link>
        )}

        {/* Delete button */}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer
          </Button>
        )}
      </div>
    </div>
  )
}

export function ChatPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuth()
  const [newMessage, setNewMessage] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Fetch messages
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff-chat'],
    queryFn: () => chatService.getMessages({ limit: 100 }),
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat'] })
      setNewMessage('')
      scrollToBottom()
    },
  })

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat'] })
    },
  })

  // Mark as read on mount
  useEffect(() => {
    chatService.markAsRead()
  }, [])

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }

  // Auto-scroll on initial load
  useEffect(() => {
    if (data && !isLoading) {
      scrollToBottom()
    }
  }, [data, isLoading])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage)
  }

  const canDeleteOthers = hasPermission('staff:admin')
  const messages = data?.items || []

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Staff Chat
          </h1>
          <p className="text-muted-foreground">
            Communication interne de l'équipe de modération
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Erreur lors du chargement des messages
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-2" />
              <p>Aucun message pour le moment</p>
              <p className="text-sm">Commencez la conversation !</p>
            </div>
          ) : (
            <>
              {[...messages].reverse().map((message) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwnMessage={message.author?._id === user?._id}
                  canDelete={
                    message.author?._id === user?._id || canDeleteOthers
                  }
                  onDelete={() => deleteMutation.mutate(message._id)}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-24 right-8 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Écrire un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Appuyez sur Entrée pour envoyer. Ce chat est visible par toute l'équipe de modération.
          </p>
        </form>
      </Card>
    </div>
  )
}

export default ChatPage
