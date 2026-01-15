// apps/web/app/(app)/smartclaim/admin/_lib/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';

async function getSmartClaimSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

// ============================================
// USER MANAGEMENT ACTIONS
// ============================================

export async function updateUserRole(
  userId: string,
  newRole: 'worker' | 'department_manager' | 'admin'
) {
  const supabase = await getSmartClaimSupabaseClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

export async function updateUserDepartment(
  userId: string,
  departmentId: string | null
) {
  const supabase = await getSmartClaimSupabaseClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ department_id: departmentId, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user department:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

export async function updateUser(
  userId: string,
  data: {
    full_name?: string;
    role?: 'worker' | 'department_manager' | 'admin';
    department_id?: string | null;
  }
) {
  const supabase = await getSmartClaimSupabaseClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await getSmartClaimSupabaseClient();

  // First, remove user from any department manager positions
  await supabase
    .from('departments')
    .update({ manager_id: null })
    .eq('manager_id', userId);

  // Delete user profile
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

// ============================================
// DEPARTMENT MANAGEMENT ACTIONS
// ============================================

export async function createDepartment(data: {
  name: string;
  description?: string;
  manager_id?: string | null;
}) {
  const supabase = await getSmartClaimSupabaseClient();

  const { data: newDept, error } = await supabase
    .from('departments')
    .insert({
      name: data.name,
      description: data.description || null,
      manager_id: data.manager_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating department:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true, department: newDept };
}

export async function updateDepartment(
  departmentId: string,
  data: {
    name?: string;
    description?: string;
    manager_id?: string | null;
  }
) {
  const supabase = await getSmartClaimSupabaseClient();

  const { error } = await supabase
    .from('departments')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', departmentId);

  if (error) {
    console.error('Error updating department:', error);
    return { success: false, error: error.message };
  }

  // If manager_id was updated, update the user's role
  if (data.manager_id) {
    await supabase
      .from('user_profiles')
      .update({ role: 'department_manager', department_id: departmentId })
      .eq('id', data.manager_id);
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

export async function deleteDepartment(departmentId: string) {
  const supabase = await getSmartClaimSupabaseClient();

  // First, remove department from all users
  await supabase
    .from('user_profiles')
    .update({ department_id: null })
    .eq('department_id', departmentId);

  // Unassign tickets
  await supabase
    .from('tickets')
    .update({ assigned_to_department: null })
    .eq('assigned_to_department', departmentId);

  // Delete department
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (error) {
    console.error('Error deleting department:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/smartclaim/admin');
  return { success: true };
}

// ============================================
// SETTINGS MANAGEMENT ACTIONS
// ============================================

// Note: System settings are stored in local storage on the client side
// for this implementation. In production, you may want to create a
// system_settings table in Supabase.

export async function getSystemSettings() {
  // Return default settings - in production, fetch from database
  return {
    default_sla_hours: 48,
    ai_confidence_threshold: 0.7,
    auto_assign_tickets: true,
    email_notifications: true,
    ai_summarization: true,
    voice_transcription: true,
    lvm_analysis: true,
    rag_enabled: true,
    predictive_sla: true,
  };
}

export async function updateSystemSettings(settings: {
  default_sla_hours?: number;
  ai_confidence_threshold?: number;
  auto_assign_tickets?: boolean;
  email_notifications?: boolean;
  ai_summarization?: boolean;
  voice_transcription?: boolean;
  lvm_analysis?: boolean;
  rag_enabled?: boolean;
  predictive_sla?: boolean;
}) {
  // In production, save to database
  // For now, just return success (client will handle local storage)
  console.log('Updating settings:', settings);
  revalidatePath('/smartclaim/admin');
  return { success: true };
}

// ============================================
// DATA FETCHING HELPERS
// ============================================

export async function getAllUsers() {
  const supabase = await getSmartClaimSupabaseClient();

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      department:departments(id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return users || [];
}

export async function getAllDepartments() {
  const supabase = await getSmartClaimSupabaseClient();

  const { data: departments, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  // Fetch managers separately
  const departmentsWithManagers = await Promise.all(
    (departments || []).map(async (dept) => {
      let manager = null;
      if (dept.manager_id) {
        const { data: mgr } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .eq('id', dept.manager_id)
          .single();
        manager = mgr;
      }

      // Count users in department
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', dept.id);

      // Count tickets
      const { count: ticketCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_department', dept.id);

      return {
        ...dept,
        manager,
        user_count: count || 0,
        ticket_count: ticketCount || 0,
      };
    })
  );

  return departmentsWithManagers;
}
