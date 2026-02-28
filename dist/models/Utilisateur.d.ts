import mongoose, { Document } from 'mongoose';
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';
export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'super_admin';
export type RoleWithLegacy = Role | 'admin';
export declare const ROLE_HIERARCHY: Record<RoleWithLegacy, number>;
export type Permission = 'reports:view' | 'reports:process' | 'reports:escalate' | 'users:view' | 'users:warn' | 'users:suspend' | 'users:ban' | 'users:unban' | 'users:edit_roles' | 'content:hide' | 'content:delete' | 'audit:view' | 'audit:export' | 'content:edit' | 'config:view' | 'config:edit' | 'staff:chat' | 'tickets:view' | 'tickets:respond' | 'marketplace:view' | 'marketplace:manage_disputes';
export declare const DEFAULT_PERMISSIONS: Record<RoleWithLegacy, Permission[]>;
export interface IWarning {
    _id?: mongoose.Types.ObjectId;
    reason: string;
    note?: string;
    issuedBy: mongoose.Types.ObjectId | 'system';
    issuedAt: Date;
    expiresAt?: Date;
    source?: 'mobile' | 'moderation' | 'api' | 'system';
}
export type ModerationStatus = 'active' | 'suspended' | 'banned';
export interface IModerationTracking {
    status: ModerationStatus;
    warnCountSinceLastAutoSuspension: number;
    autoSuspensionsCount: number;
    lastAutoActionAt?: Date;
    updatedAt: Date;
}
export type StatutUtilisateur = 'visiteur' | 'entrepreneur';
export interface IUtilisateur extends Document {
    _id: mongoose.Types.ObjectId;
    prenom: string;
    nom: string;
    email: string;
    motDePasse?: string;
    provider: ProviderOAuth;
    providerId?: string;
    avatar?: string;
    bio?: string;
    role: Role;
    permissions: Permission[];
    statut?: StatutUtilisateur;
    cguAcceptees: boolean;
    profilPublic: boolean;
    preferenceTheme?: 'light' | 'dark';
    onboardingInterets?: {
        categories: string[];
        maturites: string[];
        completedAt?: Date;
    };
    amis: mongoose.Types.ObjectId[];
    demandesAmisRecues: mongoose.Types.ObjectId[];
    demandesAmisEnvoyees: mongoose.Types.ObjectId[];
    suspendedUntil?: Date | null;
    suspendReason?: string;
    bannedAt?: Date | null;
    banReason?: string;
    warnings: IWarning[];
    moderation: IModerationTracking;
    lppPlus?: {
        status: 'inactive' | 'active' | 'canceled';
        startedAt?: Date | null;
        currentPeriodEnd?: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt?: Date | null;
        renewalCount: number;
    };
    surveillance: {
        active: boolean;
        reason?: string;
        addedBy?: mongoose.Types.ObjectId;
        addedAt?: Date;
        notes: {
            content: string;
            author: mongoose.Types.ObjectId;
            date: Date;
        }[];
    };
    emailVerifie: boolean;
    codeVerification?: string;
    codeVerificationExpire?: Date;
    dateCreation: Date;
    dateMiseAJour: Date;
    comparerMotDePasse(motDePasseCandidat: string): Promise<boolean>;
    isAdmin(): boolean;
    isStaff(): boolean;
    isBanned(): boolean;
    isSuspended(): boolean;
    hasPermission(permission: Permission): boolean;
    getEffectivePermissions(): Permission[];
    getRoleLevel(): number;
    getModerationStatus(): ModerationStatus;
    getWarningsBeforeNextSanction(): number;
}
declare const Utilisateur: mongoose.Model<IUtilisateur, {}, {}, {}, mongoose.Document<unknown, {}, IUtilisateur, {}, {}> & IUtilisateur & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Utilisateur;
//# sourceMappingURL=Utilisateur.d.ts.map