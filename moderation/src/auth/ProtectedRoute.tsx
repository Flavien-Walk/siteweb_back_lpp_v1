import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Permission } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: Permission
  requiredPermissions?: Permission[]
  requireAny?: boolean // If true, require any of the permissions. If false (default), require all.
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAny = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuth()
  const location = useLocation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <PermissionDenied permission={requiredPermission} />
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequired = requireAny
      ? hasAnyPermission(requiredPermissions)
      : hasAllPermissions(requiredPermissions)

    if (!hasRequired) {
      return <PermissionDenied permissions={requiredPermissions} />
    }
  }

  return <>{children}</>
}

function PermissionDenied({
  permission,
  permissions,
}: {
  permission?: Permission
  permissions?: Permission[]
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <h2 className="mt-2 text-xl font-semibold">Accès refusé</h2>
        <p className="mt-2 text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        {(permission || permissions) && (
          <p className="mt-1 text-sm text-muted-foreground">
            Permission(s) requise(s) :{' '}
            <code className="rounded bg-muted px-1">
              {permission || permissions?.join(', ')}
            </code>
          </p>
        )}
        <a
          href="/"
          className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
        >
          Retour au dashboard
        </a>
      </div>
    </div>
  )
}

export default ProtectedRoute
