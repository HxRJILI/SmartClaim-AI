// apps/web/app/(app)/smartclaim/admin/users/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAdmin } from '@/lib/smartclaim/auth-utils';
import { UsersTable } from './_components/users-table';
import { Button } from '@kit/ui/button';
import { UserPlusIcon, ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'User Management - SmartClaim Admin',
};

async function getAllUsers() {
  const supabase = getSupabaseServerClient();
  
  const { data: users } = await supabase
    .from('user_profiles')
    .select(`
      *,
      department:departments(id, name)
    `)
    .order('created_at', { ascending: false });

  return users || [];
}

export default async function UsersManagementPage() {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  await requireAdmin(user.id);

  const users = await getAllUsers();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and department assignments
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/smartclaim/admin">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
          
          <Button>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      <UsersTable users={users} />
    </div>
  );
}