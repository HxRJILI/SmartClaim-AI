-- Migration: Chat History and New Departments
-- Created: 2026-01-14
-- Description: Enhanced chat sessions with title/preview, new departments and managers

-- ============================================
-- PART 1: Enhance chat_sessions table
-- ============================================

-- Add columns for chat session title and preview
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS title text DEFAULT 'New Conversation',
ADD COLUMN IF NOT EXISTS preview text,
ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create index for faster chat history queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated 
ON public.chat_sessions(user_id, updated_at DESC);

-- ============================================
-- PART 2: Add new ticket categories
-- ============================================

-- Add new categories to the enum
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'it';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'customer_service';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'procurement';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'legal';

-- ============================================
-- PART 3: Add new departments
-- ============================================

INSERT INTO public.departments (id, name, description) VALUES
  ('d6666666-6666-6666-6666-666666666666', 'IT & Technology', 'Handles all IT-related issues, software, and technical support'),
  ('d7777777-7777-7777-7777-777777777777', 'Customer Service', 'Manages customer complaints and service-related issues'),
  ('d8888888-8888-8888-8888-888888888888', 'Finance', 'Handles financial matters, billing, and accounting issues'),
  ('d9999999-9999-9999-9999-999999999999', 'Procurement & Stock', 'Manages purchasing, inventory, and stock-related issues'),
  ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Legal', 'Handles legal matters, compliance, and regulatory issues')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: Create new managers
-- ============================================

-- IT Manager
-- Email: it.manager@smartclaim.com / Password: IT@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000000',
  'it.manager@smartclaim.com',
  crypt('IT@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "IT Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000008', 'department_manager', 'd6666666-6666-6666-6666-666666666666', 'IT Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Customer Service Manager
-- Email: service.manager@smartclaim.com / Password: Service@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'service.manager@smartclaim.com',
  crypt('Service@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Customer Service Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000009', 'department_manager', 'd7777777-7777-7777-7777-777777777777', 'Customer Service Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Finance Manager
-- Email: finance.manager@smartclaim.com / Password: Finance@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'finance.manager@smartclaim.com',
  crypt('Finance@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Finance Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000010', 'department_manager', 'd8888888-8888-8888-8888-888888888888', 'Finance Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Procurement Manager
-- Email: procurement.manager@smartclaim.com / Password: Procurement@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000000',
  'procurement.manager@smartclaim.com',
  crypt('Procurement@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Procurement Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000011', 'department_manager', 'd9999999-9999-9999-9999-999999999999', 'Procurement Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Legal Manager
-- Email: legal.manager@smartclaim.com / Password: Legal@2025
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  role, is_anonymous, is_sso_user, email_change_confirm_status
) VALUES (
  'a0000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000000',
  'legal.manager@smartclaim.com',
  crypt('Legal@2025', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Legal Manager"}',
  FALSE, NOW(), NOW(),
  'authenticated', FALSE, FALSE, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, role, department_id, full_name, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000012', 'department_manager', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Legal Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 5: Create auth.identities for new managers
-- ============================================

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 
   '{"sub": "a0000000-0000-0000-0000-000000000008", "email": "it.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000008', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 
   '{"sub": "a0000000-0000-0000-0000-000000000009", "email": "service.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000009', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 
   '{"sub": "a0000000-0000-0000-0000-000000000010", "email": "finance.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000010', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000011', 
   '{"sub": "a0000000-0000-0000-0000-000000000011", "email": "procurement.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000011', NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000012', 
   '{"sub": "a0000000-0000-0000-0000-000000000012", "email": "legal.manager@smartclaim.com"}', 
   'email', 'a0000000-0000-0000-0000-000000000012', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 6: Update department managers
-- ============================================

UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000008' WHERE id = 'd6666666-6666-6666-6666-666666666666';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000009' WHERE id = 'd7777777-7777-7777-7777-777777777777';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000010' WHERE id = 'd8888888-8888-8888-8888-888888888888';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000011' WHERE id = 'd9999999-9999-9999-9999-999999999999';
UPDATE public.departments SET manager_id = 'a0000000-0000-0000-0000-000000000012' WHERE id = 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ============================================
-- PART 7: Create safety_tips table for urgent tickets
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_tips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  tips_content text NOT NULL,
  priority text NOT NULL,
  category text,
  is_acknowledged boolean DEFAULT false,
  generated_by text DEFAULT 'llm',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.safety_tips IS 'Safety tips generated by LLM for high-priority tickets';

-- Enable RLS
ALTER TABLE public.safety_tips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_tips
CREATE POLICY "Users can view their own safety tips"
  ON public.safety_tips FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert safety tips"
  ON public.safety_tips FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own tips"
  ON public.safety_tips FOR UPDATE
  USING (user_id = auth.uid());

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_safety_tips_ticket 
ON public.safety_tips(ticket_id);

CREATE INDEX IF NOT EXISTS idx_safety_tips_user 
ON public.safety_tips(user_id, created_at DESC);
