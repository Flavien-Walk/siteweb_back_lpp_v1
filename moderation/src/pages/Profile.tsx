import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { profilService } from '@/services/profil'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  User, Camera, Save, Loader2, KeyRound, Eye, EyeOff, Check, X,
} from 'lucide-react'

const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur Test',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
}

const roleBorderColors: Record<string, string> = {
  modo_test: 'border-sky-500/30',
  modo: 'border-emerald-500/30',
  admin_modo: 'border-amber-500/30',
  super_admin: 'border-purple-500/30',
}

function Profile() {
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [prenom, setPrenom] = useState(user?.prenom || '')
  const [nom, setNom] = useState(user?.nom || '')
  const [bio, setBio] = useState(user?.bio || '')

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // Avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Default avatars
  const { data: defaultAvatars } = useQuery({
    queryKey: ['default-avatars'],
    queryFn: profilService.getDefaultAvatars,
    staleTime: Infinity,
  })

  // Mutations
  const updateProfilMutation = useMutation({
    mutationFn: (data: { prenom?: string; nom?: string; bio?: string }) =>
      profilService.updateProfil(data),
    onSuccess: async () => {
      await refreshUser()
      toast.success('Profil mis a jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateAvatarMutation = useMutation({
    mutationFn: (avatar: string | null) => profilService.updateAvatar(avatar),
    onSuccess: async () => {
      await refreshUser()
      setShowAvatarPicker(false)
      toast.success('Avatar mis a jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { motDePasseActuel: string; nouveauMotDePasse: string; confirmationMotDePasse: string }) =>
      profilService.changePassword(data),
    onSuccess: () => {
      toast.success('Mot de passe modifie')
      setShowPasswordForm(false)
      setMotDePasseActuel('')
      setNouveauMotDePasse('')
      setConfirmationMotDePasse('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSaveProfil = () => {
    const changes: Record<string, string> = {}
    if (prenom !== user?.prenom) changes.prenom = prenom
    if (nom !== user?.nom) changes.nom = nom
    if (bio !== (user?.bio || '')) changes.bio = bio
    if (Object.keys(changes).length === 0) {
      toast.info('Aucune modification')
      return
    }
    updateProfilMutation.mutate(changes)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5 Mo)')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      updateAvatarMutation.mutate(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleChangePassword = () => {
    if (!motDePasseActuel || !nouveauMotDePasse || !confirmationMotDePasse) {
      toast.error('Tous les champs sont requis')
      return
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    changePasswordMutation.mutate({ motDePasseActuel, nouveauMotDePasse, confirmationMotDePasse })
  }

  const hasChanges = prenom !== user?.prenom || nom !== user?.nom || bio !== (user?.bio || '')

  if (!user) return null

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <User className="h-7 w-7 text-indigo-400" /> Mon profil
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Modifier vos informations personnelles</p>
        </div>

        {/* Avatar + Infos principales */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.prenom} ${user.nom}`}
                    className={`h-24 w-24 rounded-full object-cover ring-2 ${roleBorderColors[user.role] || 'ring-zinc-700'}`}
                  />
                ) : (
                  <div className={`h-24 w-24 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-400 ring-2 ${roleBorderColors[user.role] || 'ring-zinc-700'}`}>
                    {user.prenom?.[0]}{user.nom?.[0]}
                  </div>
                )}
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
                {updateAvatarMutation.isPending && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Name + Role */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-zinc-100">{user.prenom} {user.nom}</h2>
                <p className="text-sm text-zinc-400">{user.email}</p>
                <Badge variant={user.role as never} className="mt-2">
                  {roleLabels[user.role] || user.role}
                </Badge>
                {user.bio && (
                  <p className="text-sm text-zinc-400 mt-2 italic">"{user.bio}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire profil */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Prenom</label>
                <Input
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Nom</label>
                <Input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Bio</label>
              <div className="relative">
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full rounded-md bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-200 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  maxLength={150}
                  placeholder="Decrivez-vous en quelques mots..."
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-zinc-600">{bio.length}/150</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfil}
                disabled={!hasChanges || updateProfilMutation.isPending}
                size="sm"
              >
                {updateProfilMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mot de passe */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Securite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                Changer le mot de passe
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Mot de passe actuel</label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? 'text' : 'password'}
                      value={motDePasseActuel}
                      onChange={e => setMotDePasseActuel(e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Nouveau mot de passe</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={nouveauMotDePasse}
                    onChange={e => setNouveauMotDePasse(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="Min. 8 caracteres, 1 majuscule, 1 chiffre"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Confirmation</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmationMotDePasse}
                    onChange={e => setConfirmationMotDePasse(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowPasswordForm(false); setMotDePasseActuel(''); setNouveauMotDePasse(''); setConfirmationMotDePasse('') }}>
                    <X className="h-4 w-4 mr-1" /> Annuler
                  </Button>
                  <Button size="sm" onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    Confirmer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avatar Picker Dialog */}
        <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
          <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Changer l'avatar</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Upload custom */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Importer une photo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateAvatarMutation.isPending}
                >
                  <Camera className="h-4 w-4 mr-1" /> Choisir une image
                </Button>
                <span className="text-[10px] text-zinc-600 ml-2">JPG, PNG, WebP (max 5 Mo)</span>
              </div>

              {/* Default avatars */}
              {defaultAvatars && defaultAvatars.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Ou choisir un avatar</p>
                  <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                    {defaultAvatars.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => updateAvatarMutation.mutate(url)}
                        disabled={updateAvatarMutation.isPending}
                        className={`rounded-lg border-2 p-0.5 transition-all hover:border-indigo-500 ${user.avatar === url ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-700'}`}
                      >
                        <img src={url} alt={`Avatar ${i + 1}`} className="w-full rounded-md" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}

export default Profile
