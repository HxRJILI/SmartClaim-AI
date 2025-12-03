// apps/web/app/(app)/smartclaim/dashboard/_components/dashboard-header.tsx
'use client';

import { User } from '@supabase/supabase-js';
import { Button } from '@kit/ui/button';
import { TicketIcon, BarChart3Icon } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '../../_components/sign-out-button';
import { NotificationBell } from './notification-bell';

interface DashboardHeaderProps {
  user: User;
  profile: {
    full_name?: string;
    role?: string;
  } | null;
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">SmartClaim Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name || user.email}
        </p>
      </div>
      
      <div className="flex gap-3 items-center">
        {/* Notification Bell - only for workers */}
        {profile?.role === 'worker' && <NotificationBell />}
        
        <Button asChild variant="outline">
          <Link href="/smartclaim/tickets">
            <TicketIcon className="mr-2 h-4 w-4" />
            My Tickets
          </Link>
        </Button>
        
        {(profile?.role === 'department_manager' || profile?.role === 'admin') && (
          <Button asChild variant="outline">
            <Link href="/smartclaim/department">
              <BarChart3Icon className="mr-2 h-4 w-4" />
              Department View
            </Link>
          </Button>
        )}
        
        {profile?.role === 'admin' && (
          <Button asChild>
            <Link href="/smartclaim/admin">
              Admin Dashboard
            </Link>
          </Button>
        )}
        
        <SignOutButton />
      </div>
    </div>
  );
}