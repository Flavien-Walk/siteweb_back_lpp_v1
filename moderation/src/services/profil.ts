import api from './api'
import type { ApiResponse } from '@/types'

interface ProfilUpdateData {
  prenom?: string
  nom?: string
  bio?: string
  profilPublic?: boolean
}

interface ProfilResponse {
  utilisateur: {
    _id: string
    prenom: string
    nom: string
    email: string
    bio?: string
    profilPublic?: boolean
    avatar?: string
  }
}

interface AvatarResponse {
  utilisateur: {
    _id: string
    avatar: string | null
  }
}

interface AvatarsListResponse {
  avatars: string[]
}

interface PasswordChangeData {
  motDePasseActuel: string
  nouveauMotDePasse: string
  confirmationMotDePasse: string
}

export const profilService = {
  async updateProfil(data: ProfilUpdateData) {
    const response = await api.patch<ApiResponse<ProfilResponse>>('/profil', data)
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la mise a jour du profil')
    }
    return response.data.data.utilisateur
  },

  async updateAvatar(avatar: string | null) {
    const response = await api.patch<ApiResponse<AvatarResponse>>('/profil/avatar', { avatar })
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors de la mise a jour de l\'avatar')
    }
    return response.data.data.utilisateur
  },

  async getDefaultAvatars() {
    const response = await api.get<ApiResponse<AvatarsListResponse>>('/profil/avatars')
    if (!response.data.succes || !response.data.data) {
      throw new Error(response.data.message || 'Erreur lors du chargement des avatars')
    }
    return response.data.data.avatars
  },

  async changePassword(data: PasswordChangeData) {
    const response = await api.patch<ApiResponse<null>>('/profil/mot-de-passe', data)
    if (!response.data.succes) {
      throw new Error(response.data.message || 'Erreur lors du changement de mot de passe')
    }
  },
}

export default profilService
