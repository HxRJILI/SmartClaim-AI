// apps/web/app/(app)/smartclaim/admin/_components/admin-header.tsx
'use client';

import { Button } from '@kit/ui/button';
import { ArrowLeftIcon, SettingsIcon, UsersIcon, BuildingIcon } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '../../_components/sign-out-button';

export function AdminHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System-wide analytics and configuration
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/smartclaim/dashboard">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button variant="outline">
          <UsersIcon className="h-4 w-4 mr-2" />
          Manage Users
        </Button>
        
        <Button variant="outline">
          <BuildingIcon className="h-4 w-4 mr-2" />
          Manage Departments
        </Button>
        
        <Button variant="outline">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Settings
        </Button>
        
        <SignOutButton />
      </div>
    </div>
  );
}