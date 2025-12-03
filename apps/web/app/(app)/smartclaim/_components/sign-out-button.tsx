'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@kit/ui/button';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { toast } from 'sonner';

export function SignOutButton() {
  const signOut = useSignOut();

  const handleSignOut = async () => {
    try {
      await signOut.mutateAsync();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={signOut.isPending}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
