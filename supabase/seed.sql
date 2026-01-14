-- SmartClaim AI Seed Data
-- ============================================
-- IMPORTANT: This seed file uses raw SQL inserts which DO NOT WORK properly
-- with Supabase Auth because the password hash format is incompatible.
-- 
-- TO SEED USERS PROPERLY, run the following command after `supabase start`:
-- 
-- Option 1: Use the Supabase Studio (http://localhost:54323)
--   - Go to Authentication > Users > Add user
--   
-- Option 2: Use the PowerShell script below after starting Supabase:
-- 
-- $serviceKey = "YOUR_SERVICE_ROLE_KEY"
-- $headers = @{ 
--     "apikey" = $serviceKey
--     "Authorization" = "Bearer $serviceKey"
--     "Content-Type" = "application/json" 
-- }
-- $users = @(
--     @{ email = "admin@smartclaim.com"; password = "Admin@2025"; name = "Admin" },
--     @{ email = "safety.manager@smartclaim.com"; password = "Safety@2025"; name = "Safety Manager" },
--     # ... add more users
-- )
-- foreach ($user in $users) {
--     $body = @{ email = $user.email; password = $user.password; email_confirm = $true; user_metadata = @{ name = $user.name } } | ConvertTo-Json
--     Invoke-RestMethod -Uri "http://localhost:54321/auth/v1/admin/users" -Method POST -Headers $headers -Body $body
-- }
-- 
-- Then update the user_profiles table with correct roles using SQL.
-- ============================================

-- Ensure departments exist
INSERT INTO public.departments (id, name, description) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Safety & Security', 'Handles all safety-related incidents and security concerns'),
  ('d2222222-2222-2222-2222-222222222222', 'Quality Control', 'Manages product and process quality issues'),
  ('d3333333-3333-3333-3333-333333333333', 'Maintenance', 'Responsible for equipment and facility maintenance'),
  ('d4444444-4444-4444-4444-444444444444', 'Logistics', 'Handles supply chain and logistics issues'),
  ('d5555555-5555-5555-5555-555555555555', 'Human Resources', 'Manages employee-related concerns')
ON CONFLICT (id) DO NOTHING;

-- Create Admin User
-- Email: admin@smartclaim.com / Password: Admin@2025
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  role,
  is_anonymous
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@smartclaim.com',
  crypt('Admin@2025', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "System Administrator"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL,
  'authenticated',
  FALSE
) ON CONFLICT (id) DO NOTHING;

-- Create Admin Profile
INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin', NULL, 'System Administrator', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Safety Manager
-- Email: safety.manager@smartclaim.com / Password: Safety@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'safety.manager@smartclaim.com',
  crypt('Safety@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Safety Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000002', 'department_manager', 'd1111111-1111-1111-1111-111111111111', 'Safety Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Quality Manager
-- Email: quality.manager@smartclaim.com / Password: Quality@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'quality.manager@smartclaim.com',
  crypt('Quality@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Quality Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000003', 'department_manager', 'd2222222-2222-2222-2222-222222222222', 'Quality Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Maintenance Manager
-- Email: maintenance.manager@smartclaim.com / Password: Maintenance@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'maintenance.manager@smartclaim.com',
  crypt('Maintenance@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Maintenance Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000004', 'department_manager', 'd3333333-3333-3333-3333-333333333333', 'Maintenance Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Logistics Manager
-- Email: logistics.manager@smartclaim.com / Password: Logistics@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'logistics.manager@smartclaim.com',
  crypt('Logistics@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Logistics Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000005', 'department_manager', 'd4444444-4444-4444-4444-444444444444', 'Logistics Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create HR Manager
-- Email: hr.manager@smartclaim.com / Password: HR@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'hr.manager@smartclaim.com',
  crypt('HR@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "HR Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000006', 'department_manager', 'd5555555-5555-5555-5555-555555555555', 'HR Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Test Worker
-- Email: worker@smartclaim.com / Password: Worker@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'worker@smartclaim.com',
  crypt('Worker@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test Worker"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000007', 'worker', NULL, 'Test Worker', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create auth.identities entries for each user (required for email auth to work)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 
   '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "admin@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 
   '{"sub": "a0000000-0000-0000-0000-000000000002", "email": "safety.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 
   '{"sub": "a0000000-0000-0000-0000-000000000003", "email": "quality.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000003', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 
   '{"sub": "a0000000-0000-0000-0000-000000000004", "email": "maintenance.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000004', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 
   '{"sub": "a0000000-0000-0000-0000-000000000005", "email": "logistics.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000005', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 
   '{"sub": "a0000000-0000-0000-0000-000000000006", "email": "hr.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000006', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 
   '{"sub": "a0000000-0000-0000-0000-000000000007", "email": "worker@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000007', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Update department managers
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000002' WHERE id = 'd1111111-1111-1111-1111-111111111111';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000003' WHERE id = 'd2222222-2222-2222-2222-222222222222';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000004' WHERE id = 'd3333333-3333-3333-3333-333333333333';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000005' WHERE id = 'd4444444-4444-4444-4444-444444444444';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000006' WHERE id = 'd5555555-5555-5555-5555-555555555555';

-- Re-enable the trigger for future signups (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
