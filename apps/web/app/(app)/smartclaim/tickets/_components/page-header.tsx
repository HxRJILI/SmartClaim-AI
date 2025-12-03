// apps/web/app/(app)/smartclaim/tickets/_components/page-header.tsx
'use client';

import { Button } from '@kit/ui/button';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';

export function PageHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all your submitted tickets
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/smartclaim/dashboard">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button asChild>
          <Link href="/smartclaim/dashboard">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>
    </div>
  );
}