// apps/web/lib/smartclaim/auth-utils.ts
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { redirect } from 'next/navigation';
import { UserRole } from '@kit/smartclaim/types';

export async function getCurrentUser() {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/sign-in');
  }
  
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseServerClient();
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      department:departments(*)
    `)
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    throw new Error('User profile not found');
  }
  
  return profile;
}

export async function requireRole(userId: string, allowedRoles: UserRole[]) {
  const profile = await getUserProfile(userId);
  
  if (!allowedRoles.includes(profile.role)) {
    redirect('/smartclaim/dashboard');
  }
  
  return profile;
}

export async function requireAdmin(userId: string) {
  return requireRole(userId, ['admin']);
}

export async function requireDepartmentManager(userId: string) {
  return requireRole(userId, ['department_manager', 'admin']);
}

export async function checkDepartmentAccess(userId: string, departmentId: string) {
  const profile = await getUserProfile(userId);
  
  // Admins have access to all departments
  if (profile.role === 'admin') {
    return true;
  }
  
  // Department managers can only access their own department
  if (profile.role === 'department_manager' && profile.department_id === departmentId) {
    return true;
  }
  
  return false;
}