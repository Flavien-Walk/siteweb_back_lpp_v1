import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

// Placeholder pages for now
function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Signalements</h1>
      <p className="text-muted-foreground">Page en cours de développement...</p>
    </div>
  )
}

function UsersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Utilisateurs</h1>
      <p className="text-muted-foreground">Page en cours de développement...</p>
    </div>
  )
}

function AuditPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <p className="text-muted-foreground">Page en cours de développement...</p>
    </div>
  )
}

function ChatPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Staff Chat</h1>
      <p className="text-muted-foreground">Page en cours de développement...</p>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page non trouvée</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">
          Retour au dashboard
        </a>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route
                path="reports/*"
                element={
                  <ProtectedRoute requiredPermission="reports:view">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/*"
                element={
                  <ProtectedRoute requiredPermission="users:view">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/*"
                element={
                  <ProtectedRoute requiredPermission="audit:view">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="chat"
                element={
                  <ProtectedRoute requiredPermission="staff:chat">
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
