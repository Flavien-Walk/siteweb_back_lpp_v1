/**
 * Hook pour gérer les permissions staff
 * Permet de vérifier facilement si l'utilisateur peut effectuer des actions de modération
 */

import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { Permission } from '../services/auth';

interface UseStaffReturn {
  // État staff
  isStaff: boolean;
  role: string;
  permissions: Permission[];

  // Vérification de permission
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Raccourcis courants
  canViewReports: boolean;
  canProcessReports: boolean;
  canWarnUsers: boolean;
  canSuspendUsers: boolean;
  canBanUsers: boolean;
  canUnbanUsers: boolean;
  canHideContent: boolean;
  canDeleteContent: boolean;
  canViewAudit: boolean;
}

export const useStaff = (): UseStaffReturn => {
  const { utilisateur } = useUser();

  return useMemo(() => {
    const isStaff = utilisateur?.isStaff ?? false;
    const role = utilisateur?.role ?? 'user';
    const permissions = utilisateur?.permissions ?? [];

    const hasPermission = (permission: Permission): boolean => {
      if (!isStaff) return false;
      return permissions.includes(permission);
    };

    const hasAnyPermission = (perms: Permission[]): boolean => {
      if (!isStaff) return false;
      return perms.some(p => permissions.includes(p));
    };

    const hasAllPermissions = (perms: Permission[]): boolean => {
      if (!isStaff) return false;
      return perms.every(p => permissions.includes(p));
    };

    return {
      isStaff,
      role,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      // Raccourcis courants
      canViewReports: hasPermission('reports:view'),
      canProcessReports: hasPermission('reports:process'),
      canWarnUsers: hasPermission('users:warn'),
      canSuspendUsers: hasPermission('users:suspend'),
      canBanUsers: hasPermission('users:ban'),
      canUnbanUsers: hasPermission('users:unban'),
      canHideContent: hasPermission('content:hide'),
      canDeleteContent: hasPermission('content:delete'),
      canViewAudit: hasPermission('audit:view'),
    };
  }, [utilisateur]);
};

export default useStaff;
