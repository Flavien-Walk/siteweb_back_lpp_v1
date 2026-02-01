import { useState, type FormEvent } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle } from 'lucide-react'

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get error from URL params
  const urlError = searchParams.get('error')
  const suspendedUntil = searchParams.get('until')

  // If already authenticated, redirect to dashboard
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />
  }

  const getErrorMessage = () => {
    switch (urlError) {
      case 'banned':
        return 'Votre compte a été suspendu définitivement.'
      case 'suspended':
        return `Votre compte est suspendu jusqu'au ${suspendedUntil ? new Date(suspendedUntil).toLocaleString('fr-FR') : 'une date ultérieure'}.`
      case 'session_expired':
        return 'Votre session a expiré. Veuillez vous reconnecter.'
      case 'not_staff':
        return 'Accès réservé au personnel de modération.'
      default:
        return null
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = error || getErrorMessage()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Modération LPP</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à l'outil de modération
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Se connecter
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Accès réservé au personnel de modération de La Première Pierre
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
