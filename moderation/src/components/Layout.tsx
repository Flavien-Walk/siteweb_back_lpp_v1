import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
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
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: string
  badge?: string
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Signalements',
    href: '/reports',
    icon: <Flag className="h-5 w-5" />,
    permission: 'reports:view',
  },
  {
    label: 'Utilisateurs',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    permission: 'users:view',
  },
  {
    label: 'Suspendus',
    href: '/suspended',
    icon: <UserX className="h-5 w-5" />,
    permission: 'users:view',
  },
  {
    label: 'Audit Logs',
    href: '/audit',
    icon: <ScrollText className="h-5 w-5" />,
    permission: 'audit:view',
  },
  {
    label: 'Staff Chat',
    href: '/chat',
    icon: <MessageSquare className="h-5 w-5" />,
    permission: 'staff:chat',
  },
]

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Modo Test',
  modo: 'Modérateur',
  admin_modo: 'Admin Modo',
  super_admin: 'Super Admin',
}

export function Layout() {
  const { user, logout, hasPermission } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission as never)
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold">Modération LPP</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.prenom} ${user.nom}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {user?.prenom?.[0]}
                  {user?.nom?.[0]}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {user?.prenom} {user?.nom}
                </p>
                <Badge variant={user?.role as never} className="text-xs">
                  {roleLabels[user?.role || 'user']}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Modération LPP</span>
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
