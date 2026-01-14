-- Fix user roles for seeded accounts

-- Update admin user
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Update Safety manager
UPDATE public.user_profiles 
SET role = 'department_manager', 
    department_id = (SELECT id FROM departments WHERE name = 'Safety & Security') 
WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- Update Quality manager
UPDATE public.user_profiles 
SET role = 'department_manager', 
    department_id = (SELECT id FROM departments WHERE name = 'Quality Control') 
WHERE id = 'a0000000-0000-0000-0000-000000000003';

-- Update Maintenance manager
UPDATE public.user_profiles 
SET role = 'department_manager', 
    department_id = (SELECT id FROM departments WHERE name = 'Maintenance') 
WHERE id = 'a0000000-0000-0000-0000-000000000004';

-- Update Logistics manager
UPDATE public.user_profiles 
SET role = 'department_manager', 
    department_id = (SELECT id FROM departments WHERE name = 'Logistics') 
WHERE id = 'a0000000-0000-0000-0000-000000000005';

-- Update HR manager
UPDATE public.user_profiles 
SET role = 'department_manager', 
    department_id = (SELECT id FROM departments WHERE name = 'Human Resources') 
WHERE id = 'a0000000-0000-0000-0000-000000000006';
