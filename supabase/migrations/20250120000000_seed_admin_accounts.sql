-- Create admin and department manager accounts
-- These accounts are pre-seeded and should not be deleted

-- Admin account
-- Email: admin@smartclaim.com
-- Password: Admin@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@smartclaim.com',
  crypt('Admin@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Insert admin profile
INSERT INTO public.user_profiles (id, full_name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'System Administrator',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Department Manager - Safety
-- Email: safety.manager@smartclaim.com
-- Password: Safety@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'safety.manager@smartclaim.com',
  crypt('Safety@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Safety Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Safety' LIMIT 1),
  'department_manager',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Department Manager - Quality
-- Email: quality.manager@smartclaim.com
-- Password: Quality@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'quality.manager@smartclaim.com',
  crypt('Quality@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Quality Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Quality' LIMIT 1),
  'department_manager',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Department Manager - Maintenance
-- Email: maintenance.manager@smartclaim.com
-- Password: Maintenance@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'maintenance.manager@smartclaim.com',
  crypt('Maintenance@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Maintenance Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Maintenance' LIMIT 1),
  'department_manager',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Department Manager - Logistics
-- Email: logistics.manager@smartclaim.com
-- Password: Logistics@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'logistics.manager@smartclaim.com',
  crypt('Logistics@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'Logistics Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Logistics' LIMIT 1),
  'department_manager',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Department Manager - HR
-- Email: hr.manager@smartclaim.com
-- Password: HR@2025
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000006',
  'authenticated',
  'authenticated',
  'hr.manager@smartclaim.com',
  crypt('HR@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'HR Department Manager',
  (SELECT id FROM public.departments WHERE name = 'HR' LIMIT 1),
  'department_manager',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
