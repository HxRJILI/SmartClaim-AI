// packages/features/smartclaim/components/admin-only.tsx
'use client';

import { useIsAdmin } from '../hooks/use-role-check';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { hasAccess, loading } = useIsAdmin();

  if (loading) {
    return null;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}