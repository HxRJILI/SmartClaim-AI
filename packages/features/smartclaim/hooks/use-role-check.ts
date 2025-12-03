// packages/features/smartclaim/hooks/use-role-check.ts
'use client';

import { useUserProfile } from './use-user-profile';
import { UserRole } from '../types';

export function useRoleCheck(allowedRoles: UserRole[]) {
  const { profile, loading } = useUserProfile();
  
  const hasAccess = profile ? allowedRoles.includes(profile.role) : false;
  
  return {
    hasAccess,
    loading,
    profile,
    isAdmin: profile?.role === 'admin',
    isDepartmentManager: profile?.role === 'department_manager',
    isWorker: profile?.role === 'worker',
  };
}

export function useIsAdmin() {
  return useRoleCheck(['admin']);
}

export function useIsDepartmentManager() {
  return useRoleCheck(['department_manager', 'admin']);
}