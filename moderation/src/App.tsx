import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'

// Lazy-loaded pages — each chunk loads only when navigated to
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const ReportsPage = lazy(() => import('@/pages/Reports'))
const ReportDetailPage = lazy(() => import('@/pages/ReportDetail'))
const UsersPage = lazy(() => import('@/pages/Users'))
const UserDetailPage = lazy(() => import('@/pages/UserDetail'))
const SuspendedUsersPage = lazy(() => import('@/pages/SuspendedUsers'))
const AuditPage = lazy(() => import('@/pages/Audit'))
const ChatPage = lazy(() => import('@/pages/Chat'))
const StoriesPage = lazy(() => import('@/pages/Stories'))
const StoryDetailPage = lazy(() => import('@/pages/StoryDetail'))
const PublicationsPage = lazy(() => import('@/pages/Publications'))
const PublicationDetailPage = lazy(() => import('@/pages/PublicationDetail'))
const ProjetsPage = lazy(() => import('@/pages/Projets'))
const ProjetDetailPage = lazy(() => import('@/pages/ProjetDetail'))
const CommentairesPage = lazy(() => import('@/pages/Commentaires'))
const ConversationsPage = lazy(() => import('@/pages/Conversations'))
const ConversationDetailPage = lazy(() => import('@/pages/ConversationDetail'))
const LivesPage = lazy(() => import('@/pages/Lives'))
const EvenementsPage = lazy(() => import('@/pages/Evenements'))
const NotificationsPage = lazy(() => import('@/pages/Notifications'))
const SurveillancePage = lazy(() => import('@/pages/Surveillance'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
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
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Lazy><DashboardPage /></Lazy>} />

              <Route path="reports" element={<ProtectedRoute requiredPermission="reports:view"><Lazy><ReportsPage /></Lazy></ProtectedRoute>} />
              <Route path="reports/:id" element={<ProtectedRoute requiredPermission="reports:view"><Lazy><ReportDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="users" element={<ProtectedRoute requiredPermission="users:view"><Lazy><UsersPage /></Lazy></ProtectedRoute>} />
              <Route path="users/:id" element={<ProtectedRoute requiredPermission="users:view"><Lazy><UserDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="suspended" element={<ProtectedRoute requiredPermission="users:view"><Lazy><SuspendedUsersPage /></Lazy></ProtectedRoute>} />

              <Route path="surveillance" element={<ProtectedRoute requiredPermission="users:view"><Lazy><SurveillancePage /></Lazy></ProtectedRoute>} />

              <Route path="stories" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><StoriesPage /></Lazy></ProtectedRoute>} />
              <Route path="stories/:id" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><StoryDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="publications" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><PublicationsPage /></Lazy></ProtectedRoute>} />
              <Route path="publications/:id" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><PublicationDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="projets" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><ProjetsPage /></Lazy></ProtectedRoute>} />
              <Route path="projets/:id" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><ProjetDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="commentaires" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><CommentairesPage /></Lazy></ProtectedRoute>} />

              <Route path="conversations" element={<ProtectedRoute requiredPermission="users:view"><Lazy><ConversationsPage /></Lazy></ProtectedRoute>} />
              <Route path="conversations/:id" element={<ProtectedRoute requiredPermission="users:view"><Lazy><ConversationDetailPage /></Lazy></ProtectedRoute>} />

              <Route path="lives" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><LivesPage /></Lazy></ProtectedRoute>} />

              <Route path="evenements" element={<ProtectedRoute requiredPermission="content:hide"><Lazy><EvenementsPage /></Lazy></ProtectedRoute>} />

              <Route path="audit" element={<ProtectedRoute requiredPermission="audit:view"><Lazy><AuditPage /></Lazy></ProtectedRoute>} />

              <Route path="notifications" element={<Lazy><NotificationsPage /></Lazy>} />

              <Route path="chat" element={<ProtectedRoute requiredPermission="staff:chat"><Lazy><ChatPage /></Lazy></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: 'hsl(220, 26%, 8%)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'hsl(225, 100%, 96%)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
