import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import api from '@/services/api'
import {
  Bell,
  Send,
  Megaphone,
  Wrench,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { BroadcastNotification, BroadcastBadge } from '@/types'

const badgeConfig: Record<BroadcastBadge, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  actu: {
    label: 'Actualité',
    icon: <Megaphone className="h-4 w-4" />,
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/15 border-blue-500/30',
  },
  maintenance: {
    label: 'Maintenance',
    icon: <Wrench className="h-4 w-4" />,
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/15 border-amber-500/30',
  },
  mise_a_jour: {
    label: 'Mise à jour',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/15 border-emerald-500/30',
  },
  evenement: {
    label: 'Événement',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/15 border-purple-500/30',
  },
  important: {
    label: 'Important',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-300',
    bgColor: 'bg-red-500/15 border-red-500/30',
  },
}

const allBadges: BroadcastBadge[] = ['actu', 'maintenance', 'mise_a_jour', 'evenement', 'important']

export function NotificationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [selectedBadge, setSelectedBadge] = useState<BroadcastBadge>('actu')
  const [showConfirm, setShowConfirm] = useState(false)

  const isAdmin = user?.role === 'admin_modo' || user?.role === 'super_admin'

  const { data: history, isLoading } = useQuery({
    queryKey: ['broadcast-notifications'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications/broadcast')
      return res.data.data?.notifications as BroadcastNotification[]
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/notifications/broadcast', {
        titre,
        message,
        badge: selectedBadge,
      })
    },
    onSuccess: (res) => {
      const count = res.data.data?.recipientCount || 0
      toast.success(`Notification envoyée à ${count} utilisateur${count > 1 ? 's' : ''}`)
      setTitre('')
      setMessage('')
      setSelectedBadge('actu')
      setShowConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['broadcast-notifications'] })
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la notification")
      setShowConfirm(false)
    },
  })

  const canSend = titre.trim().length >= 3 && message.trim().length >= 5

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="p-6">
          <EmptyState
            icon={Bell}
            title="Accès restreint"
            description="Seuls les administrateurs et fondateurs peuvent envoyer des notifications."
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notifications Broadcast
          </h1>
          <p className="text-muted-foreground mt-1">
            Envoyez un message dans le centre de notification de tous les utilisateurs
          </p>
        </div>

        {/* Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Nouvelle notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Titre
              </label>
              <Input
                placeholder="Ex: Maintenance prévue ce soir..."
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                maxLength={100}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">{titre.length}/100</p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Message
              </label>
              <textarea
                placeholder="Écrivez le contenu de la notification..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">{message.length}/500</p>
            </div>

            {/* Badge selector */}
            <div>
              <label className="block text-sm font-medium mb-3 text-muted-foreground">
                Badge de priorité
              </label>
              <div className="flex flex-wrap gap-2">
                {allBadges.map((badge) => {
                  const config = badgeConfig[badge]
                  const isSelected = selectedBadge === badge
                  return (
                    <button
                      key={badge}
                      onClick={() => setSelectedBadge(badge)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                        isSelected
                          ? `${config.bgColor} ${config.color} ring-1 ring-current/30 scale-[1.02]`
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {config.icon}
                      {config.label}
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 ml-1" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Aperçu
              </label>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    badgeConfig[selectedBadge].bgColor
                  )}>
                    <span className={badgeConfig[selectedBadge].color}>
                      {badgeConfig[selectedBadge].icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {titre || 'Titre de la notification'}
                      </span>
                      <span className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border',
                        badgeConfig[selectedBadge].bgColor,
                        badgeConfig[selectedBadge].color
                      )}>
                        {badgeConfig[selectedBadge].label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {message || 'Le message apparaîtra ici...'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      Maintenant
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Send button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend || sendMutation.isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Envoyer à tous les utilisateurs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation dialog */}
        <AnimatePresence>
          {showConfirm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => !sendMutation.isPending && setShowConfirm(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Confirmer l'envoi</h3>
                      <p className="text-sm text-muted-foreground">
                        Cette notification sera envoyée à tous les utilisateurs
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{titre}</span>
                      <span className={cn(
                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                        badgeConfig[selectedBadge].bgColor,
                        badgeConfig[selectedBadge].color
                      )}>
                        {badgeConfig[selectedBadge].label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{message}</p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setShowConfirm(false)}
                      disabled={sendMutation.isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => sendMutation.mutate()}
                      isLoading={sendMutation.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Confirmer l'envoi
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Historique des envois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-20 rounded-lg" />
                ))}
              </div>
            ) : !history?.length ? (
              <EmptyState
                icon={Bell}
                title="Aucune notification envoyée"
                description="Les notifications broadcast apparaîtront ici après envoi."
              />
            ) : (
              <div className="space-y-3">
                {history.map((notif, i) => {
                  const config = badgeConfig[notif.badge] || badgeConfig.actu
                  return (
                    <motion.div
                      key={notif._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        config.bgColor
                      )}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{notif.titre}</span>
                          <span className={cn(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                            config.bgColor,
                            config.color
                          )}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {notif.recipientCount} destinataire{notif.recipientCount > 1 ? 's' : ''}
                          </span>
                          <span>
                            Par {notif.sentBy?.prenom} {notif.sentBy?.nom}
                          </span>
                          <span>{formatRelativeTime(notif.dateCreation)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}

export default NotificationsPage
