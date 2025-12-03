// packages/features/smartclaim/components/department-manager-only.tsx
'use client';

import { useIsDepartmentManager } from '../hooks/use-role-check';

interface DepartmentManagerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DepartmentManagerOnly({ children, fallback = null }: DepartmentManagerOnlyProps) {
  const { hasAccess, loading } = useIsDepartmentManager();

  if (loading) {
    return null;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}