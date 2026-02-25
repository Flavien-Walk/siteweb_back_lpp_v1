/**
 * Types Utilisateur
 * Extraits de services/auth.ts
 */

export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'admin' | 'super_admin';
export type StatutUtilisateur = 'visiteur' | 'entrepreneur';

export type Permission =
  | 'reports:view'
  | 'reports:process'
  | 'reports:escalate'
  | 'users:view'
  | 'users:warn'
  | 'users:suspend'
  | 'users:ban'
  | 'users:unban'
  | 'users:edit_roles'
  | 'content:hide'
  | 'content:delete'
  | 'audit:view'
  | 'audit:export'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat';

export interface Utilisateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: Role;
  statut?: StatutUtilisateur;
  provider: 'local' | 'google' | 'facebook' | 'apple';
  profilPublic?: boolean;
  emailVerifie: boolean;
  dateInscription?: string;
  nbAmis?: number;
  projetsSuivis?: number;
  isStaff?: boolean;
  permissions?: Permission[];
  isVerified?: boolean;
  preferenceTheme?: 'light' | 'dark';
  onboardingInterets?: {
    categories: string[];
    maturites: string[];
    completedAt?: string;
  };
  lppPlus?: {
    status: 'inactive' | 'active' | 'canceled';
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
}

export interface DonneesConnexion {
  email: string;
  motDePasse: string;
}

export interface DonneesInscription {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  cguAcceptees: boolean;
}

export interface ReponseAuth {
  token: string;
  utilisateur: Utilisateur;
}

export interface SanctionInfo {
  isRestricted: boolean;
  type?: 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED';
  reason?: string;
  bannedAt?: string;
  suspendedUntil?: string;
  notificationId?: string;
  notificationDate?: string;
  actorRole?: string;
  postId?: string;
  postSnapshot?: {
    contenu?: string;
    mediaUrl?: string;
  };
}

export interface SanctionHistoryItem {
  type: 'ban' | 'suspend' | 'warn' | 'unban' | 'unsuspend' | 'unwarn';
  createdAt: string;
  titre: string;
  message: string;
  reason?: string;
  actorRole?: string;
  suspendedUntil?: string;
  postSnapshot?: {
    contenu?: string;
    mediaUrl?: string;
  };
}

export interface ModerationStatus {
  status: 'active' | 'suspended' | 'banned';
  warnCountSinceLastAutoSuspension: number;
  warningsBeforeNextSanction: number;
  autoSuspensionsCount: number;
  nextAutoAction: 'suspend' | 'ban';
  suspendedUntil?: string;
  suspendReason?: string;
  bannedAt?: string;
  banReason?: string;
}
