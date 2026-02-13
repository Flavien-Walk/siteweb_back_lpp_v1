import { useState, useEffect, useRef, useMemo } from 'react'
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
  Flag,
  Trash2,
  ChevronDown,
  Users,
  Shield,
  Crown,
  Star,
  ExternalLink,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StaffMessage, User } from '@/types'

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
    label: 'Modérateur',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: <Star className="h-3 w-3" />,
  },
  modo_test: {
    label: 'Modérateur Test',
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

// ── Message Bubble ───────────────────────────────────────────

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
      {/* Avatar - only show for first message in group */}
      <div className="w-8 flex-shrink-0">
        {showAuthor && message.author && (
          <Link to={`/users/${message.author._id}`} className="block hover:opacity-80 transition-opacity">
            <UserAvatar user={message.author} size="md" />
          </Link>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col max-w-[65%]', isOwnMessage && 'items-end')}>
        {/* Author name + role (only for first in group) */}
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

        {/* Bubble + time */}
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

          {/* Delete (on hover) */}
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

        {/* Linked report */}
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

// ── Member Sidebar Card ──────────────────────────────────────

function MemberCard({ member, messageCount }: { member: User; messageCount: number }) {
  const cfg = roleConfig[member.role] || roleConfig.modo_test
  return (
    <Link to={`/users/${member._id}`} className="block">
      <div className={cn('flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/80 transition-colors border border-transparent hover:border-border')}>
        <UserAvatar user={member} size="md" />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', cfg.color)}>
            {member.prenom} {member.nom}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <RoleBadge role={member.role} />
          </div>
        </div>
        {messageCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {messageCount} msg
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Main Page ────────────────────────────────────────────────

export function ChatPage() {
  const queryClient = useQueryClient()
  const { user, isAdmin } = useAuth()
  const [newMessage, setNewMessage] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Data queries ───────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-chat'],
    queryFn: () => chatService.getMessages({ limit: 100 }),
    refetchInterval: 5000,
  })

  // Fetch staff members (modo and above)
  const { data: staffData } = useQuery({
    queryKey: ['staff-members'],
    queryFn: () => usersService.getUsers({ limit: 50, role: 'modo' }),
    staleTime: 60000,
  })

  // Also fetch admin_modo and super_admin
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
      setNewMessage('')
      setTimeout(scrollToBottom, 100)
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
  const sortedMessages = useMemo(() => [...messages].reverse(), [messages])

  // Extract unique team members from messages + staff queries
  const teamMembers = useMemo(() => {
    const memberMap = new Map<string, User>()

    // From staff queries
    const allStaff = [
      ...(superData?.items || []),
      ...(adminData?.items || []),
      ...(staffData?.items || []),
      ...(modoTestData?.items || []),
    ]
    for (const u of allStaff) {
      memberMap.set(u._id, u)
    }

    // From messages (as fallback, less complete data)
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
  }, [superData, adminData, staffData, modoTestData, sortedMessages])

  // Count messages per member
  const messageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const msg of sortedMessages) {
      if (msg.author?._id) {
        counts.set(msg.author._id, (counts.get(msg.author._id) || 0) + 1)
      }
    }
    return counts
  }, [sortedMessages])

  // Group messages by date
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

  // ── Effects ────────────────────────────────────────────────

  // Mark as read
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

  // Auto-scroll on initial load
  useEffect(() => {
    if (data && !isLoading) scrollToBottom()
  }, [data, isLoading])

  // ── Handlers ───────────────────────────────────────────────

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newMessage.trim()) sendMutation.mutate(newMessage.trim())
    }
  }

  const canDeleteOthers = isAdmin

  // ── Render ─────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Chat de l'équipe
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
              Équipe
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive flex-shrink-0">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Erreur lors du chargement des messages</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </CardContent>
          </Card>
        )}

        {/* Main layout: Chat + Sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Chat Panel ────────────────────────────────── */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Channel header */}
            <div className="flex items-center gap-2 border-b px-4 py-3 flex-shrink-0">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">général</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                Canal principal de l'équipe de modération
              </span>
            </div>

            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-3"
              onScroll={handleScroll}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">Aucun message</p>
                  <p className="text-sm">Soyez le premier à écrire dans le chat !</p>
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
                          const isOwn = message.author?._id === user?._id

                          return (
                            <div key={message._id} className={showAuthor && idx > 0 ? 'pt-3' : ''}>
                              <MessageBubble
                                message={message}
                                isOwnMessage={isOwn}
                                showAuthor={showAuthor}
                                canDelete={isOwn || canDeleteOthers}
                                onDelete={() => setDeleteTarget(message._id)}
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

            {/* Scroll to bottom */}
            {showScrollButton && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute -top-12 right-4 rounded-full shadow-lg h-8 w-8 p-0"
                  onClick={scrollToBottom}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Input area */}
            <form onSubmit={handleSend} className="border-t p-4 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendMutation.isPending}
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
                  disabled={!newMessage.trim() || sendMutation.isPending}
                  className="h-[42px] px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Entrée pour envoyer · Shift+Entrée pour retour à la ligne
              </p>
            </form>
          </Card>

          {/* ── Members Sidebar ────────────────────────────── */}
          {showMembers && (
            <Card className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 flex-shrink-0 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Équipe ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2">
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p>
                ) : (
                  <div className="space-y-0.5">
                    {/* Group by role */}
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

        {/* Delete confirmation */}
        <ConfirmDialog
          open={deleteTarget !== null}
          title="Supprimer le message"
          description="Ce message sera définitivement supprimé pour tous les membres."
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
