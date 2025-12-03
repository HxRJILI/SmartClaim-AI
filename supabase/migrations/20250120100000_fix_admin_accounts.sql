-- Fix admin accounts by creating proper identities
-- Delete the incorrectly created users and profiles first
DELETE FROM public.user_profiles WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

DELETE FROM auth.identities WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

DELETE FROM auth.users WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

-- Create admin user properly with identity
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
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
  '{"full_name":"System Administrator"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create identity for admin
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000001', 'admin@smartclaim.com')::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- Create admin profile
INSERT INTO public.user_profiles (id, full_name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'System Administrator',
  'admin',
  NOW(),
  NOW()
);

-- Safety Manager
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'safety.manager@smartclaim.com',
  crypt('Safety@2025', gen_salt('bf')), NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Safety Department Manager"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000002', 'safety.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Safety Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Safety' LIMIT 1),
  'department_manager', NOW(), NOW()
);

-- Quality Manager
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'quality.manager@smartclaim.com',
  crypt('Quality@2025', gen_salt('bf')), NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Quality Department Manager"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000003',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000003', 'quality.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Quality Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Quality' LIMIT 1),
  'department_manager', NOW(), NOW()
);

-- Maintenance Manager
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000004',
  'authenticated', 'authenticated', 'maintenance.manager@smartclaim.com',
  crypt('Maintenance@2025', gen_salt('bf')), NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Maintenance Department Manager"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000004',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000004', 'maintenance.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Maintenance Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Maintenance' LIMIT 1),
  'department_manager', NOW(), NOW()
);

-- Logistics Manager
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000005',
  'authenticated', 'authenticated', 'logistics.manager@smartclaim.com',
  crypt('Logistics@2025', gen_salt('bf')), NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Logistics Department Manager"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000005',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000005', 'logistics.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'Logistics Department Manager',
  (SELECT id FROM public.departments WHERE name = 'Logistics' LIMIT 1),
  'department_manager', NOW(), NOW()
);

-- HR Manager
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000006',
  'authenticated', 'authenticated', 'hr.manager@smartclaim.com',
  crypt('HR@2025', gen_salt('bf')), NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"HR Department Manager"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000006',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000006', 'hr.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

INSERT INTO public.user_profiles (id, full_name, department_id, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'HR Department Manager',
  (SELECT id FROM public.departments WHERE name = 'HR' LIMIT 1),
  'department_manager', NOW(), NOW()
);
