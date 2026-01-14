'use client';

import { Button } from '@kit/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from '../../../dashboard/_components/notification-bell';
import { SignOutButton } from '../../../_components/sign-out-button';

export function TicketsPageHeader() {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Ticket Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage tickets assigned to your department
        </p>
      </div>
      
      <div className="flex gap-3 items-center">
        <NotificationBell />
        
        <Button asChild variant="outline">
          <Link href="/smartclaim/department">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Department
          </Link>
        </Button>
        
        <SignOutButton />
      </div>
    </div>
  );
}
