import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { ReportsPage } from '@/pages/Reports'
import { ReportDetailPage } from '@/pages/ReportDetail'
import { UsersPage } from '@/pages/Users'
import { UserDetailPage } from '@/pages/UserDetail'
import { SuspendedUsersPage } from '@/pages/SuspendedUsers'
import { AuditPage } from '@/pages/Audit'
import { ChatPage } from '@/pages/Chat'
import { StoriesPage } from '@/pages/Stories'
import { StoryDetailPage } from '@/pages/StoryDetail'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

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
              {/* Dashboard */}
              <Route index element={<DashboardPage />} />

              {/* Reports */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredPermission="reports:view">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports/:id"
                element={
                  <ProtectedRoute requiredPermission="reports:view">
                    <ReportDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Users */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredPermission="users:view">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/:id"
                element={
                  <ProtectedRoute requiredPermission="users:view">
                    <UserDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Suspended Users */}
              <Route
                path="suspended"
                element={
                  <ProtectedRoute requiredPermission="users:view">
                    <SuspendedUsersPage />
                  </ProtectedRoute>
                }
              />

              {/* Stories */}
              <Route
                path="stories"
                element={
                  <ProtectedRoute requiredPermission="content:hide">
                    <StoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="stories/:id"
                element={
                  <ProtectedRoute requiredPermission="content:hide">
                    <StoryDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Audit */}
              <Route
                path="audit"
                element={
                  <ProtectedRoute requiredPermission="audit:view">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />

              {/* Chat */}
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
