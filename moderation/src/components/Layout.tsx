import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Flag,
  Users,
  UserX,
  ScrollText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Shield,
  Camera,
  FileText,
  Briefcase,
  MessageCircle,
  MessagesSquare,
  Radio,
  Calendar,
  ChevronDown,
  Bell,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Vue d\'ensemble',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Modération',
    items: [
      { label: 'Signalements', href: '/reports', icon: <Flag className="h-4 w-4" />, permission: 'reports:view' },
      { label: 'Utilisateurs', href: '/users', icon: <Users className="h-4 w-4" />, permission: 'users:view' },
      { label: 'Suspendus', href: '/suspended', icon: <UserX className="h-4 w-4" />, permission: 'users:view' },
    ],
  },
  {
    title: 'Contenu',
    items: [
      { label: 'Stories', href: '/stories', icon: <Camera className="h-4 w-4" />, permission: 'content:hide' },
      { label: 'Publications', href: '/publications', icon: <FileText className="h-4 w-4" />, permission: 'content:hide' },
      { label: 'Projets', href: '/projets', icon: <Briefcase className="h-4 w-4" />, permission: 'content:hide' },
      { label: 'Commentaires', href: '/commentaires', icon: <MessageCircle className="h-4 w-4" />, permission: 'content:hide' },
      { label: 'Conversations', href: '/conversations', icon: <MessagesSquare className="h-4 w-4" />, permission: 'users:view' },
      { label: 'Lives', href: '/lives', icon: <Radio className="h-4 w-4" />, permission: 'content:hide' },
      { label: 'Événements', href: '/evenements', icon: <Calendar className="h-4 w-4" />, permission: 'content:hide' },
    ],
  },
  {
    title: 'Système',
    items: [
      { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
      { label: 'Audit Logs', href: '/audit', icon: <ScrollText className="h-4 w-4" />, permission: 'audit:view' },
      { label: 'Staff Chat', href: '/chat', icon: <MessageSquare className="h-4 w-4" />, permission: 'staff:chat' },
    ],
  },
]

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Modérateur Test',
  modo: 'Modérateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur',
}

const roleBorderColors: Record<string, string> = {
  modo_test: 'border-sky-500/50',
  modo: 'border-emerald-500/50',
  admin_modo: 'border-amber-500/50',
  super_admin: 'border-purple-500/50',
  admin: 'border-amber-500/50',
}

function SidebarContent({
  onNavClick,
}: {
  onNavClick?: () => void
}) {
  const { user, logout, hasPermission } = useAuth()
  const location = useLocation()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">Modération LPP</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission as never)
            )
            if (visibleItems.length === 0) return null

            const isCollapsed = collapsedSections[section.title]

            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="mb-1 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <span>{section.title}</span>
                  <motion.div
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {visibleItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                          <li key={item.href} className="relative">
                            {active && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute inset-0 rounded-lg bg-primary/10 border-l-2 border-primary"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              />
                            )}
                            <Link
                              to={item.href}
                              onClick={onNavClick}
                              className={cn(
                                'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                active
                                  ? 'text-primary'
                                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              )}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="border-t p-3">
        <div className={cn(
          'flex items-center gap-3 rounded-lg border p-3 transition-colors',
          roleBorderColors[user?.role || 'user'] || 'border-border'
        )}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.prenom} ${user.nom}`}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary ring-2 ring-primary/20">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium leading-tight">
              {user?.prenom} {user?.nom}
            </p>
            <Badge variant={user?.role as never} className="mt-0.5 text-[10px]">
              {roleLabels[user?.role || 'user']}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion" className="h-8 w-8 shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay + sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r lg:hidden"
            >
              <div className="absolute right-2 top-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarContent onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4 lg:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Modération LPP</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
