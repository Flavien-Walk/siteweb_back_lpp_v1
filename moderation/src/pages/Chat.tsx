import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatService } from '@/services/chat'
import { usersService } from '@/services/users'
import { PageTransition } from '@/components/PageTransition'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Send,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ChevronDown,
  Users,
  Shield,
  Crown,
  Star,
  ExternalLink,
  Flag,
  Hash,
  Mail,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StaffMessage, DMConversation, User } from '@/types'

// ── Role config ──────────────────────────────────────────────

const roleConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  super_admin: {
    label: 'Fondateur',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: <Crown className="h-3 w-3" />,
  },
  admin_modo: {
    label: 'Administrateur',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: <Shield className="h-3 w-3" />,
  },
  modo: {
    label: 'Moderateur',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: <Star className="h-3 w-3" />,
  },
  modo_test: {
    label: 'Moderateur Test',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: <Star className="h-3 w-3" />,
  },
}

const rolePriority: Record<string, number> = {
  super_admin: 0,
  admin_modo: 1,
  modo: 2,
  modo_test: 3,
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000)

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long' })
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatRelativeShort(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Avatar ───────────────────────────────────────────────────

function UserAvatar({ user, size = 'md' }: { user: { prenom?: string; nom?: string; avatar?: string; role?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  const cfg = roleConfig[user.role || '']
  const ringColor = cfg ? cfg.borderColor : 'border-zinc-600'

  if (user.avatar) {
    return <img src={user.avatar} alt="" className={cn(sizes[size], 'rounded-full object-cover ring-2 flex-shrink-0', ringColor)} />
  }
  return (
    <div className={cn(sizes[size], 'flex items-center justify-center rounded-full font-medium flex-shrink-0 ring-2', cfg?.bgColor || 'bg-primary/10', ringColor)}>
      {user.prenom?.[0]}{user.nom?.[0]}
    </div>
  )
}

// ── Role Badge ───────────────────────────────────────────────

function RoleBadge({ role }: { role?: string }) {
  const cfg = roleConfig[role || '']
  if (!cfg) return null
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border', cfg.bgColor, cfg.borderColor, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Message Bubble (shared for group + DM) ───────────────────

function MessageBubble({
  message,
  isOwnMessage,
  showAuthor,
  onDelete,
  canDelete,
}: {
  message: StaffMessage
  isOwnMessage: boolean
  showAuthor: boolean
  onDelete?: () => void
  canDelete: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const cfg = roleConfig[message.author?.role || '']

  return (
    <div
      className={cn('flex gap-2.5', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAuthor && message.author && (
          <Link to={`/users/${message.author._id}`} className="block hover:opacity-80 transition-opacity">
            <UserAvatar user={message.author} size="md" />
          </Link>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col max-w-[65%]', isOwnMessage && 'items-end')}>
        {showAuthor && (
          <div className={cn('flex items-center gap-2 mb-1', isOwnMessage && 'flex-row-reverse')}>
            <Link
              to={`/users/${message.author?._id}`}
              className={cn('text-sm font-semibold hover:underline', cfg?.color || 'text-foreground')}
            >
              {message.author?.prenom} {message.author?.nom}
            </Link>
            <RoleBadge role={message.author?.role} />
          </div>
        )}

        <div className={cn('flex items-end gap-2', isOwnMessage && 'flex-row-reverse')}>
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm',
              isOwnMessage
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted rounded-bl-md'
            )}
          >
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          </div>

          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 pb-0.5">
            {formatMessageTime(message.dateCreation)}
          </span>

          {canDelete && showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {message.linkedReport && (
          <Link
            to={`/reports/${message.linkedReport._id}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <Flag className="h-3 w-3" />
            Signalement #{message.linkedReport._id.slice(-8)}
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Date Separator ───────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Message List (reusable for group + DM) ───────────────────

function MessageList({
  messages,
  userId,
  isAdmin,
  onDelete,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: {
  messages: StaffMessage[]
  userId?: string
  isAdmin: boolean
  onDelete: (id: string) => void
  isLoading: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptySubtitle?: string
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const sortedMessages = useMemo(() => [...messages].reverse(), [messages])

  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; dateStr: string; messages: StaffMessage[] }[] = []
    let currentKey = ''
    for (const msg of sortedMessages) {
      const key = getDateKey(msg.dateCreation)
      if (key !== currentKey) {
        currentKey = key
        groups.push({ dateKey: key, dateStr: msg.dateCreation, messages: [] })
      }
      groups[groups.length - 1].messages.push(msg)
    }
    return groups
  }, [sortedMessages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [messages.length, isLoading, scrollToBottom])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            {emptyIcon || <MessageSquare className="h-12 w-12 mb-3 opacity-30" />}
            <p className="font-medium">{emptyTitle || 'Aucun message'}</p>
            <p className="text-sm">{emptySubtitle || 'Soyez le premier a ecrire !'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((group) => (
              <div key={group.dateKey}>
                <DateSeparator date={group.dateStr} />
                <div className="space-y-1">
                  {group.messages.map((message, idx) => {
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                    const showAuthor = !prevMsg || prevMsg.author?._id !== message.author?._id
                    const isOwn = message.author?._id === userId

                    return (
                      <div key={message._id} className={showAuthor && idx > 0 ? 'pt-3' : ''}>
                        <MessageBubble
                          message={message}
                          isOwnMessage={isOwn}
                          showAuthor={showAuthor}
                          canDelete={isOwn || isAdmin}
                          onDelete={() => onDelete(message._id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showScrollButton && (
        <div className="absolute bottom-0 right-4">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg h-8 w-8 p-0"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Chat Input ───────────────────────────────────────────────

function ChatInput({
  onSend,
  isPending,
  placeholder,
}: {
  onSend: (content: string) => void
  isPending: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
    if (inputRef.current) {
      inputRef.current.style.height = '42px'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend(value.trim())
        setValue('')
        if (inputRef.current) {
          inputRef.current.style.height = '42px'
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 flex-shrink-0">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            placeholder={placeholder || 'Ecrire un message...'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            rows={1}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 max-h-32"
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = '42px'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || isPending}
          className="h-[42px] px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Entree pour envoyer · Shift+Entree pour retour a la ligne
      </p>
    </form>
  )
}

// ── DM Conversation Item ─────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: DMConversation
  isActive: boolean
  onClick: () => void
}) {
  const cfg = roleConfig[conversation.user.role || '']

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors',
        isActive
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/80 border border-transparent hover:border-border'
      )}
    >
      <div className="relative">
        <UserAvatar user={conversation.user} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn('text-sm font-medium truncate', cfg?.color || 'text-foreground')}>
            {conversation.user.prenom} {conversation.user.nom}
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
            {formatRelativeShort(conversation.lastMessage.dateCreation)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
            {conversation.lastMessage.content}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-[16px] px-1">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Member Card (sidebar) ────────────────────────────────────

function MemberCard({
  member,
  messageCount,
  onStartDM,
  currentUserId,
}: {
  member: User
  messageCount: number
  onStartDM: (userId: string) => void
  currentUserId?: string
}) {
  const cfg = roleConfig[member.role] || roleConfig.modo_test
  const isSelf = member._id === currentUserId

  return (
    <div className={cn('flex items-center gap-3 rounded-lg p-2.5 transition-colors border border-transparent hover:border-border', !isSelf && 'hover:bg-muted/80')}>
      <Link to={`/users/${member._id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
        <UserAvatar user={member} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/users/${member._id}`} className="block">
          <p className={cn('text-sm font-medium truncate', cfg.color)}>
            {member.prenom} {member.nom}
            {isSelf && <span className="text-muted-foreground font-normal"> (vous)</span>}
          </p>
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          <RoleBadge role={member.role} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {messageCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {messageCount}
          </span>
        )}
        {!isSelf && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={() => onStartDM(member._id)}
            title={`Envoyer un message prive a ${member.prenom}`}
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── DM Thread View ──────────────────────────────────────────

function DMThreadView({
  userId,
  onBack,
  currentUserId,
  isAdmin,
}: {
  userId: string
  onBack: () => void
  currentUserId?: string
  isAdmin: boolean
}) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['dm-messages', userId],
    queryFn: () => chatService.getDMMessages(userId, { limit: 100 }),
    refetchInterval: 5000,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatService.sendDM(userId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', userId] })
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', userId] })
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] })
      setDeleteTarget(null)
    },
  })

  // Auto-mark as read
  useEffect(() => {
    if (!data?.messages?.length || !currentUserId) return
    const unreadIds = data.messages
      .filter(msg => msg.author?._id !== currentUserId && !markedAsReadRef.current.has(msg._id))
      .map(msg => msg._id)
    if (unreadIds.length > 0) {
      chatService.markAsRead(unreadIds)
      unreadIds.forEach(id => markedAsReadRef.current.add(id))
    }
  }, [data?.messages, currentUserId])

  const otherUser = data?.otherUser
  const cfg = roleConfig[otherUser?.role || '']

  return (
    <div className="flex flex-col h-full">
      {/* DM Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 flex-shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {otherUser && (
          <>
            <Link to={`/users/${otherUser._id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <UserAvatar user={otherUser} size="md" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/users/${otherUser._id}`} className="block hover:underline">
                <p className={cn('text-sm font-semibold', cfg?.color || 'text-foreground')}>
                  {otherUser.prenom} {otherUser.nom}
                </p>
              </Link>
              <RoleBadge role={otherUser.role} />
            </div>
          </>
        )}
        {!otherUser && !isLoading && (
          <span className="text-sm text-muted-foreground">Conversation privee</span>
        )}
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Erreur lors du chargement
        </div>
      )}

      <MessageList
        messages={data?.messages || []}
        userId={currentUserId}
        isAdmin={isAdmin}
        onDelete={setDeleteTarget}
        isLoading={isLoading}
        emptyIcon={<Mail className="h-12 w-12 mb-3 opacity-30" />}
        emptyTitle="Pas encore de messages"
        emptySubtitle={otherUser ? `Envoyez un message a ${otherUser.prenom}` : 'Demarrez la conversation'}
      />

      <ChatInput
        onSend={(content) => sendMutation.mutate(content)}
        isPending={sendMutation.isPending}
        placeholder={otherUser ? `Message a ${otherUser.prenom}...` : 'Ecrire un message...'}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le message"
        description="Ce message sera definitivement supprime."
        variant="destructive"
        confirmLabel="Supprimer"
        isLoading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

type ChatTab = 'group' | 'dm'

export function ChatPage() {
  const queryClient = useQueryClient()
  const { user, isAdmin } = useAuth()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(true)
  const [activeTab, setActiveTab] = useState<ChatTab>('group')
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())

  // ── Data queries ─────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-chat'],
    queryFn: () => chatService.getMessages({ limit: 100 }),
    refetchInterval: 5000,
  })

  // DM conversations
  const { data: dmConversations = [] } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: () => chatService.getDMConversations(),
    refetchInterval: 10000,
  })

  // Staff members
  const { data: staffData } = useQuery({
    queryKey: ['staff-members'],
    queryFn: () => usersService.getUsers({ limit: 50, role: 'modo' }),
    staleTime: 60000,
  })
  const { data: adminData } = useQuery({
    queryKey: ['staff-admins'],
    queryFn: () => usersService.getUsers({ limit: 50, role: 'admin_modo' }),
    staleTime: 60000,
  })
  const { data: superData } = useQuery({
    queryKey: ['staff-supers'],
    queryFn: () => usersService.getUsers({ limit: 50, role: 'super_admin' }),
    staleTime: 60000,
  })
  const { data: modoTestData } = useQuery({
    queryKey: ['staff-modo-test'],
    queryFn: () => usersService.getUsers({ limit: 50, role: 'modo_test' }),
    staleTime: 60000,
  })

  // ── Mutations ──────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat'] })
      setDeleteTarget(null)
    },
  })

  // ── Computed data ──────────────────────────────────────────

  const messages = data?.items || []

  const teamMembers = useMemo(() => {
    const memberMap = new Map<string, User>()
    const allStaff = [
      ...(superData?.items || []),
      ...(adminData?.items || []),
      ...(staffData?.items || []),
      ...(modoTestData?.items || []),
    ]
    for (const u of allStaff) {
      memberMap.set(u._id, u)
    }
    // Fallback from messages
    const sortedMessages = [...messages].reverse()
    for (const msg of sortedMessages) {
      if (msg.author && !memberMap.has(msg.author._id)) {
        memberMap.set(msg.author._id, {
          _id: msg.author._id,
          prenom: msg.author.prenom,
          nom: msg.author.nom,
          avatar: msg.author.avatar,
          role: (msg.author.role || 'modo_test') as User['role'],
          email: '',
          permissions: [],
          dateCreation: '',
        })
      }
    }
    return Array.from(memberMap.values()).sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99
      const pb = rolePriority[b.role] ?? 99
      if (pa !== pb) return pa - pb
      return a.prenom.localeCompare(b.prenom)
    })
  }, [superData, adminData, staffData, modoTestData, messages])

  const messageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const sorted = [...messages].reverse()
    for (const msg of sorted) {
      if (msg.author?._id) {
        counts.set(msg.author._id, (counts.get(msg.author._id) || 0) + 1)
      }
    }
    return counts
  }, [messages])

  // Total DM unread
  const totalDMUnread = useMemo(() => {
    return dmConversations.reduce((sum, c) => sum + c.unreadCount, 0)
  }, [dmConversations])

  // ── Effects ──────────────────────────────────────────────

  useEffect(() => {
    if (!data?.items?.length || !user?._id) return
    const unreadIds = data.items
      .filter(msg => msg.author?._id !== user._id && !markedAsReadRef.current.has(msg._id))
      .map(msg => msg._id)
    if (unreadIds.length > 0) {
      chatService.markAsRead(unreadIds)
      unreadIds.forEach(id => markedAsReadRef.current.add(id))
    }
  }, [data?.items, user?._id])

  // ── Handlers ──────────────────────────────────────────────

  const handleStartDM = (userId: string) => {
    setActiveTab('dm')
    setActiveDMUser(userId)
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Chat de l'equipe
            </h1>
            <p className="text-sm text-muted-foreground">
              Espace de communication interne · {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showMembers ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users className="mr-2 h-4 w-4" />
              Equipe
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && activeTab === 'group' && (
          <Card className="border-destructive flex-shrink-0">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Erreur lors du chargement des messages</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Reessayer</Button>
            </CardContent>
          </Card>
        )}

        {/* Main layout */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Chat Panel ──────────────────────────────── */}
          <Card className="flex-1 flex flex-col overflow-hidden">

            {/* Tabs: General / Messages prives */}
            <div className="flex border-b flex-shrink-0">
              <button
                onClick={() => { setActiveTab('group'); setActiveDMUser(null) }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'group'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Hash className="h-4 w-4" />
                General
              </button>
              <button
                onClick={() => { setActiveTab('dm'); setActiveDMUser(null) }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'dm'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Mail className="h-4 w-4" />
                Messages prives
                {totalDMUnread > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-[16px] px-1">
                    {totalDMUnread}
                  </span>
                )}
              </button>
            </div>

            {/* ── Tab content ── */}
            {activeTab === 'group' ? (
              <>
                <MessageList
                  messages={messages}
                  userId={user?._id}
                  isAdmin={isAdmin}
                  onDelete={setDeleteTarget}
                  isLoading={isLoading}
                  emptyTitle="Aucun message"
                  emptySubtitle="Soyez le premier a ecrire dans le chat !"
                />
                <ChatInput
                  onSend={(content) => sendMutation.mutate(content)}
                  isPending={sendMutation.isPending}
                  placeholder="Ecrire un message..."
                />
              </>
            ) : activeDMUser ? (
              <DMThreadView
                userId={activeDMUser}
                onBack={() => setActiveDMUser(null)}
                currentUserId={user?._id}
                isAdmin={isAdmin}
              />
            ) : (
              /* DM Conversation List */
              <div className="flex-1 overflow-y-auto">
                {dmConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Mail className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">Aucune conversation privee</p>
                    <p className="text-sm mt-1">Cliquez sur l'icone <Mail className="h-3.5 w-3.5 inline" /> dans la liste des membres pour demarrer</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2.5 mb-2">
                      Conversations ({dmConversations.length})
                    </p>
                    {dmConversations.map((conv) => (
                      <ConversationItem
                        key={conv._id}
                        conversation={conv}
                        isActive={false}
                        onClick={() => setActiveDMUser(conv.user._id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Members Sidebar ──────────────────────────── */}
          {showMembers && (
            <Card className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 flex-shrink-0 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipe ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2">
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p>
                ) : (
                  <div className="space-y-0.5">
                    {(['super_admin', 'admin_modo', 'modo', 'modo_test'] as const).map((role) => {
                      const members = teamMembers.filter(m => m.role === role)
                      if (members.length === 0) return null
                      const cfg = roleConfig[role]
                      return (
                        <div key={role} className="mb-3">
                          <p className={cn('text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1.5', cfg.color)}>
                            {cfg.label}s — {members.length}
                          </p>
                          {members.map((member) => (
                            <MemberCard
                              key={member._id}
                              member={member}
                              messageCount={messageCounts.get(member._id) || 0}
                              onStartDM={handleStartDM}
                              currentUserId={user?._id}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete confirmation (group chat) */}
        <ConfirmDialog
          open={deleteTarget !== null}
          title="Supprimer le message"
          description="Ce message sera definitivement supprime pour tous les membres."
          variant="destructive"
          confirmLabel="Supprimer"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </PageTransition>
  )
}

export default ChatPage
