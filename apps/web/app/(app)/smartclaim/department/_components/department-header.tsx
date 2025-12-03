  // apps/web/app/(app)/smartclaim/department/_components/department-header.tsx
'use client';

import { Button } from '@kit/ui/button';
import { ArrowLeftIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '../../_components/sign-out-button';

interface DepartmentHeaderProps {
  department: any;
}

export function DepartmentHeader({ department }: DepartmentHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">{department.name} Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {department.description || 'Manage your department tickets and performance'}
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
          <SettingsIcon className="h-4 w-4 mr-2" />
          Settings
        </Button>
        
        <SignOutButton />
      </div>
    </div>
  );
}