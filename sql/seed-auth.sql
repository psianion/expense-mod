-- Seed: roles, permissions, role_permissions, demo user profile and roles, sample demo data.
-- Run after 001_add_auth_tables.sql (or after init.sql if it includes auth tables).
-- Demo user auth.users insert: Supabase may require creating the user via Dashboard or Auth API;
-- run the auth.users insert only if your Supabase project allows direct inserts (e.g. local/dev).

-- =============================================
-- Roles
-- =============================================
INSERT INTO roles (id, name, description) VALUES
  (gen_random_uuid(), 'user', 'Default role for all users')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) VALUES
  (gen_random_uuid(), 'master', 'God mode, all permissions, can see all users'' data')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Permissions (resource:action)
-- =============================================
INSERT INTO permissions (resource, action, description) VALUES
  ('expenses', 'create', 'Create expenses'),
  ('expenses', 'read', 'View expenses'),
  ('expenses', 'update', 'Update expenses'),
  ('expenses', 'delete', 'Delete expenses'),
  ('bills', 'create', 'Create bills'),
  ('bills', 'read', 'View bills'),
  ('bills', 'update', 'Update bills'),
  ('bills', 'delete', 'Delete bills'),
  ('bill_instances', 'create', 'Create bill instances'),
  ('bill_instances', 'read', 'View bill instances'),
  ('bill_instances', 'update', 'Update bill instances'),
  ('bill_instances', 'delete', 'Delete bill instances'),
  ('analytics', 'read', 'View analytics')
ON CONFLICT (resource, action) DO NOTHING;

-- =============================================
-- Role-Permission mapping (user = full CRUD on expenses, bills, bill_instances, analytics read)
-- =============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND (p.resource IN ('expenses', 'bills', 'bill_instances') OR (p.resource = 'analytics' AND p.action = 'read'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Master: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'master'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- Demo user (ID from env DEMO_USER_ID, default below)
-- =============================================
-- Option A: If your Supabase allows direct insert into auth.users (e.g. local Supabase):
-- INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'demo@expense-tracker.app',
--   now(),
--   now(),
--   now(),
--   '{"provider":"email","providers":["email"]}',
--   '{}'
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Option B: Create demo user via Supabase Dashboard → Authentication → Users → Add user (use same UUID and email).

-- Demo user profile
INSERT INTO profiles (id, email, display_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@expense-tracker.app',
  'Demo User',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Assign 'user' role to demo user
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id FROM roles WHERE name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =============================================
-- Sample demo data (expenses for demo user)
-- Re-running this section will add duplicate rows; run once or clear demo expenses first.
-- =============================================
INSERT INTO expenses (user_id, amount, datetime, category, platform, payment_method, type, source)
VALUES
  ('00000000-0000-0000-0000-000000000001', 50.00, now() - interval '1 day', 'Food', 'Zomato', 'UPI', 'EXPENSE', 'MANUAL'),
  ('00000000-0000-0000-0000-000000000001', 1200.00, now() - interval '5 days', 'Rent', 'Transfer', 'Bank', 'EXPENSE', 'RECURRING');
