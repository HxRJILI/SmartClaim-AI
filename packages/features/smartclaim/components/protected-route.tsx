// packages/features/smartclaim/components/protected-route.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '../hooks/use-role-check';
import { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  fallbackUrl = '/smartclaim/dashboard' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { hasAccess, loading } = useRoleCheck(allowedRoles);

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.push(fallbackUrl);
    }
  }, [loading, hasAccess, router, fallbackUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}