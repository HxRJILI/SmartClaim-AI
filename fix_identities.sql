-- Fix missing identity records for seeded users
DELETE FROM auth.identities WHERE provider_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007'
);

-- Admin
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000001', 'admin@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Quality Manager
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000002', 'quality.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Safety Manager
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000003',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000003', 'safety.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Maintenance Manager
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000004',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000004', 'maintenance.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Logistics Manager
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000005',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000005', 'logistics.manager@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Worker 1
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000006',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000006', 'worker1@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);

-- Worker 2
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000007',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000007', 'worker2@smartclaim.com')::jsonb,
  'email', NOW(), NOW(), NOW()
);
